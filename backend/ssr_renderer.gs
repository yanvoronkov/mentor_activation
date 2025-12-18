function doGet(e) {
  if (!e || !e.parameter || !e.parameter.id) {
    return HtmlService.createHtmlOutput("Не указан ID пользователя.");
  }
  var userId = e.parameter.id;
  const data = getReferralData();
  const userReferralData = buildReferralTree(data, userId);
  const tableHtml = generateTable(userReferralData);
  return HtmlService.createHtmlOutput(tableHtml)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function getReferralData() {
  const spreadsheetId = '1C9t0s9sCwXlnAmeloKDo2La8FncDGBux_TNG3zF3QNs';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('referals'); // совпадает с названием вашего листа!
  const data = sheet.getDataRange().getValues();
  return data;
}

function buildReferralTree(data, userId) {
  const tree = [];
  const userRow = findUserRow(data, userId);
  if (userRow) buildTreeRecursive(data, userId, tree, 0);
  return tree;
}

function findUserRow(data, userId) {
  return data.find(row => row[0] == userId); // столбец А (referal_id)
}

function buildTreeRecursive(data, userId, tree, level) {
  if (level >= 2) return; // только два уровня
  const children = data.filter(row => row[4] == userId); // столбец E (referer_id)
  children.forEach(child => {
    const row = [
      level + 1,              // уровень 1 или 2
      formatDate(child[7]),   // дата регистрации (H)
      child[2],               // ник реферала (C)
      child[1],               // имя реферала (B)
      child[5],               // ник пригласителя (F)
      child[10],              // бесплатные забеги/спринты (K)
      child[11],              // бонус баллы (L)
      child[12],              // выплаты (M)
      child[13],              // заработано 1 уровень (N)
      child[14],              // заработано 2 уровень (O)
      child[15],              // всего заработано (P)
      child[16],              // всего выведено (Q)
      child[17],              // баланс (R)
      child[18]               // всего рефералов (S)
    ];
    tree.push(row);
    buildTreeRecursive(data, child[0], tree, level + 1); // id следующего реферала
  });
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function generateTable(referralData) {
  let table = `
  <style>
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif; font-size: 12px; table-layout: auto; }
  table, th, td { border: 1px solid #ddd; }
  th, td { padding: 8px; text-align: left; }
  th { background-color: #f2f2f2; font-weight: bold; }
  thead { position: sticky; top: 0; background-color: #f2f2f2; z-index: 100; }
  tr:nth-child(even) { background-color: #f9f9f9; }
  .hidden { display: none; }
  .expand-button { cursor: pointer; color: blue; text-decoration: underline; }
  </style>
  <script>
    function toggleLevel(level) {
      const rows = document.querySelectorAll(\`.level-\${level}\`);
      rows.forEach(row => {
        if (row.classList.contains('hidden')) { row.classList.remove('hidden'); }
        else { row.classList.add('hidden'); }
      });
    }
  </script>
  `;

  table += '<table><thead><tr>';
  table += '<th>Уровень</th><th>Дата регистрации</th><th>Ник реферала</th><th>Имя реферала</th><th>Ник пригласителя</th><th>Бесплатные забеги</th><th>Бонусы</th><th>Выплаты</th><th>Заработано 1 ур.</th><th>Заработано 2 ур.</th><th>Всего заработано</th><th>Выведено</th><th>Баланс</th><th>Всего рефералов</th>';
  table += '</tr></thead><tbody>';
  
  table += `
    <tr>
      <td colspan="15">
        <span class="expand-button" onclick="toggleLevel(1)">Развернуть/Свернуть уровень 1</span>
      </td>
    </tr>
  `;
  table += generateLevelRows(referralData, 1);

  table += `
    <tr>
      <td colspan="15">
        <span class="expand-button" onclick="toggleLevel(2)">Развернуть/Свернуть уровень 2</span>
      </td>
    </tr>
  `;
  table += generateLevelRows(referralData, 2);

  table += '</tbody></table>';
  return table;
}

function generateLevelRows(referralData, level) {
  let rows = '';
  referralData.forEach(row => {
    const [rowLevel, ...cells] = row;
    if (rowLevel === level) {
      rows += `<tr class="level-${level}">`;
      rows += `<td>${level}</td>`;
      cells.forEach(cell => {
        rows += `<td>${cell}</td>`;
      });
      rows += '</tr>';
    }
  });
  return rows;
}
