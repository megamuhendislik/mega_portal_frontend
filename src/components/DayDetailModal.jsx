import React from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, User, Users, Bell, Globe, Check, Lock } from 'lucide-react';
import moment from 'moment';

const DayDetailModal = ({ date, events, onClose, onAddEvent, onEditEvent }) => {
    if (!date) return null;

    const dateStr = moment(date).format('YYYY-MM-DD');
    const dayEvents = events.filter(e => moment(e.start).format('YYYY-MM-DD') === dateStr);

    // Sort events: All Day first, then by time
    dayEvents.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.start) - new Date(b.start);
    });

    const getIcon = (type) => {
        switch (type) {
            case 'HOLIDAY': return <Globe size={16} className="text-red-500" />;
            case 'ATTENDANCE': return <Clock size={16} className="text-slate-500" />;
            default: return <AlignLeft size={16} className="text-indigo-500" />;
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <span className="text-indigo-600">{moment(date).format('D')}</span>
                            {moment(date).format('MMMM YYYY')}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">{moment(date).format('dddd')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Event List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {dayEvents.length === 0 ? (
                        <div className="text-center py-10 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <CalendarIcon size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium">Bu güne ait not veya etkinlik yok.</p>
                        </div>
                    ) : (
                        dayEvents.map((evt, idx) => (
                            <div
                                key={idx}
                                onClick={() => onEditEvent(evt)}
                                className={`group p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer relative overflow-hidden ${evt.status === 'HOLIDAY' ? 'bg-red-50/30' : 'bg-white'}`}
                            >
                                {/* Left Color Strip */}
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: evt.color || '#cbd5e1' }}></div>

                                <div className="pl-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm ${evt.status === 'HOLIDAY' ? 'text-red-600' : 'text-slate-700'}`}>
                                            {evt.title}
                                        </h4>
                                        {evt.is_shared && <Globe size={12} className="text-emerald-500 shrink-0 mt-1" />}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            {evt.allDay ? (
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Tüm Gün</span>
                                            ) : (
                                                <>
                                                    <Clock size={12} />
                                                    {moment(evt.start).format('HH:mm')} - {moment(evt.end).format('HH:mm')}
                                                </>
                                            )}
                                        </span>
                                        {evt.type && evt.type !== 'DEFAULT' && (
                                            <span className="opacity-75 uppercase tracking-wider text-[10px]">{evt.type}</span>
                                        )}
                                    </div>

                                    {evt.description && (
                                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{evt.description}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-white sticky bottom-0">
                    <button
                        onClick={onAddEvent}
                        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus size={20} />
                        Yeni Ekle
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default DayDetailModal;
