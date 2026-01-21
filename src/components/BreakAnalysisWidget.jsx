import React, { useMemo, useState, useEffect } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, CartesianGrid, Area } from 'recharts';
import { Coffee, TrendingUp, Maximize2, Calendar } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, isSameDay, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import ExtendedBreakAnalysisModal from './ExtendedBreakAnalysisModal';
import api from '../services/api';

const BreakAnalysisWidget = ({ logs: initialLogs, totalBreakSeconds, startDate, endDate, employeeId }) => {
    const [showExtended, setShowExtended] = useState(false);
    const [viewMode, setViewMode] = useState('MONTHLY'); // 'MONTHLY' | 'YEARLY'
    const [yearlyLogs, setYearlyLogs] = useState([]);
    const [loadingYearly, setLoadingYearly] = useState(false);

    // Fetch Yearly Data on Demand
    useEffect(() => {
        if (viewMode === 'YEARLY' && employeeId && yearlyLogs.length === 0) {
            fetchYearlyData();
        }
    }, [viewMode, employeeId]);

    const fetchYearlyData = async () => {
        setLoadingYearly(true);
        try {
            // Determine year from startDate or current
            const refDate = startDate ? parseISO(startDate) : new Date();
            const start = format(startOfYear(refDate), 'yyyy-MM-dd');
            const end = format(endOfYear(refDate), 'yyyy-MM-dd');

            const res = await api.get('/attendance/', {
                params: {
                    employee_id: employeeId,
                    start_date: start,
                    end_date: end
                }
            });
            setYearlyLogs(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching yearly breaks:", error);
        } finally {
            setLoadingYearly(false);
        }
    };

    const activeLogs = viewMode === 'MONTHLY' ? initialLogs : yearlyLogs;

    const chartData = useMemo(() => {
        if (!startDate && viewMode === 'MONTHLY') return [];

        if (viewMode === 'MONTHLY') {
            const start = parseISO(startDate);
            const end = parseISO(endDate);
            let days;
            try {
                days = eachDayOfInterval({ start, end });
            } catch (e) {
                console.error("Invalid Interval", e);
                return [];
            }

            const logMap = {};
            if (activeLogs) {
                activeLogs.forEach(log => {
                    logMap[log.work_date] = Math.floor((log.break_seconds || 0) / 60);
                });
            }

            let cumulative = 0;
            return days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dailyMin = logMap[dateStr] || 0;
                cumulative += dailyMin;

                return {
                    label: format(day, 'd MMM', { locale: tr }),
                    val: dailyMin,
                    cumulative: cumulative,
                    isYearly: false
                };
            });
        } else {
            // YEARLY VIEW: Monthly Aggregates
            const refDate = startDate ? parseISO(startDate) : new Date();
            const start = startOfYear(refDate);
            const end = endOfYear(refDate);
            const months = eachMonthOfInterval({ start, end });

            const monthlyTotals = {};
            if (activeLogs) {
                activeLogs.forEach(log => {
                    const d = parseISO(log.work_date);
                    const k = format(d, 'yyyy-MM');
                    monthlyTotals[k] = (monthlyTotals[k] || 0) + Math.floor((log.break_seconds || 0) / 60);
                });
            }

            let cumulative = 0;
            return months.map(m => {
                const k = format(m, 'yyyy-MM');
                const val = monthlyTotals[k] || 0;
                cumulative += val;

                return {
                    label: format(m, 'MMM', { locale: tr }),
                    val: val,
                    cumulative: cumulative,
                    isYearly: true
                };
            });
        }
    }, [activeLogs, startDate, endDate, viewMode]);

    // Stats
    const totalMinutes = chartData.length > 0 ? chartData[chartData.length - 1].cumulative : 0;
    const avgVal = chartData.length > 0 ? Math.round(totalMinutes / (viewMode === 'MONTHLY' ? chartData.filter(d => d.val > 0).length || 1 : 12)) : 0;

    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-100 shadow-xl rounded-xl text-xs z-50">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-50 pb-1">{data.label}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Kullanım:</span>
                            <span className="font-bold text-slate-700">{data.val} dk</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Kümülatif:</span>
                            <span className="font-bold text-blue-600">{data.cumulative} dk</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <div className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col relative overflow-hidden group hover:border-blue-200 transition-all duration-300 ${loadingYearly ? 'opacity-70' : ''}`}>

                {/* Decoration */}
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                    <Coffee size={120} />
                </div>

                {/* Header */}
                <div className="flex justify-between items-start mb-6 z-10">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                <Coffee size={18} />
                            </div>
                            Mola Analizi
                        </h3>
                        <p className="text-xs font-medium text-slate-400 mt-1 pl-1">
                            {viewMode === 'MONTHLY' ? 'Aylık Görünüm' : 'Yıllık Görünüm'}
                        </p>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('MONTHLY')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${viewMode === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Aylık
                        </button>
                        <button
                            onClick={() => setViewMode('YEARLY')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${viewMode === 'YEARLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Yıllık
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6 z-10">
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/60">
                        <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wide mb-1">TOPLAM</p>
                        <div className="text-2xl font-black text-slate-800 leading-none">
                            {totalH}<span className="text-sm font-bold text-slate-400 ml-0.5">sa</span> {totalM}<span className="text-sm font-bold text-slate-400 ml-0.5">dk</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">ORTALAMA</p>
                        <div className="text-2xl font-black text-slate-700 leading-none">
                            {avgVal}<span className="text-sm font-bold text-slate-400 ml-0.5">dk</span>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="w-full h-64 min-h-[200px] flex-1 z-10 relative">
                    {/* Maximize Button Overlay */}
                    <button
                        onClick={() => setShowExtended(true)}
                        className="absolute right-0 -top-10 p-2 text-slate-300 hover:text-indigo-600 transition-colors z-20"
                        title="Detaylı İncele"
                    >
                        <Maximize2 size={16} />
                    </button>

                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} minTickGap={20} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                            {/* Bars */}
                            <Bar yAxisId="left" dataKey="val" radius={[4, 4, 0, 0]} barSize={viewMode === 'YEARLY' ? 20 : 12} fill="#fbbf24">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.val > (viewMode === 'YEARLY' ? 1800 : 60) ? '#EF4444' : '#FBBF24'} />
                                ))}
                            </Bar>

                            {/* Cumulative Line (Only relevant if useful, otherwise maybe average line?) */}
                            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            <Area yAxisId="right" type="monotone" dataKey="cumulative" stroke="none" fill="url(#colorCumulative)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <ExtendedBreakAnalysisModal
                isOpen={showExtended}
                onClose={() => setShowExtended(false)}
                employeeId={employeeId}
                initialDate={startDate ? parseISO(startDate) : new Date()}
                initialViewMode={viewMode}
            />
        </>
    );
};

export default BreakAnalysisWidget;
