import React, { useState, useEffect, useMemo } from 'react';
import { Segmented } from 'antd';
import { Building2, Briefcase, Users2, UserCog } from 'lucide-react';
import api from '../../../../../services/api';
import { useAnalytics } from '../../AnalyticsContext';
import GroupedBarView from './GroupedBarView';
import ManagerHierarchyView from './ManagerHierarchyView';
import DrillDownGroupModal from './DrillDownGroupModal';

const GROUP_BY_OPTIONS = [
    { value: 'department', label: 'Departman', icon: Building2 },
    { value: 'manager', label: 'Yönetici Ağacı', icon: Users2 },
    { value: 'position', label: 'Pozisyon', icon: Briefcase },
    { value: 'custom', label: 'Custom Grup', icon: UserCog },
];

/**
 * Gruplama tab'i — 4 mod arasi geciste backend'den
 * grouped-metrics veya manager-hierarchy-metrics cekilir.
 */
export default function GroupingPanel({ employeeIndex, employees, onSelectPerson }) {
    const { queryParams } = useAnalytics();
    const [groupBy, setGroupBy] = useState('department');
    const [groups, setGroups] = useState([]);
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(false);
    const [drillGroup, setDrillGroup] = useState(null);
    const [customIds, setCustomIds] = useState([]);

    useEffect(() => {
        if (!queryParams?.start_date) return;
        const fetch = async () => {
            setLoading(true);
            try {
                if (groupBy === 'manager') {
                    const res = await api.get('/attendance-analytics/manager-hierarchy-metrics/', { params: queryParams, timeout: 30000 });
                    setTree(res.data?.tree || []);
                    setGroups([]);
                } else {
                    const params = { ...queryParams, group_by: groupBy };
                    if (groupBy === 'custom') {
                        if (customIds.length === 0) {
                            setGroups([]);
                            setLoading(false);
                            return;
                        }
                        params.employee_ids = customIds.join(',');
                    }
                    const res = await api.get('/attendance-analytics/grouped-metrics/', { params, timeout: 30000 });
                    setGroups(res.data?.groups || []);
                    setTree([]);
                }
            } catch {
                setGroups([]);
                setTree([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [groupBy, queryParams, customIds]);

    const groupById = useMemo(() => {
        const map = {};
        groups.forEach((g) => { map[g.group_id] = g; });
        return map;
    }, [groups]);

    const handleSelectGroup = (idOrNode) => {
        if (typeof idOrNode === 'object' && idOrNode !== null && 'metrics' in idOrNode) {
            // manager hierarchy node
            setDrillGroup({
                group_name: `${idOrNode.name} ekibi`,
                metrics: idOrNode.metrics,
                ...idOrNode.metrics,
                employee_ids: idOrNode.metrics?.employee_ids || [],
            });
        } else {
            const g = groupById[idOrNode];
            if (g) setDrillGroup(g);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.15em]">Gruplama</span>
                    <Segmented
                        size="middle"
                        value={groupBy}
                        onChange={setGroupBy}
                        options={GROUP_BY_OPTIONS.map((o) => ({
                            value: o.value,
                            label: (
                                <span className="flex items-center gap-1.5 px-1">
                                    <o.icon size={12} />
                                    <span className="text-[11px] font-bold">{o.label}</span>
                                </span>
                            ),
                        }))}
                    />
                    {groupBy === 'custom' && (
                        <CustomEmployeePicker employees={employees} value={customIds} onChange={setCustomIds} />
                    )}
                </div>
            </div>

            {groupBy === 'manager' ? (
                <ManagerHierarchyView
                    tree={tree}
                    onSelectGroup={handleSelectGroup}
                    loading={loading}
                />
            ) : (
                <GroupedBarView
                    groups={groups}
                    onSelectGroup={handleSelectGroup}
                    title={
                        groupBy === 'department' ? 'Departman Karşılaştırması' :
                            groupBy === 'position' ? 'Pozisyon Karşılaştırması' :
                                'Custom Grup'
                    }
                    icon={GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.icon || Building2}
                />
            )}

            <DrillDownGroupModal
                open={!!drillGroup}
                group={drillGroup}
                employeeIndex={employeeIndex}
                onClose={() => setDrillGroup(null)}
                onSelectPerson={(id) => { setDrillGroup(null); onSelectPerson?.(id); }}
            />
        </div>
    );
}

function CustomEmployeePicker({ employees, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const filtered = useMemo(() => {
        const q = search.toLocaleLowerCase('tr');
        return employees.filter((e) => !q || (e.name || '').toLocaleLowerCase('tr').includes(q));
    }, [employees, search]);

    const toggle = (id) => {
        if (value.includes(id)) onChange(value.filter((x) => x !== id));
        else onChange([...value, id]);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
            >
                {value.length === 0 ? 'Kişi seç…' : `${value.length} kişi seçili`}
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2">
                    <input
                        type="text"
                        placeholder="Ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2"
                    />
                    {filtered.map((e) => (
                        <button
                            key={e.employee_id}
                            onClick={() => toggle(e.employee_id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                                value.includes(e.employee_id) ? 'bg-indigo-100 font-bold' : 'hover:bg-slate-50'
                            }`}
                        >
                            <span className="truncate">{e.name}</span>
                            {value.includes(e.employee_id) && <span className="text-indigo-600">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
