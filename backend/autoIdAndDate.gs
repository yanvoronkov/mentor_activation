function autoIdAndDate() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("payments");
  if (!sheet) return; // Если листа нет, выходим

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // Если данных нет, выходим

  // Берем все данные (Колонки A, B, C)
  // 1 = колонка A, 3 = количество колонок (A, B, C)
  var range = sheet.getRange(2, 1, lastRow - 1, 3);
  var values = range.getValues();
  
  var isChanged = false;
  var now = new Date(); // Текущее время для всех новых строк
  var timestamp = now.getTime(); // Таймстэмп (число)

  for (var i = 0; i < values.length; i++) {
    var idCell = values[i][0];   // Колонка A
    var refData = values[i][2];  // Колонка C (данные от бота)

    // Если ID нет, а данные от бота есть
    if (idCell == "" && refData != "") {
      values[i][0] = timestamp + i; // A: Таймстэмп (+i чтобы не было дублей)
      values[i][1] = now;           // B: Нормальная дата и время
      isChanged = true;
    }
  }

  // Записываем обратно только если что-то меняли
  if (isChanged) {
    range.setValues(values);
  }
}