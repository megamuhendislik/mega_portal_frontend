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
