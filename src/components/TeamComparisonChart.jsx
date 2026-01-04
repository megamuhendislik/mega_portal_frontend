import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const TeamComparisonChart = ({ data }) => {
    // data = [{ name: 'Ahmet', actual: 120, target: 144, overtime: 0 }]

    // Sort by Actual descending for leaderboard feel
    const sortedData = [...data].sort((a, b) => b.actual - a.actual);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // payload[0] is often the top bar (Actual)
            const item = payload[0].payload;
            const percent = item.target > 0 ? ((item.actual / item.target) * 100).toFixed(0) : 0;

            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50">
                    <p className="font-bold text-slate-800 mb-1">{item.name}</p>
                    <div className="space-y-1">
                        <p className="text-slate-500">Hedef: <span className="font-medium text-slate-700">{item.target.toFixed(1)} sa</span></p>
                        <p className="text-blue-600">Gerçekleşen: <span className="font-bold">{item.actual.toFixed(1)} sa</span></p>
                        <p className={`font-bold ${percent >= 100 ? 'text-emerald-500' : 'text-orange-500'}`}>
                            İlerleme: %{percent}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Ekip Performansı (Saat)</h3>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={sortedData}
                        margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                        barGap={-16} // Overlay bars
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={100}
                            tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                        {/* Background Target Bar */}
                        <Bar dataKey="target" name="Hedef" data={sortedData} barSize={20} radius={[0, 4, 4, 0]} fill="#F1F5F9" />

                        {/* Foreground Actual Bar */}
                        <Bar dataKey="actual" name="Gerçekleşen" barSize={12} radius={[0, 4, 4, 0]}>
                            {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.actual >= entry.target ? '#10B981' : '#3B82F6'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TeamComparisonChart;
