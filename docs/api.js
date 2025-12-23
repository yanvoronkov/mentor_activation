/**
 * API Module
 * Handles data fetching and processing
 */

const API = {
    /**
     * Get ID from URL parameters
     * @returns {string|null}
     */
    getIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    },

    /**
     * Format date string
     * @param {string} dateString 
     * @returns {string} YYYY-MM-DD
     */
    formatDate(dateString) {
        if (!dateString) return '';

        try {
            // Handle different date formats if necessary
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (e) {
            return dateString;
        }
    },

    /**
     * Process raw data from API into structured format
     * @param {Array[]} rawData 
     * @param {string} requestedUserId 
     * @returns {Array[]} Processed rows
     */
    processData(rawData, requestedUserId) {
        console.log('Processing data for user:', requestedUserId);

        if (!Array.isArray(rawData) || rawData.length < 2) {
            console.warn('Insufficient data');
            return [];
        }

        // First row is headers
        const headers = rawData[0];
        const rows = rawData.slice(1);

        console.log('Headers:', headers);
        console.log('Data rows:', rows.length);

        // Map column names to indices
        const colMap = {
            referal_id: headers.indexOf('referal_id'),
            referalName: headers.indexOf('referalName'),
            referal_nickname: headers.indexOf('referal_nickname'),
            referer_id: headers.indexOf('referer_id'),
            referer_nickname: headers.indexOf('referer_nickname'),
            referer_name: headers.indexOf('referer_name'),
            reg_date: headers.indexOf('reg_date'),
            lev1: headers.indexOf('lev1'),
            lev2: headers.indexOf('lev2'),
            free_sprints: headers.indexOf('free_sprints'),
            total_bonus_points: headers.indexOf('total_bonus_points'),
            balance_bonus_points: headers.indexOf('balance_bonus_points'),
            total_payment: headers.indexOf('total_payment'),
            total_earned: headers.indexOf('total_earned'),
            total_withdrawal: headers.indexOf('total_withdrawal'),
            balance: headers.indexOf('balance'),
            total_referals: headers.indexOf('total_referals')
        };

        const processedData = [];
        const userIdStr = String(requestedUserId);

        // Collect Level 1 IDs (direct referrals)
        const level1Ids = new Set();
        rows.forEach(row => {
            const refererId = String(row[colMap.referer_id]);
            const referalId = String(row[colMap.referal_id]);

            if (refererId === userIdStr && referalId !== userIdStr) {
                level1Ids.add(referalId);
            }
        });

        console.log('Level 1 Referrals:', Array.from(level1Ids));

        // Process each row
        rows.forEach(row => {
            const referalId = String(row[colMap.referal_id]);
            const refererId = String(row[colMap.referer_id]);

            // Skip the user themselves
            if (referalId === userIdStr) {
                return;
            }

            let level = 0;

            // Determine level
            if (refererId === userIdStr) {
                level = 1; // Direct referral
            } else if (level1Ids.has(refererId)) {
                level = 2; // Level 2 referral
            }

            // Only process level 1 and 2
            if (level > 0) {
                // Helper to safe parse number
                const toNum = (val) => {
                    if (val === '' || val === null || val === undefined) return 0;
                    const num = parseFloat(val);
                    return isNaN(num) ? 0 : num;
                };

                // Format data row
                const formattedRow = [
                    level,                                          // [0] Level
                    this.formatDate(row[colMap.reg_date]),          // [1] Reg Date
                    row[colMap.referal_nickname] || '',             // [2] Nickname
                    row[colMap.referalName] || '',                  // [3] Name
                    row[colMap.referer_nickname] || '',             // [4] Inviter Nick
                    row[colMap.referer_name] || '',                 // [5] Inviter Name
                    toNum(row[colMap.free_sprints]),                // [6] Free Sprints
                    toNum(row[colMap.balance_bonus_points]),        // [7] Balance Bonus Points
                    toNum(row[colMap.total_payment]),               // [8] Payouts
                    toNum(row[colMap.lev1]),                        // [9] Level 1 count
                    toNum(row[colMap.lev2]),                        // [10] Level 2 count
                    toNum(row[colMap.total_earned]),                // [11] Total Earned
                    toNum(row[colMap.total_withdrawal]),            // [12] Withdrawn
                    toNum(row[colMap.balance]),                     // [13] Balance
                    toNum(row[colMap.total_referals]),              // [14] Total Referrals
                    referalId                                       // [15] Referal ID (Hidden)
                ];

                // Debug: проверяем значение total_referals
                if (row[colMap.referal_nickname] === 'yangrus') {
                    console.log('🔍 DEBUG yangrus:', {
                        nickname: row[colMap.referal_nickname],
                        totalReferalsIndex: colMap.total_referals,
                        totalReferalsValue: row[colMap.total_referals],
                        totalReferalsValueParsed: toNum(row[colMap.total_referals]),
                        formattedRow14: formattedRow[14]
                    });
                }

                processedData.push(formattedRow);
            }
        });

        console.log('Processed referrals count:', processedData.length);
        return processedData;
    },

    /**
     * Find and extract user's personal data from raw API data
     * @param {Array[]} rawData - Raw data from API including headers
     * @param {string} userId - User ID to find
     * @returns {Object} User's personal data
     */
    findUserData(rawData, userId) {
        if (!Array.isArray(rawData) || rawData.length < 2) {
            return null;
        }

        const headers = rawData[0];
        const rows = rawData.slice(1);
        const userIdStr = String(userId);

        // Map column names to indices
        const colMap = {
            referal_id: headers.indexOf('referal_id'),
            referalName: headers.indexOf('referalName'),
            referal_nickname: headers.indexOf('referal_nickname'),
            referer_id: headers.indexOf('referer_id'),
            referer_nickname: headers.indexOf('referer_nickname'),
            referer_name: headers.indexOf('referer_name'),
            lev1: headers.indexOf('lev1'),
            lev2: headers.indexOf('lev2'),
            balance_bonus_points: headers.indexOf('balance_bonus_points'),
            total_earned: headers.indexOf('total_earned'),
            total_withdrawal: headers.indexOf('total_withdrawal'),
            balance: headers.indexOf('balance')
        };

        // Find user's row
        const userRow = rows.find(row => String(row[colMap.referal_id]) === userIdStr);

        if (!userRow) {
            console.warn('User row not found for ID:', userId);
            return null;
        }

        // Helper to safe parse number
        const toNum = (val) => {
            if (val === '' || val === null || val === undefined) return 0;
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        };

        const userData = {
            userId: userIdStr,
            name: userRow[colMap.referalName] || '',
            nickname: userRow[colMap.referal_nickname] || '',
            refererName: userRow[colMap.referer_name] || '',
            refererNick: userRow[colMap.referer_nickname] || '',
            level1Count: toNum(userRow[colMap.lev1]),
            level2Count: toNum(userRow[colMap.lev2]),
            bonusPoints: toNum(userRow[colMap.balance_bonus_points]),
            totalEarned: toNum(userRow[colMap.total_earned]),
            totalWithdrawal: toNum(userRow[colMap.total_withdrawal]),
            balance: toNum(userRow[colMap.balance])
        };

        console.log(`📊 Личные данные пользователя ID=${userId}:`, userData);

        return userData;
    },

    /**
     * Fetch and process data from server
     * @param {string} userId 
     * @returns {Promise<{userData: Object, referrals: Array[]}>}
     */
    async loadData(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const url = `${CONFIG.API_URL}?id=${encodeURIComponent(userId)}`;
        console.log('Loading data from:', url);

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            throw new Error('Server response is not valid JSON');
        }

        if (!Array.isArray(data) || data.length === 0) {
            return { userData: null, referrals: [] };
        }

        // Extract user's personal data
        const userData = this.findUserData(data, userId);

        // Process referrals list
        const referrals = this.processData(data, userId);

        return { userData, referrals };
    },

    /**
     * Fetch bonus transactions from server
     * @param {string} userId - User ID to fetch transactions for
     * @returns {Promise<Array[]>}
     */
    async loadBonusTransactions(userId) {
        if (!userId) {
            throw new Error('User ID is required for loading bonus transactions');
        }

        const url = `${CONFIG.API_URL}?type=bonusTransactions&id=${userId}`;
        console.log('Loading bonus transactions from:', url);

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            throw new Error('Server response is not valid JSON');
        }

        return data;
    }
};
