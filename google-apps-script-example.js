/**
 * ПРИМЕР КОДА ДЛЯ GOOGLE APPS SCRIPT
 * 
 * Скопируйте этот код в ваш Google Apps Script проект
 * Адаптируйте функцию getReferralData под вашу логику получения данных
 */

/**
 * Основная функция для обработки GET запросов
 * Вызывается автоматически при обращении к развернутому веб-приложению
 */
function doGet(e) {
	try {
		// Получаем ID пользователя из параметров URL
		var userId = e.parameter.id;

		// Проверяем, что ID передан
		if (!userId) {
			return createJSONResponse({
				error: "ID пользователя не указан",
				message: "Добавьте параметр ?id=YOUR_ID к URL"
			});
		}

		// Получаем данные о рефералах
		var data = getReferralData(userId);

		// Возвращаем данные в формате JSON
		return createJSONResponse(data);

	} catch (error) {
		// Обработка ошибок
		Logger.log('Ошибка в doGet: ' + error.toString());
		return createJSONResponse({
			error: "Ошибка сервера",
			message: error.toString()
		});
	}
}

/**
 * Вспомогательная функция для создания JSON ответа
 */
function createJSONResponse(data) {
	return ContentService
		.createTextOutput(JSON.stringify(data))
		.setMimeType(ContentService.MimeType.JSON);
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ - АДАПТИРУЙТЕ ПОД ВАШУ ЛОГИКУ
 * 
 * Эта функция должна получать данные о рефералах пользователя
 * и возвращать массив в нужном формате
 */
function getReferralData(userId) {
	// ВАРИАНТ 1: Получение данных из Google Sheets
	// Раскомментируйте и адаптируйте под вашу таблицу
	/*
	var spreadsheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
	var sheet = spreadsheet.getSheetByName('Referrals');
	var allData = sheet.getDataRange().getValues();
    
	// Фильтруем данные по userId
	var referralData = [];
	for (var i = 1; i < allData.length; i++) { // Начинаем с 1, чтобы пропустить заголовки
	  var row = allData[i];
	  // Предполагаем, что ID пригласителя в определенной колонке
	  if (row[4] == userId || row[2] == userId) { // Адаптируйте индексы колонок
		referralData.push([
		  row[0],  // уровень
		  row[1],  // дата регистрации
		  row[2],  // ник реферала
		  row[3],  // имя
		  row[4],  // ник пригласителя
		  row[5],  // бесплатные забеги
		  row[6],  // бонусы
		  row[7],  // выплаты
		  row[8],  // рефералов 1 уровня
		  row[9],  // рефералов 2 уровня
		  row[10], // заработано
		  row[11], // выведено
		  row[12], // баланс
		  row[13]  // всего рефералов
		]);
	  }
	}
    
	return referralData;
	*/

	// ВАРИАНТ 2: Тестовые данные (для проверки работы)
	// Удалите этот блок, когда настроите получение реальных данных
	Logger.log('Запрос данных для пользователя: ' + userId);

	return [
		// Формат: [уровень, дата, ник, имя, пригласитель, забеги, бонусы, выплаты, 1ур, 2ур, заработано, выведено, баланс, всего]
		[1, "2024-01-15", "user123", "Иван Петров", "admin", 5, 100, 50, 3, 5, 250.50, 100, 150.50, 8],
		[1, "2024-01-20", "user456", "Мария Сидорова", "admin", 3, 75, 25, 2, 3, 180.00, 50, 130.00, 5],
		[1, "2024-02-01", "user789", "Алексей Козлов", "admin", 8, 150, 100, 4, 6, 420.75, 200, 220.75, 10],
		[2, "2024-01-25", "ref001", "Анна Смирнова", "user123", 2, 50, 15, 0, 0, 95.25, 30, 65.25, 0],
		[2, "2024-02-05", "ref002", "Петр Иванов", "user123", 4, 80, 40, 0, 0, 175.50, 80, 95.50, 0],
		[2, "2024-02-10", "ref003", "Ольга Волкова", "user456", 1, 30, 10, 0, 0, 60.00, 20, 40.00, 0],
		[2, "2024-02-15", "ref004", "Дмитрий Новиков", "user789", 6, 120, 60, 0, 0, 280.00, 150, 130.00, 0],
		[2, "2024-02-20", "ref005", "Елена Павлова", "user789", 3, 65, 35, 0, 0, 145.25, 70, 75.25, 0]
	];
}

/**
 * ПРИМЕР: Функция для работы с Google Sheets
 * Раскомментируйте и адаптируйте при необходимости
 */
/*
function getReferralsFromSheet(userId) {
  var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
  var SHEET_NAME = 'Referrals';
  
  try {
	var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
	var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
	if (!sheet) {
	  throw new Error('Лист "' + SHEET_NAME + '" не найден');
	}
    
	var data = sheet.getDataRange().getValues();
	var headers = data[0];
	var result = [];
    
	// Находим индексы нужных колонок
	var colLevel = headers.indexOf('Уровень');
	var colDate = headers.indexOf('Дата регистрации');
	var colNick = headers.indexOf('Ник');
	var colName = headers.indexOf('Имя');
	var colInviter = headers.indexOf('Пригласитель');
	// ... и так далее для всех колонок
    
	// Проходим по всем строкам (кроме заголовка)
	for (var i = 1; i < data.length; i++) {
	  var row = data[i];
	  
	  // Проверяем, относится ли реферал к этому пользователю
	  if (row[colInviter] == userId || isSecondLevelReferral(userId, row[colInviter], data)) {
		result.push([
		  row[colLevel] || '',
		  Utilities.formatDate(row[colDate], Session.getScriptTimeZone(), 'yyyy-MM-dd'),
		  row[colNick] || '',
		  row[colName] || '',
		  row[colInviter] || '',
		  row[headers.indexOf('Бесплатные забеги')] || 0,
		  row[headers.indexOf('Бонусы')] || 0,
		  row[headers.indexOf('Выплаты')] || 0,
		  row[headers.indexOf('1 уровень')] || 0,
		  row[headers.indexOf('2 уровень')] || 0,
		  row[headers.indexOf('Заработано')] || 0,
		  row[headers.indexOf('Выведено')] || 0,
		  row[headers.indexOf('Баланс')] || 0,
		  row[headers.indexOf('Всего рефералов')] || 0
		]);
	  }
	}
    
	return result;
    
  } catch (error) {
	Logger.log('Ошибка при получении данных из таблицы: ' + error.toString());
	throw error;
  }
}

function isSecondLevelReferral(mainUserId, inviterId, allData) {
  // Проверяем, является ли пригласитель рефералом 1 уровня главного пользователя
  var headers = allData[0];
  var colNick = headers.indexOf('Ник');
  var colInviter = headers.indexOf('Пригласитель');
  
  for (var i = 1; i < allData.length; i++) {
	if (allData[i][colNick] == inviterId && allData[i][colInviter] == mainUserId) {
	  return true;
	}
  }
  return false;
}
*/

/**
 * Тестовая функция для проверки работы
 * Запустите её в редакторе Apps Script
 */
function testGetReferralData() {
	var testUserId = "227290741";
	var result = getReferralData(testUserId);
	Logger.log('Результат для пользователя ' + testUserId + ':');
	Logger.log(JSON.stringify(result, null, 2));

	// Проверяем формат данных
	if (Array.isArray(result) && result.length > 0) {
		Logger.log('✓ Данные возвращены в правильном формате');
		Logger.log('✓ Количество рефералов: ' + result.length);
	} else {
		Logger.log('✗ Ошибка: данные не в формате массива или пустые');
	}
}

/**
 * ИНСТРУКЦИЯ ПО РАЗВЕРТЫВАНИЮ:
 * 
 * 1. Скопируйте этот код в ваш проект Google Apps Script
 * 2. Адаптируйте функцию getReferralData() под вашу логику
 * 3. Запустите функцию testGetReferralData() для проверки
 * 4. Нажмите "Развернуть" → "Новое развертывание"
 * 5. Выберите тип "Веб-приложение"
 * 6. Установите:
 *    - "Выполнить как": Я
 *    - "У кого есть доступ": Все
 * 7. Скопируйте URL развертывания
 * 8. Вставьте URL в файл index.html (переменная API_URL)
 */

