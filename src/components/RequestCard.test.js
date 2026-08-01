import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('gelen mazeret izni kartındaki bakiye saatlerini okunabilir gösterir', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const { default: RequestCard } = await vite.ssrLoadModule('/src/components/RequestCard.jsx');
        const html = renderToStaticMarkup(
            React.createElement(RequestCard, {
                request: {
                    status: 'PENDING',
                    created_at: '2026-08-01T09:00:00+03:00',
                    employee_name: 'Test Çalışan',
                    leave_type_name: 'Mazeret İzni',
                    request_type_detail: { category: 'LEAVE' },
                    employee_annual_leave_balance: {
                        type: 'EXCUSE_LEAVE',
                        hours_entitled: 18,
                        hours_used: 12.47,
                        hours_remaining: 5.530000000000001,
                    },
                },
                type: 'LEAVE',
                isIncoming: true,
            }),
        );

        assert.match(html, /Toplam[\s\S]*18sa/);
        assert.match(html, /Kullanılan[\s\S]*12sa 28dk/);
        assert.match(html, /Kalan[\s\S]*5sa 32dk/);
        assert.doesNotMatch(html, /5\.530000000000001/);
    } finally {
        await vite.close();
    }
});
