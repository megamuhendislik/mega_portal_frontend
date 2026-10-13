import assert from 'node:assert/strict';
import test from 'node:test';
import { DETAIL_ENDPOINTS, findRequestRow, parseRequestDeepLink } from './requestDeepLink.js';

const qs = (s) => new URLSearchParams(s);

test('geçerli link çözülür', () => {
    assert.deepEqual(parseRequestDeepLink(qs('tab=incoming&type=OVERTIME&id=5')), { type: 'OVERTIME', id: 5 });
});

test('geçersiz link yok sayılır', () => {
    for (const s of ['type=OVERTIME', 'id=5', 'type=HACK&id=5', 'type=LEAVE&id=abc', 'type=LEAVE&id=-1', 'type=LEAVE&id=1.5']) {
        assert.equal(parseRequestDeepLink(qs(s)), null, s);
    }
});

test('aynı tablodaki türler eşleşir, farklı tablo eşleşmez', () => {
    const duty = { id: 9, type: 'EXTERNAL_DUTY' };
    const ot = { id: 9, type: 'OVERTIME' };
    assert.equal(findRequestRow([[ot], [duty]], { type: 'LEAVE', id: 9 }), duty);
    assert.equal(findRequestRow([[ot]], { type: 'CARDLESS_ENTRY', id: 9 }), null);
    const hv = { id: 3, _type: 'HOSPITAL_VISIT', type: 'HEALTH_REPORT' };
    assert.equal(findRequestRow([[hv]], { type: 'HOSPITAL_VISIT', id: 3 }), hv);
});

test('request_id ve birleştirilmiş FM segmentleri de bulunur', () => {
    const team = { request_id: 11, type: 'OVERTIME' };
    const merged = { id: 20, _type: 'OVERTIME', _mergedSegments: [{ id: 20 }, { id: 21 }] };
    assert.equal(findRequestRow([[team]], { type: 'OVERTIME', id: 11 }), team);
    assert.equal(findRequestRow([[merged]], { type: 'OVERTIME', id: 21 }), merged);
    assert.equal(findRequestRow([null, undefined], { type: 'OVERTIME', id: 1 }), null);
});

test('detay uçları', () => {
    assert.equal(DETAIL_ENDPOINTS.EXTERNAL_DUTY(4), '/leave/requests/4/');
    assert.equal(DETAIL_ENDPOINTS.HOSPITAL_VISIT(4), '/health-reports/4/');
});
