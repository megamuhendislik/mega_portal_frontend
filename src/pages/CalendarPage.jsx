import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { X, Clock, Calendar as CalendarIcon, User, Info } from 'lucide-react';

const localizer = momentLocalizer(moment);

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            // Fetch for a wider range (current month +/- 1 month)
            const s = moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
            const e = moment().add(1, 'month').endOf('month').format('YYYY-MM-DD');

            const response = await api.get(`/calendar/events/?start=${s}&end=${e}`);

            const formattedEvents = response.data.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end),
            }));

            setEvents(formattedEvents);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEvent = (event) => {
        // When clicking a specific event, show that day's details
        const dateEvents = events.filter(e =>
            moment(e.start).isSame(event.start, 'day')
        );
        setSelectedDate(event.start);
        setSelectedEvents(dateEvents);
        setShowModal(true);
    };

    const handleSelectSlot = (slotInfo) => {
        // When clicking a day cell
        const dateEvents = events.filter(e =>
            moment(e.start).isSame(slotInfo.start, 'day')
        );
        setSelectedDate(slotInfo.start);
        setSelectedEvents(dateEvents);
        setShowModal(true);
    };

    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: event.color,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '0.85rem',
                padding: '2px 5px'
            }
        };
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="h-screen p-6 bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CalendarIcon className="text-blue-600" />
                Takvim
            </h2>
            <div className="bg-white p-6 rounded-xl shadow-lg h-[calc(100%-4rem)]">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    selectable={true}
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
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

                        <div className="overflow-y-auto p-5 space-y-3">
                            {selectedEvents.length > 0 ? (
                                selectedEvents.map((evt, idx) => (
                                    <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                                            style={{ backgroundColor: evt.color }}
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-800 text-sm">
                                                {evt.title}
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                {evt.type !== 'OFF' && evt.type !== 'LEAVE' && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {moment(evt.start).format('HH:mm')} - {moment(evt.end).format('HH:mm')}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Info size={12} />
                                                    {evt.type === 'SHIFT' ? 'Mesai' :
                                                        evt.type === 'OFF' ? 'İzinli' :
                                                            evt.type === 'LEAVE' ? 'İzin Talebi' :
                                                                evt.type === 'ABSENT' ? 'Devamsız' :
                                                                    evt.type === 'HOLIDAY' ? 'Resmi Tatil' : 'Diğer'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <CalendarIcon size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Bu tarihte herhangi bir kayıt bulunmamaktadır.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-right">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors"
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
