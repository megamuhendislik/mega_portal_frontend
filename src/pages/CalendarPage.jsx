import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AgendaEventModal from '../components/AgendaEventModal';
import CalendarSidePanel from '../components/CalendarSidePanel';
import TeamGanttBar from '../components/TeamGanttBar';
import useInterval from '../hooks/useInterval';
import { Plus, Users, Globe, Lock, Bell, ChevronLeft, ChevronRight, Briefcase, Calendar as CalendarIcon, CalendarCheck, ClipboardList, Heart, CreditCard, MapPin, UsersRound, Building2 } from 'lucide-react';

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
    const [holidays, setHolidays] = useState(new Set());
    const [halfDayHolidays, setHalfDayHolidays] = useState(new Set());
    const [loading, setLoading] = useState(false);

    // View State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState('month');

    // Side Panel State
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedEventData, setSelectedEventData] = useState(null);

    // Filter Toggles
    const [showOTAssignments, setShowOTAssignments] = useState(false);
    const [showOTRequests, setShowOTRequests] = useState(false);
    const [showLeaves, setShowLeaves] = useState(true);
    const [showHealthReports, setShowHealthReports] = useState(true);
    const [showCardless, setShowCardless] = useState(false);
    const [showTeamView, setShowTeamView] = useState(false);

    // Managed employees (for OT assignment)
    const [managedEmployees, setManagedEmployees] = useState([]);
    const isManager = managedEmployees.length > 0;

    useEffect(() => {
        const fetchManaged = async () => {
            try {
                const res = await api.get('/employees/subordinates/');
                setManagedEmployees(res.data || []);
            } catch { /* not a manager */ }
        };
        fetchManaged();
    }, []);

    useEffect(() => {
        fetchCalendarData();
    }, [currentDate, calendarView, showOTAssignments, showOTRequests, showLeaves, showHealthReports, showCardless]);

    useInterval(() => {
        if (!loading && !showModal && !sidePanelOpen) {
            fetchCalendarData();
        }
    }, 60000);

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const mDate = moment(currentDate);
            let start, end;

            if (calendarView === 'month') {
                start = mDate.clone().startOf('month').subtract(7, 'days').format('YYYY-MM-DD');
                end = mDate.clone().endOf('month').add(7, 'days').format('YYYY-MM-DD');
            } else if (calendarView === 'week') {
                start = mDate.clone().startOf('week').format('YYYY-MM-DD');
                end = mDate.clone().endOf('week').format('YYYY-MM-DD');
            } else if (calendarView === 'day') {
                start = mDate.clone().subtract(1, 'day').format('YYYY-MM-DD');
                end = mDate.clone().add(1, 'day').format('YYYY-MM-DD');
            } else {
                // agenda view
                start = mDate.clone().startOf('month').format('YYYY-MM-DD');
                end = mDate.clone().endOf('month').format('YYYY-MM-DD');
            }

            let url = `/calendar-events/?start=${start}&end=${end}`;
            if (showOTAssignments) url += '&include_ot_assignments=true';
            if (showOTRequests) url += '&include_ot_requests=true';
            if (showLeaves) url += '&include_leaves=true';
            if (showHealthReports) url += '&include_health_reports=true';
            if (showCardless) url += '&include_cardless=true';

            const response = await api.get(url);
            const rawEvents = response.data || [];
            const parsedEvents = [];
            const newHolidays = new Set();
            const newHalfDays = new Set();

            rawEvents.forEach(evt => {
                const eventStart = new Date(evt.start);
                const eventEnd = new Date(evt.end);

                if (evt.type === 'HOLIDAY') {
                    const dateStr = moment(eventStart).format('YYYY-MM-DD');
                    newHolidays.add(dateStr);
                    if (evt.is_half_day) {
                        newHalfDays.add(dateStr);
                    }
                }

                parsedEvents.push({
                    ...evt,
                    start: eventStart,
                    end: eventEnd,
                    is_shared: evt.shared_with?.length > 0 || evt.shared_departments?.length > 0
                });
            });

            setEvents(parsedEvents);
            setHolidays(newHolidays);
            setHalfDayHolidays(newHalfDays);
        } catch (error) {
            console.error("Calendar fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Event Styling ---
    const eventPropGetter = (event) => {
        let backgroundColor = event.color || '#3b82f6';
        let borderColor = 'transparent';

        if (event.type === 'PERSONAL') {
            // Visibility-based coloring
            if (event.visibility === 'PUBLIC') {
                backgroundColor = '#10b981';
                borderColor = '#047857';
            } else if (event.visibility === 'DEPARTMENT') {
                backgroundColor = '#14b8a6';
                borderColor = '#0d9488';
            } else if (!event.is_owner) {
                backgroundColor = '#10b981';
                borderColor = '#047857';
            }
            // Meeting type override
            if (event.event_type === 'MEETING') {
                backgroundColor = event.visibility === 'PUBLIC' ? '#10b981' : '#14b8a6';
            } else if (event.event_type === 'REMINDER') {
                backgroundColor = '#eab308';
                borderColor = '#ca8a04';
            }
        }

        if (event.status === 'HOLIDAY') {
            backgroundColor = '#ef4444';
        }
        if (event.type === 'OVERTIME_ASSIGNMENT') {
            backgroundColor = '#8b5cf6';
            borderColor = '#7c3aed';
        }
        if (event.type === 'OVERTIME_REQUEST') {
            backgroundColor = event.status === 'APPROVED' ? '#22c55e' : '#f59e0b';
            borderColor = event.status === 'APPROVED' ? '#16a34a' : '#d97706';
        }
        if (event.type === 'LEAVE_REQUEST') {
            backgroundColor = '#06b6d4';
            borderColor = '#0891b2';
        }
        if (event.type === 'EXTERNAL_DUTY') {
            backgroundColor = '#a855f7';
            borderColor = '#9333ea';
        }
        if (event.type === 'HEALTH_REPORT') {
            backgroundColor = '#ec4899';
            borderColor = '#db2777';
        }
        if (event.type === 'CARDLESS_ENTRY') {
            backgroundColor = '#f97316';
            borderColor = '#ea580c';
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
        const isHalfDay = halfDayHolidays.has(dateStr);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = moment(date).isSame(moment(), 'day');
        const isBeforeToday = moment(date).isBefore(moment(), 'day');

        if (isToday) {
            return {
                className: 'bg-indigo-50/90 border-2 border-indigo-200',
                style: { backgroundColor: '#e0e7ff', color: '#1e1b4b' }
            };
        }

        let className = '';
        let style = {};

        if (isHalfDay) {
            className = 'half-day-holiday';
            style = {};
        } else if (isHoliday) {
            className = 'bg-red-50/70';
            style = { backgroundColor: 'rgba(254, 226, 226, 0.4)' };
            if (isBeforeToday) className += ' grayscale-[0.4]';
        } else if (isWeekend) {
            className = 'bg-slate-100/80';
            style = { backgroundColor: '#f1f5f9' };
        }

        if (isBeforeToday) {
            className += ' crossed-day opacity-80';
            style = { ...style, color: '#94a3b8' };
        }

        return { className, style };
    };

    // --- Handlers ---
    const handleSelectSlot = ({ start }) => {
        setSelectedDate(start);
        setSidePanelOpen(true);
    };

    const handleSelectEvent = (event) => {
        if (event.type === 'PERSONAL' && event.is_owner) {
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
                is_owner: event.is_owner,
                visibility: event.visibility,
                event_type: event.event_type,
                location: event.location,
            });
            setShowModal(true);
        } else {
            // For non-personal events, open side panel on that date
            setSelectedDate(event.start);
            setSidePanelOpen(true);
        }
    };

    const handleSidePanelAdd = () => {
        setSelectedSlot(selectedDate || new Date());
        setSelectedEventData(null);
        setSidePanelOpen(false);
        setShowModal(true);
    };

    const handleSidePanelEdit = (evt) => {
        setSidePanelOpen(false);
        handleSelectEvent(evt);
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        fetchCalendarData();
    };

    // --- Localization ---
    const formats = useMemo(() => {
        const trIntlDay = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' });
        const trIntlMonthYear = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
        const trIntlDayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });

        return {
            dateFormat: 'DD',
            dayFormat: (date) => {
                const day = date.getDate().toString().padStart(2, '0');
                const name = trIntlDay.format(date);
                return `${day} ${name}`;
            },
            weekdayFormat: (date) => trIntlDay.format(date),
            monthHeaderFormat: (date) => trIntlMonthYear.format(date),
            dayRangeHeaderFormat: ({ start, end }) =>
                `${trIntlDayMonth.format(start)} - ${trIntlDayMonth.format(end)}`,
            agendaDateFormat: (date) => `${trIntlDayMonth.format(date)} ${trIntlDay.format(date)}`,
            agendaTimeFormat: 'HH:mm',
        };
    }, []);

    // --- Toolbar ---
    const CustomToolbar = (toolbar) => {
        const goToBack = () => { toolbar.onNavigate('PREV'); };
        const goToNext = () => { toolbar.onNavigate('NEXT'); };
        const goToToday = () => { toolbar.onNavigate('TODAY'); };

        const title = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(toolbar.date);

        return (
            <div className="flex flex-col gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                {/* Row 1: Navigation + View Switcher */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                            {title}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {['month', 'week', 'day', 'agenda'].map(view => (
                            <button
                                key={view}
                                onClick={() => toolbar.onView(view)}
                                className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${calendarView === view ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                {view === 'month' ? 'Ay' : view === 'week' ? 'Hafta' : view === 'day' ? 'Gün' : 'Ajanda'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Filters + Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setShowOTAssignments(!showOTAssignments)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showOTAssignments ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        <CalendarCheck size={14} />
                        Mesai Görevleri
                    </button>

                    <button
                        onClick={() => setShowOTRequests(!showOTRequests)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showOTRequests ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        <ClipboardList size={14} />
                        Mesai Talepleri
                    </button>

                    <div className="w-px h-6 bg-slate-200"></div>

                    <button
                        onClick={() => setShowLeaves(!showLeaves)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showLeaves ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        <CalendarIcon size={14} />
                        İzinler
                    </button>

                    <button
                        onClick={() => setShowHealthReports(!showHealthReports)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showHealthReports ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        <Heart size={14} />
                        Sağlık Raporu
                    </button>

                    <button
                        onClick={() => setShowCardless(!showCardless)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showCardless ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        <CreditCard size={14} />
                        Kartsız Giriş
                    </button>

                    {isManager && (
                        <>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <button
                                onClick={() => setShowTeamView(!showTeamView)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showTeamView ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                            >
                                <UsersRound size={14} />
                                Ekip Görünümü
                            </button>
                        </>
                    )}

                    <div className="ml-auto">
                        <button
                            onClick={() => { setSelectedSlot(new Date()); setSelectedEventData(null); setShowModal(true); }}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Etkinlik Ekle</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Custom Event Renderer ---
    const CustomEvent = ({ event }) => {
        const getIcon = () => {
            if (event.type === 'PERSONAL') {
                if (event.event_type === 'MEETING') return <Users size={12} className="shrink-0 opacity-80" />;
                if (event.event_type === 'REMINDER') return <Bell size={12} className="shrink-0 opacity-80" />;
                if (event.visibility === 'PUBLIC') return <Globe size={12} className="shrink-0 opacity-80" />;
                if (event.visibility === 'DEPARTMENT') return <Building2 size={12} className="shrink-0 opacity-80" />;
                return <Lock size={12} className="shrink-0 opacity-70" />;
            }
            if (event.type === 'OVERTIME_ASSIGNMENT') return <CalendarCheck size={12} className="shrink-0 opacity-90" />;
            if (event.type === 'OVERTIME_REQUEST') return <ClipboardList size={12} className="shrink-0 opacity-90" />;
            if (event.type === 'LEAVE_REQUEST') return <CalendarIcon size={12} className="shrink-0 opacity-90" />;
            if (event.type === 'EXTERNAL_DUTY') return <MapPin size={12} className="shrink-0 opacity-90" />;
            if (event.type === 'HEALTH_REPORT') return <Heart size={12} className="shrink-0 opacity-90" />;
            if (event.type === 'CARDLESS_ENTRY') return <CreditCard size={12} className="shrink-0 opacity-90" />;
            return null;
        };

        return (
            <div className="flex items-center gap-1.5 overflow-hidden">
                {getIcon()}
                <span className="truncate">{event.title}</span>
            </div>
        );
    };

    // --- Legend ---
    const Legend = () => (
        <div className="flex flex-wrap gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-600 font-bold">Kişisel</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-bold">Herkese Açık</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                <span className="text-slate-600 font-bold">Departman</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="text-slate-600 font-bold">Hatırlatıcı</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-slate-600 font-bold">Tatil</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            {showOTAssignments && (
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                    <span className="text-slate-600 font-medium">Mesai Görevi</span>
                </div>
            )}
            {showOTRequests && (
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600 font-medium">Mesai Talebi</span>
                </div>
            )}
            {showLeaves && (
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                    <span className="text-slate-600 font-medium">İzin</span>
                </div>
            )}
            {showHealthReports && (
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                    <span className="text-slate-600 font-medium">Sağlık Raporu</span>
                </div>
            )}
            {showCardless && (
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span className="text-slate-600 font-medium">Kartsız Giriş</span>
                </div>
            )}
        </div>
    );

    // --- Date Header with Cross ---
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

    // --- Render ---
    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <style>{`
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

                .half-day-holiday {
                    background: repeating-linear-gradient(
                        -45deg,
                        rgba(249, 115, 22, 0.12),
                        rgba(249, 115, 22, 0.12) 4px,
                        rgba(254, 226, 226, 0.3) 4px,
                        rgba(254, 226, 226, 0.3) 8px
                    ) !important;
                }

                .rbc-calendar, .rbc-month-view, .rbc-month-row, .rbc-row, .rbc-row-content, .rbc-date-cell {
                    overflow: visible !important;
                }
                .rbc-row-content > .rbc-row:first-child {
                    z-index: 9999 !important;
                    position: relative !important;
                    pointer-events: none !important;
                }
                .rbc-row-content > .rbc-row:first-child .rbc-date-cell button,
                .rbc-row-content > .rbc-row:first-child .rbc-date-cell a {
                    pointer-events: auto !important;
                    position: relative;
                    z-index: 10000;
                }
                .rbc-row-content > .rbc-row:not(:first-child) {
                    z-index: 5 !important;
                    position: relative !important;
                }
                .rbc-event {
                    z-index: auto !important;
                }
            `}</style>

            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="bg-gradient-to-tr from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            Ajandam
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Planlarınızı, toplantılarınızı ve etkinliklerinizi yönetin.
                    </p>
                </div>
                <Legend />
            </div>

            {/* Calendar + Side Panel Layout */}
            <div className="relative">
                <div className={`transition-all duration-300 ${sidePanelOpen ? 'mr-[420px]' : ''}`}>
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 p-4 md:p-6 h-[500px] md:h-[800px]">
                        <Calendar
                            localizer={localizer}
                            culture="tr"
                            formats={formats}
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

                    {/* Team Gantt Bar (below calendar) */}
                    {showTeamView && isManager && (
                        <TeamGanttBar
                            startDate={moment(currentDate).startOf('month').toDate()}
                            endDate={moment(currentDate).endOf('month').toDate()}
                            currentDate={currentDate}
                        />
                    )}
                </div>

                {/* Side Panel */}
                {sidePanelOpen && (
                    <CalendarSidePanel
                        date={selectedDate}
                        events={events}
                        onClose={() => setSidePanelOpen(false)}
                        onAddEvent={handleSidePanelAdd}
                        onEditEvent={handleSidePanelEdit}
                        isManager={isManager}
                        managedEmployees={managedEmployees}
                        onOTAssignSuccess={fetchCalendarData}
                    />
                )}
            </div>

            {/* Event Create/Edit Modal */}
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
