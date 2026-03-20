import React, { useState, useEffect, useCallback, useMemo } from 'react';
import moment from 'moment';
import 'moment/locale/tr';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AgendaEventModal from '../components/AgendaEventModal';
import useInterval from '../hooks/useInterval';
import toast from 'react-hot-toast';
import { getIstanbulTodayDate, getIstanbulToday } from '../utils/dateUtils';
import {
    Plus, Users, Globe, Lock, Bell, ChevronLeft, ChevronRight,
    Calendar as CalendarIcon, CalendarCheck, ClipboardList, Heart,
    CreditCard, MapPin, Building2, Trash2, Edit3, Clock, Star,
    UsersRound, X as XIcon
} from 'lucide-react';

moment.locale('tr');

// ─── Color config for event types ───
const EVENT_COLORS = {
    PERSONAL:    { dot: 'bg-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200', text: 'text-blue-700',   label: 'Kişisel' },
    HOLIDAY:     { dot: 'bg-red-500',    bg: 'bg-red-50',    border: 'border-red-200',  text: 'text-red-700',    label: 'Tatil' },
    OVERTIME_ASSIGNMENT: { dot: 'bg-violet-500', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', label: 'Mesai Görevi' },
    OVERTIME_REQUEST:    { dot: 'bg-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  label: 'Mesai Talebi' },
    LEAVE_REQUEST:       { dot: 'bg-cyan-500',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   text: 'text-cyan-700',   label: 'İzin' },
    EXTERNAL_DUTY:       { dot: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: 'Dış Görev' },
    HEALTH_REPORT:       { dot: 'bg-pink-500',   bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   label: 'Sağlık' },
    CARDLESS_ENTRY:      { dot: 'bg-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Kartsız' },
};

const EVENT_ICONS = {
    PERSONAL: Lock,
    HOLIDAY: Globe,
    OVERTIME_ASSIGNMENT: CalendarCheck,
    OVERTIME_REQUEST: ClipboardList,
    LEAVE_REQUEST: CalendarIcon,
    EXTERNAL_DUTY: MapPin,
    HEALTH_REPORT: Heart,
    CARDLESS_ENTRY: CreditCard,
};

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// ─── Month Grid Component ───
const MonthGrid = ({ currentMonth, events, holidays, halfDayHolidays, selectedDate, onSelectDate }) => {
    const startOfMonth = moment(currentMonth).startOf('month');
    const endOfMonth = moment(currentMonth).endOf('month');

    // Build 6-week grid starting from Monday
    const startDay = startOfMonth.clone().startOf('isoWeek');
    const endDay = endOfMonth.clone().endOf('isoWeek');
    const weeks = [];
    let day = startDay.clone();
    while (day.isSameOrBefore(endDay, 'day')) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(day.clone());
            day.add(1, 'day');
        }
        weeks.push(week);
    }

    // Group events by date string
    const eventsByDate = useMemo(() => {
        const map = {};
        events.forEach(evt => {
            const start = moment(evt.start);
            const end = moment(evt.end);
            let d = start.clone().startOf('day');
            const lastDay = end.clone().startOf('day');
            while (d.isSameOrBefore(lastDay, 'day')) {
                const key = d.format('YYYY-MM-DD');
                if (!map[key]) map[key] = [];
                map[key].push(evt);
                d.add(1, 'day');
            }
        });
        return map;
    }, [events]);

    const today = getIstanbulToday();
    const selectedStr = selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : null;

    return (
        <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(name => (
                    <div key={name} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
                        {name}
                    </div>
                ))}
            </div>

            {/* Weeks */}
            <div className="grid gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-px">
                        {week.map(d => {
                            const dateStr = d.format('YYYY-MM-DD');
                            const isCurrentMonth = d.isSame(currentMonth, 'month');
                            const isToday = dateStr === today;
                            const isSelected = dateStr === selectedStr;
                            const isWeekend = d.isoWeekday() >= 6;
                            const isHoliday = holidays.has(dateStr);
                            const isHalfDay = halfDayHolidays.has(dateStr);
                            const isPast = d.isBefore(moment(getIstanbulTodayDate()), 'day');
                            const dayEvents = eventsByDate[dateStr] || [];

                            // Unique event type dots (max 4)
                            const dotTypes = [...new Set(dayEvents.map(e => e.type))].slice(0, 4);
                            const extraCount = [...new Set(dayEvents.map(e => e.type))].length - 4;

                            let cellClass = 'bg-white';
                            if (!isCurrentMonth) cellClass = 'bg-slate-50';
                            if (isWeekend && isCurrentMonth) cellClass = 'bg-amber-50/60';
                            if (isHoliday) cellClass = 'bg-red-50/70';
                            if (isHalfDay) cellClass = 'half-day-cell';
                            if (isPast && isCurrentMonth) cellClass += ' opacity-60';
                            if (isSelected) cellClass = 'bg-violet-500';
                            if (isToday && !isSelected) cellClass += ' ring-2 ring-inset ring-violet-400';

                            return (
                                <button
                                    key={dateStr}
                                    onClick={() => onSelectDate(d.toDate())}
                                    className={`
                                        relative flex flex-col items-center justify-start p-1.5 min-h-[60px] md:min-h-[72px]
                                        transition-all hover:bg-violet-50 cursor-pointer
                                        ${cellClass}
                                    `}
                                    title={isHoliday ? dayEvents.find(e => e.type === 'HOLIDAY')?.title : undefined}
                                >
                                    <span className={`
                                        text-xs font-bold leading-none
                                        ${isSelected ? 'text-white' : isHoliday ? 'text-red-600' : isWeekend ? 'text-amber-700' : !isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                    `}>
                                        {d.date()}
                                    </span>

                                    {/* Event dots */}
                                    {dotTypes.length > 0 && (
                                        <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                                            {dotTypes.map(type => {
                                                const color = EVENT_COLORS[type]?.dot || 'bg-slate-400';
                                                return <span key={type} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : color}`} />;
                                            })}
                                            {extraCount > 0 && (
                                                <span className={`text-[7px] font-bold ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>+{extraCount}</span>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Day Detail Panel ───
const DayDetailPanel = ({ date, events, onEdit, onDelete, onAdd, teamEvents, isManager }) => {
    if (!date) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-12">
                <CalendarIcon size={40} className="text-slate-300" />
                <p className="text-sm font-medium">Bir gün seçin</p>
            </div>
        );
    }

    const dateStr = moment(date).format('YYYY-MM-DD');
    const dayName = moment(date).locale('tr').format('dddd');
    const formattedDate = moment(date).locale('tr').format('D MMMM YYYY');

    // Filter events for this date
    const dayEvents = events.filter(evt => {
        const start = moment(evt.start).startOf('day');
        const end = moment(evt.end).startOf('day');
        const d = moment(date).startOf('day');
        return d.isSameOrAfter(start) && d.isSameOrBefore(end);
    });

    // Group by type
    const grouped = {};
    dayEvents.forEach(evt => {
        const type = evt.type || 'PERSONAL';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(evt);
    });

    // Team members with events on this date
    const teamForDay = (teamEvents || []).filter(te =>
        te.events?.some(ev => {
            const evDate = moment(ev.date || ev.start).format('YYYY-MM-DD');
            return evDate === dateStr;
        })
    );

    return (
        <div className="flex flex-col h-full">
            {/* Date header */}
            <div className="pb-3 mb-3 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">{formattedDate}</h3>
                <p className="text-xs font-medium text-slate-400 capitalize">{dayName}</p>
            </div>

            {/* Events list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {dayEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Clock size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-medium">Bu gün için etkinlik yok</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([type, evts]) => (
                        <div key={type}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {EVENT_COLORS[type]?.label || type}
                            </p>
                            <div className="space-y-1.5">
                                {evts.map(evt => {
                                    const colors = EVENT_COLORS[evt.type] || EVENT_COLORS.PERSONAL;
                                    const IconComp = EVENT_ICONS[evt.type] || CalendarIcon;
                                    const canModify = evt.type === 'PERSONAL' && evt.is_owner;
                                    const timeStr = evt.allDay
                                        ? 'Tüm Gün'
                                        : `${moment(evt.start).format('HH:mm')} - ${moment(evt.end).format('HH:mm')}`;

                                    return (
                                        <div key={evt.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${colors.border} ${colors.bg} group`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                                                <IconComp size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold ${colors.text} truncate`}>{evt.title}</p>
                                                <p className="text-[10px] text-slate-500 font-medium">{timeStr}</p>
                                                {evt.location && (
                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{evt.location}</p>
                                                )}
                                                {evt.employee_name && !evt.is_owner && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{evt.employee_name}</p>
                                                )}
                                            </div>
                                            {canModify && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEdit(evt); }}
                                                        className="p-1 rounded-md hover:bg-blue-100 text-blue-500 transition-colors"
                                                        title="Düzenle"
                                                    >
                                                        <Edit3 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDelete(evt); }}
                                                        className="p-1 rounded-md hover:bg-red-100 text-red-500 transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}

                {/* Team status for this day */}
                {isManager && teamForDay.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Ekip Durumu
                        </p>
                        <div className="space-y-1">
                            {teamForDay.map(member => {
                                const memberEvents = member.events?.filter(ev => moment(ev.date || ev.start).format('YYYY-MM-DD') === dateStr) || [];
                                return (
                                    <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                                            {member.name?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 flex-1 truncate">{member.name}</span>
                                        <div className="flex gap-1">
                                            {memberEvents.map((ev, i) => {
                                                const c = EVENT_COLORS[ev.type] || EVENT_COLORS.PERSONAL;
                                                return <span key={i} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Add button */}
            <div className="pt-3 mt-3 border-t border-slate-200 shrink-0">
                <button
                    onClick={onAdd}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-all active:scale-[0.98]"
                >
                    <Plus size={16} />
                    Yeni Etkinlik
                </button>
            </div>
        </div>
    );
};

// ─── Team Table ───
const TeamTable = ({ teamData, selectedDate }) => {
    if (!teamData || teamData.length === 0) {
        return (
            <div className="text-center py-6 text-slate-400">
                <Users size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">Ekip verisi bulunamadı</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personel</th>
                        <th className="text-center py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">İzin</th>
                        <th className="text-center py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ek Mesai</th>
                        <th className="text-center py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sağlık</th>
                        <th className="text-center py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kartsız</th>
                    </tr>
                </thead>
                <tbody>
                    {teamData.map(member => {
                        const memberEvents = member.events || [];
                        const hasLeave = memberEvents.some(e => e.type === 'LEAVE_REQUEST');
                        const hasOT = memberEvents.some(e => e.type === 'OVERTIME_ASSIGNMENT' || e.type === 'OVERTIME_REQUEST');
                        const hasHealth = memberEvents.some(e => e.type === 'HEALTH_REPORT');
                        const hasCardless = memberEvents.some(e => e.type === 'CARDLESS_ENTRY');

                        return (
                            <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                            {member.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{member.name}</p>
                                            {member.department && (
                                                <p className="text-[10px] text-slate-400 truncate">{member.department}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="text-center py-2.5 px-3">
                                    {hasLeave ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700">İzinli</span> : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="text-center py-2.5 px-3">
                                    {hasOT ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">Var</span> : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="text-center py-2.5 px-3">
                                    {hasHealth ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700">Rapor</span> : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="text-center py-2.5 px-3">
                                    {hasCardless ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">Var</span> : <span className="text-slate-300">—</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─── Main CalendarPage ───
const CalendarPage = () => {
    const { user } = useAuth();

    // Calendar state
    const [currentDate, setCurrentDate] = useState(getIstanbulTodayDate());
    const [selectedDate, setSelectedDate] = useState(getIstanbulTodayDate());
    const [events, setEvents] = useState([]);
    const [holidays, setHolidays] = useState(new Set());
    const [halfDayHolidays, setHalfDayHolidays] = useState(new Set());
    const [loading, setLoading] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedEventData, setSelectedEventData] = useState(null);

    // Filter toggles
    const [showOTAssignments, setShowOTAssignments] = useState(false);
    const [showOTRequests, setShowOTRequests] = useState(false);
    const [showLeaves, setShowLeaves] = useState(true);
    const [showHealthReports, setShowHealthReports] = useState(true);
    const [showCardless, setShowCardless] = useState(false);
    const [showTeamView, setShowTeamView] = useState(false);

    // Manager/team state
    const [managedEmployees, setManagedEmployees] = useState([]);
    const [teamData, setTeamData] = useState([]);
    const isManager = managedEmployees.length > 0;

    // Fetch managed employees
    useEffect(() => {
        api.get('/employees/subordinates/').then(res => {
            setManagedEmployees(Array.isArray(res.data) ? res.data : res.data?.results || []);
        }).catch(() => {});
    }, []);

    // Fetch calendar events
    const fetchCalendarData = useCallback(async () => {
        setLoading(true);
        try {
            const mDate = moment(currentDate);
            const start = mDate.clone().startOf('month').subtract(7, 'days').format('YYYY-MM-DD');
            const end = mDate.clone().endOf('month').add(7, 'days').format('YYYY-MM-DD');

            let url = `/calendar-events/?start=${start}&end=${end}`;
            if (showOTAssignments) url += '&include_ot_assignments=true';
            if (showOTRequests) url += '&include_ot_requests=true';
            if (showLeaves) url += '&include_leaves=true';
            if (showHealthReports) url += '&include_health_reports=true';
            if (showCardless) url += '&include_cardless=true';

            const response = await api.get(url);
            const rawEvents = response.data || [];
            const parsed = [];
            const newHolidays = new Set();
            const newHalfDays = new Set();

            rawEvents.forEach(evt => {
                const eventStart = new Date(evt.start);
                const eventEnd = new Date(evt.end);

                if (evt.type === 'HOLIDAY') {
                    const dateStr = moment(eventStart).format('YYYY-MM-DD');
                    newHolidays.add(dateStr);
                    if (evt.is_half_day) newHalfDays.add(dateStr);
                }

                parsed.push({ ...evt, start: eventStart, end: eventEnd });
            });

            setEvents(parsed);
            setHolidays(newHolidays);
            setHalfDayHolidays(newHalfDays);
        } catch (error) {
            console.error('Calendar fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [currentDate, showOTAssignments, showOTRequests, showLeaves, showHealthReports, showCardless]);

    useEffect(() => { fetchCalendarData(); }, [fetchCalendarData]);

    // Polling
    useInterval(() => {
        if (!loading && !showModal) fetchCalendarData();
    }, 60000);

    // Fetch team timeline (managers only)
    useEffect(() => {
        if (!showTeamView || !isManager) { setTeamData([]); return; }
        const start = moment(currentDate).startOf('month').format('YYYY-MM-DD');
        const end = moment(currentDate).endOf('month').format('YYYY-MM-DD');
        api.get(`/calendar-events/team-timeline/?start=${start}&end=${end}&include_leaves=true&include_overtime=true&include_health_reports=true&include_cardless=true`)
            .then(res => setTeamData(res.data?.employees || []))
            .catch(() => setTeamData([]));
    }, [showTeamView, isManager, currentDate]);

    // Navigation
    const goToPrevMonth = () => setCurrentDate(moment(currentDate).subtract(1, 'month').toDate());
    const goToNextMonth = () => setCurrentDate(moment(currentDate).add(1, 'month').toDate());
    const goToToday = () => { setCurrentDate(getIstanbulTodayDate()); setSelectedDate(getIstanbulTodayDate()); };
    const monthTitle = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(currentDate);

    // Event handlers
    const handleEdit = (evt) => {
        setSelectedEventData({
            id: evt.db_id,
            title: evt.title,
            start_time: evt.start,
            end_time: evt.end,
            is_all_day: evt.allDay,
            color: evt.color,
            description: evt.description,
            shared_with: evt.shared_with,
            shared_departments: evt.shared_departments,
            reminders: evt.reminders,
            is_owner: evt.is_owner,
            visibility: evt.visibility,
            event_type: evt.event_type,
            location: evt.location,
        });
        setShowModal(true);
    };

    const handleDelete = async (evt) => {
        if (!evt.db_id) return;
        if (!window.confirm(`"${evt.title}" etkinliğini silmek istediğinize emin misiniz?`)) return;
        try {
            await api.delete(`/personal-events/${evt.db_id}/`);
            toast.success('Etkinlik silindi.');
            fetchCalendarData();
        } catch {
            toast.error('Silme sırasında hata oluştu.');
        }
    };

    const handleAdd = () => {
        setSelectedEventData(null);
        setShowModal(true);
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        setSelectedEventData(null);
        fetchCalendarData();
    };

    // Filter toggle config
    const filters = [
        { key: 'showOTAssignments', value: showOTAssignments, set: setShowOTAssignments, icon: CalendarCheck, label: 'Mesai Görevleri', active: 'bg-violet-50 text-violet-700 border-violet-200' },
        { key: 'showOTRequests', value: showOTRequests, set: setShowOTRequests, icon: ClipboardList, label: 'Mesai Talepleri', active: 'bg-amber-50 text-amber-700 border-amber-200' },
        { key: 'showLeaves', value: showLeaves, set: setShowLeaves, icon: CalendarIcon, label: 'İzinler', active: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { key: 'showHealthReports', value: showHealthReports, set: setShowHealthReports, icon: Heart, label: 'Sağlık', active: 'bg-pink-50 text-pink-700 border-pink-200' },
        { key: 'showCardless', value: showCardless, set: setShowCardless, icon: CreditCard, label: 'Kartsız', active: 'bg-orange-50 text-orange-700 border-orange-200' },
    ];

    // Legend items (only show active filters)
    const legendItems = [
        { dot: 'bg-blue-500', label: 'Kişisel', always: true },
        { dot: 'bg-red-500', label: 'Tatil', always: true },
        ...(showOTAssignments ? [{ dot: 'bg-violet-500', label: 'Mesai Görevi' }] : []),
        ...(showOTRequests ? [{ dot: 'bg-amber-500', label: 'Mesai Talebi' }] : []),
        ...(showLeaves ? [{ dot: 'bg-cyan-500', label: 'İzin' }] : []),
        ...(showHealthReports ? [{ dot: 'bg-pink-500', label: 'Sağlık' }] : []),
        ...(showCardless ? [{ dot: 'bg-orange-500', label: 'Kartsız' }] : []),
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
            {/* ─── Header ─── */}
            <div className="mb-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Takvim</h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">Planlarınızı ve etkinliklerinizi yönetin</p>
                    </div>

                    {/* Month Navigation */}
                    <div className="flex items-center gap-2">
                        <button onClick={goToToday} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                            Bugün
                        </button>
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button onClick={goToPrevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="px-3 text-sm font-bold text-slate-800 capitalize min-w-[140px] text-center">{monthTitle}</span>
                            <button onClick={goToNextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter toggles */}
                <div className="flex items-center gap-2 flex-wrap">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => f.set(!f.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${f.value ? f.active : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                        >
                            <f.icon size={13} />
                            <span className="hidden sm:inline">{f.label}</span>
                        </button>
                    ))}

                    {isManager && (
                        <>
                            <div className="w-px h-5 bg-slate-200" />
                            <button
                                onClick={() => setShowTeamView(!showTeamView)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${showTeamView ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                            >
                                <UsersRound size={13} />
                                <span className="hidden sm:inline">Ekip</span>
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleAdd}
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-all active:scale-[0.98]"
                    >
                        <Plus size={15} />
                        <span className="hidden sm:inline">Etkinlik Ekle</span>
                    </button>
                </div>
            </div>

            {/* ─── 2-Column Body ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
                {/* Left: Month Grid */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 md:p-5 shadow-sm">
                    <MonthGrid
                        currentMonth={currentDate}
                        events={events}
                        holidays={holidays}
                        halfDayHolidays={halfDayHolidays}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                    />

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
                        {legendItems.map(item => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                                <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Day Detail Panel */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 md:p-5 shadow-sm min-h-[400px] lg:min-h-0">
                    <DayDetailPanel
                        date={selectedDate}
                        events={events}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAdd={handleAdd}
                        teamEvents={teamData}
                        isManager={isManager && showTeamView}
                    />
                </div>
            </div>

            {/* ─── Team Table (below, managers only) ─── */}
            {showTeamView && isManager && (
                <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                        <Users size={16} className="text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-700">Ekip Görünümü</h3>
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">{teamData.length} kişi</span>
                    </div>
                    <TeamTable teamData={teamData} selectedDate={selectedDate} />
                </div>
            )}

            {/* ─── Event Modal ─── */}
            {showModal && (
                <AgendaEventModal
                    onClose={() => { setShowModal(false); setSelectedEventData(null); }}
                    onSuccess={handleModalSuccess}
                    initialDate={selectedDate}
                    initialData={selectedEventData}
                />
            )}

            {/* Half-day holiday stripe CSS */}
            <style>{`
                .half-day-cell {
                    background: repeating-linear-gradient(
                        -45deg,
                        rgba(249, 115, 22, 0.1),
                        rgba(249, 115, 22, 0.1) 3px,
                        rgba(254, 226, 226, 0.2) 3px,
                        rgba(254, 226, 226, 0.2) 6px
                    );
                }
            `}</style>
        </div>
    );
};

export default CalendarPage;
