import assert from 'node:assert/strict';
import test from 'node:test';
import { TELEGRAM_CATEGORIES, mergeTelegramPrefs, setAllCategories } from './telegramPrefs.js';

test('eksik ayar açık sayılır', () => {
    const p = mergeTelegramPrefs({});
    assert.equal(TELEGRAM_CATEGORIES.length, 6);
    assert.equal(p.categories.OVERTIME.INCOMING, true);
    assert.equal(p.other, true);
    assert.equal(p.team_filter, 'ALL');
    assert.deepEqual(p.team_employee_ids, []);
});

test('kayıtlı değerler korunur, bozuklar yok sayılır', () => {
    const p = mergeTelegramPrefs({
        categories: { LEAVE: { OWN: false, INCOMING: 'x' } }, other: false,
        team_filter: 'SELECTED', team_employee_ids: [3, '4', 5.5, 6],
    });
    assert.equal(p.categories.LEAVE.OWN, false);
    assert.equal(p.categories.LEAVE.INCOMING, true);
    assert.equal(p.other, false);
    assert.equal(p.team_filter, 'SELECTED');
    assert.deepEqual(p.team_employee_ids, [3, 6]);
});

test('tümünü kapat yalnız verilen yönleri ve diğerlerini etkiler', () => {
    const p = setAllCategories(mergeTelegramPrefs({}), false, ['OWN']);
    assert.equal(p.categories.MEAL.OWN, false);
    assert.equal(p.categories.MEAL.INCOMING, true);
    assert.equal(p.other, false);
});
