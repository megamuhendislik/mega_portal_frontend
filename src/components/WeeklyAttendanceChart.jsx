import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WeeklyAttendanceChart = ({ logs }) => {

    // Aggregation Logic: Week 1, Week 2...
    const data = useMemo(() => {
        const weeks = {};

        logs.forEach(log => {
            const date = new Date(log.work_date);
            // Get week number of month (simple approximation)
            // Or just group by ISO week? 
            // Let's group by "Week Starting Mon"

            // Adjust to get Monday
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));
            const key = `Hafta ${Math.ceil(monday.getDate() / 7)}`;

            if (!weeks[key]) {
                weeks[key] = { name: key, total: 0, fullDate: monday.toLocaleDateString('tr-TR') };
            }

            const hours = (log.total_seconds || 0) / 3600;
            weeks[key].total += hours;
        });

        return Object.values(weeks);
    }, [logs]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Haftalık Toplamlar</h3>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Toplam Saat" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeeklyAttendanceChart;
