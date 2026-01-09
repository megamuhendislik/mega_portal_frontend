import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, endOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const WeeklyAttendanceChart = ({ logs, dailyTarget = 9 }) => { // Default to 9h if not provided
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Reset to current week if logs update drastically? No, keep user navigation state.

    const weekData = useMemo(() => {
        // Create 7-day array for the selected week
        const days = [];
        const start = weekStart;

        for (let i = 0; i < 7; i++) {
            const current = addDays(start, i);
            const dateStr = format(current, 'yyyy-MM-dd');

            // Find Log for this day
            const log = logs.find(l => {
                // Determine format of log.work_date. Usually YYYY-MM-DD string
                return l.work_date === dateStr;
            });

            days.push({
                name: format(current, 'dd MMM', { locale: tr }), // '09 Oca'
                fullDate: format(current, 'd MMMM yyyy, EEEE', { locale: tr }),
                dateObj: current,
                // Data (Hours)
                normal: log ? (log.normal_seconds || 0) / 3600 : 0,
                overtime: log ? (log.overtime_seconds || 0) / 3600 : 0,
                missing: log ? (log.missing_seconds || 0) / 3600 : 0,
            });
        }
        return days;
    }, [logs, weekStart]);

    const handlePrevWeek = () => setWeekStart(prev => addDays(prev, -7));
    const handleNextWeek = () => setWeekStart(prev => addDays(prev, 7));
    const handleReset = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200 shadow-xl rounded-xl text-xs z-50 min-w-[200px]">
                    <p className="font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Calendar size={14} className="text-slate-500" />
                        {dataPoint.fullDate}
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Normal</span>
                            <span className="font-bold text-slate-700">{dataPoint.normal.toFixed(1)} sa</span>
                        </div>
                        {dataPoint.overtime > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Ek Mesai</span>
                                <span className="font-bold text-emerald-600">+{dataPoint.overtime.toFixed(1)} sa</span>
                            </div>
                        )}
                        {dataPoint.missing > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Eksik</span>
                                <span className="font-bold text-rose-600">-{dataPoint.missing.toFixed(1)} sa</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">Haftalık Performans</h3>
                        <p className="text-xs text-slate-400 font-medium">
                            {format(weekStart, 'd MMM', { locale: tr })} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMM', { locale: tr })}
                        </p>
                    </div>
                </div>

                {/* Navigation & Legend */}
                <div className="flex items-center gap-4">
                    {/* Navigation */}
                    <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                        <button onClick={handlePrevWeek} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={handleReset} className="px-2 text-[10px] font-bold text-slate-400 hover:text-indigo-600">
                            BUGÜN
                        </button>
                        <button onClick={handleNextWeek} className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-indigo-600">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Legend */}
                    <div className="hidden lg:flex gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Normal</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Ek</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Eksik</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-[250px] w-full" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />

                        {/* Daily Target Reference Line */}
                        {dailyTarget > 0 && (
                            <ReferenceLine
                                y={dailyTarget}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{
                                    value: 'HEDEF',
                                    position: 'right',
                                    fill: '#94a3b8',
                                    fontSize: 10,
                                    fontWeight: 'bold'
                                }}
                            />
                        )}

                        {/* Stacked Bars */}
                        <Bar dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="overtime" stackId="a" fill="#10b981" />
                        <Bar dataKey="missing" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeeklyAttendanceChart;
