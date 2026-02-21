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

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const TimeSelect = ({ value, onChange, disabled }) => {
    const [h, m] = (value || '00:00').split(':');
    const hour = h || '00';
    const minute = MINUTES.includes(m) ? m : MINUTES.reduce((prev, curr) =>
        Math.abs(parseInt(curr) - parseInt(m || '0')) < Math.abs(parseInt(prev) - parseInt(m || '0')) ? curr : prev
    );

    const handleHour = (e) => onChange(`${e.target.value}:${minute}`);
    const handleMinute = (e) => onChange(`${hour}:${e.target.value}`);

    return (
        <div className={`inline-flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg ${disabled ? 'opacity-40 pointer-events-none' : 'hover:border-blue-300'} transition-colors`}>
            <select value={hour} onChange={handleHour} disabled={disabled}
                className="px-1.5 py-1 text-xs font-mono font-semibold text-slate-700 bg-transparent outline-none cursor-pointer appearance-none text-center">
                {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
            </select>
            <span className="text-slate-400 font-bold text-xs">:</span>
            <select value={minute} onChange={handleMinute} disabled={disabled}
                className="px-1.5 py-1 text-xs font-mono font-semibold text-slate-700 bg-transparent outline-none cursor-pointer appearance-none text-center">
                {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
            </select>
        </div>
    );
};

const WeeklyScheduleEditor = ({ value, onChange }) => {
    const [schedule, setSchedule] = useState(value || {});

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
    }, []);

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
                                <TimeSelect
                                    value={dayData.start}
                                    disabled={isOff}
                                    onChange={(v) => handleChange(day.key, 'start', v)}
                                />
                            </div>

                            <div className="col-span-2">
                                <TimeSelect
                                    value={dayData.end}
                                    disabled={isOff}
                                    onChange={(v) => handleChange(day.key, 'end', v)}
                                />
                            </div>

                            <div className="col-span-2">
                                <TimeSelect
                                    value={dayData.lunch_start || '12:30'}
                                    disabled={isOff}
                                    onChange={(v) => handleChange(day.key, 'lunch_start', v)}
                                />
                            </div>

                            <div className="col-span-2">
                                <TimeSelect
                                    value={dayData.lunch_end || '13:30'}
                                    disabled={isOff}
                                    onChange={(v) => handleChange(day.key, 'lunch_end', v)}
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
