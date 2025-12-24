import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import clsx from 'clsx';

const UpcomingEventsCard = ({ events, loading }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const upcomingEvents = events && events.length > 0 ? events.slice(0, 5) : [];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
                    Yaklaşan Etkinlikler
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    Gelecek 7 Gün
                </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Yaklaşan etkinlik bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {upcomingEvents.map((evt, idx) => {
                            const startDate = new Date(evt.start);
                            const isToday = isSameDay(startDate, new Date());

                            return (
                                <div key={idx} className="group flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-default">
                                    {/* Date Box */}
                                    <div className={clsx(
                                        "w-12 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 border",
                                        isToday
                                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                                            : "bg-white border-slate-200 text-slate-600"
                                    )}>
                                        <span className="text-xs font-semibold uppercase">{format(startDate, 'MMM', { locale: tr })}</span>
                                        <span className={clsx("text-lg font-bold leading-none", isToday ? "text-white" : "text-slate-800")}>
                                            {format(startDate, 'd')}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                            {evt.title}
                                        </h4>

                                        <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex items-center text-xs text-slate-500">
                                                <Clock size={12} className="mr-1.5 shrink-0" />
                                                <span className="truncate">
                                                    {evt.allDay ? 'Tüm Gün' : `${format(startDate, 'HH:mm')} - ${format(new Date(evt.end), 'HH:mm')}`}
                                                </span>
                                            </div>

                                            {evt.location && (
                                                <div className="flex items-center text-xs text-slate-400">
                                                    <MapPin size={12} className="mr-1.5 shrink-0" />
                                                    <span className="truncate">{evt.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Type Indicator */}
                                    <div className={clsx(
                                        "w-1.5 h-1.5 rounded-full mt-2 mr-1",
                                        evt.type === 'MEETING' ? "bg-amber-400" :
                                            evt.type === 'DEADLINE' ? "bg-red-400" :
                                                evt.type === 'HOLIDAY' ? "bg-purple-400" :
                                                    "bg-emerald-400"
                                    )} title={evt.type} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <a href="/calendar" className="mt-4 pt-4 border-t border-slate-100 text-center text-xs font-bold text-blue-600 hover:text-blue-700 block uppercase tracking-wide">
                Takvime Git
            </a>
        </div>
    );
};

export default UpcomingEventsCard;
