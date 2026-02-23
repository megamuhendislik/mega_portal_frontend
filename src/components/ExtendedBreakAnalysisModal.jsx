import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Calendar, Clock, Coffee, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, Cell, ReferenceLine } from 'recharts';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../services/api';
import useIsMobile from '../hooks/useIsMobile';

const ExtendedBreakAnalysisModal = ({ isOpen, onClose, employeeId, initialDate, initialViewMode = 'MONTHLY' }) => {
    const isMobile = useIsMobile();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    // Internal State
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [showCumulative, setShowCumulative] = useState(false);

    // Sync on Open
    useEffect(() => {
        if (isOpen) {
            if (initialDate) setSelectedDate(initialDate);
            if (initialViewMode) setViewMode(initialViewMode);
        }
    }, [isOpen, initialDate, initialViewMode]);

    // Fetch Data on Change
    useEffect(() => {
        if (isOpen && employeeId) {
            fetchDetailedData();
        }
    }, [isOpen, employeeId, selectedDate, viewMode]);

    const fetchDetailedData = async () => {
        setLoading(true);
        try {
            let start, end;
            if (viewMode === 'MONTHLY') {
                start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
                end = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
            } else {
                start = format(startOfYear(selectedDate), 'yyyy-MM-dd');
                end = format(endOfYear(selectedDate), 'yyyy-MM-dd');
            }

            const res = await api.get('/attendance/', {
                params: {
                    employee_id: employeeId,
                    start_date: start,
                    end_date: end
                }
            });

            setData(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching break details:", error);
        } finally {
            setLoading(false);
        }
    };

    const chartData = useMemo(() => {
        if (!data) return [];
        let cumulative = 0;

        if (viewMode === 'MONTHLY') {
            const start = startOfMonth(selectedDate);
            const end = endOfMonth(selectedDate);
            const days = eachDayOfInterval({ start, end });

            const dataMap = {};
            data.forEach(rec => {
                const dateStr = rec.work_date;
                if (!dataMap[dateStr]) dataMap[dateStr] = { minutes: 0, breaks: [] };
                dataMap[dateStr].minutes += Math.floor((rec.break_seconds || 0) / 60);
                if (rec.breaks_data) {
                    dataMap[dateStr].breaks.push(...rec.breaks_data);
                }
            });

            // Calculate Moving Average & Cumulative
            // First pass: build basic array
            const basic = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const val = dataMap[dateStr] || { minutes: 0, breaks: [] };
                cumulative += val.minutes;
                return {
                    date: day,
                    label: format(day, 'd MMM', { locale: tr }),
                    fullLabel: format(day, 'd MMMM yyyy', { locale: tr }),
                    minutes: val.minutes,
                    cumulative: cumulative,
                    breaks: val.breaks,
                };
            });

            // Second pass: moving avg
            return basic.map((d, i, arr) => {
                let sum = 0;
                let count = 0;
                for (let j = Math.max(0, i - 2); j <= i; j++) {
                    sum += arr[j].minutes;
                    count++;
                }
                return {
                    ...d,
                    movingAvg: count > 0 ? Math.round(sum / count) : 0
                };
            });

        } else {
            // YEARLY
            const start = startOfYear(selectedDate);
            const end = endOfYear(selectedDate);
            const months = eachMonthOfInterval({ start, end });

            const monthlyTotals = {};
            data.forEach(rec => {
                const d = parseISO(rec.work_date);
                const k = format(d, 'yyyy-MM');
                if (!monthlyTotals[k]) monthlyTotals[k] = { minutes: 0, count: 0, breaks: [] };
                monthlyTotals[k].minutes += Math.floor((rec.break_seconds || 0) / 60);
                monthlyTotals[k].count += 1; // Active days count
                if (rec.breaks_data) {
                    monthlyTotals[k].breaks.push(...rec.breaks_data);
                }
            });

            return months.map(m => {
                const k = format(m, 'yyyy-MM');
                const val = monthlyTotals[k] || { minutes: 0, count: 0, breaks: [] };

                // AVG DAILY for Yearly View
                const avgDaily = val.count > 0 ? Math.round(val.minutes / val.count) : 0;
                cumulative += val.minutes; // Cumulative is still Total Minutes

                return {
                    date: m,
                    label: format(m, 'MMM', { locale: tr }),
                    fullLabel: format(m, 'MMMM yyyy', { locale: tr }),
                    minutes: val.minutes, // Total for table
                    avgDaily: avgDaily,   // For BAR chart
                    cumulative: cumulative,
                    breaks: val.breaks,
                    count: val.count
                };
            });
        }
    }, [data, selectedDate, viewMode]);

    // Stats
    const totalMinutes = chartData.reduce((acc, curr) => acc + (viewMode === 'MONTHLY' ? curr.minutes : curr.minutes), 0); // Always sum totals

    // Better Global Avg Calculation:
    const totalActiveDays = viewMode === 'MONTHLY'
        ? chartData.filter(d => d.minutes > 0).length
        : chartData.reduce((acc, curr) => acc + (curr.count || 0), 0);

    const globalDailyAvg = totalActiveDays > 0 ? Math.round(totalMinutes / totalActiveDays) : 0;


    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-100 shadow-xl rounded-xl text-xs z-50">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-50 pb-1">{d.fullLabel}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">
                                {viewMode === 'YEARLY' ? 'Günlük Ort.:' : 'Kullanım:'}
                            </span>
                            <span className="font-bold text-slate-700">
                                {viewMode === 'YEARLY' ? d.avgDaily : d.minutes} dk
                            </span>
                        </div>
                        {/* Removed Total for Yearly to focus on Daily Avg */}
                        {showCumulative && (
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Kümülatif:</span>
                                <span className="font-bold text-blue-600">{d.cumulative} dk</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-[calc(100vw-2rem)] md:max-w-5xl h-[70vh] md:h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100/50 text-amber-600 rounded-2xl">
                                <Coffee size={24} />
                            </div>
                            Genişletilmiş Mola Analizi
                        </h2>
                        <div className="flex items-center gap-4 mt-2">
                            {/* View Mode Toggles */}
                            <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setViewMode('MONTHLY')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Aylık
                                </button>
                                <button
                                    onClick={() => setViewMode('YEARLY')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'YEARLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Yıllık
                                </button>
                            </div>

                            <span className="text-slate-300">|</span>

                            {/* Cumulative Toggle */}
                            <button
                                onClick={() => setShowCumulative(!showCumulative)}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                {showCumulative ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                                Kümülatif
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Date Navigation */}
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setSelectedDate(prev => viewMode === 'MONTHLY' ? subMonths(prev, 1) : subYears(prev, 1))}
                                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center gap-2 px-2 min-w-[120px] justify-center">
                                <Calendar size={14} className="text-slate-400" />
                                <span className="text-sm font-bold text-slate-600">
                                    {viewMode === 'MONTHLY'
                                        ? format(selectedDate, 'MMMM yyyy', { locale: tr })
                                        : format(selectedDate, 'yyyy', { locale: tr })
                                    }
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedDate(prev => viewMode === 'MONTHLY' ? addMonths(prev, 1) : addYears(prev, 1))}
                                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors ml-2"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 font-medium">Yükleniyor...</div>
                    ) : (
                        <div className="space-y-8">

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">TOPLAM SÜRE</p>
                                    <div className="text-3xl font-black text-slate-800">
                                        {Math.floor(totalMinutes / 60)}<span className="text-lg text-slate-400 font-bold ml-1">sa</span> {totalMinutes % 60}<span className="text-lg text-slate-400 font-bold ml-1">dk</span>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">GÜNLÜK ORTALAMA</p>
                                    <div className="text-3xl font-black text-slate-800">
                                        {globalDailyAvg}<span className="text-lg text-slate-400 font-bold ml-1">dk</span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 mt-1">
                                        Aktif gün başına
                                    </p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">DURUM</p>
                                    <div className="text-sm font-medium text-slate-600">
                                        {viewMode === 'MONTHLY'
                                            ? 'Günlük mola kullanımları ve detaylı aralıklar.'
                                            : 'Yıllık bazda günlük ortalama mola alışkanlığı.'}
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-500" />
                                    {viewMode === 'MONTHLY' ? 'Günlük Kullanım Grafiği' : 'Aylık Bazda Günlük Ortalamalar'}
                                </h3>
                                <div className="h-56 md:h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: isMobile ? 0 : -20, bottom: isMobile ? 20 : 0 }}>
                                            <defs>
                                                <linearGradient id="colorCumulativeModal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="label"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: isMobile ? 9 : 11, fill: '#64748b' }}
                                                dy={10}
                                                minTickGap={30}
                                            />
                                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: '#64748b' }} />
                                            <YAxis yAxisId="right" orientation="right" hide />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                                            {/* Bar: Daily Minutes OR Avg Daily for Yearly */}
                                            <Bar
                                                yAxisId="left"
                                                dataKey={viewMode === 'MONTHLY' ? "minutes" : "avgDaily"}
                                                name="Süre"
                                                fill="#fbbf24"
                                                radius={[4, 4, 0, 0]}
                                                barSize={viewMode === 'MONTHLY' ? 12 : 24}
                                                animationDuration={1000}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={(viewMode === 'MONTHLY' ? entry.minutes : entry.avgDaily) >= 60 ? '#EF4444' : '#fbbf24'} />
                                                ))}
                                            </Bar>

                                            {/* Average Line */}
                                            <ReferenceLine
                                                yAxisId="left"
                                                y={globalDailyAvg}
                                                stroke="#94a3b8"
                                                strokeDasharray="3 3"
                                                label={{ position: 'right', value: 'Ort.', fill: '#94a3b8', fontSize: 10 }}
                                            />

                                            {/* Moving Average Line - Only for Monthly */}
                                            {viewMode === 'MONTHLY' && (
                                                <Line yAxisId="left" type="monotone" dataKey="movingAvg" stroke="#3b82f6" strokeWidth={3} dot={false} strokeOpacity={0.5} />
                                            )}

                                            {/* Cumulative Line - Conditional */}
                                            {showCumulative && (
                                                <>
                                                    <Line
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="cumulative"
                                                        stroke="#3b82f6"
                                                        strokeWidth={2}
                                                        dot={false}
                                                    />
                                                    <Area
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="cumulative"
                                                        stroke="none"
                                                        fill="url(#colorCumulativeModal)"
                                                    />
                                                </>
                                            )}

                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-50">
                                    <h3 className="text-sm font-bold text-slate-700">
                                        {viewMode === 'MONTHLY' ? 'Günlük Detaylar' : 'Aylık Özet'}
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">{viewMode === 'MONTHLY' ? 'Tarih' : 'Ay'}</th>
                                            <th className="px-6 py-3 text-center">Toplam Süre</th>
                                            {viewMode === 'YEARLY' && <th className="px-6 py-3 text-center">Günlük Ort.</th>}
                                            <th className="px-6 py-3">{viewMode === 'MONTHLY' ? 'Mola Aralıkları' : 'İşlem Sayısı'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {chartData.filter(d => (viewMode === 'MONTHLY' ? d.minutes > 0 : d.count > 0)).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 w-40">
                                                    {row.label}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-lg font-bold text-xs ${row.minutes >= (viewMode === 'MONTHLY' ? 60 : 1800) ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {row.minutes} dk
                                                    </span>
                                                </td>
                                                {viewMode === 'YEARLY' && (
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-1 rounded-lg font-bold text-xs bg-amber-50 text-amber-600`}>
                                                            {row.avgDaily} dk
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    {viewMode === 'MONTHLY' ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {row.breaks && row.breaks.length > 0 ? (
                                                                row.breaks.map((brk, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-slate-600 text-xs font-medium border border-slate-200">
                                                                        <Clock size={12} className="text-slate-400" />
                                                                        {brk.start} - {brk.end}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-slate-300 italic">Detay yok</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 text-xs font-bold">
                                                            {row.count} aktif gün
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExtendedBreakAnalysisModal;
