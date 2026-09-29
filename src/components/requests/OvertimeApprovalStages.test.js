import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const HOUR = 3600;

const render = async (props) => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });
    try {
        const { default: OvertimeApprovalStages } = await vite.ssrLoadModule(
            '/src/components/requests/OvertimeApprovalStages.jsx',
        );
        return renderToStaticMarkup(React.createElement(OvertimeApprovalStages, props));
    } finally {
        await vite.close();
    }
};

const adminPending = {
    id: 9,
    status: 'PENDING',
    requires_admin_approval: true,
    approval_stage: 'ADMIN',
    manager_approved_by_name: 'Sabri Özgür Sipahi',
    manager_approved_at: '2026-09-29T10:22:00+03:00',
    admin_limit_snapshot: {
        week_start: '2026-09-28', week_end: '2026-10-04',
        limit_seconds: 30 * HOUR, week_total_seconds: 47 * HOUR, over_seconds: 17 * HOUR,
    },
};

test('iki onay aşaması ve haftalık sınır özeti gösterilir', async () => {
    const html = await render({ request: adminPending, isSystemAdmin: false, onAdminDecision: async () => {} });
    assert.match(html, /Yönetici Onayı/);
    assert.match(html, /Sistem Yöneticisi Onayı/);
    assert.match(html, /Sabri Özgür Sipahi/);
    assert.match(html, /data-stage="MANAGER" data-state="done"/);
    assert.match(html, /data-stage="ADMIN" data-state="pending"/);
    assert.match(html, /28\.09-04\.10 haftası: 47sa \(sınır 30sa\)/);
    // Sistem yöneticisi değilse karar düğmesi yok
    assert.doesNotMatch(html, />Onayla</);
});

test('sistem yöneticisi ADMIN aşamasında onay/ret düğmelerini görür', async () => {
    const html = await render({ request: adminPending, isSystemAdmin: true, onAdminDecision: async () => {} });
    assert.match(html, />Onayla</);
    assert.match(html, /Reddet/);
});

test('tamamlanan talepte karar düğmesi yok; ikinci onay veren görünür', async () => {
    const html = await render({
        request: {
            ...adminPending, status: 'APPROVED', approval_stage: 'COMPLETED',
            admin_decision_by_name: 'Yönetim Kurulu Üyesi', admin_decision_at: '2026-09-30T09:00:00+03:00',
        },
        isSystemAdmin: true,
        onAdminDecision: async () => {},
    });
    assert.match(html, /data-stage="ADMIN" data-state="done"/);
    assert.match(html, /Yönetim Kurulu Üyesi/);
    assert.doesNotMatch(html, />Onayla</);
});

test('ikinci onay gerekmeyen talepte bölüm hiç çizilmez', async () => {
    const html = await render({ request: { status: 'APPROVED', requires_admin_approval: false }, isSystemAdmin: true });
    assert.equal(html, '');
});
