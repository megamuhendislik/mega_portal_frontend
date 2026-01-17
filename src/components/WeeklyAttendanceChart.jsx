import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, endOfWeek, addDays, format, isSameDay, parseISO, isWeekend, isBefore, startOfToday } from 'date-fns';
import { tr } from 'date-fns/locale';

const WeeklyAttendanceChart = ({ logs, dailyTarget = 9 }) => { // Default to 9h if not provided
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const weekData = useMemo(() => {
        const days = [];
        const start = weekStart;

        const today = startOfToday();

        for (let i = 0; i < 7; i++) {
            const current = addDays(start, i);
            const dateStr = format(current, 'yyyy-MM-dd');

            // Find ALL logs for this day (Handle split records)
            const dayLogs = logs.filter(l => l.work_date === dateStr);

            // Calculate Metrics (Sum of all segments)
            let normal = 0;
            let overtime = 0;
            let missing = 0;

            // For details (Taking the most relevant or combining)
            let status = null;
            let note = null;
            let managerName = null;
            let checkIns = [];
            let checkOuts = [];

            if (dayLogs.length > 0) {
                dayLogs.forEach(log => {
                    normal += (log.normal_seconds || 0);
                    overtime += (log.overtime_seconds || 0);
                    missing += (log.missing_seconds || 0);

                    if (log.check_in) checkIns.push(parseISO(log.check_in));
                    if (log.check_out) checkOuts.push(parseISO(log.check_out));

                    // Priority for status/notes? maybe just take the last or first valid
                    if (log.status) status = log.status;
                    if (log.note) note = log.note;
                    if (log.approval_manager_name) managerName = log.approval_manager_name;
                });

                // Convert seconds to hours
                normal /= 3600;
                overtime /= 3600;
                missing /= 3600;
            }

            // Format Times (Min Start - Max End)
            let timeRange = null;
            if (checkIns.length > 0) {
                const earliestIn = new Date(Math.min(...checkIns));
                const inTime = format(earliestIn, 'HH:mm');

                if (checkOuts.length > 0) {
                    const latestOut = new Date(Math.max(...checkOuts));
                    const outTime = format(latestOut, 'HH:mm');
                    timeRange = `${inTime} - ${outTime}`;
                } else {
                    timeRange = `${inTime} - ?`;
                }
            }

            days.push({
                name: format(current, 'dd MMM', { locale: tr }),
                fullDate: format(current, 'd MMMM yyyy, EEEE', { locale: tr }),
                dateObj: current,

                // Data (Hours)
                normal,
                overtime,
                missing,

                // Details for Tooltip
                timeRange,
                note: note,
                managerName: managerName,
                status
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
                <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200 shadow-xl rounded-xl text-xs z-50 min-w-[220px]">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2 flex justify-between items-center">
                        <span className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-500" />
                            {dataPoint.fullDate}
                        </span>
                    </p>

                    {/* Time & Details */}
                    {dataPoint.timeRange && (
                        <div className="mb-3 bg-slate-50 p-2 rounded border border-slate-100 italic text-slate-600">
                            <strong>Giriş-Çıkış:</strong> {dataPoint.timeRange}
                        </div>
                    )}

                    <div className="space-y-1.5 mb-3">
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

                    {/* Footer Details (Manager / Note) */}
                    {(dataPoint.managerName || dataPoint.note) && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                            {dataPoint.managerName && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <span className="font-bold uppercase">Onaylayan:</span> {dataPoint.managerName}
                                </div>
                            )}
                            {dataPoint.note && (
                                <div className="text-[10px] text-indigo-500 bg-indigo-50 p-1.5 rounded mt-1">
                                    "{dataPoint.note}"
                                </div>
                            )}
                        </div>
                    )}
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

                <div className="flex items-center gap-4">
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
                    <div className="hidden lg:flex gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Normal</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Ek</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Eksik</div>
                    </div>
                </div>
            </div>

            {/* Fixed height container to prevent Recharts -1 width error */}
            <div style={{ width: '100%', height: 320, minWidth: 300 }}>
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                    <BarChart data={weekData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }} barSize={32}>
                        <defs>
                            <pattern id="striped" patternUnits="userSpaceOnUse" width="4" height="4">
                                <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#f43f5e" strokeWidth="1" />
                            </pattern>
                        </defs>
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

                        <Bar dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="overtime" stackId="a" fill="#10b981" />
                        <Bar dataKey="missing" stackId="a" fill="url(#striped)" stroke="#f43f5e" strokeWidth={0.5} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeeklyAttendanceChart;
