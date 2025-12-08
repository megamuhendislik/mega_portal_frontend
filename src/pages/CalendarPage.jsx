import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';

const localizer = momentLocalizer(moment);

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const start = moment().startOf('month').format('YYYY-MM-DD');
            const end = moment().endOf('month').format('YYYY-MM-DD');
            
            // Fetch for a wider range to be safe, or handle onNavigate
            // For simplicity, let's fetch current month +/- 1 month
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

    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: event.color,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="h-screen p-6 bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Takvim</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg h-[calc(100%-4rem)]">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={eventStyleGetter}
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
                />
            </div>
        </div>
    );
};

export default CalendarPage;
