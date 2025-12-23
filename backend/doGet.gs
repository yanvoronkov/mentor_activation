function doGet(e) {
  try {
    // Получаем параметры
    var type = e.parameter.type;
    var userId = e.parameter.id;
    
    // === ЛОГИКА ДЛЯ ОТЧЕТА ПО ВЫПЛАТАМ ===
    if (type === 'payments') {
      var paymentsData = getPaymentsData();
      return ContentService
        .createTextOutput(JSON.stringify(paymentsData))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // === ЛОГИКА ДЛЯ ОТЧЕТА ПО БОНУСНЫМ ТРАНЗАКЦИЯМ ===
    if (type === 'bonusTransactions') {
      var bonusData = getBonusTransactionsData();
      return ContentService
        .createTextOutput(JSON.stringify(bonusData))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // === СТАРАЯ ЛОГИКА (РЕФЕРАЛЫ) ===
    
    // Если ID не указан, возвращаем ошибку (для рефералов он нужен)
    if (!userId) {
      return ContentService
        .createTextOutput(JSON.stringify({error: "ID не указан"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Пытаемся получить данные из кеша
    var cache = CacheService.getScriptCache();
    var cached = cache.get("referral_data_v1"); // Ключ кеша
    
    if (cached != null) {
      return ContentService
        .createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Получаем все данные из таблицы
    var allData = getReferralData();
    var jsonOutput = JSON.stringify(allData);
    
    // Сохраняем в кеш на 10 минут (600 секунд)
    try {
      cache.put("referral_data_v1", jsonOutput, 600);
    } catch (e) {
      Logger.log("Cache error: " + e.toString()); 
    }
    
    return ContentService
      .createTextOutput(jsonOutput)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getReferralData() {
  const spreadsheetId = '1C9t0s9sCwXlnAmeloKDo2La8FncDGBux_TNG3zF3QNs';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('referals');
  // Получаем все данные, включая заголовки
  const data = sheet.getDataRange().getValues();
  return data;
}

function getPaymentsData() {
  const spreadsheetId = '1C9t0s9sCwXlnAmeloKDo2La8FncDGBux_TNG3zF3QNs';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('payments');
  if (!sheet) {
    return {error: "Sheet 'payments' not found"}; 
  }
  // Получаем все данные, включая заголовки
  const data = sheet.getDataRange().getValues();
  return data;
}

function getBonusTransactionsData() {
  const spreadsheetId = '1C9t0s9sCwXlnAmeloKDo2La8FncDGBux_TNG3zF3QNs';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('bonus_transactions');
  if (!sheet) {
    return {error: "Sheet 'bonus_transactions' not found"}; 
  }
  // Получаем все данные, включая заголовки
  const data = sheet.getDataRange().getValues();
  return data;
}