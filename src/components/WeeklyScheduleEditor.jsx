import React, { useEffect, useState } from 'react';
import { Clock, Check, X, Copy } from 'lucide-react';

const DAYS = [
    { key: 'MON', label: 'Pazartesi' },
    { key: 'TUE', label: 'Salı' },
    { key: 'WED', label: 'Çarşamba' },
    { key: 'THU', label: 'Perşembe' },
    { key: 'FRI', label: 'Cuma' },
    { key: 'SAT', label: 'Cumartesi' },
    { key: 'SUN', label: 'Pazar' },
];

const DEFAULT_DAY_SCHEDULE = {
    start: '09:00',
    end: '18:00',
    is_off: false
};

const WeeklyScheduleEditor = ({ value, onChange }) => {
    const [schedule, setSchedule] = useState(value || {});

    // Initialize with defaults if empty
    useEffect(() => {
        if (!value || Object.keys(value).length === 0) {
            const initial = {};
            DAYS.forEach(day => {
                initial[day.key] = { ...DEFAULT_DAY_SCHEDULE };
                if (day.key === 'SAT' || day.key === 'SUN') {
                    initial[day.key].is_off = true;
                }
            });
            setSchedule(initial);
            onChange(initial);
        } else {
            setSchedule(value);
        }
    }, []); // Run once on mount if empty, or when value changes externally? 
    // Better to sync with value prop if it changes significantly, but avoid loops.
    // For now, let's trust the parent passes the initial state correctly.

    const handleChange = (dayKey, field, val) => {
        const newSchedule = {
            ...schedule,
            [dayKey]: {
                ...schedule[dayKey],
                [field]: val
            }
        };
        setSchedule(newSchedule);
        onChange(newSchedule);
    };

    const handleToggleOff = (dayKey) => {
        const current = schedule[dayKey] || DEFAULT_DAY_SCHEDULE;
        handleChange(dayKey, 'is_off', !current.is_off);
    };

    const handleCopyToAll = (sourceDayKey) => {
        if (!window.confirm('Bu günün saatlerini diğer tüm günlere kopyalamak istiyor musunuz? (Hafta sonları hariç)')) return;

        const source = schedule[sourceDayKey];
        const newSchedule = { ...schedule };

        DAYS.forEach(day => {
            if (day.key !== 'SAT' && day.key !== 'SUN') {
                newSchedule[day.key] = { ...source };
            }
        });

        setSchedule(newSchedule);
        onChange(newSchedule);
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Gün</div>
                <div className="col-span-2">Başlangıç</div>
                <div className="col-span-2">Bitiş</div>
                <div className="col-span-2 text-center text-blue-600">Öğle Baş.</div>
                <div className="col-span-2 text-center text-blue-600">Öğle Bit.</div>
                <div className="col-span-2 text-center">Durum</div>
            </div>

            <div className="divide-y divide-slate-100">
                {DAYS.map(day => {
                    const dayData = schedule[day.key] || DEFAULT_DAY_SCHEDULE;
                    const isOff = dayData.is_off;

                    return (
                        <div key={day.key} className={`grid grid-cols-12 gap-2 p-3 items-center transition-colors ${isOff ? 'bg-slate-50/50' : 'hover:bg-white'}`}>
                            <div className="col-span-2 font-medium text-slate-700 flex items-center gap-1 text-xs sm:text-sm truncate">
                                {day.label}
                            </div>

                            <div className="col-span-2">
                                <input
                                    type="time"
                                    value={dayData.start}
                                    disabled={isOff}
                                    onChange={(e) => handleChange(day.key, 'start', e.target.value)}
                                    className={`w-full p-1.5 text-xs sm:text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isOff ? 'bg-slate-100 text-slate-400' : 'bg-white border-slate-200'}`}
                                />
                            </div>

                            <div className="col-span-2">
                                <input
                                    type="time"
                                    value={dayData.end}
                                    disabled={isOff}
                                    onChange={(e) => handleChange(day.key, 'end', e.target.value)}
                                    className={`w-full p-1.5 text-xs sm:text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isOff ? 'bg-slate-100 text-slate-400' : 'bg-white border-slate-200'}`}
                                />
                            </div>

                            <div className="col-span-2">
                                <input
                                    type="time"
                                    value={dayData.lunch_start || ''}
                                    disabled={isOff}
                                    placeholder="12:30"
                                    onChange={(e) => handleChange(day.key, 'lunch_start', e.target.value)}
                                    className={`w-full p-1.5 text-xs sm:text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center ${isOff ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 border-slate-200 text-blue-700'}`}
                                />
                            </div>

                            <div className="col-span-2">
                                <input
                                    type="time"
                                    value={dayData.lunch_end || ''}
                                    disabled={isOff}
                                    placeholder="13:30"
                                    onChange={(e) => handleChange(day.key, 'lunch_end', e.target.value)}
                                    className={`w-full p-1.5 text-xs sm:text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center ${isOff ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 border-slate-200 text-blue-700'}`}
                                />
                            </div>

                            <div className="col-span-2 flex justify-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleToggleOff(day.key)}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center w-full ${isOff
                                        ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        }`}
                                >
                                    {isOff ? 'Tatil' : 'Çalışma'}
                                </button>
                                {!isOff && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopyToAll(day.key)}
                                        title="Bu dizilimi tüm günlere kopyala"
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors hidden sm:block"
                                    >
                                        <Copy size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeeklyScheduleEditor;
