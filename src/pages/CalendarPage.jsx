import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AgendaEventModal from '../components/AgendaEventModal';
import useInterval from '../hooks/useInterval';
import { Plus, Users, Globe, Lock, Bell, ChevronLeft, ChevronRight, Share2, Briefcase } from 'lucide-react';

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
    const [view, setView] = useState('month');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedEventData, setSelectedEventData] = useState(null);

    // Filter Toggle
    const [showWorkEvents, setShowWorkEvents] = useState(false); // Default false for "Agenda Mode" focus

    useEffect(() => {
        fetchCalendarData();
    }, [currentDate, view, showWorkEvents]);

    // Live Updates (Every 60s)
    useInterval(() => {
        if (!loading && !showModal) {
            console.log("Auto-refreshing calendar...");
            fetchCalendarData();
        }
    }, 60000);

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            // Determine range based on view
            const mDate = moment(currentDate);
            let start, end;

            if (view === 'month') {
                start = mDate.clone().startOf('month').subtract(7, 'days').format('YYYY-MM-DD');
                end = mDate.clone().endOf('month').add(7, 'days').format('YYYY-MM-DD');
            } else if (view === 'week') {
                start = mDate.clone().startOf('week').format('YYYY-MM-DD');
                end = mDate.clone().endOf('week').format('YYYY-MM-DD');
            } else {
                start = mDate.clone().subtract(1, 'day').format('YYYY-MM-DD');
                end = mDate.clone().add(1, 'day').format('YYYY-MM-DD');
            }

            const response = await api.get(`/attendance/calendar-events/?start=${start}&end=${end}`);

            const rawEvents = response.data || [];
            const parsedEvents = [];
            const newHolidays = new Set();

            rawEvents.forEach(evt => {
                // Parse Dates
                const eventStart = new Date(evt.start);
                const eventEnd = new Date(evt.end);

                // Identify Holidays
                if (evt.status === 'HOLIDAY') {
                    newHolidays.add(moment(eventStart).format('YYYY-MM-DD'));
                }

                // Filtering: Agenda Mode vs Work Mode
                // Agenda Mode: Shows PERSONAL, HOLIDAY. 
                // Work Mode: Shows ATTENDANCE, LEAVE_REQUEST, OVERTIME.

                const isWorkEvent = ['ATTENDANCE', 'LEAVE_REQUEST', 'OVERTIME_REQUEST'].includes(evt.type);
                const isPersonal = evt.type === 'PERSONAL';

                // Always show Holidays? YES.
                // Always show Personal? YES.
                // Show Work? Only if toggled.

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
                // Shared with me
                backgroundColor = '#10b981'; // Emerald
                borderColor = '#047857';
            } else if (event.is_shared && event.is_owner) {
                // Shared by me
                backgroundColor = '#8b5cf6'; // Violet
            }
        }

        if (event.status === 'HOLIDAY') {
            backgroundColor = '#ef4444'; // Red
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
        const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

        const isHoliday = holidays.has(dateStr);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Simple Default. Ideally check user.schedule

        if (isHoliday) {
            return {
                className: 'bg-red-50/70',
                style: { backgroundColor: 'rgba(254, 226, 226, 0.4)' } // Tailwind red-50
            };
        }
        if (isWeekend) {
            return {
                className: 'bg-slate-50/80',
                style: { backgroundColor: 'rgba(248, 250, 252, 0.8)' } // Tailwind slate-50
            };
        }
        return {};
    };

    // Handlers
    const handleSelectSlot = ({ start }) => {
        setSelectedSlot(start);
        setSelectedEventData(null);
        setShowModal(true);
    };

    const handleSelectEvent = (event) => {
        if (event.type === 'PERSONAL') {
            // Edit Personal Event
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
        } else {
            // Just view info? Or ignore for now.
            // Could add a simple popover for work events later.
        }
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        fetchCalendarData(); // Refresh
    };

    // Custom Toolbar
    const CustomToolbar = (toolbar) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
            setCurrentDate(moment(toolbar.date).subtract(1, view === 'month' ? 'month' : 'week').toDate());
        };
        const goToNext = () => {
            toolbar.onNavigate('NEXT');
            setCurrentDate(moment(toolbar.date).add(1, view === 'month' ? 'month' : 'week').toDate());
        };
        const goToToday = () => {
            const now = new Date();
            toolbar.onNavigate('TODAY');
            setCurrentDate(now);
        };

        const label = () => {
            return <span className="capitalize font-bold text-xl text-slate-800">{moment(toolbar.date).format('MMMM YYYY')}</span>;
        };

        return (
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
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
                    {label()}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowWorkEvents(!showWorkEvents)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showWorkEvents ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                        <Briefcase size={16} />
                        {showWorkEvents ? 'İş Takvimi Açık' : 'İş Takvimi Gizli'}
                    </button>

                    <button
                        onClick={() => { setSelectedSlot(new Date()); setSelectedEventData(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Yeni Not Ekle</span>
                    </button>
                </div>
            </div>
        );
    };

    // Components for Custom Event Rendering
    const CustomEvent = ({ event }) => {
        return (
            <div className="flex items-center gap-1.5 overflow-hidden">
                {event.type === 'PERSONAL' && event.is_shared && (
                    <Users size={12} className="shrink-0 opacity-80" />
                )}
                {event.type === 'PERSONAL' && !event.is_shared && (
                    <Lock size={12} className="shrink-0 opacity-70" />
                )}
                {event.reminders?.on_event && (
                    <Bell size={10} className="shrink-0" />
                )}
                <span className="truncate">{event.title}</span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <span className="bg-gradient-to-tr from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                        Ajandam
                    </span>
                    <span className="text-sm font-medium px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                        Agenda Mode
                    </span>
                </h1>
                <p className="text-slate-500 mt-2 font-medium">
                    Kişisel notlarınızı, paylaşımlı etkinliklerinizi ve iş takviminizi buradan yönetebilirsiniz.
                </p>
            </div>

            {/* Calendar Container */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 p-6 h-[800px]">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    messages={messages}
                    date={currentDate}
                    onNavigate={date => setCurrentDate(date)}
                    view={view}
                    onView={v => setView(v)}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventPropGetter}
                    dayPropGetter={dayPropGetter}
                    components={{
                        toolbar: CustomToolbar,
                        event: CustomEvent
                    }}
                    popup
                />
            </div>

            {/* Event Modal */}
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
