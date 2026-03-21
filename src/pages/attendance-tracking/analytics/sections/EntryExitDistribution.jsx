import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    LogIn, LogOut, Clock, ChevronDown, ChevronUp,
    Loader2, AlertCircle, RefreshCw, User
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, Cell
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   SORT HOOK
   ═══════════════════════════════════════════════════ */
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
            ? <ChevronDown size={12} className="text-blue-600" />
            : <ChevronUp size={12} className="text-blue-600" />;
    };

    return { sortCol, sortDir, handleSort, SortIcon };
}

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════ */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   HISTOGRAM COMPONENT
   ═══════════════════════════════════════════════════ */
function HistogramChart({ data, color, title, stats, icon: Icon }) {
    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon size={14} className={color === '#3b82f6' ? 'text-blue-500' : 'text-amber-500'} />
                    <h4 className="text-xs font-bold text-slate-600">{title}</h4>
                </div>
                {stats && (
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        {stats.median && <span>Medyan: <span className="font-bold text-slate-600">{stats.median}</span></span>}
                        {stats.std_dev_minutes > 0 && <span>Std: <span className="font-bold text-slate-600">{stats.std_dev_minutes}dk</span></span>}
                    </div>
                )}
            </div>
            <div className="overflow-x-auto -mx-2">
                <ResponsiveContainer width="100%" height={200} minWidth={280}>
                    <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                            dataKey="bucket"
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        {stats?.median && (
                            <ReferenceLine
                                x={stats.median}
                                stroke={color}
                                strokeDasharray="4 2"
                                strokeWidth={1.5}
                                label={{ value: `Med: ${stats.median}`, fontSize: 9, fill: color, position: 'top' }}
                            />
                        )}
                        <Bar dataKey="count" name="Sayi" fill={color} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   INDIVIDUAL SCATTER
   ═══════════════════════════════════════════════════ */
function IndividualScatter({ scatterData }) {
    const employees = useMemo(() => {
        if (!scatterData) return [];
        const entries = Object.entries(scatterData);
        // Take max 15 employees for readability
        return entries.slice(0, 15).map(([empId, records]) => ({
            id: empId,
            name: records[0]?.name || `#${empId}`,
            records,
        }));
    }, [scatterData]);

    if (!employees.length) return null;

    // Time scale: 7:00 to 20:00 = 780 minutes
    const minTime = 7 * 60; // 07:00
    const maxTime = 20 * 60; // 20:00
    const range = maxTime - minTime;

    const timeToX = (timeStr) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        const mins = h * 60 + m;
        return ((mins - minTime) / range) * 100;
    };

    const hourLabels = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Bireysel Giris/Cikis Dagılımı</h4>
            <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                    {/* Hour labels */}
                    <div className="flex items-center mb-2 ml-28 relative h-4">
                        {hourLabels.map(h => {
                            const x = ((h * 60 - minTime) / range) * 100;
                            return (
                                <span
                                    key={h}
                                    className="absolute text-[9px] text-slate-400 font-semibold"
                                    style={{ left: `${x}%`, transform: 'translateX(-50%)' }}
                                >
                                    {h.toString().padStart(2, '0')}:00
                                </span>
                            );
                        })}
                    </div>

                    {/* Employee rows */}
                    {employees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                            <div className="w-28 shrink-0 truncate text-[10px] font-semibold text-slate-600" title={emp.name}>
                                {emp.name}
                            </div>
                            <div className="flex-1 relative h-5 bg-slate-100/50 rounded">
                                {/* Shift boundary lines */}
                                <div className="absolute top-0 bottom-0 border-l border-dashed border-indigo-300" style={{ left: `${timeToX('09:00')}%` }} />
                                <div className="absolute top-0 bottom-0 border-l border-dashed border-amber-300" style={{ left: `${timeToX('18:00')}%` }} />
                                {/* Dots */}
                                {emp.records.map((rec, j) => {
                                    const ciX = timeToX(rec.first_check_in || rec.check_in);
                                    const coX = timeToX(rec.last_check_out || rec.check_out);
                                    return (
                                        <React.Fragment key={j}>
                                            {ciX != null && (
                                                <div
                                                    className="absolute w-2 h-2 rounded-full bg-blue-500 top-1/2 -translate-y-1/2 hover:scale-150 transition-transform"
                                                    style={{ left: `${ciX}%` }}
                                                    title={`Ilk Giris: ${rec.first_check_in || rec.check_in} (${rec.date})`}
                                                />
                                            )}
                                            {coX != null && (
                                                <div
                                                    className="absolute w-2 h-2 rounded-full bg-amber-500 top-1/2 -translate-y-1/2 hover:scale-150 transition-transform"
                                                    style={{ left: `${coX}%` }}
                                                    title={`Son Cikis: ${rec.last_check_out || rec.check_out} (${rec.date})`}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 ml-28">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span className="text-[10px] text-slate-400">Giris</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span className="text-[10px] text-slate-400">Cikis</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 border-t border-dashed border-indigo-400" />
                            <span className="text-[10px] text-slate-400">Vardiya Baslangici</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 border-t border-dashed border-amber-400" />
                            <span className="text-[10px] text-slate-400">Vardiya Bitisi</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   PUNCTUALITY TABLE
   ═══════════════════════════════════════════════════ */
function PunctualityTable({ ranking, onEmployeeClick }) {
    const { sortCol, sortDir, handleSort, SortIcon } = useSortable('on_time_pct');

    const sortedRanking = useMemo(() => {
        if (!ranking?.length) return [];
        const sorted = [...ranking];
        sorted.sort((a, b) => {
            const aVal = a[sortCol] ?? 0;
            const bVal = b[sortCol] ?? 0;
            if (typeof aVal === 'string') {
                return sortDir === 'desc' ? bVal.localeCompare(aVal, 'tr') : aVal.localeCompare(bVal, 'tr');
            }
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
        return sorted;
    }, [ranking, sortCol, sortDir]);

    if (!sortedRanking.length) return null;

    const columns = [
        { key: 'rank', label: '#', sortable: false },
        { key: 'name', label: 'Calisan', sortable: true },
        { key: 'department', label: 'Departman', sortable: true },
        { key: 'on_time_pct', label: 'Zamaninda%', sortable: true },
        { key: 'early_pct', label: 'Erken%', sortable: true },
        { key: 'late_pct', label: 'Gec%', sortable: true },
        { key: 'avg_deviation_min', label: 'Ort.Sapma', sortable: true },
    ];

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dakiklik Siralamasi</h4>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-200">
                            {columns.map(col => (
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
                        {sortedRanking.map((row, idx) => (
                            <tr
                                key={row.employee_id}
                                className="border-b border-slate-100 last:border-0 hover:bg-white/60 cursor-pointer transition-colors"
                                onClick={() => onEmployeeClick?.(row.employee_id)}
                            >
                                <td className="px-3 py-2.5">
                                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                                        idx < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 font-semibold text-slate-700">{row.name}</td>
                                <td className="px-3 py-2.5 text-slate-500">{row.department}</td>
                                <td className="px-3 py-2.5">
                                    <span className={`font-bold ${
                                        row.on_time_pct >= 90 ? 'text-emerald-600'
                                        : row.on_time_pct >= 70 ? 'text-amber-600'
                                        : 'text-red-600'
                                    }`}>
                                        %{row.on_time_pct}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-blue-600 font-semibold">%{row.early_pct}</td>
                                <td className="px-3 py-2.5 text-red-600 font-semibold">%{row.late_pct}</td>
                                <td className="px-3 py-2.5">
                                    <span className={`font-bold ${
                                        row.avg_deviation_min <= 0 ? 'text-emerald-600'
                                        : row.avg_deviation_min <= 10 ? 'text-amber-600'
                                        : 'text-red-600'
                                    }`}>
                                        {row.avg_deviation_min > 0 ? '+' : ''}{row.avg_deviation_min}dk
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
                {sortedRanking.slice(0, 10).map((row, idx) => (
                    <div
                        key={row.employee_id}
                        className="bg-white rounded-xl p-3 border border-slate-100 cursor-pointer hover:border-indigo-200 transition-colors"
                        onClick={() => onEmployeeClick?.(row.employee_id)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    idx < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {idx + 1}
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">{row.name}</p>
                                    <p className="text-[10px] text-slate-400">{row.department}</p>
                                </div>
                            </div>
                            <span className={`text-sm font-black ${
                                row.on_time_pct >= 90 ? 'text-emerald-600'
                                : row.on_time_pct >= 70 ? 'text-amber-600'
                                : 'text-red-600'
                            }`}>
                                %{row.on_time_pct}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px]">
                            <span className="text-blue-600">Erken: %{row.early_pct}</span>
                            <span className="text-red-600">Gec: %{row.late_pct}</span>
                            <span className="text-slate-500">Sapma: {row.avg_deviation_min > 0 ? '+' : ''}{row.avg_deviation_min}dk</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function EntryExitDistribution() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerEmployeeId, setDrawerEmployeeId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/entry-exit/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('EntryExitDistribution fetch error:', err);
            setError('Giris/cikis dagılım verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Lazy load PersonDetailDrawer only when needed
    const [PersonDetailDrawer, setPersonDetailDrawer] = useState(null);
    useEffect(() => {
        if (drawerEmployeeId && !PersonDetailDrawer) {
            import('./PersonDetailDrawer').then(mod => {
                setPersonDetailDrawer(() => mod.default);
            });
        }
    }, [drawerEmployeeId, PersonDetailDrawer]);

    const handleEmployeeClick = useCallback((empId) => {
        setDrawerEmployeeId(empId);
    }, []);

    return (
        <>
            <CollapsibleSection
                title="Giris/Cikis Dagılımı"
                subtitle="Saat bazli desen analizi"
                icon={Clock}
                iconGradient="from-blue-500 to-cyan-600"
            >
                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="text-indigo-500 animate-spin mr-2" />
                        <span className="text-sm text-slate-400">Giris/cikis verileri yukleniyor...</span>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <AlertCircle size={24} className="text-red-400" />
                        <p className="text-sm text-slate-500">{error}</p>
                        <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                            <RefreshCw size={14} /> Tekrar Dene
                        </button>
                    </div>
                )}

                {/* Data */}
                {data && !loading && (
                    <div className="space-y-5">
                        {/* ─── Histograms ─────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {data.entry_histogram?.length > 0 && (
                                <HistogramChart
                                    data={data.entry_histogram}
                                    color="#3b82f6"
                                    title="Giris Saati Dagılımı"
                                    stats={data.entry_stats}
                                    icon={LogIn}
                                />
                            )}
                            {data.exit_histogram?.length > 0 && (
                                <HistogramChart
                                    data={data.exit_histogram}
                                    color="#f59e0b"
                                    title="Cikis Saati Dagılımı"
                                    stats={data.exit_stats}
                                    icon={LogOut}
                                />
                            )}
                        </div>

                        {/* ─── Individual Scatter ─────────────── */}
                        {data.individual_scatter && Object.keys(data.individual_scatter).length > 0 && (
                            <IndividualScatter scatterData={data.individual_scatter} />
                        )}

                        {/* ─── Punctuality Table ─────────────── */}
                        {data.punctuality_ranking?.length > 0 && (
                            <PunctualityTable
                                ranking={data.punctuality_ranking}
                                onEmployeeClick={handleEmployeeClick}
                            />
                        )}

                        {/* Empty state */}
                        {!data.entry_histogram?.length && !data.exit_histogram?.length && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Clock size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Bu donem icin giris/cikis verisi bulunamadı.</p>
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleSection>

            {/* Person Detail Drawer */}
            {PersonDetailDrawer && drawerEmployeeId && (
                <PersonDetailDrawer
                    open={!!drawerEmployeeId}
                    onClose={() => setDrawerEmployeeId(null)}
                    employeeId={drawerEmployeeId}
                    queryParams={queryParams}
                />
            )}
        </>
    );
}
