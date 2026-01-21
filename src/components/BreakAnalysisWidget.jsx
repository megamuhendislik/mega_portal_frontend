import React, { useMemo, useState, useEffect } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, CartesianGrid, Area } from 'recharts';
import { Coffee, TrendingUp, Maximize2, Calendar, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, isSameDay, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, addYears, subYears, getDaysInMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import ExtendedBreakAnalysisModal from './ExtendedBreakAnalysisModal';
import api from '../services/api';

const BreakAnalysisWidget = ({ logs: initialLogs, totalBreakSeconds, startDate, endDate, employeeId }) => {
    const [showExtended, setShowExtended] = useState(false);
    const [viewMode, setViewMode] = useState('MONTHLY'); // 'MONTHLY' | 'YEARLY'
    const [currentDate, setCurrentDate] = useState(startDate ? parseISO(startDate) : new Date());
    const [showCumulative, setShowCumulative] = useState(false);

    // Data State
    const [localLogs, setLocalLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Sync prop changes
    useEffect(() => {
        if (startDate) {
            setCurrentDate(parseISO(startDate));
        }
    }, [startDate]);

    // Fetch Data on Date/Mode Change
    useEffect(() => {
        fetchData();
    }, [currentDate, viewMode, employeeId]);

    const fetchData = async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            let start, end;
            if (viewMode === 'MONTHLY') {
                start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
            } else {
                start = format(startOfYear(currentDate), 'yyyy-MM-dd');
                end = format(endOfYear(currentDate), 'yyyy-MM-dd');
            }

            const res = await api.get('/attendance/', {
                params: {
                    employee_id: employeeId,
                    start_date: start,
                    end_date: end
                }
            });
            setLocalLogs(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching break data:", error);
        } finally {
            setLoading(false);
        }
    };

    const chartData = useMemo(() => {
        if (!localLogs) return [];

        if (viewMode === 'MONTHLY') {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            let days;
            try {
                days = eachDayOfInterval({ start, end });
            } catch (e) {
                console.error(e);
                return [];
            }

            const logMap = {};
            localLogs.forEach(log => {
                logMap[log.work_date] = Math.floor((log.break_seconds || 0) / 60);
            });

            let cumulative = 0;
            return days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dailyMin = logMap[dateStr] || 0;
                cumulative += dailyMin;

                return {
                    label: format(day, 'd', { locale: tr }),
                    fullLabel: format(day, 'd MMM yyyy', { locale: tr }),
                    val: dailyMin,
                    cumulative: cumulative,
                };
            });
        } else {
            // YEARLY VIEW: Average Daily Minutes per Month
            const start = startOfYear(currentDate);
            const end = endOfYear(currentDate);
            const months = eachMonthOfInterval({ start, end });

            const monthlyStats = {};
            localLogs.forEach(log => {
                const d = parseISO(log.work_date);
                const k = format(d, 'yyyy-MM');
                if (!monthlyStats[k]) monthlyStats[k] = { total: 0, count: 0 };
                monthlyStats[k].total += Math.floor((log.break_seconds || 0) / 60);
                monthlyStats[k].count += 1; // Active Days
            });

            let cumulative = 0;
            return months.map(m => {
                const k = format(m, 'yyyy-MM');
                const stats = monthlyStats[k] || { total: 0, count: 0 };

                // Active Day Average: Total Minutes / Active Days
                const avgDaily = stats.count > 0 ? Math.round(stats.total / stats.count) : 0;

                cumulative += stats.total;

                return {
                    label: format(m, 'MMM', { locale: tr }),
                    fullLabel: format(m, 'MMMM yyyy', { locale: tr }),
                    val: avgDaily, // Displaying AVERAGE daily usage
                    total: stats.total,
                    cumulative: cumulative,
                };
            });
        }
    }, [localLogs, currentDate, viewMode]);

    // Stats Calculations
    const totalMinutes = localLogs.reduce((acc, log) => acc + Math.floor((log.break_seconds || 0) / 60), 0);
    const activeDays = localLogs.length;

    // "Günlük Ortalama" (Daily Average)
    const dailyAvg = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-100 shadow-xl rounded-xl text-xs z-50">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-50 pb-1">{data.fullLabel}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">
                                {viewMode === 'YEARLY' ? 'Günlük Ort.:' : 'Kullanım:'}
                            </span>
                            <span className="font-bold text-slate-700">{data.val} dk</span>
                        </div>
                        {/* Hidden Period Total for Yearly to focus on Daily Avg per user request 
                        {viewMode === 'YEARLY' && (
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Ay Toplam:</span>
                                <span className="font-bold text-slate-500">{data.total} dk</span>
                            </div>
                        )}
                        */}
                        {showCumulative && (
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Kümülatif:</span>
                                <span className="font-bold text-blue-600">{data.cumulative} dk</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <div className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col relative overflow-hidden group hover:border-blue-200 transition-all duration-300 ${loading ? 'opacity-70' : ''}`}>

                {/* Decoration */}
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                    <Coffee size={120} />
                </div>

                {/* Header Controls */}
                <div className="flex flex-col gap-4 mb-6 z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                    <Coffee size={18} />
                                </div>
                                Mola Analizi
                            </h3>
                            {/* Date Navigation */}
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    onClick={() => setCurrentDate(prev => viewMode === 'MONTHLY' ? subMonths(prev, 1) : subYears(prev, 1))}
                                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-sm font-bold text-slate-600 min-w-[100px] text-center">
                                    {viewMode === 'MONTHLY'
                                        ? format(currentDate, 'MMMM yyyy', { locale: tr })
                                        : format(currentDate, 'yyyy', { locale: tr })
                                    }
                                </span>
                                <button
                                    onClick={() => setCurrentDate(prev => viewMode === 'MONTHLY' ? addMonths(prev, 1) : addYears(prev, 1))}
                                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {/* Toggle Mode */}
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

                            {/* Cumulative Toggle */}
                            <button
                                onClick={() => setShowCumulative(!showCumulative)}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                {showCumulative ? <CheckSquare size={12} className="text-indigo-600" /> : <Square size={12} />}
                                Kümülatif
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 z-10 w-full">
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/60">
                        <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wide mb-1">DÖNEM TOPLAM</p>
                        <div className="text-xl xl:text-2xl font-black text-slate-800 leading-none">
                            {totalH}<span className="text-sm font-bold text-slate-400 ml-0.5">sa</span> {totalM}<span className="text-sm font-bold text-slate-400 ml-0.5">dk</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">GÜNLÜK ORT.</p>
                        <div className="text-xl xl:text-2xl font-black text-slate-700 leading-none">
                            {dailyAvg}<span className="text-sm font-bold text-slate-400 ml-0.5">dk</span>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="w-full h-64 min-h-[220px] flex-1 z-10 relative">
                    {/* Maximize Button Overlay */}
                    <button
                        onClick={() => setShowExtended(true)}
                        className="absolute right-0 -top-8 p-1.5 text-slate-300 hover:text-indigo-600 transition-colors z-20 hover:bg-slate-100 rounded-lg"
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
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 9, fill: '#64748B' }}
                                dy={10}
                                minTickGap={10}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                            {/* Bars: Daily or Avg Daily */}
                            <Bar
                                yAxisId="left"
                                dataKey="val"
                                radius={[4, 4, 0, 0]}
                                barSize={viewMode === 'YEARLY' ? 14 : 8}
                                fill="#fbbf24"
                                animationDuration={1000}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.val >= 60 ? '#EF4444' : '#fbbf24'} />
                                ))}
                            </Bar>

                            {/* Average Line */}
                            <ReferenceLine
                                yAxisId="left"
                                y={dailyAvg}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{ position: 'right', value: 'Ort.', fill: '#94a3b8', fontSize: 10 }}
                            />

                            {/* Cumulative Line (Conditional) */}
                            {showCumulative && (
                                <>
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="cumulative"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                        animationDuration={1000}
                                    />
                                    <Area
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="cumulative"
                                        stroke="none"
                                        fill="url(#colorCumulative)"
                                        animationDuration={1000}
                                    />
                                </>
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <ExtendedBreakAnalysisModal
                isOpen={showExtended}
                onClose={() => setShowExtended(false)}
                employeeId={employeeId}
                initialDate={currentDate}
                initialViewMode={viewMode}
            />
        </>
    );
};

export default BreakAnalysisWidget;
