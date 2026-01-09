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
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

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
            if (!stats[dateStr]) stats[dateStr] = { normal: 0, overtime: 0, missing: 0 };
            stats[dateStr].normal += (log.normal_minutes || 0);
            stats[dateStr].overtime += (log.overtime_minutes || 0);
            stats[dateStr].missing += (log.missing_minutes || 0);
        });
        setDailyStats(stats);
    };

    const calculateMonthlySummary = (logs, calEvents, start, end, summaryData) => {
        let totalMinutes = 0, overtimeMinutes = 0, leaveCount = 0, missingCount = 0;

        // Logs
        const monthLogs = logs.filter(log => moment(log.work_date).isBetween(start, end, 'day', '[]'));
        monthLogs.forEach(log => {
            totalMinutes += log.total_minutes || 0;
            overtimeMinutes += log.overtime_minutes || 0;
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
        if (dayEvents.some(e => e.type === 'OVERTIME')) return 'bg-emerald-100 text-emerald-700 font-bold';
        // Check for normal work? We usually don't have SHIFT events unless explicitly generated. 
        // If needed we can check logs but logs aren't fully fetched in YEAR mode to save bandwidth perhaps?
        // Let's stick to Exception reporting for Year view generally, or simple work.

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

        return { style };
    };

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
            <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <button
                        onClick={handleBackToYear}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium mb-4 transition-colors"
                    >
                        <ArrowLeft size={18} /> Yıllık Görünüme Dön
                    </button>

                    <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                        {MONTHS_TR[selectedMonth]}
                        <span
                            onClick={handleBackToYear}
                            className="cursor-pointer hover:text-blue-600 hover:underline transition-colors ml-1"
                            title="Yıllık Görünüm"
                        >
                            {selectedYear}
                        </span>
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">Detaylı rapor ve kayıtlar</p>

                    {/* Stats Cards */}
                    <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Briefcase size={16} className="text-blue-600" />
                                <span className="text-xs font-bold text-blue-800 uppercase">Toplam Çalışma</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800">{monthlySummary.totalWorkHours}<span className="text-sm text-slate-400 font-medium ml-1">sa</span></div>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Timer size={16} className="text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-800 uppercase">Fazla Mesai</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800">{monthlySummary.totalOvertime}<span className="text-sm text-slate-400 font-medium ml-1">sa</span></div>
                        </div>

                        <div className={`p-4 rounded-xl border ${parseFloat(monthlySummary.netBalance) >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <Activity size={16} className={parseFloat(monthlySummary.netBalance) >= 0 ? 'text-indigo-600' : 'text-red-600'} />
                                <span className={`text-xs font-bold uppercase ${parseFloat(monthlySummary.netBalance) >= 0 ? 'text-indigo-800' : 'text-red-800'}`}>Net Fark</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800">
                                {parseFloat(monthlySummary.netBalance) > 0 ? '+' : ''}{monthlySummary.netBalance}<span className="text-sm text-slate-400 font-medium ml-1">sa</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
                                <span className="block text-xl font-bold text-slate-800">{monthlySummary.leaveDays}</span>
                                <span className="text-xs font-bold text-amber-700 uppercase">İzinli Gün</span>
                            </div>
                            <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
                                <span className="block text-xl font-bold text-slate-800">{monthlySummary.missingDays}</span>
                                <span className="text-xs font-bold text-red-700 uppercase">Eksik Gün</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Renk Kodları</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-slate-600">Normal</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-slate-600">Fazla Mesai</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-slate-600">İzinli</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-slate-600">Devamsız</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-500"></div><span className="text-slate-600">Tatil</span></div>
                    </div>
                </div>
            </div>

            {/* Big Calendar */}
            <div className="flex-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <Calendar
                    date={new Date(selectedYear, selectedMonth, 1)}
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%', minHeight: '600px' }}
                    eventPropGetter={eventStyleGetter}
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
                    views={['month', 'agenda']} // Limit views to keep it simple?
                    defaultView='month'
                    components={{
                        month: {
                            dateHeader: ({ date, label }) => {
                                const dateStr = moment(date).format('YYYY-MM-DD');
                                const stats = dailyStats[dateStr];
                                return (
                                    <div className="flex justify-between items-start px-1">
                                        <span className="rbc-date-cell-label font-semibold text-slate-700">{label}</span>
                                        {stats && stats.overtime > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">+{Math.floor(stats.overtime / 60)}s</span>}
                                        {stats && stats.missing > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">-{Math.floor(stats.missing / 60)}s</span>}
                                    </div>
                                );
                            }
                        }
                    }}
                    messages={{
                        today: "Bugün",
                        previous: "Geri",
                        next: "İleri",
                        month: "Ay",
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
                        {viewMode === 'YEAR' ? `${selectedYear} Takvimi` : `${MONTHS_TR[selectedMonth]} Detayı`}
                    </h1>
                    {/* Year Selector (Always visible or just in YEAR mode?) */}
                    <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                        <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
                        <span className="px-4 py-2 font-bold text-slate-700 min-w-[80px] text-center">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="w-full md:w-auto">
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

            {/* Detail Modal (Shared) */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {moment(selectedDate).format('D MMMM YYYY, dddd')}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {selectedEvents.length} Kayıt Bulundu
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5 space-y-3 custom-scrollbar">
                            {selectedEvents.length > 0 ? (
                                selectedEvents.map((evt, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border bg-white shadow-sm flex items-start gap-3 transition-all hover:shadow-md
                                        ${evt.type === 'OVERTIME' ? 'border-emerald-100 bg-emerald-50/30' :
                                            evt.type === 'ABSENT' ? 'border-red-100 bg-red-50/30' : 'border-slate-100'}
                                    `}>
                                        <div
                                            className="w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-sm"
                                            style={{ backgroundColor: evt.color }}
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800 text-sm flex justify-between">
                                                {evt.title}
                                                {evt.type === 'OVERTIME' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Ekstra</span>}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                                                {evt.start && evt.end && !evt.allDay && (
                                                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                                        <Clock size={12} />
                                                        {moment(evt.start).format('HH:mm')} - {moment(evt.end).format('HH:mm')}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Info size={12} />
                                                    {evt.type === 'SHIFT' ? 'Normal Mesai' :
                                                        evt.type === 'OVERTIME' ? 'Fazla Mesai' :
                                                            evt.type === 'OFF' ? 'Hafta Tatili' :
                                                                evt.type === 'LEAVE' ? 'İzin' :
                                                                    evt.type === 'ABSENT' ? 'Devamsızlık' :
                                                                        evt.type === 'HOLIDAY' ? 'Resmi Tatil' : 'Diğer'}
                                                </div>
                                            </div>

                                            {evt.title && (evt.title.includes('Mola') || evt.title.includes('Break')) && (
                                                <p className="mt-1 text-xs text-slate-400">Dinlenme süresi</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <CalendarIcon size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Bu tarihte kayıt bulunamadı veya normal çalışma günü.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
