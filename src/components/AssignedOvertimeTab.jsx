import { useState, useEffect, useMemo } from 'react';
import { Clock, CalendarCheck, AlertCircle, CheckCircle2, XCircle, Timer, Loader2, ChevronDown, Calendar, Info } from 'lucide-react';
import api from '../services/api';

const DAY_NAMES = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'];
const MONTH_NAMES = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

function formatDateTurkish(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    const dow = d.getDay(); // 0=Sun
    const dayName = DAY_NAMES[dow === 0 ? 6 : dow - 1];
    return `${day} ${month} ${year}, ${dayName}`;
}

function isDatePast(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return d < today;
}

function isDateToday(dateStr) {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function getStatusConfig(assignment) {
    const past = isDatePast(assignment.date);
    const today = isDateToday(assignment.date);

    switch (assignment.status) {
        case 'ASSIGNED':
            if (past || today) {
                return {
                    label: 'Talep Edilebilir',
                    color: 'bg-emerald-100 text-emerald-700',
                    icon: <CheckCircle2 size={12} />,
                    canClaim: true,
                };
            }
            return {
                label: 'Bekleniyor',
                color: 'bg-blue-100 text-blue-700',
                icon: <Timer size={12} />,
                canClaim: false,
            };
        case 'CLAIMED': {
            const reqStatus = assignment.overtime_request_status;
            const reqLabels = {
                PENDING: 'Onay Bekliyor',
                APPROVED: 'Onaylandi',
                REJECTED: 'Reddedildi',
                CANCELLED: 'Iptal Edildi',
            };
            return {
                label: `Talep Edildi${reqStatus ? ` - ${reqLabels[reqStatus] || reqStatus}` : ''}`,
                color: 'bg-amber-100 text-amber-700',
                icon: <Clock size={12} />,
                canClaim: false,
            };
        }
        case 'EXPIRED':
            return {
                label: 'Suresi Doldu',
                color: 'bg-red-100 text-red-700',
                icon: <XCircle size={12} />,
                canClaim: false,
            };
        case 'CANCELLED':
            return {
                label: 'Iptal Edildi',
                color: 'bg-slate-100 text-slate-500',
                icon: <XCircle size={12} />,
                canClaim: false,
            };
        default:
            return {
                label: assignment.status,
                color: 'bg-slate-100 text-slate-600',
                icon: <Info size={12} />,
                canClaim: false,
            };
    }
}

export default function AssignedOvertimeTab() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'past' | 'future'
    const [claimTarget, setClaimTarget] = useState(null);
    const [claimForm, setClaimForm] = useState({
        actual_duration_hours: '',
        start_time: '18:00',
        end_time: '',
        reason: '',
    });
    const [claimLoading, setClaimLoading] = useState(false);
    const [claimError, setClaimError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fetchAssignments = async () => {
        try {
            setError('');
            const res = await api.get('/overtime-assignments/');
            const data = res.data?.results || res.data || [];
            setAssignments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('AssignedOvertimeTab fetch error:', err);
            setError('Atanan mesailer yuklenemedi.');
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'all') return assignments;
        if (filter === 'past') return assignments.filter(a => isDatePast(a.date) || isDateToday(a.date));
        if (filter === 'future') return assignments.filter(a => !isDatePast(a.date) && !isDateToday(a.date));
        return assignments;
    }, [assignments, filter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [filtered]);

    const handleOpenClaim = (assignment) => {
        setClaimTarget(assignment);
        setClaimForm({
            actual_duration_hours: String(assignment.max_duration_hours || ''),
            start_time: '18:00',
            end_time: '',
            reason: '',
        });
        setClaimError('');
    };

    const handleCloseClaim = () => {
        setClaimTarget(null);
        setClaimForm({ actual_duration_hours: '', start_time: '18:00', end_time: '', reason: '' });
        setClaimError('');
    };

    const handleClaimSubmit = async (e) => {
        e.preventDefault();
        if (!claimTarget) return;

        const duration = parseFloat(claimForm.actual_duration_hours);
        if (isNaN(duration) || duration <= 0) {
            setClaimError('Gecerli bir sure giriniz.');
            return;
        }
        if (duration > claimTarget.max_duration_hours) {
            setClaimError(`Sure maksimum ${claimTarget.max_duration_hours} saat olabilir.`);
            return;
        }
        if (!claimForm.start_time || !claimForm.end_time) {
            setClaimError('Baslangic ve bitis saati giriniz.');
            return;
        }
        if (!claimForm.reason.trim()) {
            setClaimError('Gerekce giriniz.');
            return;
        }

        setClaimLoading(true);
        setClaimError('');
        try {
            await api.post(`/overtime-assignments/${claimTarget.id}/claim/`, {
                actual_duration_hours: duration,
                start_time: claimForm.start_time,
                end_time: claimForm.end_time,
                reason: claimForm.reason.trim(),
            });
            setSuccessMsg('Mesai talebi basariyla olusturuldu.');
            setTimeout(() => setSuccessMsg(''), 4000);
            handleCloseClaim();
            await fetchAssignments();
        } catch (err) {
            const detail = err.response?.data?.detail || err.response?.data?.error || JSON.stringify(err.response?.data) || 'Talep olusturulamadi.';
            setClaimError(typeof detail === 'string' ? detail : 'Talep olusturulamadi.');
        } finally {
            setClaimLoading(false);
        }
    };

    // --- Loading State ---
    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-2xl" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
                ))}
            </div>
        );
    }

    // --- Error State ---
    if (error && assignments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                    <AlertCircle size={32} className="text-red-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Hata</h3>
                <p className="text-sm text-slate-500 mt-1">{error}</p>
                <button onClick={() => { setLoading(true); fetchAssignments(); }} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                    Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Success Message */}
            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">{successMsg}</span>
                    <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-500 hover:text-emerald-700">
                        <XCircle size={16} />
                    </button>
                </div>
            )}

            {/* Header + Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                        <CalendarCheck size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Atanan Mesailer</h3>
                        <p className="text-xs text-slate-500">Size atanan fazla mesai gunlerini goruntuleyip talep edin</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {[
                        { key: 'all', label: 'Tumu' },
                        { key: 'past', label: 'Gerceklesmis' },
                        { key: 'future', label: 'Gelecek' },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                                filter === f.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {sorted.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <CalendarCheck size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Atanan Mesai Bulunamadi</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                        {filter === 'all'
                            ? 'Henuz size atanmis bir fazla mesai bulunmamaktadir.'
                            : filter === 'past'
                            ? 'Gerceklesmis atanmis mesai bulunamadi.'
                            : 'Gelecek tarihli atanmis mesai bulunamadi.'}
                    </p>
                </div>
            )}

            {/* Assignment Cards */}
            <div className="space-y-3">
                {sorted.map(assignment => {
                    const statusCfg = getStatusConfig(assignment);
                    const isClaiming = claimTarget?.id === assignment.id;

                    return (
                        <div
                            key={assignment.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="p-5">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    {/* Left Side */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                                            statusCfg.canClaim ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                                            assignment.status === 'CLAIMED' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                                            assignment.status === 'EXPIRED' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                            !isDatePast(assignment.date) ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                                            'bg-gradient-to-br from-slate-400 to-slate-500'
                                        }`}>
                                            <Calendar size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h4 className="font-bold text-slate-800 text-base">
                                                    {formatDateTurkish(assignment.date)}
                                                </h4>
                                                <span className="px-2.5 py-0.5 bg-violet-100 text-violet-700 text-[11px] font-bold rounded-full">
                                                    {assignment.max_duration_hours} saat maks
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                Atayan: <span className="font-semibold text-slate-700">{assignment.assigned_by_name || '-'}</span>
                                            </p>
                                            {assignment.notes && (
                                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                    <Info size={12} />
                                                    {assignment.notes}
                                                </p>
                                            )}
                                            {/* Status Badge */}
                                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.color}`}>
                                                    {statusCfg.icon}
                                                    {statusCfg.label}
                                                </span>
                                                {assignment.overtime_request && assignment.status === 'CLAIMED' && (
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        Talep #{assignment.overtime_request}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Claim Button */}
                                    {statusCfg.canClaim && !isClaiming && (
                                        <button
                                            onClick={() => handleOpenClaim(assignment)}
                                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                                        >
                                            <Clock size={16} />
                                            Talep Et
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Claim Form (inline) */}
                            {isClaiming && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Clock size={16} className="text-violet-600" />
                                        Mesai Talebi
                                    </h4>
                                    <form onSubmit={handleClaimSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">
                                                    Gercek Sure (saat) <span className="text-slate-400">(maks: {claimTarget.max_duration_hours})</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    max={claimTarget.max_duration_hours}
                                                    value={claimForm.actual_duration_hours}
                                                    onChange={e => setClaimForm({ ...claimForm, actual_duration_hours: e.target.value })}
                                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                                                    placeholder="3.5"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">Baslangic</label>
                                                <input
                                                    type="time"
                                                    value={claimForm.start_time}
                                                    onChange={e => setClaimForm({ ...claimForm, start_time: e.target.value })}
                                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1 block">Bitis</label>
                                                <input
                                                    type="time"
                                                    value={claimForm.end_time}
                                                    onChange={e => setClaimForm({ ...claimForm, end_time: e.target.value })}
                                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Gerekce</label>
                                            <textarea
                                                rows="2"
                                                value={claimForm.reason}
                                                onChange={e => setClaimForm({ ...claimForm, reason: e.target.value })}
                                                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                                                placeholder="Mesai gerekce aciklamasi..."
                                                required
                                            />
                                        </div>

                                        {claimError && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                                                <AlertCircle size={14} />
                                                {claimError}
                                            </div>
                                        )}

                                        <div className="flex gap-2 justify-end">
                                            <button
                                                type="button"
                                                onClick={handleCloseClaim}
                                                className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm transition-all"
                                            >
                                                Iptal
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={claimLoading}
                                                className="px-6 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm hover:bg-violet-700 shadow-lg shadow-violet-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {claimLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                Talep Et
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
