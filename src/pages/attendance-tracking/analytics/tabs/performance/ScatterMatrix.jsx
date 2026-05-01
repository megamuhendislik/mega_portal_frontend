import React, { useMemo, useState, useEffect } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, LabelList,
} from 'recharts';
import { Segmented } from 'antd';
import { LayoutGrid, User, Building2, Users2, Grid3x3, ScatterChart as ScatterIcon, Bug, Download } from 'lucide-react';
import SectionCard from '../../shared/SectionCard';
import api from '../../../../../services/api';
import { useAnalytics } from '../../AnalyticsContext';
import {
    quadrantOf, QUADRANT_META, levelColor, fmtHrs,
    addJitter, pruneLabelCollisions,
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

// X ekseni = N.Doluluk (Normal/Yukumluluk %), Y = FM/Y (%)
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
    const [drillData, setDrillData] = useState(null);

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
                    // X = N.Doluluk (Normal/Yukumluluk %), Y = FM/Yukumluluk (%)
                    const x_raw = Math.min(100, e.normal_completion_pct ?? e.efficiency_pct ?? 0);
                    const y_raw = e.ot_to_target_pct || 0;
                    // Jitter — yiginlanmayi onler
                    const j = addJitter(x_raw, y_raw, e.employee_id, 1.5);
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
                    // X = N.Doluluk, Y = FM/Y
                    const x_raw = Math.min(100, e.normal_completion_pct ?? e.efficiency_pct ?? 0);
                    const y_raw = e.ot_to_target_pct || 0;
                    const j = addJitter(x_raw, y_raw, e.employee_id, 1.5);
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

    // En uc 8 aday + cakisma onleme -> max 6 etiket
    const labeledPointIds = useMemo(() => {
        const sorted = [...points].sort((a, b) => {
            const aScore = Math.abs(50 - (a.normal_completion || 0)) + (a.missing_h || 0) + (a.ot_h || 0);
            const bScore = Math.abs(50 - (b.normal_completion || 0)) + (b.missing_h || 0) + (b.ot_h || 0);
            return bScore - aScore;
        });
        const candidates = new Set(sorted.slice(0, 10).map((p) => p.id));
        // X dünyası 100, Y dünyası yMax - oransal min mesafe hesapla
        const minX = 8;  // x domain 0-100, %8 min mesafe
        const minY = Math.max(2, yMax * 0.08); // y domain 0-yMax, %8 min mesafe
        return pruneLabelCollisions(points, candidates, minX, minY);
    }, [points, yMax]);

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
        ? 'X = Normal/Yükümlülük, Y = FM/Yükümlülük · Boyut = Normal saat · Renk = N.Doluluk · Sağ-üst = ideal tempo'
        : viewMode === 'department'
            ? 'Departman ortalaması · X = avg N.Doluluk, Y = avg FM/Y · Boyut = kişi sayısı'
            : 'Seçilen yöneticinin transitif ekibi · X = Normal Doluluk, Y = FM/Y';

    return (
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
                        <div className="h-[480px]">
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
                                        type="number" dataKey="x" name="N.Doluluk"
                                        domain={[0, 100]}
                                        tick={{ fontSize: 11, fontWeight: 600 }}
                                        label={{ value: 'Normal Doluluk — Gerçekleşen Normal / Yükümlülük (%)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fontWeight: 700, fill: '#475569' } }}
                                    />
                                    <YAxis
                                        type="number" dataKey="y" name="FM/Y"
                                        domain={[0, yMax]}
                                        tick={{ fontSize: 11, fontWeight: 600 }}
                                        label={{ value: 'Fazla Mesai / Yükümlülük (%)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fontWeight: 700, fill: '#475569' } }}
                                    />
                                    <ZAxis type="number" dataKey="z" range={[50, 1500]} />
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
                                                        <div>{p.type === 'department' ? 'Avg ' : ''}N.Doluluk: <b style={{ color: levelColor(p.normal_completion) }}>%{Math.round(p.normal_completion)}</b></div>
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
                                                fillOpacity={0.78}
                                                stroke="#fff"
                                                strokeWidth={2}
                                            />
                                        ))}
                                        <LabelList
                                            dataKey="label"
                                            position="top"
                                            offset={8}
                                            content={({ x, y, value, index }) => {
                                                const p = filteredPoints[index];
                                                if (!p) return null;
                                                // Departman modu: hep göster · diğer mod: sadece labeled set
                                                const showLabel = viewMode === 'department' || labeledPointIds.has(p.id);
                                                if (!showLabel) return null;
                                                return (
                                                    <text
                                                        x={x} y={y - 6}
                                                        fontSize={viewMode === 'department' ? 11 : 10}
                                                        fontWeight={700}
                                                        fill="#1e293b"
                                                        textAnchor="middle"
                                                        style={{ pointerEvents: 'none' }}
                                                    >
                                                        {value?.length > 14 ? `${value.slice(0, 12)}…` : value}
                                                    </text>
                                                );
                                            }}
                                        />
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <p className="text-[10px] text-slate-400 text-center mt-3">
                        Bölge rozetinde "Liste" butonu → o bölgenin kişi tablosu · Nokta tıkla → detay
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
    );
}
