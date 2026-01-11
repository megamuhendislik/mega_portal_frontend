import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AgendaEventModal from '../components/AgendaEventModal';
import DayDetailModal from '../components/DayDetailModal';
import useInterval from '../hooks/useInterval';
import { Plus, Users, Globe, Lock, Bell, ChevronLeft, ChevronRight, Share2, Briefcase, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';

moment.locale('tr');
const localizer = momentLocalizer(moment);

const messages = {
    allDay: 'Tüm Gün',
    previous: 'Geri',
    next: 'İleri',
    today: 'Bugün',
    month: 'Ay',
    week: 'Hafta',
    day: 'Gün',
    agenda: 'Ajanda',
    date: 'Tarih',
    time: 'Zaman',
    event: 'Etkinlik',
    noEventsInRange: 'Bu aralıkta etkinlik yok.'
};

const CalendarPage = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [holidays, setHolidays] = useState(new Set()); // Strings 'YYYY-MM-DD'
    const [loading, setLoading] = useState(false);

    // View State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [mode, setMode] = useState('YEAR'); // 'YEAR' | 'CALENDAR'
    const [calendarView, setCalendarView] = useState('month'); // Internal view for big-calendar

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showDayDetail, setShowDayDetail] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedEventData, setSelectedEventData] = useState(null);

    // Filter Toggle
    const [showWorkEvents, setShowWorkEvents] = useState(false);

    useEffect(() => {
        // If in year mode, maybe fetch broad range or just specific buckets?
        // For simplicity, we fetch the current view's range when in CALENDAR mode.
        // If in year mode, maybe fetch broad range or just specific buckets?
        // For simplicity, we fetch the current view's range when in CALENDAR mode.
        fetchCalendarData();
    }, [currentDate, calendarView, showWorkEvents, mode]);

    // Live Updates (Every 60s) - Only active in Calendar mode to save resources?
    // Or keep it active if we want indicators on Year view (optional complexity).
    useInterval(() => {
        if (!loading && !showModal && mode === 'CALENDAR') {
            fetchCalendarData();
        }
    }, 60000);

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            // Determine range based on view
            const mDate = moment(currentDate);
            let start, end;

            if (mode === 'YEAR') {
                // Fetch full year
                start = mDate.clone().startOf('year').format('YYYY-MM-DD');
                end = mDate.clone().endOf('year').format('YYYY-MM-DD');
            } else if (calendarView === 'month') {
                start = mDate.clone().startOf('month').subtract(7, 'days').format('YYYY-MM-DD');
                end = mDate.clone().endOf('month').add(7, 'days').format('YYYY-MM-DD');
            } else if (calendarView === 'week') {
                start = mDate.clone().startOf('week').format('YYYY-MM-DD');
                end = mDate.clone().endOf('week').format('YYYY-MM-DD');
            } else {
                start = mDate.clone().subtract(1, 'day').format('YYYY-MM-DD');
                end = mDate.clone().add(1, 'day').format('YYYY-MM-DD');
            }

            const response = await api.get(`/calendar-events/?start=${start}&end=${end}`);

            const rawEvents = response.data || [];
            const parsedEvents = [];
            const newHolidays = new Set();

            rawEvents.forEach(evt => {
                const eventStart = new Date(evt.start);
                const eventEnd = new Date(evt.end);

                if (evt.status === 'HOLIDAY') {
                    newHolidays.add(moment(eventStart).format('YYYY-MM-DD'));
                }

                const isWorkEvent = ['ATTENDANCE', 'LEAVE_REQUEST', 'OVERTIME_REQUEST'].includes(evt.type);
                const isPersonal = evt.type === 'PERSONAL';

                if (evt.status === 'HOLIDAY' || isPersonal || (showWorkEvents && isWorkEvent)) {
                    parsedEvents.push({
                        ...evt,
                        start: eventStart,
                        end: eventEnd,
                        is_shared: evt.shared_with?.length > 0 || evt.shared_departments?.length > 0
                    });
                }
            });

            setEvents(parsedEvents);
            setHolidays(newHolidays);

        } catch (error) {
            console.error("Calendar fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Styling
    const eventPropGetter = (event) => {
        let backgroundColor = event.color || '#3b82f6';
        let borderColor = 'transparent';

        if (event.type === 'PERSONAL') {
            if (event.is_shared && !event.is_owner) {
                backgroundColor = '#10b981';
                borderColor = '#047857';
            } else if (event.is_shared && event.is_owner) {
                backgroundColor = '#8b5cf6';
            }
        }

        if (event.status === 'HOLIDAY') {
            backgroundColor = '#ef4444';
        }

        return {
            style: {
                backgroundColor,
                borderLeft: `4px solid ${borderColor !== 'transparent' ? borderColor : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#fff',
                padding: '2px 4px'
            }
        };
    };

    const dayPropGetter = (date) => {
        const dateStr = moment(date).format('YYYY-MM-DD');
        const dayOfWeek = date.getDay();
        const isHoliday = holidays.has(dateStr);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = moment(date).isSame(moment(), 'day');
        const isBeforeToday = moment(date).isBefore(moment(), 'day');

        // Priority 1: Today
        if (isToday) {
            return {
                className: 'bg-indigo-50/90 border-2 border-indigo-200',
                style: {
                    backgroundColor: '#e0e7ff',
                    color: '#1e1b4b'
                }
            };
        }

        // Base Styles
        let className = "";
        let style = {};

        if (isHoliday) {
            className = 'bg-red-50/70';
            style = { backgroundColor: 'rgba(254, 226, 226, 0.4)' };
            if (isBeforeToday) className += ' grayscale-[0.4]';
        } else if (isWeekend) {
            className = 'bg-slate-100/80';
            style = { backgroundColor: '#f1f5f9' }; // Plain distinct slate for weekend
        }

        // Priority 2: Past Days (Crossed Off Effect)
        if (isBeforeToday) {
            // Append Cross Hatch to whatever background exists
            className += ' crossed-day opacity-80'; // Add class
            style = { ...style, color: '#94a3b8' };
        }

        return { className, style };
    };

    // --- Handlers ---

    const handleMonthClick = (date) => {
        setCurrentDate(date);
        setMode('CALENDAR');
        setCalendarView('month');
    };

    const handleSelectSlot = ({ start }) => {
        // Open Detail View first
        setSelectedSlot(start);
        setShowDayDetail(true);
    };

    const handleSelectEvent = (event) => {
        // Directly open Edit Modal for specific event
        if (event.type === 'PERSONAL') {
            setSelectedEventData({
                id: event.db_id,
                title: event.title,
                start_time: event.start,
                end_time: event.end,
                is_all_day: event.allDay,
                color: event.color,
                description: event.description,
                shared_with: event.shared_with,
                shared_departments: event.shared_departments,
                reminders: event.reminders,
                is_owner: event.is_owner
            });
            setShowModal(true);
        }
    };

    const handleDayDetailAdd = () => {
        setShowDayDetail(false); // Close detail
        setSelectedEventData(null); // Clear data
        setShowModal(true); // Open Create Modal
    };

    const handleDayDetailEdit = (evt) => {
        setShowDayDetail(false);
        handleSelectEvent(evt);
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        if (mode === 'CALENDAR') fetchCalendarData();
    };

    // --- Sub-Components ---

    const CustomToolbar = (toolbar) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
            setCurrentDate(moment(toolbar.date).subtract(1, calendarView === 'month' ? 'month' : 'week').toDate());
        };
        const goToNext = () => {
            toolbar.onNavigate('NEXT');
            setCurrentDate(moment(toolbar.date).add(1, calendarView === 'month' ? 'month' : 'week').toDate());
        };
        const goToToday = () => {
            const now = new Date();
            toolbar.onNavigate('TODAY');
            setCurrentDate(now);
        };

        return (
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMode('YEAR')}
                        className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Yıl Görünümü
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    <button onClick={goToToday} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        Bugün
                    </button>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={goToBack} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={goToNext} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <span className="capitalize font-bold text-xl text-slate-800 ml-2">
                        {moment(toolbar.date).format('MMMM YYYY')}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowWorkEvents(!showWorkEvents)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showWorkEvents ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        <Briefcase size={16} />
                        {showWorkEvents ? 'İş Planı Açık' : 'İş Planı Gizli'}
                    </button>

                    <button
                        onClick={() => { setSelectedSlot(new Date()); setSelectedEventData(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Ekle</span>
                    </button>
                </div>
            </div>
        );
    };

    const CustomEvent = ({ event }) => {
        return (
            <div className="flex items-center gap-1.5 overflow-hidden">
                {event.type === 'PERSONAL' && event.is_shared && <Users size={12} className="shrink-0 opacity-80" />}
                {event.type === 'PERSONAL' && !event.is_shared && <Lock size={12} className="shrink-0 opacity-70" />}
                {event.reminders?.on_event && <Bell size={10} className="shrink-0" />}
                <span className="truncate">{event.title}</span>
            </div>
        );
    };

    const YearView = () => {
        const year = currentDate.getFullYear();
        // Explicitly defining Turkish months to ensure localization
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];

        return (
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 p-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black text-slate-800">{year}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(moment(currentDate).subtract(1, 'year').toDate())} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
                        <button onClick={() => setCurrentDate(moment(currentDate).add(1, 'year').toDate())} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight /></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {months.map((monthName, index) => {
                        const monthDate = moment().year(year).month(index);
                        const daysInMonth = monthDate.daysInMonth();
                        const startDay = monthDate.startOf('month').day(); // 0=Sun

                        // Adjust for Monday start (Turkey)
                        // 0(Sun) -> 6, 1(Mon) -> 0
                        const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;

                        const days = [];
                        for (let i = 0; i < adjustedStartDay; i++) days.push(null);
                        for (let i = 1; i <= daysInMonth; i++) days.push(i);

                        return (
                            <div
                                key={monthName}
                                onClick={() => handleMonthClick(monthDate.toDate())}
                                className="group cursor-pointer hover:ring-2 hover:ring-indigo-100 rounded-2xl p-4 transition-all hover:bg-slate-50 border border-transparent hover:border-indigo-200"
                            >
                                <h3 className="font-bold text-lg text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">{monthName}</h3>
                                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                                        <span key={d} className="text-slate-400 font-medium py-1">{d}</span>
                                    ))}
                                    {days.map((d, i) => {
                                        if (!d) return <div key={i}></div>;

                                        // Adjust index to match 0-11 for moment months
                                        const currentDayDate = moment([year, index, d]);
                                        const dateStr = currentDayDate.format('YYYY-MM-DD');
                                        const isToday = currentDayDate.isSame(moment(), 'day');
                                        const isBeforeToday = currentDayDate.isBefore(moment(), 'day');
                                        const isHoliday = holidays.has(dateStr);
                                        const isWeekend = currentDayDate.day() === 0 || currentDayDate.day() === 6;

                                        let className = "py-1.5 rounded-lg flex items-center justify-center transition-all font-medium relative overflow-hidden";
                                        let style = {};

                                        // 1. Base Colors
                                        if (isToday) {
                                            className += " bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200";
                                        } else if (isHoliday) {
                                            className += " bg-red-50 text-red-600 font-bold ring-1 ring-red-100";
                                            if (isBeforeToday) className += " opacity-60 grayscale-[0.5]";
                                        } else if (isWeekend) {
                                            className += " bg-slate-100 text-slate-500 font-medium";
                                            // Distinct weekend color (Gray/Slate)
                                        } else {
                                            className += " text-slate-600 hover:bg-indigo-50";
                                        }

                                        // 2. Past Day Overlay ("Crossed Off")
                                        if (isBeforeToday && !isToday) {
                                            className += " crossed-day";
                                            // Ensure text is readable but faded
                                            if (!isHoliday) className += " text-slate-400";
                                        }

                                        return (
                                            <div key={i} className={className} style={style}>
                                                {d}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const Legend = () => (
        <div className="flex flex-wrap gap-4 mt-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-600 font-bold">Genel</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                <span className="text-slate-600 font-bold">Toplantı</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                <span className="text-slate-600 font-bold">Not</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-600 font-bold">Hatırlatma</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-slate-600 font-bold">Acil / Tatil</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-bold">İzin / Seyahat</span>
            </div>

            <div className="w-px h-4 bg-slate-200 mx-2"></div>

            <div className="flex items-center gap-2" title="Sizinle paylaşılan etkinlikler">
                <Globe size={14} className="text-slate-400" />
                <span className="text-slate-500 font-medium italic">Paylaşılan</span>
            </div>

            {showWorkEvents && (
                <div className="flex items-center gap-2 ml-auto border-l pl-4 border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span className="text-slate-600 font-medium">İş Kaydı</span>
                </div>
            )}
        </div>
    );

    // --- Handlers ---
    // ...

    const CustomDateHeader = ({ label, date }) => {
        const isBeforeToday = moment(date).isBefore(moment(), 'day');
        return (
            <div className="relative">
                <span>{label}</span>
                {isBeforeToday && (
                    <div className="absolute top-[30px] left-1/2 -translate-x-1/2 z-[50] pointer-events-none opacity-90 drop-shadow-md">
                        <img
                            src="/cross.svg"
                            alt="Cross"
                            className="w-16 h-16 object-contain"
                            style={{
                                filter: 'invert(16%) sepia(88%) saturate(6054%) hue-rotate(358deg) brightness(96%) contrast(114%) drop-shadow(2px 4px 4px rgba(0,0,0,0.5))'
                            }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <style>{`
                /* Year View Cross Style */
                .crossed-day {
                    position: relative;
                }
                .crossed-day::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: url('/cross.svg');
                    background-size: 30%;
                    background-position: center;
                    background-repeat: no-repeat;
                    opacity: 0.9;
                    pointer-events: none;
                    z-index: 20;
                    filter: invert(16%) sepia(88%) saturate(6054%) hue-rotate(358deg) brightness(96%) contrast(114%) drop-shadow(2px 4px 4px rgba(0,0,0,0.5));
                }

                /* Month View Overflow Fixes */
                .rbc-date-cell {
                    overflow: visible !important;
                }
                .rbc-row-content {
                    overflow: visible !important;
                }
                .rbc-month-row {
                    overflow: visible !important;
                }
            `}</style>

            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                {/* ... Header content ... */}
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="bg-gradient-to-tr from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            Ajandam
                        </span>
                        <span className="text-sm font-medium px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                            {mode === 'YEAR' ? 'Yıllık Görünüm' : 'Ajanda Modu'}
                        </span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Planlarınızı yönetin ve takip edin.
                    </p>
                </div>
                <Legend />
            </div>

            {mode === 'YEAR' && <YearView />}

            {mode === 'CALENDAR' && (
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 p-6 h-[800px] animate-in zoom-in-95 duration-300">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        messages={messages}
                        date={currentDate}
                        onNavigate={date => setCurrentDate(date)}
                        view={calendarView}
                        onView={v => setCalendarView(v)}
                        selectable
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        eventPropGetter={eventPropGetter}
                        dayPropGetter={dayPropGetter}
                        components={{
                            toolbar: CustomToolbar,
                            event: CustomEvent,
                            month: {
                                header: CustomDateHeader
                            }
                        }}
                        popup
                    />
                </div>
            )}

            {/* Modals ... */}

            {showDayDetail && (
                <DayDetailModal
                    date={selectedSlot}
                    events={events}
                    onClose={() => setShowDayDetail(false)}
                    onAddEvent={handleDayDetailAdd}
                    onEditEvent={handleDayDetailEdit}
                />
            )}

            {showModal && (
                <AgendaEventModal
                    onClose={() => setShowModal(false)}
                    onSuccess={handleModalSuccess}
                    initialDate={selectedSlot}
                    initialData={selectedEventData}
                />
            )}
        </div>
    );
};

export default CalendarPage;
