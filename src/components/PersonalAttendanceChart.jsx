import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/dateUtils';
import { BarChart3 } from 'lucide-react';

const PersonalAttendanceChart = ({ logs }) => {
    // Transform logs to chart data
    const data = logs.map(log => {
        const date = new Date(log.work_date);
        const normal = (log.normal_seconds || 0) / 3600;
        const missing = (log.missing_seconds || 0) / 3600;
        const target = normal + missing;

        return {
            name: `${date.getDate()}`,
            fullDate: formatDate(log.work_date),
            normal: normal,
            overtime: (log.overtime_seconds || 0) / 3600,
            break: 0, // Not tracked in daily logs yet for chart needed?
            missing: missing > 0.1 ? missing : 0, // Filter tiny noise
            target: target > 0 ? target : null,
            isWeekend: date.getDay() === 0 || date.getDay() === 6
        };
    });

    // Custom Tooltip with Glassmorphism
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-xl p-4 border border-slate-200 shadow-2xl rounded-2xl text-xs z-50 min-w-[180px]">
                    <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 text-sm">{dataPoint.fullDate}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center group">
                            <span className="text-slate-500 font-medium group-hover:text-slate-700 transition-colors">Hedef</span>
                            <span className="font-mono font-bold text-slate-700">{dataPoint.target ? dataPoint.target.toFixed(1) : '0.0'} sa</span>
                        </div>
                        <div className="w-full h-px bg-slate-100 my-1"></div>
                        <div className="flex justify-between items-center text-emerald-600">
                            <span className="font-medium">Normal</span>
                            <span className="font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">{dataPoint.normal.toFixed(1)} sa</span>
                        </div>
                        {dataPoint.overtime > 0 && (
                            <div className="flex justify-between items-center text-blue-600">
                                <span className="font-medium">Fazla Mesai</span>
                                <span className="font-mono font-bold bg-blue-50 px-2 py-0.5 rounded-lg">+{dataPoint.overtime.toFixed(1)} sa</span>
                            </div>
                        )}
                        {dataPoint.missing > 0 && (
                            <div className="flex justify-between items-center text-rose-500">
                                <span className="font-medium">Eksik</span>
                                <span className="font-mono font-bold bg-rose-50 px-2 py-0.5 rounded-lg">-{dataPoint.missing.toFixed(1)} sa</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">Günlük Aktivite</h3>
                        <p className="text-xs text-slate-400 font-medium">Hedef gerçekleşme ve sapmalar</p>
                    </div>
                </div>

                {/* Modern Legend */}
                <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><span className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm"></span> Normal</div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><span className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></span> Mesai</div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><span className="w-2 h-2 bg-rose-500 rounded-full shadow-sm"></span> Eksik</div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><span className="w-3 h-1 bg-slate-400 rounded-full"></span> Hedef</div>
                </div>
            </div>

            <div className="h-[350px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barGap={0} // No gap between stacked
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />

                        {/* Stacked Bars with soft ordering */}
                        <Bar dataKey="normal" stackId="main" fill="#10B981" radius={[0, 0, 4, 4]} barSize={14} />
                        <Bar dataKey="overtime" stackId="main" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={14} />

                        {/* Missing is separate usually, or stacked on top to show 'what was needed' */}
                        {/* Let's prevent Missing from being visually weird, maybe distinct bar? */}
                        {/* Or maybe just show it as red bar stacked on normal if target not met? */}
                        {/* For now, stackId='main' puts it on top which visualizes Total Target well */}
                        <Bar dataKey="missing" stackId="main" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={14} opacity={0.6} />

                        {/* Target Line */}
                        <Line
                            type="step"
                            dataKey="target"
                            stroke="#94A3B8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PersonalAttendanceChart;
