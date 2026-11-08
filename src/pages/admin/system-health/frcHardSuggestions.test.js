import test from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('./frcHardSuggestions.js');
const {
    HARD_REJECT_LABELS,
    collectFrcHardSuggestions,
    describeHardSuggestion,
    buildApplyStagedBody,
    summarizeHardApplyResult,
} = mod;

const updateSuggestion = {
    suggestion_id: '9:UPDATE:X',
    request_id: 9,
    status: 'APPROVED',
    action: 'UPDATE',
    monthly_effect_seconds: -7200,
    old: { start_time: '18:00:00', end_time: '21:00:00', duration_seconds: 18000 },
    new: { start_time: '18:00:00', end_time: '21:00:00', duration_seconds: 10800 },
};

test('describeHardSuggestion', () => {
    assert.deepEqual(describeHardSuggestion(updateSuggestion), {
        statusLabel: 'Onaylı',
        actionLabel: 'Saat düzeltme',
        oldText: '18:00-21:00 (5:00)',
        newText: '18:00-21:00 (3:00)',
        effectText: '-2:00',
    });
});

test('cancel newText', () => {
    const d = describeHardSuggestion({
        ...updateSuggestion,
        status: 'PENDING',
        action: 'CANCEL',
        new: null,
        monthly_effect_seconds: 0,
    });
    assert.equal(d.newText, 'İptal');
    assert.equal(d.actionLabel, 'İptal');
    assert.equal(d.statusLabel, 'Onay bekliyor');
    assert.equal(d.effectText, '0:00');
});

test('positive effect text', () => {
    assert.equal(
        describeHardSuggestion({ ...updateSuggestion, monthly_effect_seconds: 5400 }).effectText,
        '+1:30',
    );
});

test('buildApplyStagedBody omits empty selection', () => {
    assert.deepEqual(buildApplyStagedBody('r', new Set()), { run_id: 'r' });
    assert.deepEqual(buildApplyStagedBody('r', undefined), { run_id: 'r' });
    assert.deepEqual(
        buildApplyStagedBody('r', new Set(['9:UPDATE:X', '3:CANCEL:Y'])),
        { run_id: 'r', approved_suggestion_ids: ['3:CANCEL:Y', '9:UPDATE:X'] },
    );
});

test('collectFrcHardSuggestions order', () => {
    const s = (id) => ({ ...updateSuggestion, request_id: id, suggestion_id: `${id}:UPDATE:X` });
    const result = {
        employees: [
            { id: 2, name: 'Zeynep', days: [{ date: '2026-11-03', request_hard_suggestions: [s(5)] }] },
            {
                id: 1,
                name: 'Ahmet',
                days: [
                    { date: '2026-11-04', request_hard_suggestions: [s(8), s(2)] },
                    { date: '2026-11-01', request_hard_suggestions: [s(7)] },
                    { date: '2026-11-02' },
                ],
            },
        ],
    };
    const rows = collectFrcHardSuggestions(result);
    assert.deepEqual(
        rows.map((r) => [r.employeeName, r.date, r.suggestion.request_id]),
        [
            ['Ahmet', '2026-11-01', 7],
            ['Ahmet', '2026-11-04', 2],
            ['Ahmet', '2026-11-04', 8],
            ['Zeynep', '2026-11-03', 5],
        ],
    );
    assert.equal(rows[0].employeeId, 1);
    assert.deepEqual(collectFrcHardSuggestions(null), []);
});

test('summarizeHardApplyResult labels', () => {
    const out = summarizeHardApplyResult({
        applied: [{ suggestion_id: 'a', request_id: 1 }],
        rejected: [{ suggestion_id: 'b', request_id: 2, code: 'SUGGESTION_CHANGED' }],
        derived_request_ids: [4, 5],
    });
    assert.equal(out.applied.length, 1);
    assert.equal(out.rejected[0].label, HARD_REJECT_LABELS.SUGGESTION_CHANGED);
    assert.equal(out.rejected[0].label, 'Öneri değişti, yeniden simülasyon gerekli');
    assert.equal(out.derivedCount, 2);
    assert.deepEqual(summarizeHardApplyResult(null), { applied: [], rejected: [], derivedCount: 0 });
});


test('describeAutoChangeRow delete', () => {
    const d = mod.describeAutoChangeRow({
        action: 'DELETE',
        mode: 'SOFT',
        before: { status: 'POTENTIAL', start_time: '18:00:00', end_time: '19:00:00', duration_seconds: 3600 },
        after: null,
        revertable: false,
        revert_block_reason: 'POTENTIAL_DELETED',
    });
    assert.equal(d.afterText, 'Silindi');
    assert.equal(d.beforeText, '18:00-19:00 (1:00)');
    assert.equal(d.actionLabel, 'Silme');
    assert.equal(d.modeLabel, 'Soft');
    assert.equal(d.blockLabel, 'Silinen aday geri alınamaz');
});

test('describeAutoChangeRow cancel, revert, unpin', () => {
    const c = mod.describeAutoChangeRow({
        action: 'CANCEL', mode: 'HARD', revertable: true,
        before: { start_time: '18:00:00', end_time: '19:00:00', duration_seconds: 3600 },
        after: { status: 'CANCELLED' },
    });
    assert.equal(c.afterText, 'İptal');
    assert.equal(c.modeLabel, 'Hard');
    assert.equal(c.blockLabel, '');
    assert.equal(mod.describeAutoChangeRow({ action: 'REVERT', mode: 'ADMIN' }).actionLabel, 'Geri alma');
    assert.equal(mod.describeAutoChangeRow({ action: 'REVERT', mode: 'ADMIN' }).modeLabel, 'Yönetici');
    assert.equal(mod.describeAutoChangeRow({ action: 'UNPIN', mode: 'ADMIN' }).actionLabel, 'Otomatik düzeltme açıldı');
    assert.equal(mod.REVERT_BLOCK_LABELS.NEWER_CHANGE, 'Talepte daha yeni bir değişiklik var');
});

test('source and reason labels', () => {
    assert.equal(mod.labelAutoChangeSource('TYR_STAGED_APPLY'), 'TYR (elle uygulama)');
    assert.equal(mod.labelAutoChangeSource('TYR_NIGHTLY'), 'Gece TYR');
    assert.equal(mod.labelAutoChangeSource(''), '-');
    assert.equal(mod.labelAutoChangeSource('YENI'), 'YENI');
    assert.equal(mod.labelAutoChangeReason('ADMIN_UNPIN'), 'Otomatik düzeltme açıldı');
    assert.equal(mod.labelAutoChangeReason('X_CODE'), 'X_CODE');
});

test('newestPinnedRowIds', () => {
    const rows = [
        { id: 5, request_id: 1, pinned: true },
        { id: 9, request_id: 1, pinned: true },
        { id: 7, request_id: 2, pinned: false },
        { id: 3, request_id: 4, pinned: true },
    ];
    assert.deepEqual([...mod.newestPinnedRowIds(rows)].sort(), [3, 9]);
});

test('ADMIN_REVERT label and no block label on admin records', () => {
    assert.equal(mod.labelAutoChangeReason('ADMIN_REVERT'), 'Geri alındı');
    for (const action of ['REVERT', 'UNPIN']) {
        const d = mod.describeAutoChangeRow({
            action, mode: 'ADMIN', revertable: false, revert_block_reason: 'NOT_A_CHANGE',
        });
        assert.equal(d.blockLabel, '');
    }
});
