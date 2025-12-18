/**
 * Logic Tests
 * Tests for API.processData
 */

const Tests = {
    run() {
        console.log('Running tests...');
        const results = [];
        const container = document.getElementById('test-results');

        // Test Data (Mocking Google Sheets response)
        // Headers: [referal_id, reg_date, referal_nickname, referalName, referer_id, referer_nickname, referer_name, lev1, lev2, free_sprints, total_bonus_points, total_payment, total_earned, total_withdrawal, balance, totalReferals]
        const headers = [
            'referal_id', 'reg_date', 'referal_nickname', 'referalName', 'referer_id',
            'referer_nickname', 'referer_name', 'lev1', 'lev2', 'free_sprints',
            'total_bonus_points', 'total_payment', 'total_earned', 'total_withdrawal',
            'balance', 'totalReferals'
        ];

        const mockData = [
            headers,
            // User (Main)
            ['100', '2024-01-01', 'main_user', 'Main User', '99', 'admin', 'Admin', '1', '1', '0', '0', '0', '0', '0', '0', '2'],
            // Level 1 Referral
            ['101', '2024-01-02', 'ref1', 'Referral One', '100', 'main_user', 'Main User', '0', '0', '5', '10', '0', '0', '0', '0', '0'],
            // Level 2 Referral (invited by ref1)
            ['102', '2024-01-03', 'ref2', 'Referral Two', '101', 'ref1', 'Referral One', '0', '0', '2', '5', '0', '0', '0', '0', '0'],
            // Unrelated User
            ['200', '2024-01-04', 'other', 'Other User', '99', 'admin', 'Admin', '0', '0', '0', '0', '0', '0', '0', '0', '0']
        ];

        // --- Test 1: Process Data Structure ---
        try {
            const processed = API.processData(mockData, '100');

            // Expect 2 referrals (one level 1, one level 2)
            // Unrelated shouldn't be there. Main user shouldn't be there.
            const passedCount = processed.length === 2;
            this.logResult(passedCount, 'Count of referrals should be 2', `Expected 2, got ${processed.length}`);

            // Check Level 1
            const level1 = processed.find(r => r[0] === 1); // r[0] is level
            const passedL1 = level1 && level1[2] === 'ref1'; // r[2] is nickname
            this.logResult(passedL1, 'Should find Level 1 referral (ref1)', JSON.stringify(level1));

            // Check Level 2
            const level2 = processed.find(r => r[0] === 2);
            const passedL2 = level2 && level2[2] === 'ref2';
            this.logResult(passedL2, 'Should find Level 2 referral (ref2)', JSON.stringify(level2));

        } catch (e) {
            this.logResult(false, 'ProcessData threw exception', e.toString());
        }

        // --- Test 2: Formatting ---
        try {
            const dateStr = API.formatDate('2024-01-01T00:00:00.000Z');
            const passedDate = dateStr === '2024-01-01';
            this.logResult(passedDate, 'Date formatting', `Expected 2024-01-01, got ${dateStr}`);
        } catch (e) {
            this.logResult(false, 'Date formatting threw exception', e.toString());
        }
    },

    logResult(passed, name, details) {
        const div = document.createElement('div');
        div.className = `test-result ${passed ? 'pass' : 'fail'}`;
        div.innerHTML = `
            <strong>${passed ? '✅ PASS' : '❌ FAIL'}</strong>: ${name}
            ${!passed ? `<div class="details">${details}</div>` : ''}
        `;
        document.getElementById('test-results').appendChild(div);
    }
};

window.onload = () => Tests.run();
