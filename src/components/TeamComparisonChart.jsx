import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Trophy } from 'lucide-react';

const TeamComparisonChart = ({ data }) => {
    // Sort by Actual descending for leaderboard feel
    const sortedData = [...data]
        .sort((a, b) => b.actual - a.actual)
        .slice(0, 10); // Top 10 only if many users

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const percent = item.target > 0 ? ((item.actual / item.target) * 100).toFixed(0) : 0;
            const isMet = percent >= 100;

            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-100 shadow-xl rounded-xl text-xs z-50 min-w-[140px]">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-50 pb-1">{item.name}</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-slate-500">
                            <span>Hedef:</span>
                            <span className="font-mono font-medium">{item.target.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between text-indigo-600">
                            <span>Gerçekleşen:</span>
                            <span className="font-mono font-bold">{item.actual.toFixed(1)}h</span>
                        </div>
                        <div className={`mt-2 pt-1 font-bold flex justify-between ${isMet ? 'text-emerald-500' : 'text-amber-500'}`}>
                            <span>İlerleme</span>
                            <span>%{percent}</span>
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

            <div className="flex-1 min-h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={sortedData}
                        margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                        barGap={-24}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={90}
                            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
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
