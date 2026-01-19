import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDate } from '../utils/dateUtils';
import { Activity } from 'lucide-react';

const MonthlyTrendChart = ({ logs }) => {

    const data = logs.map(log => ({
        name: new Date(log.work_date).getDate(),
        fullDate: formatDate(log.work_date),
        normal: (log.normal_seconds || 0) / 3600,
        overtime: (log.overtime_seconds || 0) / 3600,
    }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-4 border border-indigo-100 shadow-xl rounded-xl text-xs z-50 min-w-[150px]">
                    <p className="font-bold text-slate-800 mb-3 border-b border-indigo-50 pb-2">{dataPoint.fullDate}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-blue-600">
                            <span className="font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Normal
                            </span>
                            <span className="font-bold font-mono text-sm">{dataPoint.normal.toFixed(1)} sa</span>
                        </div>
                        {dataPoint.overtime > 0 && (
                            <div className="flex justify-between items-center text-emerald-600">
                                <span className="font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Fazla Mesai
                                </span>
                                <span className="font-bold font-mono text-sm">+{dataPoint.overtime.toFixed(1)} sa</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-100 mt-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider">Toplam</span>
                            <span className="font-black text-slate-800 text-sm">{(dataPoint.normal + dataPoint.overtime).toFixed(1)} sa</span>
                        </div>
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
                        <Activity size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">Aylık Trend</h3>
                        <p className="text-xs text-slate-400 font-medium">Günlük çalışma saatleri ve mesai değişimi</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-1 rounded-full bg-blue-500"></div>Normal</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-1 rounded-full bg-emerald-500"></div>Ek Mesai</div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                            dy={10}
                            interval={2} // Show every 2nd day to avoid clutter
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' }} />

                        <Line
                            type="monotone"
                            dataKey="normal"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ r: 0, strokeWidth: 0, fill: '#3B82F6' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3B82F6' }}
                            isAnimationActive={true}
                        />
                        <Line
                            type="monotone"
                            dataKey="overtime"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ r: 0, strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }}
                            isAnimationActive={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlyTrendChart;
