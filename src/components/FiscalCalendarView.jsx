import React, { useState, useEffect } from 'react';
import api from '../services/api';
import moment from 'moment';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import DailyConfigModal from './DailyConfigModal';

const FiscalCalendarView = ({ calendarId }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [holidays, setHolidays] = useState(new Set());
    const [overrides, setOverrides] = useState({});
    const [loading, setLoading] = useState(false);

    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null); // null = new mode

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

            const hSet = new Set();
            holRes.data.filter(e => e.status === 'HOLIDAY').forEach(e => {
                hSet.add(moment(e.start).format('YYYY-MM-DD'));
            });
            setHolidays(hSet);

            const ovMap = {};
            ovRes.data.forEach(o => { ovMap[o.date] = o; });
            setOverrides(ovMap);
        } catch (error) {
            console.error("Calendar data error:", error);
        } finally {
            setLoading(false);
        }
    };

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
        while (dt <= end) { arr.push(dt.clone()); dt.add(1, 'd'); }
        return arr;
    };

    const handleDayClick = (dateStr) => {
        setSelectedDate(moment(dateStr).toDate());
        setShowConfigModal(true);
    };

    const handleNewClick = () => {
        setSelectedDate(null); // null = tarih secici modda ac
        setShowConfigModal(true);
    };

    const handleDeleteOverride = async (override) => {
        if (!window.confirm(`${moment(override.date).format('DD MMMM YYYY')} tarihindeki ozel ayar silinecek. Emin misiniz?`)) return;
        try {
            await api.delete(`/attendance/daily-overrides/${override.id}/`);
            await fetchData();
        } catch (error) {
            alert('Silme hatasi: ' + (error.response?.data?.detail || error.message));
        }
    };

    // Override list sorted by date
    const overrideList = Object.values(overrides).sort((a, b) => a.date.localeCompare(b.date));

    const renderMonth = (monthData) => {
        const days = getDaysArray(monthData.start, monthData.end);
        const firstDayOfWeek = monthData.start.isoWeekday();
        const emptySlots = firstDayOfWeek - 1;

        return (
            <div key={monthData.month} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 text-sm">{monthData.name} {year}</h3>
                </div>

                <div className="p-3 grid grid-cols-7 gap-1 flex-1 content-start">
                    {['Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                        <div key={d} className="text-center text-[10px] text-slate-400 font-bold mb-1">{d}</div>
                    ))}

                    {Array.from({ length: emptySlots }, (_, i) => (
                        <div key={`empty-${i}`} className="h-9" />
                    ))}

                    {days.map(day => {
                        const dStr = day.format('YYYY-MM-DD');
                        const isPublicHoliday = holidays.has(dStr);
                        const override = overrides[dStr];
                        const isWeekend = day.day() === 0 || day.day() === 6;

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

                        let tooltipText = dStr;
                        if (override && !override.is_off) {
                            tooltipText = `${dStr}\nMesai: ${override.start_time?.slice(0,5) || '?'} - ${override.end_time?.slice(0,5) || '?'}`;
                            if (override.lunch_start && override.lunch_end) {
                                tooltipText += `\nOgle: ${override.lunch_start.slice(0,5)} - ${override.lunch_end.slice(0,5)}`;
                            }
                            if (override.description) tooltipText += `\n${override.description}`;
                        } else if (override?.is_off) {
                            tooltipText = `${dStr}\nTATIL${override.description ? ': ' + override.description : ''}`;
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
                                    flex flex-col items-center justify-center h-9 relative group
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
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setYear(year - 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="px-3 font-bold text-lg text-slate-800">{year}</span>
                        <button onClick={() => setYear(year + 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <button
                        onClick={handleNewClick}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Yeni Ekle
                    </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-200 inline-flex items-center justify-center"><Clock size={5} className="text-emerald-600" /></span>
                        Ozel Mesai
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

            {/* Calendar Grid */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Yukleniyor...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {months.map(renderMonth)}
                </div>
            )}

            {/* Override List Table */}
            <div className="mt-6">
                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-indigo-600" />
                    Tanimli Ozel Gunler
                    {overrideList.length > 0 && (
                        <span className="text-xs font-normal text-slate-400">({overrideList.length} kayit)</span>
                    )}
                </h4>

                {overrideList.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                        <p className="text-sm text-slate-500">Henuz ozel gun tanimlanmamis.</p>
                        <p className="text-xs text-slate-400 mt-1">Takvimden bir gune tiklayarak veya "Yeni Ekle" butonu ile baslayabilirsiniz.</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Tarih</th>
                                    <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Durum</th>
                                    <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Saatler</th>
                                    <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Aciklama</th>
                                    <th className="text-right px-4 py-2.5 font-bold text-slate-600 text-xs">Islemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overrideList.map(ov => (
                                    <tr key={ov.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2.5 font-medium text-slate-800">
                                            {moment(ov.date).format('DD MMM YYYY, ddd')}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {ov.is_off ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                                                    Tatil
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <Clock size={10} />
                                                    Ozel Mesai
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600">
                                            {ov.is_off ? (
                                                <span className="text-slate-400">-</span>
                                            ) : (
                                                <span>
                                                    {ov.start_time?.slice(0,5) || '?'} - {ov.end_time?.slice(0,5) || '?'}
                                                    {ov.lunch_start && ov.lunch_end && (
                                                        <span className="text-slate-400 ml-2 text-xs">
                                                            (Ogle: {ov.lunch_start.slice(0,5)}-{ov.lunch_end.slice(0,5)})
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[200px] truncate">
                                            {ov.description || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleDayClick(ov.date)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Duzenle"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOverride(ov)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Config Modal */}
            {showConfigModal && (
                <DailyConfigModal
                    date={selectedDate}
                    calendarId={calendarId}
                    initialOverride={selectedDate ? overrides[moment(selectedDate).format('YYYY-MM-DD')] : null}
                    isHoliday={selectedDate ? holidays.has(moment(selectedDate).format('YYYY-MM-DD')) : false}
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
