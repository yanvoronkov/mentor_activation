---
description: Create a new full-stack feature (GAS Backend + Frontend)
---

# Workflow: Создание новой Full-Stack фичи

Этот воркфлоу описывает процесс добавления новой функциональности, затрагивающей и GAS (Backend), и HTML/JS (Frontend).

## 1. Backend: Создание функции в GAS
1. Создайте или выберите файл `.gs` в папке `backend/` или корне (в зависимости от структуры проекта).
2. Напишите функцию обработки данных.
3. Добавьте вызов этой функции в `doGet(e)` или `doPost(e)` в зависимости от типа операции.

```javascript
// Пример добавления в doGet
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'newFeature') {
    return returnJson(handleNewFeature(e));
  }
  // ...
}

function handleNewFeature(e) {
  // Логика
  return { success: true, daa: 'result' };
}
```

## 2. Frontend: Создание UI
1. Откройте `index.html` или соответствующий HTML-файл.
2. Добавьте необходимую разметку (кнопки, формы, блоки вывода).
3. Используйте CSS классы согласно правилам Glassmorphism (см. `.agent/rules/frontend.md`).

## 3. Frontend: JS логика
1. Откройте JS-файл или секцию `<script>`.
2. Напишите функцию для вызова API.

```javascript
async function callNewFeature() {
  try {
    const response = await fetch(GAS_URL + '?action=newFeature');
    const data = await response.json();
    console.log(data);
    // Обновление UI
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## 4. Тестирование
1. Деплой новой версии GAS (см. `deploy-gas.md`).
2. Проверка работы UI и ответов от сервера в консоли браузера.
