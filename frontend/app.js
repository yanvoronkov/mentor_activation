/**
 * App Module
 * Handles UI interactions and rendering
 */

const App = {
    // Global data store
    allReferralsData: [],

    init() {
        this.bindEvents();
        this.loadInitialData();
    },

    bindEvents() {
        const loadAllBtn = document.getElementById('loadAllBtn');
        const searchInput = document.getElementById('searchInput');

        if (loadAllBtn) {
            loadAllBtn.addEventListener('click', () => {
                const searchEl = document.getElementById('searchInput');
                if (searchEl) searchEl.value = '';
                this.loadData(CONFIG.DEFAULT_USER_ID);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (this.allReferralsData.length > 0) {
                    this.searchReferrals(e.target.value);
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (this.allReferralsData.length > 0) {
                        this.searchReferrals(e.target.value);
                    } else {
                        this.loadData(CONFIG.DEFAULT_USER_ID);
                    }
                }
            });
        }

        // Expose toggleLevel globally as it's used in inline onclick
        window.toggleLevel = this.toggleLevel;
    },

    loadInitialData() {
        const urlId = API.getIdFromURL();
        const userId = urlId || CONFIG.DEFAULT_USER_ID;
        this.loadData(userId);
    },

    async loadData(userId) {
        if (!userId) {
            alert('Пожалуйста, введите ID пользователя');
            return;
        }

        this.hideElement('statsContainer');
        this.hideElement('treeContainer');
        this.showElement('loadingContainer');

        try {
            const processedData = await API.loadData(userId);
            this.hideElement('loadingContainer');

            if (!processedData || processedData.length === 0) {
                this.showEmptyState();
                return;
            }

            this.allReferralsData = processedData;
            this.displayData(processedData);

        } catch (error) {
            console.error('Load Error:', error);
            this.hideElement('loadingContainer');
            this.showError(error);
        }
    },

    displayData(data) {
        this.displayStats(data);
        this.renderTree(data);
    },

    displayStats(data) {
        const level1Count = data.filter(r => r[0] === 1).length;
        const level2Count = data.filter(r => r[0] === 2).length;
        const totalReferrals = level1Count + level2Count;

        const totalEarned = data.reduce((sum, r) => sum + (parseFloat(r[10]) || 0), 0);
        const totalBalance = data.reduce((sum, r) => sum + (parseFloat(r[12]) || 0), 0);

        const statsHTML = `
            <div class="stat-card">
                <div class="stat-label">Всего рефералов</div>
                <div class="stat-value">${totalReferrals}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Партнеры 1 уровня</div>
                <div class="stat-value">${level1Count}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Партнеры 2 уровня</div>
                <div class="stat-value">${level2Count}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Общий заработок</div>
                <div class="stat-value">${totalEarned.toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Текущий баланс</div>
                <div class="stat-value">${totalBalance.toFixed(2)}</div>
            </div>
        `;

        document.getElementById('statsContainer').innerHTML = statsHTML;
        this.showElement('statsContainer');
    },

    renderTree(data) {
        const level1Data = data.filter(r => r[0] === 1);
        const level2Data = data.filter(r => r[0] === 2);

        let html = '';

        if (level1Data.length > 0) {
            html += this.renderLevelSection(1, 'Прямые партнеры', level1Data);
        }

        if (level2Data.length > 0) {
            html += this.renderLevelSection(2, 'Партнеры партнеров', level2Data);
        }

        document.getElementById('treeContainer').innerHTML = html;
        this.showElement('treeContainer');
    },

    renderLevelSection(level, title, data) {
        const headerClass = level === 2 ? 'level-header level-2' : 'level-header';
        return `
            <div class="${headerClass}" onclick="toggleLevel(${level})">
                <span class="level-icon">▼</span>
                <span class="level-title">Уровень ${level} - ${title}</span>
                <span class="level-count">${data.length}</span>
            </div>
            <div id="level-${level}-content">
                ${data.map(referral => this.createReferralCard(referral, level)).join('')}
            </div>
        `;
    },

    createReferralCard(referral, level) {
        const [lvl, date, nick, name, inviterNick, freeRuns, bonuses, payouts, level1, level2, earned, withdrawn, balance, totalRefs] = referral;

        const formatValue = (val) => {
            if (val === '' || val === null || val === undefined) return '0';
            const num = parseFloat(val);
            return isNaN(num) ? '0' : (num % 1 === 0 ? num.toString() : num.toFixed(2));
        };

        const initial = (name || nick || '?').charAt(0).toUpperCase();

        return `
            <div class="referral-card level-${level}">
                <div class="referral-header">
                    <div class="user-icon">${initial}</div>
                    <div class="user-info">
                        <div class="user-name">${name || 'Не указано'}</div>
                        <div class="user-nick">@${nick || 'неизвестен'}</div>
                    </div>
                    <div class="user-date">📅 ${date || 'Дата не указана'}</div>
                </div>
                <div class="referral-stats">
                    <div class="stat-item">
                        <div class="stat-item-label">Пригласил</div>
                        <div class="stat-item-value">@${inviterNick || '-'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Бесплатные забеги</div>
                        <div class="stat-item-value">${formatValue(freeRuns)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Бонусы</div>
                        <div class="stat-item-value positive">${formatValue(bonuses)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Заработано</div>
                        <div class="stat-item-value positive">${formatValue(earned)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Выведено</div>
                        <div class="stat-item-value">${formatValue(withdrawn)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Баланс</div>
                        <div class="stat-item-value positive">${formatValue(balance)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Выплаты</div>
                        <div class="stat-item-value">${formatValue(payouts)}</div>
                    </div>
                </div>
            </div>
        `;
    },

    searchReferrals(query) {
        if (!query || query.trim() === '') {
            this.renderTree(this.allReferralsData);
            this.displayStats(this.allReferralsData);
            return;
        }

        const searchTerm = query.toLowerCase().trim();
        const filtered = this.allReferralsData.filter(referral => {
            const [level, date, nick, name, inviterNick] = referral;
            return (
                (nick && nick.toLowerCase().includes(searchTerm)) ||
                (name && name.toLowerCase().includes(searchTerm)) ||
                (inviterNick && inviterNick.toLowerCase().includes(searchTerm)) ||
                (date && date.includes(searchTerm))
            );
        });

        console.log(`Search for "${query}" found ${filtered.length} results`);

        if (filtered.length === 0) {
            this.hideElement('statsContainer');
            document.getElementById('treeContainer').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-text">Ничего не найдено по запросу "${query}"</div>
                </div>
            `;
            this.showElement('treeContainer');
            return;
        }

        this.displayStats(filtered);
        this.renderTree(filtered);
    },

    toggleLevel(level) {
        const content = document.getElementById(`level-${level}-content`);
        const headers = document.querySelectorAll('.level-header');

        headers.forEach(header => {
            if (header.textContent.includes(`Уровень ${level}`)) {
                header.classList.toggle('collapsed');
            }
        });

        if (content) {
            content.classList.toggle('hidden');
        }
    },

    showEmptyState() {
        document.getElementById('treeContainer').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-text">Нет данных по этому пользователю</div>
            </div>
        `;
        this.showElement('treeContainer');
    },

    showError(error) {
        let errorHTML = `
            <div class="error-message">
                <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                <div>${error.message || 'Ошибка загрузки данных'}</div>
        `;

        // Check for common error types detailed display if needed
        if (error.message && (error.message.includes('Failed to fetch') || error.name === 'TypeError')) {
            errorHTML += `<div style="margin-top:20px; font-size: 0.9rem; color: #666;">Проверьте подключение CORS или правильность URL API</div>`;
        }

        errorHTML += `</div>`;

        document.getElementById('treeContainer').innerHTML = errorHTML;
        this.showElement('treeContainer');
    },

    showElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    },

    hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }
};

// Initialize app when DOM is ready
window.addEventListener('load', () => App.init());
