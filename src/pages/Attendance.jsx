
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
import HeroDailySummary from '../components/HeroDailySummary';
import MonthlyPerformanceSummary from '../components/MonthlyPerformanceSummary';
import Skeleton from '../components/Skeleton';
import { format } from 'date-fns';

const Attendance = () => {
    const { user } = useAuth();

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
    const [dateFilter, setDateFilter] = useState('MONTH');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // --- EFFECT: Init ---
    useEffect(() => {
        handleDateFilterChange('MONTH');
        checkTeamVisibility();
    }, [user]);

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

    const handleDateFilterChange = (type) => {
        setDateFilter(type);
        const today = new Date();
        let start = new Date();
        let end = new Date();

        if (type === 'WEEK') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end.setDate(start.getDate() + 6);
        } else if (type === 'MONTH') {
            // If today is >= 26th, current period is This Month 26 - Next Month 25
            // But usually "Current Month" means the period we are IN.
            // Let's stick to standard 26-25 logic.
            if (today.getDate() >= 26) {
                start = new Date(today.getFullYear(), today.getMonth(), 26);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 25);
            } else {
                start = new Date(today.getFullYear(), today.getMonth() - 1, 26);
                end = new Date(today.getFullYear(), today.getMonth(), 25);
            }
        }

        if (type !== 'CUSTOM') {
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        }
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
                    <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('my_attendance')}
                            className={`flex - 1 sm: flex - none px - 6 py - 2.5 rounded - lg text - sm font - bold transition - all flex items - center justify - center gap - 2 ${activeTab === 'my_attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                        >
                            <User size={18} />
                            Kendi Mesaim
                        </button>
                        {hasTeam && (
                            <button
                                onClick={() => setActiveTab('team_attendance')}
                                className={`flex - 1 sm: flex - none px - 6 py - 2.5 rounded - lg text - sm font - bold transition - all flex items - center justify - center gap - 2 ${activeTab === 'team_attendance' || activeTab === 'team_detail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                            >
                                <Users size={18} />
                                Ekip
                            </button>
                        )}
                    </div>

                    {/* Date Filter */}
                    {(activeTab === 'my_attendance' || activeTab === 'team_detail') && (
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                            <button onClick={() => handleDateFilterChange('WEEK')} className={`px - 4 py - 2 rounded - lg text - xs font - bold transition - all ${dateFilter === 'WEEK' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'} `}>Hafta</button>
                            <button onClick={() => handleDateFilterChange('MONTH')} className={`px - 4 py - 2 rounded - lg text - xs font - bold transition - all ${dateFilter === 'MONTH' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'} `}>Ay</button>
                            <div className="h-5 w-px bg-slate-200 mx-2"></div>
                            <div className="flex items-center gap-2 px-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setDateFilter('CUSTOM'); }}
                                    className="text-xs font-bold text-slate-700 outline-none w-24 bg-transparent cursor-pointer"
                                />
                                <span className="text-slate-300">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => { setEndDate(e.target.value); setDateFilter('CUSTOM'); }}
                                    className="text-xs font-bold text-slate-700 outline-none w-24 bg-transparent cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Back Button for Team Detail */}
            {activeTab === 'team_detail' && (
                <button onClick={() => setActiveTab('team_attendance')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
                    ← Ekip Tablosuna Dön
                </button>
            )}

            {loading ? (
                <div className="space-y-6">
                    <Skeleton className="h-48 rounded-2xl" />
                    <div className="grid grid-cols-2 gap-6"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
                    <Skeleton className="h-96 rounded-2xl" />
                </div>
            ) : (activeTab === 'my_attendance' || activeTab === 'team_detail') ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {/* 1.5. Hero Daily Summary (Today) */}
                    <HeroDailySummary summary={todaySummary} loading={loading} />

                    {/* 2. Monthly Summary Section */}
                    {/* Includes 3-part progress bar and Net Status Card */}
                    <div className="bg-white p-1 rounded-3xl">
                        <MonthlyPerformanceSummary logs={logs} periodSummary={periodSummary} />
                    </div>

                    {/* 3. Charts Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[450px]">
                        {/* Stacked Attendance Chart (8 Cols) */}
                        <div className="xl:col-span-8 h-full">
                            <WeeklyAttendanceChart logs={logs} />
                        </div>

                        {/* Break Analysis (4 Cols) */}
                        <div className="xl:col-span-4 h-full">
                            <BreakAnalysisWidget
                                logs={logs}
                                totalBreakSeconds={periodSummary?.total_break_seconds}
                                startDate={startDate}
                                endDate={endDate}
                            />
                        </div>
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
                        <AttendanceLogTable logs={logs} />
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
            )}
        </div>
    );
};

export default Attendance;
