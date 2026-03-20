import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Building2, ChevronDown, ChevronUp,
    Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import CollapsibleSection from '../../attendance-tracking/analytics/shared/CollapsibleSection';
import { useRequestFilter } from '../RequestFilterContext';
import api from '../../../services/api';

/* ========================================
   CONSTANTS
   ======================================== */
const TYPE_COLORS = {
    leave: '#3B82F6',
    overtime: '#F59E0B',
    meal: '#10B981',
    cardless: '#8B5CF6',
    health: '#EF4444',
};

/* ========================================
   SORT HOOK
   ======================================== */
function useSortable(defaultCol, defaultDir = 'desc') {
    const [sortCol, setSortCol] = useState(defaultCol);
    const [sortDir, setSortDir] = useState(defaultDir);

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortCol(col);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <ChevronDown size={12} className="text-slate-300" />;
        return sortDir === 'desc'
            ? <ChevronDown size={12} className="text-indigo-600" />
            : <ChevronUp size={12} className="text-indigo-600" />;
    };

    return { sortCol, sortDir, handleSort, SortIcon };
}

/* ========================================
   TOOLTIP
   ======================================== */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ========================================
   MAIN COMPONENT
   ======================================== */
export default function DepartmentEmployeeBreakdown() {
    const { queryParams } = useRequestFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/dept-employee/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('DepartmentEmployeeBreakdown fetch error:', err);
            setError('Departman/calisan verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Department bar data
    const deptBarData = useMemo(() => {
        if (!data?.department_breakdown?.length) return [];
        return data.department_breakdown.map(d => ({
            name: d.name,
            Izin: d.leave ?? 0,
            'Ek Mesai': d.overtime ?? 0,
            Yemek: d.meal ?? 0,
            Kartsiz: d.cardless ?? 0,
            Saglik: d.health ?? 0,
        }));
    }, [data?.department_breakdown]);

    // Employee table sorting
    const { sortCol, sortDir, handleSort, SortIcon } = useSortable('total');
    const sortedEmployees = useMemo(() => {
        if (!data?.employee_breakdown?.length) return [];
        const s = [...data.employee_breakdown];
        s.sort((a, b) => {
            const aVal = a[sortCol] ?? 0;
            const bVal = b[sortCol] ?? 0;
            if (typeof aVal === 'string') return sortDir === 'desc' ? bVal.localeCompare(aVal, 'tr') : aVal.localeCompare(bVal, 'tr');
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
        return s;
    }, [data?.employee_breakdown, sortCol, sortDir]);

    const employeeColumns = [
        { key: 'rank', label: '#', sortable: false },
        { key: 'name', label: 'Calisan', sortable: true },
        { key: 'department', label: 'Departman', sortable: true },
        { key: 'total', label: 'Toplam', sortable: true },
        { key: 'approval_rate', label: 'Onay %', sortable: true },
        { key: 'leave_count', label: 'Izin', sortable: true },
        { key: 'ot_count', label: 'OT', sortable: true },
    ];

    return (
        <CollapsibleSection
            title="Departman & Calisan Kirilimi"
            subtitle="Organizasyon bazli talep analizi"
            icon={Building2}
            iconGradient="from-teal-500 to-emerald-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-teal-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Departman verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* Department Stacked BarChart */}
                    {deptBarData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Departman Bazli Talepler</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={Math.max(250, deptBarData.length * 45)} minWidth={400}>
                                    <BarChart data={deptBarData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={90} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                        <Bar dataKey="Izin" stackId="a" fill={TYPE_COLORS.leave} maxBarSize={22} />
                                        <Bar dataKey="Ek Mesai" stackId="a" fill={TYPE_COLORS.overtime} maxBarSize={22} />
                                        <Bar dataKey="Yemek" stackId="a" fill={TYPE_COLORS.meal} maxBarSize={22} />
                                        <Bar dataKey="Kartsiz" stackId="a" fill={TYPE_COLORS.cardless} maxBarSize={22} />
                                        <Bar dataKey="Saglik" stackId="a" fill={TYPE_COLORS.health} radius={[0, 4, 4, 0]} maxBarSize={22} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Employee Ranking Table */}
                    {sortedEmployees.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calisan Talep Siralamasi</h4>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            {employeeColumns.map(col => (
                                                <th
                                                    key={col.key}
                                                    className={`px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
                                                    onClick={() => col.sortable && handleSort(col.key)}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {col.label}
                                                        {col.sortable && <SortIcon col={col.key} />}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedEmployees.map((row, idx) => (
                                            <tr key={row.employee_id || idx} className="border-b border-slate-100 last:border-0 hover:bg-white/60 transition-colors">
                                                <td className="px-3 py-2.5">
                                                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                                                        idx < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 font-semibold text-slate-700">{row.name}</td>
                                                <td className="px-3 py-2.5 text-slate-500 text-[10px]">{row.department}</td>
                                                <td className="px-3 py-2.5 font-bold text-slate-700">{row.total}</td>
                                                <td className="px-3 py-2.5 text-emerald-600 font-semibold">%{row.approval_rate}</td>
                                                <td className="px-3 py-2.5 text-blue-600 font-semibold">{row.leave_count}</td>
                                                <td className="px-3 py-2.5 text-amber-600 font-semibold">{row.ot_count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2">
                                {sortedEmployees.slice(0, 15).map((row, idx) => (
                                    <div key={row.employee_id || idx} className="bg-white rounded-xl p-3 border border-slate-100">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                    idx < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{row.name}</p>
                                                    <p className="text-[10px] text-slate-400">{row.department}</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-slate-800">{row.total}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                                            <div>
                                                <span className="text-slate-400 block">Onay</span>
                                                <span className="font-bold text-emerald-600">%{row.approval_rate}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Izin</span>
                                                <span className="font-bold text-blue-600">{row.leave_count}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">OT</span>
                                                <span className="font-bold text-amber-600">{row.ot_count}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!deptBarData.length && !sortedEmployees.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Building2 size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Departman/calisan verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
