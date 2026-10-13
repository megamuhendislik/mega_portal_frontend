import assert from 'node:assert/strict';
import test from 'node:test';
import { loginPathFor, safeNext } from './safeNext.js';

test('site içi yol korunur', () => {
    assert.equal(safeNext('/requests?tab=incoming&type=OVERTIME&id=5'), '/requests?tab=incoming&type=OVERTIME&id=5');
    assert.equal(safeNext('/procurement?id=3'), '/procurement?id=3');
});

test('dış ya da döngüsel adresler reddedilir', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, undefined, 42, '/login', '/login?next=%2Fx']) {
        assert.equal(safeNext(bad), '/', String(bad));
    }
});

test('giriş yolu hedefi taşır', () => {
    assert.equal(loginPathFor('/requests?type=LEAVE&id=7'), '/login?next=%2Frequests%3Ftype%3DLEAVE%26id%3D7');
    assert.equal(loginPathFor('/'), '/login');
    assert.equal(loginPathFor('//evil.com'), '/login');
});
