import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({
    appType: 'custom',
    server: { middlewareMode: true },
});
const {
    normalizeServiceUsagePeriods,
    serializeServiceUsagePeriods,
    validateServiceUsagePeriods,
} = await vite.ssrLoadModule('/src/utils/serviceUsagePeriods.js');

const requiredEndDateMessage = 'Devam ediyor seçili değilse servis bitiş tarihi zorunludur.';

const uncheckedWithoutEnd = [{
    _key: 'unchecked-empty',
    start_date: '2026-07-01',
    end_date: null,
    ongoing: false,
}];
const normalizedUnchecked = normalizeServiceUsagePeriods(uncheckedWithoutEnd);
assert.equal(normalizedUnchecked[0].ongoing, false);
assert.ok(
    validateServiceUsagePeriods(uncheckedWithoutEnd).includes(requiredEndDateMessage),
);
assert.throws(
    () => serializeServiceUsagePeriods(uncheckedWithoutEnd),
    new RegExp(requiredEndDateMessage),
);

const legacyOngoing = normalizeServiceUsagePeriods([{
    id: 12,
    start_date: '2026-01-01',
    end_date: null,
}]);
assert.equal(legacyOngoing[0].ongoing, true);

const closedPeriod = [{
    _key: 'closed-period',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    ongoing: false,
}];
assert.deepEqual(validateServiceUsagePeriods(closedPeriod), []);
assert.deepEqual(serializeServiceUsagePeriods(closedPeriod), [{
    start_date: '2026-07-01',
    end_date: '2026-07-31',
}]);

await vite.close();
console.log('service usage period utility regression: PASS');
