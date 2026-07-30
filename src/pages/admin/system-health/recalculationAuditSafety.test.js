import test from 'node:test';
import assert from 'node:assert/strict';

const safetyModule = await import('./recalculationAuditSafety.js');

test('kısmi TYR sonucunu uygulamaya kapatır', () => {
    assert.match(
        safetyModule.getFrcApplyBlockReason({
            _partial_note: '1/3 grup sonucu alınamadı — rapor kısmi.',
        }),
        /1\/3 grup sonucu alınamadı/,
    );
    assert.equal(
        safetyModule.getFrcApplyBlockReason({
            summary: { protected_days_skipped: 2 },
        }),
        null,
    );
});

test('korumalı gün özetini güvenli varsayılanlarla normalize eder', () => {
    assert.deepEqual(
        safetyModule.getProtectedDayInfo({
            summary: {
                protected_days_skipped: 2,
                protected_day_details: [
                    { employee_id: 7, date: '2026-07-29' },
                ],
            },
        }),
        {
            count: 2,
            details: [{ employee_id: 7, date: '2026-07-29' }],
        },
    );
    assert.deepEqual(
        safetyModule.getProtectedDayInfo({
            summary: {
                protected_days_skipped: -4,
                protected_day_details: 'geçersiz',
            },
        }),
        { count: 0, details: [] },
    );
});

test('uygulama onayı korumalı günlerin değişmeden kalacağını açıklar', () => {
    const message = safetyModule.buildFrcApplyConfirmation(3);

    assert.match(message, /3 korumalı gün/);
    assert.match(message, /değişmeden bırakılacak/);
    assert.doesNotMatch(
        safetyModule.buildFrcApplyConfirmation(0),
        /korumalı gün/,
    );
});
