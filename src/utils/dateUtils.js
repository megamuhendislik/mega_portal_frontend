/**
 * Format a date string to a readable format (e.g. 12 Oca 2024)
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Get today's date in Istanbul timezone as YYYY-MM-DD string.
 * Replaces `new Date().toISOString().split('T')[0]` which can return
 * the wrong date near midnight due to UTC conversion.
 * @returns {string} YYYY-MM-DD
 */
export function getIstanbulToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

/**
 * Add days to Istanbul today and return YYYY-MM-DD string.
 * Useful for date range calculations (min/max dates).
 * @param {number} days - Number of days to add (negative for past dates)
 * @returns {string} YYYY-MM-DD
 */
export function getIstanbulDateOffset(days) {
    const parts = getIstanbulToday().split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-CA');
}
