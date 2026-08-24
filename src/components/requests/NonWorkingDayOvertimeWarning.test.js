import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const preview = {
    days: [{
        date: '2026-08-03',
        is_non_working_status_day: true,
        non_working_status: { label: 'Yıllık İzin' },
        overtime_minutes: 360,
    }],
    warnings: [{
        code: 'NON_WORKING_DAY_OVERTIME',
        date: '2026-08-03',
        status: { label: 'Yıllık İzin' },
        message: 'İzin gününde çalışma fazla mesai sayılacaktır.',
    }],
};

test('talep sahibine izin günü mesai ve öğle kuralını gösterir', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const { default: Warning } = await vite.ssrLoadModule(
            '/src/components/requests/NonWorkingDayOvertimeWarning.jsx',
        );
        const html = renderToStaticMarkup(
            React.createElement(Warning, { source: preview }),
        );

        assert.match(html, /İzin \/ rapor gününde fazla mesai/);
        assert.match(html, /3 Ağu 2026/);
        assert.match(html, /Yıllık İzin/);
        assert.match(html, /6sa/);
        assert.match(html, /öğle arası düşülerek/);
    } finally {
        await vite.close();
    }
});

test('yönetici serializer verisindeki uyarıyı algılar ve onay metni üretir', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const {
            getNonWorkingDayOvertimeWarnings,
            buildNonWorkingDayApprovalMessage,
        } = await vite.ssrLoadModule(
            '/src/components/requests/nonWorkingDayOvertimeUtils.js',
        );
        const request = {
            duty_work_info: {
                preview_days: preview.days,
                preview_warnings: preview.warnings,
            },
        };

        const warnings = getNonWorkingDayOvertimeWarnings(request);

        assert.equal(warnings.length, 1);
        assert.match(buildNonWorkingDayApprovalMessage(request), /6sa/);
        assert.match(buildNonWorkingDayApprovalMessage(request), /haftalık fazla mesai limiti/);
    } finally {
        await vite.close();
    }
});

test('izin veya rapor statüsü yoksa uyarı render etmez', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const { default: Warning } = await vite.ssrLoadModule(
            '/src/components/requests/NonWorkingDayOvertimeWarning.jsx',
        );
        const html = renderToStaticMarkup(
            React.createElement(Warning, { source: { days: [], warnings: [] } }),
        );

        assert.equal(html, '');
    } finally {
        await vite.close();
    }
});

test('vekil dış görev tipi filtreleme için LEAVE olarak ezilmez', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const { getSubstituteLeaveType } = await vite.ssrLoadModule(
            '/src/components/requests/nonWorkingDayOvertimeUtils.js',
        );

        assert.equal(
            getSubstituteLeaveType({ type: 'EXTERNAL_DUTY' }),
            'EXTERNAL_DUTY',
        );
        assert.equal(
            getSubstituteLeaveType({
                type: 'LEAVE',
                request_type_detail: { category: 'EXTERNAL_DUTY' },
            }),
            'EXTERNAL_DUTY',
        );
        assert.equal(getSubstituteLeaveType({ type: 'LEAVE' }), 'LEAVE');
    } finally {
        await vite.close();
    }
});
