import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SOURCE_META,
    weekLabel,
    toWeeklyChartRows,
    filterEmployees,
    sourceTotalsForPie,
    signedSummary,
    approvalStageTag,
    approverLines,
} from './overtimeSourcesUtils.js';

const HOUR = 3600;

test('her kaynak için Türkçe etiket ve renk tanımlı', () => {
    for (const key of ['CARD', 'MANUAL', 'INTENDED', 'DUTY', 'ATTENDANCE_ONLY']) {
        assert.ok(SOURCE_META[key].label);
        assert.match(SOURCE_META[key].color, /^#[0-9a-f]{6}$/i);
    }
});

test('hafta etiketi GG.AA–GG.AA biçiminde', () => {
    assert.equal(weekLabel('2026-09-07', '2026-09-13'), '07.09-13.09');
});

test('haftalık grafik satırları saate çevrilir, eksik kaynak 0 olur', () => {
    const rows = toWeeklyChartRows([
        { week_start: '2026-08-24', week_end: '2026-08-30', partial: true, by_source: { CARD: 2 * HOUR }, total_seconds: 2 * HOUR },
        { week_start: '2026-08-31', week_end: '2026-09-06', partial: false, by_source: { DUTY: 5400, MANUAL: HOUR }, total_seconds: 9000 },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].label, '24.08-30.08');
    assert.equal(rows[0].partial, true);
    assert.equal(rows[0].CARD, 2);
    assert.equal(rows[0].DUTY, 0);
    assert.equal(rows[1].DUTY, 1.5);
    assert.equal(rows[1].MANUAL, 1);
    assert.equal(rows[1].total, 2.5);
});

const EMPS = [
    { employee_id: 1, name: 'Ali Kaya', department: 'Yol', total_seconds: 10 * HOUR, over_limit_weeks: 1,
      by_source: { CARD: { approved_seconds: 10 * HOUR, pending_seconds: 0, count: 3 }, DUTY: { approved_seconds: 0, pending_seconds: 0, count: 0 } } },
    { employee_id: 2, name: 'Ayşe Demir', department: 'Köprü', total_seconds: 0, over_limit_weeks: 0,
      by_source: { CARD: { approved_seconds: 0, pending_seconds: 0, count: 0 }, DUTY: { approved_seconds: 0, pending_seconds: 0, count: 0 } } },
    { employee_id: 3, name: 'Şükrü İnce', department: 'Yol', total_seconds: 4 * HOUR, over_limit_weeks: 0,
      by_source: { CARD: { approved_seconds: 0, pending_seconds: 0, count: 0 }, DUTY: { approved_seconds: 3 * HOUR, pending_seconds: HOUR, count: 2 } } },
];

test('varsayılan filtre yalnız FM si olanları gösterir', () => {
    assert.deepEqual(filterEmployees(EMPS, {}).map(e => e.employee_id), [1, 3]);
    assert.deepEqual(filterEmployees(EMPS, { onlyWithOt: false }).map(e => e.employee_id), [1, 2, 3]);
});

test('kaynak filtresi o kaynaktan FM si olanları bırakır', () => {
    assert.deepEqual(filterEmployees(EMPS, { source: 'DUTY' }).map(e => e.employee_id), [3]);
});

test('sınırı dolan hafta filtresi', () => {
    assert.deepEqual(filterEmployees(EMPS, { overLimitOnly: true }).map(e => e.employee_id), [1]);
});

test('arama Türkçe büyük/küçük harf duyarsız', () => {
    assert.deepEqual(filterEmployees(EMPS, { search: 'şükrü' }).map(e => e.employee_id), [3]);
    assert.deepEqual(filterEmployees(EMPS, { search: 'İNCE' }).map(e => e.employee_id), [3]);
});

test('pasta verisi onaylı+bekleyen toplamı kullanır, sıfırları atar', () => {
    const pie = sourceTotalsForPie({
        CARD: { approved_seconds: 2 * HOUR, pending_seconds: HOUR, count: 2 },
        MANUAL: { approved_seconds: 0, pending_seconds: 0, count: 0 },
    });
    assert.equal(pie.length, 1);
    assert.equal(pie[0].key, 'CARD');
    assert.equal(pie[0].seconds, 3 * HOUR);
});

test('imzalı belge özeti kaynak türüne göre kim/ne bilgisini verir', () => {
    assert.equal(
        signedSummary({ source: 'INTENDED', signed: { label: 'Planlı fazla mesai ataması', ref_id: 7, assigned_by: 'Mehmet Y.' } }),
        'Planlı fazla mesai ataması #7, atayan: Mehmet Y.',
    );
    assert.equal(
        signedSummary({ source: 'DUTY', signed: { label: 'Dış görev talebi', ref_id: 12, duty_approved_by: 'Sabri S.' } }),
        'Dış görev talebi #12, onaylayan: Sabri S.',
    );
    assert.equal(
        signedSummary({ source: 'CARD', signed: { label: 'Fazla mesai talebi (kart kaydından)', ref_id: 99 } }),
        'Fazla mesai talebi (kart kaydından) #99',
    );
    assert.equal(
        signedSummary({ source: 'ATTENDANCE_ONLY', signed: { label: 'Talepsiz puantaj kaydı', ref_id: null } }),
        'Talepsiz puantaj kaydı',
    );
});

test('iki aşamalı onay: sistem yöneticisini bekleyen ve tamamlanan satır etiketleri', () => {
    assert.deepEqual(approvalStageTag({ approval_stage: 'ADMIN' }), { color: 'purple', text: 'Sistem Yöneticisinde' });
    assert.equal(approvalStageTag({ approval_stage: 'COMPLETED' }), null);
    assert.equal(approvalStageTag({ approval_stage: null }), null);
});

test('iki aşamalı onayda yönetici ve sistem yöneticisi ayrı satırda gösterilir', () => {
    assert.deepEqual(approverLines({ approval_stage: 'ADMIN', manager_approved_by: 'Sabri' }), [
        { label: 'Yönetici', value: 'Sabri' },
        { label: 'Sistem yöneticisi', value: 'Bekliyor', pending: true },
    ]);
    assert.deepEqual(approverLines({
        approval_stage: 'COMPLETED', manager_approved_by: 'Sabri',
        admin_decision_by: 'Admin', admin_decision_at: '2026-09-30T09:00:00+03:00',
    }), [
        { label: 'Yönetici', value: 'Sabri' },
        { label: 'Sistem yöneticisi', value: 'Admin', at: '2026-09-30T09:00:00+03:00' },
    ]);
    assert.equal(approverLines({ approval_stage: null, status: 'APPROVED' }), null);
});
