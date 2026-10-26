import assert from 'node:assert/strict';
import test from 'node:test';
import { DETAIL_ENDPOINTS, deepLinkFor, deepLinkKey, deepLinkStep, findRequestRow, parseRequestDeepLink } from './requestDeepLink.js';

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

test('dış görev satırının içindeki FM talebi de bulunur', () => {
    const child = { id: 444826, type: 'OVERTIME', related_leave_request: 1307 };
    const duty = { id: 1307, type: 'EXTERNAL_DUTY', _dutyOvertime: [child] };
    assert.equal(findRequestRow([[duty]], { type: 'OVERTIME', id: 444826 }), child);
    assert.equal(findRequestRow([[duty]], { type: 'EXTERNAL_DUTY', id: 1307 }), duty);
    assert.equal(findRequestRow([[duty]], { type: 'OVERTIME', id: 1307 }), null);
});

test('detay uçları', () => {
    assert.equal(DETAIL_ENDPOINTS.EXTERNAL_DUTY(4), '/leave/requests/4/');
    assert.equal(DETAIL_ENDPOINTS.HOSPITAL_VISIT(4), '/health-reports/4/');
});

test('link yalnız hem etkin hem URL sekmesi eşleşen sekmeye verilir', () => {
    const link = { type: 'OVERTIME', id: 5 };
    assert.equal(deepLinkFor('my_requests', 'my_requests', 'incoming_requests', link), null);
    assert.equal(deepLinkFor('incoming_requests', 'my_requests', 'incoming_requests', link), null);
    assert.equal(deepLinkFor('incoming_requests', 'incoming_requests', 'incoming_requests', link), link);
});

test('link anahtarı', () => {
    assert.equal(deepLinkKey({ type: 'LEAVE', id: 7 }), 'LEAVE-7');
    assert.equal(deepLinkKey(null), null);
});

test('link adımı: önce bir kez tazele, sonra ara', () => {
    const base = { key: 'OVERTIME-5', loading: false, handledKey: null, pendingKey: null, refreshedKey: null, canRefetch: true };
    assert.equal(deepLinkStep({ ...base, key: null }), 'idle');
    assert.equal(deepLinkStep({ ...base, loading: true }), 'idle');
    assert.equal(deepLinkStep({ ...base, handledKey: 'OVERTIME-5' }), 'idle');
    assert.equal(deepLinkStep(base), 'refetch');
    // tazeleme sürerken uyarı/arama yok
    assert.equal(deepLinkStep({ ...base, pendingKey: 'OVERTIME-5' }), 'idle');
    // başka linkin tazelemesi bu linki bekletmez
    assert.equal(deepLinkStep({ ...base, pendingKey: 'LEAVE-1' }), 'refetch');
    assert.equal(deepLinkStep({ ...base, refreshedKey: 'LEAVE-1' }), 'refetch');
    assert.equal(deepLinkStep({ ...base, refreshedKey: 'OVERTIME-5' }), 'search');
    // tazeleme verilmemişse doğrudan aranır
    assert.equal(deepLinkStep({ ...base, canRefetch: false }), 'search');
});
