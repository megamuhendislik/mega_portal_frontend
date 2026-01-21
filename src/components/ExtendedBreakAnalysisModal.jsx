import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Calendar, Clock, Coffee, ArrowRight } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, subDays, isSameDay, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../services/api';

const ExtendedBreakAnalysisModal = ({ isOpen, onClose, employeeId, initialDate, initialViewMode = 'MONTHLY' }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
    const [viewMode, setViewMode] = useState(initialViewMode); // 'MONTHLY' | 'YEARLY'

    // Sync view mode if widget changes (optional, but good UX on open)
    useEffect(() => {
        if (isOpen) {
            setViewMode(initialViewMode);
            // If date changed in widget, sync it too? Maybe not necessary if passed as prop.
        }
    }, [isOpen, initialViewMode]);

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

            // Fetch All Attendance Records for the range
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

    // Process Data for Charts and Table
    const chartData = useMemo(() => {
        if (!data) return [];

        if (viewMode === 'MONTHLY') {
            // DAILY Breakdown
            const start = startOfMonth(selectedDate);
            const end = endOfMonth(selectedDate);
            const days = eachDayOfInterval({ start, end });

            // Map data by date
            const dataMap = {};
            data.forEach(rec => {
                const dateStr = rec.work_date;
                if (!dataMap[dateStr]) dataMap[dateStr] = { minutes: 0, breaks: [] };
                dataMap[dateStr].minutes += Math.floor((rec.break_seconds || 0) / 60);
                if (rec.breaks_data) {
                    dataMap[dateStr].breaks.push(...rec.breaks_data);
                }
            });

            // Flatten for Chart
            let processed = [];
            days.forEach((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayData = dataMap[dateStr] || { minutes: 0, breaks: [] };
                processed.push({
                    date: day,
                    label: format(day, 'd MMM', { locale: tr }),
                    minutes: dayData.minutes,
                    breaks: dayData.breaks,
                    isYearly: false
                });
            });

            // Moving Average (3 Days)
            return processed.map((d, i, arr) => {
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
            // YEARLY Breakdown (Monthly Aggregates)
            const start = startOfYear(selectedDate);
            const end = endOfYear(selectedDate);
            const months = eachMonthOfInterval({ start, end });

            const monthlyTotals = {};
            // Accumulate detailed break lists per month if needed? 
            // Might be too much data for the table "breaks" column. Only show Count?
            data.forEach(rec => {
                const d = parseISO(rec.work_date);
                const k = format(d, 'yyyy-MM');
                if (!monthlyTotals[k]) monthlyTotals[k] = { minutes: 0, breaks: [] };
                monthlyTotals[k].minutes += Math.floor((rec.break_seconds || 0) / 60);
                if (rec.breaks_data) {
                    monthlyTotals[k].breaks.push(...rec.breaks_data);
                }
            });

            return months.map(m => {
                const k = format(m, 'yyyy-MM');
                const val = monthlyTotals[k] || { minutes: 0, breaks: [] };
                return {
                    date: m,
                    label: format(m, 'MMMM', { locale: tr }),
                    minutes: val.minutes,
                    breaks: val.breaks || [], // This list might be huge, we might summarize it in UI
                    movingAvg: 0, // No moving avg for yearly monthly bars usually? Or maybe 3-month avg?
                    isYearly: true
                };
            });
        }
    }, [data, selectedDate, viewMode]);

    // Calculate Summary Stats
    const totalMinutes = chartData.reduce((acc, curr) => acc + curr.minutes, 0);
    const activeItems = chartData.filter(d => d.minutes > 0).length;

    // For Yearly: Average per Active Month
    // For Monthly: Average per Active Day
    const realAvg = activeItems > 0 ? Math.round(totalMinutes / activeItems) : 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100/50 text-amber-600 rounded-2xl">
                                <Coffee size={24} />
                            </div>
                            Genişletilmiş Mola Analizi
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-medium text-slate-400 pl-1">
                                Detaylı kullanım raporu
                            </p>
                            {/* Toggle */}
                            <div className="bg-slate-100 p-0.5 rounded-lg flex ml-4">
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
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Date Selector Display */}
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-600">
                                {viewMode === 'MONTHLY'
                                    ? format(selectedDate, 'MMMM yyyy', { locale: tr })
                                    : format(selectedDate, 'yyyy', { locale: tr })
                                }
                            </span>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
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
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">TOPLAM SÜRE</p>
                                    <div className="text-3xl font-black text-slate-800">
                                        {Math.floor(totalMinutes / 60)}<span className="text-lg text-slate-400 font-bold ml-1">sa</span> {totalMinutes % 60}<span className="text-lg text-slate-400 font-bold ml-1">dk</span>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">ORTALAMA</p>
                                    <div className="text-3xl font-black text-slate-800">
                                        {realAvg}<span className="text-lg text-slate-400 font-bold ml-1">dk</span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 mt-1">
                                        {viewMode === 'MONTHLY' ? 'Aktif gün başına' : 'Aktif ay başına'}
                                    </p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">DURUM</p>
                                    <div className="text-sm font-medium text-slate-600">
                                        {viewMode === 'MONTHLY'
                                            ? 'Günlük mola kullanımları ve detaylı aralıklar.'
                                            : 'Yıllık bazda aylık toplam mola kullanımları.'}
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-500" />
                                    {viewMode === 'MONTHLY' ? 'Günlük Kullanım Grafiği' : 'Aylık Toplam Kullanım Grafiği'}
                                </h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} minTickGap={30} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} unit=" dk" />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                            />

                                            <Bar dataKey="minutes" name="Süre (Dk)" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={20} />

                                            {/* Show Line only for Monthly view (Moving Avg) */}
                                            {viewMode === 'MONTHLY' && (
                                                <Line type="monotone" dataKey="movingAvg" name="Ortalama" stroke="#3b82f6" strokeWidth={3} dot={false} strokeOpacity={0.8} />
                                            )}
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-50">
                                    <h3 className="text-sm font-bold text-slate-700">
                                        {viewMode === 'MONTHLY' ? 'Günlük Detaylar' : 'Aylık Detaylar'}
                                    </h3>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">{viewMode === 'MONTHLY' ? 'Tarih' : 'Ay'}</th>
                                            <th className="px-6 py-3 text-center">Toplam Süre</th>
                                            <th className="px-6 py-3">{viewMode === 'MONTHLY' ? 'Mola Aralıkları' : 'İşlem Sayısı'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {chartData.filter(d => d.minutes > 0).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 w-40">
                                                    {row.label}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-lg font-bold text-xs ${row.minutes > (viewMode === 'MONTHLY' ? 60 : 1800) ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {row.minutes} dk
                                                    </span>
                                                </td>
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
                                                            {row.breaks ? row.breaks.length : 0} adet mola kaydı
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExtendedBreakAnalysisModal;
