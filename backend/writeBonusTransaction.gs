/**
 * ═══════════════════════════════════════════════════════════════════════
 * ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Запись бонусной транзакции
 * ═══════════════════════════════════════════════════════════════════════
 * Создает запись о начисленном бонусе в таблице bon us_transactions
 * 
 * @param {Object} data - Данные для записи
 * @return {boolean} - true если успешно, false при ошибке
 */
function writeBonusTransaction(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("bonus_transactions");
    
    if (!sheet) {
      Logger.log("❌ Таблица bonus_transactions не найдена!");
      return false;
    }
    
    // Генерация bonus_id (или использование переданного)
    const timestamp = Date.now();
    const bonusId = data.bonusId || `${data.transactionId}-${data.bonus_level}-${timestamp}`;
    
    // Форматирование даты
    const createdAt = Utilities.formatDate(
      new Date(), 
      Session.getScriptTimeZone(), 
      "dd.MM.yyyy HH:mm:ss"
    );
    
    // Подготовка строки данных
    const rowData = [
      bonusId,                    // A: bonus_id
      data.transactionId,         // B: transaction_id
      data.referal_id,            // C: referal_id
      data.referal_name,          // D: referal_name
      data.referal_level,         // E: referal_level (уровень партнера 1,2,3)
      data.bonus_level,           // F: bonus_level (L1, L2, L3)
      data.bonus_amount || 0,     // G: bonus_amount
      data.bonus_points || 0,     // H:bonus_points
      data.bonus_percent || 0,    // I: bonus_percent
      data.buyer_id,              // J: buyer_id
      data.buyer_name,            // K: buyer_name
      data.buyer_level,           // L: buyer_level
      data.product_id,            // M: product_id
      data.payment_amount,        // N: payment_amount
      createdAt,                  // O: created_at
      data.status || "pending"    // P: status
    ];
    
    // Запись в таблицу
    sheet.appendRow(rowData);
    
    Logger.log(`  💾 Бонус записан: ${data.bonus_level} для ${data.referal_name} (${data.bonus_amount}₽ + ${data.bonus_points} б.)`);
    
    return true;
    
  } catch (error) {
    Logger.log(`❌ Ошибка записи бонуса: ${error.message}`);
    Logger.log(`   Transaction ID: ${data.transactionId}`);
    Logger.log(`   Partner ID: ${data.referal_id}`);
    Logger.log(`   Stack: ${error.stack}`);
    return false;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ТЕСТОВАЯ ФУНКЦИЯ: Проверка записи бонуса
 * ═══════════════════════════════════════════════════════════════════════
 */
function testWriteBonusTransaction() {
  Logger.log("🧪 Тестовая запись бонуса...");
  
  const testData = {
    transactionId: "TEST123456789",
    referal_id: "227193871",
    referal_name: "Ян Воронков",
    referal_level: 3,
    bonus_level: "L1",
    bonus_amount: 15,
    bonus_points: 1,
    bonus_percent: 0.15,
    buyer_id: "227783140",
    buyer_name: "Тестовый Покупатель",
    buyer_level: 1,
    product_id: 1,
    payment_amount: 100,
    status: "pending"
  };
  
  const result = writeBonusTransaction(testData);
  
  if (result) {
    Logger.log("✅ Тестовая запись успешно создана!");
  } else {
    Logger.log("❌ Ошибка при создании тестовой записи");
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ФУНКЦИЯ ПОИСКА: Найти бонусы по transaction_id
 * ═══════════════════════════════════════════════════════════════════════
 * @param {string} transactionId - ID транзакции
 * @return {Array} - Массив найденных бонусов
 */
function findBonusesByTransaction(transactionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("bonus_transactions");
    
    if (!sheet) {
      Logger.log("❌ Таблица bonus_transactions не найдена!");
      return [];
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("ℹ️ Таблица bonus_transactions пуста");
      return [];
    }
    
    const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    const foundBonuses = [];
    
    for (let i = 0; i < data.length; i++) {
      const bonusTxId = String(data[i][1]).trim(); // B: transaction_id
      const status = String(data[i][15]).trim();    // P: status
      
      if (bonusTxId === transactionId && status !== "cancelled") {
        foundBonuses.push({
          row: i + 2,
          bonus_id: data[i][0],
          transaction_id: data[i][1],
          referal_id: data[i][2],
          referal_name: data[i][3],
          referal_level: data[i][4],
          bonus_level: data[i][5],
          bonus_amount: data[i][6],
          bonus_points: data[i][7],
          bonus_percent: data[i][8],
          buyer_id: data[i][9],
          buyer_name: data[i][10],
          buyer_level: data[i][11],
          product_id: data[i][12],
          payment_amount: data[i][13],
          created_at: data[i][14],
          status: status
        });
      }
    }
    
    return foundBonuses;
    
  } catch (error) {
    Logger.log(`❌ Ошибка поиска бонусов: ${error.message}`);
    return [];
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * ФУНКЦИЯ СТОРНИРОВАНИЯ: Отменить бонусы по transaction_id
 * ═══════════════════════════════════════════════════════════════════════
 * Находит все активные бонусы для указанной транзакции и создает
 * сторнирующие записи с отрицательными суммами
 * 
 * @param {string} transactionId - ID транзакции для сторнирования
 * @param {string} reason - Причина сторнирования (опционально)
 * @return {Object} - Результат операции {success, reversed, errors}
 */
function reverseBonusTransaction(transactionId, reason) {
  try {
    Logger.log(`🔄 Сторнирование транзакции: ${transactionId}`);
    
    if (!transactionId) {
      Logger.log("❌ Не указан transaction_id");
      return {success: false, reversed: 0, errors: ["Не указан transaction_id"]};
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("bonus_transactions");
    const paymentsSheet = ss.getSheetByName("payments");
    
    if (!sheet) {
      Logger.log("❌ Таблица bonus_transactions не найдена!");
      return {success: false, reversed: 0, errors: ["Таблица не найдена"]};
    }
    
    // Находим все активные бонусы для этой транзакции
    const bonuses = findBonusesByTransaction(transactionId);
    
    if (bonuses.length === 0) {
      Logger.log(`⚠️ Не найдено активных бонусов для транзакции ${transactionId}`);
      return {success: false, reversed: 0, errors: ["Бонусы не найдены"]};
    }
    
    Logger.log(`📋 Найдено бонусов для отмены: ${bonuses.length}`);
    
    const reasonText = reason || "Сторнирование";
    let reversedCount = 0;
    const errors = [];
    
    // Сначала помечаем оригинальные записи как отмененные
    for (const bonus of bonuses) {
      try {
        sheet.getRange(bonus.row, 16).setValue("cancelled"); // P: status
        Logger.log(`  ✅ Отменен бонус: ${bonus.bonus_level} для ${bonus.referal_name} (${bonus.bonus_amount}₽)`);
      } catch (error) {
        errors.push(`Ошибка отмены бонуса ${bonus.bonus_id}: ${error.message}`);
        Logger.log(`  ❌ ${errors[errors.length - 1]}`);
      }
    }
    
    // Теперь создаем сторнирующие записи с отрицательными суммами
    for (const bonus of bonuses) {
      try {
        const reverseData = {
          transactionId: bonus.transaction_id,
          referal_id: bonus.referal_id,
          referal_name: bonus.referal_name,
          referal_level: bonus.referal_level,
          bonus_level: bonus.bonus_level,
          bonus_amount: -bonus.bonus_amount,  // Отрицательная сумма!
          bonus_points: -bonus.bonus_points,  // Отрицательные баллы!
          bonus_percent: bonus.bonus_percent,
          buyer_id: bonus.buyer_id,
          buyer_name: bonus.buyer_name,
          buyer_level: bonus.buyer_level,
          product_id: bonus.product_id,
          payment_amount: bonus.payment_amount,
          status: "reversed",
          note: reasonText
        };
        
        const result = writeBonusTransaction(reverseData);
        if (result) {
          reversedCount++;
        }
      } catch (error) {
        errors.push(`Ошибка создания сторно для ${bonus.bonus_id}: ${error.message}`);
        Logger.log(`  ❌ ${errors[errors.length - 1]}`);
      }
    }
    
    const success = reversedCount > 0;
    
    if (success) {
      Logger.log(`✅ Успешно сторнировано бонусов: ${reversedCount}`);
      
      // Устанавливаем статус "cancelled" в payments
      if (paymentsSheet) {
        try {
          const lastRow = paymentsSheet.getLastRow();
          if (lastRow >= 2) {
            const data = paymentsSheet.getRange(2, 1, lastRow - 1, 8).getValues();
            
            for (let i = 0; i < data.length; i++) {
              const txId = String(data[i][0]).trim();
              if (txId === transactionId) {
                // Устанавливаем статус "cancelled" в колонке H
                paymentsSheet.getRange(i + 2, 8).setValue("cancelled");
                Logger.log(`  ✅ Статус в payments обновлен: cancelled`);
                break;
              }
            }
          }
        } catch (error) {
          Logger.log(`⚠️ Не удалось обновить статус в payments: ${error.message}`);
        }
      }
      
      Logger.log(`💡 Запустите updateReferalsTotals() для пересчета балансов`);
    }
    
    return {
      success: success,
      reversed: reversedCount,
      errors: errors
    };
    
  } catch (error) {
    Logger.log(`❌ Критическая ошибка сторнирования: ${error.message}`);
    Logger.log(`Stack: ${error.stack}`);
    return {
      success: false,
      reversed: 0,
      errors: [error.message]
    };
  }
}





/**
 * ═══════════════════════════════════════════════════════════════════════
 * ТЕСТОВАЯ ФУНКЦИЯ: Тест сторнирования
 * ═══════════════════════════════════════════════════════════════════════
 */
function testReverseBonusTransaction() {
  Logger.log("🧪 ═══════════════════════════════════════════════════");
  Logger.log("🧪 ТЕСТ СТОРНИРОВАНИЯ БОНУСОВ");
  Logger.log("🧪 ═══════════════════════════════════════════════════");
  
  // ВАЖНО: Замените на реальный transaction_id из вашей таблицы
  const testTransactionId = "TEST123456789"; 
  
  Logger.log(`🔍 Поиск бонусов для транзакции: ${testTransactionId}`);
  
  const bonuses = findBonusesByTransaction(testTransactionId);
  
  if (bonuses.length === 0) {
    Logger.log("⚠️ Бонусы не найдены. Создаем тестовый бонус...");
    testWriteBonusTransaction();
    Logger.log("✅ Тестовый бонус создан. Запустите функцию еще раз для проверки сторнирования.");
    return;
  }
  
  Logger.log(`📋 Найдено бонусов: ${bonuses.length}`);
  for (const bonus of bonuses) {
    Logger.log(`  - ${bonus.bonus_level}: ${bonus.referal_name} → ${bonus.bonus_amount}₽ + ${bonus.bonus_points} б.`);
  }
  
  Logger.log("\n🔄 Запуск сторнирования...");
  const result = reverseBonusTransaction(testTransactionId, "Тестовое сторнирование");
  
  Logger.log("\n📊 РЕЗУЛЬТАТ:");
  Logger.log(`  Success: ${result.success}`);
  Logger.log(`  Reversed: ${result.reversed}`);
  if (result.errors && result.errors.length > 0) {
    Logger.log(`  Errors: ${result.errors.join(", ")}`);
  }
  
  Logger.log("\n🧪 ═══════════════════════════════════════════════════");
  Logger.log("🧪 ТЕСТ ЗАВЕРШЕН");
  Logger.log("🧪 ═══════════════════════════════════════════════════");
}
