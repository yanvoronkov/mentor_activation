# 📤 Инструкция по загрузке на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Перейдите на [github.com](https://github.com) и войдите в свой аккаунт
2. Нажмите **"+"** в правом верхнем углу → **"New repository"**
3. Заполните форму:
   - **Repository name**: `referal-system-marina-talko` (или любое другое имя)
   - **Description**: "Реферальная система с двухуровневым деревом партнеров"
   - **Visibility**: 
     - ✅ **Public** - если хотите, чтобы проект был виден всем
     - ⬜ **Private** - если хотите сделать проект приватным
   - ⚠️ **НЕ создавайте** README, .gitignore или лицензию (они уже есть в проекте)
4. Нажмите **"Create repository"**

## Шаг 2: Подключите локальный репозиторий к GitHub

После создания репозитория GitHub покажет вам URL. Скопируйте его и выполните команды:

### Вариант A: HTTPS (рекомендуется для начинающих)
```bash
cd "/Users/yan/Documents/Контент для проектов/InСruises /Клиенты/Марина Талько/referal_system_marina_talko"
git remote add origin https://github.com/ВАШ_USERNAME/referal-system-marina-talko.git
git branch -M master
git push -u origin master
```

### Вариант B: SSH (если настроили SSH ключи)
```bash
cd "/Users/yan/Documents/Контент для проектов/InСruises /Клиенты/Марина Талько/referal_system_marina_talko"
git remote add origin git@github.com:ВАШ_USERNAME/referal-system-marina-talko.git
git branch -M master
git push -u origin master
```

**Замените `ВАШ_USERNAME`** на ваш реальный username на GitHub!

## Шаг 3: Введите credentials (если попросит)

При использовании HTTPS GitHub может попросить:
- **Username**: ваш GitHub username
- **Password**: 
  - ⚠️ НЕ используйте пароль от аккаунта!
  - ✅ Используйте **Personal Access Token** (см. ниже)

### Как создать Personal Access Token:

1. На GitHub: **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Нажмите **"Generate new token (classic)"**
3. Настройки:
   - **Note**: "Referal System Upload"
   - **Expiration**: 90 days (или любой срок)
   - **Scopes**: отметьте ✅ **repo** (все подпункты)
4. Нажмите **"Generate token"**
5. **ВАЖНО**: Скопируйте токен сразу! Он больше не будет показан
6. Используйте этот токен вместо пароля при push

## Шаг 4: Проверьте загрузку

После успешного push:
1. Обновите страницу репозитория на GitHub
2. Вы должны увидеть все файлы проекта
3. README.md будет автоматически показан на главной странице

## 🔄 Дальнейшая работа с Git

### Внести изменения и загрузить на GitHub:

```bash
# 1. Проверить изменения
git status

# 2. Добавить все изменённые файлы
git add .

# 3. Создать commit с описанием изменений
git commit -m "Описание ваших изменений"

# 4. Загрузить на GitHub
git push
```

### Получить последние изменения с GitHub:

```bash
git pull
```

## 📝 Полезные Git команды

```bash
# Посмотреть статус
git status

# Посмотреть историю коммитов
git log --oneline

# Посмотреть изменения в файлах
git diff

# Отменить изменения в файле (до add)
git checkout -- имя_файла

# Посмотреть подключенные репозитории
git remote -v
```

## 🌟 GitHub Pages (необязательно)

Вы можете разместить ваш проект как веб-сайт на GitHub Pages:

1. В настройках репозитория: **Settings** → **Pages**
2. **Source**: выберите **master** branch
3. Нажмите **Save**
4. Через несколько минут ваш сайт будет доступен по адресу:
   ```
   https://ВАШ_USERNAME.github.io/referal-system-marina-talko/
   ```

Файл `index.html` станет главной страницей!

## ⚠️ Важные замечания

1. **НЕ загружайте на GitHub**:
   - Пароли
   - API ключи
   - Персональные данные
   - Секретные токены

2. **API URL в index.html**:
   - Текущий URL Google Apps Script безопасен для публикации
   - Он уже публичный и доступен всем

3. **Ветка master vs main**:
   - Ваш проект использует ветку **master**
   - Новые проекты GitHub создают ветку **main**
   - Оба варианта работают одинаково

## 🆘 Проблемы и решения

### "Permission denied"
- Убедитесь, что используете правильный токен доступа
- Проверьте, что у токена есть права на `repo`

### "Remote origin already exists"
```bash
# Удалите старый remote
git remote remove origin
# Добавьте новый
git remote add origin URL_ВАШЕГО_РЕПОЗИТОРИЯ
```

### "Updates were rejected"
```bash
# Сначала получите изменения с GitHub
git pull origin master --allow-unrelated-histories
# Затем загрузите свои
git push
```

---

**Готово! 🎉** После загрузки на GitHub ваш проект будет доступен онлайн!

