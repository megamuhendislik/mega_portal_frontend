import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DailySummaryCard from '../components/DailySummaryCard';
import UpcomingEventsCard from '../components/UpcomingEventsCard';
import { Clock, Calendar, FileText, CheckCircle2, Briefcase, ChefHat, Activity, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
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
    const [myRequests, setMyRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [calendarEvents, setCalendarEvents] = useState([]);

    // UI States
    const [requestTab, setRequestTab] = useState('my_requests'); // 'my_requests' | 'incoming'

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

            // 1. Fetch Summaries Independently
            try {
                const [todayResult, monthResult] = await Promise.allSettled([
                    api.get('/attendance/today_summary/'),
                    api.get(`/stats/summary/?year=${year}&month=${month}&employee_id=${user.employee.id}`)
                ]);

                if (todayResult.status === 'fulfilled') {
                    setTodaySummary(todayResult.value.data);
                }
                if (monthResult.status === 'fulfilled') {
                    // API might return array or object depending on backend
                    const data = monthResult.value.data;
                    setMonthlySummary(Array.isArray(data) ? data[0] : data);
                }
            } catch (err) {
                console.error("Summary fetch error", err);
            } finally {
                setLoadingSummaries(false);
            }

            // 2. Fetch Requests Independently
            try {
                const [leaveRes, overtimeRes, mealRes, incomingLeaveRes, incomingAttendanceRes] = await Promise.allSettled([
                    api.get('/leave/requests/'),
                    api.get('/overtime-requests/'),
                    api.get('/meal-requests/'),
                    api.get('/leave/requests/pending_approvals/'),
                    api.get('/attendance/pending/')
                ]);

                // Helper to safely get data array
                const getData = (res) => (res.status === 'fulfilled' ? (res.value.data.results || res.value.data || []) : []);

                // My Requests
                const leaves = getData(leaveRes).map(r => ({ ...r, type: 'LEAVE', date: r.start_date }));
                const overtimes = getData(overtimeRes).map(r => ({ ...r, type: 'OVERTIME', date: r.date }));
                const meals = getData(mealRes).map(r => ({ ...r, type: 'MEAL', date: r.date }));

                const combinedMyRequests = [...leaves, ...overtimes, ...meals].sort((a, b) => new Date(b.date) - new Date(a.date));
                setMyRequests(combinedMyRequests.slice(0, 10)); // Show last 10

                // Incoming Requests
                const incomingLeaves = getData(incomingLeaveRes).map(r => ({ ...r, type: 'LEAVE', date: r.start_date }));
                const incomingAttendance = getData(incomingAttendanceRes).map(r => ({ ...r, type: 'ATTENDANCE_APPROVAL', date: r.work_date }));

                const combinedIncoming = [...incomingLeaves, ...incomingAttendance].sort((a, b) => new Date(b.date) - new Date(a.date));
                setIncomingRequests(combinedIncoming);

            } catch (err) {
                console.error("Requests fetch error", err);
            } finally {
                setLoadingRequests(false);
            }

            // 3. Fetch Upcoming Calendar Events (Next 7 days)
            try {
                const startStr = format(startOfDay(today), 'yyyy-MM-dd');
                const endStr = format(endOfDay(addDays(today, 7)), 'yyyy-MM-dd');

                const eventsRes = await api.get(`/calendar/?start=${startStr}&end=${endStr}&employee_id=${user.employee.id}`);
                const events = eventsRes.data.results || eventsRes.data || [];

                // Sort by start date
                const sortedEvents = events.sort((a, b) => new Date(a.start) - new Date(b.start));
                setCalendarEvents(sortedEvents);
            } catch (err) {
                console.error("Calendar fetch error", err);
            } finally {
                setLoadingCalendar(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    // --- Helper Components ---

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
            <span className={`text-[10px] md:text-xs px-2 py-1 rounded-full border font-bold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
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
            if (req.employee) {
                title = `${req.employee.first_name} ${req.employee.last_name}`;
                subtitle = `${req.request_type?.name || 'İzin'} - ${req.days} Gün`;
            } else {
                title = `${req.request_type_name || 'İzin'} Talebi`;
                subtitle = `${format(new Date(req.start_date), 'd MMM', { locale: tr })} - ${req.days} Gün`;
            }
        } else if (req.type === 'OVERTIME') {
            Icon = Clock;
            title = 'Fazla Mesai';
            subtitle = `${format(new Date(req.date), 'd MMM', { locale: tr })} - ${req.duration_minutes} dk`;
        } else if (req.type === 'MEAL') {
            Icon = ChefHat;
            title = 'Yemek Talebi';
            subtitle = format(new Date(req.date), 'd MMM yyyy', { locale: tr });
        } else if (req.type === 'ATTENDANCE_APPROVAL') {
            Icon = Clock;
            title = `${req.employee.first_name} ${req.employee.last_name}`;
            subtitle = `Mesai Onayı - ${format(new Date(req.work_date), 'd MMM', { locale: tr })}`;
        }

        return (
            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group cursor-pointer">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm",
                        req.type === 'LEAVE' ? "bg-blue-50 text-blue-600 group-hover:bg-blue-100" :
                            req.type === 'OVERTIME' ? "bg-orange-50 text-orange-600 group-hover:bg-orange-100" :
                                req.type === 'MEAL' ? "bg-purple-50 text-purple-600 group-hover:bg-purple-100" :
                                    "bg-amber-50 text-amber-600 group-hover:bg-amber-100"
                    )}>
                        <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
                        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                    </div>
                </div>
                <div className="ml-2 shrink-0">
                    <StatusBadge status={req.status} />
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Genel Bakış</h1>
                <p className="text-slate-500 text-sm md:text-base">Hoş geldin {user?.first_name}, bugünkü durumun burada.</p>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative items-start">

                {/* LEFT COLUMN (Content) */}
                <div className="xl:col-span-8 space-y-6">

                    {/* TOP ROW: SUMMARIES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Today's Summary */}
                        <div className="h-full">
                            <DailySummaryCard summary={todaySummary} loading={loadingSummaries} />
                        </div>

                        {/* 2. Monthly Summary */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center">
                                    <Activity className="w-5 h-5 mr-2 text-emerald-500" />
                                    Bu Ayın Özeti
                                </h3>
                                {/* Safe display if monthlySummary is null */}
                                {monthlySummary && (
                                    <span className={clsx(
                                        "text-xs font-bold px-2 py-0.5 rounded",
                                        monthlySummary.monthly_net_balance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {monthlySummary.monthly_net_balance > 0 ? '+' : ''}
                                        {Math.floor(monthlySummary.monthly_net_balance / 60)}s {Math.abs(monthlySummary.monthly_net_balance % 60)}dk
                                    </span>
                                )}
                            </div>

                            {loadingSummaries || !monthlySummary ? (
                                <div className="animate-pulse space-y-4 flex-1">
                                    <div className="h-20 bg-slate-50 rounded-xl"></div>
                                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Çalışılan</p>
                                            <p className="text-lg font-bold text-slate-800">
                                                {Math.floor(monthlySummary.total_minutes / 60)}s <span className="text-xs text-slate-500 font-normal">{monthlySummary.total_minutes % 60}dk</span>
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hedef</p>
                                            <p className="text-lg font-bold text-slate-600">
                                                {Math.floor(monthlySummary.monthly_required / 60)}s
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                                            <span className="text-slate-500">Aylık İlerleme</span>
                                            <span className="text-indigo-600">%{Math.round((monthlySummary.total_minutes / monthlySummary.monthly_required) * 100) || 0}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${Math.min(100, (monthlySummary.total_minutes / monthlySummary.monthly_required) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* REQUESTS PANEL */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
                        {/* Tabs */}
                        <div className="flex items-center border-b border-slate-100 px-6 pt-5 gap-8">
                            <button
                                onClick={() => setRequestTab('my_requests')}
                                className={clsx(
                                    "pb-4 text-sm font-bold transition-all relative",
                                    requestTab === 'my_requests' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Taleplerim
                                {requestTab === 'my_requests' && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
                                )}
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
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm shadow-red-200">
                                        {incomingRequests.length}
                                    </span>
                                )}
                                {requestTab === 'incoming' && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
                                )}
                            </button>
                        </div>

                        {/* Requests List */}
                        <div className="p-4 md:p-6 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                            {requestTab === 'my_requests' ? (
                                <div className="space-y-2">
                                    {loadingRequests ? (
                                        <div className="space-y-3">
                                            {[1, 2].map(i => (
                                                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse"></div>
                                            ))}
                                        </div>
                                    ) : myRequests.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <FileText className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Henüz bir talebiniz yok.</p>
                                        </div>
                                    ) : (
                                        myRequests.map((req, idx) => <RequestItem key={`${req.type}-${idx}`} req={req} />)
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {loadingRequests ? (
                                        <div className="space-y-3">
                                            {[1, 2].map(i => (
                                                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse"></div>
                                            ))}
                                        </div>
                                    ) : incomingRequests.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <CheckCircle2 className="text-emerald-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Tüm onaylar tamam!</p>
                                        </div>
                                    ) : (
                                        incomingRequests.map((req, idx) => <RequestItem key={`incoming-${idx}`} req={req} />)
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Link */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl text-center">
                            <a href="/requests" className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide">
                                Tümünü Gör
                            </a>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (Sidebarish components) */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Upcoming Events */}
                    <div className="h-full max-h-[600px]">
                        <UpcomingEventsCard events={calendarEvents} loading={loadingCalendar} />
                    </div>

                    {/* Quick Info / Tip (Optional filler for balance) */}
                    {/* Quick Info (Optional) */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 md:hidden xl:block">
                        <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <Activity size={20} className="text-blue-200" />
                            İyi Çalışmalar
                        </h4>
                        <p className="text-blue-100 text-sm leading-relaxed">
                            Verimli ve başarılı bir gün geçirmenizi dileriz.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
