const BASE_APPLY_CONFIRMATION =
    'DIKKAT: Tum degisiklikler kalici olarak uygulanacak!\n\n' +
    'Dry-run raporundaki tum split duzeltmeleri, normal mesai yeniden hesaplamalari,\n' +
    'Fazla Mesai ayarlamalari ve aylik ozet guncellemeleri veritabanina yazilacak.\n\n' +
    'Bu islem geri alinamaz. Devam etmek istiyor musunuz?';

function normalizeCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

export function getFrcApplyBlockReason(result) {
    const partialNote = result?._partial_note;
    if (!partialNote) return null;
    return `Kısmi rapor uygulanamaz: ${partialNote}`;
}

export function getProtectedDayInfo(result) {
    const summary = result?.summary || {};
    const primaryDetails = summary.protected_day_details;
    const fallbackDetails = summary.protected_days_skipped_details;
    return {
        count: normalizeCount(summary.protected_days_skipped),
        details: Array.isArray(primaryDetails)
            ? primaryDetails
            : (Array.isArray(fallbackDetails) ? fallbackDetails : []),
    };
}

export function buildFrcApplyConfirmation(protectedDaysSkipped = 0) {
    const count = normalizeCount(protectedDaysSkipped);
    if (!count) return BASE_APPLY_CONFIRMATION;
    return (
        `${BASE_APPLY_CONFIRMATION}\n\n` +
        `⚠️ ${count} korumalı gün güvenlik nedeniyle yeniden hesaplanmadı ve ` +
        'değişmeden bırakılacak.'
    );
}
