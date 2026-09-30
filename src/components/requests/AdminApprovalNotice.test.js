import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const load = async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
    try {
        return { mod: await vite.ssrLoadModule('/src/components/requests/AdminApprovalNotice.jsx'), vite };
    } catch (e) {
        await vite.close();
        throw e;
    }
};

test('bilgi kutusu metni ve hafta listesini çizer; metin yoksa hiçbir şey', async () => {
    const { mod, vite } = await load();
    try {
        const { AdminApprovalNotice } = mod;
        const html = renderToStaticMarkup(React.createElement(AdminApprovalNotice, {
            text: 'Bu haftalarda fazla mesainiz sınırı aşıyor.',
            items: ['21-27.09 haftası 45sa, sınır 30sa (15sa fazla)'],
        }));
        assert.match(html, /Bu haftalarda fazla mesainiz sınırı aşıyor\./);
        assert.match(html, /<li>21-27\.09 haftası 45sa, sınır 30sa \(15sa fazla\)<\/li>/);
        assert.equal(renderToStaticMarkup(React.createElement(AdminApprovalNotice, { text: null })), '');
    } finally {
        await vite.close();
    }
});

test('oluşturma kontrolü ilk çizimde (sonuç gelmeden) hiçbir şey göstermez', async () => {
    const { mod, vite } = await load();
    try {
        const { AdminApprovalCheck } = mod;
        const html = renderToStaticMarkup(React.createElement(AdminApprovalCheck, { date: '2026-09-29', durationSeconds: 7200 }));
        assert.equal(html, '');
    } finally {
        await vite.close();
    }
});
