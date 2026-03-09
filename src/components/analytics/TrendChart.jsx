import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
} from 'recharts';
import CustomTooltip from './CustomTooltip';

export default function TrendChart({
  data = [],
  bars = [],
  showComposed = false,
  composedLines = [],
}) {
  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Main stacked bar chart */}
      <div className={showComposed ? 'xl:col-span-2' : 'xl:col-span-3'}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
              iconSize={8}
            />
            {bars.map((bar, idx) => (
              <Bar
                key={idx}
                dataKey={bar.key}
                name={bar.label}
                fill={bar.color}
                stackId="stack"
                radius={
                  idx === bars.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Optional composed chart */}
      {showComposed && composedLines.length > 0 && (
        <div className="xl:col-span-1">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={data}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                iconSize={8}
              />
              {composedLines.map((line, idx) =>
                line.type === 'area' ? (
                  <Area
                    key={idx}
                    type="monotone"
                    dataKey={line.key}
                    name={line.label}
                    fill={line.color}
                    fillOpacity={0.15}
                    stroke={line.color}
                    yAxisId={line.yAxisId || 'left'}
                  />
                ) : (
                  <Line
                    key={idx}
                    type="monotone"
                    dataKey={line.key}
                    name={line.label}
                    stroke={line.color}
                    strokeWidth={2}
                    dot={false}
                    yAxisId={line.yAxisId || 'left'}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
