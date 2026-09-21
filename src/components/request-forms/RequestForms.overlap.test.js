import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('izin formu yalnız aynı kategoride gerçekten çakışan saatler için uyarır', async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
    try {
        const { LeaveRequestForm } = await vite.ssrLoadModule('/src/components/request-forms/RequestForms.jsx');
        const base = {
            start_date: '2026-09-21', end_date: '2026-09-21',
            start_time: '09:00:00', end_time: '11:00:00', status: 'PENDING',
            request_type_detail: { category: 'LEAVE', code: 'EXCUSE_LEAVE' },
        };
        const cases = [
            { name: 'ayrı saatler', existing: base, start: '14:00', end: '16:00', warning: false },
            { name: 'sınırda temas', existing: base, start: '11:00', end: '12:00', warning: false },
            { name: 'gerçek çakışma', existing: base, start: '10:00', end: '12:00', warning: true },
            { name: 'onaylı ayrı saatler', existing: { ...base, status: 'APPROVED' }, start: '14:00', end: '16:00', warning: false },
            { name: 'üst onayda çakışma', existing: { ...base, status: 'ESCALATED' }, start: '10:00', end: '12:00', warning: true },
            { name: 'iptal edilmiş', existing: { ...base, status: 'CANCELLED' }, start: '10:00', end: '12:00', warning: false },
            { name: 'farklı kategori', existing: { ...base, request_type_detail: { category: 'EXTERNAL_DUTY' } }, start: '10:00', end: '12:00', warning: false },
            { name: 'tam gün izin', existing: { ...base, start_time: null, end_time: null }, start: '14:00', end: '16:00', warning: true },
            { name: 'yalnız öğle arası kesişimi', existing: { ...base, start_time: '11:00', end_time: '12:30' }, start: '12:00', end: '14:00', warning: false },
        ];
        for (const item of cases) {
            const html = renderToStaticMarkup(React.createElement(LeaveRequestForm, {
                leaveType: 'EXCUSE_LEAVE',
                leaveForm: { start_date: base.start_date, end_date: base.end_date, start_time: item.start, end_time: item.end },
                setLeaveForm() {}, recentLeaveHistory: [item.existing],
                excuseBalance: { schedule_info: { lunch_start: '12:00', lunch_end: '13:00' } },
            }));
            assert.equal(html.includes('Tarih çakışması'), item.warning, item.name);
        }
    } finally {
        await vite.close();
    }
});
