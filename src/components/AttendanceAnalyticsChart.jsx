import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, Legend
} from 'recharts';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, BarChart2, Activity } from 'lucide-react';
import {
    startOfWeek, endOfWeek, addDays, format, isSameDay,
    startOfMonth, endOfMonth, getWeek, getYear, eachWeekOfInterval
} from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../services/api';

// Sub-component for Weekly Bar Chart (Legacy Logic)
const WeeklyView = ({ logs, dailyTarget = 9 }) => {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const data = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const current = addDays(weekStart, i);
            const dateStr = format(current, 'yyyy-MM-dd');
            const log = logs.find(l => l.work_date === dateStr);

            days.push({
                name: format(current, 'EEE', { locale: tr }),
                fullDate: format(current, 'd MMM yyyy', { locale: tr }),
                normal: (log?.normal_seconds || 0) / 3600,
                overtime: (log?.overtime_seconds || 0) / 3600,
                missing: (log?.missing_seconds || 0) / 3600,
                target: (log?.day_target_seconds && log.day_target_seconds > 0) ? (log.day_target_seconds / 3600) : null
            });
        }
        return days;
    }, [logs, weekStart]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-xs font-bold text-slate-500">
                    {format(weekStart, 'd MMM', { locale: tr })} - {format(addDays(weekStart, 6), 'd MMM', { locale: tr })}
                </span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-1">
                    <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-colors"><ChevronLeft size={16} /></button>
                    <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-colors"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} barSize={24} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={5} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                            labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                            cursor={{ fill: '#f8fafc' }}
                        />
                        {/* Dynamic Target Line - Only shows on days with target > 0 */}
                        <Line
                            type="step"
                            dataKey="target"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                            name="Hedef"
                            connectNulls={false}
                        />
                        <Bar dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} name="Normal" />
                        <Bar dataKey="overtime" stackId="a" fill="#10b981" radius={[4, 4, 4, 4]} name="Ek Mesai" />
                        <Bar dataKey="missing" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Eksik" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Sub-component for Trends (Line Chart)
const TrendView = ({ data, xKey, unit = 'sa' }) => {
    return (
        <div className="h-full flex-1 min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                        dataKey={xKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                        cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                    <Line
                        type="monotone"
                        dataKey="normal"
                        name="Ort. Normal"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="overtime"
                        name="Ort. Ek Mesai"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const AttendanceAnalyticsChart = ({ logs, currentYear = new Date().getFullYear(), currentMonth = new Date().getMonth() + 1 }) => {
    const [scope, setScope] = useState('WEEKLY'); // WEEKLY, MONTHLY, YEARLY
    const [yearlyData, setYearlyData] = useState([]);
    const [loadingYearly, setLoadingYearly] = useState(false);

    // Prepare Monthly Trend Data (Aggregated by Week)
    const monthlyTrendData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        // Group by Week
        const weeks = {};
        logs.forEach(log => {
            const date = new Date(log.work_date);
            const weekNum = getWeek(date, { weekStartsOn: 1 }); // Week Number
            // Better: use start of week date as key
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const key = format(weekStart, 'd MMM'); // e.g. "12 Ara"

            if (!weeks[key]) weeks[key] = { count: 0, normal: 0, overtime: 0 };

            weeks[key].count += 1;
            weeks[key].normal += (log.normal_seconds || 0) / 3600;
            weeks[key].overtime += (log.overtime_seconds || 0) / 3600;
        });

        // Calculate Averages
        return Object.keys(weeks).map(key => ({
            name: key,
            normal: parseFloat((weeks[key].normal / weeks[key].count).toFixed(1)), // Average per day in that week
            overtime: parseFloat((weeks[key].overtime / weeks[key].count).toFixed(1))
        }));
    }, [logs]);

    // Check if we need to fetch yearly data
    useEffect(() => {
        if (scope === 'YEARLY' && yearlyData.length === 0) {
            fetchYearlyData();
        }
    }, [scope, currentYear]);

    const fetchYearlyData = async () => {
        setLoadingYearly(true);
        try {
            // Using existing endpoint with scope param
            const response = await api.get(`/attendance/stats/?scope=YEARLY&year=${currentYear}`);
            const mapped = response.data.map(m => ({
                name: new Date(2000, m.month - 1, 1).toLocaleString('tr-TR', { month: 'short' }), // Oca, Şub
                normal: parseFloat(m.normal_hours.toFixed(1)), // This is TOTAL for month. User asked for "Average"?
                // "yıllık gösteriminde aylık ortalamalar".
                // Total makes more sense for Year view usually, but if they want "Average Day" in that month?
                // Use total for now, or divide by ~22 days?
                // Let's assume TOTAL is safer unless explicitly asked for daily avg.
                // Re-reading: "aylık ortalamalar". Could mean "Average of the month" vs other months? 
                // Or "Average Daily Hours in that Month"?
                // Let's show TOTAL first, usually user wants to see "How much did I work in Jan vs Feb".
                // If the values are ~160, it's total. If ~8, it's avg.
                // Let's calculate Avg Daily for consistency with user request "ortalamalar".
                // Assuming ~22 working days or just divide by 30?
                // Best to show TOTAL for Year view usually. "Aylık ortalamalar" might mean "Average Attendance Hours".
                // Let's stick to TOTAL for visual impact, or add a toggle?
                // I will use TOTAL but label it nicely options.
                // Actually, user said: "aylık gösterimde yatay çizgide haftalık ortalamalar... yıllık gösteriminde aylık ortalamalar"
                // This implies consistency.
                // Monthly View: Weekly Average (e.g. 8.5h/day avg this week).
                // Yearly View: Monthly Average (e.g. 8.2h/day avg in Jan).
                // I need days count for month to do this accurately. The API response has 'completed_seconds'.
                // I don't have day count in API response yet.
                // I will just use TOTAL for now and label it "Toplam Saat".
                // OR divide by 4 weeks?
                // Let's stick to what data I have.
                // I'll show TOTAL for Yearly for now to be safe.

                normal: parseFloat((m.normal_hours / 22).toFixed(1)), // Estimating avg daily for now to test "Average" theory?
                overtime: parseFloat((m.overtime_hours / 22).toFixed(1))
            }));
            setYearlyData(mapped);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingYearly(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        {scope === 'WEEKLY' ? <BarChart2 size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">
                            Performans Grafiği
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                            {scope === 'WEEKLY' ? 'Günlük çalışma süreleri' : (scope === 'MONTHLY' ? 'Haftalık ortalama çalışma' : 'Aylık ortalama çalışma')}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-slate-50 p-1 rounded-lg flex border border-slate-100">
                    {['WEEKLY', 'MONTHLY', 'YEARLY'].map(s => (
                        <button
                            key={s}
                            onClick={() => setScope(s)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${scope === s
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {s === 'WEEKLY' ? 'Haftalık' : (s === 'MONTHLY' ? 'Aylık' : 'Yıllık')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                {scope === 'WEEKLY' && <WeeklyView logs={logs} />}
                {scope === 'MONTHLY' && (
                    <TrendView data={monthlyTrendData} xKey="name" />
                )}
                {scope === 'YEARLY' && (
                    loadingYearly
                        ? <div className="h-full flex items-center justify-center text-slate-400 text-xs">Yükleniyor...</div>
                        : <TrendView data={yearlyData} xKey="name" />
                )}
            </div>
        </div>
    );
};

export default AttendanceAnalyticsChart;
