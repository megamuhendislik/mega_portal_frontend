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

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Fix: 'user' from useAuth seems to be the Employee object itself (based on logs having user.user nested)
            // So we try user.employee.id first, falling back to user.id if that fails but looks like an employee
            const employeeId = user?.employee?.id || user?.id;

            console.log("DASHBOARD FETCH CHECK - Employee ID:", employeeId);

            if (!employeeId) {
                console.log("Abort Fetch: No Employee ID found.");
                setLoadingSummaries(false);
                setLoadingRequests(false);
                setLoadingCalendar(false);
                return;
            }

            setLoadingSummaries(true);
            setLoadingRequests(true);
            setLoadingCalendar(true);

            // 1. Fetch Summaries & Month Events for Stats
            try {
                console.log("=== DASHBOARD FETCH START ===");
                console.log(`Fetching for Employee ID: ${employeeId}`);

                const [todayResult, monthStatsResult, monthEventsResult] = await Promise.allSettled([
                    api.get('/attendance/today_summary/'),
                    api.get(`/stats/summary/?year=${year}&month=${month}&employee_id=${employeeId}`),
                    api.get(`/calendar/?start=${monthStartStr}&end=${monthEndStr}&employee_id=${employeeId}`)
                ]);

                console.log("=== FETCH RESULTS ACQUIRED ===");
                console.log("Today Result Status:", todayResult.status);

                if (todayResult.status === 'fulfilled') {
                    console.log("Today Result DATA:", todayResult.value.data);
                    setTodaySummary(todayResult.value.data);
                } else {
                    console.error("!!! TODAY RESULT FAILED !!! Reason:", todayResult.reason);
                    if (todayResult.reason?.response) {
                        console.log("Error Response Status:", todayResult.reason.response.status);
                        console.log("Error Response Data:", todayResult.reason.response.data);
                    }
                }

                if (monthStatsResult.status === 'fulfilled') {
                    const data = monthStatsResult.value.data;
                    setMonthlySummary(Array.isArray(data) ? data[0] : data);
                } else {
                    console.log("Month Stats Failed:", monthStatsResult.reason);
                }

                if (monthEventsResult.status === 'fulfilled') {
                    setMonthEvents(monthEventsResult.value.data.results || monthEventsResult.value.data || []);
                }
            } catch (err) {
                console.error("!!! CRITICAL SUMMARY FETCH ERROR !!!", err);
            } finally {
                setLoadingSummaries(false);
            }

            // 2. Fetch Requests
            try {
                const [leaveRes, overtimeRes, mealRes, incomingLeaveRes, incomingAttendanceRes] = await Promise.allSettled([
                    api.get('/leave/requests/'),
                    api.get('/overtime-requests/'),
                    api.get('/meal-requests/'),
                    api.get('/leave/requests/pending_approvals/'),
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
                setLoadingRequests(false);
            }

            // 3. Fetch Upcoming Calendar Events
            try {
                const employeeId = user?.employee?.id || user?.id; // Re-derive for safety or use from scope if I could
                const eventsRes = await api.get(`/calendar/?start=${upcomingStartStr}&end=${upcomingEndStr}&employee_id=${employeeId}`);
                const events = eventsRes.data.results || eventsRes.data || [];
                setCalendarEvents(events.sort((a, b) => new Date(a.start) - new Date(b.start)));
            } catch (err) {
                console.error("Calendar fetch error", err);
            } finally {
                setLoadingCalendar(false);
            }
        };

        fetchDashboardData();
    }, [user]);

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
            subtitle = `${format(new Date(req.date), 'd MMM', { locale: tr })} - ${req.duration_minutes} dk`;
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
    const workHours = monthlySummary ? (monthlySummary.total_minutes / 60).toFixed(1) : '0.0';
    const overtimeHours = monthlySummary ? (monthlySummary.overtime_minutes / 60).toFixed(1) : '0.0';
    const targetHours = monthlySummary ? (monthlySummary.monthly_required / 60).toFixed(1) : '0.0';
    const netBalance = monthlySummary ? (monthlySummary.monthly_net_balance / 60).toFixed(1) : '0.0';

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ana Sayfa</h1>
                    <p className="text-slate-500 font-medium mt-1">Hoş Geldiniz, {user?.first_name || 'Kullanıcı'}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 text-sm font-semibold text-slate-600 flex items-center gap-2">
                        <CalendarIcon size={16} className="text-blue-500" />
                        {format(new Date(), 'd MMMM yyyy, EEEE', { locale: tr })}
                    </div>
                </div>
            </div>

            {/* 1. HERO Daily Summary */}
            <section>
                <HeroDailySummary summary={todaySummary} loading={loadingSummaries} />
            </section>

            {/* 2. Monthly Summary Grid */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <PieChart className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-slate-800">Bu Ayın Özeti</h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Work */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Briefcase size={18} />
                            </div>
                            <span className="text-sm font-medium text-slate-600">Toplam Çalışma</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 ml-1">
                            {loadingSummaries ? '...' : workHours} <span className="text-sm font-normal text-slate-400">Saat</span>
                        </div>
                    </div>

                    {/* Overtime */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <Timer size={18} />
                            </div>
                            <span className="text-sm font-medium text-slate-600">Fazla Mesai</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 ml-1">
                            {loadingSummaries ? '...' : overtimeHours} <span className="text-sm font-normal text-slate-400">Saat</span>
                        </div>
                    </div>

                    {/* Target */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Briefcase size={18} />
                            </div>
                            <span className="text-sm font-medium text-slate-600">Gereken</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 ml-1">
                            {loadingSummaries ? '...' : targetHours} <span className="text-sm font-normal text-slate-400">Saat</span>
                        </div>
                    </div>

                    {/* Net Balance */}
                    <div className={clsx(
                        "p-5 rounded-2xl shadow-sm border",
                        parseFloat(netBalance) >= 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                    )}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={clsx("p-2 rounded-lg", parseFloat(netBalance) >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                                <Activity size={18} />
                            </div>
                            <span className={clsx("text-sm font-medium", parseFloat(netBalance) >= 0 ? "text-emerald-900" : "text-red-900")}>Net Fark</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 ml-1">
                            {loadingSummaries ? '...' : (parseFloat(netBalance) > 0 ? `+${netBalance}` : netBalance)} <span className="text-sm font-normal text-slate-400">Saat</span>
                        </div>
                    </div>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex items-center justify-between px-6">
                        <span className="text-sm font-semibold text-amber-900">İzinli Günler</span>
                        <span className="text-xl font-bold text-amber-900">{monthStats.leaveDays}</span>
                    </div>
                    <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl flex items-center justify-between px-6">
                        <span className="text-sm font-semibold text-red-900">Eksik / Devamsız</span>
                        <span className="text-xl font-bold text-red-900">{monthStats.missingDays}</span>
                    </div>
                </div>
            </section>

            {/* 3. Requests & Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pending Requests */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Tabs */}
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                        <button
                            onClick={() => setRequestTab('my_requests')}
                            className={clsx(
                                "text-sm font-bold pb-2 transition-colors relative",
                                requestTab === 'my_requests' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}>
                            Taleplerim
                            {requestTab === 'my_requests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></div>}
                        </button>
                        <button
                            onClick={() => setRequestTab('incoming')}
                            className={clsx(
                                "text-sm font-bold pb-2 transition-colors relative",
                                requestTab === 'incoming' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}>
                            Gelen Talepler
                            {requestTab === 'incoming' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></div>}
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 min-h-[300px]">
                        {loadingRequests ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl"></div>)}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {requestTab === 'my_requests' ? (
                                    myRequests.length > 0 ? (
                                        myRequests.map((req, idx) => <RequestItem key={idx} req={req} />)
                                    ) : (
                                        <div className="text-center py-10 text-slate-400 text-sm font-medium">Henüz talep yok.</div>
                                    )
                                ) : (
                                    incomingRequests.length > 0 ? (
                                        incomingRequests.map((req, idx) => <RequestItem key={idx} req={req} />)
                                    ) : (
                                        <div className="text-center py-10 text-slate-400 text-sm font-medium">Onay bekleyen talep yok.</div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div>
                    <UpcomingEventsCard
                        events={calendarEvents}
                        loading={loadingCalendar}
                        upcomingStartStr={upcomingStartStr}
                        upcomingEndStr={upcomingEndStr}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
