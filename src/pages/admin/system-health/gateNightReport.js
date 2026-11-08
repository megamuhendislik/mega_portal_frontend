// Gece kart aktarımı raporu için saf yardımcılar (GateNightReportPanel).

const TRANSFER_LABELS = {
    RECEIVED: 'İşleniyor',
    ACCEPTED: 'Kabul edildi',
    DRY_RUN: 'Deneme',
    INVALID: 'Geçersiz',
    FAILED: 'Hata',
    MISSING: 'Aktarım gelmedi',
};

const RUN_LABELS = {
    APPLIED: 'Tamamlandı',
    APPLY_FAILED: 'Başarısız',
    TIMEOUT: 'Zaman aşımı',
    SKIPPED: 'Gerek yok',
    DISPATCH_FAILED: 'Başlatılamadı',
};

const REQUEST_STATUS_LABELS = {
    APPROVED: 'onaylı',
    PENDING: 'onay bekliyor',
    POTENTIAL: 'aday',
};

export function transferStatusLabel(status) {
    return TRANSFER_LABELS[status] || status;
}

export function runStatusLabel(row) {
    const report = row?.night_report || {};
    if (report.run_status && RUN_LABELS[report.run_status]) return RUN_LABELS[report.run_status];
    if (row?.frc_run_id && !row?.finalized_at) return 'Sürüyor';
    return '-';
}

export function countsText(row) {
    const c = row?.counts;
    if (!c || Object.keys(c).length === 0) return '-';
    return `${c.received ?? 0} alındı, ${c.added ?? 0} eklendi, ${c.deleted ?? 0} silindi, ${c.replaced ?? 0} düzeltildi`;
}

const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

export function mismatchText(m) {
    const [, month, day] = String(m.date || '').split('-');
    const status = REQUEST_STATUS_LABELS[m.status] || m.status;
    const oldPart = `${hhmm(m.old?.start_time)}-${hhmm(m.old?.end_time)}`;
    const newPart = m.new ? `${hhmm(m.new.start_time)}-${hhmm(m.new.end_time)}` : 'iptal';
    const tail = m.locked ? ' (kilitli dönem)' : '';
    return `${m.employee_name}, ${day}.${month}: #${m.request_id} ${status}, ${oldPart}, karta göre ${newPart}${tail}`;
}

export function formatDuration(seconds) {
    if (!seconds) return '-';
    const totalMin = Math.floor(seconds / 60);
    const h = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (h && min) return `${h} sa ${min} dk`;
    if (h) return `${h} sa`;
    return `${min} dk`;
}
