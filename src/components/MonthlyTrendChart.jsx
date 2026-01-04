import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/dateUtils';

const MonthlyTrendChart = ({ logs }) => {

    // Calculate cumulative or just pure daily trend?
    // User asked for "Line Chart". Daily fluctuations are good.
    const data = logs.map(log => ({
        name: new Date(log.work_date).getDate(),
        fullDate: formatDate(log.work_date),
        hours: (log.total_seconds || 0) / 3600
    }));

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Aylık Çalışma Trendi</h3>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="hours"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorHours)"
                            name="Saat"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlyTrendChart;
