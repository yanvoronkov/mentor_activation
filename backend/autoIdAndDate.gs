/**
 * ═══════════════════════════════════════════════════════════════════════
 * АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ ID И ДАТЫ ДЛЯ НОВЫХ ТРАНЗАКЦИЙ
 * ═══════════════════════════════════════════════════════════════════════
 * Версия: 2.0
 * Дата: 22.12.2025
 * 
 * НАЗНАЧЕНИЕ:
 * - Автоматически генерирует уникальный transaction_id для новых записей
 * - Устанавливает дату и время транзакции
 * - Запускается через masterTrigger при изменении таблицы payments
 * 
 * ЛОГИКА:
 * - Проверяет наличие buyer_id (колонка C) - если есть, значит данные от API
 * - Если transaction_id (колонка A) пустой - генерирует новый
 * - Timestamp гарантированно уникальный (миллисекунды + счетчик)
 */

function autoIdAndDate() {
  try {
    const startTime = new Date();
    Logger.log("🚀 СТАРТ генерации ID и даты | " + startTime.toLocaleTimeString());
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("payments");
    
    if (!sheet) {
      Logger.log("❌ Лист 'payments' не найден");
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("ℹ️ Таблица payments пуста");
      return;
    }

    // Загружаем все 8 колонок payments
    const range = sheet.getRange(2, 1, lastRow - 1, 8);
    const values = range.getValues();
    
    let processedCount = 0;
    const baseTimestamp = new Date().getTime();
    const timezone = Session.getScriptTimeZone();

    for (let i = 0; i < values.length; i++) {
      const transactionId = values[i][0];  // A: transaction_id
      const buyerId = values[i][2];        // C: buyer_id (данные от API/бота)
      
      // Если есть buyer_id, но нет transaction_id - это новая запись
      if (!transactionId && buyerId) {
        // Генерируем уникальный ID (timestamp + индекс строки)
        // Это гарантирует уникальность даже при массовой вставке
        values[i][0] = baseTimestamp + i;
        
        // Устанавливаем дату и время в читаемом формате
        const now = new Date();
        values[i][1] = Utilities.formatDate(now, timezone, "dd.MM.yyyy HH:mm:ss");
        
        // Автоматическая установка статуса для покупок за баллы
        const paymentAmount = parseFloat(values[i][5]) || 0;      // F: payment_amount
        const bonusPointsSpent = parseFloat(values[i][6]) || 0;   // G: payment_bonus_points
        
        if (paymentAmount <= 0 && bonusPointsSpent > 0) {
          // Покупка за баллы - статус completed
          values[i][7] = "completed";
          Logger.log(`  📌 Статус: completed (покупка за ${bonusPointsSpent} баллов)`);
        }
        // Для денежных покупок статус остается пустым
        
        processedCount++;
        
        Logger.log(`✅ Создан ID для buyer ${buyerId}: ${values[i][0]}`);
      }
    }

    // Сохраняем изменения только если что-то обработано
    if (processedCount > 0) {
      range.setValues(values);
      Logger.log(`💾 Сохранено изменений: ${processedCount}`);
    } else {
      Logger.log("ℹ️ Новых записей не найдено");
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    Logger.log(`✅ ЗАВЕРШЕНО за ${duration.toFixed(2)} сек | Обработано: ${processedCount}`);
    
  } catch (error) {
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("❌ КРИТИЧЕСКАЯ ОШИБКА в autoIdAndDate:");
    Logger.log("   " + error.message);
    Logger.log("   Stack: " + error.stack);
    Logger.log("═══════════════════════════════════════════════════════");
    throw error;
  }
}