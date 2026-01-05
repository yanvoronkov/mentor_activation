#!/bin/bash

# ============================================================================
# Скрипт автоматической замены ID Google таблицы
# ============================================================================
# Использование: ./replace_spreadsheet_id.sh НОВЫЙ_ID
# Пример: ./replace_spreadsheet_id.sh 1AbcDefGhiJklMnoPqrStUvWxYz123456789
# ============================================================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Старый ID таблицы
OLD_ID="1C9t0s9sCwXlnAmeloKDo2La8FncDGBux_TNG3zF3QNs"

# Проверка аргументов
if [ -z "$1" ]; then
    echo -e "${RED}❌ Ошибка: не указан новый ID таблицы${NC}"
    echo -e "${YELLOW}Использование: $0 НОВЫЙ_ID${NC}"
    echo ""
    echo "Пример:"
    echo "  $0 1AbcDefGhiJklMnoPqrStUvWxYz123456789"
    exit 1
fi

NEW_ID="$1"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🔄 ЗАМЕНА ID GOOGLE ТАБЛИЦЫ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Старый ID:${NC} $OLD_ID"
echo -e "${GREEN}Новый ID:${NC}  $NEW_ID"
echo ""

# Проверка корректности ID (базовая валидация)
if [ ${#NEW_ID} -lt 40 ]; then
    echo -e "${RED}❌ Ошибка: ID таблицы слишком короткий (минимум 40 символов)${NC}"
    echo -e "${YELLOW}Убедитесь, что вы скопировали полный ID из URL таблицы${NC}"
    exit 1
fi

# Запрос подтверждения
echo -e "${YELLOW}⚠️  Будут изменены следующие файлы:${NC}"
echo "   - backend/doGet.gs (3 места)"
echo "   - backend/ssr_renderer.gs (1 место)"
echo ""
read -p "Продолжить? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Отменено пользователем${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📝 ОБНОВЛЕНИЕ ФАЙЛОВ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Счетчик замен
TOTAL_REPLACEMENTS=0

# Функция замены в файле
replace_in_file() {
    local file="$1"
    local file_desc="$2"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}⚠️  Файл не найден: $file${NC}"
        return
    fi
    
    # Подсчет вхождений перед заменой
    local count=$(grep -c "$OLD_ID" "$file" 2>/dev/null || echo "0")
    
    if [ "$count" -eq 0 ]; then
        echo -e "${YELLOW}⏭️  $file_desc - не найдено вхождений${NC}"
        return
    fi
    
    # Создание резервной копии
    cp "$file" "$file.backup"
    
    # Замена ID
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/$OLD_ID/$NEW_ID/g" "$file"
    else
        # Linux
        sed -i "s/$OLD_ID/$NEW_ID/g" "$file"
    fi
    
    echo -e "${GREEN}✅ $file_desc - заменено вхождений: $count${NC}"
    TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + count))
}

# Замена в файлах
replace_in_file "backend/doGet.gs" "backend/doGet.gs"
replace_in_file "backend/ssr_renderer.gs" "backend/ssr_renderer.gs"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📊 ИТОГОВАЯ СТАТИСТИКА${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Всего заменено вхождений: $TOTAL_REPLACEMENTS${NC}"
echo -e "${GREEN}✅ Резервные копии сохранены с расширением .backup${NC}"
echo ""

if [ $TOTAL_REPLACEMENTS -gt 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠️  СЛЕДУЮЩИЕ ШАГИ${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "1. Скопируйте все .gs файлы в Google Apps Script редактор новой таблицы"
    echo "2. Создайте новое развертывание (Deploy → New deployment)"
    echo "3. Скопируйте новый Deployment URL"
    echo "4. Обновите docs/config.js с новым Deployment URL"
    echo "5. Настройте триггеры (см. МИГРАЦИЯ_ТАБЛИЦЫ.md)"
    echo ""
    echo "Подробная инструкция: МИГРАЦИЯ_ТАБЛИЦЫ.md"
    echo ""
fi

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ ГОТОВО!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
