/**
 * ═══════════════════════════════════════════════════════════════════════
 * РАСЧЕТ ЕЖЕМЕСЯЧНЫХ БОНУСОВ ЗА АКТИВНОСТЬ
 * ═══════════════════════════════════════════════════════════════════════
 * Версия: 1.1 (исправлена логика подсчета)
 * Дата: 22.12.2025
 * 
 * НАЗНАЧЕНИЕ:
 * - Начисляет дополнительный бонус партнерам за высокую активность
 * - Запускается вручную в конце месяца через меню
 * 
 * УСЛОВИЯ:
 * - Порог: 9+ бонусных баллов заработано за месяц
 * - Бонус: 3% от всех заработанных денег (bonus_amount) за этот месяц
 * - Начисляется только в деньгах (bonus_points = 0)
 * 
 * ЛОГИКА:
 * 1. Анализирует bonus_transactions за указанный месяц
 * 2. Группирует по партнерам (referal_id)
 * 3. Считает баллы и деньги каждого партнера
 * 4. Для партнеров с 9+ баллами создает MO бонус 3%
 */

/**
 * РАСЧЕТ ЕЖЕМЕСЯЧНЫХ БОНУСОВ ЗА АКТИВНОСТЬ
 * 
 * @param {string} month - Месяц в формате YYYY-MM (опционально)
 *                         Если не указан - запросит через UI
 */
function calculateMonthlyBonus(month) {
  try {
    const startTime = new Date();
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("💰 РАСЧЕТ ЕЖЕМЕСЯЧНЫХ БОНУСОВ");
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("🚀 Старт: " + startTime.toLocaleString());
    
    // ═══════════════════════════════════════════════════════════════════
    // КОНФИГУРАЦИЯ
    // ═══════════════════════════════════════════════════════════════════
    const THRESHOLD_POINTS = 9;      // Минимум баллов за месяц
    const BONUS_PERCENT = 0.03;      // 3% от заработанных денег
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bonusSheet = ss.getSheetByName("bonus_transactions");
    const referalsSheet = ss.getSheetByName("referals");
    
    if (!bonusSheet || !referalsSheet) {
      Logger.log("❌ Не найдены необходимые таблицы");
      return;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ОПРЕДЕЛЕНИЕ МЕСЯЦА
    // ═══════════════════════════════════════════════════════════════════
    let targetMonth = month;
    
    // Если месяц не указан - ошибка
    if (!targetMonth) {
      const error = 'Месяц не указан. Используйте calculateMonthlyBonus("2025-12")';
      Logger.log("❌ " + error);
      return;
    }
    
    // Проверка формата
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      const error = 'Неверный формат месяца: ' + targetMonth + '. Используйте YYYY-MM';
      Logger.log("❌ " + error);
      return;
    }
    
    Logger.log("📅 Расчет для месяца: " + targetMonth);
    
    // ═══════════════════════════════════════════════════════════════════
    // ЗАГРУЗКА ДАННЫХ
    // ═══════════════════════════════════════════════════════════════════
    const lastRow = bonusSheet.getLastRow();
    if (lastRow < 2) {
      ui.alert('ℹ️ Нет данных', 'Таблица bonus_transactions пуста', ui.ButtonSet.OK);
      Logger.log("ℹ️ Таблица bonus_transactions пуста");
      return;
    }
    
    const bonusData = bonusSheet.getRange(2, 1, lastRow - 1, 16).getValues();
    
    // Загрузка referals для получения имен
    const referalsData = referalsSheet.getRange(2, 1, referalsSheet.getLastRow() - 1, 5).getValues();
    const referalsMap = {};
    referalsData.forEach(row => {
      referalsMap[String(row[0]).trim()] = String(row[1]).trim(); // ID -> Name
    });
    
    Logger.log("📊 Загружено бонусов: " + bonusData.length);
    Logger.log("👥 Загружено партнеров: " + Object.keys(referalsMap).length);
    
    // ═══════════════════════════════════════════════════════════════════
    // ГРУППИРОВКА ПО ПАРТНЕРАМ ЗА МЕСЯЦ
    // ═══════════════════════════════════════════════════════════════════
    const partnerStats = {};
    let processedBonuses = 0;
    let skippedBonuses = 0;
    
    Logger.log("\n🔍 Анализ бонусов за " + targetMonth + ":");
    
    for (let i = 0; i < bonusData.length; i++) {
      const createdAt = String(bonusData[i][14]).trim();    // O: created_at
      const status = String(bonusData[i][15]).trim();       // P: status
      const bonusLevel = String(bonusData[i][5]).trim();    // F: bonus_level
      
      // Пропускаем отмененные и сторнированные
      if (status === "cancelled" || status === "reversed") {
        skippedBonuses++;
        continue;
      }
      
      // Пропускаем уже начисленные месячные бонусы
      if (bonusLevel === "MO") {
        skippedBonuses++;
        continue;
      }
      
      // Проверяем дату - относится ли к нужному месяцу
      let recordMonth = "";
      
      // Попытка парсинга разных форматов
      if (bonusData[i][14] instanceof Date) {
        // Google Sheets возвращает Date объект напрямую
        const date = bonusData[i][14];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        recordMonth = year + "-" + month;
      } else if (createdAt.includes(".")) {
        // Формат: 22.12.2025 16:38:03 или 22.12.2025
        const parts = createdAt.split(" ")[0].split(".");
        if (parts.length === 3) {
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          recordMonth = year + "-" + month; // 2025-12
        }
      } else if (createdAt.includes("-")) {
        // Формат ISO: 2025-12-22
        recordMonth = createdAt.substring(0, 7); // 2025-12
      } else if (!isNaN(createdAt) && createdAt.length > 0) {
        // Timestamp
        const timestamp = parseFloat(createdAt);
        if (timestamp > 0) {
          const date = new Date(timestamp);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          recordMonth = year + "-" + month;
        }
      } else if (createdAt.includes("GMT")) {
        // Формат: "Mon Dec 22 2025 17:59:15 GMT+0300"
        const date = new Date(createdAt);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          recordMonth = year + "-" + month;
        }
      }
      
      if (!recordMonth) {
        Logger.log(`⚠️ Не удалось распарсить дату: "${createdAt}" (строка ${i + 2})`);
        skippedBonuses++;
        continue;
      }
      
      if (recordMonth !== targetMonth) {
        skippedBonuses++;
        continue; // Не тот месяц
      }
      
      // Собираем статистику
      const referalId = String(bonusData[i][2]).trim();     // C: referal_id
      const bonusAmount = parseFloat(bonusData[i][6]) || 0; // G: bonus_amount
      const bonusPoints = parseFloat(bonusData[i][7]) || 0; // H: bonus_points
      
      if (!partnerStats[referalId]) {
        partnerStats[referalId] = {
          name: referalsMap[referalId] || "Неизвестный",
          totalPoints: 0,
          totalAmount: 0,
          bonusCount: 0
        };
      }
      
      partnerStats[referalId].totalPoints += bonusPoints;
      partnerStats[referalId].totalAmount += bonusAmount;
      partnerStats[referalId].bonusCount++;
      processedBonuses++;
    }
    
    Logger.log(`📊 Всего бонусов: ${bonusData.length}`);
    Logger.log(`✅ Подходящих за ${targetMonth}: ${processedBonuses}`);
    Logger.log(`⏭️  Пропущено: ${skippedBonuses}`);
    Logger.log(`👥 Партнеров с активностью: ${Object.keys(partnerStats).length}`);
    
    // Отладочная информация
    Logger.log("\n📋 ВСЕ ПАРТНЕРЫ С АКТИВНОСТЬЮ:");
    for (const partnerId in partnerStats) {
      const stats = partnerStats[partnerId];
      Logger.log(`  ${stats.name} (${partnerId}): ${stats.totalPoints} баллов, ${stats.totalAmount.toFixed(2)}₽, бонусов: ${stats.bonusCount}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ПРОВЕРКА УЖЕ НАЧИСЛЕННЫХ МЕСЯЧНЫХ БОНУСОВ
    // ═══════════════════════════════════════════════════════════════════
    const existingMonthlyBonuses = new Set();
    
    for (let i = 0; i < bonusData.length; i++) {
      const bonusLevel = String(bonusData[i][5]).trim();    // F: bonus_level
      const transactionId = String(bonusData[i][1]).trim(); // B: transaction_id (было A!)
      
      if (bonusLevel === "MO" && transactionId.startsWith(`MO-${targetMonth}-`)) {
        existingMonthlyBonuses.add(transactionId);
      }
    }
    
    if (existingMonthlyBonuses.size > 0) {
      Logger.log(`\n⚠️ Найдено уже начисленных месячных бонусов за ${targetMonth}: ${existingMonthlyBonuses.size}`);
      existingMonthlyBonuses.forEach(id => Logger.log(`  - ${id}`));
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // РАСЧЕТ И НАЧИСЛЕНИЕ МЕСЯЧНЫХ БОНУСОВ
    // ═══════════════════════════════════════════════════════════════════
    let eligibleCount = 0;
    let bonusesCreated = 0;
    let totalMonthlyBonus = 0;
    let skippedAlreadyPaid = 0;
    
    const timezone = Session.getScriptTimeZone();
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, timezone, "dd.MM.yyyy HH:mm:ss");
    
    Logger.log("\n───────────────────────────────────────────────────────");
    Logger.log("🎯 ПАРТНЕРЫ, ДОСТИГШИЕ ПОРОГА (9+ баллов):");
    Logger.log("───────────────────────────────────────────────────────");
    
    for (const partnerId in partnerStats) {
      const stats = partnerStats[partnerId];
      
      // Проверка порога
      if (stats.totalPoints >= THRESHOLD_POINTS) {
        eligibleCount++;
        
        // Генерация ID в новом формате
        const timestamp = new Date().getTime();
        const transactionId = `MO-${targetMonth}-${partnerId}`;  // MO-2025-12-227193871
        const bonusId = `${timestamp}-MO-${partnerId}`;           // 1766471512879-MO-227193871
        
        // Проверка на дубликат
        if (existingMonthlyBonuses.has(transactionId)) {
          Logger.log(`⏭️  ${stats.name} (${partnerId}): Бонус уже был начислен ранее`);
          skippedAlreadyPaid++;
          continue;
        }
        
        // Расчет месячного бонуса (3% от заработанных денег)
        const monthlyBonusAmount = stats.totalAmount * BONUS_PERCENT;
        
        Logger.log(`✅ ${stats.name} (${partnerId})`);
        Logger.log(`   Баллы: ${stats.totalPoints} | Заработано: ${stats.totalAmount.toFixed(2)}₽`);
        Logger.log(`   💰 Месячный бонус: ${monthlyBonusAmount.toFixed(2)}₽ (3%)`);
        Logger.log(`   🆔 Transaction ID: ${transactionId}`);
        Logger.log(`   🆔 Bonus ID: ${bonusId}`);
        
        // Создание записи в bonus_transactions
        const bonusSaved = writeBonusTransaction({
          transactionId: transactionId,
          bonusId: bonusId,              // Добавляем явный bonus_id
          referal_id: partnerId,
          referal_name: stats.name,
          referal_level: 0,              // Не применимо для месячных
          bonus_level: "MO",             // Месячный бонус (как L1/L2)
          bonus_amount: monthlyBonusAmount,
          bonus_points: 0,               // Баллы НЕ начисляются
          bonus_percent: BONUS_PERCENT,
          buyer_id: partnerId,           // Сам себе "покупатель"
          buyer_name: stats.name,
          buyer_level: 0,
          product_id: 0,                 // Не применимо
          payment_amount: stats.totalAmount, // Базовая сумма для расчета
          status: "pending"
        });
        
        if (bonusSaved) {
          bonusesCreated++;
          totalMonthlyBonus += monthlyBonusAmount;
        }
      } else {
        Logger.log(`❌ ${stats.name} (${partnerId}): ${stats.totalPoints} баллов - НЕ ДОСТИГ порога`);
      }
    }
    
    Logger.log("───────────────────────────────────────────────────────");
    
    // ═══════════════════════════════════════════════════════════════════
    // ИТОГИ
    // ═══════════════════════════════════════════════════════════════════
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    Logger.log("\n📊 ИТОГОВАЯ СТАТИСТИКА:");
    Logger.log("   📅 Период: " + targetMonth);
    Logger.log("   👥 Всего партнеров с активностью: " + Object.keys(partnerStats).length);
    Logger.log("   ✅ Достигли порога (9+ баллов): " + eligibleCount);
    Logger.log("   💰 Начислено бонусов: " + bonusesCreated);
    Logger.log("   💵 Общая сумма бонусов: " + totalMonthlyBonus.toFixed(2) + "₽");
    Logger.log("   ⏱️  Время выполнения: " + duration.toFixed(2) + " сек");
    Logger.log("✅ ЗАВЕРШЕНО | " + endTime.toLocaleTimeString());
    Logger.log("═══════════════════════════════════════════════════════");
    
    // Возвращаем результат для processMonthSelection
    return {
      success: bonusesCreated > 0,
      eligibleCount: eligibleCount,
      bonusesCreated: bonusesCreated,
      totalMonthlyBonus: totalMonthlyBonus,
      skippedAlreadyPaid: skippedAlreadyPaid,
      partnerCount: Object.keys(partnerStats).length,
      targetMonth: targetMonth
    };
    
  } catch (error) {
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("❌ КРИТИЧЕСКАЯ ОШИБКА:");
    Logger.log("   " + error.message);
    Logger.log("   Stack: " + error.stack);
    Logger.log("═══════════════════════════════════════════════════════");
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('❌ Ошибка', 'Произошла ошибка при расчете.\nПроверьте логи.', ui.ButtonSet.OK);
    } catch (e) {
      // UI недоступен - ничего не делаем
    }
    
    throw error;
  }
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * МЕНЮ: Запуск расчета месячных бонусов
 * ═══════════════════════════════════════════════════════════════════════
 * Показывает диалог выбора месяца, затем запускает расчет
 */
function menuCalculateMonthlyBonus() {
  showMonthSelector();
}
