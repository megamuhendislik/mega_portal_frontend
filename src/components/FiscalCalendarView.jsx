import React, { useState, useEffect } from 'react';
import api from '../services/api';
import moment from 'moment';
import { ChevronLeft, ChevronRight, Lock, Unlock, RefreshCw, Save, Calendar as CalendarIcon, Clock, Coffee } from 'lucide-react';
import DailyConfigModal from './DailyConfigModal';

const FiscalCalendarView = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [periods, setPeriods] = useState([]);
    const [holidays, setHolidays] = useState(new Set());
    const [overrides, setOverrides] = useState({}); // Map: 'YYYY-MM-DD' -> OverrideObj
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Modal State
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetchData();
    }, [year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Need range for fiscal year roughly
            const startStr = `${year - 1}-12-01`;
            const endStr = `${year + 1}-02-01`;

            const [pRes, holRes, ovRes] = await Promise.all([
                api.get(`/attendance/fiscal-periods/?year=${year}`),
                api.get(`/calendar-events/?start=${startStr}&end=${endStr}&view_mode=all`),
                api.get(`/attendance/daily-overrides/?start_date=${startStr}&end_date=${endStr}`)
            ]);

            setPeriods(pRes.data);

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
            console.error("Fiscal data error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!window.confirm(`${year} yılı için mali takvim (26-25 sistemi) oluşturulacak. Onaylıyor musunuz?`)) return;

        setGenerating(true);
        try {
            await api.post('/attendance/fiscal-periods/generate_defaults/', { year });
            await fetchData();
            alert('Mali takvim başarıyla oluşturuldu.');
        } catch (error) {
            alert('Oluşturma hatası: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    const getDaysArray = (start, end) => {
        const arr = [];
        const dt = moment(start);
        const e = moment(end);
        while (dt <= e) {
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

    const renderMonth = (period) => {
        const days = getDaysArray(period.start_date, period.end_date);

        return (
            <div key={period.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dönem {period.month}</span>
                        <h3 className="font-bold text-slate-800">{moment().month(period.month - 1).format('MMMM')}</h3>
                    </div>
                    {period.is_locked ? <Lock size={16} className="text-red-400" /> : <Unlock size={16} className="text-emerald-400" />}
                </div>

                <div className="p-4 grid grid-cols-7 gap-1 flex-1 content-start">
                    {/* Weekday Headers */}
                    {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                        <div key={d} className="text-center text-[10px] text-slate-400 font-bold mb-2">{d}</div>
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
                                    flex flex-col items-center justify-center h-10 relative
                                    group
                                `}
                                title={tooltipText}
                            >
                                <span>{day.date()}</span>
                                {override && !override.is_off && (
                                    <Clock size={8} className="absolute bottom-1 right-1 text-emerald-600" />
                                )}
                                {(override?.is_off || isPublicHoliday) && (
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full absolute bottom-1"></span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="p-2 border-t border-slate-50 text-center">
                    <span className="text-[10px] text-slate-400">
                        {moment(period.start_date).format('DD MMM')} - {moment(period.end_date).format('DD MMM')}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-4 font-bold text-xl text-slate-800">{year} Mali Takvimi</span>
                        <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                        {generating ? <RefreshCw className="animate-spin" size={18} /> : <CalendarIcon size={18} />}
                        {generating ? 'Oluşturuluyor...' : 'Varsayılanları Oluştur (26-25)'}
                    </button>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">Yükleniyor...</div>
            ) : periods.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <CalendarIcon size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">Bu yıl için mali kayıt yok.</h3>
                    <p className="text-slate-500">Varsayılanları oluşturarak başlayabilirsiniz.</p>
                    <button
                        onClick={handleGenerate}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700"
                    >
                        Şimdi Oluştur
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {periods.map(renderMonth)}
                </div>
            )}

            {/* Config Modal */}
            {showConfigModal && selectedDate && (
                <DailyConfigModal
                    date={selectedDate}
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
