/**
 * Bonus Report Manager
 * Handles fetching, filtering, and displaying bonus transactions.
 */

const ReportManager = {
    transactions: [],
    currentUserId: null,

    /**
     * Initialize the report manager
     * @param {string} userId - Current selected user ID
     */
    init(userId) {
        console.log('🔧 ReportManager.init() called with userId:', userId);
        this.currentUserId = userId;
        this.transactions = []; // Reset data

        // Setup month input
        const monthInput = document.getElementById('reportMonth');
        if (monthInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            monthInput.value = `${year}-${month}`;
            monthInput.onchange = () => this.render();
        }
    },

    /**
     * Load data from API
     */
    async loadData() {
        console.log('📥 ReportManager.loadData() called');
        console.log('Current User ID:', this.currentUserId);

        if (!this.currentUserId) {
            console.warn('⚠️ No user ID set!');
            return;
        }

        try {
            UIManager.showLoading(true);

            // Fetch data
            console.log('📡 Fetching bonus transactions...');
            const rawData = await API.loadBonusTransactions(this.currentUserId);
            console.log('✅ Raw data received:', rawData);
            console.log('Raw data type:', typeof rawData);
            console.log('Is array?', Array.isArray(rawData));
            console.log('Length:', rawData?.length);

            // Process data
            this.processData(rawData);
            console.log('✅ Data processed. Transactions count:', this.transactions.length);
            console.log('Processed transactions:', this.transactions);

            // Render
            this.render();

        } catch (error) {
            console.error('❌ Failed to load bonus report:', error);
            const tbody = document.getElementById('reportTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">Ошибка загрузки данных: ${error.message}</td></tr>`;
            }
        } finally {
            UIManager.showLoading(false);
        }
    },

    /**
     * Process raw CSV-like array into objects
     * @param {Array[]} data 
     */
    processData(data) {
        console.log('⚙️ processData() called with:', data);

        if (!data || !Array.isArray(data) || data.length < 2) {
            console.warn('⚠️ Invalid data format or empty');
            this.transactions = [];
            return;
        }

        // 1. Parse Headers (Trim whitespace)
        const headers = data[0].map(h => String(h).trim());
        console.log('📋 Headers:', headers);

        // 2. Map Indices
        const col = {
            referal_id: headers.indexOf('referal_id'),
            referal_level: headers.indexOf('referal_level'),
            buyer_level: headers.indexOf('buyer_level'),
            bonus_level: headers.indexOf('bonus_level'),
            bonus_amount: headers.indexOf('bonus_amount'),
            bonus_points: headers.indexOf('bonus_points'),
            bonus_percent: headers.indexOf('bonus_percent'),
            buyer_name: headers.indexOf('buyer_name'),
            payment_amount: headers.indexOf('payment_amount'),
            created_at: headers.indexOf('created_at'),
            status: headers.indexOf('status')
        };
        console.log('📍 Column indices:', col);

        // 3. Process Rows
        this.transactions = data.slice(1).map((row, idx) => {
            // Helper to get safe value
            const get = (idx) => (idx !== -1 && row[idx] !== undefined) ? row[idx] : '';

            const item = {
                referalId: String(get(col.referal_id)).trim(),
                referalLevel: parseInt(get(col.referal_level)) || 0,     // Парсим как число
                buyerLevel: parseInt(get(col.buyer_level)) || 0,         // Парсим как число
                bonusLevel: get(col.bonus_level),
                bonusAmount: this.parseNumber(get(col.bonus_amount)),
                bonusPoints: this.parseNumber(get(col.bonus_points)),
                bonusPercent: this.parseNumber(get(col.bonus_percent)),
                buyerName: String(get(col.buyer_name)).trim(),
                paymentAmount: this.parseNumber(get(col.payment_amount)),
                dateStr: get(col.created_at),
                date: this.parseDate(get(col.created_at)),
                status: get(col.status)
            };

            if (idx === 0) {
                console.log('🔍 First row sample:', item);
                console.log('🔍 Raw referal_level value:', get(col.referal_level), 'Type:', typeof get(col.referal_level));
                console.log('🔍 Raw buyer_level value:', get(col.buyer_level), 'Type:', typeof get(col.buyer_level));
            }

            return item;
        }).filter(item => {
            // Basic validity check
            return item.referalId !== '';
        });

        console.log('✅ Processed transactions:', this.transactions.length);
    },

    /**
     * Render the table with month filter
     */
    render() {
        console.log('🎨 render() called');
        const tbody = document.getElementById('reportTableBody');
        const monthInput = document.getElementById('reportMonth');

        if (!tbody) {
            console.error('❌ reportTableBody element not found!');
            return;
        }

        tbody.innerHTML = '';

        // Filter by Current User ID
        console.log('🔍 Filtering by user ID:', this.currentUserId);
        let debugCount = 0;
        let filtered = this.transactions.filter(t => {
            const match = t.referalId === String(this.currentUserId);
            if (!match && debugCount < 5) {
                console.log(`❌ Not match: ${t.referalId} !== ${this.currentUserId}`);
                debugCount++;
            }
            return match;
        });

        // Filter by Month (if month input exists and has value)
        if (monthInput && monthInput.value) {
            const [year, month] = monthInput.value.split('-').map(Number);
            console.log('🗓️ Filtering by month:', year, month);
            filtered = filtered.filter(t => {
                if (!t.date) return false;
                return t.date.getFullYear() === year && (t.date.getMonth() + 1) === month;
            });
        }

        console.log('✅ Filtered transactions:', filtered.length);
        console.log('Filtered data:', filtered);

        // Sort by date descending
        filtered.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date - a.date;
        });

        // Draw
        if (filtered.length === 0) {
            console.warn('⚠️ No data to display');
            const msg = monthInput && monthInput.value
                ? 'Нет данных за выбранный период'
                : 'Нет данных для этого пользователя';
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px;">${msg}</td></tr>`;
            return;
        }

        filtered.forEach(t => {
            const tr = document.createElement('tr');

            // Determine level badge class if valid level
            const refLevelBadge = (t.referalLevel > 0)
                ? `<span class="badge level-${t.referalLevel}">${t.referalLevel}</span>`
                : (t.referalLevel || '-');

            const buyerLevelBadge = (t.buyerLevel > 0)
                ? `<span class="badge level-${t.buyerLevel}">${t.buyerLevel}</span>`
                : (t.buyerLevel || '-');

            // Determine bonus type badge
            let bonusClass = '';
            if (t.bonusLevel) {
                const lower = String(t.bonusLevel).toLowerCase();
                if (lower.includes('l1')) bonusClass = 'badge bonus-l1';
                else if (lower.includes('l2')) bonusClass = 'badge bonus-l2';
                else if (lower.includes('monthly')) bonusClass = 'badge bonus-l3';
                else bonusClass = 'badge';
            }
            const bonusBadge = t.bonusLevel ? `<span class="${bonusClass}">${t.bonusLevel}</span>` : '-';

            tr.innerHTML = `
                <td>${refLevelBadge}</td>
                <td>${buyerLevelBadge}</td>
                <td>${bonusBadge}</td>
                <td class="font-medium">${t.bonusPoints}</td>
                <td class="text-success font-bold">${this.formatCurrency(t.bonusAmount)}</td>
                <td>
                    <div class="font-medium">${t.buyerName || 'Не указано'}</div>
                </td>
                <td>${this.formatCurrency(t.paymentAmount)}</td>
                <td>${this.formatPercent(t.bonusPercent)}</td>
                <td class="text-muted text-xs">${this.formatDate(t.date)}</td>
            `;
            tbody.appendChild(tr);
        });

        console.log('✅ Table rendered with', filtered.length, 'rows');
    },

    // Helpers
    parseNumber(val) {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        // Handle "1,65" or "$100"
        let s = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
        return parseFloat(s) || 0;
    },

    parseDate(dateStr) {
        if (!dateStr) return null;

        // Try parsing ISO format first (2025-12-23T10:49:37.000Z)
        const isoDate = new Date(dateStr);
        if (!isNaN(isoDate.getTime())) {
            return isoDate;
        }

        // Try DD.MM.YYYY format
        if (String(dateStr).includes('.')) {
            const parts = String(dateStr).split(' ');
            const dateParts = parts[0].split('.');
            if (dateParts.length === 3) {
                return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            }
        }

        return null;
    },

    formatDate(dateObj) {
        if (!dateObj) return '-';
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${d}.${m}.${y}`;
    },

    formatCurrency(val) {
        return '$' + val.toFixed(2);
    },

    formatPercent(val) {
        // Assuming val is 0.05 for 5%
        return (val < 1) ? (val * 100).toFixed(0) + '%' : val + '%';
    }
};
