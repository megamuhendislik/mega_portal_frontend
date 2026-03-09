import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import CustomTooltip from './CustomTooltip';

const BAR_COLORS = {
  Talep: '#6366f1',
  Onay: '#10b981',
  Gun: '#f59e0b',
};

export default function LeaveTypeBreakdown({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={Math.max(data.length * 50, 200)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="Talep"
            fill={BAR_COLORS.Talep}
            radius={[0, 4, 4, 0]}
            name="Talep"
          />
          <Bar
            dataKey="Onay"
            fill={BAR_COLORS.Onay}
            radius={[0, 4, 4, 0]}
            name="Onay"
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Detail cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-gray-50 border border-gray-100"
          >
            <p className="text-xs font-medium text-gray-700 mb-1.5 truncate">
              {item.name}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-indigo-600 font-medium">
                {item.Talep || 0} talep
              </span>
              <span className="text-emerald-600 font-medium">
                {item.Onay || 0} onay
              </span>
              {item.Gun != null && (
                <span className="text-amber-600 font-medium">
                  {item.Gun} gun
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
