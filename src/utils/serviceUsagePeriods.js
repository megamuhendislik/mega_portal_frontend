import { getIstanbulToday } from './dateUtils';

export const normalizeServiceUsagePeriods = (periods = []) =>
    periods
        .map((period, index) => {
            const ongoing = typeof period.ongoing === 'boolean'
                ? period.ongoing
                : !period.end_date;
            return {
                id: period.id ?? null,
                _key: period._key || `service-period-${period.id ?? index}`,
                start_date: period.start_date || '',
                end_date: ongoing ? null : (period.end_date || null),
                ongoing,
            };
        })
        .sort((a, b) => a.start_date.localeCompare(b.start_date));

export const validateServiceUsagePeriods = (periods = []) => {
    const normalized = normalizeServiceUsagePeriods(periods);
    const errors = [];

    normalized.forEach((period) => {
        if (!period.start_date) {
            errors.push('Her servis dönemi için başlangıç tarihi zorunludur.');
        }
        if (!period.ongoing && !period.end_date) {
            errors.push('Devam ediyor seçili değilse servis bitiş tarihi zorunludur.');
        }
        if (period.end_date && period.end_date < period.start_date) {
            errors.push('Servis bitiş tarihi başlangıç tarihinden önce olamaz.');
        }
    });

    for (let index = 1; index < normalized.length; index += 1) {
        const previous = normalized[index - 1];
        const current = normalized[index];
        if (
            previous.ongoing
            || (previous.end_date && current.start_date <= previous.end_date)
        ) {
            errors.push('Servis kullanım dönemleri birbiriyle çakışamaz.');
            break;
        }
    }
    return [...new Set(errors)];
};

export const serializeServiceUsagePeriods = (periods = []) => {
    const normalized = normalizeServiceUsagePeriods(periods);
    if (normalized.some((period) => !period.ongoing && !period.end_date)) {
        throw new Error('Devam ediyor seçili değilse servis bitiş tarihi zorunludur.');
    }
    return normalized.map(({ id, start_date, end_date, ongoing }) => ({
        ...(id ? { id } : {}),
        start_date,
        end_date: ongoing ? null : end_date,
    }));
};

export const isServiceActiveOn = (
    periods = [],
    isoDate = getIstanbulToday(),
) => normalizeServiceUsagePeriods(periods).some(
    (period) => period.start_date
        && period.start_date <= isoDate
        && (
            period.ongoing
            || (period.end_date && isoDate <= period.end_date)
        ),
);
