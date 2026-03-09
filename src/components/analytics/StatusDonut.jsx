import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import CustomTooltip from './CustomTooltip';

export default function StatusDonut({
  data = [],
  title,
  centerLabel,
  centerSubLabel,
}) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  const displayCenter = centerLabel !== undefined ? centerLabel : total;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Chart */}
      <div className="relative w-[200px] h-[200px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color || '#6366f1'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-800">
            {typeof displayCenter === 'number'
              ? displayCenter.toLocaleString('tr-TR')
              : displayCenter}
          </span>
          {centerSubLabel && (
            <span className="text-xs text-gray-500">{centerSubLabel}</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {title && (
          <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
        )}
        {data.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color || '#6366f1' }}
            />
            <span className="text-sm text-gray-600">{entry.name}</span>
            <span className="text-sm font-semibold text-gray-800 ml-auto">
              {typeof entry.value === 'number'
                ? entry.value.toLocaleString('tr-TR')
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
