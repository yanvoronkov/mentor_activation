function doGet(e) {
  try {
    // Получаем ID из параметров URL
    var userId = e.parameter.id;
    
    // Если ID не указан, возвращаем ошибку
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
    // Максимальный размер значения кеша - 100КБ. Если данных много, можно кешировать частями или использовать другие методы.
    try {
      cache.put("referral_data_v1", jsonOutput, 600);
    } catch (e) {
      // Если данные слишком большие для кеша, просто игнорируем ошибку сохранения
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