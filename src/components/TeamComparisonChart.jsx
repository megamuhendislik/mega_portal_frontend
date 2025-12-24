import React from 'react';

const TeamComparisonChart = ({ data }) => {
    // Expect data = [{ label: 'Ahmet Y.', value: 120, color: 'blue' }, ...]

    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid div by zero

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Ekip Çalışma Süreleri (Bu Ay)</h3>
            <div className="space-y-4">
                {data.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-slate-700">{item.label}</span>
                            <span className="text-slate-900 font-bold">{Math.floor(item.value / 60)}s {item.value % 60}dk</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ease-out`}
                                style={{
                                    width: `${(item.value / maxValue) * 100}%`,
                                    backgroundColor: item.color || '#3b82f6'
                                }}
                            />
                        </div>
                    </div>
                ))}
                {data.length === 0 && (
                    <div className="text-center text-slate-400 py-4">Veri yok.</div>
                )}
            </div>
        </div>
    );
};

export default TeamComparisonChart;
