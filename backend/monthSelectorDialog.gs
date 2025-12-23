/**
 * ═══════════════════════════════════════════════════════════════════════
 * HTML ДИАЛОГ ДЛЯ ВЫБОРА МЕСЯЦА
 * ═══════════════════════════════════════════════════════════════════════
 * Показывает красивый диалог с выпадающим списком последних 12 месяцев
 * 
 * @return {string} Выбранный месяц в формате YYYY-MM или null если отменено
 */
function showMonthSelector() {
  // Генерируем список последних 12 месяцев
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const monthNum = String(date.getMonth() + 1).padStart(2, '0');
    const monthValue = year + "-" + monthNum;
    
    // Русские названия месяцев
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const monthName = monthNames[date.getMonth()];
    
    months.push({
      value: monthValue,
      label: `${monthName} ${year}`,
      isCurrent: i === 1 // Предыдущий месяц по умолчанию
    });
  }
  
  // Создаем HTML
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: 'Google Sans', Arial, sans-serif;
            padding: 20px;
            margin: 0;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
          }
          h2 {
            color: #1a73e8;
            margin-top: 0;
            font-size: 20px;
          }
          .info {
            background: #e8f0fe;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            color: #174ea6;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #202124;
          }
          select {
            width: 100%;
            padding: 12px;
            font-size: 14px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            background: white;
            cursor: pointer;
          }
          select:focus {
            outline: none;
            border-color: #1a73e8;
            box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
          }
          .buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }
          button {
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
          }
          button.primary {
            background: #1a73e8;
            color: white;
          }
          button.primary:hover {
            background: #1557b0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          }
          button.secondary {
            background: white;
            color: #5f6368;
            border: 1px solid #dadce0;
          }
          button.secondary:hover {
            background: #f8f9fa;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>💰 Расчет месячных бонусов</h2>
          
          <div class="info">
            <strong>Условия:</strong><br>
            • Порог: 9+ бонусных баллов<br>
            • Бонус: 3% от заработанных денег
          </div>
          
          <div class="form-group">
            <label for="month">Выберите период для расчета:</label>
            <select id="month">
              ${months.map(m => `
                <option value="${m.value}" ${m.isCurrent ? 'selected' : ''}>
                  ${m.label}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="buttons">
            <button class="secondary" onclick="cancel()">Отмена</button>
            <button class="primary" onclick="calculate()">Рассчитать</button>
          </div>
        </div>
        
        <script>
          function calculate() {
            const month = document.getElementById('month').value;
            google.script.run
              .withSuccessHandler(() => google.script.host.close())
              .processMonthSelection(month);
          }
          
          function cancel() {
            google.script.run
              .withSuccessHandler(() => google.script.host.close())
              .processMonthSelection(null);
          }
          
          // Enter для расчета
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') calculate();
            if (e.key === 'Escape') cancel();
          });
        </script>
      </body>
    </html>
  `;
  
  const htmlOutput = HtmlService
    .createHtmlOutput(html)
    .setWidth(450)
    .setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Месячные бонусы');
}


/**
 * Обработчик выбора месяца из HTML диалога
 * Вызывается из JavaScript диалога
 */
function processMonthSelection(month) {
  if (month) {
    // Запускаем расчет
    const result = calculateMonthlyBonus(month);
    
    // Показываем результат
    if (result) {
      const ui = SpreadsheetApp.getUi();
      
      if (result.success) {
        ui.alert(
          '✅ Бонусы начислены!',
          `Период: ${month}\n\n` +
          `Партнеров достигли порога: ${result.eligibleCount}\n` +
          (result.skippedAlreadyPaid > 0 ? `Уже было начислено ранее: ${result.skippedAlreadyPaid}\n` : '') +
          `Начислено бонусов: ${result.bonusesCreated}\n` +
          `Общая сумма: ${result.totalMonthlyBonus.toFixed(2)}₽\n\n` +
          `⚠️ ВАЖНО: Запустите "Обновить итоги (Referals)"\n` +
          `для пересчета балансов!`,
          ui.ButtonSet.OK
        );
      } else {
        ui.alert(
          'ℹ️ Нет партнеров',
          `За период ${month} нет партнеров,\n` +
          `достигших порога в 9 баллов.\n\n` +
          `Всего с активностью: ${result.partnerCount}\n` +
          `Проверьте логи для подробностей.`,
          ui.ButtonSet.OK
        );
      }
    }
  }
}
