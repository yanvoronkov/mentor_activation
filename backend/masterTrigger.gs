/**
 * ═══════════════════════════════════════════════════════════════════════
 * УМНЫЙ МАСТЕР-ТРИГГЕР ДЛЯ MLM СИСТЕМЫ
 * ═══════════════════════════════════════════════════════════════════════
 * Версия: 1.0
 * Дата: 19.12.2025
 * 
 * НАЗНАЧЕНИЕ:
 * - Единая точка входа для всех изменений в таблицах
 * - Умная маршрутизация: запускает только нужные функции для каждой таблицы
 * - Гарантированный порядок выполнения без race conditions
 * 
 * ПОДДЕРЖИВАЕМЫЕ СЦЕНАРИИ:
 * 1. Добавление данных в payments через API
 * 2. Добавление данных в referals через API
 * 3. Ручное изменение данных в withdraw
 * 
 * УСТАНОВКА ТРИГГЕРА:
 * Apps Script → Триггеры → Добавить триггер:
 *   - Функция: onMasterChange
 *   - Тип события: Из таблицы
 *   - Тип события: При изменении
 * 
 * ВАЖНО: Удалите все другие триггеры перед установкой этого!
 */


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ГЛАВНАЯ ФУНКЦИЯ: Мастер-триггер с умной маршрутизацией
 * ═══════════════════════════════════════════════════════════════════════
 */
function onMasterChange(e) {
  // Блокировка для предотвращения параллельных запусков
  var lock = LockService.getScriptLock();
  
  try {
    // Пытаемся получить блокировку на 30 секунд
    if (!lock.tryLock(30000)) {
      Logger.log("⚠️ Скрипт уже выполняется, пропускаем этот запуск");
      return;
    }
    
    var startTime = new Date();
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("🚀 СТАРТ МАСТЕР-ТРИГГЕРА | " + startTime.toLocaleTimeString());
    Logger.log("═══════════════════════════════════════════════════════");
    
    // Определяем, в какой таблице произошли изменения
    var sheetName = getSheetName(e);
    Logger.log("📋 Изменения в таблице: " + (sheetName || "не определено"));
    
    // ════════════════════════════════════════════════════════════════════
    // МАРШРУТИЗАЦИЯ ПО ТАБЛИЦАМ
    // ════════════════════════════════════════════════════════════════════
    
    if (sheetName === "payments") {
      // ──────────────────────────────────────────────────────────────────
      // СЦЕНАРИЙ 1: Изменения в таблице PAYMENTS
      // ──────────────────────────────────────────────────────────────────
      Logger.log("\n🔄 PIPELINE ДЛЯ PAYMENTS:");
      Logger.log("   1. Добавление ID и даты");
      Logger.log("   2. Расчет MLM бонусов");
      Logger.log("   3. Обновление агрегированных данных в referals\n");
      
      runPaymentsPipeline();
      
    } else if (sheetName === "referals") {
      // ──────────────────────────────────────────────────────────────────
      // СЦЕНАРИЙ 2: Изменения в таблице REFERALS
      // ──────────────────────────────────────────────────────────────────
      Logger.log("\n🔄 PIPELINE ДЛЯ REFERALS:");
      Logger.log("   1. Обновление уровней рефералов (lev1, lev2, totalReferals)");
      Logger.log("   2. Обновление агрегированных данных в referals\n");
      
      runReferalsPipeline();
      
    } else if (sheetName === "withdraw") {
      // ──────────────────────────────────────────────────────────────────
      // СЦЕНАРИЙ 3: Изменения в таблице WITHDRAW
      // ──────────────────────────────────────────────────────────────────
      Logger.log("\n🔄 PIPELINE ДЛЯ WITHDRAW:");
      Logger.log("   1. Обновление total_withdrawal и balance в referals\n");
      
      runWithdrawPipeline();
      
    } else {
      // ──────────────────────────────────────────────────────────────────
      // СЦЕНАРИЙ 4: Изменения в других таблицах (игнорируем)
      // ──────────────────────────────────────────────────────────────────
      Logger.log("\n⏭️ Изменения в таблице '" + sheetName + "' - обработка не требуется");
    }
    
    // ════════════════════════════════════════════════════════════════════
    // ЗАВЕРШЕНИЕ
    // ════════════════════════════════════════════════════════════════════
    var endTime = new Date();
    var duration = (endTime - startTime) / 1000;
    
    Logger.log("\n═══════════════════════════════════════════════════════");
    Logger.log("✅ МАСТЕР-ТРИГГЕР ЗАВЕРШЕН");
    Logger.log("⏱️  Время выполнения: " + duration.toFixed(2) + " сек");
    Logger.log("🕐 Завершено: " + endTime.toLocaleTimeString());
    Logger.log("═══════════════════════════════════════════════════════");
    
  } catch (error) {
    Logger.log("\n═══════════════════════════════════════════════════════");
    Logger.log("❌ КРИТИЧЕСКАЯ ОШИБКА В МАСТЕР-ТРИГГЕРЕ");
    Logger.log("Ошибка: " + error.message);
    Logger.log("Stack: " + error.stack);
    Logger.log("═══════════════════════════════════════════════════════");
    
    // Опционально: отправка email уведомления
    // notifyAdminOnError(error);
    
    throw error;
    
  } finally {
    // Освобождаем блокировку
    lock.releaseLock();
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * PIPELINE 1: Обработка изменений в PAYMENTS
 * ═══════════════════════════════════════════════════════════════════════
 * Вызывается когда: Добавлены новые платежи через API
 * 
 * Выполняет:
 * 1. autoIdAndDate() - добавляет transaction_id и transaction_time
 * 2. calculateMlmBonuses() - рассчитывает бонусы L1 и L2
 * 3. updateReferalsTotals() - обновляет агрегацию в referals
 */
function runPaymentsPipeline() {
  try {
    // ────────────────────────────────────────────────────────────────────
    // ЭТАП 1: Добавление ID и даты к новым записям
    // ────────────────────────────────────────────────────────────────────
    Logger.log("▶️ [1/3] Запуск autoIdAndDate()...");
    var step1Start = new Date();
    
    autoIdAndDate();
    
    var step1Duration = (new Date() - step1Start) / 1000;
    Logger.log("   ✅ Завершено за " + step1Duration.toFixed(2) + " сек");
    
    // Небольшая задержка для синхронизации с Google Sheets
    Utilities.sleep(300);
    
    // ────────────────────────────────────────────────────────────────────
    // ЭТАП 2: Расчет MLM бонусов
    // ────────────────────────────────────────────────────────────────────
    Logger.log("▶️ [2/3] Запуск calculateMlmBonuses()...");
    var step2Start = new Date();
    
    calculateMlmBonuses();
    
    var step2Duration = (new Date() - step2Start) / 1000;
    Logger.log("   ✅ Завершено за " + step2Duration.toFixed(2) + " сек");
    
    // Небольшая задержка перед финальным этапом
    Utilities.sleep(300);
    
    // ────────────────────────────────────────────────────────────────────
    // ЭТАП 3: Обновление агрегированных данных в referals
    // ────────────────────────────────────────────────────────────────────
    Logger.log("▶️ [3/3] Запуск updateReferalsTotals()...");
    var step3Start = new Date();
    
    updateReferalsTotals();
    
    var step3Duration = (new Date() - step3Start) / 1000;
    Logger.log("   ✅ Завершено за " + step3Duration.toFixed(2) + " сек");
    
    Logger.log("\n✅ Pipeline PAYMENTS успешно завершен");
    
  } catch (error) {
    Logger.log("\n❌ Ошибка в pipeline PAYMENTS: " + error.message);
    throw error;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * PIPELINE 2: Обработка изменений в REFERALS
 * ═══════════════════════════════════════════════════════════════════════
 * Вызывается когда: Добавлены/обновлены рефералы через API или вручную
 * 
 * Выполняет:
 * 1. calculateReferralLevels() - обновляет lev1, lev2, totalReferals
 * 2. updateReferalsTotals() - пересчитывает агрегированные данные
 */
function runReferalsPipeline() {
  try {
    // ────────────────────────────────────────────────────────────────────
    // ЭТАП 1: Обновление уровней рефералов
    // ────────────────────────────────────────────────────────────────────
    Logger.log("▶️ [1/2] Запуск calculateReferralLevels()...");
    var step1Start = new Date();
    
    calculateReferralLevels();
    
    var step1Duration = (new Date() - step1Start) / 1000;
    Logger.log("   ✅ Завершено за " + step1Duration.toFixed(2) + " сек");
    
    // Небольшая задержка для синхронизации
    Utilities.sleep(300);
    
    // ────────────────────────────────────────────────────────────────────
    // ЭТАП 2: Обновление агрегированных данных
    // ────────────────────────────────────────────────────────────────────
    Logger.log("▶️ [2/2] Запуск updateReferalsTotals()...");
    var step2Start = new Date();
    
    updateReferalsTotals();
    
    var step2Duration = (new Date() - step2Start) / 1000;
    Logger.log("   ✅ Завершено за " + step2Duration.toFixed(2) + " сек");
    
    Logger.log("\n✅ Pipeline REFERALS успешно завершен");
    
  } catch (error) {
    Logger.log("\n❌ Ошибка в pipeline REFERALS: " + error.message);
    throw error;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * PIPELINE 3: Обработка изменений в WITHDRAW
 * ═══════════════════════════════════════════════════════════════════════
 * Вызывается когда: Добавлены/изменены записи о выводах вручную
 * 
 * Выполняет:
 * 1. updateReferalsTotals() - обновляет total_withdrawal и balance
 */
function runWithdrawPipeline() {
  try {
    // ────────────────────────────────────────────────────────────────────
    // ЭТАП 1: Обновление данных о выводах и балансе
    // ────────────────────────────────────────────────────────────────────
    Logger.log("▶️ [1/1] Запуск updateReferalsTotals()...");
    var stepStart = new Date();
    
    updateReferalsTotals();
    
    var stepDuration = (new Date() - stepStart) / 1000;
    Logger.log("   ✅ Завершено за " + stepDuration.toFixed(2) + " сек");
    
    Logger.log("\n✅ Pipeline WITHDRAW успешно завершен");
    
  } catch (error) {
    Logger.log("\n❌ Ошибка в pipeline WITHDRAW: " + error.message);
    throw error;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Определение таблицы, в которой изменения
 * ═══════════════════════════════════════════════════════════════════════
 */
function getSheetName(e) {
  var sheetName = "";
  
  try {
    // Попытка 1: Получить из события
    if (e && e.source) {
      var activeSheet = e.source.getActiveSheet();
      if (activeSheet) {
        sheetName = activeSheet.getName();
        return sheetName;
      }
    }
    
    // Попытка 2: Получить из активного листа
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    if (activeSheet) {
      sheetName = activeSheet.getName();
    }
    
  } catch (error) {
    Logger.log("⚠️ Не удалось определить имя листа: " + error.message);
  }
  
  return sheetName;
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ОПЦИОНАЛЬНАЯ ФУНКЦИЯ: Email уведомления об ошибках
 * ═══════════════════════════════════════════════════════════════════════
 * Раскомментируйте и настройте email для получения уведомлений
 */
/*
function notifyAdminOnError(error) {
  try {
    var emailAddress = "admin@example.com"; // Укажите ваш email
    var subject = "🚨 Ошибка в MLM мастер-триггере";
    var body = "Произошла ошибка в автоматической обработке:\n\n" +
               "Ошибка: " + error.message + "\n\n" +
               "Stack trace:\n" + error.stack + "\n\n" +
               "Время: " + new Date().toLocaleString();
    
    MailApp.sendEmail(emailAddress, subject, body);
    Logger.log("📧 Email уведомление отправлено на: " + emailAddress);
    
  } catch (emailError) {
    Logger.log("❌ Не удалось отправить email: " + emailError.message);
  }
}
*/


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ: Ручной запуск pipeline для всех таблиц
 * ═══════════════════════════════════════════════════════════════════════
 * Используйте для полного пересчета всех данных
 */
function testFullPipeline() {
  Logger.log("🧪 ТЕСТОВЫЙ ЗАПУСК ВСЕХ PIPELINE");
  Logger.log("═══════════════════════════════════════════════════════");
  
  try {
    Logger.log("\n1️⃣ Тестирование PAYMENTS pipeline:");
    runPaymentsPipeline();
    
    Logger.log("\n2️⃣ Тестирование REFERALS pipeline:");
    runReferalsPipeline();
    
    Logger.log("\n3️⃣ Тестирование WITHDRAW pipeline:");
    runWithdrawPipeline();
    
    Logger.log("\n═══════════════════════════════════════════════════════");
    Logger.log("✅ ВСЕ PIPELINE УСПЕШНО ПРОТЕСТИРОВАНЫ");
    Logger.log("═══════════════════════════════════════════════════════");
    
  } catch (error) {
    Logger.log("\n❌ Ошибка в тестировании: " + error.message);
    Logger.log("Stack: " + error.stack);
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ: Проверка определения имени таблицы
 * ═══════════════════════════════════════════════════════════════════════
 */
function testSheetDetection() {
  Logger.log("🧪 ТЕСТ ОПРЕДЕЛЕНИЯ ТАБЛИЦЫ");
  Logger.log("═══════════════════════════════════════════════════════");
  
  var sheetName = getSheetName(null);
  Logger.log("Текущая активная таблица: " + (sheetName || "не определено"));
  
  Logger.log("═══════════════════════════════════════════════════════");
}
