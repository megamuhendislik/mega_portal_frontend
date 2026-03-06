import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, User, Users, Bell, Globe, Check, Lock, CalendarCheck, ClipboardList, UserPlus, Send, Heart, CreditCard } from 'lucide-react';
import moment from 'moment';
import api from '../services/api';

const DayDetailModal = ({ date, events, onClose, onAddEvent, onEditEvent, isManager = false, managedEmployees = [] }) => {
    const [showOTForm, setShowOTForm] = useState(false);
    const [otSelectedEmps, setOtSelectedEmps] = useState([]);
    const [otMaxHours, setOtMaxHours] = useState(2);
    const [otDescription, setOtDescription] = useState('');
    const [otSubmitting, setOtSubmitting] = useState(false);
    const [otSuccess, setOtSuccess] = useState(false);
    const [otError, setOtError] = useState('');

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
            case 'OVERTIME_ASSIGNMENT': return <CalendarCheck size={16} className="text-violet-500" />;
            case 'OVERTIME_REQUEST': return <ClipboardList size={16} className="text-amber-500" />;
            case 'LEAVE_REQUEST': return <CalendarIcon size={16} className="text-cyan-500" />;
            case 'EXTERNAL_DUTY': return <MapPin size={16} className="text-purple-500" />;
            case 'HEALTH_REPORT': return <Heart size={16} className="text-pink-500" />;
            case 'CARDLESS_ENTRY': return <CreditCard size={16} className="text-orange-500" />;
            default: return <AlignLeft size={16} className="text-indigo-500" />;
        }
    };

    const handleOTAssign = async () => {
        if (otSelectedEmps.length === 0) {
            setOtError('En az bir personel seçmelisiniz.');
            return;
        }
        setOtSubmitting(true);
        setOtError('');
        try {
            const results = await Promise.allSettled(
                otSelectedEmps.map(empId =>
                    api.post('/attendance/overtime-assignments/bulk-create/', {
                        employee_id: Number(empId),
                        assignments: [{ date: dateStr, max_duration_hours: otMaxHours }],
                        task_description: otDescription,
                    })
                )
            );
            const failedResults = results.filter(r =>
                r.status === 'rejected' ||
                (r.status === 'fulfilled' && r.value.data?.total_errors > 0)
            );
            if (failedResults.length > 0 && failedResults.length === otSelectedEmps.length) {
                // All failed
                const firstErr = failedResults[0];
                if (firstErr.status === 'rejected') {
                    setOtError(firstErr.reason?.response?.data?.error || 'Atama başarısız oldu.');
                } else {
                    setOtError(firstErr.value.data.errors[0]?.error || 'Atama başarısız oldu.');
                }
            } else {
                setOtSuccess(true);
                setOtSelectedEmps([]);
                setOtDescription('');
                setTimeout(() => { setOtSuccess(false); setShowOTForm(false); }, 1500);
            }
        } catch (err) {
            setOtError(err.response?.data?.detail || err.response?.data?.error || 'Atama başarısız oldu.');
        } finally {
            setOtSubmitting(false);
        }
    };

    const toggleEmp = (empId) => {
        setOtSelectedEmps(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
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

                {/* OT Assignment Form (Managers only) */}
                {isManager && showOTForm && (
                    <div className="px-5 pb-4 border-t border-violet-100 bg-violet-50/30">
                        <div className="pt-4 pb-2">
                            <h4 className="text-sm font-bold text-violet-700 flex items-center gap-2 mb-3">
                                <UserPlus size={16} />
                                Ek Mesai Ata — {moment(date).format('D MMMM')}
                            </h4>

                            {/* Employee Selection */}
                            <div className="mb-3">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Personel Seçimi</label>
                                <div className="max-h-32 overflow-y-auto space-y-1 bg-white rounded-lg border border-slate-200 p-2">
                                    {managedEmployees.length > 0 ? managedEmployees.map(emp => (
                                        <label
                                            key={emp.id}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${otSelectedEmps.includes(emp.id) ? 'bg-violet-50 text-violet-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={otSelectedEmps.includes(emp.id)}
                                                onChange={() => toggleEmp(emp.id)}
                                                className="accent-violet-600 w-3.5 h-3.5"
                                            />
                                            <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                                        </label>
                                    )) : (
                                        <p className="text-xs text-slate-400 py-2 text-center">Yönetilen personel bulunamadı.</p>
                                    )}
                                </div>
                            </div>

                            {/* Max Hours */}
                            <div className="mb-3">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Maks Saat</label>
                                <input
                                    type="number"
                                    min="0.5"
                                    max="12"
                                    step="0.5"
                                    value={otMaxHours}
                                    onChange={e => setOtMaxHours(parseFloat(e.target.value) || 2)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
                                />
                            </div>

                            {/* Task Description */}
                            <div className="mb-3">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Görev Açıklaması</label>
                                <textarea
                                    value={otDescription}
                                    onChange={e => setOtDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Yapılacak iş açıklaması..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none resize-none"
                                />
                            </div>

                            {otError && <p className="text-xs text-red-600 font-medium mb-2">{otError}</p>}
                            {otSuccess && <p className="text-xs text-emerald-600 font-bold mb-2">Atama başarılı!</p>}

                            <div className="flex gap-2">
                                <button
                                    onClick={handleOTAssign}
                                    disabled={otSubmitting || otSelectedEmps.length === 0}
                                    className="flex-1 py-2.5 rounded-lg bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={14} />
                                    {otSubmitting ? 'Gönderiliyor...' : 'Ata'}
                                </button>
                                <button
                                    onClick={() => setShowOTForm(false)}
                                    className="px-4 py-2.5 rounded-lg bg-white text-slate-600 font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all"
                                >
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-white sticky bottom-0 space-y-2">
                    {isManager && !showOTForm && (
                        <button
                            onClick={() => setShowOTForm(true)}
                            className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-all shadow-lg hover:shadow-violet-500/30 flex items-center justify-center gap-2 active:scale-95"
                        >
                            <CalendarCheck size={20} />
                            Ek Mesai Ata
                        </button>
                    )}
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
