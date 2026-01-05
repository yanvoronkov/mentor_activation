#!/bin/bash

# ============================================================================
# Скрипт проверки конфигурации после миграции
# ============================================================================
# Использование: ./check_migration.sh
# ============================================================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🔍 ПРОВЕРКА КОНФИГУРАЦИИ ПОСЛЕ МИГРАЦИИ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Счетчики
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Функция проверки
check_item() {
    local description="$1"
    local check_command="$2"
    local check_type="${3:-error}" # error или warning
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $description${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [ "$check_type" == "warning" ]; then
            echo -e "${YELLOW}⚠️  $description${NC}"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        else
            echo -e "${RED}❌ $description${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
        return 1
    fi
}

# Функция для извлечения ID из файла
extract_id() {
    local file="$1"
    grep -o "'[0-9A-Za-z_-]\{40,\}'" "$file" 2>/dev/null | head -1 | tr -d "'"
}

# Функция для извлечения deployment URL
extract_deployment_url() {
    grep -o "https://script.google.com/macros/s/[A-Za-z0-9_-]\+/exec" "$1" 2>/dev/null | head -1
}

echo -e "${YELLOW}📋 Структура проекта${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_item "Папка backend существует" "[ -d 'backend' ]"
check_item "Папка docs существует" "[ -d 'docs' ]"
check_item "Файл docs/config.js существует" "[ -f 'docs/config.js' ]"
check_item "Файл docs/index.html существует" "[ -f 'docs/index.html' ]"
echo ""

echo -e "${YELLOW}📝 Backend файлы${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_item "backend/doGet.gs существует" "[ -f 'backend/doGet.gs' ]"
check_item "backend/ssr_renderer.gs существует" "[ -f 'backend/ssr_renderer.gs' ]"
check_item "backend/calculateMlmBonuses_trigger.gs существует" "[ -f 'backend/calculateMlmBonuses_trigger.gs' ]"
check_item "backend/updateReferalsTotals.gs существует" "[ -f 'backend/updateReferalsTotals.gs' ]"
check_item "backend/masterTrigger.gs существует" "[ -f 'backend/masterTrigger.gs' ]"
echo ""

echo -e "${YELLOW}🔑 Google Spreadsheet ID${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Извлечение ID из файлов
if [ -f "backend/doGet.gs" ]; then
    DOGET_ID=$(extract_id "backend/doGet.gs")
    if [ ! -z "$DOGET_ID" ]; then
        echo -e "${GREEN}✅ backend/doGet.gs: $DOGET_ID${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ backend/doGet.gs: ID не найден${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

if [ -f "backend/ssr_renderer.gs" ]; then
    SSR_ID=$(extract_id "backend/ssr_renderer.gs")
    if [ ! -z "$SSR_ID" ]; then
        echo -e "${GREEN}✅ backend/ssr_renderer.gs: $SSR_ID${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ backend/ssr_renderer.gs: ID не найден${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# Проверка на одинаковость ID
if [ ! -z "$DOGET_ID" ] && [ ! -z "$SSR_ID" ]; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ "$DOGET_ID" == "$SSR_ID" ]; then
        echo -e "${GREEN}✅ ID совпадают во всех файлах${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ ID НЕ совпадают! Проверьте файлы${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
fi
echo ""

echo -e "${YELLOW}🚀 Deployment URL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "docs/config.js" ]; then
    DEPLOYMENT_URL=$(extract_deployment_url "docs/config.js")
    if [ ! -z "$DEPLOYMENT_URL" ]; then
        echo -e "${GREEN}✅ docs/config.js:${NC}"
        echo -e "   $DEPLOYMENT_URL"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ docs/config.js: Deployment URL не найден${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi
echo ""

echo -e "${YELLOW}📦 Резервные копии${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BACKUP_COUNT=$(find . -name "*.backup" 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Найдено резервных копий: $BACKUP_COUNT${NC}"
    find . -name "*.backup" -exec echo "   - {}" \;
else
    echo -e "${YELLOW}⚠️  Резервные копии не найдены${NC}"
    echo "   (Это нормально, если миграция еще не проводилась)"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📊 ИТОГИ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Всего проверок:       $TOTAL_CHECKS"
echo -e "${GREEN}✅ Успешно:           $PASSED_CHECKS${NC}"
echo -e "${RED}❌ Ошибок:            $FAILED_CHECKS${NC}"
echo -e "${YELLOW}⚠️  Предупреждений:   $WARNING_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ!${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Проверьте файлы, помеченные ❌"
    echo "Инструкция по миграции: МИГРАЦИЯ_ТАБЛИЦЫ.md"
    echo ""
    exit 1
fi
