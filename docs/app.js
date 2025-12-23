/**
 * App Module
 * Handles UI interactions and rendering
 */

// Global UI Manager to handle DOM updates
const UIManager = {
    allReferralsData: [],
    hasLoadedData: false,

    init() {
        this.statsContainer = document.getElementById('statsContainer');
        this.treeContainer = document.getElementById('treeContainer');
        this.loadingContainer = document.getElementById('loadingContainer');
    },

    showLoading(show) {
        if (show) {
            this.loadingContainer.classList.remove('hidden');
            // Hide others only if we are in structure mode? 
            // For simplicity, just show loader on top or hide everything
        } else {
            this.loadingContainer.classList.add('hidden');
        }
    },

    showError(error) {
        let errorHTML = `
            <div class="error-message">
                <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                <div>${error.message || 'Ошибка загрузки данных'}</div>
        `;

        if (error.message && (error.message.includes('Failed to fetch') || error.name === 'TypeError')) {
            errorHTML += `<div style="margin-top:20px; font-size: 0.9rem; color: #666;">Проверьте подключение CORS или правильность URL API</div>`;
        }
        errorHTML += `</div>`;
        this.treeContainer.innerHTML = errorHTML;
        this.treeContainer.classList.remove('hidden');
    },

    showEmptyState() {
        this.treeContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-text">Нет данных по этому пользователю</div>
            </div>
        `;
        this.treeContainer.classList.remove('hidden');
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

        if (filtered.length === 0) {
            this.statsContainer.classList.add('hidden');
            this.treeContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-text">Ничего не найдено по запросу "${query}"</div>
                </div>
            `;
            this.treeContainer.classList.remove('hidden');
            return;
        }

        this.displayStats(filtered, this.currentUserData);
        this.renderTree(filtered);
    },

    displayStats(data, userData) {
        // Используем личные данные пользователя вместо суммирования по рефералам
        const level1Count = userData ? userData.level1Count : 0;
        const level2Count = userData ? userData.level2Count : 0;
        const totalReferrals = level1Count + level2Count;

        // Получаем информацию о вышестоящем партнере из личных данных пользователя
        let refererInfo = '';
        if (userData && userData.refererNick) {
            refererInfo = `
                <div class="referer-info">
                    <span>👤 Ваш наставник:</span>
                    <strong>${userData.refererName || 'Не указано'}</strong>
                    <a href="https://t.me/${userData.refererNick}" target="_blank" title="Написать в Telegram">@${userData.refererNick}</a>
                </div>
            `;
        }

        // Используем личные показатели пользователя
        const totalBonusPoints = userData ? userData.bonusPoints : 0;
        const totalEarned = userData ? userData.totalEarned : 0;
        const totalWithdrawal = userData ? userData.totalWithdrawal : 0;
        const totalBalance = userData ? userData.balance : 0;

        const statsHTML = `
            ${refererInfo}
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
                <div class="stat-label">Бонусные баллы</div>
                <div class="stat-value">${totalBonusPoints.toFixed(0)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Общий заработок</div>
                <div class="stat-value">${totalEarned.toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Выплачено</div>
                <div class="stat-value">${totalWithdrawal.toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Текущий баланс</div>
                <div class="stat-value">${totalBalance.toFixed(2)}</div>
            </div>
        `;

        this.statsContainer.innerHTML = statsHTML;
        this.statsContainer.classList.remove('hidden');
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

        this.treeContainer.innerHTML = html;
        this.treeContainer.classList.remove('hidden');
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
        const [lvl, date, nick, name, inviterNick, inviterName, freeRuns, bonusPoints, payouts, level1, level2, earned, withdrawn, balance, totalRefs, refId] = referral;

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
                        <div class="stat-item-label">Рефералов</div>
                        <div class="stat-item-value">${formatValue(totalRefs)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Бонусные баллы</div>
                        <div class="stat-item-value positive">${formatValue(bonusPoints)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Заработано</div>
                        <div class="stat-item-value positive">${formatValue(earned)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Выплачено</div>
                        <div class="stat-item-value">${formatValue(withdrawn)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">Баланс</div>
                        <div class="stat-item-value positive">${formatValue(balance)}</div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Global toggle function for inline onclick
window.toggleLevel = (level) => {
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
};

// Main App Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Managers
    UIManager.init();

    // 2. Parse URL ID
    const urlId = API.getIdFromURL();
    const userId = urlId || CONFIG.DEFAULT_USER_ID;

    if (urlId) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = urlId;
    }

    // 3. Initialize Report Manager
    if (typeof ReportManager !== 'undefined') {
        ReportManager.init(userId);
    }

    // 4. Tab Logic
    const tabStructure = document.getElementById('tabStructure');
    const tabReport = document.getElementById('tabReport');
    const statsContainer = document.getElementById('statsContainer');
    const treeContainer = document.getElementById('treeContainer');
    const reportContainer = document.getElementById('reportContainer');

    function switchTab(tab) {
        // Reset active state
        tabStructure.classList.remove('active');
        tabReport.classList.remove('active');

        // Hide containers
        statsContainer.classList.add('hidden');
        treeContainer.classList.add('hidden');
        reportContainer.classList.add('hidden');

        if (tab === 'structure') {
            tabStructure.classList.add('active');
            if (UIManager.hasLoadedData) {
                statsContainer.classList.remove('hidden');
                treeContainer.classList.remove('hidden');
            }
        } else if (tab === 'report') {
            tabReport.classList.add('active');
            reportContainer.classList.remove('hidden');
            // Load report data
            ReportManager.loadData();
        }
    }

    if (tabStructure && tabReport) {
        tabStructure.addEventListener('click', () => switchTab('structure'));
        tabReport.addEventListener('click', () => switchTab('report'));
    }

    // 5. Load Data for Structure
    await loadAndRender(userId);

    // 6. Search Event Listeners
    const loadAllBtn = document.getElementById('loadAllBtn');
    const searchInput = document.getElementById('searchInput');

    async function handleSearch() {
        const inputVal = searchInput.value.trim();
        if (inputVal) {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('id', inputVal);
            window.history.pushState({}, '', newUrl);

            await loadAndRender(inputVal);

            // Update Report Context
            ReportManager.currentUserId = inputVal;
            ReportManager.bonusTransactionsData = null; // Reset cache

            if (tabReport.classList.contains('active')) {
                ReportManager.loadData();
            }
        }
    }

    if (loadAllBtn) {
        loadAllBtn.addEventListener('click', handleSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // Local search within loaded data
            if (UIManager.allReferralsData.length > 0 && tabStructure.classList.contains('active')) {
                UIManager.searchReferrals(e.target.value);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (UIManager.allReferralsData.length > 0) {
                    // Try local search first? Or force reload?
                    // If ID format matches typical ID, probably reload.
                    handleSearch();
                } else {
                    handleSearch();
                }
            }
        });
    }

    async function loadAndRender(targetId) {
        try {
            UIManager.showLoading(true);
            const result = await API.loadData(targetId);
            const { userData, referrals } = result;

            if (!referrals || referrals.length === 0) {
                UIManager.showEmptyState();
                UIManager.hasLoadedData = false;
                UIManager.currentUserData = userData;
            } else {
                UIManager.allReferralsData = referrals;
                UIManager.currentUserData = userData;
                UIManager.hasLoadedData = true;

                // Only render if structure tab is active
                if (tabStructure.classList.contains('active')) {
                    statsContainer.classList.remove('hidden');
                    treeContainer.classList.remove('hidden');
                }

                UIManager.displayStats(referrals, userData);
                UIManager.renderTree(referrals);
            }
        } catch (e) {
            console.error(e);
            UIManager.showError(e);
        } finally {
            UIManager.showLoading(false);
        }
    }
});
