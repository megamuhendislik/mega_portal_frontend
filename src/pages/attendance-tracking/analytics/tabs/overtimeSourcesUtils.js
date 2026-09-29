// Ek Mesai Analizi yardımcıları.

export const SOURCE_KEYS = ['CARD', 'MANUAL', 'INTENDED', 'DUTY', 'ATTENDANCE_ONLY'];

export const SOURCE_META = {
    CARD: { label: 'Kart', short: 'Kart', color: '#f59e0b' },
    MANUAL: { label: 'Manuel', short: 'Manuel', color: '#10b981' },
    INTENDED: { label: 'Planlı atama', short: 'Planlı', color: '#6366f1' },
    DUTY: { label: 'Dış görev', short: 'Dış görev', color: '#0ea5e9' },
    ATTENDANCE_ONLY: { label: 'Talepsiz kayıt', short: 'Talepsiz', color: '#94a3b8' },
};

const ddmm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export function weekLabel(start, end) {
    return `${ddmm(start)}-${ddmm(end)}`;
}

const toHours = (seconds) => Math.round(((seconds || 0) / 3600) * 100) / 100;

export function toWeeklyChartRows(weekly = []) {
    return weekly.map((w) => {
        const row = {
            label: weekLabel(w.week_start, w.week_end),
            week_start: w.week_start,
            partial: !!w.partial,
            total: toHours(w.total_seconds),
        };
        for (const key of SOURCE_KEYS) row[key] = toHours(w.by_source?.[key]);
        return row;
    });
}

const trLower = (s) => (s || '').toLocaleLowerCase('tr-TR');

const sourceSeconds = (emp, key) => {
    const s = emp.by_source?.[key];
    return s ? (s.approved_seconds || 0) + (s.pending_seconds || 0) : 0;
};

export function filterEmployees(employees = [], { onlyWithOt = true, source = null, overLimitOnly = false, search = '' } = {}) {
    const q = trLower(search.trim());
    return employees.filter((e) => {
        if (onlyWithOt && !(e.total_seconds > 0)) return false;
        if (source && !(sourceSeconds(e, source) > 0)) return false;
        if (overLimitOnly && !(e.over_limit_weeks > 0)) return false;
        if (q && !trLower(`${e.name} ${e.department || ''}`).includes(q)) return false;
        return true;
    });
}

export function sourceTotalsForPie(bySource = {}) {
    return SOURCE_KEYS
        .map((key) => ({
            key,
            name: SOURCE_META[key].label,
            color: SOURCE_META[key].color,
            seconds: (bySource[key]?.approved_seconds || 0) + (bySource[key]?.pending_seconds || 0),
        }))
        .filter((d) => d.seconds > 0)
        .map((d) => ({ ...d, hours: toHours(d.seconds) }));
}

export function signedSummary(row) {
    const s = row?.signed || {};
    const ref = s.ref_id ? `${s.label} #${s.ref_id}` : s.label || '';
    if (row?.source === 'INTENDED' && s.assigned_by) return `${ref}, atayan: ${s.assigned_by}`;
    if (row?.source === 'DUTY' && s.duty_approved_by) return `${ref}, onaylayan: ${s.duty_approved_by}`;
    return ref;
}

export function approvalStageTag(row) {
    if (row?.approval_stage === 'ADMIN') return { color: 'purple', text: 'Sistem Yöneticisinde' };
    return null;
}

// İki aşamalı onayda yönetici ve sistem yöneticisi ayrı satırda.
export function approverLines(row) {
    const stage = row?.approval_stage;
    if (stage === 'ADMIN' || stage === 'COMPLETED') {
        const lines = [{ label: 'Yönetici', value: row.manager_approved_by || '-' }];
        if (stage === 'COMPLETED') {
            lines.push({ label: 'Sistem yöneticisi', value: row.admin_decision_by || '-', at: row.admin_decision_at || null });
        } else {
            lines.push({ label: 'Sistem yöneticisi', value: 'Bekliyor', pending: true });
        }
        return lines;
    }
    return null;
}
