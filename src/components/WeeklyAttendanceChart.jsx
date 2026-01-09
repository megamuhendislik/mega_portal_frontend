import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

const WeeklyAttendanceChart = ({ logs }) => {

    const data = useMemo(() => {
        // Sort logs by date
        const sortedLogs = [...logs].sort((a, b) => new Date(a.work_date) - new Date(b.work_date));

        // Map directly to Days (1 Day = 1 Bar)
        return sortedLogs.map(log => {
            const date = new Date(log.work_date);
            // Turkish Date Format: "9 Oca"
            const label = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

            return {
                name: label,
                fullDate: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }),
                normal: (log.normal_seconds || 0) / 3600,
                overtime: (log.overtime_seconds || 0) / 3600,
                missing: (log.missing_seconds || 0) / 3600
            };
        });
    }, [logs]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200 shadow-xl rounded-xl text-xs z-50 min-w-[180px]">
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
                        <p className="text-xs text-slate-400 font-medium">Çalışma, ek mesai ve eksik gün analizi.</p>
                    </div>
                </div>
                {/* Legend */}
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Normal</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Ek</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Eksik</div>
                </div>
            </div>

            <div className="flex-1 min-h-[250px] w-full" style={{ minWidth: 0 }}>
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barSize={32}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
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

                            {/* Stacked Bars */}
                            <Bar dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="overtime" stackId="a" fill="#10b981" />
                            <Bar dataKey="missing" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <Calendar size={48} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">Görüntülenecek veri yok</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeeklyAttendanceChart;
