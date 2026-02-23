import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Trophy } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const TeamComparisonChart = ({ data }) => {
    const isMobile = useIsMobile();
    // Sort by Actual descending for leaderboard feel
    const sortedData = [...data]
        .sort((a, b) => b.actual - a.actual)
        .slice(0, 10) // Top 10 only if many users
        .map(item => ({
            ...item,
            // Format name with proper spacing
            name: item.name.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ')
        }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const percent = item.target > 0 ? ((item.actual / item.target) * 100).toFixed(0) : 0;
            const isMet = percent >= 100;

            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-100 shadow-xl rounded-xl text-xs z-50 min-w-0 md:min-w-[140px]">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-50 pb-1">{item.name}</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline gap-3">
                            <span className="text-slate-500">Hedef:</span>
                            <span className="font-semibold text-slate-700">{item.target.toFixed(1)} sa</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-3">
                            <span className="text-slate-500">Çalışma:</span>
                            <span className="font-bold text-indigo-600">{item.actual.toFixed(1)} sa</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100">
                            <div className={`flex justify-between items-baseline ${isMet ? 'text-emerald-600' : 'text-amber-600'}`}>
                                <span className="text-xs font-medium">İlerleme</span>
                                <span className="text-lg font-bold">%{percent}</span>
                            </div>
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
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Trophy size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800">Liderlik Tablosu</h3>
                    <p className="text-[10px] text-slate-400 font-medium">En yüksek çalışma saatine göre sıralı (Top 10)</p>
                </div>
            </div>

            <div className="w-full h-[300px] md:h-[500px] min-h-[250px] md:min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <BarChart
                        layout="vertical"
                        data={sortedData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        barGap={-24}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={isMobile ? 70 : 140}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: '#475569', fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />

                        {/* Background Target Bar (Ghost Bar) */}
                        <Bar dataKey="target" data={sortedData} barSize={24} radius={[0, 6, 6, 0]} fill="#F1F5F9" />

                        {/* Foreground Actual Bar with Gradient */}
                        <Bar dataKey="actual" barSize={16} radius={[0, 4, 4, 0]}>
                            {sortedData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.actual >= entry.target ? '#10B981' : '#6366F1'}
                                    fillOpacity={0.9}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TeamComparisonChart;
