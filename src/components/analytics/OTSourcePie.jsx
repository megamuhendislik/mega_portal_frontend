import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import CustomTooltip from './CustomTooltip';

const SOURCE_CONFIG = {
  intended: { color: '#10b981', label: 'Planli' },
  potential: { color: '#f59e0b', label: 'Planlanmamis' },
  manual: { color: '#ef4444', label: 'Manuel Giris' },
};

export default function OTSourcePie({ data }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => {
    const cfg = SOURCE_CONFIG[d.key || d.name?.toLowerCase()] || {};
    return {
      name: cfg.label || d.name || d.key,
      value: d.value || d.count || 0,
      color: cfg.color || d.color || '#6366f1',
    };
  });

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Doughnut */}
      <div className="relative w-[180px] h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-gray-800">
            {total.toLocaleString('tr-TR')}
          </span>
          <span className="text-xs text-gray-500">Toplam</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5">
        {chartData.map((entry, idx) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
              <span className="text-sm font-semibold text-gray-800 ml-auto">
                {entry.value.toLocaleString('tr-TR')}
              </span>
              <span className="text-xs text-gray-400">(%{pct})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
