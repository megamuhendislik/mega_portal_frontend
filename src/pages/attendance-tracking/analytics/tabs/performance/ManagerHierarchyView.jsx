import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Users2, Crown } from 'lucide-react';
import SectionCard from '../../shared/SectionCard';
import { Empty } from 'antd';
import { levelColor, intensityColor, gradientFor, initials } from './helpers';

function MetricChip({ label, value, color, suffix = '%' }) {
    if (value == null) {
        return (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-400">
                {label} —
            </span>
        );
    }
    return (
        <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ backgroundColor: `${color}22`, color }}
        >
            {label} {Math.round(value)}{suffix}
        </span>
    );
}

function HierarchyNode({ node, depth = 0, onSelectGroup, expandAll }) {
    const [open, setOpen] = useState(depth < 1 || !!expandAll);
    const m = node.metrics || {};
    const hasChildren = node.children && node.children.length > 0;

    React.useEffect(() => {
        if (expandAll != null) setOpen(!!expandAll);
    }, [expandAll]);

    return (
        <div className={`${depth > 0 ? 'border-l-2 border-slate-200 pl-3 ml-2' : ''}`}>
            <div
                className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                onClick={() => hasChildren && setOpen((v) => !v)}
            >
                <button
                    className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-indigo-600"
                    onClick={(e) => { e.stopPropagation(); hasChildren && setOpen((v) => !v); }}
                >
                    {hasChildren ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3" />}
                </button>
                <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(node.employee_id)} text-white shadow-sm flex-shrink-0`}>
                    <span className="text-[9px] font-black">{initials(node.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-[12px] truncate">{node.name}</span>
                        {depth === 0 && <Crown size={11} className="text-amber-500" />}
                        <span className="text-[10px] text-slate-400">· {node.department || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="text-[9px] font-bold text-slate-500">
                            <Users2 size={9} className="inline mr-0.5" /> {node.total_managed} kişi
                            {node.indirect_count > 0 && (
                                <span className="text-slate-400"> ({node.direct_count} direkt + {node.indirect_count} dolaylı)</span>
                            )}
                        </span>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                    <MetricChip label="Yap.M." value={m.avg_normal_completion_pct} color={levelColor(m.avg_normal_completion_pct)} />
                    <MetricChip label="T.Mesai" value={m.avg_total_completion_pct} color={m.avg_total_completion_pct >= 100 ? '#7c3aed' : levelColor(m.avg_total_completion_pct)} />
                    <MetricChip label="FM/Y" value={m.avg_ot_to_target_pct} color={intensityColor(m.avg_ot_to_target_pct)} />
                    <MetricChip label="Ek/Y" value={m.avg_missing_to_target_pct} color={intensityColor(m.avg_missing_to_target_pct)} />
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onSelectGroup?.(node); }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-100 flex-shrink-0"
                >
                    Ekibi Gör
                </button>
            </div>
            {hasChildren && open && (
                <div className="space-y-0.5">
                    {node.children.map((child) => (
                        <HierarchyNode
                            key={child.employee_id}
                            node={child}
                            depth={depth + 1}
                            onSelectGroup={onSelectGroup}
                            expandAll={expandAll}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Yonetici PRIMARY agaci + transitif metrikler.
 * Her node'da o yoneticinin transitif ekibinin ortalama metrigi.
 */
export default function ManagerHierarchyView({ tree, onSelectGroup, loading }) {
    const [expandAll, setExpandAll] = useState(null);

    if (loading) {
        return (
            <SectionCard title="Yönetici Hiyerarşisi" icon={Users2} iconGradient="from-blue-500 to-indigo-600" collapsible={false}>
                <div className="py-8 text-center text-slate-400">Yükleniyor…</div>
            </SectionCard>
        );
    }

    if (!tree || tree.length === 0) {
        return (
            <SectionCard title="Yönetici Hiyerarşisi" icon={Users2} iconGradient="from-blue-500 to-indigo-600" collapsible={false}>
                <Empty description="Yönetici ağacı boş" />
            </SectionCard>
        );
    }

    return (
        <SectionCard
            title="Yönetici Hiyerarşisi"
            icon={Users2}
            iconGradient="from-blue-500 to-indigo-600"
            subtitle={`${tree.length} kök yönetici · Transitif ekip metrikleri`}
            collapsible={false}
            headerExtra={
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setExpandAll(true)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50"
                    >
                        Hepsini Aç
                    </button>
                    <button
                        onClick={() => setExpandAll(false)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100"
                    >
                        Hepsini Kapat
                    </button>
                </div>
            }
        >
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2">
                {tree.map((root) => (
                    <HierarchyNode
                        key={root.employee_id}
                        node={root}
                        onSelectGroup={onSelectGroup}
                        expandAll={expandAll}
                    />
                ))}
            </div>
        </SectionCard>
    );
}
