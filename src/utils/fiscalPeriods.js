/**
 * Fiscal period helpers — single source of truth.
 *
 * Frontend'in 26-25 hardcoded mantığını ortadan kaldırır. Kullanıcının
 * çalışma takvimi (FiscalCalendar) 22-21, 24-23 gibi farklı sınırlarda
 * olabilir; bu modül backend `/api/attendance/my-fiscal-periods/`
 * endpoint'ini kullanarak gerçek dönemleri çeker ve cache'ler.
 *
 * Cache TTL: 5 dakika (calendar değişiklikleri dashboard refresh ile
 * yansır; live mutasyon nadirdir).
 */

import api from '../services/api';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika
let _cache = null;
let _inFlight = null;

/**
 * Kullanıcının fiscal period listesini çek (cache'li).
 * @param {Object} opts
 * @param {number} [opts.months=24] — Kaç ay geriye kadar.
 * @param {boolean} [opts.force=false] — Cache'i bypass et.
 * @returns {Promise<{periods: Array, calendar_name: string}>}
 *   periods: [{year, month, label, start_date, end_date, is_current}]
 */
export async function fetchMyFiscalPeriods({ months = 24, force = false } = {}) {
    const now = Date.now();
    if (!force && _cache && (now - _cache.ts) < CACHE_TTL_MS && _cache.months >= months) {
        return _cache.data;
    }
    if (_inFlight) return _inFlight;

    _inFlight = api.get(`/attendance/my-fiscal-periods/?months=${months}`)
        .then(res => {
            _cache = { ts: Date.now(), months, data: res.data };
            return res.data;
        })
        .finally(() => { _inFlight = null; });
    return _inFlight;
}

/** Cache'i temizle (logout/calendar değişimi sonrası). */
export function clearFiscalPeriodsCache() {
    _cache = null;
}

/**
 * Periods listesinden cari dönemi bul (is_current=true).
 * @returns {{year, month, start_date, end_date}|null}
 */
export function findCurrentPeriod(periods) {
    if (!Array.isArray(periods)) return null;
    return periods.find(p => p.is_current) || null;
}

/**
 * Periods listesinden year/month'a göre dönem bul.
 * @returns {{year, month, start_date, end_date}|null}
 */
export function findPeriodByYearMonth(periods, year, month) {
    if (!Array.isArray(periods)) return null;
    return periods.find(p => p.year === year && p.month === month) || null;
}

/**
 * Verilen tarihi (YYYY-MM-DD veya Date) kapsayan dönemi bul.
 * @returns {{year, month, start_date, end_date}|null}
 */
export function findPeriodForDate(periods, dateInput) {
    if (!Array.isArray(periods)) return null;
    const dateStr = dateInput instanceof Date
        ? dateInput.toISOString().slice(0, 10)
        : String(dateInput).slice(0, 10);
    return periods.find(p => p.start_date <= dateStr && dateStr <= p.end_date) || null;
}

/**
 * Bir sonraki/önceki dönemi bul (cari listede sıralıdır: yeniden eskiye).
 * @param {string} direction — 'prev' veya 'next'
 * @returns {{year, month, start_date, end_date}|null}
 */
export function navigatePeriod(periods, currentYear, currentMonth, direction) {
    if (!Array.isArray(periods)) return null;
    const idx = periods.findIndex(p => p.year === currentYear && p.month === currentMonth);
    if (idx === -1) return null;
    // my-fiscal-periods sırası: en yeni en başta (i=0 cari)
    // 'next' = yeni dönem = idx-1, 'prev' = eski dönem = idx+1
    const targetIdx = direction === 'next' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= periods.length) return null;
    return periods[targetIdx];
}
