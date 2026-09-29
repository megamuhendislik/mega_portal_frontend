import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const HOUR = 3600;

const render = async (warning) => {
    const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent',
    });
    try {
        const { DutyOtLimitWarningMessage } = await vite.ssrLoadModule(
            '/src/components/requests/DutyOtLimitWarning.jsx',
        );
        return renderToStaticMarkup(React.createElement(DutyOtLimitWarningMessage, { warning }));
    } finally {
        await vite.close();
    }
};

test('izin çakışması onay penceresinde gün, tür ve durumla listelenir', async () => {
    const html = await render({
        exceeds_limit: false,
        has_leave_overlap: true,
        weeks: [],
        leave_overlaps: [
            { date: '2026-09-03', leave_request_id: 5, leave_type_name: 'Yıllık İzin', status: 'APPROVED', full_day: true },
            { date: '2026-09-04', leave_request_id: 6, leave_type_name: 'Mazeret İzni', status: 'PENDING', full_day: false, start_time: '09:00', end_time: '11:00' },
        ],
    });

    assert.match(html, /Çalışan bu tarihlerde izinli/);
    assert.match(html, /03\.09/);
    assert.match(html, /Yıllık İzin/);
    assert.match(html, /Onaylı/);
    assert.match(html, /09:00-11:00/);
    assert.match(html, /Bekliyor/);
    assert.match(html, /Yine de onaylamak istiyor musunuz\?/);
    assert.doesNotMatch(html, /haftalık\s+fazla mesai sınırı/);
});

test('sınır aşımı ve izin birlikte gösterilir', async () => {
    const html = await render({
        exceeds_limit: true,
        has_leave_overlap: true,
        employee_name: 'Gündüz Karaahmet',
        total_over_seconds: 2 * HOUR,
        weeks: [{
            week_start: '2026-08-31', week_end: '2026-09-06', limit_seconds: 30 * HOUR,
            counted_seconds: 28 * HOUR, existing_duty_seconds: 0, projected_duty_seconds: 4 * HOUR,
            total_seconds: 32 * HOUR, over_seconds: 2 * HOUR, exceeds: true, limit_exempt: true,
        }],
        leave_overlaps: [
            { date: '2026-09-03', leave_request_id: 5, leave_type_name: 'Yıllık İzin', status: 'APPROVED', full_day: true },
        ],
    });

    assert.match(html, /Gündüz Karaahmet/);
    assert.match(html, /sınırını <b>2sa<\/b> aşıyor/);
    assert.match(html, /31\.08 - 06\.09/);
    assert.match(html, /Çalışan bu tarihlerde izinli/);
});

test('sınırı aşan görev FM\'si sistem yöneticisi onayına düşecekse not gösterilir', async () => {
    const base = {
        exceeds_limit: true,
        has_leave_overlap: false,
        employee_name: 'Serpil Topaloğlu',
        total_over_seconds: 17 * HOUR,
        weeks: [{
            week_start: '2026-09-28', week_end: '2026-10-04',
            counted_seconds: 20 * HOUR, existing_duty_seconds: 0, projected_duty_seconds: 27 * HOUR,
            total_seconds: 47 * HOUR, limit_seconds: 30 * HOUR, over_seconds: 17 * HOUR,
            exceeds: true, limit_exempt: true,
        }],
        leave_overlaps: [],
    };
    const withAdmin = await render({ ...base, admin_approval_required: true });
    assert.match(withAdmin, /sistem yöneticisi onayına gidecek/);

    const withoutAdmin = await render({ ...base, admin_approval_required: false });
    assert.doesNotMatch(withoutAdmin, /sistem yöneticisi onayına gidecek/);
    assert.match(withoutAdmin, /sınırını <b>17sa<\/b> aşıyor/);
});
