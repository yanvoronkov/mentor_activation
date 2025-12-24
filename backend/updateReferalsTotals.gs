/**
 * ═══════════════════════════════════════════════════════════════════════
 * СИСТЕМА ОБНОВЛЕНИЯ АГРЕГИРОВАННЫХ ДАННЫХ В ТАБЛИЦЕ REFERALS
 * ═══════════════════════════════════════════════════════════════════════
 * Версия: 2.0 (Bonus Transactions)
 * Дата: 22.12.2025
 * 
 * НАЗНАЧЕНИЕ:
 * - Автоматический расчет и обновление агрегированных колонок в таблице referals
 * - Подсчет бонусов из bonus_transactions
 * - Подсчет платежей и потраченных баллов из payments
 * - Подсчет выводов из withdraw
 * - Работает через masterTrigger (не напрямую)
 * 
 * ОБНОВЛЯЕМЫЕ КОЛОНКИ В REFERALS:
 * - total_bonus_points_earned  (M, индекс 12) - Заработанные баллы
 * - total_bonus_points_spent   (N, индекс 13) - Потраченные баллы
 * - balance_bonus_points       (O, индекс 14) - Баланс баллов
 * - total_payment              (P, индекс 15) - Сумма платежей
 * - total_earned_lev1          (Q, индекс 16) - Заработок L1
 * - total_earned_lev2          (R, индекс 17) - Заработок L2
 * - total_earned_mo            (S, индекс 18) - Заработок MO (НОВОЕ!)
 * - total_earned               (T, индекс 19) - Общий заработок (L1+L2+MO)
 * - total_withdrawal           (U, индекс 20) - Сумма выводов
 * - balance                    (V, индекс 21) - Баланс денег
 * 
 * ВАЖНО:
 * Эта функция вызывается из masterTrigger.gs
 * Напрямую триггер НЕ устанавливается!
 */


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ОСНОВНАЯ ФУНКЦИЯ: Обновление агрегированных данных в referals
 * ═══════════════════════════════════════════════════════════════════════
 */
function updateReferalsTotals() {
  try {
    const startTime = new Date();
    Logger.log("🚀 СТАРТ обновления агрегированных данных | " + startTime.toLocaleTimeString());
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPayments = ss.getSheetByName("payments");
    const sheetReferals = ss.getSheetByName("referals");
    const sheetWithdraw = ss.getSheetByName("withdraw");
    const sheetBonus = ss.getSheetByName("bonus_transactions");

    // Проверка существования листов
    if (!sheetReferals) {
      Logger.log("❌ ОШИБКА: Лист 'referals' не найден");
      return;
    }
    
    if (!sheetBonus) {
      Logger.log("❌ ОШИБКА: Лист 'bonus_transactions' не найден");
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ЗАГРУЗКА ДАННЫХ ИЗ BONUS_TRANSACTIONS
    // ═══════════════════════════════════════════════════════════════════
    let bonusData = [];
    const lastRowBonus = sheetBonus.getLastRow();
    
    if (lastRowBonus >= 2) {
      // Загружаем все 16 колонок включая status (P)
      bonusData = sheetBonus.getRange(2, 1, lastRowBonus - 1, 16).getValues();
      Logger.log("💾 Загружено бонусных транзакций: " + (lastRowBonus - 1));
    } else {
      Logger.log("⚠️ Таблица bonus_transactions пуста");
    }

    // ═══════════════════════════════════════════════════════════════════
    // ЗАГРУЗКА ДАННЫХ ИЗ PAYMENTS (НОВАЯ СТРУКТУРА)
    // ═══════════════════════════════════════════════════════════════════
    let paymentsData = [];
    
    if (sheetPayments) {
      const lastRowPayments = sheetPayments.getLastRow();
      if (lastRowPayments >= 2) {
        // Новая структура: 8 колонок (A-H)
        // C: buyer_id, F: payment_amount, G: payment_bonus_points, H: status
        paymentsData = sheetPayments.getRange(2, 1, lastRowPayments - 1, 8).getValues();
        Logger.log("📊 Загружено платежей: " + (lastRowPayments - 1));
      } else {
        Logger.log("⚠️ Таблица payments пуста");
      }
    } else {
      Logger.log("⚠️ Таблица payments не найдена");
    }

    // ═══════════════════════════════════════════════════════════════════
    // ЗАГРУЗКА ДАННЫХ ИЗ REFERALS
    // ═══════════════════════════════════════════════════════════════════
    const lastRowReferals = sheetReferals.getLastRow();
    if (lastRowReferals < 2) {
      Logger.log("⚠️ Таблица referals пуста");
      return;
    }

    const referalsData = sheetReferals.getRange(2, 1, lastRowReferals - 1, 22).getValues();
    Logger.log("👥 Загружено рефералов: " + (lastRowReferals - 1));

    // ═══════════════════════════════════════════════════════════════════
    // ЗАГРУЗКА ДАННЫХ ИЗ WITHDRAW
    // ═══════════════════════════════════════════════════════════════════
    let withdrawData = [];
    
    if (sheetWithdraw) {
      const lastRowWithdraw = sheetWithdraw.getLastRow();
      if (lastRowWithdraw >= 2) {
        // Загружаем данные из withdraw (колонки B и C: referal_id, withdraw_sum)
        withdrawData = sheetWithdraw.getRange(2, 1, lastRowWithdraw - 1, 3).getValues();
        Logger.log("💰 Загружено выводов: " + (lastRowWithdraw - 1));
      } else {
        Logger.log("ℹ️ Таблица withdraw пуста");
      }
    } else {
      Logger.log("⚠️ Таблица withdraw не найдена, суммы выводов будут равны 0");
    }

    // ═══════════════════════════════════════════════════════════════════
    // РАСЧЕТ АГРЕГИРОВАННЫХ ДАННЫХ
    // ═══════════════════════════════════════════════════════════════════
    let updatedCount = 0;

    for (let i = 0; i < referalsData.length; i++) {
      const referalId = String(referalsData[i][0]).trim(); // Колонка A
      
      if (!referalId || referalId === "") continue;

      // Инициализация счетчиков
      let totalBonusPointsEarned = 0;  // M (индекс 12) - заработанные баллы
      let totalBonusPointsSpent = 0;   // N (индекс 13) - потраченные баллы
      let totalPayment = 0;            // P (индекс 15) - сумма платежей
      let totalEarnedLev1 = 0;         // Q (индекс 16) - заработок L1
      let totalEarnedLev2 = 0;         // R (индекс 17) - заработок L2
      let totalEarnedMo = 0;           // S (индекс 18) - заработок MO (НОВОЕ!)
      let totalWithdrawal = 0;         // U (индекс 20) - сумма выводов

      // ──────────────────────────────────────────────────────────────
      // ОБРАБОТКА БОНУСНЫХ ТРАНЗАКЦИЙ
      // ──────────────────────────────────────────────────────────────
      for (let j = 0; j < bonusData.length; j++) {
        const partnerId = String(bonusData[j][2]).trim();    // C: referal_id
        const bonusLevel = String(bonusData[j][5]).trim();   // F: bonus_level (L1/L2)
        const bonusAmount = parseFloat(bonusData[j][6]) || 0; // G: bonus_amount
        const bonusPoints = parseFloat(bonusData[j][7]) || 0; // H: bonus_points
        const status = String(bonusData[j][15]).trim();       // P: status
        
        // Пропускаем отмененные и сторнированные записи
        // cancelled = отмененный оригинал (уже не актуален)
        // reversed = сторнирующая запись (уже отменяет оригинал)
        // Учитываем только: "pending" (активные) и пустые статусы
        if (status === "cancelled" || status === "reversed") {
          continue;
        }
        
        if (partnerId === referalId) {
          // ──────────────────────────────────────────────────────────
          // 1. TOTAL_BONUS_POINTS_EARNED
          // Сумма bonus_points из bonus_transactions
          // (включая отрицательные от reversed записей)
          // ──────────────────────────────────────────────────────────
          totalBonusPointsEarned += bonusPoints;
          
          // ──────────────────────────────────────────────────────────
          // 2. TOTAL_EARNED_LEV1 / TOTAL_EARNED_LEV2 / MO
          // Деньги по уровням + месячные бонусы
          // (включая отрицательные от reversed записей)
          // ──────────────────────────────────────────────────────────
          if (bonusLevel === "L1") {
            totalEarnedLev1 += bonusAmount;
          } else if (bonusLevel === "L2") {
            totalEarnedLev2 += bonusAmount;
          } else if (bonusLevel === "MO") {
            // Месячные бонусы - в отдельное поле!
            totalEarnedMo += bonusAmount;
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // ОБРАБОТКА ПЛАТЕЖЕЙ
      // ──────────────────────────────────────────────────────────────
      for (let j = 0; j < paymentsData.length; j++) {
        const buyerId = String(paymentsData[j][2]).trim();         // C: buyer_id
        const paymentAmount = parseFloat(paymentsData[j][5]) || 0;  // F: payment_amount  
        const bonusPointsSpent = parseFloat(paymentsData[j][6]) || 0; // G: payment_bonus_points
        const paymentStatus = String(paymentsData[j][7]).trim();    // H: status
        
        // Пропускаем только отмененные платежи
        if (paymentStatus === "cancelled") {
          continue;
        }
        
        if (buyerId === referalId) {
          // ──────────────────────────────────────────────────────────
          // 3. TOTAL_PAYMENT
          // Сумма payment_amount, где buyer_id == referal_id
          // Покупки за баллы (completed) НЕ учитываются
          // ──────────────────────────────────────────────────────────
          if (paymentStatus !== "completed") {
            totalPayment += paymentAmount;
          }
          
          // ──────────────────────────────────────────────────────────
          // 4. TOTAL_BONUS_POINTS_SPENT
          // Сумма payment_bonus_points, где buyer_id == referal_id
          // Учитываются ВСЕ покупки (в т.ч. completed)
          // ──────────────────────────────────────────────────────────
          totalBonusPointsSpent += bonusPointsSpent;
        }
      }

      // ──────────────────────────────────────────────────────────────
      // 5. TOTAL_EARNED = L1 + L2 + MO
      // ──────────────────────────────────────────────────────────────
      const totalEarned = totalEarnedLev1 + totalEarnedLev2 + totalEarnedMo;

      // ──────────────────────────────────────────────────────────────
      // 6. BALANCE_BONUS_POINTS = EARNED - SPENT
      // ──────────────────────────────────────────────────────────────
      const balanceBonusPoints = totalBonusPointsEarned - totalBonusPointsSpent;

      // ──────────────────────────────────────────────────────────────
      // 7. TOTAL_WITHDRAWAL
      // Сумма всех выводов из таблицы withdraw по referal_id
      // ──────────────────────────────────────────────────────────────
      for (let k = 0; k < withdrawData.length; k++) {
        const withdrawReferalId = String(withdrawData[k][1]).trim(); // B: referal_id
        const withdrawSum = parseFloat(withdrawData[k][2]) || 0;     // C: withdraw_sum
        
        if (withdrawReferalId === referalId) {
          totalWithdrawal += withdrawSum;
        }
      }

      // ──────────────────────────────────────────────────────────────
      // 8. BALANCE = TOTAL_EARNED - TOTAL_WITHDRAWAL
      // ──────────────────────────────────────────────────────────────
      const balance = totalEarned - totalWithdrawal;

      // ──────────────────────────────────────────────────────────────
      // ОБНОВЛЕНИЕ ДАННЫХ В МАССИВЕ (НОВЫЕ ИНДЕКСЫ!)
      // ──────────────────────────────────────────────────────────────
      referalsData[i][12] = totalBonusPointsEarned; // M: total_bonus_points_earned
      referalsData[i][13] = totalBonusPointsSpent;  // N: total_bonus_points_spent
      referalsData[i][14] = balanceBonusPoints;     // O: balance_bonus_points
      referalsData[i][15] = totalPayment;           // P: total_payment
      referalsData[i][16] = totalEarnedLev1;        // Q: total_earned_lev1
      referalsData[i][17] = totalEarnedLev2;        // R: total_earned_lev2
      referalsData[i][18] = totalEarnedMo;          // S: total_earned_mo (НОВОЕ!)
      referalsData[i][19] = totalEarned;            // T: total_earned (L1+L2+MO)
      referalsData[i][20] = totalWithdrawal;        // U: total_withdrawal
      referalsData[i][21] = balance;                // V: balance

      updatedCount++;

      Logger.log(`✅ ID: ${referalId} | Баллы: ${totalBonusPointsEarned}/${totalBonusPointsSpent} (баланс: ${balanceBonusPoints}) | Платежи: ${totalPayment}₽ | L1: ${totalEarnedLev1}₽ | L2: ${totalEarnedLev2}₽ | MO: ${totalEarnedMo}₽ | Заработано: ${totalEarned}₽ | Выведено: ${totalWithdrawal}₽ | Баланс: ${balance}₽`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // СОХРАНЕНИЕ ИЗМЕНЕНИЙ
    // ═══════════════════════════════════════════════════════════════════
       if (updatedCount > 0) {
      sheetReferals.getRange(2, 1, lastRowReferals - 1, 22).setValues(referalsData);
      Logger.log("💾 Данные успешно сохранены");
    }

    // ═══════════════════════════════════════════════════════════════════
    // СТАТИСТИКА
    // ═══════════════════════════════════════════════════════════════════
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    Logger.log("──────────────────────────────────────────────────────");
    Logger.log("📊 СТАТИСТИКА:");
    Logger.log("   ✅ Обновлено рефералов: " + updatedCount);
    Logger.log("   ⏱️  Время: " + duration.toFixed(2) + " сек");
    Logger.log("🎉 ЗАВЕРШЕНО | " + endTime.toLocaleTimeString());
    Logger.log("──────────────────────────────────────────────────────");

  } catch (error) {
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("❌ КРИТИЧЕСКАЯ ОШИБКА: " + error.message);
    Logger.log("Stack: " + error.stack);
    Logger.log("═══════════════════════════════════════════════════════");
    throw error;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * УНИВЕРСАЛЬНАЯ ФУНКЦИЯ: Обработка изменений в таблице (РЕКОМЕНДУЕТСЯ)
 * ═══════════════════════════════════════════════════════════════════════
 * Эта функция автоматически отслеживает изменения в листах payments и withdraw
 * и запускает обновление агрегированных данных в referals
 * 
 * УСТАНОВКА ТРИГГЕРА (ОСНОВНОЙ СПОСОБ):
 * Apps Script → Триггеры → Добавить триггер:
 *   - Функция: onChange
 *   - Тип события: Из таблицы
 *   - Тип события: При изменении
 * 
 * ВАЖНО: Используйте эту функцию вместо onPaymentsEdit для максимальной совместимости
 */
function onChange(e) {
  try {
    var sheetName = "";
    
    // Пытаемся определить имя листа
    if (e && e.source) {
      var activeSheet = e.source.getActiveSheet();
      if (activeSheet) {
        sheetName = activeSheet.getName();
      }
    }
    
    // Если не удалось определить через событие, пробуем через активный лист
    if (!sheetName) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var activeSheet = ss.getActiveSheet();
      if (activeSheet) {
        sheetName = activeSheet.getName();
      }
    }
    
    Logger.log("🔔 Триггер onChange сработал. Лист: " + (sheetName || "не определен"));
    
    // Обновляем данные если изменения в payments или withdraw
    if (!sheetName || sheetName === "payments" || sheetName === "withdraw") {
      Logger.log("▶️ Запуск обновления агрегированных данных...");
      
      // Небольшая задержка для завершения записи
      Utilities.sleep(500);
      
      // Запускаем обновление
      updateReferalsTotals();
    } else {
      Logger.log("⏭️ Изменения в листе '" + sheetName + "' - обновление не требуется");
    }
    
  } catch (error) {
    Logger.log("❌ Ошибка в onChange: " + error.message);
    Logger.log("Stack: " + error.stack);
    
    // В случае ошибки пытаемся выполнить обновление напрямую
    try {
      Logger.log("🔄 Попытка аварийного обновления...");
      updateReferalsTotals();
    } catch (fallbackError) {
      Logger.log("❌ Аварийное обновление не удалось: " + fallbackError.message);
    }
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * АЛЬТЕРНАТИВНАЯ ФУНКЦИЯ: Обработка изменений (для старых версий)
 * ═══════════════════════════════════════════════════════════════════════
 * Используйте эту функцию только если onChange не работает
 * НЕ УСТАНАВЛИВАЙТЕ ТРИГГЕРЫ НА ОБЕ ФУНКЦИИ ОДНОВРЕМЕННО!
 */
function onPaymentsEdit(e) {
  try {
    // Проверяем, что изменения в листе payments или withdraw
    if (e && e.source) {
      const sheet = e.source.getActiveSheet();
      const sheetName = sheet.getName();
      
      if (sheetName !== "payments" && sheetName !== "withdraw") {
        Logger.log("⏭️ Изменения в листе '" + sheetName + "' - пропускаем");
        return;
      }
      
      Logger.log("🔔 Обнаружено изменение в " + sheetName + ", запуск обновления...");
    } else {
      Logger.log("🔔 Обнаружено изменение, запуск обновления...");
    }

    // Небольшая задержка для завершения записи
    Utilities.sleep(500);

    // Запускаем обновление
    updateReferalsTotals();

  } catch (error) {
    Logger.log("❌ Ошибка в onPaymentsEdit: " + error.message);
    Logger.log("Stack: " + error.stack);
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ: Проверка расчетов для конкретного ID
 * ═══════════════════════════════════════════════════════════════════════
 * Запускать вручную для диагностики
 * Параметр: referalId - ID реферала для проверки
 */
function testReferalCalculation(referalId) {
  try {
    if (!referalId) {
      referalId = "227193871"; // ID по умолчанию для тестирования
    }

    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log(`🧪 ТЕСТИРОВАНИЕ РАСЧЕТОВ ДЛЯ ID: ${referalId}`);
    Logger.log("═══════════════════════════════════════════════════════");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPayments = ss.getSheetByName("payments");
    const sheetWithdraw = ss.getSheetByName("withdraw");

    if (!sheetPayments) {
      Logger.log("❌ Таблица payments не найдена");
      return;
    }

    const lastRow = sheetPayments.getLastRow();
    const paymentsData = sheetPayments.getRange(2, 1, lastRow - 1, 18).getValues();

    let totalBonusPoints = 0;
    let totalPayment = 0;
    let totalEarnedLev1 = 0;
    let totalEarnedLev2 = 0;
    let totalWithdrawal = 0;

    Logger.log("\n📋 ДЕТАЛЬНЫЙ РАЗБОР ПЛАТЕЖЕЙ:");
    Logger.log("─────────────────────────────────────────────────────");

    for (let i = 0; i < paymentsData.length; i++) {
      const paymentReferalId = String(paymentsData[i][2]).trim();
      const payment = parseFloat(paymentsData[i][6]) || 0;
      const refererL1 = String(paymentsData[i][7]).trim();
      const refererL1Bonus = parseFloat(paymentsData[i][10]) || 0;
      const refererL1BonusPoints = parseFloat(paymentsData[i][11]) || 0;
      const refererL2 = String(paymentsData[i][12]).trim();
      const refererL2Bonus = parseFloat(paymentsData[i][15]) || 0;

      let match = false;
      let matchType = [];

      if (refererL1 === referalId) {
        totalBonusPoints += refererL1BonusPoints;
        totalEarnedLev1 += refererL1Bonus;
        match = true;
        matchType.push(`L1: +${refererL1BonusPoints} баллов, +${refererL1Bonus}₽`);
      }

      if (paymentReferalId === referalId) {
        totalPayment += payment;
        match = true;
        matchType.push(`Платеж: +${payment}₽`);
      }

      if (refererL2 === referalId) {
        totalEarnedLev2 += refererL2Bonus;
        match = true;
        matchType.push(`L2: +${refererL2Bonus}₽`);
      }

      if (match) {
        Logger.log(`Строка ${i + 2}: ${matchType.join(", ")}`);
      }
    }

    // Проверка выводов
    if (sheetWithdraw) {
      const lastRowWithdraw = sheetWithdraw.getLastRow();
      if (lastRowWithdraw >= 2) {
        const withdrawData = sheetWithdraw.getRange(2, 1, lastRowWithdraw - 1, 3).getValues();
        
        Logger.log("\n💰 ДЕТАЛЬНЫЙ РАЗБОР ВЫВОДОВ:");
        Logger.log("─────────────────────────────────────────────────────");
        
        for (let i = 0; i < withdrawData.length; i++) {
          const withdrawReferalId = String(withdrawData[i][1]).trim();
          const withdrawSum = parseFloat(withdrawData[i][2]) || 0;
          
          if (withdrawReferalId === referalId) {
            totalWithdrawal += withdrawSum;
            Logger.log(`Строка ${i + 2}: Вывод -${withdrawSum}₽`);
          }
        }
      }
    }

    const totalEarned = totalEarnedLev1 + totalEarnedLev2;
    const balance = totalEarned - totalWithdrawal;

    Logger.log("─────────────────────────────────────────────────────");
    Logger.log("\n📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:");
    Logger.log(`   total_bonus_points:  ${totalBonusPoints}`);
    Logger.log(`   total_payment:       ${totalPayment}₽`);
    Logger.log(`   total_earned_lev1:   ${totalEarnedLev1}₽`);
    Logger.log(`   total_earned_lev2:   ${totalEarnedLev2}₽`);
    Logger.log(`   total_earned:        ${totalEarned}₽`);
    Logger.log(`   total_withdrawal:    ${totalWithdrawal}₽`);
    Logger.log(`   balance:             ${balance}₽`);
    Logger.log("═══════════════════════════════════════════════════════");

  } catch (error) {
    Logger.log("❌ Ошибка тестирования: " + error.message);
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ: Проверка структуры таблиц
 * ═══════════════════════════════════════════════════════════════════════
 */
function testTablesStructure() {
  try {
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("🧪 ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ");
    Logger.log("═══════════════════════════════════════════════════════");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPayments = ss.getSheetByName("payments");
    const sheetReferals = ss.getSheetByName("referals");
    const sheetWithdraw = ss.getSheetByName("withdraw");

    if (!sheetPayments || !sheetReferals) {
      Logger.log("❌ Одна или обе таблицы не найдены");
      return;
    }

    // Проверка payments
    const payHeaders = sheetPayments.getRange(1, 1, 1, 18).getValues()[0];
    Logger.log("\n📋 ТАБЛИЦА PAYMENTS:");
    Logger.log("   Строк данных: " + (sheetPayments.getLastRow() - 1));
    Logger.log("   Заголовки:");
    Logger.log("   C (2):  " + payHeaders[2]);  // referal_id
    Logger.log("   G (6):  " + payHeaders[6]);  // payment
    Logger.log("   H (7):  " + payHeaders[7]);  // referer_L1
    Logger.log("   K (10): " + payHeaders[10]); // referer_L1_bonus
    Logger.log("   L (11): " + payHeaders[11]); // referer_L1_bonus_points
    Logger.log("   M (12): " + payHeaders[12]); // referer_L2
    Logger.log("   P (15): " + payHeaders[15]); // referer_L2_bonus

    // Проверка referals
    const refHeaders = sheetReferals.getRange(1, 1, 1, 19).getValues()[0];
    Logger.log("\n📋 ТАБЛИЦА REFERALS:");
    Logger.log("   Строк данных: " + (sheetReferals.getLastRow() - 1));
    Logger.log("   Заголовки:");
    Logger.log("   A (0):  " + refHeaders[0]);  // referal_id
    Logger.log("   M (12): " + refHeaders[12]); // total_bonus_points
    Logger.log("   N (13): " + refHeaders[13]); // total_payment
    Logger.log("   O (14): " + refHeaders[14]); // total_earned_lev1
    Logger.log("   P (15): " + refHeaders[15]); // total_earned_lev2
    Logger.log("   Q (16): " + refHeaders[16]); // total_earned
    Logger.log("   R (17): " + refHeaders[17]); // total_withdrawal
    Logger.log("   S (18): " + refHeaders[18]); // balance

    // Проверка withdraw
    if (sheetWithdraw) {
      const withdrawHeaders = sheetWithdraw.getRange(1, 1, 1, 3).getValues()[0];
      Logger.log("\n📋 ТАБЛИЦА WITHDRAW:");
      Logger.log("   Строк данных: " + (sheetWithdraw.getLastRow() - 1));
      Logger.log("   Заголовки:");
      Logger.log("   A (0): " + withdrawHeaders[0]); // transaction_time
      Logger.log("   B (1): " + withdrawHeaders[1]); // referal_id
      Logger.log("   C (2): " + withdrawHeaders[2]); // withdraw_sum
    } else {
      Logger.log("\n⚠️ ТАБЛИЦА WITHDRAW: не найдена");
    }

    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("✅ ПРОВЕРКА ЗАВЕРШЕНА");
    Logger.log("═══════════════════════════════════════════════════════");

  } catch (error) {
    Logger.log("❌ Ошибка проверки: " + error.message);
  }
}
