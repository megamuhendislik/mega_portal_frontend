import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { formatDate } from '../utils/dateUtils';

const PersonalAttendanceChart = ({ logs }) => {
    // Transform logs to chart data
    const data = logs.map(log => {
        const date = new Date(log.work_date);
        return {
            name: `${date.getDate()}`, // Just the day number
            fullDate: formatDate(log.work_date),
            normal: (log.normal_seconds || 0) / 3600,
            overtime: (log.overtime_seconds || 0) / 3600,
            missing: (log.missing_seconds || 0) / 3600,
            isWeekend: date.getDay() === 0 || date.getDay() === 6
        };
    });

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
                    <p className="font-bold text-slate-700 mb-2">{dataPoint.fullDate}</p>
                    <div className="space-y-1">
                        <p className="text-emerald-600">Normal: {dataPoint.normal.toFixed(1)} sa</p>
                        {dataPoint.overtime > 0 && (
                            <p className="text-blue-600">Fazla Mesai: {dataPoint.overtime.toFixed(1)} sa</p>
                        )}
                        {dataPoint.missing > 0 && (
                            <p className="text-red-500">Eksik: {dataPoint.missing.toFixed(1)} sa</p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Günlük Çalışma Detayı</h3>
                    <p className="text-sm text-slate-500">Bu ayki günlük çalışma süreleriniz (Normal + Fazla Mesai)</p>
                </div>
                {/* Legend helper */}
                <div className="flex gap-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Normal</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Mesai</div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barSize={12}
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
                        <ReferenceLine y={9} stroke="#CBD5E1" strokeDasharray="3 3" label={{ value: 'Standart (9sa)', position: 'insideTopRight', fill: '#94A3B8', fontSize: 10 }} />

                        <Bar dataKey="normal" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="overtime" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PersonalAttendanceChart;
