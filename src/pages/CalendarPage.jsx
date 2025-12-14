import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { X, Clock, Calendar as CalendarIcon, Info, CheckCircle2, AlertCircle, Briefcase, Timer } from 'lucide-react';

moment.locale('tr');
const localizer = momentLocalizer(moment);

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);

    // Monthly Summary State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlySummary, setMonthlySummary] = useState({
        totalWorkHours: 0,
        totalOvertime: 0,
        missingDays: 0,
        leaveDays: 0
    });

    useEffect(() => {
        fetchData();
    }, [currentDate]); // Refetch when month changes

    const fetchData = async () => {
        setLoading(true);
        try {
            const startOfMonth = moment(currentDate).startOf('month').format('YYYY-MM-DD');
            const endOfMonth = moment(currentDate).endOf('month').format('YYYY-MM-DD');

            // Fetch wider range for calendar view (prev/next month visibility)
            const viewStart = moment(currentDate).subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
            const viewEnd = moment(currentDate).add(1, 'month').endOf('month').format('YYYY-MM-DD');

            const [calendarRes, attendanceRes] = await Promise.all([
                api.get(`/calendar/?start=${viewStart}&end=${viewEnd}`),
                api.get(`/attendance/?start_date=${viewStart}&end_date=${viewEnd}`) // Assuming attendance endpoint supports filtering or returns all
            ]);

            const calendarEvents = calendarRes.data || [];
            const attendanceLogs = attendanceRes.data.results || attendanceRes.data || [];

            // Process Events
            let processedEvents = [];

            // 1. Map Standard Calendar Events (Holidays, Leaves, etc.)
            calendarEvents.forEach(evt => {
                // Filter out ABSENT on Weekends (Saturday=6, Sunday=0)
                const evtDate = moment(evt.start);
                const isWeekend = evtDate.day() === 0 || evtDate.day() === 6;

                if (evt.type === 'ABSENT' && isWeekend) {
                    return; // Skip weekend absences
                }

                processedEvents.push({
                    ...evt,
                    start: new Date(evt.start),
                    end: new Date(evt.end),
                    source: 'CALENDAR'
                });
            });

            setEvents(processedEvents);

            // Calculate Summary based on Payroll Period (26th to 25th)
            const payrollPeriod = getPayrollPeriod(currentDate);
            calculateMonthlySummary(attendanceLogs, calendarEvents, payrollPeriod.start, payrollPeriod.end);

        } catch (error) {
            console.error('Error fetching calendar data:', error);
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

    const calculateMonthlySummary = (logs, calEvents, start, end) => {
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

        setMonthlySummary({
            totalWorkHours: (totalMinutes / 60).toFixed(1),
            totalOvertime: (overtimeMinutes / 60).toFixed(1),
            missingDays: missingCount,
            leaveDays: leaveCount
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
