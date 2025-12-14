import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../services/api';
import { X, Clock, Calendar as CalendarIcon, User, Info, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

const localizer = momentLocalizer(moment);

const CalendarPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);

    // Summary State
    const [summaryStats, setSummaryStats] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetchEvents();
        fetchSummary();
    }, [currentDate]);

    const fetchEvents = async () => {
        try {
            // Fetch for current month view
            const s = moment(currentDate).startOf('month').subtract(1, 'week').format('YYYY-MM-DD');
            const e = moment(currentDate).endOf('month').add(1, 'week').format('YYYY-MM-DD');

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

    const fetchSummary = async () => {
        try {
            const year = moment(currentDate).year();
            const month = moment(currentDate).month() + 1;
            const response = await api.get(`/attendance/stats/summary/?year=${year}&month=${month}`);

            // Assuming response is a list, get the first item (current user)
            // Or if we want team summary, we might need to aggregate
            // For now, let's show the first record which should be the user if not admin viewing all
            if (response.data && response.data.length > 0) {
                // If multiple, maybe sum them up? Or just show "Team Summary"
                // Let's assume for now we show the user's own stats or the first one
                // Better: Aggregate if multiple
                const total = response.data.reduce((acc, curr) => ({
                    total_worked: acc.total_worked + curr.total_worked,
                    total_overtime: acc.total_overtime + curr.total_overtime,
                    total_missing: acc.total_missing + curr.total_missing,
                    total_late: acc.total_late + curr.total_late
                }), { total_worked: 0, total_overtime: 0, total_missing: 0, total_late: 0 });

                setSummaryStats(total);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
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

    const handleNavigate = (date) => {
        setCurrentDate(date);
    };

    const eventStyleGetter = (event) => {
        let style = {
            backgroundColor: event.color,
            borderRadius: '6px',
            opacity: 0.9,
            color: 'white',
            border: '0px',
            display: 'block',
            fontSize: '0.85rem',
            padding: '2px 5px'
        };

        if (event.type === 'OVERTIME') {
            style.backgroundColor = '#f59e0b'; // Amber
            style.border = '1px solid #d97706';
        }

        return { style };
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="h-screen p-6 bg-slate-50 flex gap-6">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <CalendarIcon className="text-blue-600" />
                    Takvim
                </h2>
                <div className="bg-white p-6 rounded-xl shadow-lg flex-1 min-h-0">
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
            </div>

            {/* Right Sidebar - Monthly Summary */}
            <div className="w-80 shrink-0 flex flex-col gap-6 pt-14">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-600" />
                        Aylık Özet
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                        {moment(currentDate).format('MMMM YYYY')} verileri
                    </p>

                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="text-sm text-emerald-600 font-medium mb-1">Toplam Çalışma</div>
                            <div className="text-2xl font-bold text-emerald-800">
                                {summaryStats ? Math.round(summaryStats.total_worked / 60) : 0} <span className="text-sm font-normal">saat</span>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="text-sm text-amber-600 font-medium mb-1">Toplam Fazla Mesai</div>
                            <div className="text-2xl font-bold text-amber-800">
                                {summaryStats ? Math.round(summaryStats.total_overtime / 60) : 0} <span className="text-sm font-normal">saat</span>
                            </div>
                        </div>

                        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                            <div className="text-sm text-red-600 font-medium mb-1">Eksik Çalışma</div>
                            <div className="text-2xl font-bold text-red-800">
                                {summaryStats ? Math.round(summaryStats.total_missing / 60) : 0} <span className="text-sm font-normal">saat</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-sm text-slate-600 font-medium mb-1">Geç Kalma</div>
                            <div className="text-2xl font-bold text-slate-800">
                                {summaryStats ? summaryStats.total_late : 0} <span className="text-sm font-normal">dk</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <h4 className="font-bold text-lg mb-2">İpucu</h4>
                    <p className="text-blue-100 text-sm leading-relaxed">
                        Takvim üzerindeki günlere tıklayarak detaylı vardiya ve mola bilgilerini görüntüleyebilirsiniz.
                    </p>
                </div>
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
                                                {evt.type !== 'OFF' && evt.type !== 'LEAVE' && evt.type !== 'HOLIDAY' && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {moment(evt.start).format('HH:mm')} - {moment(evt.end).format('HH:mm')}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Info size={12} />
                                                    {evt.type === 'SHIFT' ? 'Mesai' :
                                                        evt.type === 'OVERTIME' ? 'Fazla Mesai' :
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
