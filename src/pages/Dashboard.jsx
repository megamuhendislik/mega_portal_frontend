import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DailySummaryCard from '../components/DailySummaryCard';
import { Clock, Calendar, FileText, CheckCircle2, XCircle, AlertCircle, ChefHat, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const Dashboard = () => {
    const { user } = useAuth();
    const [loadingSummaries, setLoadingSummaries] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);

    // Data States
    const [todaySummary, setTodaySummary] = useState(null);
    const [monthlySummary, setMonthlySummary] = useState(null);
    const [myRequests, setMyRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);

    // UI States
    const [requestTab, setRequestTab] = useState('my_requests'); // 'my_requests' | 'incoming'

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.employee?.id) return;

            setLoadingSummaries(true);
            setLoadingRequests(true);

            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;

            // 1. Fetch Summaries Independently
            try {
                const [todayResult, monthResult] = await Promise.allSettled([
                    api.get('/attendance/today_summary/'),
                    api.get(`/attendance/stats/summary/?year=${year}&month=${month}&employee_id=${user.employee.id}`)
                ]);

                if (todayResult.status === 'fulfilled') {
                    setTodaySummary(todayResult.value.data);
                }
                if (monthResult.status === 'fulfilled' && Array.isArray(monthResult.value.data) && monthResult.value.data.length > 0) {
                    setMonthlySummary(monthResult.value.data[0]);
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
            'PENDING_MANAGER_APPROVAL': 'Yönetici Onayı Bekliyor',
            'REJECTED': 'Reddedildi',
            'CANCELLED': 'İptal',
        };

        return (
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
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
                subtitle = `${req.request_type?.name} - ${req.days} Gün`;
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
            <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 group">
                <div className="flex items-center space-x-3">
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        req.type === 'LEAVE' ? "bg-blue-50 text-blue-600 group-hover:bg-blue-100" :
                            req.type === 'OVERTIME' ? "bg-orange-50 text-orange-600 group-hover:bg-orange-100" :
                                req.type === 'MEAL' ? "bg-purple-50 text-purple-600 group-hover:bg-purple-100" :
                                    "bg-amber-50 text-amber-600 group-hover:bg-amber-100"
                    )}>
                        <Icon size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{title}</p>
                        <p className="text-xs text-slate-500">{subtitle}</p>
                    </div>
                </div>
                <StatusBadge status={req.status} />
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
                <p className="text-slate-500">İşletmenizin anlık durumunu buradan takip edebilirsiniz.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: SUMMARIES (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 1. Today's Summary */}
                    <div className="h-full">
                        <DailySummaryCard summary={todaySummary} loading={loadingSummaries} />
                    </div>

                    {/* 2. Monthly Summary */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
                            Bu Ayın Özeti
                        </h3>

                        {loadingSummaries || !monthlySummary ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                <div className="h-8 bg-slate-100 rounded w-full"></div>
                                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium uppercase">Toplam Mesai</p>
                                        <p className="text-lg font-bold text-slate-800 mt-1">
                                            {Math.floor(monthlySummary.total_minutes / 60)}s {monthlySummary.total_minutes % 60}dk
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium uppercase">Fazla Mesai</p>
                                        <p className="text-lg font-bold text-amber-600 mt-1">
                                            {Math.floor(monthlySummary.total_overtime / 60)}s {monthlySummary.total_overtime % 60}dk
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500">Hedeflenen</span>
                                        <span className="font-medium text-slate-700">{Math.floor(monthlySummary.monthly_required / 60)} saat</span>
                                    </div>
                                    {/* Progress Bar (Capped at 100%) */}
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-2.5 rounded-full"
                                            style={{ width: `${Math.min(100, (monthlySummary.total_minutes / monthlySummary.monthly_required) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs mt-1 text-slate-400">
                                        <span>%{Math.round((monthlySummary.total_minutes / monthlySummary.monthly_required) * 100) || 0} Tamamlandı</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center bg-indigo-50/50 p-3 rounded-lg mt-2">
                                    <span className="text-sm font-medium text-slate-600">Net Bakiye</span>
                                    <span className={clsx(
                                        "font-bold text-lg",
                                        monthlySummary.monthly_net_balance >= 0 ? "text-emerald-600" : "text-red-500"
                                    )}>
                                        {monthlySummary.monthly_net_balance > 0 ? '+' : ''}{Math.floor(monthlySummary.monthly_net_balance / 60)}s {Math.abs(monthlySummary.monthly_net_balance % 60)}dk
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: REQUESTS (8 cols) */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[500px]">
                        {/* Tabs header */}
                        <div className="flex items-center border-b border-slate-100 px-6 pt-6 gap-6">
                            <button
                                onClick={() => setRequestTab('my_requests')}
                                className={clsx(
                                    "pb-4 text-sm font-semibold transition-all relative",
                                    requestTab === 'my_requests' ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
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
                                    "pb-4 text-sm font-semibold transition-all relative flex items-center gap-2",
                                    requestTab === 'incoming' ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Gelen Talepler <span className="text-xs font-normal text-slate-400">(Ekibim)</span>
                                {incomingRequests.length > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {incomingRequests.length}
                                    </span>
                                )}
                                {requestTab === 'incoming' && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
                                )}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                            {requestTab === 'my_requests' ? (
                                <div className="space-y-1">
                                    {loadingRequests ? (
                                        <div className="space-y-3 p-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-full animate-pulse"></div>
                                                        <div className="space-y-2">
                                                            <div className="w-24 h-4 bg-slate-100 rounded animate-pulse"></div>
                                                            <div className="w-16 h-3 bg-slate-100 rounded animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : myRequests.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <FileText className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Henüz bir talebiniz bulunmuyor.</p>
                                            <p className="text-slate-400 text-sm mt-1">İzin veya fazla mesai talebi oluşturabilirsiniz.</p>
                                        </div>
                                    ) : (
                                        myRequests.map((req, idx) => <RequestItem key={`${req.type}-${idx}`} req={req} />)
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {loadingRequests ? (
                                        <div className="space-y-3 p-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-full animate-pulse"></div>
                                                        <div className="space-y-2">
                                                            <div className="w-24 h-4 bg-slate-100 rounded animate-pulse"></div>
                                                            <div className="w-16 h-3 bg-slate-100 rounded animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : incomingRequests.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <CheckCircle2 className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Bekleyen talep yok.</p>
                                            <p className="text-slate-400 text-sm mt-1">Tüm talepleri yanıtladınız!</p>
                                        </div>
                                    ) : (
                                        incomingRequests.map((req, idx) => <RequestItem key={`incoming-${idx}`} req={req} />)
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Link */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl text-center">
                            <a href="/requests" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                Tüm Talepleri Görüntüle &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
