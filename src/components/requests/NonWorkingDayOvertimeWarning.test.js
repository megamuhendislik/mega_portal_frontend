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

const rawSerializerRequest = {
    type: 'OVERTIME',
    date: '2026-08-14',
    end_time: '23:59:59',
    non_working_day_overtime_warning: {
        code: 'NON_WORKING_DAY_OVERTIME',
        date: '2026-08-14',
        status: { code: 'HEALTH_REPORT', label: 'Sağlık Raporu' },
        source_kind: 'CARD',
        calculation_mode: 'RAW_WORK_OVERTIME',
        deduct_scheduled_lunch: false,
        overtime_seconds: 35444,
        message: 'Rapor günündeki çalışma ham süre üzerinden fazla mesai sayılır.',
    },
};

const dutySerializerRequest = {
    type: 'EXTERNAL_DUTY',
    non_working_day_overtime_warning: {
        code: 'NON_WORKING_DAY_OVERTIME',
        date: '2026-08-03',
        status: { code: 'ANNUAL_LEAVE', label: 'Yıllık İzin' },
        source_kind: 'DUTY',
        calculation_mode: 'DUTY_NET_OVERTIME',
        deduct_scheduled_lunch: true,
        overtime_seconds: 21600,
        message: 'İzin günündeki dış görevden planlı öğle arası düşülür.',
    },
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
        assert.match(html, /yalnızca planlı öğle arasıyla çakışan süre düşülür/);
    } finally {
        await vite.close();
    }
});

test('normal kart çalışmasını doğrudan serializer alanından ham süre kuralıyla gösterir', async () => {
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
            React.createElement(Warning, { source: rawSerializerRequest }),
        );

        assert.match(html, /Sağlık Raporu/);
        assert.match(html, /9sa 50dk 44sn/);
        assert.match(html, /ham giriş.?çıkış süresi/);
        assert.match(html, /öğle arası düşülmez/);
        assert.match(html, /servis toleransı uygulanmaz/);
        assert.doesNotMatch(html, /öğle arası düşülerek hesaplan/);
    } finally {
        await vite.close();
    }
});

test('dış görev serializer alanında yalnız planlı öğle çakışmasının düşüldüğünü gösterir', async () => {
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
            React.createElement(Warning, { source: dutySerializerRequest }),
        );

        assert.match(html, /6sa/);
        assert.match(html, /yalnızca planlı öğle arasıyla çakışan süre düşülür/);
        assert.doesNotMatch(html, /servis toleransı uygulanmaz/);
    } finally {
        await vite.close();
    }
});

test('yeni doğrudan alan varken legacy görev önizlemesini ikinci kez toplamaz', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const { getNonWorkingDayOvertimeWarnings } = await vite.ssrLoadModule(
            '/src/components/requests/nonWorkingDayOvertimeUtils.js',
        );
        const warnings = getNonWorkingDayOvertimeWarnings({
            ...dutySerializerRequest,
            duty_work_info: {
                preview_days: preview.days,
                preview_warnings: preview.warnings,
            },
        });

        assert.equal(warnings.length, 1);
        assert.equal(warnings[0].calculationMode, 'DUTY_NET_OVERTIME');
        assert.equal(warnings[0].overtimeSeconds, 21600);
    } finally {
        await vite.close();
    }
});

test('potansiyel mesai uyarısını yalnız seçili segmentlerin süresiyle hesaplar', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const module = await vite.ssrLoadModule(
            '/src/components/requests/nonWorkingDayOvertimeUtils.js',
        );
        const segments = [
            {
                id: 41,
                non_working_day_overtime_warning: {
                    ...rawSerializerRequest.non_working_day_overtime_warning,
                    overtime_seconds: 3600,
                },
            },
            {
                id: 42,
                non_working_day_overtime_warning: {
                    ...rawSerializerRequest.non_working_day_overtime_warning,
                    overtime_seconds: 7200,
                },
            },
        ];

        const selected = module.selectOvertimeWarningSources(segments, new Set([42]));
        const warnings = module.getNonWorkingDayOvertimeWarnings(selected);
        assert.equal(selected.length, 1);
        assert.equal(warnings.length, 1);
        assert.equal(warnings[0].overtimeSeconds, 7200);

        const partial = module.withNonWorkingDayOvertimeSeconds(segments[1], 1800);
        assert.equal(
            module.getNonWorkingDayOvertimeWarnings(partial)[0].overtimeSeconds,
            1800,
        );
    } finally {
        await vite.close();
    }
});

test('yönetici doğrudan serializer alanındaki uyarıyı algılar ve onay metni üretir', async () => {
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
        const warnings = getNonWorkingDayOvertimeWarnings(rawSerializerRequest);

        assert.equal(warnings.length, 1);
        assert.equal(warnings[0].calculationMode, 'RAW_WORK_OVERTIME');
        assert.equal(warnings[0].deductScheduledLunch, false);
        assert.match(buildNonWorkingDayApprovalMessage(rawSerializerRequest), /9sa 50dk 44sn/);
        assert.match(buildNonWorkingDayApprovalMessage(rawSerializerRequest), /öğle arası düşülmez/);
    } finally {
        await vite.close();
    }
});

test('izin günü ve 23:59 çıkış uyarılarını aynı onay akışında korur', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const module = await vite.ssrLoadModule(
            '/src/components/requests/nonWorkingDayOvertimeUtils.js',
        );

        assert.equal(typeof module.buildOvertimeApprovalWarnings, 'function');
        const warnings = module.buildOvertimeApprovalWarnings(rawSerializerRequest);

        assert.deepEqual(
            warnings.map(warning => warning.code),
            ['NON_WORKING_DAY_OVERTIME', 'MISSING_EXIT'],
        );
        assert.match(warnings[0].message, /öğle arası düşülmez/);
        assert.match(warnings[1].message, /23:59/);
    } finally {
        await vite.close();
    }
});

test('manuel tarih önizlemesini backend sözleşmesindeki endpoint ve parametrelerle ister', async () => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });

    try {
        const module = await vite.ssrLoadModule(
            '/src/components/requests/nonWorkingDayOvertimeUtils.js',
        );
        const calls = [];
        const apiClient = {
            get: async (...args) => {
                calls.push(args);
                return { data: rawSerializerRequest.non_working_day_overtime_warning };
            },
        };

        assert.equal(typeof module.fetchNonWorkingDayOvertimeWarning, 'function');
        assert.equal(typeof module.calculateOvertimeSeconds, 'function');
        const overtimeSeconds = module.calculateOvertimeSeconds('11:00', '17:00');
        assert.equal(module.calculateOvertimeSeconds('11:00', '11:00'), 0);
        assert.equal(module.calculateOvertimeSeconds('18:00', '09:00'), 0);
        const warning = await module.fetchNonWorkingDayOvertimeWarning(
            apiClient,
            '2026-08-14',
            'MANUAL',
            overtimeSeconds,
        );

        assert.deepEqual(calls, [[
            '/overtime-requests/non-working-day-warning/',
            {
                params: {
                    date: '2026-08-14',
                    source_kind: 'MANUAL',
                    overtime_seconds: 21600,
                },
            },
        ]]);
        assert.equal(warning.calculation_mode, 'RAW_WORK_OVERTIME');
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
