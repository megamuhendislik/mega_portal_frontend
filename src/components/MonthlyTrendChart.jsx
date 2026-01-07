import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
                <div className="bg-white/90 backdrop-blur-md p-4 border border-blue-100 shadow-xl rounded-xl text-xs z-50 min-w-[150px]">
                    <p className="font-bold text-slate-800 mb-2 border-b border-blue-50 pb-2">{dataPoint.fullDate}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-blue-600">
                            <span className="font-medium">Normal</span>
                            <span className="font-bold bg-blue-50 px-2 py-0.5 rounded-full">{dataPoint.normal.toFixed(1)} sa</span>
                        </div>
                        {dataPoint.overtime > 0 && (
                            <div className="flex justify-between items-center text-amber-500">
                                <span className="font-medium">Fazla Mesai</span>
                                <span className="font-bold bg-amber-50 px-2 py-0.5 rounded-full">{dataPoint.overtime.toFixed(1)} sa</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-50 mt-1">
                            <span className="font-bold">Toplam</span>
                            <span className="font-black text-slate-700">{(dataPoint.normal + dataPoint.overtime).toFixed(1)} sa</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Activity size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Aylık Trend</h3>
                    <p className="text-xs text-slate-400 font-medium">Günlük çalışma yoğunluğu ve mesai dağılımı</p>
                </div>
            </div>

            <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOvertime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="normal"
                            stackId="1"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fill="url(#colorNormal)"
                        />
                        <Area
                            type="monotone"
                            dataKey="overtime"
                            stackId="1"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            fill="url(#colorOvertime)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlyTrendChart;
