import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildOverridePayload,
    getApiErrorMessage,
} from './requestActions.js';


test('vekil karar degistirme istegi asil yonetici baglamini tasir', () => {
    assert.deepEqual(
        buildOverridePayload(
            { _isSubstitute: true, principal_id: 42 },
            'approve',
            'Karar düzeltildi',
        ),
        {
            action: 'approve',
            reason: 'Karar düzeltildi',
            acting_as_substitute_for: 42,
        },
    );
});


test('normal yonetici override istegine vekil alani eklenmez', () => {
    assert.deepEqual(
        buildOverridePayload(
            { _isSubstitute: false, principal_id: 42 },
            'reject',
            'Uygun değil',
        ),
        { action: 'reject', reason: 'Uygun değil' },
    );
});


test('API detail mesaji genel hata yerine kullanilir', () => {
    const error = {
        response: { data: { detail: 'Bu talep vekil kapsamınızda değil.' } },
    };

    assert.equal(
        getApiErrorMessage(error, 'İşlem başarısız'),
        'Bu talep vekil kapsamınızda değil.',
    );
});
