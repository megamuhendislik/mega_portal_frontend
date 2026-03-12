import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { HeartPulse, Stethoscope, Calendar } from 'lucide-react';
import CustomTooltip from './CustomTooltip';

export default function HealthReportSection({ stats }) {
  if (!stats || stats.total === 0) return null;

  const hospitalCount =
    stats.by_type?.find(
      (t) => t.name === 'HOSPITAL_VISIT' || t.type === 'HOSPITAL_VISIT'
    )?.count || 0;

  const kpiCards = [
    {
      label: 'Toplam Rapor',
      value: stats.total || 0,
      icon: HeartPulse,
      bg: 'bg-pink-50',
      text: 'text-pink-600',
    },
    {
      label: 'Hastane Ziyareti',
      value: hospitalCount,
      icon: Stethoscope,
      bg: 'bg-violet-50',
      text: 'text-violet-600',
    },
    {
      label: 'Toplam Gun',
      value: stats.total_days || 0,
      icon: Calendar,
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
  ];

  const hasDeptData = stats.by_department && stats.by_department.length > 0;
  const hasTrend = stats.monthly_trend && stats.monthly_trend.length > 0;

  return (
    <div className="space-y-4">
      {/* Mini KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}
              >
                <Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-lg font-bold text-gray-800">
                  {card.value.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department breakdown */}
        {hasDeptData && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Departman Dağılımı
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats.by_department}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
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
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Rapor"
                  fill="#ec4899"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly trend */}
        {hasTrend && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Aylik Trend
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={stats.monthly_trend}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Rapor"
                  fill="#ec4899"
                  fillOpacity={0.15}
                  stroke="#ec4899"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
