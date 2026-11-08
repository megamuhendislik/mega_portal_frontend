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

