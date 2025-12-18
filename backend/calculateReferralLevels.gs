function calculateReferralLevels() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("referals");
  if (!sheet) {
    Logger.log("Лист с названием 'referals' не найден.");
    return;
  }
  const data = sheet.getDataRange().getValues();
  
  // Обновленная структура столбцов:
  // Столбец A (индекс 0) - referral_id (ID текущего пользователя)
  // Столбец F (индекс 5) - referer_id (ID пригласителя)
  // Столбец J (индекс 9) - lev1 (количество рефералов уровня 1)
  // Столбец K (индекс 10) - lev2 (количество рефералов уровня 2)
  // Столбец T (индекс 19) - totalReferals (общее количество рефералов по всем уровням)
  
  const updates = [];

  // Пропускаем заголовок, начинаем с i = 1
  for (let i = 1; i < data.length; i++) {
    const referalId = data[i][0];
    if (!referalId) continue; // Пропускаем пустые строки

    let lev1Count = 0;
    const lev1ReferalIds = [];
    
    // Подсчет рефералов уровня 1
    for (let j = 1; j < data.length; j++) {
      if (data[j][5] == referalId) {
        lev1Count++;
        lev1ReferalIds.push(data[j][0]);
      }
    }
    
    let lev2Count = 0;
    // Подсчет рефералов уровня 2
    if (lev1ReferalIds.length > 0) {
      for (const lev1Id of lev1ReferalIds) {
        for (let k = 1; k < data.length; k++) {
          if (data[k][5] == lev1Id) {
            lev2Count++;
          }
        }
      }
    }
    
    // Расчет общего количества рефералов
    const totalReferrals = lev1Count + lev2Count;
    
    // Сохраняем значения для обновления
    updates.push({row: i + 1, lev1: lev1Count, lev2: lev2Count, total: totalReferrals});
  }
  
  // Записываем все значения одним пакетом для оптимизации
  for (const update of updates) {
    sheet.getRange(update.row, 10).setValue(update.lev1); // Столбец J для lev1
    sheet.getRange(update.row, 11).setValue(update.lev2); // Столбец K для lev2
    sheet.getRange(update.row, 20).setValue(update.total); // Столбец T для totalReferals
  }
  
  Logger.log('Подсчет уровней рефералов завершен');
}