import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import UpcomingEventsCard from '../components/UpcomingEventsCard';
import WeeklyAttendanceChart from '../components/WeeklyAttendanceChart';
import MonthlyPerformanceSummary from '../components/MonthlyPerformanceSummary';
import BreakAnalysisWidget from '../components/BreakAnalysisWidget';
import StatCard from '../components/StatCard';
import Skeleton from '../components/Skeleton';
import { Clock, Briefcase, Timer, FileText, CheckCircle2, ChefHat, Calendar as CalendarIcon, Zap, Coffee, Scale, User, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';

const Dashboard = () => {
    const { user } = useAuth();

    // Loading States
    const [loading, setLoading] = useState(true);

    // Data States
    const [todaySummary, setTodaySummary] = useState(null);
    const [monthlySummary, setMonthlySummary] = useState(null);
    const [logs, setLogs] = useState([]); // For charts
    const [myRequests, setMyRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);

    // UI States
    const [requestTab, setRequestTab] = useState('my_requests');

    // Helper: Period Calc
    const getPeriodDates = () => {
        const t = new Date();
        const y = t.getFullYear();
        const m = t.getMonth();
        let start, end;
        if (t.getDate() >= 26) {
            start = new Date(y, m, 26);
            end = m === 11 ? new Date(y + 1, 0, 25) : new Date(y, m + 1, 25);
        } else {
            start = m === 0 ? new Date(y - 1, 11, 26) : new Date(y, m - 1, 26);
            end = new Date(y, m, 25);
        }
        return { startStr: start.toISOString().split('T')[0], endStr: end.toISOString().split('T')[0] };
    };

    const fetchDashboardData = async () => {
        const employeeId = user?.employee?.id || user?.id;
        if (!employeeId) { setLoading(false); return; }

        try {
            const { startStr, endStr } = getPeriodDates();

            const [todayRes, monthRes, logsRes, reqRes, incReqRes, eventsRes] = await Promise.allSettled([
                api.get('/attendance/today_summary/'),
                api.get(`/attendance/monthly_summary/?start_date=${startStr}&end_date=${endStr}&employee_id=${employeeId}`),
                api.get(`/attendance/my_attendance/?start_date=${startStr}&end_date=${endStr}`), // Need logs for charts
                api.get('/leave-requests/'), // Simplified: just getting my leaves for now
                api.get('/leave-requests/pending_approvals/'),
                api.get(`/calendar-events/?start=${format(new Date(), 'yyyy-MM-dd')}&end=${format(addDays(new Date(), 7), 'yyyy-MM-dd')}&employee_id=${employeeId}`)
            ]);

            if (todayRes.status === 'fulfilled') setTodaySummary(todayRes.value.data);
            if (monthRes.status === 'fulfilled') setMonthlySummary(monthRes.value.data);
            if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data);

            // Requests
            if (reqRes.status === 'fulfilled' && reqRes.value.data.results) {
                setMyRequests(reqRes.value.data.results.slice(0, 5));
            }
            if (incReqRes.status === 'fulfilled' && incReqRes.value.data.results) {
                setIncomingRequests(incReqRes.value.data.results.slice(0, 5));
            }

            if (eventsRes.status === 'fulfilled') {
                const results = eventsRes.value.data.results || eventsRes.value.data || [];
                setCalendarEvents(results);
            }

        } catch (error) {
            console.error("Dashboard Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    // Format Helpers
    const formatHours = (sec) => ((sec || 0) / 3600).toFixed(1);
    const formatMin = (sec) => Math.floor((sec || 0) / 60);

    // Request Item Component
    const RequestItem = ({ req }) => {
        const statusColors = {
            'APPROVED': 'bg-emerald-100 text-emerald-700',
            'PENDING': 'bg-amber-100 text-amber-700',
            'REJECTED': 'bg-red-100 text-red-700',
        };
        const statusLabels = { 'APPROVED': 'Onaylandı', 'PENDING': 'Bekliyor', 'REJECTED': 'Red' };

        return (
            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 mb-1">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={14} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">{req.request_type_name || 'Talep'}</p>
                        <p className="text-xs text-slate-500">{format(new Date(req.start_date || req.created_at), 'd MMM', { locale: tr })}</p>
                    </div>
                </div>
                <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-bold", statusColors[req.status] || 'bg-slate-100 text-slate-500')}>
                    {statusLabels[req.status] || req.status}
                </span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto space-y-8 pb-10 px-4 md:px-8 pt-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">
                        <span className="block text-lg font-bold text-indigo-600 mb-0.5">Hoş Geldiniz,</span>
                        {user?.first_name || 'Kullanıcı'}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Son Giriş</span>
                            <span className="text-sm font-bold text-slate-700">
                                {todaySummary?.last_check_in ? format(new Date(todaySummary.last_check_in), 'HH:mm') : '--:--'}
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Daily Stats Grid (From Today Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="BUGÜN ÇALIŞMA"
                    value={`${formatHours(todaySummary?.total_worked)} sa`}
                    subValue={`Hedef: ${formatHours(todaySummary?.daily_expected)} sa`}
                    icon={Briefcase}
                    color="indigo"
                />
                <StatCard
                    title="BUGÜN MOLA"
                    value={`${formatMin(todaySummary?.break_used)} dk`}
                    subValue={`Hak: ${todaySummary?.remaining_break !== undefined ? formatMin(todaySummary?.remaining_break + todaySummary?.break_used) : 60} dk`}
                    icon={Coffee}
                    color="amber"
                />
                <StatCard
                    title="ANLIK FAZLA MESAİ"
                    value={`${formatMin(todaySummary?.current_overtime)} dk`}
                    subLabel="Onaylanmış/Bekleyen"
                    icon={Zap}
                    color="emerald"
                />
                <StatCard
                    title="AYLIK NET DURUM"
                    value={`${monthlySummary?.net_balance_seconds > 0 ? '+' : ''}${formatHours(monthlySummary?.net_balance_seconds)} sa`}
                    subValue="Toplam Denge"
                    trend={monthlySummary?.net_balance_seconds >= 0 ? 'up' : 'down'}
                    icon={Scale}
                    color={monthlySummary?.net_balance_seconds >= 0 ? 'emerald' : 'rose'}
                />
            </div>

            {/* 2. Main Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Weekly Chart (8 cols) */}
                <div className="xl:col-span-8 h-[420px]">
                    <WeeklyAttendanceChart logs={logs} />
                </div>

                {/* Activity / Requests (4 Cols) - Moved up from bottom */}
                <div className="xl:col-span-4 h-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <FileText size={20} className="text-indigo-500" />
                            Son Aktiviteler
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 max-h-[300px]">
                        {requestTab === 'my_requests' ? (
                            myRequests.length > 0 ? myRequests.map((r, i) => <RequestItem key={i} req={r} />) : <p className="text-slate-400 text-sm text-center py-4">Talep bulunamadı.</p>
                        ) : (
                            incomingRequests.length > 0 ? incomingRequests.map((r, i) => <RequestItem key={i} req={r} />) : <p className="text-slate-400 text-sm text-center py-4">Onay bekleyen talep yok.</p>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                            <CalendarIcon size={16} className="text-emerald-500" />
                            Yaklaşan Etkinlikler
                        </h4>
                        <div className="space-y-2">
                            {calendarEvents.slice(0, 2).map((ev, i) => (
                                <div key={i} className="text-xs bg-slate-50 p-2 rounded border border-slate-100 flex justify-between">
                                    <span className="font-bold text-slate-600">{ev.title}</span>
                                    <span className="text-slate-400">{format(new Date(ev.start), 'd MMM')}</span>
                                </div>
                            ))}
                            {calendarEvents.length === 0 && <p className="text-xs text-slate-400">Etkinlik yok.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Bottom: Monthly Summary (Full Width) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <ArrowUpRight size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Aylık Performans Özeti</h3>
                </div>
                <MonthlyPerformanceSummary logs={logs} periodSummary={monthlySummary} />
            </div>
        </div>
    );
};

export default Dashboard;
