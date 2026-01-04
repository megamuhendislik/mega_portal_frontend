import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import UpcomingEventsCard from '../components/UpcomingEventsCard';
import HeroDailySummary from '../components/HeroDailySummary';
import { Clock, Briefcase, Timer, Activity, FileText, CheckCircle2, ChefHat, Calendar as CalendarIcon, PieChart } from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

const Dashboard = () => {
    const { user } = useAuth();
    console.log("DASHBOARD RENDER - User Object:", user);

    // Loading States
    const [loadingSummaries, setLoadingSummaries] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [loadingCalendar, setLoadingCalendar] = useState(true);

    // Data States
    const [todaySummary, setTodaySummary] = useState(null);
    const [monthlySummary, setMonthlySummary] = useState(null);
    const [monthEvents, setMonthEvents] = useState([]); // For leave/missing counts
    const [myRequests, setMyRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]); // Upcoming

    // UI States
    const [requestTab, setRequestTab] = useState('my_requests');

    // Date Calculations
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const monthStartStr = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEndStr = format(endOfMonth(today), 'yyyy-MM-dd');
    const upcomingStartStr = format(startOfDay(today), 'yyyy-MM-dd');
    const upcomingEndStr = format(endOfDay(addDays(today, 7)), 'yyyy-MM-dd');

    // Custom Interval Hook
    const useInterval = (callback, delay) => {
        const savedCallback = React.useRef();
        useEffect(() => { savedCallback.current = callback; }, [callback]);
        useEffect(() => {
            if (delay !== null) {
                const id = setInterval(() => savedCallback.current(), delay);
                return () => clearInterval(id);
            }
        }, [delay]);
    };

    const fetchDashboardData = async (silent = false) => {
        // Fix: 'user' from useAuth seems to be the Employee object itself (based on logs having user.user nested)
        // So we try user.employee.id first, falling back to user.id if that fails but looks like an employee
        const employeeId = user?.employee?.id || user?.id;

        // console.log("DASHBOARD FETCH CHECK - Employee ID:", employeeId);

        if (!employeeId) {
            console.log("Abort Fetch: No Employee ID found.");
            setLoadingSummaries(false);
            setLoadingRequests(false);
            setLoadingCalendar(false);
            return;
        }

        if (!silent) {
            setLoadingSummaries(true);
            setLoadingRequests(true);
            setLoadingCalendar(true);
        }

        // 1. Fetch Summaries & Month Events for Stats
        try {
            // console.log("=== DASHBOARD FETCH START ===");

            const [todayResult, monthStatsResult, monthEventsResult] = await Promise.allSettled([
                api.get('/attendance/today_summary/'),
                api.get(`/dashboard/stats/?year=${year}&month=${month}&employee_id=${employeeId}`),
                api.get(`/calendar-events/?start=${monthStartStr}&end=${monthEndStr}&employee_id=${employeeId}`),
            ]);

            if (todayResult.status === 'fulfilled') {
                setTodaySummary(todayResult.value.data);
            } else {
                console.error("!!! TODAY RESULT FAILED !!! Reason:", todayResult.reason);
            }

            if (monthStatsResult.status === 'fulfilled') {
                const data = monthStatsResult.value.data;
                setMonthlySummary(Array.isArray(data) ? data[0] : data);
            }

            if (monthEventsResult.status === 'fulfilled') {
                setMonthEvents(monthEventsResult.value.data.results || monthEventsResult.value.data || []);
            }
        } catch (err) {
            console.error("!!! CRITICAL SUMMARY FETCH ERROR !!!", err);
        } finally {
            if (!silent) setLoadingSummaries(false);
        }

        // 2. Fetch Requests
        try {
            const [leaveRes, overtimeRes, mealRes, incomingLeaveRes, incomingAttendanceRes] = await Promise.allSettled([
                api.get('/leave-requests/'),
                api.get('/overtime-requests/'),
                api.get('/meal-requests/'),
                api.get('/leave-requests/pending_approvals/'),
                api.get('/attendance/pending/')
            ]);

            const getData = (res) => (res.status === 'fulfilled' ? (res.value.data.results || res.value.data || []) : []);

            const leaves = getData(leaveRes).map(r => ({ ...r, type: 'LEAVE', date: r.start_date }));
            const overtimes = getData(overtimeRes).map(r => ({ ...r, type: 'OVERTIME', date: r.date }));
            const meals = getData(mealRes).map(r => ({ ...r, type: 'MEAL', date: r.date }));

            const combinedMyRequests = [...leaves, ...overtimes, ...meals].sort((a, b) => new Date(b.date) - new Date(a.date));
            setMyRequests(combinedMyRequests.slice(0, 5)); // Just top 5

            const incomingLeaves = getData(incomingLeaveRes).map(r => ({ ...r, type: 'LEAVE', date: r.start_date }));
            const incomingAttendance = getData(incomingAttendanceRes).map(r => ({ ...r, type: 'ATTENDANCE_APPROVAL', date: r.work_date }));

            const combinedIncoming = [...incomingLeaves, ...incomingAttendance].sort((a, b) => new Date(b.date) - new Date(a.date));
            setIncomingRequests(combinedIncoming);

        } catch (err) {
            console.error("Requests fetch error", err);
        } finally {
            if (!silent) setLoadingRequests(false);
        }

        // 3. Fetch Upcoming Calendar Events
        try {
            const employeeId = user?.employee?.id || user?.id; // Re-derive for safety or use from scope if I could
            const eventsRes = await api.get(`/calendar-events/?start=${upcomingStartStr}&end=${upcomingEndStr}&employee_id=${employeeId}`);
            const events = eventsRes.data.results || eventsRes.data || [];
            setCalendarEvents(events.sort((a, b) => new Date(a.start) - new Date(b.start)));
        } catch (err) {
            console.error("Calendar fetch error", err);
        } finally {
            if (!silent) setLoadingCalendar(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    // Auto-Refresh every 60 seconds
    useInterval(() => {
        // console.log("Auto-Refreshing Dashboard...");
        fetchDashboardData(true); // Silent refresh
    }, 60000);

    // Calculate Month Stats from Events (Leave/Missing)
    const monthStats = {
        // Filter out weekends for leave count
        leaveDays: monthEvents.filter(e => e.type === 'LEAVE' && new Date(e.start).getDay() !== 0 && new Date(e.start).getDay() !== 6).length,
        missingDays: monthEvents.filter(e => e.type === 'ABSENT' && new Date(e.start).getDay() !== 0 && new Date(e.start).getDay() !== 6).length
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'APPROVED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'PENDING': 'bg-amber-100 text-amber-700 border-amber-200',
            'PENDING_MANAGER_APPROVAL': 'bg-amber-100 text-amber-700 border-amber-200',
            'REJECTED': 'bg-red-100 text-red-700 border-red-200',
            'CANCELLED': 'bg-slate-100 text-slate-600 border-slate-200',
        };
        const labels = {
            'APPROVED': 'Onaylandı',
            'PENDING': 'Bekliyor',
            'PENDING_MANAGER_APPROVAL': 'Yönetici Onayı',
            'REJECTED': 'Reddedildi',
            'CANCELLED': 'İptal',
        };
        return (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const RequestItem = ({ req }) => {
        let Icon = FileText;
        let title = '';
        let subtitle = '';

        if (req.type === 'LEAVE') {
            Icon = Briefcase;
            title = req.employee ? `${req.employee.first_name} ${req.employee.last_name}` : `${req.request_type_name || 'İzin'} Talebi`;
            subtitle = `${format(new Date(req.start_date), 'd MMM', { locale: tr })} - ${req.days} Gün`;
        } else if (req.type === 'OVERTIME') {
            Icon = Clock;
            title = req.reason || 'Fazla Mesai';
            subtitle = `${format(new Date(req.date), 'd MMM', { locale: tr })} - ${Math.floor(req.duration_seconds / 60)} dk`;
        } else if (req.type === 'MEAL') {
            Icon = ChefHat;
            title = req.description || 'Yemek Talebi';
            subtitle = format(new Date(req.date), 'd MMM', { locale: tr });
        } else if (req.type === 'ATTENDANCE_APPROVAL') {
            Icon = Clock;
            title = `${req.employee.first_name} ${req.employee.last_name}`;
            subtitle = `Mesai Onayı - ${format(new Date(req.work_date), 'd MMM', { locale: tr })}`;
        }

        return (
            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-100 group cursor-pointer mb-1">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm",
                        req.type === 'LEAVE' ? "bg-blue-50 text-blue-600" :
                            req.type === 'OVERTIME' ? "bg-orange-50 text-orange-600" :
                                "bg-slate-50 text-slate-600"
                    )}>
                        <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
                        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                    </div>
                </div>
                <StatusBadge status={req.status} />
            </div>
        );
    };

    // Calculate Summary Values
    const workHours = monthlySummary ? (monthlySummary.total_seconds / 3600).toFixed(1) : '0.0';
    const overtimeHours = monthlySummary ? (monthlySummary.total_overtime / 3600).toFixed(1) : '0.0';
    const targetHours = monthlySummary ? (monthlySummary.monthly_required / 3600).toFixed(1) : '0.0';
    const netBalance = monthlySummary ? (monthlySummary.monthly_net_balance / 3600).toFixed(1) : '0.0';

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-10 px-4 md:px-8 pt-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 animate-fade-in mb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-800 leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 block mb-1">
                            Hoş Geldiniz,
                        </span>
                        {user?.first_name || 'Kullanıcı'}
                    </h1>
                    <div className="flex gap-4">
                        <p className="text-slate-400 font-medium text-sm flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                            <Clock size={14} />
                            Son Giriş: {todaySummary?.last_check_in ? format(new Date(todaySummary.last_check_in), 'HH:mm', { locale: tr }) : (user?.last_login ? format(new Date(user.last_login), 'HH:mm', { locale: tr }) : '--:--')}
                        </p>
                        {todaySummary?.last_check_out && (
                            <p className="text-slate-400 font-medium text-sm flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                                <Clock size={14} />
                                Son Çıkış: {format(new Date(todaySummary.last_check_out), 'HH:mm', { locale: tr })}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Daily Hero Summary */}
            <HeroDailySummary summary={todaySummary} loading={loadingSummaries} />

            {/* Monthly Summary Section - Full Width */}
            <div className="animate-fade-in-delayed">
                <div className="glass-card p-6 relative overflow-hidden">
                    {/* Decorative BG */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                    <div className="flex items-center justify-between mb-6 relative">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <PieChart className="text-indigo-500" size={24} />
                            Aylık Özet
                        </h2>
                        <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">
                            Detaylı Rapor
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                        {/* Total Work */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl w-fit mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                <Briefcase size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Toplam Çalışma</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{workHours} <span className="text-sm font-bold text-slate-400">sa</span></p>
                        </div>

                        {/* Overtime */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl w-fit mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                <Timer size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fazla Mesai</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{overtimeHours} <span className="text-sm font-bold text-slate-400">sa</span></p>
                        </div>

                        {/* Leave Days */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl w-fit mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                                <CalendarIcon size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">İzin</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{monthStats.leaveDays} <span className="text-sm font-bold text-slate-400">Gün</span></p>
                        </div>

                        {/* Missing Days */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all group">
                            <div className="p-3 bg-red-100 text-red-600 rounded-xl w-fit mb-3 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                                <Activity size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Devamsızlık</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{monthStats.missingDays} <span className="text-sm font-bold text-slate-400">Gün</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Activity Feed & Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-delayed" style={{ animationDelay: '0.2s' }}>

                {/* Tabs / Recent Requests */}
                <div className="glass-card p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <FileText size={20} className="text-indigo-500" />
                            Aktiviteler
                        </h3>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 border-b border-slate-100 pb-0 mb-4">
                        <button
                            onClick={() => setRequestTab('my_requests')}
                            className={clsx(
                                "text-sm font-bold pb-3 transition-colors relative",
                                requestTab === 'my_requests' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}>
                            Taleplerim
                            {requestTab === 'my_requests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></div>}
                        </button>
                        <button
                            onClick={() => setRequestTab('incoming')}
                            className={clsx(
                                "text-sm font-bold pb-3 transition-colors relative",
                                requestTab === 'incoming' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}>
                            Gelen Talepler
                            {requestTab === 'incoming' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></div>}
                        </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                        {loadingRequests ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl"></div>)}
                            </div>
                        ) : (
                            <>
                                {requestTab === 'my_requests' ? (
                                    myRequests.length > 0 ? (
                                        myRequests.map((req, idx) => <RequestItem key={idx} req={req} />)
                                    ) : (
                                        <div className="text-center py-12 text-slate-400 text-sm font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            Henüz bir talebiniz yok.
                                        </div>
                                    )
                                ) : (
                                    incomingRequests.length > 0 ? (
                                        incomingRequests.map((req, idx) => <RequestItem key={idx} req={req} />)
                                    ) : (
                                        <div className="text-center py-12 text-slate-400 text-sm font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            Onay bekleyen talep yok.
                                        </div>
                                    )
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="glass-card p-0 overflow-hidden h-full flex flex-col">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <CalendarIcon size={20} className="text-emerald-500" />
                            Yaklaşan Etkinlikler
                        </h3>
                        <a href="/calendar" className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                            TAKVİM
                        </a>
                    </div>
                    <div className="p-3 flex-1 overflow-hidden flex flex-col">
                        <UpcomingEventsCard
                            events={calendarEvents}
                            loading={loadingCalendar}
                            upcomingStartStr={upcomingStartStr}
                            upcomingEndStr={upcomingEndStr}
                            embedded={true}
                        />
                    </div>
                </div>

            </div>
        </div >
    );
};

export default Dashboard;
