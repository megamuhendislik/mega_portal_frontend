import React, { useMemo, useState, useEffect } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, LabelList,
} from 'recharts';
import { Segmented, Tooltip as AntTooltip } from 'antd';
import { LayoutGrid, User, Building2, Users2, Grid3x3, ScatterChart as ScatterIcon, Bug, Download, Maximize2, Minimize2 } from 'lucide-react';
import SectionCard from '../../shared/SectionCard';
import api from '../../../../../services/api';
import { useAnalytics } from '../../AnalyticsContext';
import {
    quadrantOf, QUADRANT_META, levelColor, fmtHrs,
    addJitter,
    HIGH_NORMAL_THRESHOLD, HIGH_OT_THRESHOLD,
} from './helpers';
import HeatmapGridView from './HeatmapGridView';
import DrillDownGroupModal from './DrillDownGroupModal';

const VIEW_MODES = [
    { value: 'individual', label: 'Bireysel', icon: User },
    { value: 'department', label: 'Departman', icon: Building2 },
    { value: 'subtree', label: 'Yönetici Ekibi', icon: Users2 },
];

const DISPLAY_MODES = [
    { value: 'scatter', label: 'Balon', icon: ScatterIcon },
    { value: 'heatmap', label: 'Isı Haritası', icon: Grid3x3 },
];

// X ekseni = Yap. Mesai (Normal/Yukumluluk %), Y = FM/Y (%)
// Esikler helpers.js'tan import edilir

/**
 * Risk Haritasi v2 — 3 view mode + 2 display mode.
 * Bireysel: her nokta = kisi
 * Departman: her nokta = dept ortalamasi (boyut = kisi sayisi)
 * Yonetici Ekibi: secilen yoneticinin transitif ekibi
 *
 * Display: Balon (ScatterChart) veya Isi Haritasi (HeatmapGridView).
 */
export default function ScatterMatrix({ employees, onSelectPerson }) {
    const { queryParams } = useAnalytics();
    const [viewMode, setViewMode] = useState('individual');
    const [displayMode, setDisplayMode] = useState('scatter');
    const [hoveredQuad, setHoveredQuad] = useState(null);
    const [hoveredEmpId, setHoveredEmpId] = useState(null);
    const [drillData, setDrillData] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // ESC ile expand modunu kapat + body scroll lock
    useEffect(() => {
        if (!isExpanded) return undefined;
        const onKey = (ev) => { if (ev.key === 'Escape') setIsExpanded(false); };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [isExpanded]);

    // Departman ve yonetici agaci icin ek veri
    const [deptGroups, setDeptGroups] = useState([]);
    const [tree, setTree] = useState([]);
    const [pickedManagerId, setPickedManagerId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Departman fetch
    useEffect(() => {
        if (viewMode !== 'department' || !queryParams?.start_date) return undefined;
        let cancelled = false;
        Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
        api.get('/attendance-analytics/grouped-metrics/', {
            params: { ...queryParams, group_by: 'department' },
            timeout: 30000,
        }).then((res) => {
            if (!cancelled) setDeptGroups(res.data?.groups || []);
        }).catch(() => { if (!cancelled) setDeptGroups([]); })
          .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [viewMode, queryParams]);

    // Yonetici agaci fetch
    useEffect(() => {
        if (viewMode !== 'subtree' || !queryParams?.start_date) return undefined;
        let cancelled = false;
        Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
        api.get('/attendance-analytics/manager-hierarchy-metrics/', {
            params: queryParams, timeout: 30000,
        }).then((res) => {
            if (cancelled) return;
            const t = res.data?.tree || [];
            setTree(t);
            const firstRoot = t[0];
            if (firstRoot) {
                setPickedManagerId((curr) => curr == null ? firstRoot.employee_id : curr);
            }
        }).catch(() => { if (!cancelled) setTree([]); })
          .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [viewMode, queryParams]);

    // Yonetici agacindaki tum kisileri (kendisi dahil) toplayan helper
    const allManagers = useMemo(() => {
        const flatten = (nodes, acc = []) => {
            nodes.forEach((n) => {
                acc.push(n);
                if (n.children?.length > 0) flatten(n.children, acc);
            });
            return acc;
        };
        return flatten(tree);
    }, [tree]);

    // Noktalari uret — viewMode'a gore
    const points = useMemo(() => {
        const findNode = (nodes, id) => {
            for (const n of nodes) {
                if (n.employee_id === id) return n;
                if (n.children?.length > 0) {
                    const found = findNode(n.children, id);
                    if (found) return found;
                }
            }
            return null;
        };
        const collectIds = (node, out = []) => {
            out.push(node.employee_id);
            node.children?.forEach((c) => collectIds(c, out));
            return out;
        };
        if (viewMode === 'individual') {
            return employees
                .filter((e) => e.has_target ?? (e.target_hours > 0))
                .map((e) => {
                    // X = Yap. Mesai (Normal/Yukumluluk %), Y = FM/Yukumluluk (%)
                    const x_raw = Math.min(100, e.normal_completion_pct ?? e.efficiency_pct ?? 0);
                    const y_raw = e.ot_to_target_pct || 0;
                    // Jitter — yiginlanmayi onler
                    const j = addJitter(x_raw, y_raw, e.employee_id, 2.5);
                    return {
                        id: e.employee_id,
                        type: 'employee',
                        name: e.name,
                        label: e.name?.split(' ')[0] || '?',
                        department: e.department || '—',
                        x: j.x, y: j.y,
                        x_raw, y_raw,
                        // BUYUK BALON: 50-1200
                        z: Math.max(50, Math.min(1200, (e.normal_hours || 1) * 12)),
                        normal_h: e.normal_hours || 0,
                        ot_h: e.ot_hours || 0,
                        missing_h: e.missing_hours || 0,
                        normal_completion: e.normal_completion_pct ?? e.efficiency_pct ?? 0,
                        quadrant: quadrantOf(x_raw, y_raw),
                        employee: e,
                    };
                });
        }
        if (viewMode === 'department') {
            return deptGroups.map((g) => {
                const x = Math.min(100, g.avg_normal_completion_pct || 0);
                const y = g.avg_ot_to_target_pct || 0;
                return {
                    id: g.group_id,
                    type: 'department',
                    name: g.group_name,
                    label: g.group_name,
                    department: g.group_name,
                    x, y,
                    x_raw: x, y_raw: y,
                    z: Math.max(200, Math.min(3000, (g.employee_count || 1) * 250)),
                    normal_h: g.total_normal_hours || 0,
                    ot_h: g.total_ot_hours || 0,
                    missing_h: g.total_missing_hours || 0,
                    normal_completion: g.avg_normal_completion_pct || 0,
                    employee_count: g.employee_count,
                    quadrant: quadrantOf(x, y),
                    group: g,
                };
            });
        }
        if (viewMode === 'subtree' && pickedManagerId != null) {
            const node = findNode(tree, pickedManagerId);
            if (!node) return [];
            const ids = collectIds(node).filter((id) => id !== pickedManagerId); // yoneticiyi haric tut
            const idSet = new Set(ids);
            return employees
                .filter((e) => idSet.has(e.employee_id) && (e.has_target ?? (e.target_hours > 0)))
                .map((e) => {
                    // X = Yap. Mesai, Y = FM/Y
                    const x_raw = Math.min(100, e.normal_completion_pct ?? e.efficiency_pct ?? 0);
                    const y_raw = e.ot_to_target_pct || 0;
                    const j = addJitter(x_raw, y_raw, e.employee_id, 2.5);
                    return {
                        id: e.employee_id,
                        type: 'employee',
                        name: e.name,
                        label: e.name?.split(' ')[0] || '?',
                        department: e.department || '—',
                        x: j.x, y: j.y,
                        x_raw, y_raw,
                        z: Math.max(80, Math.min(1500, (e.normal_hours || 1) * 14)),
                        normal_h: e.normal_hours || 0,
                        ot_h: e.ot_hours || 0,
                        missing_h: e.missing_hours || 0,
                        normal_completion: e.normal_completion_pct ?? e.efficiency_pct ?? 0,
                        quadrant: quadrantOf(x_raw, y_raw),
                        employee: e,
                    };
                });
        }
        return [];
    }, [viewMode, employees, deptGroups, tree, pickedManagerId]);

    // Adaptive Y domain — veri max'ina gore yMax ayarla.
    // Boylece veri 0-15'te sikismaz, 75'e kadar gerilemez.
    const yMax = useMemo(() => {
        const maxY = Math.max(...points.map((p) => p.y || 0), 0);
        // p95 yaklasimi: tum noktalarin %95'i bu deger altinda
        const sortedY = points.map((p) => p.y || 0).sort((a, b) => a - b);
        const p95 = sortedY[Math.floor(sortedY.length * 0.95)] || maxY;
        // Y axis = max(p95 + buffer, kucuk minimum)
        // Outlier (Fulya tarzi) cikar — onu da gormek icin maxY kullan ama buffered
        const cap = Math.max(p95 * 1.4, maxY * 1.1, 20);
        return Math.ceil(cap / 5) * 5; // 5'in katlarina yuvarla
    }, [points]);

    const quadCounts = useMemo(() => {
        const c = { leader: 0, healthy: 0, inconsistent: 0, underperform: 0 };
        points.forEach((p) => { c[p.quadrant] = (c[p.quadrant] || 0) + 1; });
        return c;
    }, [points]);

    const filteredPoints = useMemo(() => {
        if (!hoveredQuad) return points;
        return points.filter((p) => p.quadrant === hoveredQuad);
    }, [points, hoveredQuad]);

    // Tum kisilerin etiketi gorunsun — cakisma kabul, kullanici istegi
    // (eskiden pruneLabelCollisions ile 4-5 etiket gosteriliyordu)
    const labeledPointIds = useMemo(() => new Set(points.map((p) => p.id)), [points]);

    // Etiket pozisyon listesi — sirayla atanir, leader line ile cizilir.
    // 12 yön (saat) — daha fazla cesit, daha az ortusme
    const LABEL_OFFSETS = [
        { dx: 0,    dy: -22, anchor: 'middle' }, // 12
        { dx: 18,   dy: -20, anchor: 'start' },  // 1
        { dx: 28,   dy: -10, anchor: 'start' },  // 2
        { dx: 30,   dy: 4,   anchor: 'start' },  // 3
        { dx: 28,   dy: 18,  anchor: 'start' },  // 4
        { dx: 18,   dy: 24,  anchor: 'start' },  // 5
        { dx: 0,    dy: 24,  anchor: 'middle' }, // 6
        { dx: -18,  dy: 24,  anchor: 'end' },    // 7
        { dx: -28,  dy: 18,  anchor: 'end' },    // 8
        { dx: -30,  dy: 4,   anchor: 'end' },    // 9
        { dx: -28,  dy: -10, anchor: 'end' },    // 10
        { dx: -18,  dy: -20, anchor: 'end' },    // 11
    ];
    const labeledIdsArray = useMemo(() => Array.from(labeledPointIds), [labeledPointIds]);

    const handlePointClick = (p) => {
        if (p.type === 'employee') {
            onSelectPerson?.(p.id);
        } else if (p.type === 'department') {
            setDrillData({
                group_name: `${p.name} (${p.employee_count} kişi)`,
                metrics: {
                    avg_normal_completion_pct: p.normal_completion,
                    total_ot_hours: p.ot_h,
                    total_missing_hours: p.missing_h,
                    avg_total_completion_pct: p.group?.avg_total_completion_pct,
                    avg_ot_to_target_pct: p.group?.avg_ot_to_target_pct,
                    avg_missing_to_target_pct: p.group?.avg_missing_to_target_pct,
                },
                employee_ids: p.group?.employee_ids || [],
            });
        }
    };

    const handleQuadrantDrill = (quadKey) => {
        const q = QUADRANT_META[quadKey];
        const items = points.filter((p) => p.quadrant === quadKey);
        const employeeIds = items.filter((p) => p.type === 'employee').map((p) => p.id);
        const totalNormal = items.reduce((s, p) => s + (p.normal_h || 0), 0);
        const totalOt = items.reduce((s, p) => s + (p.ot_h || 0), 0);
        const totalMissing = items.reduce((s, p) => s + (p.missing_h || 0), 0);
        const avgNormal = items.length > 0
            ? items.reduce((s, p) => s + (p.normal_completion || 0), 0) / items.length : 0;
        setDrillData({
            group_name: `${q.label} bölgesi (${items.length} kişi)`,
            metrics: {
                avg_normal_completion_pct: Math.round(avgNormal),
                total_ot_hours: totalOt,
                total_missing_hours: totalMissing,
                total_normal_hours: totalNormal,
            },
            employee_ids: employeeIds,
        });
    };

    const subtitle = viewMode === 'individual'
        ? 'X = Normal/Yükümlülük, Y = FM/Yükümlülük · Boyut = Normal saat · Renk = Yap. Mesai · Sağ-üst = ideal tempo'
        : viewMode === 'department'
            ? 'Departman ortalaması · X = avg Yap. Mesai, Y = avg FM/Y · Boyut = kişi sayısı'
            : 'Seçilen yöneticinin transitif ekibi · X = Yapılan Normal Mesai, Y = FM/Y';

    return (
        <div className={isExpanded
            ? 'fixed inset-0 z-50 bg-white p-4 overflow-auto'
            : ''}>
        <SectionCard
            title="Risk Haritası"
            icon={LayoutGrid}
            iconGradient="from-purple-500 to-pink-600"
            subtitle={subtitle}
            collapsible={false}
            headerExtra={
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            try {
                                const params = new URLSearchParams(queryParams || {});
                                const res = await api.get(
                                    `/attendance-analytics/debug-calculations/?${params.toString()}`,
                                    { responseType: 'blob', timeout: 60000 },
                                );
                                const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                                a.download = `debug-mesai-${ts}.txt`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                window.URL.revokeObjectURL(url);
                            } catch (err) {
                                alert('Debug raporu indirilemedi: ' + (err?.message || 'Bilinmeyen hata'));
                            }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all"
                        title="Hesaplama adımlarını içeren TXT raporu indir"
                    >
                        <Bug size={11} /> Debug TXT <Download size={10} />
                    </button>
                    <Segmented
                        size="small"
                        value={displayMode}
                        onChange={setDisplayMode}
                        options={DISPLAY_MODES.map((d) => ({
                            value: d.value,
                            label: (
                                <span className="flex items-center gap-1 px-1">
                                    <d.icon size={11} />
                                    <span className="text-[10px] font-bold">{d.label}</span>
                                </span>
                            ),
                        }))}
                    />
                    <button
                        onClick={() => setIsExpanded(true)}
                        title="Tam ekran (ESC ile kapat)"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all"
                    >
                        <Maximize2 size={11} /> Tam Ekran
                    </button>
                </div>
            }
        >
            {/* View mode segmented + subtree picker */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Segmented
                    size="middle"
                    value={viewMode}
                    onChange={(v) => { setViewMode(v); setHoveredQuad(null); }}
                    options={VIEW_MODES.map((m) => ({
                        value: m.value,
                        label: (
                            <span className="flex items-center gap-1.5 px-1">
                                <m.icon size={12} />
                                <span className="text-[11px] font-bold">{m.label}</span>
                            </span>
                        ),
                    }))}
                />
                {viewMode === 'subtree' && allManagers.length > 0 && (
                    <select
                        value={pickedManagerId || ''}
                        onChange={(e) => setPickedManagerId(parseInt(e.target.value, 10) || null)}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-50 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                        {allManagers.map((m) => (
                            <option key={m.employee_id} value={m.employee_id}>
                                {'  '.repeat(m.depth || 0)}
                                {m.depth > 0 ? '↳ ' : ''}
                                {m.name} · {m.total_managed} kişi
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Yükleniyor…</div>
            ) : points.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                    {viewMode === 'subtree' ? 'Bu yöneticinin altında kişi yok' : 'Veri yok'}
                </div>
            ) : (
                <>
                    {/* Quadrant ozet rozetleri (clickable for drill-down) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {Object.entries(QUADRANT_META).map(([k, m]) => (
                            <div
                                key={k}
                                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${m.bg} ${
                                    hoveredQuad === k ? 'border-slate-700 shadow-md' : 'border-transparent'
                                }`}
                                onMouseEnter={() => setHoveredQuad(k)}
                                onMouseLeave={() => setHoveredQuad(null)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                                    <span className="text-[12px] font-bold text-slate-700">{m.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[16px] font-black tabular-nums" style={{ color: m.color }}>
                                        {quadCounts[k] || 0}
                                    </span>
                                    {(quadCounts[k] || 0) > 0 && (
                                        <button
                                            onClick={() => handleQuadrantDrill(k)}
                                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline"
                                        >
                                            Liste
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {displayMode === 'heatmap' ? (
                        <HeatmapGridView
                            points={points}
                            onCellClick={(cell) => {
                                const ids = cell.employees.filter((p) => p.type === 'employee').map((p) => p.id);
                                setDrillData({
                                    group_name: `${QUADRANT_META[cell.quadrant].label} hücresi (${cell.employees.length} kişi)`,
                                    metrics: {
                                        avg_normal_completion_pct: Math.round(cell.avgNormal),
                                        total_ot_hours: cell.employees.reduce((s, p) => s + p.ot_h, 0),
                                        total_missing_hours: cell.employees.reduce((s, p) => s + p.missing_h, 0),
                                    },
                                    employee_ids: ids,
                                });
                            }}
                        />
                    ) : (
                        <div className={isExpanded
                            ? 'grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3'
                            : 'grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3'}>
                        <div className={isExpanded ? 'h-[calc(100vh-280px)] min-h-[600px]' : 'h-[480px]'}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 25, right: 35, bottom: 45, left: 35 }}>
                                    {/* 4 quadrant arka plan — Sag-ust = Lider (yesil) */}
                                    {/* Sol-alt: Yetersiz (kirmizi) */}
                                    <ReferenceArea x1={0} x2={HIGH_NORMAL_THRESHOLD} y1={0} y2={HIGH_OT_THRESHOLD} fill="#ef4444" fillOpacity={0.08} />
                                    {/* Sol-ust: Tutarsiz (sari) */}
                                    <ReferenceArea x1={0} x2={HIGH_NORMAL_THRESHOLD} y1={HIGH_OT_THRESHOLD} y2={yMax} fill="#f59e0b" fillOpacity={0.08} />
                                    {/* Sag-alt: Saglikli (mavi) */}
                                    <ReferenceArea x1={HIGH_NORMAL_THRESHOLD} x2={100} y1={0} y2={HIGH_OT_THRESHOLD} fill="#3b82f6" fillOpacity={0.08} />
                                    {/* Sag-ust: Lider (yesil) */}
                                    <ReferenceArea x1={HIGH_NORMAL_THRESHOLD} x2={100} y1={HIGH_OT_THRESHOLD} y2={yMax} fill="#10b981" fillOpacity={0.12} />

                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        type="number" dataKey="x" name="Yap. Mesai"
                                        domain={[0, 100]}
                                        tick={{ fontSize: 11, fontWeight: 600 }}
                                        label={{ value: 'Yapılan Normal Mesai — Gerçekleşen Normal / Yükümlülük (%)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fontWeight: 700, fill: '#475569' } }}
                                    />
                                    <YAxis
                                        type="number" dataKey="y" name="FM/Y"
                                        domain={[0, yMax]}
                                        tick={{ fontSize: 11, fontWeight: 600 }}
                                        label={{ value: 'Fazla Mesai / Yükümlülük (%)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fontWeight: 700, fill: '#475569' } }}
                                    />
                                    <ZAxis type="number" dataKey="z" range={[40, 250]} />
                                    <ReferenceLine x={HIGH_NORMAL_THRESHOLD} stroke="#475569" strokeDasharray="4 3" strokeWidth={1.5} />
                                    <ReferenceLine y={HIGH_OT_THRESHOLD} stroke="#475569" strokeDasharray="4 3" strokeWidth={1.5} />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload || !payload[0]) return null;
                                            const p = payload[0].payload;
                                            const q = QUADRANT_META[p.quadrant];
                                            return (
                                                <div className="rounded-lg bg-white shadow-xl border border-slate-200 px-3 py-2 text-xs">
                                                    <div className="font-bold text-slate-800 mb-1">
                                                        {p.name}
                                                        {p.employee_count != null && <span className="text-[10px] text-slate-500 ml-1">({p.employee_count} kişi)</span>}
                                                    </div>
                                                    {p.type === 'employee' && (
                                                        <div className="text-[10px] text-slate-500 mb-2">{p.department}</div>
                                                    )}
                                                    <div className="space-y-0.5 tabular-nums">
                                                        <div>Normal: <b>{fmtHrs(p.normal_h)}</b></div>
                                                        <div>FM: <b className="text-amber-600">{fmtHrs(p.ot_h)}</b></div>
                                                        <div>Eksik: <b className="text-red-600">{fmtHrs(p.missing_h)}</b></div>
                                                        <div>{p.type === 'department' ? 'Avg ' : ''}Yap. Mesai: <b style={{ color: levelColor(p.normal_completion) }}>%{Math.round(p.normal_completion)}</b></div>
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: q.color }}>
                                                            {q.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Scatter
                                        name={viewMode === 'department' ? 'Departman' : 'Çalışan'}
                                        data={filteredPoints}
                                        onClick={(d) => d && handlePointClick(d)}
                                        cursor="pointer"
                                    >
                                        {filteredPoints.map((p, idx) => (
                                            <Cell
                                                key={idx}
                                                fill={levelColor(p.normal_completion)}
                                                fillOpacity={hoveredEmpId === p.id ? 1 : (hoveredEmpId ? 0.35 : 0.85)}
                                                stroke={hoveredEmpId === p.id ? '#1e293b' : '#fff'}
                                                strokeWidth={hoveredEmpId === p.id ? 2.5 : 1}
                                            />
                                        ))}
                                        {/* Leader-line etiketler — nokta yaninda ok ile */}
                                        <LabelList
                                            dataKey="label"
                                            content={({ x, y, width, height, value, index }) => {
                                                const p = filteredPoints[index];
                                                if (!p) return null;
                                                // Departman modu: hepsini göster · diğer mod: pruned set
                                                const showLabel = viewMode === 'department' || labeledPointIds.has(p.id);
                                                if (!showLabel) return null;

                                                // Recharts Scatter LabelList'inde (x, y) balonun sol-ust kosesi
                                                // (cx - radius, cy - radius). Merkez = x + width/2, y + height/2.
                                                const cx = x + (width || 0) / 2;
                                                const cy = y + (height || 0) / 2;
                                                const radius = (width || 0) / 2;

                                                // Departman modunda klasik (uzerinde) etiket — kisa adlar
                                                if (viewMode === 'department') {
                                                    return (
                                                        <text
                                                            x={cx} y={cy - radius - 6}
                                                            fontSize={11} fontWeight={700}
                                                            fill="#1e293b" textAnchor="middle"
                                                            style={{ pointerEvents: 'none' }}
                                                        >
                                                            {value?.length > 14 ? `${value.slice(0, 12)}…` : value}
                                                        </text>
                                                    );
                                                }

                                                // Bireysel/subtree: KOMPAKT etiket — ilk ad, kucuk font
                                                const labelIdx = labeledIdsArray.indexOf(p.id);
                                                const offset = LABEL_OFFSETS[labelIdx % LABEL_OFFSETS.length] || LABEL_OFFSETS[0];
                                                // Offset balon yariciapina ek olarak uygulanir — etiket balonun dis kenarindan basla
                                                const lx = cx + offset.dx;
                                                const ly = cy + offset.dy;
                                                const display = value?.length > 8 ? `${value.slice(0, 7)}…` : value;
                                                const fillBg = levelColor(p.normal_completion);
                                                const isHovered = hoveredEmpId === p.id;
                                                // Hover durumunda buyuk + on plan, diger durumda kompakt
                                                const fontSize = isHovered ? 11 : 8;
                                                const padX = isHovered ? 4 : 2;
                                                const charW = isHovered ? 6.2 : 4.8;
                                                const w = (display?.length || 0) * charW + padX * 2;
                                                const h = isHovered ? 14 : 11;
                                                const rectX = offset.anchor === 'start' ? lx - padX
                                                    : offset.anchor === 'end' ? lx - w + padX
                                                    : lx - w / 2;
                                                // Diger noktalar hover ediliyorsa bu etiketi sönukleştir
                                                const opacity = !hoveredEmpId ? 0.92 : (isHovered ? 1 : 0.18);
                                                return (
                                                    <g style={{ pointerEvents: 'none', opacity }}>
                                                        {/* Leader line balon MERKEZINDEN -> etiket */}
                                                        <line
                                                            x1={cx} y1={cy}
                                                            x2={lx} y2={ly}
                                                            stroke={fillBg}
                                                            strokeWidth={isHovered ? 1.5 : 0.6}
                                                            strokeDasharray={isHovered ? '0' : '2 2'}
                                                            opacity={0.6}
                                                        />
                                                        {/* Beyaz arka plan rect */}
                                                        <rect
                                                            x={rectX}
                                                            y={ly - h / 2 - 1}
                                                            width={w}
                                                            height={h}
                                                            rx={2.5}
                                                            fill="white"
                                                            stroke={fillBg}
                                                            strokeWidth={isHovered ? 1.2 : 0.6}
                                                            opacity={0.93}
                                                        />
                                                        {/* Etiket metni */}
                                                        <text
                                                            x={lx}
                                                            y={ly + (isHovered ? 3 : 2.5)}
                                                            fontSize={fontSize}
                                                            fontWeight={isHovered ? 800 : 600}
                                                            fill="#1e293b"
                                                            textAnchor={offset.anchor}
                                                        >
                                                            {display}
                                                        </text>
                                                    </g>
                                                );
                                            }}
                                        />
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Yan dikey liste — tum kisiler her zaman gorunur */}
                        <div className={`hidden lg:flex flex-col bg-slate-50/60 rounded-lg border border-slate-200 ${isExpanded ? 'max-h-[calc(100vh-280px)]' : 'max-h-[480px]'}`}>
                            <div className="px-3 py-2 border-b border-slate-200 bg-white rounded-t-lg flex items-center justify-between flex-shrink-0">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.15em]">
                                    Tüm Kişiler
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                    {filteredPoints.length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                                {[...filteredPoints]
                                    .sort((a, b) => {
                                        // Yapilan Normal Mesai DESC (en yuksek tamamlama uste)
                                        return (b.normal_completion || 0) - (a.normal_completion || 0);
                                    })
                                    .map((p) => {
                                        const isHovered = hoveredEmpId === p.id;
                                        const color = levelColor(p.normal_completion);
                                        const q = QUADRANT_META[p.quadrant];
                                        const tooltipContent = (
                                            <div className="text-xs space-y-1.5 min-w-[180px]">
                                                <div className="font-bold text-white border-b border-white/20 pb-1.5">
                                                    {p.name}
                                                    {p.type === 'employee' && (
                                                        <div className="text-[10px] text-white/60 font-normal">{p.department || '—'}</div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
                                                    <span className="text-white/60">Normal:</span>
                                                    <span className="text-right font-bold">{fmtHrs(p.normal_h)}</span>
                                                    <span className="text-white/60">Fazla Mesai:</span>
                                                    <span className="text-right font-bold text-amber-300">{fmtHrs(p.ot_h)}</span>
                                                    <span className="text-white/60">Eksik:</span>
                                                    <span className="text-right font-bold text-red-300">{fmtHrs(p.missing_h)}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums border-t border-white/20 pt-1.5">
                                                    <span className="text-white/60">Yap. Mesai:</span>
                                                    <span className="text-right font-black" style={{ color }}>%{Math.round(p.normal_completion)}</span>
                                                    <span className="text-white/60">FM/Y:</span>
                                                    <span className="text-right font-bold">%{Math.round(p.y_raw || 0)}</span>
                                                    {p.type === 'department' && p.employee_count != null && (
                                                        <>
                                                            <span className="text-white/60">Kişi:</span>
                                                            <span className="text-right font-bold">{p.employee_count}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="pt-1.5 border-t border-white/20 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: q.color }} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: q.color }}>
                                                        {q.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                        return (
                                            <AntTooltip
                                                key={p.id}
                                                title={tooltipContent}
                                                placement="left"
                                                mouseEnterDelay={0.05}
                                                mouseLeaveDelay={0}
                                                overlayInnerStyle={{ background: '#1e293b', padding: '10px 12px' }}
                                            >
                                                <button
                                                    onMouseEnter={() => setHoveredEmpId(p.id)}
                                                    onMouseLeave={() => setHoveredEmpId(null)}
                                                    onClick={() => p.type === 'employee' && onSelectPerson?.(p.id)}
                                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-all ${
                                                        isHovered
                                                            ? 'bg-white shadow-sm ring-1 ring-indigo-300'
                                                            : 'hover:bg-white'
                                                    }`}
                                                >
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-bold text-slate-800 truncate leading-tight">
                                                            {p.name}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 truncate leading-tight">
                                                            {p.department || '—'}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="text-[10px] font-black tabular-nums flex-shrink-0"
                                                        style={{ color }}
                                                    >
                                                        %{Math.round(p.normal_completion)}
                                                    </span>
                                                </button>
                                            </AntTooltip>
                                        );
                                    })}
                            </div>
                        </div>
                        </div>
                    )}

                    <p className="text-[10px] text-slate-400 text-center mt-3">
                        Liste/nokta hover senkronize · Listeye tıkla → kişi detayı · Bölge rozeti "Liste" → drill-down
                    </p>
                </>
            )}

            <DrillDownGroupModal
                open={!!drillData}
                group={drillData}
                employeeIndex={Object.fromEntries(employees.map((e) => [e.employee_id, e]))}
                onClose={() => setDrillData(null)}
                onSelectPerson={(id) => { setDrillData(null); onSelectPerson?.(id); }}
            />
        </SectionCard>
        {isExpanded && (
            <button
                onClick={() => setIsExpanded(false)}
                title="Tam ekrandan çık (ESC)"
                className="fixed top-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-2xl transition-all"
            >
                <Minimize2 size={16} /> Kapat (ESC)
            </button>
        )}
        </div>
    );
}
