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

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.employee?.id) {
                setLoadingSummaries(false);
                setLoadingRequests(false);
                setLoadingCalendar(false);
                return;
            }

            setLoadingSummaries(true);
            setLoadingRequests(true);
            setLoadingCalendar(true);

            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;

            const monthStartStr = format(startOfMonth(today), 'yyyy-MM-dd');
            const monthEndStr = format(endOfMonth(today), 'yyyy-MM-dd');
            const upcomingStartStr = format(startOfDay(today), 'yyyy-MM-dd');
            const upcomingEndStr = format(endOfDay(addDays(today, 7)), 'yyyy-MM-dd');

            // 1. Fetch Summaries & Month Events for Stats
            try {
                const [todayResult, monthStatsResult, monthEventsResult] = await Promise.allSettled([
                    api.get('/attendance/today_summary/'),
                    api.get(`/stats/summary/?year=${year}&month=${month}&employee_id=${user.employee.id}`),
                    api.get(`/calendar/?start=${monthStartStr}&end=${monthEndStr}&employee_id=${user.employee.id}`)
                ]);

                if (todayResult.status === 'fulfilled') {
                    setTodaySummary(todayResult.value.data);
                }
                if (monthStatsResult.status === 'fulfilled') {
                    const data = monthStatsResult.value.data;
                    setMonthlySummary(Array.isArray(data) ? data[0] : data);
                }
                if (monthEventsResult.status === 'fulfilled') {
                    setMonthEvents(monthEventsResult.value.data.results || monthEventsResult.value.data || []);
                }
            } catch (err) {
                console.error("Summary fetch error", err);
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
                const eventsRes = await api.get(`/calendar/?start=${upcomingStartStr}&end=${upcomingEndStr}&employee_id=${user.employee.id}`);
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
        leaveDays: monthEvents.filter(e => e.type === 'LEAVE').length,
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
            title = 'Fazla Mesai';
            subtitle = `${format(new Date(req.date), 'd MMM', { locale: tr })} - ${req.duration_minutes} dk`;
        } else if (req.type === 'MEAL') {
            Icon = ChefHat;
            title = 'Yemek Talebi';
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
        <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-8">
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

            {/* 3. Bottom Grid: Requests & Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Requests */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                    <div className="flex items-center border-b border-slate-100 px-6 pt-5 gap-6">
                        <button
                            onClick={() => setRequestTab('my_requests')}
                            className={clsx(
                                "pb-4 text-sm font-bold transition-all relative",
                                requestTab === 'my_requests' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Taleplerim
                            {requestTab === 'my_requests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setRequestTab('incoming')}
                            className={clsx(
                                "pb-4 text-sm font-bold transition-all relative flex items-center gap-2",
                                requestTab === 'incoming' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Gelen Talepler
                            {incomingRequests.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">{incomingRequests.length}</span>
                            )}
                            {requestTab === 'incoming' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        {requestTab === 'my_requests' ? (
                            loadingRequests ? <div className="text-center text-slate-400 py-10">Yükleniyor...</div> :
                                myRequests.length === 0 ? <div className="text-center text-slate-400 py-10">Henüz talep yok.</div> :
                                    myRequests.map((req, idx) => <RequestItem key={idx} req={req} />)
                        ) : (
                            loadingRequests ? <div className="text-center text-slate-400 py-10">Yükleniyor...</div> :
                                incomingRequests.length === 0 ? <div className="text-center text-slate-400 py-10">Onay bekleyen talep yok.</div> :
                                    incomingRequests.map((req, idx) => <RequestItem key={idx} req={req} />)
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl text-center">
                        <a href="/requests" className="text-xs font-bold text-blue-600 uppercase hover:underline">Tümünü Gör</a>
                    </div>
                </div>

                {/* Right: Upcoming Events */}
                <div className="h-[500px]">
                    <UpcomingEventsCard events={calendarEvents} loading={loadingCalendar} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
