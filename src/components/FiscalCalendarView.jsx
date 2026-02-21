import React, { useState, useEffect } from 'react';
import api from '../services/api';
import moment from 'moment';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import DailyConfigModal from './DailyConfigModal';

const FiscalCalendarView = ({ calendarId }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [holidays, setHolidays] = useState(new Set());
    const [overrides, setOverrides] = useState({}); // Map: 'YYYY-MM-DD' -> OverrideObj
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetchData();
    }, [year, calendarId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const startStr = `${year}-01-01`;
            const endStr = `${year}-12-31`;

            const calParam = calendarId ? `&calendar=${calendarId}` : '';

            const [holRes, ovRes] = await Promise.all([
                api.get(`/calendar-events/?start=${startStr}&end=${endStr}&view_mode=all`),
                api.get(`/attendance/daily-overrides/?start_date=${startStr}&end_date=${endStr}${calParam}`)
            ]);

            // Holidays
            const hSet = new Set();
            holRes.data.filter(e => e.status === 'HOLIDAY').forEach(e => {
                hSet.add(moment(e.start).format('YYYY-MM-DD'));
            });
            setHolidays(hSet);

            // Overrides
            const ovMap = {};
            ovRes.data.forEach(o => {
                ovMap[o.date] = o;
            });
            setOverrides(ovMap);

        } catch (error) {
            console.error("Calendar data error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Generate 12 standard months for the year
    const getMonths = () => {
        return Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            name: moment().month(i).format('MMMM'),
            start: moment([year, i, 1]),
            end: moment([year, i, 1]).endOf('month')
        }));
    };

    const getDaysArray = (start, end) => {
        const arr = [];
        const dt = start.clone();
        while (dt <= end) {
            arr.push(dt.clone());
            dt.add(1, 'd');
        }
        return arr;
    };

    const handleDayClick = (dateStr) => {
        const d = moment(dateStr).toDate();
        setSelectedDate(d);
        setShowConfigModal(true);
    };

    const renderMonth = (monthData) => {
        const days = getDaysArray(monthData.start, monthData.end);
        // Calculate leading empty cells (Monday=0 ... Sunday=6)
        const firstDayOfWeek = monthData.start.isoWeekday(); // 1=Mon, 7=Sun
        const emptySlots = firstDayOfWeek - 1;

        return (
            <div key={monthData.month} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 text-sm">{monthData.name} {year}</h3>
                </div>

                <div className="p-3 grid grid-cols-7 gap-1 flex-1 content-start">
                    {/* Weekday Headers */}
                    {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                        <div key={d} className="text-center text-[10px] text-slate-400 font-bold mb-1">{d}</div>
                    ))}

                    {/* Empty slots before first day */}
                    {Array.from({ length: emptySlots }, (_, i) => (
                        <div key={`empty-${i}`} className="h-9" />
                    ))}

                    {/* Days */}
                    {days.map(day => {
                        const dStr = day.format('YYYY-MM-DD');
                        const isPublicHoliday = holidays.has(dStr);
                        const override = overrides[dStr];
                        const isWeekend = day.day() === 0 || day.day() === 6;

                        // Determine Visual State
                        let bgClass = "bg-white hover:bg-slate-50 text-slate-700";
                        let borderClass = "border-transparent";

                        if (override) {
                            if (override.is_off) {
                                bgClass = "bg-red-50 text-red-600 font-bold";
                                borderClass = "border-red-200";
                            } else {
                                bgClass = "bg-emerald-50 text-emerald-700 font-bold";
                                borderClass = "border-emerald-200";
                            }
                        } else if (isPublicHoliday) {
                            bgClass = "bg-red-50 text-red-600 font-bold";
                            borderClass = "border-red-100";
                        } else if (isWeekend) {
                            bgClass = "bg-slate-100/50 text-slate-400";
                        }

                        // Tooltip
                        let tooltipText = dStr;
                        if (override && !override.is_off) {
                            tooltipText = `${dStr}\nMesai: ${override.start_time?.slice(0,5) || '?'} - ${override.end_time?.slice(0,5) || '?'}`;
                            if (override.lunch_start && override.lunch_end) {
                                tooltipText += `\nÖğle: ${override.lunch_start.slice(0,5)} - ${override.lunch_end.slice(0,5)}`;
                            }
                            if (override.description) tooltipText += `\n${override.description}`;
                        } else if (override?.is_off) {
                            tooltipText = `${dStr}\nTATİL${override.description ? ': ' + override.description : ''}`;
                        } else if (isPublicHoliday) {
                            tooltipText = `${dStr}\nResmi Tatil`;
                        }

                        return (
                            <div
                                key={dStr}
                                onClick={() => handleDayClick(dStr)}
                                className={`
                                    ${bgClass} border ${borderClass}
                                    rounded-lg p-1 text-center text-xs cursor-pointer transition-all
                                    flex flex-col items-center justify-center h-9 relative
                                    group
                                `}
                                title={tooltipText}
                            >
                                <span>{day.date()}</span>
                                {override && !override.is_off && (
                                    <Clock size={7} className="absolute bottom-0.5 right-0.5 text-emerald-600" />
                                )}
                                {(override?.is_off || isPublicHoliday) && (
                                    <span className="w-1 h-1 bg-red-400 rounded-full absolute bottom-0.5"></span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const months = getMonths();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setYear(year - 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="px-3 font-bold text-lg text-slate-800">{year}</span>
                    <button onClick={() => setYear(year + 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-200 inline-flex items-center justify-center"><Clock size={5} className="text-emerald-600" /></span>
                        Özel Mesai
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200"></span>
                        Tatil
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200"></span>
                        Hafta Sonu
                    </div>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Yükleniyor...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {months.map(renderMonth)}
                </div>
            )}

            {/* Config Modal */}
            {showConfigModal && selectedDate && (
                <DailyConfigModal
                    date={selectedDate}
                    calendarId={calendarId}
                    initialOverride={overrides[moment(selectedDate).format('YYYY-MM-DD')]}
                    isHoliday={holidays.has(moment(selectedDate).format('YYYY-MM-DD'))}
                    onClose={() => setShowConfigModal(false)}
                    onSuccess={() => {
                        setShowConfigModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default FiscalCalendarView;
