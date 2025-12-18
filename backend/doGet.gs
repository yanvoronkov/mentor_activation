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
    
    // Получаем все данные из таблицы
    var allData = getReferralData();
    
    // Находим строку пользователя, чтобы убедиться, что он существует (опционально)
    // В данном случае мы просто возвращаем все данные, как того требует фронтенд (он сам фильтрует)
    // Но если нужно возвращать только связанные данные, логику можно усложнить.
    // Судя по index.html, фронтенд ожидает массив массивов (строки таблицы).
    
    // ВОЗВРАЩАЕМ ВЕСЬ МАССИВ ДАННЫХ (без заголовков, или с ними - проверим фронтенд)
    // Фронтенд: const headers = rawData[0]; const rows = rawData.slice(1);
    // Значит, нужно вернуть все данные как есть.
    
    return ContentService
      .createTextOutput(JSON.stringify(allData))
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