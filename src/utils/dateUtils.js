/**
 * Istanbul Timezone Utilities
 *
 * Tüm tarih/saat işlemleri bu utility üzerinden yapılmalı.
 * ASLA doğrudan new Date().getMonth() vb. kullanılmamalı.
 * Backend Europe/Istanbul kullanıyor, frontend de aynı olmalı.
 */

const TZ = 'Europe/Istanbul';

/**
 * Istanbul saatinde bugünün tarihini YYYY-MM-DD string olarak döndürür.
 * new Date().toISOString().split('T')[0] yerine kullan — UTC dönüşüm hatası olmaz.
 * @returns {string} YYYY-MM-DD
 */
export function getIstanbulToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/**
 * Istanbul saatinde bugünün tarih parçalarını döndürür.
 * new Date().getFullYear() / getMonth() / getDate() yerine kullan.
 * @returns {{ year: number, month: number, day: number }}
 */
export function getIstanbulTodayParts() {
    const s = getIstanbulToday(); // "2026-03-20"
    const [y, m, d] = s.split('-').map(Number);
    return { year: y, month: m, day: d };
}

/**
 * Verilen ISO string veya Date nesnesinin Istanbul timezone parçalarını döndürür.
 * d.getMonth(), d.getDate(), d.getFullYear() yerine kullan.
 * @param {string|Date} date - ISO string veya Date nesnesi
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, dayOfWeek: number }}
 */
export function toIstanbulParts(date) {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    const opts = { timeZone: TZ };
    // Single call for full date — individual options return only that component (e.g., "02" not "2026-02-28")
    const dateStr = d.toLocaleDateString('en-CA', opts); // "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-').map(Number);
    const timeParts = d.toLocaleTimeString('en-GB', { ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const [hour, minute, second] = timeParts.split(':').map(Number);
    const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun
    return { year, month, day, hour, minute, second, dayOfWeek };
}

/**
 * Istanbul saatinde yılı döndürür.
 * @returns {number}
 */
export function getIstanbulYear() {
    return getIstanbulTodayParts().year;
}

/**
 * Istanbul saatinde ayı döndürür (1-indexed: Ocak=1).
 * @returns {number}
 */
export function getIstanbulMonth() {
    return getIstanbulTodayParts().month;
}

/**
 * Istanbul saatinde günü döndürür.
 * @returns {number}
 */
export function getIstanbulDay() {
    return getIstanbulTodayParts().day;
}

/**
 * Istanbul today'i Date nesnesi olarak döndürür (gece yarısı).
 * Calendar component'leri gibi Date nesnesi gereken yerler için.
 * @returns {Date}
 */
export function getIstanbulNow() {
    // Istanbul'daki geçerli zamanı temsil eden bir Date oluştur
    // Not: Bu Date nesnesi browser TZ'inde saklanır ama Istanbul saatini temsil eder
    const s = getIstanbulToday();
    const timeParts = new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false });
    return new Date(s + 'T' + timeParts);
}

/**
 * Istanbul today'i Date nesnesi olarak döndürür (gece yarısı, saat 00:00).
 * Calendar bileşenleri ve date comparison için kullan.
 * @returns {Date}
 */
export function getIstanbulTodayDate() {
    const s = getIstanbulToday();
    return new Date(s + 'T00:00:00');
}

/**
 * Istanbul saatine göre bugünden gün ekle/çıkar, YYYY-MM-DD döndür.
 * @param {number} days
 * @returns {string} YYYY-MM-DD
 */
export function getIstanbulDateOffset(days) {
    const parts = getIstanbulToday().split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-CA');
}

/**
 * Verilen tarih Istanbul'da bugün mü?
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isIstanbulToday(date) {
    if (!date) return false;
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return false;
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: TZ });
    return dateStr === getIstanbulToday();
}

/**
 * Verilen tarihin YYYY-MM-DD string'ini Istanbul TZ'de döndürür.
 * @param {string|Date} date
 * @returns {string} YYYY-MM-DD
 */
export function toIstanbulDateStr(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/**
 * Verilen tarihi Türkçe okunabilir formatta döndür (ör: 12 Oca 2024).
 * timeZone: Europe/Istanbul garantili.
 * @param {string|Date} date
 * @param {object} [options] - Intl options override
 * @returns {string}
 */
export const formatDate = (date, options) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: TZ,
        ...options
    });
};

/**
 * Verilen tarihi "20.03.2026" formatında döndür.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatIstanbulDate(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: TZ
    });
}

/**
 * Verilen tarihi "14:30" formatında döndür.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatIstanbulTime(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TZ
    });
}

/**
 * Verilen tarihi "20.03.2026 14:30" formatında döndür.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatIstanbulDateTime(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TZ
    });
}

/**
 * Türkçe uzun tarih formatı (ör: "20 Mart 2026, Cuma").
 * @param {string|Date} date
 * @returns {string}
 */
export function formatIstanbulDateLong(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
        timeZone: TZ
    });
}

/**
 * Istanbul TZ'de mali ayı hesapla (26-25 kuralı).
 * 26'sından itibaren sonraki aya ait, 25'ine kadar mevcut aya ait.
 * @param {string|Date} [date] - Hesaplanacak tarih (default: bugün)
 * @returns {{ month: number, year: number }}
 */
export function getIstanbulFiscalMonth(date) {
    let day, month, year;
    if (date) {
        const parts = toIstanbulParts(date);
        if (!parts) return { month: getIstanbulMonth(), year: getIstanbulYear() };
        ({ day, month, year } = parts);
    } else {
        ({ day, month, year } = getIstanbulTodayParts());
    }
    if (day >= 26) {
        // Sonraki aya ait
        if (month === 12) {
            return { month: 1, year: year + 1 };
        }
        return { month: month + 1, year };
    }
    return { month, year };
}

/**
 * Verilen YYYY-MM-DD string'den Date nesnesi oluştur (gece yarısı).
 * new Date(dateStr) yerine kullan — timezone kayması önlenir.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
    if (!dateStr) return new Date(NaN);
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/**
 * Intl.DateTimeFormat ile Istanbul TZ'de Türkçe format.
 * @param {string|Date} date
 * @param {object} options - Intl.DateTimeFormat options (timeZone otomatik eklenir)
 * @returns {string}
 */
export function formatTR(date, options = {}) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, ...options }).format(d);
}
