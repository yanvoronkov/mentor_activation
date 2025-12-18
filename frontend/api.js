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
            total_payment: headers.indexOf('total_payment'),
            total_earned: headers.indexOf('total_earned'),
            total_withdrawal: headers.indexOf('total_withdrawal'),
            balance: headers.indexOf('balance'),
            totalReferals: headers.indexOf('totalReferals')
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
                    toNum(row[colMap.free_sprints]),                // [5] Free Sprints
                    toNum(row[colMap.total_bonus_points]),          // [6] Bonuses
                    toNum(row[colMap.total_payment]),               // [7] Payouts
                    toNum(row[colMap.lev1]),                        // [8] Level 1 count
                    toNum(row[colMap.lev2]),                        // [9] Level 2 count
                    toNum(row[colMap.total_earned]),                // [10] Total Earned
                    toNum(row[colMap.total_withdrawal]),            // [11] Withdrawn
                    toNum(row[colMap.balance]),                     // [12] Balance
                    toNum(row[colMap.totalReferals])                // [13] Total Referrals
                ];

                processedData.push(formattedRow);
            }
        });

        console.log('Processed referrals count:', processedData.length);
        return processedData;
    },

    /**
     * Fetch and process data from server
     * @param {string} userId 
     * @returns {Promise<Array[]>}
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
            return [];
        }

        return this.processData(data, userId);
    }
};
