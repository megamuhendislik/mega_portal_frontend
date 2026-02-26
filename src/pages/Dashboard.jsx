import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import useSmartPolling from '../hooks/useSmartPolling'; // Import Hook
import UpcomingEventsCard from '../components/UpcomingEventsCard';

import AttendanceAnalyticsChart from '../components/AttendanceAnalyticsChart';
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
        return {
            startStr: format(start, 'yyyy-MM-dd'),
            endStr: format(end, 'yyyy-MM-dd')
        };
    };

    const fetchDashboardData = async () => {
        // Align with Attendance.jsx: use user.employee.id if available
        const employeeId = user?.employee?.id || user?.id;

        if (!employeeId) { setLoading(false); return; }

        try {
            // NOTE: For Smart Polling, we might want to skip setting 'loading' to true on subsequent fetches?
            // Currently fetchDashboardData sets loading=false at end, but doesn't set it to true at start (except initial state).
            // So it's safe for background polling (won't flash skeleton).

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
                // Filter out standard Attendance logs unless abnormal? No, just show Agenda items.
                // Prioritize PERSONAL, HOLIDAY only (User requested to exclude REQUESTS from this view)
                const agendaItems = results.filter(e => ['PERSONAL', 'HOLIDAY'].includes(e.type));

                // Sort by start date
                agendaItems.sort((a, b) => new Date(a.start) - new Date(b.start));

                setCalendarEvents(agendaItems);
            }

        } catch (error) {
            console.error("Dashboard Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    // Smart Polling (Every 30s)
    useSmartPolling(fetchDashboardData, 30000);

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
                        <p className="text-xs text-slate-500">{(req.start_date || req.created_at) ? format(new Date(req.start_date || req.created_at), 'd MMM', { locale: tr }) : '-'}</p>
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
            <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-800">
                        <span className="block text-lg font-bold text-indigo-600 mb-0.5">Hoş Geldiniz,</span>
                        {user?.first_name || 'Kullanıcı'}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Son Giriş</span>
                            <span className="text-sm font-bold text-slate-700">
                                {todaySummary?.check_in || 'Giriş Yok'}
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 1. Daily Stats Grid (From Today Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
                    subValue={`Hak: ${formatMin(todaySummary?.break_allowance || 0)} dk`}
                    icon={Coffee}
                    color="amber"
                />
                <StatCard
                    title="ANLIK FAZLA MESAİ"
                    value={`${formatMin(todaySummary?.current_overtime)} dk`}
                    subValue={`Onay: ${formatMin(todaySummary?.overtime_approved)} / Bekl: ${formatMin(todaySummary?.overtime_pending)} / Taslak: ${formatMin(todaySummary?.current_overtime - (todaySummary?.overtime_approved || 0) - (todaySummary?.overtime_pending || 0))} dk`}
                    icon={Zap}
                    color="emerald"
                />

                {/* 4. Annual Leave StatCard (Revamp) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-all duration-300 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">YILLIK İZİN DURUMU</p>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                            <Briefcase size={20} />
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                                {monthlySummary?.annual_leave_balance || 0}
                            </span>
                            <span className="text-xs font-bold text-slate-400 ml-1">GÜN</span>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                Bu Yıl Kullanılan: <span className="text-amber-600 font-bold">{monthlySummary?.annual_leave_used_this_year || 0} Gün</span>
                            </p>
                        </div>

                        <div className="text-right">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">SIRADAKİ İZİN</span>
                                {monthlySummary?.next_leave_request ? (
                                    <div className="text-right">
                                        <span className="block text-sm font-bold text-blue-600">
                                            {monthlySummary.next_leave_request.start_date.split('-').slice(1).reverse().join('.')}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {monthlySummary.next_leave_request.total_days} Gün
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-slate-300">-</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar for Next Accrual */}
                    {monthlySummary?.days_to_next_accrual !== undefined ? (
                        <div className="pt-3 border-t border-slate-50">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase">YILLIK İZİN YENİLEMESİNE KALAN</span>
                                <span className="text-[10px] font-bold text-indigo-600">{monthlySummary.days_to_next_accrual} Gün</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${Math.max(0, Math.min(100, (365 - monthlySummary.days_to_next_accrual) / 365 * 100))}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="pt-3 border-t border-slate-50">
                            <span className="text-[10px] text-slate-400 italic">İşe giriş tarihi eksik.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Main Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">


                {/* Main Chart (8 cols) */}
                <div className="xl:col-span-8 h-[280px] md:h-[420px]">
                    <AttendanceAnalyticsChart
                        logs={logs}
                        employeeId={user?.id}
                        currentYear={new Date().getFullYear()}
                    />
                </div>

                {/* Activity / Requests (4 Cols) - Moved up from bottom */}
                <div className="xl:col-span-4 h-[280px] md:h-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col">
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
                            {calendarEvents.slice(0, 4).map((ev, i) => (
                                <div key={i} className="text-xs bg-slate-50 p-2 rounded border border-slate-100 flex justify-between">
                                    <span className="font-bold text-slate-600 truncate max-w-[150px]" title={ev.title}>{ev.title}</span>
                                    <span className="text-slate-400 shrink-0">{ev.start ? format(new Date(ev.start), 'd MMM') : '-'}</span>
                                </div>
                            ))}
                            {calendarEvents.length === 0 && <p className="text-xs text-slate-400">Etkinlik yok.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Bottom: Monthly Summary (Full Width) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
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
