/**
 * ═══════════════════════════════════════════════════════════════════════
 * ПОЛЬЗОВАТЕЛЬСКОЕ МЕНЮ ДЛЯ УПРАВЛЕНИЯ БОНУСАМИ
 * ═══════════════════════════════════════════════════════════════════════
 * Создает меню в Google Sheets для удобной работы с бонусными транзакциями
 * 
 * ВАЖНО: Эта функция запускается автоматически при открытии таблицы
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🎁 Управление бонусами')
    .addSubMenu(ui.createMenu('🔍 Поиск и просмотр')
      .addItem('📋 Найти бонусы по Transaction ID', 'menuFindBonuses')
      .addItem('📊 Показать статистику', 'menuShowStats'))
    .addSeparator()
    .addItem('❌ Отменить транзакцию', 'menuReverseBonuses')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Обновление данных')
      .addItem('🔄 Пересчитать бонусы (MLM)', 'menuRecalculateBonuses')
      .addItem('📊 Обновить итоги (Referals)', 'menuUpdateTotals')
      .addItem('🎯 Пересчитать уровни', 'menuRecalculateLevels')
      .addSeparator()
      .addItem('💰 Начислить месячные бонусы', 'menuCalculateMonthlyBonus'))
    .addSeparator()
    .addItem('📖 Справка', 'menuShowHelp')
    .addToUi();
  
  Logger.log('✅ Пользовательское меню загружено');
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * МЕНЮ: ПОИСК БОНУСОВ
 * ═══════════════════════════════════════════════════════════════════════
 */
function menuFindBonuses() {
  const ui = SpreadsheetApp.getUi();
  
  // Показываем диалог для ввода Transaction ID
  const response = ui.prompt(
    '🔍 Поиск бонусов',
    'Введите Transaction ID для поиска:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return; // Пользователь отменил
  }
  
  const transactionId = response.getResponseText().trim();
  
  if (!transactionId) {
    ui.alert('❌ Ошибка', 'Transaction ID не может быть пустым', ui.ButtonSet.OK);
    return;
  }
  
  // Ищем бонусы
  const bonuses = findBonusesByTransaction(transactionId);
  
  if (bonuses.length === 0) {
    ui.alert(
      '⚠️ Бонусы не найдены',
      `Не найдено активных бонусов для транзакции: ${transactionId}`,
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Формируем красивое сообщение
  let message = `Найдено бонусов: ${bonuses.length}\n\n`;
  
  bonuses.forEach((bonus, index) => {
    message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Бонус ${index + 1}:\n`;
    message += `  Уровень: ${bonus.bonus_level}\n`;
    message += `  Партнер: ${bonus.referal_name}\n`;
    message += `  Сумма: ${bonus.bonus_amount}₽\n`;
    message += `  Баллы: ${bonus.bonus_points}\n`;
    message += `  Статус: ${bonus.status}\n`;
  });
  
  ui.alert('📋 Результаты поиска', message, ui.ButtonSet.OK);
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * МЕНЮ: СТОРНИРОВАНИЕ ТРАНЗАКЦИИ
 * ═══════════════════════════════════════════════════════════════════════
 */
function menuReverseBonuses() {
  const ui = SpreadsheetApp.getUi();
  
  // Ввод Transaction ID
  const idResponse = ui.prompt(
    '🔄 Сторнирование транзакции',
    'Введите Transaction ID для отмены:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (idResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const transactionId = idResponse.getResponseText().trim();
  
  if (!transactionId) {
    ui.alert('❌ Ошибка', 'Transaction ID не может быть пустым', ui.ButtonSet.OK);
    return;
  }
  
  // Проверяем наличие бонусов
  const bonuses = findBonusesByTransaction(transactionId);
  
  if (bonuses.length === 0) {
    ui.alert(
      '⚠️ Бонусы не найдены',
      `Не найдено активных бонусов для транзакции: ${transactionId}`,
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Показываем что будет отменено
  let confirmMessage = `Будет отменено бонусов: ${bonuses.length}\n\n`;
  bonuses.forEach(bonus => {
    confirmMessage += `• ${bonus.bonus_level}: ${bonus.referal_name} → ${bonus.bonus_amount}₽ + ${bonus.bonus_points}б.\n`;
  });
  confirmMessage += `\n⚠️ Это действие создаст сторнирующие записи и отменит транзакцию в payments.\nПродолжить?`;
  
  const confirm = ui.alert(
    '⚠️ Подтверждение',
    confirmMessage,
    ui.ButtonSet.YES_NO
  );
  
  if (confirm !== ui.Button.YES) {
    ui.alert('ℹ️ Отменено', 'Операция отменена пользователем', ui.ButtonSet.OK);
    return;
  }
  
  // Выполняем сторнирование
  ui.alert('⏳ Обработка...', 'Выполняется сторнирование, пожалуйста подождите...', ui.ButtonSet.OK);
  
  const result = reverseBonusTransaction(transactionId);
  
  // Показываем результат
  if (result.success) {
    // Обновляем балансы
    updateReferalsTotals();
    
    ui.alert(
      '✅ Успешно!',
      `Сторнировано бонусов: ${result.reversed}\n\nБалансы в таблице referals обновлены.`,
      ui.ButtonSet.OK
    );
  } else {
    let errorMsg = 'Ошибки:\n';
    if (result.errors && result.errors.length > 0) {
      errorMsg += result.errors.join('\n');
    }
    ui.alert('❌ Ошибка', errorMsg, ui.ButtonSet.OK);
  }
}





/**
 * ═══════════════════════════════════════════════════════════════════════
 * МЕНЮ: СТАТИСТИКА
 * ═══════════════════════════════════════════════════════════════════════
 */
function menuShowStats() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Собираем статистику
  const bonusSheet = ss.getSheetByName('bonus_transactions');
  const referalsSheet = ss.getSheetByName('referals');
  const paymentsSheet = ss.getSheetByName('payments');
  
  let stats = '📊 СТАТИСТИКА СИСТЕМЫ\n\n';
  
  if (bonusSheet) {
    const lastRow = bonusSheet.getLastRow();
    const data = lastRow > 1 ? bonusSheet.getRange(2, 16, lastRow - 1, 1).getValues() : [];
    
    let pending = 0, reversed = 0, cancelled = 0;
    data.forEach(row => {
      const status = String(row[0]).trim();
      if (status === 'pending') pending++;
      else if (status === 'reversed') reversed++;
      else if (status === 'cancelled') cancelled++;
    });
    
    stats += `💾 Бонусные транзакции:\n`;
    stats += `  Всего: ${lastRow - 1}\n`;
    stats += `  Активных: ${pending}\n`;
    stats += `  Сторнированных: ${reversed}\n`;
    stats += `  Отмененных: ${cancelled}\n\n`;
  }
  
  if (referalsSheet) {
    stats += `👥 Рефералы: ${referalsSheet.getLastRow() - 1}\n\n`;
  }
  
  if (paymentsSheet) {
    stats += `💰 Платежи: ${paymentsSheet.getLastRow() - 1}\n`;
  }
  
  ui.alert('📊 Статистика', stats, ui.ButtonSet.OK);
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * МЕНЮ: ОБНОВЛЕНИЕ ДАННЫХ
 * ═══════════════════════════════════════════════════════════════════════
 */
function menuRecalculateBonuses() {
  const ui = SpreadsheetApp.getUi();
  
  const confirm = ui.alert(
    '🔄 Пересчет бонусов',
    'Будут рассчитаны бонусы для всех новых транзакций.\n\nПродолжить?',
    ui.ButtonSet.YES_NO
  );
  
  if (confirm === ui.Button.YES) {
    ui.alert('⏳ Обработка...', 'Пересчет бонусов, пожалуйста подождите...', ui.ButtonSet.OK);
    calculateMlmBonuses();
    ui.alert('✅ Готово!', 'Бонусы успешно пересчитаны.', ui.ButtonSet.OK);
  }
}

function menuUpdateTotals() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert('⏳ Обработка...', 'Обновление итогов, пожалуйста подождите...', ui.ButtonSet.OK);
  updateReferalsTotals();
  ui.alert('✅ Готово!', 'Итоги успешно обновлены в таблице referals.', ui.ButtonSet.OK);
}

function menuRecalculateLevels() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert('⏳ Обработка...', 'Пересчет уровней, пожалуйста подождите...', ui.ButtonSet.OK);
  calculateReferralLevels();
  ui.alert('✅ Готово!', 'Уровни рефералов пересчитаны.', ui.ButtonSet.OK);
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * МЕНЮ: СПРАВКА
 * ═══════════════════════════════════════════════════════════════════════
 */
function menuShowHelp() {
  const ui = SpreadsheetApp.getUi();
  
  const help = 
    '📖 СПРАВКА ПО УПРАВЛЕНИЮ БОНУСАМИ\n\n' +
    '🔍 Поиск и просмотр:\n' +
    '  • Найти бонусы - показать все бонусы для транзакции\n' +
    '  • Статистика - общая информация о системе\n\n' +
    '🔄 Сторнирование:\n' +
    '  • Отменить транзакцию - создать сторнирующие записи\n' +
    '  • Исправить транзакцию - отменить + пересчитать\n\n' +
    '⚙️ Обновление данных:\n' +
    '  • Пересчитать бонусы - для новых транзакций\n' +
    '  • Обновить итоги - пересчет балансов\n' +
    '  • Пересчитать уровни - обновление lev1/lev2\n' +
    '  • Месячные бонусы - 3% за 9+ баллов\n\n' +
    '� Месячные бонусы:\n' +
    '  Порог: 9+ бонусных баллов за месяц\n' +
    '  Бонус: 3% от заработанных денег\n' +
    '  Запуск: вручную в конце месяца\n\n' +
    '📝 Важно:\n' +
    '  При сторнировании cancelled и reversed записи\n' +
    '  не учитываются в расчетах балансов.';
  
  ui.alert('📖 Справка', help, ui.ButtonSet.OK);
}
