import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { X, Clock, Calendar as CalendarIcon, Info, CheckCircle2, AlertCircle, Briefcase, Timer, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TeamSelector from '../components/TeamSelector';
import useInterval from '../hooks/useInterval';

moment.locale('tr');
const localizer = momentLocalizer(moment);

const CalendarPage = () => {
    console.log('DEBUG: CalendarPage Component Mounting...');
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);

    // Monthly Summary State
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

    // Monthly Summary State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlySummary, setMonthlySummary] = useState({
        totalWorkHours: 0,
        totalOvertime: 0,
        missingDays: 0,
        leaveDays: 0,
        monthlyRequired: 0,
        netBalance: 0
    });

    const [dailyStats, setDailyStats] = useState({});

    // Initialize intent
    useEffect(() => {
        if (user?.employee?.id) {
            setSelectedEmployeeId(user.employee.id);
        } else if (user) {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedEmployeeId) {
            fetchData();
        }
    }, [currentDate, selectedEmployeeId]); // Refetch when month or employee changes

    // Auto-Refresh (Every 60s)
    useInterval(() => {
        if (!loading && selectedEmployeeId && !showModal) {
            // fetchData already checks for selectedEmployeeId but good to be safe
            // also avoid refreshing if modal is open (might be annoying)
            fetchData();
        }
    }, 60000);

    const fetchData = async () => {
        console.log('DEBUG: fetchData called');
        setLoading(true);
        try {
            const startOfMonth = moment(currentDate).startOf('month').format('YYYY-MM-DD');
            const endOfMonth = moment(currentDate).endOf('month').format('YYYY-MM-DD');

            // Fetch wider range for calendar view (prev/next month visibility)
            const viewStart = moment(currentDate).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
            const viewEnd = moment(currentDate).add(1, 'month').endOf('month').format('YYYY-MM-DD');

            console.log(`DEBUG: Fetching data for range ${viewStart} to ${viewEnd}`);

            const [calendarRes, attendanceRes, summaryRes] = await Promise.all([
                api.get(`/calendar-events/?start=${viewStart}&end=${viewEnd}&employee_id=${selectedEmployeeId}`),
                api.get(`/attendance/?start_date=${viewStart}&end_date=${viewEnd}&employee_id=${selectedEmployeeId}`),
                api.get(`/dashboard/stats/?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}&employee_id=${selectedEmployeeId}`)
            ]);

            console.log('DEBUG: API Responses received');
            console.log('DEBUG: Summary Response:', summaryRes.data);

            let calEvents = calendarRes.data;
            if (calEvents.results) calEvents = calEvents.results;

            let attendanceLogs = attendanceRes.data;
            if (attendanceLogs.results) attendanceLogs = attendanceLogs.results;

            const summaryData = summaryRes.data;

            // Process events
            const processedEvents = Array.isArray(calEvents) ? calEvents.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end),
                title: evt.title || evt.type
            })) : [];

            setEvents(processedEvents);

            if (Array.isArray(attendanceLogs)) {
                calculateDailyStats(attendanceLogs);

                // Calculate Monthly Summary (Payroll Period)
                const { start: payrollStart, end: payrollEnd } = getPayrollPeriod(currentDate);
                calculateMonthlySummary(attendanceLogs, processedEvents, payrollStart, payrollEnd, summaryData);
            } else {
                console.error('DEBUG: attendanceLogs is not an array', attendanceLogs);
            }

        } catch (error) {
            console.error('Error fetching calendar data:', error);
            console.log('DEBUG: Error details:', error.response || error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine payroll period (26th of prev month to 25th of current month)
    const getPayrollPeriod = (date) => {
        const current = moment(date);
        // If we are looking at Dec 2025.
        // Payroll period: Nov 26, 2025 to Dec 25, 2025.

        const start = moment(date).subtract(1, 'month').date(26).format('YYYY-MM-DD');
        const end = moment(date).date(25).format('YYYY-MM-DD');

        return { start, end };
    };

    const calculateDailyStats = (logs) => {
        const stats = {};
        logs.forEach(log => {
            const dateStr = moment(log.work_date).format('YYYY-MM-DD');
            if (!stats[dateStr]) {
                stats[dateStr] = { normal: 0, overtime: 0, missing: 0 };
            }
            stats[dateStr].normal += (log.normal_minutes || 0);
            stats[dateStr].overtime += (log.overtime_minutes || 0);
            stats[dateStr].missing += (log.missing_minutes || 0);
        });
        setDailyStats(stats);
    };

    const calculateMonthlySummary = (logs, calEvents, start, end, summaryData) => {
        let totalMinutes = 0;
        let overtimeMinutes = 0;
        let leaveCount = 0;
        let missingCount = 0;

        // Filter logs for current month
        const monthLogs = logs.filter(log => moment(log.work_date).isBetween(start, end, 'day', '[]'));

        monthLogs.forEach(log => {
            totalMinutes += log.total_minutes || 0;
            overtimeMinutes += log.overtime_minutes || 0;
        });

        // Filter calendar events for current month
        const monthEvents = calEvents.filter(evt => moment(evt.start).isBetween(start, end, 'day', '[]'));

        monthEvents.forEach(evt => {
            if (evt.type === 'LEAVE') leaveCount++;
            if (evt.type === 'ABSENT') {
                const day = moment(evt.start).day();
                if (day !== 0 && day !== 6) missingCount++; // Only count weekdays
            }
        });

        // Find current user's summary from backend response
        console.log('DEBUG: Summary Data from API:', summaryData);
        console.log('DEBUG: Current User Context:', user);

        let myStats = {};
        if (summaryData && summaryData.length > 0) {
            // Find stats for the SELECTED employee (could be self or subordinate)
            const targetId = selectedEmployeeId || user?.employee?.id;

            if (targetId) {
                // Ensure ID types match (int vs string)
                myStats = summaryData.find(s => s.employee_id === parseInt(targetId)) || {};
                console.log('DEBUG: Found Stats for ID:', targetId, myStats);
            } else {
                // Fallback
                myStats = summaryData[0] || {};
            }
        } else {
            console.log('DEBUG: No summary data available from API');
        }
        const requiredMinutes = myStats.monthly_required || 0;
        const netBalanceMinutes = myStats.monthly_net_balance || 0;

        setMonthlySummary({
            totalWorkHours: (totalMinutes / 60).toFixed(1),
            totalOvertime: (overtimeMinutes / 60).toFixed(1),
            missingDays: missingCount,
            leaveDays: leaveCount,
            monthlyRequired: (requiredMinutes / 60).toFixed(1),
            netBalance: (netBalanceMinutes / 60).toFixed(1)
        });
    };

    const handleNavigate = (date) => {
        setCurrentDate(date);
    };

    const handleSelectEvent = (event) => {
        const dateEvents = events.filter(e =>
            moment(e.start).isSame(event.start, 'day')
        );
        setSelectedDate(event.start);
        setSelectedEvents(dateEvents);
        setShowModal(true);
    };

    const handleSelectSlot = (slotInfo) => {
        const dateEvents = events.filter(e =>
            moment(e.start).isSame(slotInfo.start, 'day')
        );
        setSelectedDate(slotInfo.start);
        setSelectedEvents(dateEvents);
        setShowModal(true);
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

        if (event.type === 'OVERTIME') {
            style.backgroundColor = '#10b981'; // Emerald 500
            style.fontWeight = 'bold';
        } else if (event.type === 'SHIFT') {
            style.backgroundColor = '#3b82f6'; // Blue 500
        } else if (event.type === 'ABSENT') {
            style.backgroundColor = '#ef4444'; // Red 500
        } else if (event.type === 'LEAVE') {
            style.backgroundColor = '#f59e0b'; // Amber 500
        } else if (event.type === 'HOLIDAY') {
            style.backgroundColor = '#8b5cf6'; // Violet 500
        }

        return { style };
    };

    const components = useMemo(() => ({
        month: {
            dateHeader: ({ date, label }) => {
                const dateStr = moment(date).format('YYYY-MM-DD');
                const stats = dailyStats[dateStr];

                return (
                    <div className="flex justify-between items-start px-1">
                        <span className="rbc-date-cell-label font-semibold text-slate-700">{label}</span>
                        {stats && (
                            <div className="flex flex-col items-end text-[10px] leading-tight gap-0.5 mt-0.5">
                                {stats.normal > 0 && (
                                    <span className="text-blue-600 font-bold bg-blue-50 px-1 rounded">
                                        {Math.floor(stats.normal / 60)}s {stats.normal % 60 > 0 ? `${stats.normal % 60}dk` : ''}
                                    </span>
                                )}
                                {stats.overtime > 0 && (
                                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">
                                        +{Math.floor(stats.overtime / 60)}s {stats.overtime % 60 > 0 ? `${stats.overtime % 60}dk` : ''}
                                    </span>
                                )}
                                {stats.missing > 0 && (
                                    <span className="text-red-600 font-bold bg-red-50 px-1 rounded">
                                        -{Math.floor(stats.missing / 60)}s
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                );
            }
        }
    }), [dailyStats]);

    if (loading && events.length === 0) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    return (
        <div className="h-screen p-6 bg-slate-50 flex flex-col md:flex-row gap-6">
            {/* Sidebar / Summary */}
            <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CalendarIcon className="text-blue-600" />
                        Takvim
                    </h2>

                    <div className="mb-4">
                        <TeamSelector
                            selectedId={selectedEmployeeId}
                            onSelect={setSelectedEmployeeId}
                            className="w-full"
                        />
                    </div>
                    <p className="text-slate-500 text-sm mb-6">
                        {moment(currentDate).subtract(1, 'month').date(26).format('D MMMM')} - {moment(currentDate).date(25).format('D MMMM YYYY')} dönemi verileri.
                    </p>

                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <Briefcase size={18} />
                                </div>
                                <span className="text-sm font-medium text-blue-900">Toplam Çalışma</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800 ml-1">
                                {monthlySummary.totalWorkHours} <span className="text-sm font-normal text-slate-500">Saat</span>
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Timer size={18} />
                                </div>
                                <span className="text-sm font-medium text-emerald-900">Toplam Fazla Mesai</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800 ml-1">
                                {monthlySummary.totalOvertime} <span className="text-sm font-normal text-slate-500">Saat</span>
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <Briefcase size={18} />
                                </div>
                                <span className="text-sm font-medium text-indigo-900">Gereken Çalışma</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800 ml-1">
                                {monthlySummary.monthlyRequired} <span className="text-sm font-normal text-slate-500">Saat</span>
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border ${parseFloat(monthlySummary.netBalance) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${parseFloat(monthlySummary.netBalance) >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    <Activity size={18} />
                                </div>
                                <span className={`text-sm font-medium ${parseFloat(monthlySummary.netBalance) >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>Net Fark</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800 ml-1">
                                {monthlySummary.netBalance > 0 ? '+' : ''}{monthlySummary.netBalance} <span className="text-sm font-normal text-slate-500">Saat</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                                <span className="block text-xs font-medium text-amber-900 mb-1">İzinli Gün</span>
                                <span className="text-xl font-bold text-slate-800">{monthlySummary.leaveDays}</span>
                            </div>
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                                <span className="block text-xs font-medium text-red-900 mb-1">Eksik Gün</span>
                                <span className="text-xl font-bold text-slate-800">{monthlySummary.missingDays}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Renk Kodları</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-slate-600">Normal Mesai</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-slate-600">Fazla Mesai</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span className="text-slate-600">İzinli</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-slate-600">Devamsız / Eksik</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                            <span className="text-slate-600">Resmi Tatil</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Calendar */}
            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-3rem)] md:h-auto overflow-hidden">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    onNavigate={handleNavigate}
                    selectable={true}
                    culture='tr'
                    components={components}
                    messages={{
                        next: "İleri",
                        previous: "Geri",
                        today: "Bugün",
                        month: "Ay",
                        week: "Hafta",
                        day: "Gün",
                        agenda: "Ajanda",
                        date: "Tarih",
                        time: "Saat",
                        event: "Olay",
                        noEventsInRange: "Bu aralıkta olay yok."
                    }}
                    tooltipAccessor={event => `${event.title}`}
                />
            </div>

            {/* Day Details Modal */}
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

                                            {/* Additional Details from Logs */}
                                            {evt.details && evt.details.description && (
                                                <p className="mt-2 text-xs text-slate-600 italic border-t border-slate-100 pt-2">
                                                    "{evt.details.description}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <CalendarIcon size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Bu tarihte herhangi bir kayıt bulunmamaktadır.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-right">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-slate-500/20"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
