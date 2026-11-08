// TYR hard mod: onaylı talep önerileri için saf yardımcılar.

export const HARD_REJECT_LABELS = {
    REQUEST_PINNED: 'Talepte otomatik düzeltme kapalı',
    SUGGESTION_NOT_FOUND: 'Öneri artık geçerli değil',
    SUGGESTION_CHANGED: 'Öneri değişti, yeniden simülasyon gerekli',
    DAY_RECOMPUTED: 'Gün değişmiş, yeniden hesaplandı',
    SOFT_FALLBACK: 'Gün kart düzeltmesi kapalı hesaplandı',
    DAY_SKIPPED: 'Gün işlenmedi',
};

const STATUS_LABELS = { APPROVED: 'Onaylı', PENDING: 'Onay bekliyor' };
const ACTION_LABELS = { UPDATE: 'Saat düzeltme', CANCEL: 'İptal' };

export function fmtHm(seconds) {
    const total = Math.round(Math.abs(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}`;
}

function fmtClock(value) {
    return String(value || '').slice(0, 5);
}

export function fmtTimeRange(part) {
    if (!part || !part.start_time) return '';
    const dur = part.duration_seconds == null ? '' : ` (${fmtHm(part.duration_seconds)})`;
    return `${fmtClock(part.start_time)}-${fmtClock(part.end_time)}${dur}`;
}

function fmtSigned(seconds) {
    const n = Number(seconds) || 0;
    if (n === 0) return '0:00';
    return `${n < 0 ? '-' : '+'}${fmtHm(n)}`;
}

export function describeHardSuggestion(s) {
    return {
        statusLabel: STATUS_LABELS[s?.status] || s?.status || '',
        actionLabel: ACTION_LABELS[s?.action] || s?.action || '',
        oldText: fmtTimeRange(s?.old),
        newText: s?.action === 'CANCEL' || !s?.new ? 'İptal' : fmtTimeRange(s.new),
        effectText: fmtSigned(s?.monthly_effect_seconds),
    };
}

export function collectFrcHardSuggestions(result) {
    const rows = [];
    const employees = Array.isArray(result?.employees) ? result.employees : [];
    employees.forEach((emp) => {
        (Array.isArray(emp?.days) ? emp.days : []).forEach((day) => {
            (Array.isArray(day?.request_hard_suggestions) ? day.request_hard_suggestions : [])
                .filter((suggestion) => suggestion?.selectable !== false)
                .forEach((suggestion) => {
                    rows.push({
                        employeeId: emp.id,
                        employeeName: emp.name || '',
                        date: day.date,
                        suggestion,
                    });
                });
        });
    });
    rows.sort((a, b) => (
        a.employeeName.localeCompare(b.employeeName, 'tr')
        || String(a.date).localeCompare(String(b.date))
        || (a.suggestion.request_id - b.suggestion.request_id)
    ));
    return rows;
}

export function buildApplyStagedBody(runId, selectedIds) {
    const ids = selectedIds ? Array.from(selectedIds).sort() : [];
    if (ids.length === 0) return { run_id: runId };
    return { run_id: runId, approved_suggestion_ids: ids };
}

export function summarizeHardApplyResult(data) {
    const applied = Array.isArray(data?.applied) ? data.applied : [];
    const rejected = (Array.isArray(data?.rejected) ? data.rejected : []).map((r) => ({
        ...r,
        label: HARD_REJECT_LABELS[r.code] || r.code || '',
    }));
    const derivedCount = Array.isArray(data?.derived_request_ids)
        ? data.derived_request_ids.length : 0;
    return { applied, rejected, derivedCount };
}

export const REVERT_BLOCK_LABELS = {
    POTENTIAL_DELETED: 'Silinen aday geri alınamaz',
    NOT_A_CHANGE: 'Bu satır bir geri alma kaydı',
    ALREADY_REVERTED: 'Daha önce geri alındı',
    NEWER_CHANGE: 'Talepte daha yeni bir değişiklik var',
    REQUEST_MISSING: 'Talep bulunamadı',
    STATE_CHANGED: 'Talep bu değişiklikten sonra değişti',
    ASSIGNMENT_CHANGED: 'Atama yeniden talep edilmiş',
    DAY_RECOMPUTE_FAILED: 'Gün yeniden hesaplanamadı',
};

const CHANGE_ACTION_LABELS = {
    UPDATE: 'Güncelleme',
    DELETE: 'Silme',
    CANCEL: 'İptal',
    REVERT: 'Geri alma',
    UNPIN: 'Otomatik düzeltme açıldı',
};
const CHANGE_MODE_LABELS = { SOFT: 'Soft', HARD: 'Hard', ADMIN: 'Yönetici' };

export function describeAutoChangeRow(row) {
    const after = row?.after;
    let afterText;
    if (row?.action === 'DELETE') afterText = 'Silindi';
    else if (row?.action === 'CANCEL') afterText = 'İptal';
    else afterText = fmtTimeRange(after) || '-';
    const adminRecord = row?.action === 'REVERT' || row?.action === 'UNPIN';
    const blocked = row && !adminRecord && !row.revertable && row.revert_block_reason;
    return {
        actionLabel: CHANGE_ACTION_LABELS[row?.action] || row?.action || '',
        modeLabel: CHANGE_MODE_LABELS[row?.mode] || row?.mode || '',
        beforeText: fmtTimeRange(row?.before) || '-',
        afterText,
        blockLabel: blocked
            ? (REVERT_BLOCK_LABELS[row.revert_block_reason] || row.revert_block_reason)
            : '',
    };
}

const SOURCE_LABELS = {
    TYR_STAGED_APPLY: 'TYR (elle uygulama)',
    TYR_APPLY: 'TYR',
    TYR_NIGHTLY: 'Gece TYR',
    DATA_INTEGRITY: 'Veri bütünlüğü',
    ADMIN: 'Yönetici',
};

export function labelAutoChangeSource(source) {
    if (!source) return '-';
    return SOURCE_LABELS[source] || source;
}

export function labelAutoChangeReason(reason) {
    if (reason === 'ADMIN_UNPIN') return 'Otomatik düzeltme açıldı';
    if (reason === 'ADMIN_REVERT') return 'Geri alındı';
    return reason || '';
}

// Sayfadaki her pinli talebin en yeni (en büyük id) satırı.
export function newestPinnedRowIds(rows) {
    const newest = new Map();
    (rows || []).forEach((row) => {
        if (!row.pinned) return;
        const cur = newest.get(row.request_id);
        if (cur === undefined || row.id > cur) newest.set(row.request_id, row.id);
    });
    return new Set(newest.values());
}
