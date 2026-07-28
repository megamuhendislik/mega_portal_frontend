import { getIstanbulToday } from './dateUtils';

export const normalizeServiceUsagePeriods = (periods = []) =>
    periods
        .map((period, index) => ({
            id: period.id ?? null,
            _key: period._key || `service-period-${period.id ?? index}`,
            start_date: period.start_date || '',
            end_date: period.end_date || null,
            ongoing: !period.end_date,
        }))
        .sort((a, b) => a.start_date.localeCompare(b.start_date));

export const validateServiceUsagePeriods = (periods = []) => {
    const normalized = normalizeServiceUsagePeriods(periods);
    const errors = [];

    normalized.forEach((period) => {
        if (!period.start_date) {
            errors.push('Her servis dönemi için başlangıç tarihi zorunludur.');
        }
        if (period.end_date && period.end_date < period.start_date) {
            errors.push('Servis bitiş tarihi başlangıç tarihinden önce olamaz.');
        }
    });

    for (let index = 1; index < normalized.length; index += 1) {
        const previous = normalized[index - 1];
        const current = normalized[index];
        if (!previous.end_date || current.start_date <= previous.end_date) {
            errors.push('Servis kullanım dönemleri birbiriyle çakışamaz.');
            break;
        }
    }
    return [...new Set(errors)];
};

export const serializeServiceUsagePeriods = (periods = []) =>
    normalizeServiceUsagePeriods(periods).map(({ id, start_date, end_date }) => ({
        ...(id ? { id } : {}),
        start_date,
        end_date: end_date || null,
    }));

export const isServiceActiveOn = (
    periods = [],
    isoDate = getIstanbulToday(),
) => normalizeServiceUsagePeriods(periods).some(
    (period) => period.start_date <= isoDate
        && (!period.end_date || isoDate <= period.end_date),
);
