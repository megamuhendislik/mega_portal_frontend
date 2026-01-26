
import React, { useState, useEffect } from 'react';
import {
    Clock, Calendar, Users, User, Filter, Download
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AttendanceLogTable from '../components/AttendanceLogTable';
import TeamAttendanceOverview from '../components/TeamAttendanceOverview';
import TeamComparisonChart from '../components/TeamComparisonChart';
import WeeklyAttendanceChart from '../components/WeeklyAttendanceChart';
import BreakAnalysisWidget from '../components/BreakAnalysisWidget';

import AttendanceAnalyticsChart from '../components/AttendanceAnalyticsChart';
import HeroDailySummary from '../components/HeroDailySummary';
import MonthlyPerformanceSummary from '../components/MonthlyPerformanceSummary';
import Skeleton from '../components/Skeleton';
import { format } from 'date-fns';

const Attendance = () => {
    const { user, hasPermission } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState('my_attendance'); // 'my_attendance', 'team_attendance', 'team_detail'
    const [loading, setLoading] = useState(true);
    const [hasTeam, setHasTeam] = useState(false);

    // Data State
    const [logs, setLogs] = useState([]);
    const [periodSummary, setPeriodSummary] = useState(null);
    const [todaySummary, setTodaySummary] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamComparison, setTeamComparison] = useState([]);

    // Filters
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

    // Date State (Defaults to current period)
    const today = new Date();
    // Logic: If today >= 26, we are in Next Month's cycle (Start 26th this month, End 25th next month)
    // If today < 26, we are in This Month's cycle (Start 26th prev month, End 25th this month)
    const initialMonth = today.getDate() >= 26 ? today.getMonth() + 1 : today.getMonth();
    const initialYear = today.getDate() >= 26 && today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    // Handle wrap around 
    const safeInitialMonth = initialMonth > 11 ? 0 : initialMonth;

    const [viewYear, setViewYear] = useState(initialYear);
    const [viewMonth, setViewMonth] = useState(safeInitialMonth); // 0-based index
    const [viewScope, setViewScope] = useState('DAILY'); // 'DAILY' | 'MONTHLY'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const years = [2024, 2025, 2026, 2027];

    // --- EFFECT: Init ---
    useEffect(() => {
        updateDateRange(viewYear, viewMonth, viewScope);
        checkTeamVisibility();
    }, [user]);

    // Recalculate dates when year/month/scope changes
    useEffect(() => {
        updateDateRange(viewYear, viewMonth, viewScope);
    }, [viewYear, viewMonth, viewScope]);

    // --- EFFECT: Load Data ---
    useEffect(() => {
        if (selectedEmployeeId && startDate && endDate) {
            if (activeTab === 'my_attendance' || activeTab === 'team_detail') {
                fetchAttendanceData();
            }
        }
        if (activeTab === 'team_attendance') {
            fetchTeamData();
        }
    }, [selectedEmployeeId, startDate, endDate, activeTab]);

    // --- HANDLERS ---
    const checkTeamVisibility = () => {
        if (!user) return;
        const canViewTeam = user.user?.is_superuser || user.has_team;
        setHasTeam(canViewTeam);
        if (activeTab === 'my_attendance') {
            setSelectedEmployeeId(user.id);
        }
    };

    // Use standard 26-25 Logic. ALWAYS fetch the full period.
    const updateDateRange = (year, month, scope) => {
        // Even if scope is DAILY, we fetch the whole month to support the Charts & Analytics.
        // The filtering for the "Daily View" table will happen in the render logic.

        let start, end;

        // Target End Date: 25th of selected month
        end = new Date(year, month, 25);

        // Target Start Date: 26th of previous month
        start = new Date(year, month - 1, 26);

        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    };

    const fetchAttendanceData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Logs
            const logsRes = await api.get(`/attendance/?employee_id=${selectedEmployeeId}&start_date=${startDate}&end_date=${endDate}`);
            setLogs(logsRes.data.results || logsRes.data);

            // 2. Fetch Period Summary (for Cards)
            const sumRes = await api.get(`/attendance/monthly_summary/?employee_id=${selectedEmployeeId}&start_date=${startDate}&end_date=${endDate}`);
            setPeriodSummary(sumRes.data);

            // 3. Fetch Today's Summary (For Hero Widget)
            // Only if we are viewing "My Attendance" or a specific Team Member (Detail)
            if (activeTab === 'my_attendance' || activeTab === 'team_detail') {
                const todayRes = await api.get(`/attendance/today_summary/?employee_id=${selectedEmployeeId}`);
                setTodaySummary(todayRes.data);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/attendance/team_dashboard/');
            if (response.data) {
                const mapped = response.data.map(m => ({
                    ...m,
                    totalTodayMinutes: Math.floor(m.today_seconds / 60),
                    monthTarget: (m.month_target_seconds / 3600).toFixed(1),
                    monthWorkedHours: (m.month_worked_seconds / 3600).toFixed(1),
                }));
                setTeamMembers(mapped);
                setTeamComparison(mapped.map(m => ({
                    name: m.name,
                    actual: parseFloat(m.monthWorkedHours),
                    target: parseFloat(m.monthTarget),
                    overtime: parseInt((m.month_approved_overtime_seconds || 0) / 60)
                })));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTeamMemberClick = (id) => {
        setSelectedEmployeeId(id);
        setActiveTab('team_detail');
    };

    return (
        <div className="max-w-[1700px] mx-auto space-y-8 pb-20 px-4 md:px-8 pt-6">

            {/* 1. Page Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        {activeTab === 'team_attendance' ? 'Ekip Performansı' : 'Mesai Takibi'}
                        {activeTab === 'team_detail' && (
                            <span className="text-sm font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                                Detay Görünümü
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        {activeTab === 'team_attendance'
                            ? 'Ekibinizin performansını ve çalışma saatlerini yönetin.'
                            : 'Kişisel performans, eksik gün ve fazla mesai analizleri.'
                        }
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    {/* View Switcher */}
                    {/* View Switcher (Today / Month) */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                        <button
                            onClick={() => setViewScope('DAILY')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewScope === 'DAILY'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Bugün
                        </button>
                        <button
                            onClick={() => setViewScope('MONTHLY')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewScope === 'MONTHLY'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Calendar size={14} />
                            Ay
                        </button>
                    </div>

                    {/* Year/Month Selectors (Only visible/active if in Monthly mode or always? User said 'ay seçilebilsin') */}
                    {/* Better UX: If I click Month Selector, it auto-switches to MONTHLY scope. */}
                    <div className={`flex flex-col items-end gap-1 transition-opacity duration-300 ${viewScope === 'DAILY' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                            <div className="h-6 w-px bg-slate-200"></div>

                            <select
                                value={viewMonth}
                                onChange={(e) => {
                                    setViewMonth(parseInt(e.target.value));
                                    setViewScope('MONTHLY');
                                }}
                                className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer hover:text-blue-600 transition-colors appearance-none"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>

                            <select
                                value={viewYear}
                                onChange={(e) => {
                                    setViewYear(parseInt(e.target.value));
                                    setViewScope('MONTHLY');
                                }}
                                className="text-sm font-bold text-slate-500 bg-transparent outline-none cursor-pointer hover:text-blue-600 transition-colors appearance-none"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        {viewScope === 'MONTHLY' && startDate && endDate && (
                            <span className="text-[10px] font-medium text-slate-400">
                                Dönem: {new Date(startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {new Date(endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                            </span>
                        )}
                    </div>

                    <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('my_attendance')}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'my_attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                        >
                            <User size={18} />
                            Kendi Mesaim
                        </button>
                        {hasTeam && (
                            <button
                                onClick={() => setActiveTab('team_attendance')}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'team_attendance' || activeTab === 'team_detail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                            >
                                <Users size={18} />
                                Ekip
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Back Button for Team Detail */}
            {
                activeTab === 'team_detail' && (
                    <button onClick={() => setActiveTab('team_attendance')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
                        ← Ekip Tablosuna Dön
                    </button>
                )
            }

            {
                loading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-48 rounded-2xl" />
                        <div className="grid grid-cols-2 gap-6"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
                        <Skeleton className="h-96 rounded-2xl" />
                    </div>
                ) : (activeTab === 'my_attendance' || activeTab === 'team_detail') ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

                        {/* 1.5. Hero Daily Summary (Today) - ONLY IF DAILY SCOPE */}
                        {viewScope === 'DAILY' && (
                            <HeroDailySummary summary={todaySummary} loading={loading} />
                        )}

                        {/* 2. Monthly Summary Section */}
                        {/* Includes 3-part progress bar and Net Status Card */}
                        <div className="bg-white p-1 rounded-3xl">
                            <MonthlyPerformanceSummary logs={logs} periodSummary={periodSummary} />
                        </div>

                        {/* 3. Charts Row */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[450px]">
                            {/* Stacked Attendance Chart (8 Cols) */}
                            {/* Stacked Attendance Chart */}
                            <div className={`${hasPermission('FEATURE_BREAK_ANALYSIS_VIEW') ? 'xl:col-span-8' : 'xl:col-span-12'} h-full transition-all duration-300`}>
                                <AttendanceAnalyticsChart logs={logs} currentYear={viewYear} />
                            </div>

                            {/* Break Analysis (4 Cols) */}
                            {hasPermission('FEATURE_BREAK_ANALYSIS_VIEW') && (
                                <div className="xl:col-span-4 h-full">
                                    {(activeTab === 'my_attendance' || hasPermission('FEATURE_BREAK_ANALYSIS_VIEW')) ? (
                                        <BreakAnalysisWidget
                                            employeeId={selectedEmployeeId}
                                            logs={logs}
                                            totalBreakSeconds={periodSummary?.total_break_seconds}
                                            startDate={startDate}
                                            endDate={endDate}
                                        />
                                    ) : (
                                        <div className="h-full bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                                                <Users size={24} />
                                            </div>
                                            <h3 className="font-bold text-slate-700">Erişim Kısıtlı</h3>
                                            <p className="text-sm text-slate-500 mt-1">Bu personelin mola analizlerini görme yetkiniz yok.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. Detailed Logs Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Clock size={20} className="text-slate-400" />
                                    Detaylı Günlük Hareketler
                                </h3>
                                <button className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                    <Download size={14} />
                                    Excel İndir
                                </button>
                            </div>
                            <AttendanceLogTable logs={viewScope === 'DAILY' ? logs.filter(l => l.work_date === new Date().toISOString().split('T')[0]) : logs} />
                        </div>

                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4">
                        {/* Team View */}
                        <div className="lg:col-span-2 space-y-6">
                            <TeamAttendanceOverview teamData={teamMembers} onMemberClick={handleTeamMemberClick} />
                        </div>
                        <div>
                            <TeamComparisonChart data={teamComparison} />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Attendance;
