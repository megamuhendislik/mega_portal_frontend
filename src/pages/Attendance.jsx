
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Clock, Calendar, Users, User, Filter, FileDown
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AttendanceLogTable from '../components/AttendanceLogTable';
import AttendanceAnalyticsChart from '../components/AttendanceAnalyticsChart';
import HeroDailySummary from '../components/HeroDailySummary';
import MonthlyPerformanceSummary from '../components/MonthlyPerformanceSummary';
import MonthlyBalanceCarousel from '../components/MonthlyBalanceCarousel';
import Skeleton from '../components/Skeleton';
import AttendanceTracking from './AttendanceTracking';
import WeeklyOtDetailDrawer from '../components/WeeklyOtDetailDrawer';
import MonthlyReportsModal from '../components/MonthlyReportsModal';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { getIstanbulToday, toIstanbulParts } from '../utils/dateUtils';
import useFiscalPeriods from '../hooks/useFiscalPeriods';

const Attendance = () => {
    const { user, hasPermission } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // UI State
    const [activeTab, setActiveTab] = useState('my_attendance'); // 'my_attendance', 'team_attendance', 'team_detail'
    const [loading, setLoading] = useState(true);
    const [hasTeam, setHasTeam] = useState(false);

    // Data State
    const [logs, setLogs] = useState([]);
    const [periodSummary, setPeriodSummary] = useState(null);
    const [todaySummary, setTodaySummary] = useState(null);
    const [leaveCoverageMap, setLeaveCoverageMap] = useState({});

    // Filters
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

    // Date State — useFiscalPeriods hook'tan (kullanıcı takvimi) gelir.
    // Eski hardcoded `_id >= 26` mantığı kaldırıldı; FiscalCalendar custom
    // sınırlarda (22-21 vs.) olabilir.
    const todayStr = getIstanbulToday();
    const {
        current: fiscalCurrent,
        findByYearMonth: findFiscalByYearMonth,
        findByDate: findFiscalByDate,
    } = useFiscalPeriods({ months: 24 });

    const [viewYear, setViewYear] = useState(null);
    const [viewMonth, setViewMonth] = useState(null); // 0-based index

    // Hook hazır olunca initial year/month'i kur
    useEffect(() => {
        if (fiscalCurrent && viewYear === null) {
            setViewYear(fiscalCurrent.year);
            setViewMonth(fiscalCurrent.month - 1); // 1-based → 0-based
        }
    }, [fiscalCurrent, viewYear]);
    const [viewScope, setViewScope] = useState('DAILY'); // 'DAILY' | 'MONTHLY'
    const [monthlyWeeklyOt, setMonthlyWeeklyOt] = useState(null);
    const [weeklyOtDrawerOpen, setWeeklyOtDrawerOpen] = useState(false);
    const [reportsModalOpen, setReportsModalOpen] = useState(false);
    const [weeklyOtDrawerRefDate, setWeeklyOtDrawerRefDate] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDate, setSelectedDate] = useState(todayStr);

    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const years = [2024, 2025, 2026, 2027];

    // --- EFFECT: Fetch monthly weekly OT ---
    const weeklyOtEmployeeId = selectedEmployeeId || user?.employee?.id || user?.id;
    useEffect(() => {
        if (viewYear == null || viewMonth == null) return; // Hook henüz hazır değil
        const apiMonth = viewMonth + 1; // 0-based → 1-based
        const params = { month_view: true, year: viewYear, month: apiMonth };
        if (weeklyOtEmployeeId) params.employee_id = weeklyOtEmployeeId;
        api.get('/overtime-requests/weekly-ot-status/', { params })
            .then(res => setMonthlyWeeklyOt(res.data)).catch(() => setMonthlyWeeklyOt(null));
    }, [viewYear, viewMonth, weeklyOtEmployeeId]);

    // --- EFFECT: Init ---
    useEffect(() => {
        if (viewYear != null && viewMonth != null) updateDateRange(viewYear, viewMonth, viewScope);
        checkTeamVisibility();

        // URL'den employee_id varsa doğrudan o kişinin mesai detayına geç
        const urlEmployeeId = searchParams.get('employee_id');
        if (urlEmployeeId) {
            setSelectedEmployeeId(parseInt(urlEmployeeId));
            setActiveTab('team_detail');
            // URL'i temizle (tekrar ziyarette kalmasın)
            searchParams.delete('employee_id');
            setSearchParams(searchParams, { replace: true });
        }
    }, [user]);

    // Recalculate dates when year/month/scope changes
    useEffect(() => {
        if (viewYear != null && viewMonth != null) updateDateRange(viewYear, viewMonth, viewScope);
    }, [viewYear, viewMonth, viewScope]);

    // --- HANDLERS ---
    const checkTeamVisibility = () => {
        if (!user) return;
        const canViewTeam = user.user?.is_superuser || user.has_team;
        setHasTeam(canViewTeam);
        if (activeTab === 'my_attendance' && !selectedEmployeeId) {
            setSelectedEmployeeId(user.employee?.id || user.id);
        }
    };

    // Fiscal calendar bilinçli period range. Hook'tan (kullanıcı takvimi)
    // okur; bulunamazsa eski 26-25 fallback (test/initial render).
    const updateDateRange = (year, month, scope) => {
        // year=int 1-based fiscal, month=0-based JS index → 1-based for lookup
        const oneBasedMonth = month + 1;
        const entry = findFiscalByYearMonth(year, oneBasedMonth);
        let start, end;
        if (entry) {
            start = entry.start_date;
            end = entry.end_date;
        } else {
            // Fallback (hook henüz yüklenmedi): 26-25 varsayım
            const e = new Date(year, month, 25);
            const s = new Date(year, month - 1, 26);
            start = format(s, 'yyyy-MM-dd');
            end = format(e, 'yyyy-MM-dd');
        }
        setStartDate(start);
        setEndDate(end);
    };

    // Separate loading states — only true on FIRST load (no data yet)
    const [isPeriodLoading, setIsPeriodLoading] = useState(true);
    const [isDailyLoading, setIsDailyLoading] = useState(false);

    // Consolidated loading for initial render
    const isLoading = isPeriodLoading && !logs.length;

    // #60: fetch sıra-jetonları (bayat yanıt yeni seçimi ezmesin)
    const periodSeqRef = useRef(0);
    const dailySeqRef = useRef(0);

    const fetchPeriodData = useCallback(async () => {
        if (!selectedEmployeeId || !startDate || !endDate) return;
        // Only show loading if we have no data yet (first load)
        if (!logs.length) setIsPeriodLoading(true);
        // #60: bayat yanıt yeni seçimi (kişi/dönem hızlı değişimi) ezmesin
        const mySeq = ++periodSeqRef.current;
        const isStale = () => mySeq !== periodSeqRef.current;
        try {
            const [logsRes, sumRes] = await Promise.all([
                api.get(`/attendance/?employee_id=${selectedEmployeeId}&start_date=${startDate}&end_date=${endDate}&limit=1000`),
                api.get(`/attendance/monthly_summary/?employee_id=${selectedEmployeeId}&start_date=${startDate}&end_date=${endDate}`)
            ]);
            if (isStale()) return;  // #60
            setLogs(logsRes.data.results || logsRes.data);
            setPeriodSummary(sumRes.data);

            // Fetch leave coverage for the period
            if (selectedEmployeeId && startDate && endDate) {
                try {
                    const coverageRes = await api.get('/attendance/leave-coverage/', {
                        params: {
                            employee_ids: String(selectedEmployeeId),
                            start_date: startDate,
                            end_date: endDate,
                        }
                    });
                    if (isStale()) return;  // #60
                    const empCoverage = coverageRes.data?.coverages?.[String(selectedEmployeeId)] || {};
                    setLeaveCoverageMap(empCoverage);
                } catch (err) {
                    console.error('Leave coverage fetch error:', err);
                    if (!isStale()) setLeaveCoverageMap({});
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (!isStale()) {  // #60: bayat fetch loading'i erken kapatmasın
                setIsPeriodLoading(false);
                setLoading(false);
            }
        }
    }, [selectedEmployeeId, startDate, endDate]);

    const fetchDailyData = useCallback(async () => {
        if (!selectedEmployeeId) return;
        if (activeTab !== 'my_attendance' && activeTab !== 'team_detail') return;

        // Only show loading on first load
        if (!todaySummary) setIsDailyLoading(true);
        const mySeq = ++dailySeqRef.current;  // #60
        const isStale = () => mySeq !== dailySeqRef.current;
        try {
            const dateParam = viewScope === 'DAILY' && selectedDate ? `&date=${selectedDate}` : '';
            const todayRes = await api.get(`/attendance/today_summary/?employee_id=${selectedEmployeeId}${dateParam}`);
            if (isStale()) return;  // #60
            setTodaySummary(todayRes.data);
        } catch (error) {
            console.error("Daily summary fetch error", error);
        } finally {
            if (!isStale()) setIsDailyLoading(false);  // #60
        }
    }, [selectedEmployeeId, selectedDate, viewScope, activeTab]);

    // --- EFFECT: Load Period Data ---
    useEffect(() => {
        if (selectedEmployeeId && startDate && endDate) {
            if (activeTab === 'my_attendance' || activeTab === 'team_detail') {
                fetchPeriodData();
            }
        }
    }, [fetchPeriodData, activeTab]);

    // --- EFFECT: Load Daily Summary ---
    useEffect(() => {
        if (selectedEmployeeId) {
            fetchDailyData();
        }
    }, [fetchDailyData]);

    const handleTeamMemberClick = (id) => {
        setSelectedEmployeeId(id);
        setActiveTab('team_detail');
    };

    return (
        <div className="max-w-[1700px] mx-auto space-y-8 pb-20 px-4 md:px-8 pt-6">

            {/* 1. Page Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
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
                    {/* View Switcher & Date Controls */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">

                        {/* 1. Mode Toggle (Segmented Control) */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => {
                                    setViewScope('DAILY');
                                    if (selectedDate === '') setSelectedDate(getIstanbulToday());
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewScope === 'DAILY'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${viewScope === 'DAILY' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                Günlük
                            </button>
                            <button
                                onClick={() => setViewScope('MONTHLY')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewScope === 'MONTHLY'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Calendar size={16} />
                                Aylık
                            </button>
                        </div>

                        <div className="w-px h-8 bg-slate-100 hidden sm:block"></div>

                        {/* 2. Conditional Controls */}
                        {viewScope === 'DAILY' ? (
                            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                {/* Today Shortcut */}
                                <button
                                    onClick={() => setSelectedDate(getIstanbulToday())}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${selectedDate === getIstanbulToday()
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
                                        }`}
                                >
                                    Bugün
                                </button>

                                {/* Date Picker */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                        onChange={(e) => {
                                            const newDate = e.target.value;
                                            setSelectedDate(newDate);
                                            // Auto-sync via fiscal calendar (kullanıcı takvimi)
                                            const period = findFiscalByDate(newDate);
                                            let targetYear, targetMonth;
                                            if (period) {
                                                targetYear = period.year;
                                                targetMonth = period.month - 1; // 1→0-based
                                            } else {
                                                // Hook yüklenmedi → 26-25 fallback
                                                const [y, m, d] = newDate.split('-').map(Number);
                                                targetMonth = d >= 26 ? m : m - 1;
                                                targetYear = y;
                                                if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
                                            }
                                            if (targetMonth !== viewMonth || targetYear !== viewYear) {
                                                setViewMonth(targetMonth);
                                                setViewYear(targetYear);
                                            }
                                        }}
                                        className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all cursor-pointer hover:bg-white"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                    <select
                                        value={viewMonth}
                                        onChange={(e) => setViewMonth(parseInt(e.target.value))}
                                        className="bg-transparent text-sm font-bold text-slate-700 py-1 pl-2 pr-1 cursor-pointer outline-none hover:text-indigo-600"
                                    >
                                        {months.map((m, i) => (
                                            <option key={i} value={i}>{m}</option>
                                        ))}
                                    </select>
                                    <div className="w-px h-4 bg-slate-300"></div>
                                    <select
                                        value={viewYear}
                                        onChange={(e) => setViewYear(parseInt(e.target.value))}
                                        className="bg-transparent text-sm font-bold text-slate-700 py-1 pl-1 pr-2 cursor-pointer outline-none hover:text-indigo-600"
                                    >
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                {startDate && endDate && (
                                    <div className="text-[10px] font-medium text-slate-400 px-2 leading-tight hidden xl:block">
                                        {new Date(startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}
                                        {' - '}
                                        {new Date(endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('my_attendance')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'my_attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                        >
                            <User size={18} />
                            Kendi Mesaim
                        </button>
                        {hasTeam && (
                            <button
                                onClick={() => setActiveTab('team_attendance')}
                                className={`flex-1 sm:flex-none px-3 sm:px-4 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'team_attendance' || activeTab === 'team_detail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                            >
                                <Users size={18} />
                                Ekip
                            </button>
                        )}
                    </div>

                    {/* Self-servis aylık rapor pop-up tetikleyicisi */}
                    <button
                        onClick={() => setReportsModalOpen(true)}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-600 border border-slate-200 shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all"
                    >
                        <FileDown size={18} />
                        Aylık Raporlarım
                    </button>
                </div>
            </div>

            <MonthlyReportsModal open={reportsModalOpen} onClose={() => setReportsModalOpen(false)} />

            {/* Back Button for Team Detail */}
            {
                activeTab === 'team_detail' && (
                    <button onClick={() => setActiveTab('team_attendance')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
                        ← Ekip Tablosuna Dön
                    </button>
                )
            }

            {
                isLoading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-48 rounded-2xl" />
                        <div className="grid grid-cols-2 gap-6"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
                        <Skeleton className="h-96 rounded-2xl" />
                    </div>
                ) : (activeTab === 'my_attendance' || activeTab === 'team_detail') ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

                        {/* 1.5. Hero Daily Summary (Today) - ONLY IF DAILY SCOPE */}
                        {viewScope === 'DAILY' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                <HeroDailySummary summary={todaySummary} loading={isDailyLoading} />
                            </div>
                        )}

                        {/* 2. Monthly Summary Section */}
                        {/* Includes 3-part progress bar and Net Status Card */}
                        <div id="attendance-content-start" className="bg-white p-1 rounded-3xl scroll-mt-24">
                            <MonthlyPerformanceSummary logs={logs} periodSummary={periodSummary} onMonthSelect={(year, month) => { setViewYear(year); setViewMonth(month - 1); }} />
                            <MonthlyBalanceCarousel periodSummary={periodSummary} />

                            {/* Haftalık OT Limitleri — kompakt yatay chip'ler */}
                            {/* Haftalık OT Limitleri — ince satır */}
                            {monthlyWeeklyOt?.weeks?.length > 0 && (() => {
                                const mNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
                                const fmtShort = (s) => { const d = new Date(s + 'T00:00:00'); return `${d.getDate()} ${mNames[d.getMonth()]}`; };
                                // Denetim 2026-06-10 (#121): 'Bu Hafta'/geçmiş/gelecek tespiti lokal TZ
                                // yerine İstanbul (todayStr, YYYY-MM-DD leksikografik=kronolojik); Pzt
                                // sınırını straddle eden pencerede rozet doğru haftaya düşer.
                                return (
                                    <div className="flex items-stretch justify-evenly px-3 py-2.5 border-t border-slate-100">
                                        {monthlyWeeklyOt.weeks.map((week, i) => {
                                            const isUnlimited = week.is_unlimited;
                                            const ratio = isUnlimited ? 0 : (week.used_hours / (week.limit_hours || 1));
                                            const isPast = week.window_end < todayStr;
                                            const isCurrent = week.window_start <= todayStr && week.window_end >= todayStr;

                                            // Renk: geçmiş=slate, aktif=indigo vurgulu, gelecek=slate açık
                                            let borderCls, bgCls, dotColor, textColor, dateColor;
                                            if (isCurrent) {
                                                borderCls = 'border-indigo-300 ring-1 ring-indigo-200';
                                                bgCls = 'bg-indigo-50 hover:bg-indigo-100';
                                                dotColor = ratio >= 0.9 ? 'bg-red-500' : ratio >= 0.7 ? 'bg-amber-400' : 'bg-indigo-500';
                                                textColor = ratio >= 0.9 ? 'text-red-600' : ratio >= 0.7 ? 'text-amber-600' : 'text-indigo-700';
                                                dateColor = 'text-indigo-500';
                                            } else if (isPast) {
                                                borderCls = 'border-slate-200';
                                                bgCls = 'bg-slate-50 hover:bg-slate-100';
                                                dotColor = ratio >= 0.9 ? 'bg-red-400' : ratio >= 0.7 ? 'bg-amber-300' : 'bg-emerald-400';
                                                textColor = ratio >= 0.9 ? 'text-red-500' : ratio >= 0.7 ? 'text-amber-500' : 'text-slate-600';
                                                dateColor = 'text-slate-400';
                                            } else {
                                                borderCls = 'border-slate-100 border-dashed';
                                                bgCls = 'bg-white hover:bg-slate-50';
                                                dotColor = 'bg-slate-300';
                                                textColor = 'text-slate-400';
                                                dateColor = 'text-slate-300';
                                            }

                                            return (
                                                <div key={i}
                                                    className={`flex-1 flex flex-col items-center gap-0.5 px-1.5 py-1.5 mx-0.5 rounded-lg border ${borderCls} ${bgCls} cursor-pointer transition-all`}
                                                    onClick={() => { setWeeklyOtDrawerRefDate(week.window_start); setWeeklyOtDrawerOpen(true); }}
                                                    title={`${fmtShort(week.window_start)} – ${fmtShort(week.window_end)}\n${isCurrent ? 'Bu hafta' : isPast ? 'Geçmiş' : 'Gelecek'}`}
                                                >
                                                    {isCurrent && <span className="text-[7px] font-bold text-indigo-500 uppercase tracking-widest leading-none">Bu Hafta</span>}
                                                    <span className={`text-[8px] font-medium whitespace-nowrap leading-none ${dateColor}`}>
                                                        {fmtShort(week.window_start)}–{fmtShort(week.window_end)}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                                        <span className={`text-[10px] font-bold tabular-nums leading-none ${textColor}`}>
                                                            {isUnlimited ? `${week.used_hours}` : `${week.used_hours}/${week.limit_hours}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <WeeklyOtDetailDrawer open={weeklyOtDrawerOpen} onClose={() => setWeeklyOtDrawerOpen(false)} referenceDate={weeklyOtDrawerRefDate} employeeId={weeklyOtEmployeeId} />

                        {/* 3. Charts Row */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[500px]">
                            {/* Stacked Attendance Chart (Full Width) */}
                            <div className="xl:col-span-12 h-full transition-all duration-300">
                                <AttendanceAnalyticsChart
                                    logs={logs}
                                    currentYear={viewYear}
                                    employeeId={selectedEmployeeId}
                                    onDateClick={(date) => {
                                        setSelectedDate(date);
                                        // Auto-switch period via fiscal calendar (kullanıcı takvimi)
                                        const period = findFiscalByDate(date);
                                        let targetYear, targetMonth;
                                        if (period) {
                                            targetYear = period.year;
                                            targetMonth = period.month - 1; // 1→0-based
                                        } else {
                                            // Fallback: 26-25 (hook yüklenmedi)
                                            const dp = toIstanbulParts(date);
                                            targetMonth = dp.day >= 26 ? dp.month : dp.month - 1;
                                            targetYear = dp.year;
                                            if (targetMonth > 11) {
                                                targetMonth = 0;
                                                targetYear += 1;
                                            }
                                        }

                                        // Only update if different (to avoid loop/re-fetch if not needed)
                                        if (targetMonth !== viewMonth || targetYear !== viewYear) {
                                            setViewMonth(targetMonth);
                                            setViewYear(targetYear);
                                        }

                                        setViewScope('DAILY');
                                    }}
                                />
                            </div>
                        </div>

                        {/* 4. Detailed Logs Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Clock size={20} className="text-slate-400" />
                                    Detaylı Günlük Hareketler
                                    {viewScope === 'DAILY' && <span className="text-xs text-slate-400 font-medium ml-2">({selectedDate})</span>}
                                </h3>
                            </div>
                            <AttendanceLogTable logs={viewScope === 'DAILY' ? logs.filter(l => l.work_date === selectedDate) : logs} leaveCoverageMap={leaveCoverageMap} visibleDates={viewScope === 'DAILY' ? [selectedDate] : null} />
                        </div>

                    </div>
                ) : (
                    // OPTIMIZED TEAM DASHBOARD VIEW
                    // OPTIMIZED TEAM DASHBOARD VIEW
                    <AttendanceTracking
                        embedded={true}
                        year={viewYear}
                        month={viewMonth}
                        scope={viewScope}
                        onMemberClick={handleTeamMemberClick}
                    />
                )
            }
        </div >
    );
};

export default Attendance;
