import React, { useState, useEffect } from 'react';

const DAYS = [
    { key: 'Monday', label: 'Pazartesi' },
    { key: 'Tuesday', label: 'Salı' },
    { key: 'Wednesday', label: 'Çarşamba' },
    { key: 'Thursday', label: 'Perşembe' },
    { key: 'Friday', label: 'Cuma' },
    { key: 'Saturday', label: 'Cumartesi' },
    { key: 'Sunday', label: 'Pazar' },
];

const WeeklyScheduleSelector = ({ value, onChange }) => {
    const [schedule, setSchedule] = useState({});

    useEffect(() => {
        // Initialize schedule if empty or merge with defaults
        const initialSchedule = {};
        DAYS.forEach(day => {
            if (value && value[day.key]) {
                initialSchedule[day.key] = value[day.key];
            } else {
                initialSchedule[day.key] = {
                    start: '08:00',
                    end: '18:00',
                    is_off: day.key === 'Saturday' || day.key === 'Sunday'
                };
            }
        });
        setSchedule(initialSchedule);
    }, [value]);

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

    const copyToAll = (sourceDayKey) => {
        const sourceData = schedule[sourceDayKey];
        const newSchedule = {};
        DAYS.forEach(day => {
            newSchedule[day.key] = { ...sourceData };
        });
        setSchedule(newSchedule);
        onChange(newSchedule);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Haftalık Çalışma Programı</h3>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="grid grid-cols-1 gap-4">
                    {DAYS.map((day) => (
                        <div key={day.key} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <div className="w-32 font-medium text-white">{day.label}</div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!schedule[day.key]?.is_off}
                                    onChange={(e) => handleChange(day.key, 'is_off', !e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                />
                                <span className="text-sm text-gray-300">Çalışma Günü</span>
                            </label>

                            {!schedule[day.key]?.is_off && (
                                <>
                                    <input
                                        type="time"
                                        value={schedule[day.key]?.start || '08:00'}
                                        onChange={(e) => handleChange(day.key, 'start', e.target.value)}
                                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="time"
                                        value={schedule[day.key]?.end || '18:00'}
                                        onChange={(e) => handleChange(day.key, 'end', e.target.value)}
                                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => copyToAll(day.key)}
                                        className="ml-auto text-xs text-blue-400 hover:text-blue-300 underline"
                                        title="Bu saatleri tüm haftaya kopyala"
                                    >
                                        Tümüne Kopyala
                                    </button>
                                </>
                            )}

                            {schedule[day.key]?.is_off && (
                                <span className="text-sm text-gray-500 italic ml-4">Tatil</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeeklyScheduleSelector;
