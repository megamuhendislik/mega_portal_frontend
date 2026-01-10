import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { X, Clock, Calendar as CalendarIcon, Info, ChevronLeft, ChevronRight, Briefcase, Timer, Activity, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TeamSelector from '../components/TeamSelector';
import useInterval from '../hooks/useInterval';

moment.locale('tr');
const localizer = momentLocalizer(moment);

const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const CalendarPage = () => {
    const { user } = useAuth();

    // Global State
    const [viewMode, setViewMode] = useState('YEAR'); // 'YEAR' or 'MONTH'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.employee?.id || null);

    useEffect(() => {
        console.log("CalendarPage Mount. AuthUser:", user);
        console.log("CalendarPage Mount. SelectedID:", selectedEmployeeId);
    }, [user, selectedEmployeeId]);

    // Data State
    const [events, setEvents] = useState([]); // Stores events for the WHOLE YEAR or loaded range
    const [loading, setLoading] = useState(false);

    // Monthly View Specifics
    const [dailyStats, setDailyStats] = useState({});
    const [monthlySummary, setMonthlySummary] = useState({
        totalWorkHours: 0,
        totalOvertime: 0,
        missingDays: 0,
        leaveDays: 0,
        monthlyRequired: 0,
        netBalance: 0
    });

    // Modal State (for Day Details)
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);

    // State for View Options
    const [displayMode, setDisplayMode] = useState('STANDARD'); // 'STANDARD' | 'OVERTIME'

    // Initialize User
    useEffect(() => {
        if (user?.employee?.id) {
            setSelectedEmployeeId(user.employee.id);
        }
    }, [user]);

    // Fetch Data Trigger
    useEffect(() => {
        if (selectedEmployeeId) {
            fetchData();
        }
    }, [selectedEmployeeId, selectedYear, viewMode, selectedMonth]);

    // Auto-Refresh (Every 60s) for live updates
    useInterval(() => {
        if (!loading && selectedEmployeeId && !showModal) {
            fetchData(true); // silent refresh
        }
    }, 60000);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            let start, end;

            // Date Range Calculation
            if (viewMode === 'YEAR') {
                // Fetch whole year for the grid
                start = `${selectedYear}-01-01`;
                end = `${selectedYear}-12-31`;
            } else {
                // Fetch specific month (plus padding for calendar view navigation)
                const currentM = moment([selectedYear, selectedMonth]);
                start = currentM.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
                end = currentM.clone().add(1, 'month').endOf('month').format('YYYY-MM-DD');
            }

            console.log(`Fetching ${viewMode} data: ${start} -> ${end}`);

            const requests = [
                api.get(`/calendar-events/?start=${start}&end=${end}&employee_id=${selectedEmployeeId}`),
                api.get(`/attendance/?start_date=${start}&end_date=${end}&employee_id=${selectedEmployeeId}`)
            ];

            // Only fetch summary stats if in Month view
            if (viewMode === 'MONTH') {
                requests.push(api.get(`/dashboard/stats/?year=${selectedYear}&month=${selectedMonth + 1}&employee_id=${selectedEmployeeId}`));
            }

            const results = await Promise.all(requests);
            const calendarRes = results[0];
            const attendanceRes = results[1];
            const summaryRes = viewMode === 'MONTH' ? results[2] : null;

            console.log("--- DEBUG CALENDAR FETCH ---");
            console.log("Range:", start, "to", end);
            console.log("EmployeeID:", selectedEmployeeId);
            console.log("Calendar Events Raw:", calendarRes.data);
            console.log("Attendance Logs Raw:", attendanceRes.data);
            if (summaryRes) console.log("Summary Stats Raw:", summaryRes.data);

            // Process Events
            let calEvents = calendarRes.data.results || calendarRes.data;
            const processedEvents = Array.isArray(calEvents) ? calEvents.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end),
                title: evt.title || evt.type
            })) : [];

            setEvents(processedEvents);

            // Process Attendance (for indicators or stats)
            let logs = attendanceRes.data.results || attendanceRes.data;
            console.log("Processed Logs Count:", Array.isArray(logs) ? logs.length : 'Not Array');

            // If in Month mode, update detailed stats
            if (viewMode === 'MONTH' && Array.isArray(logs)) {
                calculateDailyStats(logs);

                // Get payroll period for summary
                const dateInMonth = moment([selectedYear, selectedMonth]);
                const { start: payrollStart, end: payrollEnd } = getPayrollPeriod(dateInMonth);
                calculateMonthlySummary(logs, processedEvents, payrollStart, payrollEnd, summaryRes?.data);
            }

        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    // Helper: Payroll Period
    const getPayrollPeriod = (date) => {
        const start = moment(date).subtract(1, 'month').date(26).format('YYYY-MM-DD');
        const end = moment(date).date(25).format('YYYY-MM-DD');
        return { start, end };
    };

    const calculateDailyStats = (logs) => {
        const stats = {};
        logs.forEach(log => {
            const dateStr = moment(log.work_date).format('YYYY-MM-DD');
            const totalMins = (log.total_seconds || 0) / 60;
            const requiredMins = 540; // Default 9h
            const netBalance = totalMins - requiredMins;

            stats[dateStr] = {
                normal: (log.normal_seconds || 0) / 60,
                overtime: (log.overtime_seconds || 0) / 60,
                missing: (log.missing_seconds || 0) / 60,
                check_in: log.check_in,
                check_out: log.check_out,
                total: totalMins,
                net: netBalance,
                log: log // Store full log for modal
            };
        });
        setDailyStats(stats);
    };

    const calculateMonthlySummary = (logs, calEvents, start, end, summaryData) => {
        let totalMinutes = 0, overtimeMinutes = 0, leaveCount = 0, missingCount = 0;

        // Logs
        const monthLogs = logs.filter(log => moment(log.work_date).isBetween(start, end, 'day', '[]'));
        monthLogs.forEach(log => {
            totalMinutes += (log.total_seconds || 0) / 60;
            overtimeMinutes += (log.overtime_seconds || 0) / 60;
        });

        // Events
        const monthEvents = calEvents.filter(evt => moment(evt.start).isBetween(start, end, 'day', '[]'));
        monthEvents.forEach(evt => {
            if (evt.type === 'LEAVE') leaveCount++;
            if (evt.type === 'ABSENT') {
                const day = moment(evt.start).day();
                if (day !== 0 && day !== 6) missingCount++;
            }
        });

        // Backend Summary Data
        let myStats = {};
        if (summaryData?.length > 0) {
            const targetId = selectedEmployeeId || user?.employee?.id;
            if (targetId) myStats = summaryData.find(s => s.employee_id === parseInt(targetId)) || {};
            else myStats = summaryData[0] || {};
        }

        setMonthlySummary({
            totalWorkHours: (totalMinutes / 60).toFixed(1),
            totalOvertime: (overtimeMinutes / 60).toFixed(1),
            missingDays: missingCount,
            leaveDays: leaveCount,
            monthlyRequired: ((myStats.monthly_required || 0) / 60).toFixed(1),
            netBalance: ((myStats.monthly_net_balance || 0) / 60).toFixed(1)
        });
    };

    // --- Helpers for Year Grid ---
    const getDayColor = (date) => {
        // Only checking processed events here
        // We can optimize this by using a lookup map if performance lags
        const dateStr = date.format('YYYY-MM-DD');
        const dayEvents = events.filter(e => moment(e.start).isSame(date, 'day'));

        // Priority: Holiday > Leave > Absent > Overtime > Work
        if (dayEvents.some(e => e.type === 'HOLIDAY')) return 'bg-violet-100 text-violet-700 font-bold';
        if (dayEvents.some(e => e.type === 'LEAVE')) return 'bg-amber-100 text-amber-700 font-bold';
        if (dayEvents.some(e => e.type === 'ABSENT')) return 'bg-red-100 text-red-700 font-bold';
        if (displayMode === 'OVERTIME' && dayEvents.some(e => e.type === 'OVERTIME')) return 'bg-emerald-100 text-emerald-700 font-bold';

        return 'hover:bg-slate-50 text-slate-700';
    };

    // --- Interaction ---
    const handleMonthClick = (monthIndex) => {
        setSelectedMonth(monthIndex);
        setViewMode('MONTH');
    };

    const handleBackToYear = () => {
        setViewMode('YEAR');
    };

    const handleNavigateMonth = (newDate) => {
        setSelectedYear(newDate.getFullYear());
        setSelectedMonth(newDate.getMonth());
    };

    const eventStyleGetter = (event) => {
        let style = {
            backgroundColor: event.color || '#64748b',
            borderRadius: '6px',
            opacity: 0.9,
            color: 'white',
            border: '0px',
            display: 'block',
            fontSize: '0.75rem',
            padding: '2px 6px',
            marginBottom: '2px'
        };

        if (event.type === 'OVERTIME') style.backgroundColor = '#10b981';
        else if (event.type === 'ABSENT') style.backgroundColor = '#ef4444';
        else if (event.type === 'LEAVE') style.backgroundColor = '#f59e0b';
        else if (event.type === 'HOLIDAY') style.backgroundColor = '#8b5cf6';
        else if (event.type === 'SHIFT') style.backgroundColor = '#3b82f6';
        else if (event.type === 'MISSING') style.backgroundColor = '#ef4444';
        else if (event.type === 'LEAVE_REQUEST') {
            style.backgroundColor = event.status === 'APPROVED' ? '#f59e0b' : '#fbbf24'; // Orange vs Amber
            if (event.status === 'PENDING') style.border = '1px dashed #fff';
        }
        else if (event.type === 'OVERTIME_REQUEST') {
            style.backgroundColor = event.status === 'APPROVED' ? '#10b981' : '#fbbf24';
            if (event.status === 'PENDING') style.border = '1px dashed #fff';
        }

        return { style };
    };

    // Weekend Styling
    const dayPropGetter = (date) => {
        const day = date.getDay();
        if (day === 0 || day === 6) { // Sunday or Saturday
            return {
                className: 'bg-slate-50/70',
            }
        }
        return {}
    }

    // --- RENDER ---

    // 1. Year View
    const renderYearView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6 animate-in fade-in duration-300">
            {MONTHS_TR.map((monthName, index) => {
                const monthStart = moment(`${selectedYear}-${index + 1}-01`, 'YYYY-M-DD').locale('tr');
                const daysInMonth = monthStart.daysInMonth();
                const startDayOfWeek = (monthStart.day() + 6) % 7; // Mon=0
                const isCurrentMonth = index === new Date().getMonth() && selectedYear === new Date().getFullYear();

                return (
                    <div
                        key={monthName}
                        onClick={() => handleMonthClick(index)}
                        className={`bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer transition-all hover:shadow-md group
                            ${isCurrentMonth ? 'border-blue-400 ring-4 ring-blue-50/50' : 'border-slate-200'}
                        `}
                    >
                        <div className={`p-3 border-b text-center font-bold capitalize flex justify-between items-center px-4
                             ${isCurrentMonth ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'}
                        `}>
                            <span>{monthName}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-xs bg-white/50 px-2 py-0.5 rounded transition-opacity">Aç &gt;&gt;</span>
                        </div>

                        <div className="p-4">
                            {/* Weekday Header */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                                    <div key={d} className="text-center text-[10px] text-slate-400 font-bold">{d}</div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1.5">
                                {Array(startDayOfWeek).fill(null).map((_, i) => <div key={`empty-${i}`} className="h-8"></div>)}
                                {Array(daysInMonth).fill(null).map((_, i) => {
                                    const date = moment(monthStart).add(i, 'days');
                                    const isToday = date.isSame(new Date(), 'day');
                                    const colorClass = getDayColor(date);

                                    return (
                                        <div
                                            key={i}
                                            className={`h-8 flex items-center justify-center text-xs font-medium rounded-lg relative
                                                ${colorClass}
                                                ${isToday ? 'ring-2 ring-blue-600 z-10 font-bold' : ''}
                                            `}
                                        >
                                            {i + 1}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // 2. Month View
    const renderMonthView = () => (
        <div className="flex flex-col md:flex-row gap-6 h-full animate-in slide-in-from-right-4 duration-300">
            {/* Sidebar / Summary */}
            <div className="w-full md:w-72 flex flex-col gap-4 shrink-0">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <button onClick={handleBackToYear} className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 font-medium mb-4 w-full p-2 hover:bg-slate-50 rounded-lg transition-colors">
                        <ArrowLeft size={18} /> Yıla Dön
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 mb-0.5">{MONTHS_TR[selectedMonth]}</h2>
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{selectedYear}</span>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Aylık Toplam</span>
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-3xl font-bold text-slate-800">{monthlySummary.totalWorkHours}</span>
                                <span className="text-xs text-slate-400 ml-1">saat</span>
                            </div>
                            <Briefcase size={20} className="text-slate-300 mb-1" />
                        </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl shadow-sm border border-emerald-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2 z-10 relative">Fazla Mesai</span>
                        <div className="flex justify-between items-end z-10 relative">
                            <div>
                                <span className="text-3xl font-bold text-emerald-700">{monthlySummary.totalOvertime}</span>
                                <span className="text-xs text-emerald-500 ml-1">saat</span>
                            </div>
                            <Timer size={20} className="text-emerald-300 mb-1" />
                        </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2">Net Fark</span>
                        <div className="flex justify-between items-end">
                            <div className={`${parseFloat(monthlySummary.netBalance) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                                <span className="text-3xl font-bold">{parseFloat(monthlySummary.netBalance) > 0 ? '+' : ''}{monthlySummary.netBalance}</span>
                                <span className="text-xs ml-1 opacity-70">saat</span>
                            </div>
                            <Activity size={20} className="text-slate-300 mb-1" />
                        </div>
                    </div>
                </div>

                {/* Legend - Vertical */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 text-center">Lejant</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Normal</span>
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Mesai</span>
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Eksik/Devamsız</span>
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">İzin</span>
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">Tatil</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full min-h-[700px]">
                <Calendar
                    date={new Date(selectedYear, selectedMonth, 1)}
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%', minHeight: '650px' }}
                    eventPropGetter={eventStyleGetter}
                    dayPropGetter={dayPropGetter}
                    onNavigate={handleNavigateMonth}
                    onSelectEvent={(evt) => {
                        setSelectedDate(evt.start);
                        setSelectedEvents(events.filter(e => moment(e.start).isSame(evt.start, 'day')));
                        setShowModal(true);
                    }}
                    onSelectSlot={(slot) => {
                        setSelectedDate(slot.start);
                        setSelectedEvents(events.filter(e => moment(e.start).isSame(slot.start, 'day')));
                        setShowModal(true);
                    }}
                    selectable={true}
                    culture='tr'
                    views={['month']}
                    defaultView='month'
                    components={{
                        month: {
                            dateHeader: ({ date, label }) => {
                                const dateStr = moment(date).format('YYYY-MM-DD');
                                const stats = dailyStats[dateStr];

                                return (
                                    <div className="flex flex-col h-full w-full">
                                        {/* Date Number */}
                                        <div className="text-right px-2 py-1">
                                            <span className="text-sm font-bold text-slate-700">{label}</span>
                                        </div>

                                        {/* Stats Content - Always visible based on mode or just showing summaries if available */}
                                        {stats ? (
                                            <div className="flex flex-col gap-1 px-1 mt-1">
                                                {/* Normal Time */}
                                                {stats.normal > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                                        <span>N:</span>
                                                        <span className="font-bold">{Math.floor(stats.normal / 60)}s {stats.normal % 60}d</span>
                                                    </div>
                                                )}

                                                {/* Overtime */}
                                                {stats.overtime > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                                                        <span>FM:</span>
                                                        <span className="font-bold">{Math.floor(stats.overtime / 60)}s {stats.overtime % 60}d</span>
                                                    </div>
                                                )}

                                                {/* Missing */}
                                                {stats.missing > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">
                                                        <span>E:</span>
                                                        <span className="font-bold">{Math.floor(stats.missing / 60)}s {stats.missing % 60}d</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            }
                        }
                    }}
                    messages={{
                        today: "Bugün",
                        previous: "<",
                        next: ">",
                        month: "Ay",
                        week: "Hafta",
                        day: "Gün",
                        agenda: "Ajanda",
                        date: "Tarih",
                        time: "Saat",
                        event: "Olay",
                        noEventsInRange: "Olay yok."
                    }}
                />
            </div>
        </div>
    );


    return (
        <div className="h-screen p-6 bg-slate-50 flex flex-col">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="text-blue-600" />
                        {viewMode === 'YEAR' ?
                            <span
                                onClick={() => { }} // Already home
                                className="cursor-default"
                            >
                                {selectedYear} Takvimi
                            </span>
                            :
                            <span>
                                {MONTHS_TR[selectedMonth]}
                                <span onClick={handleBackToYear} className="cursor-pointer hover:text-blue-600 hover:underline transition-colors ml-2 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg text-lg">
                                    {selectedYear}
                                </span>
                                <span className="text-lg text-slate-400 font-medium ml-2">Detayı</span>
                            </span>
                        }
                    </h1>

                    {/* Year Selector */}
                    {viewMode === 'YEAR' && (
                        <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                            <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
                            <span className="px-4 py-2 font-bold text-slate-700 min-w-[80px] text-center">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
                        </div>
                    )}
                </div>

                {/* Top Right Controls */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* View Mode Toggle (Radio) */}
                    <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center shadow-sm">
                        <button
                            onClick={() => setDisplayMode('STANDARD')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                                ${displayMode === 'STANDARD' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}
                            `}
                        >
                            <CalendarIcon size={16} /> Standart
                        </button>
                        <button
                            onClick={() => setDisplayMode('OVERTIME')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                                ${displayMode === 'OVERTIME' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}
                            `}
                        >
                            <Timer size={16} /> Mesai Bilgisi
                        </button>
                    </div>

                    <TeamSelector
                        selectedId={selectedEmployeeId}
                        onSelect={setSelectedEmployeeId}
                        className="w-full md:w-64"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    viewMode === 'YEAR' ? renderYearView() : renderMonthView()
                )}
            </div>

            {/* Detail Modal (Shared) - ENHANCED */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {moment(selectedDate).format('D MMMM YYYY, dddd')}
                                </h3>
                                <p className="text-sm text-slate-400">Günlük Detay ve Giriş/Çıkış Hareketleri</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {/* 1. Daily Stats Summary */}
                            {dailyStats[moment(selectedDate).format('YYYY-MM-DD')] && (
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                                        <span className="block text-xs font-bold text-blue-400 uppercase">Normal</span>
                                        <span className="block text-lg font-bold text-blue-700">
                                            {Math.floor(dailyStats[moment(selectedDate).format('YYYY-MM-DD')].normal / 60)}s {dailyStats[moment(selectedDate).format('YYYY-MM-DD')].normal % 60}d
                                        </span>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                                        <span className="block text-xs font-bold text-emerald-400 uppercase">Mesai</span>
                                        <span className="block text-lg font-bold text-emerald-700">
                                            {Math.floor(dailyStats[moment(selectedDate).format('YYYY-MM-DD')].overtime / 60)}s {dailyStats[moment(selectedDate).format('YYYY-MM-DD')].overtime % 60}d
                                        </span>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                                        <span className="block text-xs font-bold text-red-400 uppercase">Eksik</span>
                                        <span className="block text-lg font-bold text-red-700">
                                            {Math.floor(dailyStats[moment(selectedDate).format('YYYY-MM-DD')].missing / 60)}s {dailyStats[moment(selectedDate).format('YYYY-MM-DD')].missing % 60}d
                                        </span>
                                    </div>
                                    <div className={`p-3 rounded-xl border text-center ${dailyStats[moment(selectedDate).format('YYYY-MM-DD')].net >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                                        <span className={`block text-xs font-bold uppercase ${dailyStats[moment(selectedDate).format('YYYY-MM-DD')].net >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>Net Fark</span>
                                        <span className={`block text-lg font-bold ${dailyStats[moment(selectedDate).format('YYYY-MM-DD')].net >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                                            {dailyStats[moment(selectedDate).format('YYYY-MM-DD')].net > 0 ? '+' : ''}{dailyStats[moment(selectedDate).format('YYYY-MM-DD')].net} dk
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 2. Timeline / Movements */}
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" /> Hareket Dökümü
                            </h4>
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-6">
                                {dailyStats[moment(selectedDate).format('YYYY-MM-DD')] ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs ring-4 ring-white shadow-sm">
                                                GİRİŞ
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">
                                                    {dailyStats[moment(selectedDate).format('YYYY-MM-DD')].check_in
                                                        ? moment(dailyStats[moment(selectedDate).format('YYYY-MM-DD')].check_in).format('HH:mm:ss')
                                                        : '--:--:--'}
                                                </div>
                                                <div className="text-xs text-slate-400">İlk Kart Basma</div>
                                            </div>
                                        </div>
                                        <div className="h-0.5 flex-1 bg-slate-200 mx-4 relative">
                                            <div className="absolute left-1/2 -top-2 bg-slate-100 text-slate-400 text-[10px] px-1">Çalışma Süreci</div>
                                        </div>
                                        <div className="flex items-center gap-3 text-right">
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">
                                                    {dailyStats[moment(selectedDate).format('YYYY-MM-DD')].check_out
                                                        ? moment(dailyStats[moment(selectedDate).format('YYYY-MM-DD')].check_out).format('HH:mm:ss')
                                                        : '--:--:--'}
                                                </div>
                                                <div className="text-xs text-slate-400">Son Kart Basma</div>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs ring-4 ring-white shadow-sm">
                                                ÇIKIŞ
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-sm">Hareket kaydı bulunamadı.</div>
                                )}
                            </div>

                            {/* 3. Requests/Events List */}
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Activity size={16} className="text-slate-400" /> Olaylar ve Talepler
                            </h4>
                            <div className="space-y-2">
                                {selectedEvents.length > 0 ? (
                                    selectedEvents.map((evt, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between
                                            ${['LEAVE_REQUEST', 'OVERTIME_REQUEST'].includes(evt.type) ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}
                                        `}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: evt.color || '#94a3b8' }}></div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700">{evt.title}</div>
                                                    <div className="text-xs text-slate-500">{evt.type}</div>
                                                </div>
                                            </div>
                                            {evt.status && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                                    ${evt.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                        evt.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
                                                `}>
                                                    {evt.status}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-slate-400 italic">Kayıtlı olay yok.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
