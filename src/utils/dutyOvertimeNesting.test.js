import assert from 'node:assert/strict';
import test from 'node:test';
import { isNestableDutyOvertime, nestDutyOvertime, nestedApprovedOvertimeMinutes } from './dutyOvertimeNesting.js';

const duty = { id: 1307, type: 'EXTERNAL_DUTY', status: 'APPROVED', start_date: '2026-10-22' };
const ot = { id: 444826, type: 'OVERTIME', status: 'APPROVED', related_leave_request: 1307, date: '2026-10-22', start_time: '22:00:00', duration_minutes: 60 };

test('onaylı dış görev FM satırı dış görevin içine taşınır', () => {
    const out = nestDutyOvertime([ot, duty]);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, 1307);
    assert.deepEqual(out[0]._dutyOvertime.map(r => r.id), [444826]);
    assert.equal(nestedApprovedOvertimeMinutes(out[0]), 60);
});

test('Taleplerim biçimi (_type) ve all_team kimliği (request_id) eşleşir', () => {
    const myDuty = { id: 1307, _type: 'EXTERNAL_DUTY', type: 'LEAVE', status: 'APPROVED' };
    const myOt = { id: 9, _type: 'OVERTIME', type: 'OVERTIME', status: 'APPROVED', related_leave_request: 1307, duration_seconds: 4740 };
    const out = nestDutyOvertime([myDuty, myOt]);
    assert.equal(out.length, 1);
    assert.equal(nestedApprovedOvertimeMinutes(out[0]), 79);

    const teamDuty = { request_id: 50, type: 'EXTERNAL_DUTY', status: 'APPROVED' };
    const teamOt = { request_id: 51, type: 'OVERTIME', status: 'APPROVED', related_leave_request: 50 };
    assert.equal(nestDutyOvertime([teamDuty, teamOt]).length, 1);
});

test('karar bekleyen FM ayrı satır kalır', () => {
    const pending = { ...ot, id: 2, status: 'PENDING' };
    assert.equal(isNestableDutyOvertime(pending), false);
    const out = nestDutyOvertime([duty, pending]);
    assert.equal(out.length, 2);
    assert.equal(out[0]._dutyOvertime, undefined);
});

test('reddedilen ve iptal edilen türev FM de içeride, onaylı toplamına girmez', () => {
    const rej = { ...ot, id: 3, status: 'REJECTED' };
    const can = { ...ot, id: 4, status: 'CANCELLED' };
    const out = nestDutyOvertime([duty, ot, rej, can]);
    assert.equal(out.length, 1);
    assert.equal(out[0]._dutyOvertime.length, 3);
    assert.equal(nestedApprovedOvertimeMinutes(out[0]), 60);
});

test('ana dış görev listede yoksa FM ayrı kalır', () => {
    const out = nestDutyOvertime([ot, { id: 5, type: 'LEAVE', status: 'APPROVED' }]);
    assert.equal(out.length, 2);
});

test('dış görevle bağı olmayan FM ve aynı numaralı izin etkilenmez', () => {
    const plain = { id: 7, type: 'OVERTIME', status: 'APPROVED', related_leave_request: null };
    const leaveSameId = { id: 1307, type: 'LEAVE', status: 'APPROVED' };
    const out = nestDutyOvertime([plain, leaveSameId, { ...ot }]);
    assert.equal(out.length, 3);
});

test('boş ve dış görevsiz liste aynen döner', () => {
    assert.deepEqual(nestDutyOvertime([]), []);
    const list = [ot];
    assert.equal(nestDutyOvertime(list), list);
});
