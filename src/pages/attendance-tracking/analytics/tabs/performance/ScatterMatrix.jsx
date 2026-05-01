import React, { useMemo, useState } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
} from 'recharts';
import SectionCard from '../../shared/SectionCard';
import { LayoutGrid } from 'lucide-react';
import { quadrantOf, QUADRANT_META, levelColor, fmtHrs } from './helpers';

/**
 * 4-quadrant scatter: Eksik/Y (X) vs FM/Y (Y).
 * Nokta boyutu = Normal saat, renk = N.Doluluk.
 * Tikla -> onSelectPerson(employee_id).
 */
export default function ScatterMatrix({ employees, onSelectPerson }) {
    const [hoveredQuad, setHoveredQuad] = useState(null);

    const points = useMemo(() => {
        return employees
            .filter((e) => e.has_target ?? (e.target_hours > 0))
            .map((e) => {
                const x = Math.min(100, e.missing_to_target_pct || 0);
                const y = e.ot_to_target_pct || 0;
                const quad = quadrantOf(x, y);
                return {
                    employee_id: e.employee_id,
                    name: e.name,
                    department: e.department || '—',
                    x, y,
                    z: Math.max(20, Math.min(400, (e.normal_hours || 1) * 4)),
                    normal_h: e.normal_hours || 0,
                    ot_h: e.ot_hours || 0,
                    missing_h: e.missing_hours || 0,
                    normal_completion: e.normal_completion_pct ?? e.efficiency_pct ?? 0,
                    quadrant: quad,
                };
            });
    }, [employees]);

    // Y axis max — 4 quadrant arka plan icin makul tutalim
    const yMax = useMemo(() => {
        const maxY = Math.max(50, ...points.map((p) => p.y || 0));
        return Math.ceil(maxY / 10) * 10 + 10;
    }, [points]);

    const HIGH_MISSING = 15;
    const HIGH_OT = 25;

    const quadCounts = useMemo(() => {
        const c = { healthy: 0, intense: 0, underfill: 0, risk: 0 };
        points.forEach((p) => { c[p.quadrant] = (c[p.quadrant] || 0) + 1; });
        return c;
    }, [points]);

    const filteredPoints = useMemo(() => {
        if (!hoveredQuad) return points;
        return points.filter((p) => p.quadrant === hoveredQuad);
    }, [points, hoveredQuad]);

    return (
        <SectionCard
            title="Risk Haritasi (Eksik × Fazla Mesai)"
            icon={LayoutGrid}
            iconGradient="from-purple-500 to-pink-600"
            subtitle="Her nokta bir kişi · Boyut = Normal saat · Renk = N.Doluluk"
            collapsible={false}
        >
            {points.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">Veri yok</div>
            ) : (
                <>
                    {/* Quadrant ozet rozetleri */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {Object.entries(QUADRANT_META).map(([k, m]) => (
                            <button
                                key={k}
                                onMouseEnter={() => setHoveredQuad(k)}
                                onMouseLeave={() => setHoveredQuad(null)}
                                onClick={() => setHoveredQuad((c) => (c === k ? null : k))}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 transition-all ${m.bg} ${
                                    hoveredQuad === k ? 'border-slate-700 shadow-md' : 'border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                                    <span className="text-[11px] font-bold text-slate-700">{m.label}</span>
                                </div>
                                <span className="text-[14px] font-black tabular-nums" style={{ color: m.color }}>
                                    {quadCounts[k] || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 35, left: 30 }}>
                                {/* Quadrant arka plan alanlari */}
                                <ReferenceArea x1={0} x2={HIGH_MISSING} y1={0} y2={HIGH_OT} fill="#10b981" fillOpacity={0.06} />
                                <ReferenceArea x1={HIGH_MISSING} x2={100} y1={0} y2={HIGH_OT} fill="#f97316" fillOpacity={0.06} />
                                <ReferenceArea x1={0} x2={HIGH_MISSING} y1={HIGH_OT} y2={yMax} fill="#f59e0b" fillOpacity={0.06} />
                                <ReferenceArea x1={HIGH_MISSING} x2={100} y1={HIGH_OT} y2={yMax} fill="#ef4444" fillOpacity={0.06} />

                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    type="number" dataKey="x" name="Eksik/Y"
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10 }}
                                    label={{ value: 'Eksik / Yükümlülük (%)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fontWeight: 700, fill: '#475569' } }}
                                />
                                <YAxis
                                    type="number" dataKey="y" name="FM/Y"
                                    domain={[0, yMax]}
                                    tick={{ fontSize: 10 }}
                                    label={{ value: 'Fazla Mesai / Yükümlülük (%)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fontWeight: 700, fill: '#475569' } }}
                                />
                                <ZAxis type="number" dataKey="z" range={[20, 400]} />
                                <ReferenceLine x={HIGH_MISSING} stroke="#94a3b8" strokeDasharray="3 3" />
                                <ReferenceLine y={HIGH_OT} stroke="#94a3b8" strokeDasharray="3 3" />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload || !payload[0]) return null;
                                        const p = payload[0].payload;
                                        const q = QUADRANT_META[p.quadrant];
                                        return (
                                            <div className="rounded-lg bg-white shadow-xl border border-slate-200 px-3 py-2 text-xs">
                                                <div className="font-bold text-slate-800 mb-1">{p.name}</div>
                                                <div className="text-[10px] text-slate-500 mb-2">{p.department}</div>
                                                <div className="space-y-0.5 tabular-nums">
                                                    <div>Normal: <b>{fmtHrs(p.normal_h)}</b></div>
                                                    <div>FM: <b className="text-amber-600">{fmtHrs(p.ot_h)}</b></div>
                                                    <div>Eksik: <b className="text-red-600">{fmtHrs(p.missing_h)}</b></div>
                                                    <div>N.Doluluk: <b style={{ color: levelColor(p.normal_completion) }}>{Math.round(p.normal_completion)}%</b></div>
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
                                    name="Çalışan"
                                    data={filteredPoints}
                                    onClick={(d) => d?.employee_id && onSelectPerson?.(d.employee_id)}
                                    cursor="pointer"
                                >
                                    {filteredPoints.map((p, idx) => (
                                        <Cell key={idx} fill={levelColor(p.normal_completion)} fillOpacity={0.75} stroke="#fff" strokeWidth={1.5} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                        Çubuğa hover et — quadrant filtresi geçici. Tıkla — sabitle. Nokta tıkla — kişi detayı.
                    </p>
                </>
            )}
        </SectionCard>
    );
}
