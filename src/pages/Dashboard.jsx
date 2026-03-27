import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import useSmartPolling from '../hooks/useSmartPolling'; // Import Hook

import AttendanceAnalyticsChart from '../components/AttendanceAnalyticsChart';
import MonthlyPerformanceSummary from '../components/MonthlyPerformanceSummary';
import MonthlyBalanceCarousel from '../components/MonthlyBalanceCarousel';
import StatCard from '../components/StatCard';
import Skeleton from '../components/Skeleton';
import { Clock, Briefcase, Timer, FileText, CheckCircle2, ChefHat, Calendar as CalendarIcon, Zap, Coffee, Scale, User, ArrowUpRight, AlertTriangle, AlertCircle, XCircle, Cake, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getIstanbulToday, getIstanbulDateOffset, formatIstanbulTime } from '../utils/dateUtils';

// Yaklaşan Etkinlikler sabit tanımlar (component dışında — re-render'da yeniden oluşturulmaz)
const eventTypeLabels = {
    HOLIDAY: 'Tatil',
    LEAVE_REQUEST: 'İzin',
    OVERTIME_ASSIGNMENT: 'Mesai Ataması',
    OVERTIME_REQUEST: 'Mesai Talebi',
    HEALTH_REPORT: 'Sağlık R.',
    PERSONAL: 'Kişisel',
    EXTERNAL_DUTY: 'Dış Görev',
    CARDLESS_ENTRY: 'Kartsız Giriş',
};

const eventTypeColors = {
    HOLIDAY: 'bg-red-100 text-red-700',
    LEAVE_REQUEST: 'bg-emerald-100 text-emerald-700',
    OVERTIME_ASSIGNMENT: 'bg-purple-100 text-purple-700',
    OVERTIME_REQUEST: 'bg-amber-100 text-amber-700',
    HEALTH_REPORT: 'bg-pink-100 text-pink-700',
    PERSONAL: 'bg-blue-100 text-blue-700',
    EXTERNAL_DUTY: 'bg-cyan-100 text-cyan-700',
    CARDLESS_ENTRY: 'bg-orange-100 text-orange-700',
};

const eventDotColors = {
    HOLIDAY: 'bg-red-500',
    LEAVE_REQUEST: 'bg-emerald-500',
    OVERTIME_ASSIGNMENT: 'bg-purple-500',
    OVERTIME_REQUEST: 'bg-amber-500',
    HEALTH_REPORT: 'bg-pink-500',
    PERSONAL: 'bg-blue-500',
    EXTERNAL_DUTY: 'bg-cyan-500',
    CARDLESS_ENTRY: 'bg-orange-500',
};

const statusBadges = {
    APPROVED: { label: 'Onaylandı', className: 'bg-emerald-100 text-emerald-700' },
    PENDING: { label: 'Bekliyor', className: 'bg-amber-100 text-amber-700' },
    CLAIMED: { label: 'Talep Edildi', className: 'bg-blue-100 text-blue-700' },
    EXPIRED: { label: 'Süresi Doldu', className: 'bg-slate-100 text-slate-500' },
    REJECTED: { label: 'Reddedildi', className: 'bg-red-100 text-red-700' },
    CANCELLED: { label: 'İptal', className: 'bg-slate-100 text-slate-500' },
};

// Ardışık tatilleri birleştir (ör: Ramazan Bayramı 4 gün → tek satır)
const mergeConsecutiveHolidays = (events) => {
    const holidays = events
        .filter(e => e.type === 'HOLIDAY')
        .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const others = events.filter(e => e.type !== 'HOLIDAY');

    if (holidays.length === 0) return events;

    // Ardışık günleri grupla
    const runs = [];
    let run = [holidays[0]];
    for (let i = 1; i < holidays.length; i++) {
        const prevStr = run[run.length - 1].start?.split('T')[0] || run[run.length - 1].start;
        const currStr = holidays[i].start?.split('T')[0] || holidays[i].start;
        const [py, pm, pd] = prevStr.split('-').map(Number);
        const [cy, cm, cd] = currStr.split('-').map(Number);
        const diff = (new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / 86400000;
        if (diff === 1) {
            run.push(holidays[i]);
        } else {
            runs.push(run);
            run = [holidays[i]];
        }
    }
    runs.push(run);

    // Her grubu birleştir
    const merged = runs.map(group => {
        if (group.length === 1) return group[0];

        // Ortak ismi bul (Arifesi, X. Gün, Yarım Gün gibi ekleri sıyır)
        const cleaned = group.map(h =>
            h.title.replace(/\s*\(Yarım Gün\)/i, '').replace(/\s*Arifesi/i, '')
                .replace(/\s*\d+\.\s*Gün/i, '').trim()
        );
        const freq = {};
        cleaned.forEach(c => { freq[c] = (freq[c] || 0) + 1; });
        const baseName = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];

        // Tarih aralığı
        const firstStr = group[0].start?.split('T')[0] || group[0].start;
        const lastStr = group[group.length - 1].start?.split('T')[0] || group[group.length - 1].start;
        const [fy, fm, fd] = firstStr.split('-').map(Number);
        const [ly, lm, ld] = lastStr.split('-').map(Number);
        const firstFmt = format(new Date(fy, fm - 1, fd), 'd MMM', { locale: tr });
        const lastFmt = format(new Date(ly, lm - 1, ld), 'd MMM', { locale: tr });
        const dateRange = fm === lm ? `${fd}–${lastFmt}` : `${firstFmt}–${lastFmt}`;

        // Toplam gün (yarım gün varsa 0.5)
        const totalDays = group.reduce((s, h) => s + (h.is_half_day ? 0.5 : 1), 0);
        const dayLabel = totalDays % 1 === 0 ? `${totalDays} gün` : `${String(totalDays.toFixed(1)).replace('.', ',')} gün`;

        return {
            ...group[0],
            title: `${baseName} (${dateRange}, ${dayLabel})`,
        };
    });

    return [...others, ...merged];
};

const groupEventsByDay = (events) => {
    const today = getIstanbulToday();
    const tomorrow = getIstanbulDateOffset(1);

    const groups = {};
    events.forEach(ev => {
        const dateStr = ev.start?.split('T')[0] || ev.start;
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(ev);
    });

    return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateStr, items]) => {
            let label;
            if (dateStr === today) label = 'Bugün';
            else if (dateStr === tomorrow) label = 'Yarın';
            else {
                const [ey, em, ed] = dateStr.split('-').map(Number);
                label = format(new Date(ey, em - 1, ed), 'd MMM EEEE', { locale: tr });
            }
            return { dateStr, label, items };
        });
};

const FISCAL_MONTH_NAMES = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Bugünün fiscal ay/yılını hesapla (26-25 sistemi)
const getCurrentFiscal = () => {
    const todayStr = getIstanbulToday();
    const [y, m, d] = todayStr.split('-').map(Number);
    if (d >= 26) {
        return m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
    }
    return { year: y, month: m };
};

// Fiscal ay/yıldan dönem tarihlerini hesapla
const getFiscalPeriodDates = (year, month) => {
    let startMonth, startYear;
    if (month === 1) {
        startMonth = 11; startYear = year - 1; // Dec (0-based for JS Date)
    } else {
        startMonth = month - 2; startYear = year; // 0-based
    }
    const start = new Date(startYear, startMonth, 26);
    const end = new Date(year, month - 1, 25);
    return {
        startStr: format(start, 'yyyy-MM-dd'),
        endStr: format(end, 'yyyy-MM-dd')
    };
};

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
    const [birthdayBalance, setBirthdayBalance] = useState(null);
    const [birthdayBannerVisible, setBirthdayBannerVisible] = useState(() => {
        const todayKey = getIstanbulToday();
        const monthKey = todayKey.slice(0, 7); // "2026-03"
        const dismissed = localStorage.getItem(`birthday_banner_dismissed_${monthKey}`);
        return !dismissed;
    });

    // UI States
    const [requestTab, setRequestTab] = useState('my_requests');

    // Fiscal month navigation
    const [selectedFiscal, setSelectedFiscal] = useState(getCurrentFiscal);
    const currentFiscal = useMemo(getCurrentFiscal, []);
    const isCurrentMonth = selectedFiscal.year === currentFiscal.year && selectedFiscal.month === currentFiscal.month;

    const goToPrevMonth = () => {
        setSelectedFiscal(prev =>
            prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 }
        );
    };
    const goToNextMonth = () => {
        const cur = getCurrentFiscal();
        setSelectedFiscal(prev => {
            const next = prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 };
            // Gelecek aylara gitmeyi engelle
            if (next.year > cur.year || (next.year === cur.year && next.month > cur.month)) return prev;
            return next;
        });
    };
    const goToCurrentMonth = () => setSelectedFiscal(getCurrentFiscal());

    // Period dates state (updated from backend response)
    const [periodDates, setPeriodDates] = useState(null);

    const fetchDashboardData = async () => {
        // Align with Attendance.jsx: use user.employee.id if available
        const employeeId = user?.employee?.id || user?.id;

        if (!employeeId) { setLoading(false); return; }

        try {
            // NOTE: For Smart Polling, we might want to skip setting 'loading' to true on subsequent fetches?
            // Currently fetchDashboardData sets loading=false at end, but doesn't set it to true at start (except initial state).
            // So it's safe for background polling (won't flash skeleton).

            const { startStr, endStr } = getFiscalPeriodDates(selectedFiscal.year, selectedFiscal.month);

            const [todayRes, monthRes, logsRes, reqRes, incReqRes, eventsRes, birthdayRes] = await Promise.allSettled([
                api.get('/attendance/today_summary/'),
                api.get(`/attendance/monthly_summary/?employee_id=${employeeId}&start_date=${startStr}&end_date=${endStr}`),
                api.get(`/attendance/my_attendance/?start_date=${startStr}&end_date=${endStr}`), // Need logs for charts
                api.get('/leave-requests/'), // Simplified: just getting my leaves for now
                api.get('/leave-requests/pending_approvals/'),
                api.get(`/calendar-events/?start=${getIstanbulToday()}&end=${getIstanbulDateOffset(14)}&employee_id=${employeeId}&include_ot_assignments=true&include_ot_requests=true&include_leaves=true&include_health_reports=true&include_cardless=true`),
                api.get('/leave-requests/birthday-balance/')
            ]);

            if (todayRes.status === 'fulfilled') setTodaySummary(todayRes.value.data);
            if (monthRes.status === 'fulfilled') {
                setMonthlySummary(monthRes.value.data);
                // Store period dates from backend for other uses
                if (monthRes.value.data.period_start && monthRes.value.data.period_end) {
                    setPeriodDates({
                        startStr: monthRes.value.data.period_start,
                        endStr: monthRes.value.data.period_end
                    });
                }
            }
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
                // Show all upcoming event types: personal events, holidays, OT, leaves, health reports
                const agendaItems = results.filter(e => ['PERSONAL', 'HOLIDAY', 'OVERTIME_ASSIGNMENT', 'OVERTIME_REQUEST', 'LEAVE_REQUEST', 'HEALTH_REPORT', 'EXTERNAL_DUTY', 'CARDLESS_ENTRY'].includes(e.type));

                // Sort by start date
                agendaItems.sort((a, b) => new Date(a.start) - new Date(b.start));

                setCalendarEvents(agendaItems);
            }

            if (birthdayRes.status === 'fulfilled') setBirthdayBalance(birthdayRes.value.data);

        } catch (error) {
            console.error("Dashboard Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount + when fiscal month changes
    useEffect(() => {
        fetchDashboardData();
    }, [user, selectedFiscal.year, selectedFiscal.month]);

    // Smart Polling (Every 60s)
    useSmartPolling(fetchDashboardData, 60000);

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

    const groupedEvents = useMemo(() => groupEventsByDay(mergeConsecutiveHolidays(calendarEvents)), [calendarEvents]);

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
                <div className="flex items-center gap-3">
                    {/* Fiscal Month Navigator */}
                    <div className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <button
                            onClick={goToPrevMonth}
                            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Önceki Ay"
                        >
                            <ChevronLeft size={16} className="text-slate-500" />
                        </button>
                        <button
                            onClick={isCurrentMonth ? undefined : goToCurrentMonth}
                            className={`px-2 min-w-[110px] text-center text-sm font-bold transition-colors ${
                                isCurrentMonth ? 'text-indigo-600' : 'text-slate-700 hover:text-indigo-600 cursor-pointer'
                            }`}
                            title={isCurrentMonth ? 'Mevcut Dönem' : 'Bugüne Dön'}
                        >
                            {FISCAL_MONTH_NAMES[selectedFiscal.month]} {selectedFiscal.year}
                        </button>
                        <button
                            onClick={goToNextMonth}
                            disabled={isCurrentMonth}
                            className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Sonraki Ay"
                        >
                            <ChevronRight size={16} className="text-slate-500" />
                        </button>
                    </div>
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

            {/* Birthday Banner — Hatırlatma (ay boyunca) veya Kutlama (doğum günü) */}
            {birthdayBalance?.is_birthday_month && birthdayBannerVisible && (
                birthdayBalance.is_birthday_today ? (
                    <div className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl p-5 text-white shadow-lg">
                        <div className="birthday-confetti" />
                        <button onClick={() => { localStorage.setItem(`birthday_banner_dismissed_${getIstanbulToday().slice(0, 7)}`, '1'); setBirthdayBannerVisible(false); }} className="absolute top-3 right-3 text-white/60 hover:text-white text-xs font-medium bg-white/10 px-2 py-1 rounded-full transition-colors">
                            Bir daha gösterme
                        </button>
                        <div className="flex items-center gap-4">
                            <span className="text-4xl">🎂</span>
                            <div>
                                <h3 className="text-lg font-black">Doğum Gününüz Kutlu Olsun!</h3>
                                <p className="text-white/80 text-sm mt-0.5">
                                    {birthdayBalance.is_used
                                        ? 'Doğum günü izninizi kullandınız'
                                        : '1 günlük doğum günü izni hakkınız var'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative overflow-hidden bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-2xl p-5 text-white shadow-lg">
                        <button onClick={() => { localStorage.setItem(`birthday_banner_dismissed_${getIstanbulToday().slice(0, 7)}`, '1'); setBirthdayBannerVisible(false); }} className="absolute top-3 right-3 text-white/60 hover:text-white text-xs font-medium bg-white/10 px-2 py-1 rounded-full transition-colors">
                            Bir daha gösterme
                        </button>
                        <div className="flex items-center gap-4">
                            <span className="text-4xl">🎁</span>
                            <div>
                                <h3 className="text-lg font-black">
                                    {birthdayBalance.birth_month_name} Ayında Doğum Gününüz Var!
                                </h3>
                                <p className="text-white/80 text-sm mt-0.5">
                                    {birthdayBalance.is_used
                                        ? 'Doğum günü izninizi kullandınız'
                                        : 'İzin hakkınızı kullanmayı unutmayın!'}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* 1. Daily Stats Grid (From Today Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
                <StatCard
                    title={todaySummary?.on_duty ? 'ŞİRKET DIŞI ÇALIŞMA' : todaySummary?.on_leave ? 'BUGÜN İZİNLİ' : 'BUGÜN ÇALIŞMA'}
                    value={`${formatHours(todaySummary?.total_worked)} sa`}
                    subValue={todaySummary?.on_duty ? `Görevde — Hedef: ${formatHours(todaySummary?.daily_expected)} sa` : todaySummary?.on_leave ? `İzin kredisi — Hedef: ${formatHours(todaySummary?.daily_expected)} sa` : `Hedef: ${formatHours(todaySummary?.daily_expected)} sa`}
                    icon={Briefcase}
                    color={todaySummary?.on_duty ? 'purple' : todaySummary?.on_leave ? 'purple' : 'indigo'}
                />
                <StatCard
                    title="KALAN MOLA"
                    value={todaySummary?.is_off_day ? 'Tatil' : `${formatMin(Math.max(0, (todaySummary?.break_allowance || 0) - (todaySummary?.break_used || 0)))} dk`}
                    subValue={todaySummary?.is_off_day ? 'Bugün tatil günü' : `Kullanılan: ${formatMin(todaySummary?.break_used)} / Hak: ${formatMin(todaySummary?.break_allowance || 0)} dk`}
                    icon={Coffee}
                    color={todaySummary?.is_off_day ? 'gray' : 'amber'}
                />
                <div className="col-span-1 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-all duration-300 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">FAZLA MESAİ</p>
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                            <Zap size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                            {formatMin(todaySummary?.overtime_approved)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">dk onaylı</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mb-3">
                        Bekleyen: {formatMin(todaySummary?.overtime_pending)} / Potansiyel: {formatMin(todaySummary?.overtime_potential)} dk
                    </p>

                    {/* Weekly OT Progress */}
                    {todaySummary?.weekly_ot_limit_hours > 0 && (() => {
                        const used = todaySummary?.weekly_ot_used_hours || 0;
                        const limit = todaySummary?.weekly_ot_limit_hours;
                        const remaining = todaySummary?.weekly_ot_remaining_hours || 0;
                        const ratio = used / (limit || 1);
                        const pct = Math.min(100, Math.round(ratio * 100));

                        let colorClass, bgClass, borderClass, icon, label;
                        if (ratio >= 1) {
                            colorClass = 'text-red-700';
                            bgClass = 'bg-red-50';
                            borderClass = 'border-red-300 animate-pulse';
                            icon = <XCircle size={14} className="text-red-600" />;
                            label = 'Limit doldu!';
                        } else if (ratio >= 0.9) {
                            colorClass = 'text-red-600';
                            bgClass = 'bg-red-50';
                            borderClass = 'border-red-200 animate-pulse';
                            icon = <AlertCircle size={14} className="text-red-500" />;
                            label = 'Limit kritik!';
                        } else if (ratio >= 0.7) {
                            colorClass = 'text-amber-600';
                            bgClass = 'bg-amber-50';
                            borderClass = 'border-amber-200';
                            icon = <AlertTriangle size={14} className="text-amber-500" />;
                            label = 'Limite yaklaşıyorsunuz';
                        } else {
                            colorClass = 'text-emerald-600';
                            bgClass = '';
                            borderClass = 'border-slate-100';
                            icon = null;
                            label = null;
                        }

                        return (
                            <div className={`pt-2 border-t ${ratio >= 0.7 ? `${bgClass} ${borderClass} px-2 py-1.5 -mx-2 rounded-lg border mt-2` : 'border-slate-50'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        {icon}
                                        <span className="text-[9px] font-bold text-amber-500">HAFTALIK LİMİT</span>
                                    </div>
                                    <span className={`text-[9px] font-bold ${colorClass}`}>
                                        {used}/{limit} saat
                                    </span>
                                </div>
                                {label && (
                                    <p className={`text-[9px] mt-0.5 font-medium ${colorClass}`}>{label}</p>
                                )}
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            ratio >= 1 ? 'bg-red-500' :
                                            ratio >= 0.9 ? 'bg-red-400' :
                                            ratio >= 0.7 ? 'bg-amber-400' :
                                            'bg-emerald-500'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                {ratio >= 0.7 && (
                                    <p className={`text-[8px] mt-0.5 ${colorClass}`}>
                                        Kalan: {remaining} saat
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* 4. Unified Leave Card — Annual + Excuse side by side */}
                <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-all duration-300 relative overflow-hidden">
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">İZİN DURUMU</p>
                        <div className="flex items-center gap-1.5">
                            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                                <Briefcase size={16} />
                            </div>
                            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                                <Clock size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Leave Sections Side by Side */}
                    <div className={`grid gap-0 ${monthlySummary?.is_birthday_month ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {/* LEFT — Yıllık İzin */}
                        <div className="pr-3 border-r border-slate-100">
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">YILLIK İZİN</p>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                    {monthlySummary?.annual_leave_balance || 0}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">GÜN</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">
                                Kullanılan: <span className="text-amber-600 font-bold">{monthlySummary?.annual_leave_used_this_year || 0} Gün</span>
                            </p>

                            {/* Next Leave */}
                            {monthlySummary?.next_leave_request && (
                                <div className="mt-2 pt-2 border-t border-slate-50">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">SIRADAKİ İZİN</span>
                                    <span className="text-xs font-bold text-blue-600">
                                        {monthlySummary.next_leave_request.start_date.split('-').slice(1).reverse().join('.')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-1">
                                        ({monthlySummary.next_leave_request.total_days} Gün)
                                    </span>
                                </div>
                            )}

                            {/* Accrual Progress */}
                            <div className="mt-2 pt-2 border-t border-slate-50">
                                {monthlySummary?.days_to_next_accrual != null ? (
                                    <>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold text-indigo-500 uppercase">YENİLEME</span>
                                            <span className="text-[9px] font-bold text-indigo-600">{monthlySummary.days_to_next_accrual} Gün</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${Math.max(0, Math.min(100, (365 - monthlySummary.days_to_next_accrual) / 365 * 100))}%` }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-[9px] text-slate-400 italic">İşe giriş tarihi eksik.</span>
                                )}
                            </div>
                        </div>

                        {/* RIGHT — Mazeret İzni */}
                        <div className="pl-3">
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1">MAZERET İZNİ</p>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                    {(() => {
                                        const val = monthlySummary?.excuse_leave_hours_remaining != null
                                            ? monthlySummary.excuse_leave_hours_remaining : 18;
                                        const h = Math.floor(val);
                                        const m = Math.round((val - h) * 60);
                                        return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
                                    })()}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">
                                Kullanılan: <span className="text-amber-600 font-bold">
                                    {(() => {
                                        const val = monthlySummary?.excuse_leave_hours_used || 0;
                                        const h = Math.floor(val);
                                        const m = Math.round((val - h) * 60);
                                        return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
                                    })()}
                                </span>
                            </p>

                            {/* Daily Max */}
                            <div className="mt-2 pt-2 border-t border-slate-50">
                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">GÜNLÜK MAX</span>
                                <span className="text-xs font-bold text-orange-600">4sa 30dk</span>
                            </div>

                            {/* Quota Progress */}
                            <div className="mt-2 pt-2 border-t border-slate-50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-bold text-orange-500 uppercase">KOTA</span>
                                    <span className="text-[9px] font-bold text-orange-600">
                                        {(() => {
                                            const used = monthlySummary?.excuse_leave_hours_used || 0;
                                            const entitled = monthlySummary?.excuse_leave_hours_entitled || 18;
                                            const fmtH = (v) => { const h = Math.floor(v); const m = Math.round((v - h) * 60); if (h === 0) return `${m} dk`; if (m === 0) return `${h} saat`; return `${h} saat ${m} dk`; };
                                            return `${fmtH(used)} / ${fmtH(entitled)}`;
                                        })()}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                    <div
                                        className="h-full bg-orange-400 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, ((monthlySummary?.excuse_leave_hours_used || 0) / (monthlySummary?.excuse_leave_hours_entitled || 18)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* THIRD — Doğum Günü İzni (sadece doğum ayında) */}
                        {monthlySummary?.is_birthday_month && (
                            <div className="pl-3 border-l border-slate-100">
                                <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wide mb-1">DOĞUM GÜNÜ İZNİ</p>
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                        {monthlySummary?.birthday_leave_remaining ?? 1}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">GÜN</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {monthlySummary?.birthday_leave_used ? (
                                        <span className="text-emerald-600 font-bold">
                                            {monthlySummary?.birthday_leave_used_date
                                                ? `${monthlySummary.birthday_leave_used_date.split('-')[2]}.${monthlySummary.birthday_leave_used_date.split('-')[1]} tarihinde kullanıldı ✓`
                                                : 'Kullanıldı ✓'}
                                        </span>
                                    ) : (
                                        <span className="text-pink-600 font-bold">Kullanılabilir 🎂</span>
                                    )}
                                </p>

                                {/* Birthday info */}
                                <div className="mt-2 pt-2 border-t border-slate-50">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">DOĞUM GÜNÜ</span>
                                    <span className="text-xs font-bold text-pink-600">
                                        {monthlySummary?.birth_day} {birthdayBalance?.birth_month_name || ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][monthlySummary?.birth_month] || ''}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Main Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">


                {/* Main Chart (8 cols) */}
                <div className="xl:col-span-8 h-[280px] md:h-[420px]">
                    <AttendanceAnalyticsChart
                        logs={logs}
                        employeeId={user?.id}
                        currentYear={selectedFiscal.year}
                        currentMonth={selectedFiscal.month}
                    />
                </div>

                {/* Activity / Requests (4 Cols) - Moved up from bottom */}
                <div className="xl:col-span-4 h-[280px] md:h-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <FileText size={20} className="text-indigo-500" />
                            Son Aktiviteler
                        </h3>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                        {requestTab === 'my_requests' ? (
                            myRequests.length > 0 ? myRequests.map((r, i) => <RequestItem key={i} req={r} />) : <p className="text-slate-400 text-sm text-center py-4">Talep bulunamadı.</p>
                        ) : (
                            incomingRequests.length > 0 ? incomingRequests.map((r, i) => <RequestItem key={i} req={r} />) : <p className="text-slate-400 text-sm text-center py-4">Onay bekleyen talep yok.</p>
                        )}

                        <div className="pt-3 border-t border-slate-100">
                            <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                <CalendarIcon size={16} className="text-emerald-500" />
                                Yaklaşan Etkinlikler
                                {calendarEvents.length > 0 && (
                                    <span className="text-xs font-normal text-slate-400">({calendarEvents.length})</span>
                                )}
                            </h4>
                            <div className="space-y-3">
                                {calendarEvents.length === 0 ? (
                                    <div className="text-center py-4 text-slate-400">
                                        <CalendarIcon size={20} className="mx-auto mb-1 opacity-50" />
                                        <p className="text-xs">Önümüzdeki 2 haftada etkinlik yok</p>
                                    </div>
                                ) : (
                                    groupedEvents.map(group => (
                                        <div key={group.dateStr}>
                                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                {group.label}
                                            </div>
                                            <div className="space-y-1">
                                                {group.items.map((ev, i) => {
                                                    const timeStr = !ev.allDay && ev.start?.includes('T') && ev.end?.includes('T')
                                                        ? `${formatIstanbulTime(ev.start)}–${formatIstanbulTime(ev.end)}`
                                                        : null;
                                                    const badge = ev.status && statusBadges[ev.status];
                                                    const showStatus = ev.type !== 'HOLIDAY' && ev.type !== 'PERSONAL';
                                                    return (
                                                        <div key={ev.id || i} className="flex items-center gap-2 text-xs bg-slate-50/80 hover:bg-slate-100/80 transition-colors p-2 rounded-lg border border-slate-100">
                                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${eventDotColors[ev.type] || 'bg-slate-400'}`} />
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${eventTypeColors[ev.type] || 'bg-slate-100 text-slate-600'}`}>
                                                                {eventTypeLabels[ev.type] || ev.type}
                                                            </span>
                                                            <span className="font-medium text-slate-700 truncate flex-1 min-w-0" title={ev.title}>{ev.title}</span>
                                                            {timeStr && (
                                                                <span className="text-slate-400 flex-shrink-0">{timeStr}</span>
                                                            )}
                                                            {showStatus && badge && (
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${badge.className}`}>
                                                                    {badge.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
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
                <MonthlyBalanceCarousel periodSummary={monthlySummary} />
            </div>


        </div>
    );
};

export default Dashboard;
