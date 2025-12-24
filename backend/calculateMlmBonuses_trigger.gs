/**
 * ═══════════════════════════════════════════════════════════════════════
 * MLM БОНУСНАЯ СИСТЕМА - Автоматический расчет по триггеру
 * ═══════════════════════════════════════════════════════════════════════
 * Версия: 3.1 (Bonus Transactions + Payment Status)
 * Дата: 22.12.2025
 * 
 * НАЗНАЧЕНИЕ:
 * - Автоматический расчет бонусов при добавлении платежа через API
 * - Запись бонусов в отдельную таблицу bonus_transactions
 * - Работает через masterTrigger (не напрямую)
 * - Без UI/меню - только логирование
 * 
 * СТРУКТУРА:
 * - calculateMlmBonuses() - основная функция расчета
 * - writeBonusTransaction() - запись бонуса (в отдельном файле)
 * 
 * ВАЖНО:
 * Эта функция вызывается из masterTrigger.gs → runPaymentsPipeline()
 * Напрямую триггер НЕ устанавливается!
 */

/**
 * ═══════════════════════════════════════════════════════════════════════
 * ОСНОВНАЯ ФУНКЦИЯ: Расчет MLM бонусов
 * ═══════════════════════════════════════════════════════════════════════
 * Вызывается автоматически по триггеру при изменении данных
 */
function calculateMlmBonuses() {
  try {
    var startTime = new Date();
    Logger.log("🚀 СТАРТ расчета MLM бонусов | " + startTime.toLocaleTimeString());
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPay = ss.getSheetByName("payments");
    var sheetRef = ss.getSheetByName("referals");

    // Проверка существования листов
    if (!sheetPay || !sheetRef) {
      Logger.log("❌ ОШИБКА: Листы 'payments' или 'referals' не найдены");
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // НАСТРОЙКИ ПРОДУКТОВ
    // ═══════════════════════════════════════════════════════════════════
    var productRules = {
      1: { type: "sprint", points: 1 },       
      2: { type: "activation", points: 3 },
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // ЗАГРУЗКА БАЗЫ РЕФЕРАЛОВ
    // ═══════════════════════════════════════════════════════════════════
    var lastRowRef = sheetRef.getLastRow();
    if (lastRowRef < 2) {
      Logger.log("⚠️ Таблица referals пуста");
      return;
    }
    
    var refData = sheetRef.getRange(2, 1, lastRowRef - 1, 6).getValues();
    var usersMap = {}; 
    var loadedUsers = 0;

    for (var i = 0; i < refData.length; i++) {
      var uId = String(refData[i][0]).trim();
      if (!uId || uId === "") continue;
      
      usersMap[uId] = {
        name: String(refData[i][1] || "").trim(),
        pLevel: parseInt(refData[i][3]) || 1,
        cLevel: parseInt(refData[i][4]) || 0,
        uplineId: String(refData[i][5] || "").trim()
      };
      loadedUsers++;
    }
    
    Logger.log("👥 Загружено участников: " + loadedUsers);

    // ═══════════════════════════════════════════════════════════════════
    // ОБРАБОТКА ПЛАТЕЖЕЙ
    // ═══════════════════════════════════════════════════════════════════
    var lastRowPay = sheetPay.getLastRow();
    if (lastRowPay < 2) {
      Logger.log("⚠️ Таблица payments пуста");
      return;
    }

    // НОВАЯ СТРУКТУРА payments: 8 колонок (A-H)
    // A: transaction_id, B: transaction_time, C: buyer_id, D: buyer_name,
    // E: product_id, F: payment_amount, G: payment_bonus_points, H: status
    var payRange = sheetPay.getRange(2, 1, lastRowPay - 1, 8);
    var payValues = payRange.getValues();
    var processedCount = 0;
    var skippedCount = 0;
    var errorCount = 0;
    var bonusesWritten = 0;

    // Загрузка таблицы bonus_transactions для проверки уже обработанных
    var sheetBonus = ss.getSheetByName("bonus_transactions");
    if (!sheetBonus) {
      Logger.log("❌ ОШИБКА: Таблица 'bonus_transactions' не найдена");
      return;
    }
    
    var lastRowBonus = sheetBonus.getLastRow();
    var processedTransactions = {};
    
    if (lastRowBonus >= 2) {
      var bonusData = sheetBonus.getRange(2, 2, lastRowBonus - 1, 1).getValues();
      for (var b = 0; b < bonusData.length; b++) {
        var txId = String(bonusData[b][0]).trim();
        if (txId) processedTransactions[txId] = true;
      }
    }
    
    Logger.log("📋 Уже обработано транзакций: " + Object.keys(processedTransactions).length);

    for (var i = 0; i < payValues.length; i++) {
      var rowNum = i + 2;
      
      try {
        // Проверка: есть transaction_id
        var transactionId = String(payValues[i][0]).trim();
        
        if (!transactionId || transactionId === "") continue;
        
        // Проверка статуса в payments (новое!)
        var paymentStatus = String(payValues[i][7]).trim(); // H: status
        
        // Пропускаем уже обработанные или отмененные
        // processed = бонусы уже начислены
        // cancelled = отмененный платеж
        // completed = покупка за баллы (без начисления бонусов)
        if (paymentStatus === "processed" || paymentStatus === "cancelled" || paymentStatus === "completed") {
          skippedCount++;
          continue;
        }
        
        // Проверка: уже обработана (есть в bonus_transactions)?
        if (processedTransactions[transactionId]) {
          // Устанавливаем статус если еще не установлен
          if (!paymentStatus) {
            payValues[i][7] = "processed";
          }
          skippedCount++;
          continue;
        }
        
        // ──────────────────────────────────────────────────────────────
        // ИЗВЛЕЧЕНИЕ ДАННЫХ (НОВЫЕ ИНДЕКСЫ)
        // ──────────────────────────────────────────────────────────────
        var buyerId = String(payValues[i][2]).trim();       // C: buyer_id
        var buyerName = String(payValues[i][3]).trim();     // D: buyer_name
        var productId = parseInt(payValues[i][4]) || 1;     // E: product_id
        var amount = parseFloat(payValues[i][5]) || 0;      // F: payment_amount
        
        // Валидация
        if (!buyerId || buyerId === "") {
          Logger.log("⚠️ Строка " + rowNum + ": Пропущена (нет ID)");
          errorCount++;
          continue;
        }
        
        if (amount <= 0) {
          Logger.log("⚠️ Строка " + rowNum + ": Некорректная сумма: " + amount);
          errorCount++;
          continue;
        }
        
        // Поиск покупателя
        var buyerNode = usersMap[buyerId];
        if (!buyerNode) {
          Logger.log("⚠️ Строка " + rowNum + ": ID=" + buyerId + " не найден");
          errorCount++;
          continue;
        }
        
        var clientLevel = buyerNode.cLevel;  // Уровень покупателя
        var productInfo = productRules[productId] || { type: "other", points: 0 };
        var upline1Id = buyerNode.uplineId;
        
        Logger.log("🔍 Строка " + rowNum + ": TX=" + transactionId + ", Buyer=" + buyerName + " (L" + clientLevel + "), Amount=" + amount + "₽");
        
        // ══════════════════════════════════════════════════════════════
        // РАСЧЕТ БОНУСОВ L1
        // ══════════════════════════════════════════════════════════════
        if (upline1Id && usersMap[upline1Id]) {
          var upline1 = usersMap[upline1Id];

          var moneyL1 = 0;
          var pointsL1 = 0;
          var rateL1 = 0;

          if (upline1.pLevel >= 2) {
            pointsL1 = productInfo.points;

            if (clientLevel == 2) {
              rateL1 = 0.05;
            } else {
              if (upline1.pLevel == 2) {
                rateL1 = 0.10;
              } else {
                rateL1 = 0.15;
              }
            }
            
            moneyL1 = amount * rateL1;
          }

          Logger.log("✅ Строка " + rowNum + ": L1=" + upline1.name + 
                     " | " + moneyL1 + "₽ (" + (rateL1*100) + "%) + " + pointsL1 + " б.");
          
          // ────────────────────────────────────────────────────────────
          // ЗАПИСЬ БОНУСА L1 В bonus_transactions
          // ────────────────────────────────────────────────────────────
          var bonusL1Saved = writeBonusTransaction({
            transactionId: transactionId,
            referal_id: upline1Id,
            referal_name: upline1.name,
            referal_level: upline1.pLevel,   // Уровень партнера
            bonus_level: "L1",                // Тип бонуса
            bonus_amount: moneyL1,
            bonus_points: pointsL1,
            bonus_percent: rateL1,
            buyer_id: buyerId,
            buyer_name: buyerName,
            buyer_level: clientLevel,
            product_id: productId,
            payment_amount: amount,
            status: "pending"
          });
          
          if (bonusL1Saved) bonusesWritten++;
          
          // ════════════════════════════════════════════════════════════
          // РАСЧЕТ БОНУСОВ L2
          // ════════════════════════════════════════════════════════════
          if (clientLevel == 1 && upline1.uplineId && usersMap[upline1.uplineId]) {
            var upline2Id = upline1.uplineId;
            var upline2 = usersMap[upline2Id];
            
            var moneyL2 = 0;
            var rateL2 = 0;

            if (upline2.pLevel >= 3) {
              rateL2 = 0.05;
              moneyL2 = amount * rateL2;
            }
            
            if (moneyL2 > 0) {
              Logger.log("✅ Строка " + rowNum + ": L2=" + upline2.name + 
                         " | " + moneyL2 + "₽ (" + (rateL2*100) + "%)");
              
              // ──────────────────────────────────────────────────────────
              // ЗАПИСЬ БОНУСА L2 В bonus_transactions
              // ──────────────────────────────────────────────────────────
              var bonusL2Saved = writeBonusTransaction({
                transactionId: transactionId,
                referal_id: upline2Id,
                referal_name: upline2.name,
                referal_level: upline2.pLevel,  // Уровень партнера
                bonus_level: "L2",               // Тип бонуса
                bonus_amount: moneyL2,
                bonus_points: 0,                 // Баллы только на L1
                bonus_percent: rateL2,
                buyer_id: buyerId,
                buyer_name: buyerName,
                buyer_level: clientLevel,
                product_id: productId,
                payment_amount: amount,
                status: "pending"
              });
              
              if (bonusL2Saved) bonusesWritten++;
            }
          }
          
          // Устанавливаем статус "processed" в payments
          payValues[i][7] = "processed";
          
          processedCount++;
        }
        
      } catch (rowError) {
        Logger.log("❌ Ошибка в строке " + rowNum + ": " + rowError.message);
        errorCount++;
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // СОХРАНЕНИЕ ИЗМЕНЕНИЙ В PAYMENTS (СТАТУСЫ)
    // ═══════════════════════════════════════════════════════════════════
    // Всегда сохраняем обновленные статусы обратно в таблицу payments
    payRange.setValues(payValues);
    Logger.log("💾 Статусы в payments обновлены");
    
    // ═══════════════════════════════════════════════════════════════════
    // СТАТИСТИКА
    // ═══════════════════════════════════════════════════════════════════
    var endTime = new Date();
    var duration = (endTime - startTime) / 1000;
    
    Logger.log("──────────────────────────────────────────────────────");
    Logger.log("📊 СТАТИСТИКА:");
    Logger.log("   ✅ Обработано: " + processedCount);
    Logger.log("   💾 Бонусов записано: " + bonusesWritten);
    Logger.log("   ⏭️  Пропущено: " + skippedCount);
    Logger.log("   ⚠️  Ошибок: " + errorCount);
    Logger.log("   ⏱️  Время: " + duration.toFixed(2) + " сек");
    Logger.log("🎉 ЗАВЕРШЕНО | " + endTime.toLocaleTimeString());
    Logger.log("──────────────────────────────────────────────────────");
    
  } catch (error) {
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("❌ КРИТИЧЕСКАЯ ОШИБКА: " + error.message);
    Logger.log("Stack: " + error.stack);
    Logger.log("═══════════════════════════════════════════════════════");
    
    // Опционально: отправка email уведомления об ошибке
    // MailApp.sendEmail({
    //   to: "admin@example.com",
    //   subject: "MLM Script Error",
    //   body: "Ошибка: " + error.message + "\n\n" + error.stack
    // });
    
    throw error;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ОПЦИОНАЛЬНАЯ ФУНКЦИЯ: Обработка ручного редактирования
 * ═══════════════════════════════════════════════════════════════════════
 * Использовать если нужно автоматически обрабатывать новые строки
 * при ручном добавлении (не через API)
 * 
 * УСТАНОВКА ТРИГГЕРА:
 * Apps Script → Триггеры → Добавить триггер:
 *   - Функция: onEdit
 *   - Тип события: Из таблицы
 *   - Тип события: При изменении
 */
function onEdit(e) {
  try {
    // Проверяем, что изменения в листе payments
    var sheet = e.source.getActiveSheet();
    if (sheet.getName() !== "payments") return;
    
    // Проверяем, что изменение в нужных колонках (A-G)
    var range = e.range;
    var col = range.getColumn();
    
    // Если изменение в колонках A-G (transaction_id, referal_id и т.д.)
    if (col >= 1 && col <= 7) {
      Logger.log("🔔 Обнаружено изменение в payments, запуск расчета...");
      
      // Небольшая задержка для завершения записи
      Utilities.sleep(500);
      
      // Запускаем расчет
      calculateMlmBonuses();
    }
    
  } catch (error) {
    Logger.log("❌ Ошибка в onEdit: " + error.message);
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Очистка бонусов для пересчета
 * ═══════════════════════════════════════════════════════════════════════
 * Использовать только если нужно полностью пересчитать все бонусы
 * Запускать вручную через Apps Script Editor
 */
function clearAllBonuses() {
  try {
    Logger.log("⚠️ ОЧИСТКА ВСЕХ БОНУСОВ...");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPay = ss.getSheetByName("payments");
    
    if (!sheetPay) {
      throw new Error('Лист "payments" не найден!');
    }
    
    var lastRow = sheetPay.getLastRow();
    if (lastRow < 2) {
      Logger.log("ℹ️ Таблица пуста");
      return;
    }
    
    // Очищаем колонки H-R (8-18)
    var rangeToClear = sheetPay.getRange(2, 8, lastRow - 1, 11);
    rangeToClear.clearContent();
    
    Logger.log("✅ Очищено строк: " + (lastRow - 1));
    Logger.log("ℹ️ Теперь можно запустить calculateMlmBonuses() для пересчета");
    
  } catch (error) {
    Logger.log("❌ Ошибка при очистке: " + error.message);
    throw error;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ОПЦИОНАЛЬНАЯ ФУНКЦИЯ: Email уведомления о начислении бонусов
 * ═══════════════════════════════════════════════════════════════════════
 * Раскомментируйте и настройте, если нужны уведомления партнерам
 */
/*
function sendBonusNotification(partnerEmail, partnerName, bonus, points) {
  try {
    var subject = "💰 Новое начисление бонусов";
    var body = "Здравствуйте, " + partnerName + "!\n\n" +
               "Вам начислены бонусы:\n" +
               "💵 Деньги: " + bonus + " ₽\n" +
               "⭐ Баллы: " + points + "\n\n" +
               "С уважением,\nMLM система";
    
    MailApp.sendEmail(partnerEmail, subject, body);
    Logger.log("📧 Email отправлен: " + partnerEmail);
    
  } catch (error) {
    Logger.log("❌ Ошибка отправки email: " + error.message);
  }
}
*/


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ: Проверка структуры таблиц
 * ═══════════════════════════════════════════════════════════════════════
 * Запускать вручную для диагностики
 */
function testTableStructure() {
  try {
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("🧪 ТЕСТИРОВАНИЕ СТРУКТУРЫ ТАБЛИЦ");
    Logger.log("═══════════════════════════════════════════════════════");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetRef = ss.getSheetByName("referals");
    var sheetPay = ss.getSheetByName("payments");
    
    // Тест 1: Существование листов
    if (sheetRef && sheetPay) {
      Logger.log("✅ Тест 1: Листы существуют");
    } else {
      Logger.log("❌ Тест 1: Листы НЕ найдены");
      return;
    }
    
    // Тест 2: Структура referals
    var refHeaders = sheetRef.getRange(1, 1, 1, 6).getValues()[0];
    Logger.log("ℹ️ Заголовки referals: " + refHeaders.join(", "));
    
    var refCount = sheetRef.getLastRow() - 1;
    Logger.log("ℹ️ Участников в базе: " + refCount);
    
    // Тест 3: Структура payments
    var payHeaders = sheetPay.getRange(1, 1, 1, 18).getValues()[0];
    Logger.log("ℹ️ Заголовки payments: " + payHeaders.join(", "));
    
    var payCount = sheetPay.getLastRow() - 1;
    Logger.log("ℹ️ Платежей в базе: " + payCount);
    
    // Тест 4: Необработанные платежи
    if (payCount > 0) {
      var payData = sheetPay.getRange(2, 1, payCount, 8).getValues();
      var unprocessed = 0;
      
      for (var i = 0; i < payData.length; i++) {
        if (payData[i][0] && !payData[i][7]) {
          unprocessed++;
        }
      }
      
      Logger.log("ℹ️ Необработанных платежей: " + unprocessed);
    }
    
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО");
    Logger.log("═══════════════════════════════════════════════════════");
    
  } catch (error) {
    Logger.log("❌ Ошибка тестирования: " + error.message);
  }
}
