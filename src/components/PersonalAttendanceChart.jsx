import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { formatDate } from '../utils/dateUtils';

const PersonalAttendanceChart = ({ logs }) => {
    // Transform logs to chart data
    const data = logs.map(log => {
        const date = new Date(log.work_date);
        const normal = (log.normal_seconds || 0) / 3600;
        const missing = (log.missing_seconds || 0) / 3600;
        // Target is essentially Normal + Missing (because Missing = Target - Normal)
        const target = normal + missing;

        return {
            name: `${date.getDate()}`, // Just the day number
            fullDate: formatDate(log.work_date),
            normal: normal,
            overtime: (log.overtime_seconds || 0) / 3600,
            break: (log.break_seconds || 0) / 3600,
            missing: missing,
            target: target > 0 ? target : null, // Only show target if there was an expectation
            isWeekend: date.getDay() === 0 || date.getDay() === 6
        };
    });

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs z-50 min-w-[150px]">
                    <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">{dataPoint.fullDate}</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Hedef:</span>
                            <span className="font-mono font-bold">{dataPoint.target ? dataPoint.target.toFixed(1) : '0.0'} sa</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                            <span>Normal:</span>
                            <span className="font-mono font-bold">{dataPoint.normal.toFixed(1)} sa</span>
                        </div>
                        {dataPoint.overtime > 0 && (
                            <div className="flex justify-between text-blue-600">
                                <span>Fazla Mesai:</span>
                                <span className="font-mono font-bold">{dataPoint.overtime.toFixed(1)} sa</span>
                            </div>
                        )}
                        {dataPoint.break > 0 && (
                            <div className="flex justify-between text-amber-500">
                                <span>Mola:</span>
                                <span className="font-mono font-bold">{dataPoint.break.toFixed(1)} sa</span>
                            </div>
                        )}
                        {dataPoint.missing > 0 && (
                            <div className="flex justify-between text-red-500">
                                <span>Eksik:</span>
                                <span className="font-mono font-bold">{dataPoint.missing.toFixed(1)} sa</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Günlük Çalışma Detayı</h3>
                    <p className="text-sm text-slate-500">Normal Çalışma, Ek Mesai ve Mola Dağılımı</p>
                </div>
                {/* Legend helper */}
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Normal</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Mesai</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-400 rounded-sm"></span> Mola</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-1 bg-red-400 rounded-sm"></span> Hedef</div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barGap={2}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />

                        {/* Target Line - Should be on top? Render order matters. Last is top. */}

                        <Bar dataKey="normal" stackId="work" fill="#10B981" radius={[0, 0, 4, 4]} barSize={12} />
                        <Bar dataKey="overtime" stackId="work" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={12} />

                        {/* Separate Bar for Break */}
                        <Bar dataKey="break" stackId="break" fill="#FBBF24" radius={[4, 4, 4, 4]} barSize={12} />

                        <Line type="step" dataKey="target" stroke="#F87171" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PersonalAttendanceChart;
