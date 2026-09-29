import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DUTY_OT_LIMIT_ACK_FIELD,
    buildDutyOtLimitRows,
    buildLeaveOverlapRows,
    dutyWarningTitle,
    getDutyOtLimitWarning,
    postWithDutyOtLimitAck,
} from './dutyOtLimitWarning.js';

const HOUR = 3600;

const warning = {
    applies: true,
    exceeds_limit: true,
    employee_name: 'Serpil Topaloğlu',
    total_over_seconds: 17 * HOUR,
    weeks: [
        {
            week_start: '2026-09-07',
            week_end: '2026-09-13',
            limit_seconds: 30 * HOUR,
            counted_seconds: 28 * HOUR + 29 * 60,
            existing_duty_seconds: 0,
            projected_duty_seconds: 17 * HOUR,
            total_seconds: 45 * HOUR + 29 * 60,
            over_seconds: 15 * HOUR + 29 * 60,
            exceeds: true,
            limit_exempt: true,
        },
        {
            week_start: '2026-09-14',
            week_end: '2026-09-20',
            limit_seconds: 30 * HOUR,
            counted_seconds: 0,
            existing_duty_seconds: 0,
            projected_duty_seconds: 2 * HOUR,
            total_seconds: 2 * HOUR,
            over_seconds: 0,
            exceeds: false,
            limit_exempt: true,
        },
    ],
};

const ackError = {
    response: { status: 409, data: { code: 'OT_LIMIT_ACK_REQUIRED', error: 'Sınır aşılıyor', ot_limit_warning: warning } },
};

test('409 + OT_LIMIT_ACK_REQUIRED yanıtından uyarıyı çıkarır', () => {
    assert.deepEqual(getDutyOtLimitWarning(ackError), warning);
});

test('başka hatalar uyarı sayılmaz', () => {
    assert.equal(getDutyOtLimitWarning({ response: { status: 409, data: { code: 'OTHER' } } }), null);
    assert.equal(getDutyOtLimitWarning({ response: { status: 400, data: { code: 'OT_LIMIT_ACK_REQUIRED' } } }), null);
    assert.equal(getDutyOtLimitWarning(new Error('ağ')), null);
});

test('hafta satırları sa/dk biçiminde ve aşım bayrağıyla döner', () => {
    const rows = buildDutyOtLimitRows(warning);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
        key: '2026-09-07',
        weekLabel: '07.09 - 13.09',
        counted: '28sa 29dk',
        existingDuty: '0dk',
        existing: '28sa 29dk',
        projected: '17sa',
        total: '45sa 29dk',
        limit: '30sa',
        over: '15sa 29dk',
        exceeds: true,
        limitExempt: true,
    });
    assert.equal(rows[1].exceeds, false);
    assert.equal(rows[1].over, '-');
});

test('aşım yoksa gönderim tek sefer ve bayraksız', async () => {
    const calls = [];
    const result = await postWithDutyOtLimitAck(
        async (extra) => { calls.push(extra); return { data: { ok: true } }; },
        async () => { throw new Error('onay sorulmamalı'); },
    );
    assert.deepEqual(calls, [{}]);
    assert.equal(result.cancelled, false);
    assert.equal(result.acknowledged, false);
});

test('aşımda onay sorulur, kabulde bayrakla tekrar gönderilir', async () => {
    const calls = [];
    let asked = null;
    const result = await postWithDutyOtLimitAck(
        async (extra) => {
            calls.push(extra);
            if (!extra[DUTY_OT_LIMIT_ACK_FIELD]) throw ackError;
            return { data: { ok: true } };
        },
        async (w) => { asked = w; return true; },
    );
    assert.deepEqual(asked, warning);
    assert.deepEqual(calls, [{}, { [DUTY_OT_LIMIT_ACK_FIELD]: true }]);
    assert.equal(result.acknowledged, true);
    assert.equal(result.cancelled, false);
});

test('yönetici vazgeçerse ikinci gönderim yapılmaz', async () => {
    const calls = [];
    const result = await postWithDutyOtLimitAck(
        async (extra) => { calls.push(extra); throw ackError; },
        async () => false,
    );
    assert.deepEqual(calls, [{}]);
    assert.equal(result.cancelled, true);
});

test('uyarı dışındaki hata aynen fırlatılır', async () => {
    const boom = { response: { status: 400, data: { error: 'Kilitli' } } };
    await assert.rejects(
        postWithDutyOtLimitAck(async () => { throw boom; }, async () => true),
        (err) => err === boom,
    );
});

// ── Çalışan görev günlerinde izinde ─────────────────────────────────────────

const leaveWarning = {
    applies: true,
    exceeds_limit: false,
    has_leave_overlap: true,
    requires_ack: true,
    employee_name: 'Gündüz Karaahmet',
    weeks: [],
    leave_overlaps: [
        { date: '2026-09-03', leave_request_id: 5, leave_type_name: 'Yıllık İzin', status: 'APPROVED', full_day: true, start_time: null, end_time: null },
        { date: '2026-09-04', leave_request_id: 6, leave_type_name: 'Mazeret İzni', status: 'PENDING', full_day: false, start_time: '09:00', end_time: '11:00' },
    ],
};

test('izin çakışmaları gün/tür/durum/saat etiketleriyle döner', () => {
    assert.deepEqual(buildLeaveOverlapRows(leaveWarning), [
        { key: '2026-09-03-5', dateLabel: '03.09', typeName: 'Yıllık İzin', statusLabel: 'Onaylı', timeLabel: 'Tam gün', pending: false },
        { key: '2026-09-04-6', dateLabel: '04.09', typeName: 'Mazeret İzni', statusLabel: 'Bekliyor', timeLabel: '09:00-11:00', pending: true },
    ]);
    assert.deepEqual(buildLeaveOverlapRows({}), []);
});

test('başlık hangi uyarıların olduğuna göre değişir', () => {
    assert.equal(dutyWarningTitle(leaveWarning), 'Çalışan bu tarihlerde izinli');
    assert.equal(dutyWarningTitle(warning), 'Haftalık fazla mesai sınırı aşılıyor');
    assert.equal(
        dutyWarningTitle({ ...warning, has_leave_overlap: true }),
        'Haftalık sınır aşılıyor, çalışan izinli',
    );
});

test('yalnız izin çakışması olan 409 da onay penceresini tetikler', async () => {
    const calls = [];
    const leaveAckError = { response: { status: 409, data: { code: 'OT_LIMIT_ACK_REQUIRED', warnings: ['EMPLOYEE_ON_LEAVE'], ot_limit_warning: leaveWarning } } };
    const result = await postWithDutyOtLimitAck(
        async (extra) => { calls.push(extra); if (!extra[DUTY_OT_LIMIT_ACK_FIELD]) throw leaveAckError; return {}; },
        async (w) => w === leaveWarning,
    );
    assert.equal(result.acknowledged, true);
    assert.equal(calls.length, 2);
});
