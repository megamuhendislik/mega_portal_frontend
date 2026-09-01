import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';


test('mesai dışı günde kartsız giriş alanları saat kısıtı olmadan açıktır', async (t) => {
    const vite = await createServer({
        appType: 'custom',
        server: { middlewareMode: true },
    });
    t.after(() => vite.close());

    const { CardlessEntryForm } = await vite.ssrLoadModule(
        '/src/components/request-forms/RequestForms.jsx',
    );
    const html = renderToStaticMarkup(React.createElement(CardlessEntryForm, {
        cardlessEntryForm: {
            date: '2026-08-29',
            check_in_time: '10:00',
            check_out_time: '14:00',
            reason: 'Hafta sonu saha çalışması',
            send_to_substitute: false,
        },
        setCardlessEntryForm: () => {},
        cardlessScheduleLoading: false,
        cardlessSchedule: {
            is_work_day: false,
            reason: 'Seçilen tarih mesai günü değildir.',
        },
        isCardlessWorkDay: false,
        scheduleStart: '09:00',
        scheduleEnd: '18:00',
        approverDropdown: null,
        holidays: [],
        calendarLeaveHistory: [],
    }));

    const timeInputs = [...html.matchAll(/<input[^>]*type="time"[^>]*>/g)]
        .map((match) => match[0]);
    assert.equal(timeInputs.length, 2);
    for (const input of timeInputs) {
        assert.doesNotMatch(input, /\sdisabled(?:=|\s|>)/);
        assert.doesNotMatch(input, /\smin=/);
        assert.doesNotMatch(input, /\smax=/);
    }

    const textarea = html.match(/<textarea[^>]*>/)?.[0] || '';
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] || '';
    assert.doesNotMatch(textarea, /\sdisabled(?:=|\s|>)/);
    assert.doesNotMatch(checkbox, /\sdisabled(?:=|\s|>)/);
    assert.match(html, /fazla mesai/i);
});
