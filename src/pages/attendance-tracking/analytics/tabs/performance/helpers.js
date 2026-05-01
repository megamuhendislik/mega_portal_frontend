// Performance v3 — ortak yardimci fonksiyonlar.

export const fmtPct = (v) => (v == null ? '—' : `${Math.round(v)}%`);
export const fmtHrs = (v) => `${Math.round(v || 0)}sa`;

export function levelColor(eff) {
    if (eff == null) return '#94a3b8';
    if (eff >= 95) return '#10b981';
    if (eff >= 80) return '#6366f1';
    if (eff >= 60) return '#f59e0b';
    return '#ef4444';
}

export function intensityColor(pct) {
    if (pct == null) return '#94a3b8';
    if (pct >= 50) return '#ef4444';
    if (pct >= 25) return '#f59e0b';
    if (pct >= 10) return '#6366f1';
    return '#10b981';
}

// Heatmap arka plan rengi: deger 0..1 normalize, dusuk -> yesil, yuksek -> kirmizi
export function heatmapColor(normalized, invert = false) {
    const v = invert ? 1 - normalized : normalized;
    if (v >= 0.95) return 'bg-emerald-500 text-white';
    if (v >= 0.80) return 'bg-emerald-400 text-white';
    if (v >= 0.60) return 'bg-yellow-300 text-slate-800';
    if (v >= 0.40) return 'bg-orange-300 text-slate-800';
    if (v >= 0.20) return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
}

// Tablo + chart icin Turkce normalize
export const TR_NORM = (s) => String(s || '').toLocaleLowerCase('tr')
    .replace(/[şçöüğıİ]/g, c => ({ ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', ı: 'i', İ: 'i' })[c]);

// 4 quadrant ScatterMatrix isimleri (eksik/y vs ot/y)
export function quadrantOf(missingPct, otPct) {
    const HIGH_MISSING = 15;  // %
    const HIGH_OT = 25;  // %
    const isHighMiss = missingPct >= HIGH_MISSING;
    const isHighOt = otPct >= HIGH_OT;
    if (isHighOt && isHighMiss) return 'risk';      // sag-ust
    if (isHighOt && !isHighMiss) return 'intense';  // sol-ust
    if (!isHighOt && isHighMiss) return 'underfill'; // sag-alt
    return 'healthy';                                  // sol-alt
}

export const QUADRANT_META = {
    healthy: { label: 'Saglikli', color: '#10b981', bg: 'bg-emerald-50' },
    intense: { label: 'Yogun', color: '#f59e0b', bg: 'bg-amber-50' },
    underfill: { label: 'Yetersiz', color: '#f97316', bg: 'bg-orange-50' },
    risk: { label: 'Riskli', color: '#ef4444', bg: 'bg-red-50' },
};

// Smart filter preset'leri — frontend-only
export const PRESETS = {
    high_ot: {
        label: 'Yuksek FM',
        predicate: (e) => (e.ot_to_target_pct || 0) >= 25,
    },
    high_missing: {
        label: 'Eksigi Yuksek',
        predicate: (e) => (e.missing_to_target_pct || 0) >= 15,
    },
    healthy: {
        label: 'Saglikli',
        predicate: (e) => (e.normal_completion_pct ?? e.efficiency_pct ?? 0) >= 90
            && (e.missing_to_target_pct || 0) < 5,
    },
    underfilling: {
        label: 'Tam Doldurmayan',
        predicate: (e) => (e.normal_completion_pct ?? e.efficiency_pct ?? 0) < 80,
    },
};

export function applyPresets(employees, activePresets) {
    if (!activePresets || activePresets.length === 0) return employees;
    return employees.filter((e) =>
        activePresets.some((k) => PRESETS[k]?.predicate(e))
    );
}

export function applyMetricRanges(employees, ranges) {
    if (!ranges) return employees;
    return employees.filter((e) => {
        const norm = e.normal_completion_pct ?? e.efficiency_pct ?? 0;
        const total = e.total_completion_pct ?? 0;
        const otY = e.ot_to_target_pct ?? 0;
        const missY = e.missing_to_target_pct ?? 0;
        const otN = e.ot_to_normal_pct;
        if (ranges.normal && (norm < ranges.normal[0] || norm > ranges.normal[1])) return false;
        if (ranges.total && (total < ranges.total[0] || total > ranges.total[1])) return false;
        if (ranges.ot_y && (otY < ranges.ot_y[0] || otY > ranges.ot_y[1])) return false;
        if (ranges.miss_y && (missY < ranges.miss_y[0] || missY > ranges.miss_y[1])) return false;
        if (ranges.ot_n && otN != null && (otN < ranges.ot_n[0] || otN > ranges.ot_n[1])) return false;
        return true;
    });
}

// Avatar gradient + initials
export const GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-blue-500 to-cyan-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-fuchsia-600',
    'from-sky-500 to-blue-600',
    'from-lime-500 to-emerald-600',
];

export function gradientFor(id) {
    const n = typeof id === 'number'
        ? id
        : (String(id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    return GRADIENTS[Math.abs(n) % GRADIENTS.length];
}

export function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
