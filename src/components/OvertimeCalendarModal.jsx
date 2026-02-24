import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    X, ChevronLeft, ChevronRight, CalendarPlus,
    Minus, Plus, Save, Clock, Loader2
} from 'lucide-react';
import api from '../services/api';

const MONTHS_TR = [
    'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
    'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'
];

const MONTHS_TR_DISPLAY = [
    'Ocak', '\u015Eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran',
    'Temmuz', 'A\u011Fustos', 'Eyl\u00FCl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'
];

const DAYS_TR = ['Pt', 'Sa', '\u00C7a', 'Pe', 'Cu', 'Ct', 'Pa'];

const DAY_NAMES_TR = ['Pazartesi', 'Sal\u0131', '\u00C7ar\u015Famba', 'Per\u015Fembe', 'Cuma', 'Cumartesi', 'Pazar'];

function generateMonthDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) days.push(null);

    // Actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push(new Date(year, month, d));
    }
    return days;
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getDayOfWeek(date) {
    // 0=Monday..6=Sunday (Python convention)
    return (date.getDay() + 6) % 7;
}

const OvertimeCalendarModal = ({ visible, onClose, employee, onSuccess }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [calendarData, setCalendarData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState([]); // [{date: Date, hours: number}]
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const currentYear = new Date().getFullYear();

    // Fetch calendar data
    const fetchCalendarData = useCallback(async () => {
        if (!employee?.id) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/overtime-assignments/calendar/${employee.id}/`, {
                params: { year }
            });
            setCalendarData(res.data);
        } catch (err) {
            console.error('Calendar fetch error:', err);
            setError(err.response?.data?.error || 'Takvim verileri y\u00FCklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [employee?.id, year]);

    useEffect(() => {
        if (visible && employee?.id) {
            fetchCalendarData();
            setSelectedDays([]);
            setNotes('');
            setSuccess(false);
            setError('');
        }
    }, [visible, employee?.id, year, fetchCalendarData]);

    // ESC key handler
    useEffect(() => {
        if (!visible) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [visible, onClose]);

    // Get assignment map for quick lookup
    const assignmentMap = {};
    if (calendarData?.assignments) {
        calendarData.assignments.forEach(a => {
            assignmentMap[a.date] = a;
        });
    }

    const preferences = calendarData?.preferences || {};

    const getDefaultHours = (date) => {
        const dow = getDayOfWeek(date);
        const prefVal = preferences[String(dow)];
        return prefVal != null ? prefVal : 6.0;
    };

    const isDateSelected = (date) => {
        const key = formatDateKey(date);
        return selectedDays.some(d => formatDateKey(d.date) === key);
    };

    const isDateAssigned = (date) => {
        const key = formatDateKey(date);
        return !!assignmentMap[key];
    };

    const isPastDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const toggleDate = (date) => {
        if (isPastDate(date)) return;
        if (isDateAssigned(date)) return;

        const key = formatDateKey(date);
        if (isDateSelected(date)) {
            setSelectedDays(prev => prev.filter(d => formatDateKey(d.date) !== key));
        } else {
            setSelectedDays(prev => [...prev, { date, hours: getDefaultHours(date) }]);
        }
    };

    const updateHours = (dateKey, newHours) => {
        const clamped = Math.max(0.5, Math.min(12, newHours));
        setSelectedDays(prev => prev.map(d =>
            formatDateKey(d.date) === dateKey ? { ...d, hours: clamped } : d
        ));
    };

    const removeSelected = (dateKey) => {
        setSelectedDays(prev => prev.filter(d => formatDateKey(d.date) !== dateKey));
    };

    const handleSave = async () => {
        if (selectedDays.length === 0) {
            setError('L\u00FCtfen en az bir g\u00FCn se\u00E7in.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.post('/overtime-assignments/bulk-create/', {
                employee_id: employee.id,
                assignments: selectedDays.map(d => ({
                    date: formatDateKey(d.date),
                    max_duration_hours: d.hours
                })),
                notes: notes || undefined
            });
            setSuccess(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 1200);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.response?.data?.error || err.response?.data?.detail || 'Atamalar kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };

    const handleYearPrev = () => {
        if (year > currentYear) setYear(year - 1);
    };

    const handleYearNext = () => {
        if (year < currentYear + 1) setYear(year + 1);
    };

    if (!visible) return null;

    const sortedSelected = [...selectedDays].sort((a, b) => a.date - b.date);

    const modal = (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                <CalendarPlus size={16} className="text-violet-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Ek Mesai Atamas\u0131</h2>
                                <p className="text-[11px] text-slate-400">{employee?.name || ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Year Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleYearPrev}
                            disabled={year <= currentYear}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-slate-700 tabular-nums min-w-[3rem] text-center">{year}</span>
                        <button
                            onClick={handleYearNext}
                            disabled={year >= currentYear + 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={28} className="animate-spin text-violet-500" />
                            <span className="ml-3 text-sm text-slate-500">Takvim y\u00FCkleniyor...</span>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Save size={24} className="text-emerald-600" />
                            </div>
                            <p className="text-base font-bold text-emerald-700">Mesai atamalar\u0131 ba\u015Far\u0131yla kaydedildi!</p>
                            <p className="text-sm text-slate-400">{selectedDays.length} g\u00FCn atand\u0131</p>
                        </div>
                    ) : (
                        <>
                            {/* 12-Month Calendar Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {Array.from({ length: 12 }, (_, monthIdx) => (
                                    <MiniMonth
                                        key={monthIdx}
                                        year={year}
                                        monthIdx={monthIdx}
                                        assignmentMap={assignmentMap}
                                        selectedDays={selectedDays}
                                        onToggleDate={toggleDate}
                                        isPastDate={isPastDate}
                                        isDateSelected={isDateSelected}
                                        isDateAssigned={isDateAssigned}
                                    />
                                ))}
                            </div>

                            {/* Selected Days Panel */}
                            <div className="mt-5 pt-5 border-t border-slate-200">
                                <div className="flex flex-col lg:flex-row gap-4">
                                    {/* Selected Days List */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="text-sm font-bold text-slate-700">Se\u00E7ili G\u00FCnler</h3>
                                            {selectedDays.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold tabular-nums">
                                                    {selectedDays.length}
                                                </span>
                                            )}
                                        </div>

                                        {sortedSelected.length === 0 ? (
                                            <div className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                Takvimden g\u00FCn se\u00E7mek i\u00E7in t\u0131klay\u0131n
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                                                {sortedSelected.map(item => {
                                                    const dateKey = formatDateKey(item.date);
                                                    const dow = getDayOfWeek(item.date);
                                                    const dayName = DAY_NAMES_TR[dow];
                                                    const d = item.date.getDate();
                                                    const m = MONTHS_TR_DISPLAY[item.date.getMonth()];

                                                    return (
                                                        <div
                                                            key={dateKey}
                                                            className="flex items-center gap-3 px-3 py-2 bg-violet-50/60 rounded-lg border border-violet-100 group"
                                                        >
                                                            <span className="text-xs font-semibold text-slate-700 min-w-[120px]">
                                                                {d} {m} {dayName.substring(0, 3)}
                                                            </span>

                                                            {/* Duration Controls */}
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() => updateHours(dateKey, item.hours - 0.5)}
                                                                    disabled={item.hours <= 0.5}
                                                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <Minus size={11} />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={item.hours}
                                                                    onChange={(e) => updateHours(dateKey, parseFloat(e.target.value) || 0.5)}
                                                                    min="0.5"
                                                                    max="12"
                                                                    step="0.5"
                                                                    className="w-14 h-7 text-center text-xs font-bold text-violet-700 bg-white border border-violet-200 rounded-md focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none tabular-nums"
                                                                />
                                                                <button
                                                                    onClick={() => updateHours(dateKey, item.hours + 0.5)}
                                                                    disabled={item.hours >= 12}
                                                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <Plus size={11} />
                                                                </button>
                                                                <span className="text-[10px] text-slate-400 ml-0.5">saat</span>
                                                            </div>

                                                            {/* Remove */}
                                                            <button
                                                                onClick={() => removeSelected(dateKey)}
                                                                className="ml-auto w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    <div className="lg:w-64">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            Not <span className="normal-case text-slate-400 font-normal">(opsiyonel)</span>
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Atama ile ilgili not..."
                                            rows={4}
                                            className="w-full px-3 py-2 text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none resize-none placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
                                    <X size={13} className="shrink-0" />
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && !success && (
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            \u0130ptal
                        </button>

                        {/* Legend */}
                        <div className="hidden sm:flex items-center gap-4 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-violet-500" />
                                Se\u00E7ili
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-blue-50 ring-1 ring-blue-400" />
                                Atanm\u0131\u015F
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-slate-100" />
                                Ge\u00E7mi\u015F
                            </span>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving || selectedDays.length === 0}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-violet-200"
                        >
                            {saving ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            {saving ? 'Kaydediliyor...' : `Kaydet (${selectedDays.length} g\u00FCn)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modal, document.body);
};

/* ─────────────────────────────────────────────
   MiniMonth — A single month mini-calendar
   ───────────────────────────────────────────── */
const MiniMonth = ({
    year, monthIdx,
    assignmentMap,
    selectedDays,
    onToggleDate,
    isPastDate,
    isDateSelected,
    isDateAssigned
}) => {
    const days = generateMonthDays(year, monthIdx);

    return (
        <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-2.5 sm:p-3">
            {/* Month Header */}
            <h4 className="text-xs font-bold text-slate-700 mb-2 text-center">
                {MONTHS_TR_DISPLAY[monthIdx]}
            </h4>

            {/* Day Header Row */}
            <div className="grid grid-cols-7 gap-px mb-1">
                {DAYS_TR.map(d => (
                    <div key={d} className="text-[9px] font-bold text-slate-400 text-center py-0.5">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-px">
                {days.map((date, i) => {
                    if (!date) {
                        return <div key={`empty-${i}`} className="h-7" />;
                    }

                    const past = isPastDate(date);
                    const assigned = isDateAssigned(date);
                    const selected = isDateSelected(date);
                    const dow = date.getDay(); // 0=Sun, 6=Sat
                    const isWeekend = dow === 0 || dow === 6;

                    let cellClass = 'h-7 w-full flex items-center justify-center text-[11px] font-semibold rounded-md transition-all relative ';

                    if (past) {
                        cellClass += 'bg-slate-100/80 text-slate-300 cursor-not-allowed';
                    } else if (selected) {
                        cellClass += 'bg-violet-500 text-white ring-2 ring-violet-300 cursor-pointer shadow-sm';
                    } else if (assigned) {
                        cellClass += 'ring-2 ring-blue-400 bg-blue-50 text-blue-700 cursor-default';
                    } else if (isWeekend) {
                        cellClass += 'bg-blue-50/50 text-slate-500 hover:bg-violet-100 hover:text-violet-700 cursor-pointer';
                    } else {
                        cellClass += 'text-slate-600 hover:bg-violet-50 hover:text-violet-700 cursor-pointer';
                    }

                    return (
                        <button
                            key={formatDateKey(date)}
                            className={cellClass}
                            onClick={() => onToggleDate(date)}
                            disabled={past}
                            title={
                                past ? 'Ge\u00E7mi\u015F tarih'
                                : assigned ? `Atanm\u0131\u015F (${assignmentMap[formatDateKey(date)]?.max_duration_hours || '?'}h)`
                                : `${date.getDate()} ${MONTHS_TR_DISPLAY[date.getMonth()]}`
                            }
                        >
                            {date.getDate()}
                            {assigned && !selected && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default OvertimeCalendarModal;
