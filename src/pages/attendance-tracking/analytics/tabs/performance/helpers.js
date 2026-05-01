// Performance v3 — ortak yardimci fonksiyonlar.

// Turkce standardi: yuzde isareti onde (%85, "85%" degil)
export const fmtPct = (v) => (v == null ? '—' : `%${Math.round(v)}`);
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

// 4 quadrant ScatterMatrix isimleri (X = N.Doluluk, Y = FM/Y)
// Sag-ust = yuksek N.Dol + yuksek FM = "Lider"
// Sag-alt = yuksek N.Dol + dusuk FM = "Saglikli"
// Sol-ust = dusuk N.Dol + yuksek FM = "Tutarsiz"
// Sol-alt = dusuk N.Dol + dusuk FM = "Yetersiz"
export const HIGH_NORMAL_THRESHOLD = 80;  // N.Doluluk %80 ust limit
export const HIGH_OT_THRESHOLD = 25;       // FM/Y %25 ust limit

export function quadrantOf(normalPct, otPct) {
    const isHighN = (normalPct || 0) >= HIGH_NORMAL_THRESHOLD;
    const isHighOt = (otPct || 0) >= HIGH_OT_THRESHOLD;
    if (isHighN && isHighOt) return 'leader';      // sag-ust
    if (isHighN && !isHighOt) return 'healthy';    // sag-alt
    if (!isHighN && isHighOt) return 'inconsistent'; // sol-ust
    return 'underperform';                          // sol-alt
}

export const QUADRANT_META = {
    leader: { label: 'Lider', color: '#10b981', bg: 'bg-emerald-50' },
    healthy: { label: 'Saglikli', color: '#3b82f6', bg: 'bg-blue-50' },
    inconsistent: { label: 'Tutarsiz', color: '#f59e0b', bg: 'bg-amber-50' },
    underperform: { label: 'Yetersiz', color: '#ef4444', bg: 'bg-red-50' },
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

// Deterministik PRNG (mulberry32) — ayni seed -> ayni rastgele sayi
function seededRandom(seed) {
    let t = seed | 0;
    return function () {
        t = (t + 0x6D2B79F5) | 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Deterministik jitter — ayni id icin her zaman ayni kayma.
 * Y=0 ve X=0'da yigilan noktalari dagitir.
 *
 * @param {number} x - orijinal x
 * @param {number} y - orijinal y
 * @param {number|string} seed - employee_id veya benzeri stable id
 * @param {number} amount - kayma miktari (default: x icin 1.5%, y icin 1.5%)
 * @returns {{x, y}} jitter eklenmis koordinatlar
 */
export function addJitter(x, y, seed, amount = 1.5) {
    const numericSeed = typeof seed === 'number'
        ? seed
        : String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rnd = seededRandom(numericSeed * 31 + 7);
    // Symmetric in [-amount, +amount]
    const dx = (rnd() * 2 - 1) * amount;
    const dy = (rnd() * 2 - 1) * amount;
    // Y=0 veya X=0 sinirinda biraz daha cesaretli ic kaydir (negatif olmasin)
    const xJittered = Math.max(0, x + dx);
    const yJittered = Math.max(0, y + dy);
    return { x: xJittered, y: yJittered };
}

/**
 * Etiket cakisma onleme — yakin etiketleri filtreler.
 * Recharts LabelList icinden kullanilir.
 *
 * @param {Array} points - tum noktalar (x, y, id, label)
 * @param {Set} candidateIds - etiket adayi id seti
 * @param {number} minDistanceX - min cesaret X (yuzde, default 6)
 * @param {number} minDistanceY - min cesaret Y (yuzde, default 6)
 * @returns {Set} etiket gosterilecek id seti
 */
export function pruneLabelCollisions(points, candidateIds, minDistanceX = 6, minDistanceY = 6) {
    const candidates = points.filter((p) => candidateIds.has(p.id));
    // Saglik puani sirasi: yuksek skor = onemli (ucta), once etiketle
    const sorted = [...candidates].sort((a, b) => {
        const aScore = Math.abs(a.x - 50) + Math.abs(a.y);
        const bScore = Math.abs(b.x - 50) + Math.abs(b.y);
        return bScore - aScore;
    });
    const accepted = [];
    for (const p of sorted) {
        const tooClose = accepted.some((a) =>
            Math.abs(a.x - p.x) < minDistanceX && Math.abs(a.y - p.y) < minDistanceY
        );
        if (!tooClose) accepted.push(p);
    }
    return new Set(accepted.map((p) => p.id));
}

export function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
