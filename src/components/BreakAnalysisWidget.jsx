import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, CartesianGrid, Area } from 'recharts';
import { Coffee, TrendingUp, Maximize2 } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import ExtendedBreakAnalysisModal from './ExtendedBreakAnalysisModal';

const BreakAnalysisWidget = ({ logs, totalBreakSeconds, startDate, endDate, employeeId }) => {
    const [showExtended, setShowExtended] = useState(false);

    const chartData = useMemo(() => {
        if (!startDate || !endDate) return [];

        // 1. Generate all days in range
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        let days;
        try {
            days = eachDayOfInterval({ start, end });
        } catch (e) {
            console.error("Invalid Interval", e);
            return [];
        }

        // 2. Map logs for easy lookup
        const logMap = {};
        if (logs) {
            logs.forEach(log => {
                logMap[log.work_date] = Math.floor((log.break_seconds || 0) / 60);
            });
        }

        // 3. Build Data with Cumulative Sum
        let cumulative = 0;
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dailyMin = logMap[dateStr] || 0;
            cumulative += dailyMin;

            return {
                date: day,
                dateStr: dateStr,
                dayName: format(day, 'd MMM', { locale: tr }), // 16 Oca
                dailyMinutes: dailyMin,
                cumulativeMinutes: cumulative
            };
        });

    }, [logs, startDate, endDate]);

    // Calculate Average
    const validDays = chartData.filter(d => d.dailyMinutes > 0).length;
    const totalMinutes = chartData.length > 0 ? chartData[chartData.length - 1].cumulativeMinutes : 0;
    const avgMinutes = validDays > 0 ? Math.round(totalMinutes / validDays) : 0;

    // Formatting
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-100 shadow-xl rounded-2xl text-xs z-50">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">{data.dayName}</p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                Günlük
                            </span>
                            <span className="font-bold text-slate-700">{data.dailyMinutes} dk</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                Kümülatif
                            </span>
                            <span className="font-bold text-blue-600">{data.cumulativeMinutes} dk</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col relative overflow-hidden group hover:border-blue-200 transition-all duration-300">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500">
                    <Coffee size={120} />
                </div>

                {/* New: Click Overlay or Button */}
                <button
                    onClick={() => setShowExtended(true)}
                    className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all z-20 opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-slate-100"
                    title="Genişletilmiş Analiz"
                >
                    <Maximize2 size={18} />
                </button>

                <div className="flex justify-between items-start mb-6 z-10">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600 rounded-xl">
                                <Coffee size={18} />
                            </div>
                            Mola Analizi
                        </h3>
                        <p className="text-xs font-medium text-slate-400 mt-1 pl-1">
                            Kümülatif ve günlük kullanım
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 z-10">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-100/60">
                        <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                            <TrendingUp size={12} />
                            AYLIK TOPLAM
                        </p>
                        <div className="text-2xl font-black text-slate-800 leading-none">
                            {totalH}<span className="text-sm font-bold text-slate-400 ml-0.5">sa</span> {totalM}<span className="text-sm font-bold text-slate-400 ml-0.5">dk</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">GÜNLÜK ORT.</p>
                        <div className="text-2xl font-black text-slate-700 leading-none">
                            {avgMinutes}<span className="text-sm font-bold text-slate-400 ml-0.5">dk</span>
                        </div>
                    </div>
                </div>

                <div className="w-full h-64 min-h-[250px] z-10 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="dayName"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                                dy={10}
                                interval="preserveStartEnd"
                                minTickGap={20}
                            />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94A3B8' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                hide={true} // Hide 2nd axis to calculate scale but distinct visual
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', opacity: 0.5 }} />

                            {/* Daily Bars */}
                            <Bar
                                yAxisId="left"
                                dataKey="dailyMinutes"
                                radius={[4, 4, 0, 0]}
                                barSize={12}
                                fill="#FBBF24"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.dailyMinutes > 60 ? '#EF4444' : '#FBBF24'} />
                                ))}
                            </Bar>

                            {/* Cumulative Line */}
                            <Line
                                yAxisId="right" // Scale with same axis or separate? Usually cumulative is much larger. Let's try separate allowed max.
                                // Actually, if cumulative grows to 2000 mins and daily is 60, bars will be tiny.
                                // Let's use Right Axis for Cumulative!
                                type="monotone"
                                dataKey="cumulativeMinutes"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                            />
                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="cumulativeMinutes"
                                stroke="none"
                                fill="url(#colorCumulative)"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-medium text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-[2px] bg-amber-400"></div>
                        Günlük Kullanım
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Kümülatif Toplam
                    </div>
                </div>
            </div>

            {/* Extended Modal */}
            <ExtendedBreakAnalysisModal
                isOpen={showExtended}
                onClose={() => setShowExtended(false)}
                employeeId={employeeId}
                initialDate={startDate ? parseISO(startDate) : new Date()}
            />
        </>
    );
};

export default BreakAnalysisWidget;
