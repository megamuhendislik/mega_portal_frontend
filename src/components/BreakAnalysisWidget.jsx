import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Coffee, Clock } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

const BreakAnalysisWidget = ({ logs, totalBreakSeconds }) => {

    // Process logs for the chart
    const data = logs.map(log => ({
        name: new Date(log.work_date).getDate(),
        fullDate: formatDate(log.work_date),
        minutes: Math.floor((log.break_seconds || 0) / 60)
    }));

    // Calculate Average
    const validDays = data.filter(d => d.minutes > 0).length;
    const totalMinutes = Math.floor((totalBreakSeconds || 0) / 60);
    const avgMinutes = validDays > 0 ? Math.round(totalMinutes / validDays) : 0;

    // Format Total as Hours:Minutes
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-amber-100 shadow-xl rounded-xl text-xs z-50">
                    <p className="font-bold text-slate-800 mb-1">{item.fullDate}</p>
                    <div className="flex items-center gap-2 text-amber-600 font-bold">
                        <Coffee size={14} />
                        <span>{item.minutes} dk Mola</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Coffee size={80} />
            </div>

            <div className="flex justify-between items-start mb-6 z-10">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                            <Coffee size={18} />
                        </div>
                        Mola Analizi
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 pl-1">Günlük mola kullanım trendleri</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 z-10">
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                    <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wide mb-1">AYLIK TOPLAM</p>
                    <div className="text-2xl font-black text-amber-600 leading-none">
                        {totalH}<span className="text-sm font-bold text-amber-400">sa</span> {totalM}<span className="text-sm font-bold text-amber-400">dk</span>
                    </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">GÜNLÜK ORT.</p>
                    <div className="text-2xl font-black text-slate-700 leading-none">
                        {avgMinutes}<span className="text-sm font-bold text-slate-400">dk</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[150px] z-10" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barGap={2}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                            dy={10}
                            interval={data.length > 20 ? 2 : 0}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FFFBEB' }} />
                        <ReferenceLine y={60} stroke="#FCD34D" strokeDasharray="3 3" />
                        <Bar dataKey="minutes" radius={[4, 4, 4, 4]} barSize={8}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.minutes > 60 ? '#F59E0B' : '#FBBF24'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2 text-[10px] text-center text-slate-300 font-medium">
                *60dk üzeri kullanımlar koyu renkle işaretlenir
            </div>
        </div>
    );
};

export default BreakAnalysisWidget;
