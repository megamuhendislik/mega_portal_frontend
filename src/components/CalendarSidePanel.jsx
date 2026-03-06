import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Plus, Calendar, Clock, MapPin, Users, CalendarCheck,
    ClipboardList, Heart, CreditCard, Send, Check, AlertTriangle,
    Globe, Building2, Lock,
} from 'lucide-react';
import moment from 'moment';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVENT_CATEGORIES = [
    { key: 'HOLIDAY',             label: 'Tatiller',          icon: Globe,         color: 'red'    },
    { key: 'PERSONAL',            label: 'Kisisel Etkinlikler', icon: Calendar,    color: 'indigo' },
    { key: 'LEAVE_REQUEST',       label: 'Izinler',           icon: Calendar,      color: 'cyan'   },
    { key: 'OVERTIME_ASSIGNMENT', label: 'Ek Mesai Atamalari', icon: CalendarCheck, color: 'violet' },
    { key: 'OVERTIME_REQUEST',    label: 'Ek Mesai Talepleri', icon: ClipboardList, color: 'amber'  },
    { key: 'HEALTH_REPORT',      label: 'Saglik Raporlari',  icon: Heart,         color: 'pink'   },
    { key: 'CARDLESS_ENTRY',     label: 'Kartsiz Girisler',  icon: CreditCard,    color: 'orange' },
    { key: 'EXTERNAL_DUTY',      label: 'Dis Gorevler',      icon: MapPin,        color: 'purple' },
];

const CATEGORY_MAP = EVENT_CATEGORIES.reduce((m, c) => { m[c.key] = c; return m; }, {});

const getCategoryMeta = (type) => CATEGORY_MAP[type] || { label: type, icon: Calendar, color: 'slate' };

const VISIBILITY_ICON = {
    PUBLIC:     { Icon: Globe,     tip: 'Herkese Acik',     cls: 'text-emerald-500' },
    DEPARTMENT: { Icon: Building2, tip: 'Departman',        cls: 'text-blue-500'    },
    PRIVATE:    { Icon: Lock,      tip: 'Ozel',             cls: 'text-slate-400'   },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single event card inside Detay tab */
const EventCard = ({ evt, onEdit }) => {
    const meta = getCategoryMeta(evt.type);
    const Icon = meta.icon;
    const vis = evt.visibility ? VISIBILITY_ICON[evt.visibility] : null;

    return (
        <div
            onClick={() => onEdit?.(evt)}
            className="group flex items-start gap-3 p-3 rounded-xl border border-slate-100
                       hover:border-indigo-200 hover:bg-indigo-50/40 transition-all cursor-pointer
                       relative overflow-hidden"
        >
            {/* Left color strip */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: evt.color || '#cbd5e1' }}
            />

            {/* Icon */}
            <div className={`mt-0.5 shrink-0 ml-2 text-${meta.color}-500`}>
                <Icon size={16} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-700 truncate">
                        {evt.title}
                    </span>

                    {/* Visibility icon */}
                    {vis && (
                        <span title={vis.tip} className={`shrink-0 ${vis.cls}`}>
                            <vis.Icon size={12} />
                        </span>
                    )}
                </div>

                {/* Time row */}
                {!evt.allDay && evt.start && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Clock size={11} />
                        {moment(evt.start).format('HH:mm')}
                        {evt.end ? ` - ${moment(evt.end).format('HH:mm')}` : ''}
                    </span>
                )}
                {evt.allDay && (
                    <span className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-0.5">
                        Tum Gun
                    </span>
                )}

                {/* Location */}
                {evt.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <MapPin size={11} />
                        <span className="truncate">{evt.location}</span>
                    </span>
                )}

                {/* Employee name (if it's someone else's event) */}
                {evt.employee_name && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Users size={11} />
                        {evt.employee_name}
                    </span>
                )}

                {/* Description preview */}
                {evt.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{evt.description}</p>
                )}
            </div>
        </div>
    );
};

/** Collapsible section per event category */
const CategorySection = ({ categoryKey, events, onEdit }) => {
    const meta = getCategoryMeta(categoryKey);
    const Icon = meta.icon;
    const isHoliday = categoryKey === 'HOLIDAY';
    const hasHalfDay = isHoliday && events.some(e => e.is_half_day);

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className={`text-${meta.color}-500`}>
                    <Icon size={15} />
                </span>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {meta.label}
                </span>
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full
                    bg-${meta.color}-100 text-${meta.color}-700`}>
                    {events.length}
                </span>
                {hasHalfDay && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        Yarim Gun
                    </span>
                )}
            </div>
            <div className="space-y-2">
                {events.map((evt, idx) => (
                    <EventCard key={evt.id || idx} evt={evt} onEdit={onEdit} />
                ))}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// OT Assignment Tab
// ---------------------------------------------------------------------------

const OTAssignTab = ({ date, managedEmployees, onSuccess }) => {
    const [selectedEmps, setSelectedEmps] = useState([]);
    const [maxHours, setMaxHours] = useState(2);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const dateStr = moment(date).format('YYYY-MM-DD');

    const filteredEmployees = (managedEmployees || []).filter(emp => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const name = (emp.full_name || `${emp.first_name} ${emp.last_name}`).toLowerCase();
        return name.includes(term);
    });

    const toggleEmp = (empId) => {
        setSelectedEmps(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const toggleAll = () => {
        if (selectedEmps.length === filteredEmployees.length) {
            setSelectedEmps([]);
        } else {
            setSelectedEmps(filteredEmployees.map(e => e.id));
        }
    };

    const handleSubmit = async () => {
        if (selectedEmps.length === 0) {
            setError('En az bir personel secmelisiniz.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const results = await Promise.allSettled(
                selectedEmps.map(empId =>
                    api.post('/attendance/overtime-assignments/bulk-create/', {
                        employee_id: Number(empId),
                        assignments: [{ date: dateStr, max_duration_hours: maxHours }],
                        task_description: description,
                    })
                )
            );

            const failedResults = results.filter(r =>
                r.status === 'rejected' ||
                (r.status === 'fulfilled' && r.value.data?.total_errors > 0)
            );

            if (failedResults.length > 0 && failedResults.length === selectedEmps.length) {
                const firstErr = failedResults[0];
                if (firstErr.status === 'rejected') {
                    setError(firstErr.reason?.response?.data?.error || 'Atama basarisiz oldu.');
                } else {
                    setError(firstErr.value.data.errors[0]?.error || 'Atama basarisiz oldu.');
                }
            } else {
                setSuccess(true);
                setSelectedEmps([]);
                setDescription('');
                setTimeout(() => {
                    setSuccess(false);
                    onSuccess?.();
                }, 1500);
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Atama basarisiz oldu.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Employee selection */}
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Personel Secimi
                    </label>

                    {/* Search */}
                    {managedEmployees.length > 5 && (
                        <input
                            type="text"
                            placeholder="Ara..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full mb-2 px-3 py-2 text-sm border border-slate-200 rounded-lg
                                       focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none
                                       bg-white/80"
                        />
                    )}

                    {/* Select all toggle */}
                    {filteredEmployees.length > 1 && (
                        <button
                            onClick={toggleAll}
                            className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 mb-1.5 transition-colors"
                        >
                            {selectedEmps.length === filteredEmployees.length ? 'Secimi Kaldir' : 'Tumunu Sec'}
                        </button>
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-1 bg-white/70 rounded-xl border border-slate-200 p-2">
                        {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                            <label
                                key={emp.id}
                                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-sm
                                    ${selectedEmps.includes(emp.id)
                                        ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                        : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedEmps.includes(emp.id)}
                                    onChange={() => toggleEmp(emp.id)}
                                    className="accent-violet-600 w-3.5 h-3.5"
                                />
                                <span className="font-medium">
                                    {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                                </span>
                            </label>
                        )) : (
                            <p className="text-xs text-slate-400 py-3 text-center">
                                {searchTerm ? 'Sonuc bulunamadi.' : 'Yonetilen personel bulunamadi.'}
                            </p>
                        )}
                    </div>

                    {selectedEmps.length > 0 && (
                        <p className="text-[11px] text-violet-600 font-semibold mt-1.5">
                            {selectedEmps.length} personel secildi
                        </p>
                    )}
                </div>

                {/* Max hours */}
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Maks Saat
                    </label>
                    <input
                        type="number"
                        min="0.5"
                        max="12"
                        step="0.5"
                        value={maxHours}
                        onChange={e => setMaxHours(parseFloat(e.target.value) || 2)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                                   focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none
                                   bg-white/80"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">0.5 - 12 saat arasi, 0.5 adimlarla</p>
                </div>

                {/* Task description */}
                <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Gorev Aciklamasi
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Yapilacak is aciklamasi..."
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
                                   focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none
                                   resize-none bg-white/80"
                    />
                </div>

                {/* Error / Success messages */}
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm">
                        <Check size={16} className="shrink-0" />
                        <span className="font-bold">Atama basarili!</span>
                    </div>
                )}
            </div>

            {/* Submit button fixed at bottom */}
            <div className="px-5 py-4 border-t border-slate-100 bg-white/60 backdrop-blur-sm">
                <button
                    onClick={handleSubmit}
                    disabled={submitting || selectedEmps.length === 0}
                    className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm
                               hover:bg-violet-700 transition-all shadow-lg hover:shadow-violet-500/30
                               flex items-center justify-center gap-2
                               disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    <Send size={16} />
                    {submitting ? 'Gonderiliyor...' : `Ata (${selectedEmps.length} kisi)`}
                </button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const CalendarSidePanel = ({
    date,
    events = [],
    onClose,
    onAddEvent,
    onEditEvent,
    isManager = false,
    managedEmployees = [],
    onOTAssignSuccess,
}) => {
    const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'ot'
    const [visible, setVisible] = useState(false);
    const panelRef = useRef(null);

    // Trigger slide-in animation on mount
    useEffect(() => {
        // Small delay so the browser paints the initial off-screen state first
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    // Animated close: slide out then call onClose
    const handleClose = () => {
        setVisible(false);
        setTimeout(() => onClose?.(), 300);
    };

    if (!date) return null;

    const dateStr = moment(date).format('YYYY-MM-DD');
    const isPast = moment(date).isBefore(moment(), 'day');

    // Filter events for this day
    const dayEvents = events
        .filter(e => moment(e.start).format('YYYY-MM-DD') === dateStr)
        .sort((a, b) => {
            if (a.allDay && !b.allDay) return -1;
            if (!a.allDay && b.allDay) return 1;
            return new Date(a.start) - new Date(b.start);
        });

    // Group events by category
    const grouped = {};
    dayEvents.forEach(evt => {
        const key = evt.type || 'PERSONAL';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(evt);
    });

    // Order categories by the predefined order
    const orderedCategories = EVENT_CATEGORIES
        .filter(c => grouped[c.key]?.length > 0)
        .map(c => c.key);

    // Check if OT tab should be available (manager + not past)
    const showOTTab = isManager && !isPast;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
                onClick={handleClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="relative w-[420px] max-w-[90vw] h-full flex flex-col
                           bg-white/80 backdrop-blur-xl border-l border-white/40
                           shadow-2xl shadow-slate-500/20
                           transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
            >
                {/* ---- Header ---- */}
                <div className="shrink-0 px-5 pt-5 pb-3 border-b border-slate-100 bg-white/60 backdrop-blur-sm">
                    {/* Top row: date + close */}
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <span className="text-indigo-600 text-2xl">
                                    {moment(date).format('D')}
                                </span>
                                <span>{moment(date).format('MMMM YYYY')}</span>
                            </h3>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">
                                {moment(date).format('dddd')}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400
                                       hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tab buttons */}
                    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        <button
                            onClick={() => setActiveTab('detail')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all
                                ${activeTab === 'detail'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <Calendar size={14} />
                                Detay
                            </span>
                        </button>
                        {showOTTab && (
                            <button
                                onClick={() => setActiveTab('ot')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all
                                    ${activeTab === 'ot'
                                        ? 'bg-white text-violet-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span className="flex items-center justify-center gap-1.5">
                                    <CalendarCheck size={14} />
                                    OT Ata
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ---- Body ---- */}
                {activeTab === 'detail' ? (
                    <>
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {orderedCategories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                        <Calendar size={32} className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm">
                                        Bu gune ait etkinlik bulunamadi.
                                    </p>
                                    <p className="text-slate-400 text-xs mt-1">
                                        Yeni bir etkinlik eklemek icin asagidaki butonu kullanin.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {orderedCategories.map(catKey => (
                                        <CategorySection
                                            key={catKey}
                                            categoryKey={catKey}
                                            events={grouped[catKey]}
                                            onEdit={onEditEvent}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer: Add Event button */}
                        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white/60 backdrop-blur-sm">
                            <button
                                onClick={onAddEvent}
                                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold
                                           hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30
                                           flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Plus size={20} />
                                Etkinlik Ekle
                            </button>
                        </div>
                    </>
                ) : (
                    /* OT Assignment Tab */
                    <OTAssignTab
                        date={date}
                        managedEmployees={managedEmployees}
                        onSuccess={onOTAssignSuccess}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

export default CalendarSidePanel;
