import test from 'node:test';
import assert from 'node:assert/strict';

const m = await import('./gateNightReport.js');

test('aktarım durumu etiketleri', () => {
    assert.equal(m.transferStatusLabel('RECEIVED'), 'İşleniyor');
    assert.equal(m.transferStatusLabel('ACCEPTED'), 'Kabul edildi');
    assert.equal(m.transferStatusLabel('DRY_RUN'), 'Deneme');
    assert.equal(m.transferStatusLabel('INVALID'), 'Geçersiz');
    assert.equal(m.transferStatusLabel('FAILED'), 'Hata');
    assert.equal(m.transferStatusLabel('MISSING'), 'Aktarım gelmedi');
    assert.equal(m.transferStatusLabel('BAŞKA'), 'BAŞKA');
});

test('hesaplama durumu etiketleri', () => {
    const r = (run_status, extra = {}) => ({ night_report: { run_status }, ...extra });
    assert.equal(m.runStatusLabel(r('APPLIED')), 'Tamamlandı');
    assert.equal(m.runStatusLabel(r('APPLY_FAILED')), 'Başarısız');
    assert.equal(m.runStatusLabel(r('TIMEOUT')), 'Zaman aşımı');
    assert.equal(m.runStatusLabel(r('SKIPPED')), 'Gerek yok');
    assert.equal(m.runStatusLabel(r('DISPATCH_FAILED')), 'Başlatılamadı');
    assert.equal(m.runStatusLabel(r(undefined)), '-');
    assert.equal(m.runStatusLabel({}), '-');
});

test('koşu sürüyorsa Sürüyor', () => {
    assert.equal(m.runStatusLabel({ frc_run_id: 5, finalized_at: null, night_report: {} }), 'Sürüyor');
    assert.equal(m.runStatusLabel({ frc_run_id: 5, finalized_at: '2026-11-08T05:00:00+03:00', night_report: {} }), '-');
});

test('okutma sayıları', () => {
    assert.equal(
        m.countsText({ counts: { received: 12, added: 3, deleted: 1, replaced: 2 } }),
        '12 alındı, 3 eklendi, 1 silindi, 2 düzeltildi',
    );
    assert.equal(m.countsText({ counts: {} }), '-');
    assert.equal(m.countsText({ counts: null }), '-');
    assert.equal(m.countsText({}), '-');
});

test('uyuşmazlık metni', () => {
    const base = {
        employee_name: 'Hüseyin Gümsel',
        date: '2026-11-05',
        request_id: 812,
        status: 'APPROVED',
        old: { start_time: '18:00:00', end_time: '23:59:59' },
        new: { start_time: '18:00:00', end_time: '22:33:41' },
    };
    assert.equal(
        m.mismatchText(base),
        'Hüseyin Gümsel, 05.11: #812 onaylı, 18:00-23:59, karta göre 18:00-22:33',
    );
    assert.equal(
        m.mismatchText({ ...base, status: 'PENDING', new: null, locked: true }),
        'Hüseyin Gümsel, 05.11: #812 onay bekliyor, 18:00-23:59, karta göre iptal (kilitli dönem)',
    );
    assert.match(m.mismatchText({ ...base, status: 'POTENTIAL' }), /#812 aday,/);
    assert.match(m.mismatchText({ ...base, locked: true }), / \(kilitli dönem\)$/);
});

test('süre biçimi', () => {
    assert.equal(m.formatDuration(3900), '1 sa 5 dk');
    assert.equal(m.formatDuration(420), '7 dk');
    assert.equal(m.formatDuration(3600), '1 sa');
    assert.equal(m.formatDuration(null), '-');
    assert.equal(m.formatDuration(undefined), '-');
    assert.equal(m.formatDuration(0), '-');
});
