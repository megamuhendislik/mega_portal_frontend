import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

const WeeklyAttendanceChart = ({ logs }) => {

    const data = useMemo(() => {
        const weeks = {};
        // Sort logs by date first to ensure order
        const sortedLogs = [...logs].sort((a, b) => new Date(a.work_date) - new Date(b.work_date));

        sortedLogs.forEach(log => {
            const date = new Date(log.work_date);
            const day = date.getDay();
            // Calculate Monday of the week
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date);
            monday.setDate(diff); // Use monday as date object

            // Format: "Week 4" or "Hafta 4"
            // Let's use Week Number of Year or Month. For simplicity: "dd MMM" start date
            const key = monday.toISOString().split('T')[0];
            const label = `Hafta ${Math.ceil(monday.getDate() / 7)}`; // Rough "Week of Month"

            if (!weeks[key]) {
                weeks[key] = {
                    name: label,
                    fullDate: monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                    total: 0,
                    overtime: 0
                };
            }

            const total = (log.total_seconds || 0) / 3600;
            const ot = (log.overtime_seconds || 0) / 3600;

            weeks[key].total += total;
            weeks[key].overtime += ot;
        });

        return Object.values(weeks);
    }, [logs]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white/90 backdrop-blur-md p-4 border border-violet-100 shadow-xl rounded-xl text-xs z-50 min-w-[160px]">
                    <p className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <Calendar size={14} className="text-violet-500" />
                        {dataPoint.fullDate} Başlangıçlı
                    </p>
                    <div className="space-y-2 mt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Toplam Çalışma</span>
                            <span className="text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full">
                                {dataPoint.total.toFixed(1)} sa
                            </span>
                        </div>
                        {dataPoint.overtime > 0 && (
                            <div className="flex justify-between items-center text-amber-600">
                                <span className="font-medium">Fazla Mesai</span>
                                <span className="font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                                    +{dataPoint.overtime.toFixed(1)} sa
                                </span>
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
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                    <TrendingUp size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">Haftalık Performans</h3>
                    <p className="text-xs text-slate-400 font-medium">Haftalara göre toplam çalışma saati</p>
                </div>
            </div>

            <div className="flex-1 min-h-[250px] w-full">
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
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
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8B5CF6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#8B5CF6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#7C3AED' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <TrendingUp size={32} className="mb-2 opacity-50" />
                        <span className="text-sm">Veri bulunamadı.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeeklyAttendanceChart;
