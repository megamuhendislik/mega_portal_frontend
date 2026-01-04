import React, { useMemo } from 'react';
import { formatDate } from '../utils/dateUtils'; // Assuming utility exists or I'll use inline
import clsx from 'clsx';

const PersonalAttendanceChart = ({ logs, startDate, endDate }) => {
    // 1. Generate full date range
    const chartData = useMemo(() => {
        if (!startDate || !endDate) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = [];

        // Map logs for quick access
        const logMap = {};
        logs.forEach(log => {
            logMap[log.work_date] = log;
        });

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const isoDate = d.toISOString().split('T')[0];
            const log = logMap[isoDate];

            // Calculate Stats (Minutes)
            let worked = 0;
            let overtime = 0;
            let missing = 0;

            if (log) {
                worked = (log.normal_seconds || 0) / 60;
                overtime = (log.overtime_seconds || 0) / 60;
                missing = (log.missing_seconds || 0) / 60;
            }

            // Expected ? Not directly available, but we can infer:
            // Work + Missing = Target (roughly)
            // Or just show stacked bar: Worked (Green) + Overtime (Amber) + Missing (Red/Empty)

            days.push({
                date: isoDate,
                day: d.getDate(),
                weekday: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
                worked,
                overtime,
                missing,
                totalHeightVal: worked + overtime + missing
            });
        }
        return days;
    }, [logs, startDate, endDate]);

    if (chartData.length === 0) return null;

    // Find max value for scaling (min 540 mins = 9 hours as baseline)
    const maxValue = Math.max(
        ...chartData.map(d => d.totalHeightVal),
        540
    );

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span>Günlük Performans</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Dk</span>
            </h3>

            <div className="min-w-[800px] h-64 flex items-end gap-2 pb-4 border-b border-slate-100 relative">
                {/* Y-Axis Grid Lines (Optional - roughly 50% and 100%) */}
                <div className="absolute top-0 w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>
                <div className="absolute top-1/2 w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>

                {chartData.map((day) => {
                    const totalVal = day.worked + day.overtime + day.missing;
                    const isZero = totalVal === 0;

                    // Height Percentages
                    const workedPct = (day.worked / maxValue) * 100;
                    const otPct = (day.overtime / maxValue) * 100;
                    const missingPct = (day.missing / maxValue) * 100;

                    return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-slate-800 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap">
                                <p className="font-bold">{day.date}</p>
                                <p>Çalışma: {Math.round(day.worked)} dk</p>
                                <p>Mesai: {Math.round(day.overtime)} dk</p>
                                <p>Eksik: {Math.round(day.missing)} dk</p>
                            </div>

                            {/* Bar Container */}
                            <div className="w-full bg-slate-50 rounded-t-lg relative flex flex-col justify-end overflow-hidden hover:bg-slate-100 transition-colors"
                                style={{ height: '100%' }}>

                                {/* Bars Stacked: Missing (Top), Overtime (Middle), Worked (Bottom) 
                                    Wait, usually Missing is "gap" from top.
                                    Let's stack from bottom: Worked -> Overtime. 
                                    And visually Missing can be red bar on top? Or just transparent?
                                    User asked for performance. Missing should be negative or red.
                                    Let's stack: Worked (Blue), Overtime (Green), Missing (Red)
                                */}

                                {missingPct > 0 && (
                                    <div style={{ height: `${missingPct}%` }} className="w-full bg-red-400 bg-opacity-30 border-b border-white/50" title="Eksik"></div>
                                )}
                                {otPct > 0 && (
                                    <div style={{ height: `${otPct}%` }} className="w-full bg-emerald-400 border-b border-white/50" title="Fazla Mesai"></div>
                                )}
                                {workedPct > 0 && (
                                    <div style={{ height: `${workedPct}%` }} className="w-full bg-blue-500" title="Normal Çalışma"></div>
                                )}
                            </div>

                            {/* X-Axis Label */}
                            <div className="text-center">
                                <span className={clsx("text-xs font-bold block", day.weekday === 'Cmt' || day.weekday === 'Paz' ? 'text-red-400' : 'text-slate-600')}>
                                    {day.day}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase">{day.weekday}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs font-medium text-slate-500 justify-center">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Normal Çalışma</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded-sm"></span> Fazla Mesai</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 bg-opacity-30 rounded-sm"></span> Eksik Süre</div>
            </div>
        </div>
    );
};

export default PersonalAttendanceChart;
