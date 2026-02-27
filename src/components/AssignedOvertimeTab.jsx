import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    Clock, Calendar, CheckCircle2, XCircle, AlertCircle, Users, Plus, Loader2,
    ChevronDown, Timer, Zap, PenLine, FileText, Send, Filter, TrendingUp,
    ClipboardList, CalendarCheck, X, Coffee
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateAssignmentModal from './overtime/CreateAssignmentModal';

// ═══════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function formatDateTurkish(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    const dayName = DAY_NAMES[d.getDay()];
    return `${day} ${month} ${year}, ${dayName}`;
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0 dk';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} sa`;
    return `${m} dk`;
}

function isDatePast(dateStr) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(dateStr + 'T00:00:00') < today;
}

// ═══════════════════════════════════════════════════════════
// BADGE COMPONENTS
// ═══════════════════════════════════════════════════════════

const SourceBadge = ({ type }) => {
    const map = {
        INTENDED: { label: 'Planlı', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        POTENTIAL: { label: 'Plansız', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
        MANUAL: { label: 'Manuel', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    };
    const c = map[type] || { label: type || '?', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text} border ${c.border}`}>{c.label}</span>;
};

const StatusBadge = ({ status }) => {
    const map = {
        PENDING: { label: 'Bekliyor', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        APPROVED: { label: 'Onaylandı', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        REJECTED: { label: 'Reddedildi', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        CANCELLED: { label: 'İptal Edildi', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
    };
    const c = map[status] || { label: status, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text} border ${c.border}`}>{c.label}</span>;
};

const AssignmentStatusBadge = ({ assignment }) => {
    const past = isDatePast(assignment.date);
    if (assignment.status === 'CLAIMED') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Talep Edildi</span>;
    if (assignment.status === 'EXPIRED') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">Süresi Doldu</span>;
    if (assignment.status === 'CANCELLED') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">İptal</span>;
    if (assignment.status === 'ASSIGNED' && past) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Talep Edilebilir</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Bekliyor</span>;
};

// ═══════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION WRAPPER
// ═══════════════════════════════════════════════════════════

const Section = ({ icon, title, count, children, defaultOpen = true, accent = 'blue', action }) => {
    const [open, setOpen] = useState(defaultOpen);
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        amber: 'from-amber-500 to-amber-600',
        slate: 'from-slate-500 to-slate-600',
        emerald: 'from-emerald-500 to-emerald-600',
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[accent]} flex items-center justify-center text-white shadow-lg shadow-${accent}-500/25`}>
                        {icon}
                    </div>
                    <span className="font-bold text-slate-800 text-sm sm:text-base">{title}</span>
                    {count !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">{count}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <div className={`transition-all duration-300 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="border-t border-slate-100 p-4 sm:p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════

const EmptyState = ({ icon, text }) => (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">{icon}</div>
        <p className="text-sm font-medium">{text}</p>
    </div>
);

// ═══════════════════════════════════════════════════════════
// CLAIM MODAL (for INTENDED + POTENTIAL)
// ═══════════════════════════════════════════════════════════

const ClaimModal = ({ isOpen, title, subtitle, onClose, onSubmit, loading }) => {
    const [reason, setReason] = useState('');
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                <textarea
                    rows="3"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Açıklama (opsiyonel)..."
                    className="input-field resize-none"
                />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazgeç</button>
                    <button
                        onClick={() => { onSubmit(reason); setReason(''); }}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Gönderiliyor...' : 'Talep Et'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ═══════════════════════════════════════════════════════════
// CANCEL MODAL
// ═══════════════════════════════════════════════════════════

const CancelModal = ({ isOpen, date, onClose, onSubmit, loading }) => {
    const [reason, setReason] = useState('');
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><XCircle size={20} className="text-red-500" /> Talebi İptal Et</h3>
                <p className="text-sm text-slate-500">
                    <strong>{date}</strong> tarihli ek mesai talebini iptal etmek istediğinize emin misiniz?
                </p>
                <textarea
                    rows="2" value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="İptal sebebi (opsiyonel)"
                    className="input-field resize-none"
                />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazgeç</button>
                    <button
                        onClick={() => { onSubmit(reason); setReason(''); }}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                        İptal Et
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const AssignedOvertimeTab = () => {
    const { hasPermission } = useAuth();
    const isManager = hasPermission('APPROVAL_OVERTIME');

    // ── Data states ──
    const [loading, setLoading] = useState(true);
    const [claimableData, setClaimableData] = useState({ intended: [], potential: [] });
    const [myRequests, setMyRequests] = useState([]);
    const [teamAssignments, setTeamAssignments] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);

    // ── UI states ──
    const [claimModal, setClaimModal] = useState({ open: false, type: null, target: null, title: '', subtitle: '' });
    const [cancelModal, setCancelModal] = useState({ open: false, target: null });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Manual entry form ──
    const [manualForm, setManualForm] = useState({ date: '', start_time: '', end_time: '', reason: '' });
    const [manualError, setManualError] = useState('');
    const [manualSubmitting, setManualSubmitting] = useState(false);

    // ── Taleplerim filters ──
    const [requestFilter, setRequestFilter] = useState({ status: 'ALL', source: 'ALL' });

    // ── Fetch all data ──
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const calls = [
                api.get('/overtime-assignments/claimable/'),
                api.get('/overtime-requests/'),
            ];
            if (isManager) {
                calls.push(api.get('/overtime-assignments/team/'));
                calls.push(api.get('/employees/', { params: { page_size: 200 } }));
            }
            const results = await Promise.allSettled(calls);

            if (results[0].status === 'fulfilled') setClaimableData(results[0].value.data);
            if (results[1].status === 'fulfilled') setMyRequests(results[1].value.data);
            if (isManager && results[2]?.status === 'fulfilled') setTeamAssignments(results[2].value.data);
            if (isManager && results[3]?.status === 'fulfilled') {
                const d = results[3].value.data;
                setTeamMembers(Array.isArray(d) ? d : (d.results || []));
            }
        } catch (err) { console.error('fetchData error:', err); }
        setLoading(false);
    }, [isManager]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Action handlers ──

    const handleClaim = async (reason) => {
        setActionLoading(true);
        try {
            const { type, target } = claimModal;
            if (type === 'INTENDED') {
                await api.post(`/overtime-assignments/${target.assignment_id}/claim/`, { reason: reason || undefined });
            } else if (type === 'POTENTIAL') {
                await api.post('/overtime-requests/claim-potential/', { attendance_id: target.attendance_id, reason: reason || undefined });
            }
            setClaimModal({ open: false, type: null, target: null, title: '', subtitle: '' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Talep sırasında hata oluştu.');
        }
        setActionLoading(false);
    };

    const handleCancel = async (reason) => {
        setActionLoading(true);
        try {
            await api.post(`/overtime-requests/${cancelModal.target.id}/cancel/`, { reason: reason || undefined });
            setCancelModal({ open: false, target: null });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'İptal sırasında hata oluştu.');
        }
        setActionLoading(false);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setManualError('');
        if (!manualForm.date || !manualForm.start_time || !manualForm.end_time) { setManualError('Tüm alanları doldurunuz.'); return; }
        if (manualForm.end_time <= manualForm.start_time) { setManualError('Bitiş saati başlangıçtan büyük olmalı.'); return; }
        if (!manualForm.reason.trim()) { setManualError('Açıklama giriniz.'); return; }

        setManualSubmitting(true);
        try {
            await api.post('/overtime-requests/manual-entry/', {
                date: manualForm.date,
                start_time: manualForm.start_time,
                end_time: manualForm.end_time,
                reason: manualForm.reason.trim(),
            });
            setManualForm({ date: '', start_time: '', end_time: '', reason: '' });
            fetchData();
        } catch (err) {
            setManualError(err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Hata oluştu.');
        }
        setManualSubmitting(false);
    };

    const handleCancelAssignment = async (a) => {
        if (!window.confirm(`${a.employee_name} - ${formatDateTurkish(a.date)} atamasını iptal etmek istiyor musunuz?`)) return;
        try {
            await api.post(`/overtime-assignments/${a.id}/cancel/`);
            fetchData();
        } catch (err) { alert(err.response?.data?.error || 'Hata oluştu.'); }
    };

    // ── Computed values ──
    const pendingCount = myRequests.filter(r => r.status === 'PENDING').length;
    const approvedRequests = myRequests.filter(r => r.status === 'APPROVED');
    const approvedHours = Math.round(approvedRequests.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 3600 * 10) / 10;
    const thisMonthCount = myRequests.filter(r => {
        const d = new Date(r.date + 'T00:00:00');
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // ── Filtered requests for "Taleplerim" ──
    const filteredRequests = myRequests.filter(r => {
        if (r.status === 'POTENTIAL') return false;
        if (requestFilter.status !== 'ALL' && r.status !== requestFilter.status) return false;
        if (requestFilter.source !== 'ALL' && r.source_type !== requestFilter.source) return false;
        return true;
    });

    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <span className="text-sm font-medium text-slate-400">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">

            {/* ═══ SUMMARY CARDS ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                            <Clock size={18} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{pendingCount}</div>
                            <div className="text-xs font-medium text-slate-500">Bekleyen Talep</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                            <TrendingUp size={18} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{approvedHours} <span className="text-sm font-bold text-slate-400">sa</span></div>
                            <div className="text-xs font-medium text-slate-500">Onaylanan Toplam</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                            <FileText size={18} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{thisMonthCount}</div>
                            <div className="text-xs font-medium text-slate-500">Bu Ay Talep</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ SECTION: PLANLI - BENDEN ISTENEN ═══ */}
            <Section
                icon={<CalendarCheck size={18} />}
                title="Benden İstenen Planlı Mesailer"
                count={claimableData.intended.length}
                accent="blue"
            >
                {claimableData.intended.length === 0 ? (
                    <EmptyState icon={<CalendarCheck size={20} className="text-slate-300" />} text="Size atanmış planlı ek mesai bulunmuyor." />
                ) : (
                    <div className="space-y-3">
                        {claimableData.intended.map((item, i) => {
                            const canClaim = item.actual_overtime_hours > 0;
                            return (
                                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-blue-200 transition-all group">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-slate-800">{formatDateTurkish(item.date)}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            Maks {item.max_duration_hours} sa
                                            {item.actual_overtime_hours > 0 && <> · Gerçekleşen: <strong className="text-emerald-600">{item.actual_overtime_hours} sa</strong></>}
                                            {item.manager_name && <> · Atayan: {item.manager_name}</>}
                                        </div>
                                        {item.task_description && <div className="text-xs text-slate-400 mt-1 truncate max-w-md">{item.task_description}</div>}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                        {item.already_claimed ? (
                                            <span className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg border border-blue-200">Talep Edildi</span>
                                        ) : canClaim ? (
                                            <button
                                                onClick={() => setClaimModal({
                                                    open: true, type: 'INTENDED', target: item,
                                                    title: 'Planlı Mesai Talep Et',
                                                    subtitle: `${formatDateTurkish(item.date)} — ${item.claimable_hours || item.actual_overtime_hours} saat`,
                                                })}
                                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                                            >
                                                <Send size={12} /> Talep Et
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-lg">Bekleniyor</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Section>

            {/* ═══ SECTION: PLANLI - EKIBIM ICIN (managers only) ═══ */}
            {isManager && (
                <Section
                    icon={<Users size={18} />}
                    title="Ekibim İçin Planlı Mesai"
                    count={teamAssignments.length}
                    accent="emerald"
                    action={
                        <button
                            onClick={() => setShowAssignModal(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                        >
                            <Plus size={14} /> Yeni Atama
                        </button>
                    }
                >
                    {teamAssignments.length === 0 ? (
                        <EmptyState icon={<Users size={20} className="text-slate-300" />} text="Ekibinize atanmış ek mesai bulunmuyor." />
                    ) : (
                        <div className="space-y-2">
                            {teamAssignments.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-emerald-200 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-800">{a.employee_name}</span>
                                            <AssignmentStatusBadge assignment={a} />
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {formatDateTurkish(a.date)} · Maks {a.max_duration_hours} sa
                                        </div>
                                        {a.task_description && <div className="text-xs text-slate-400 mt-1 truncate max-w-md">{a.task_description}</div>}
                                    </div>
                                    {a.status === 'ASSIGNED' && (
                                        <button onClick={() => handleCancelAssignment(a)}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg transition-colors flex-shrink-0 ml-3">
                                            İptal
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            )}

            {/* ═══ SECTION: PLANSIZ MESAI ═══ */}
            <Section
                icon={<Zap size={18} />}
                title="Algılanan Plansız Mesailer"
                count={claimableData.potential.length}
                accent="purple"
            >
                {claimableData.potential.length === 0 ? (
                    <EmptyState icon={<Zap size={20} className="text-slate-300" />} text="Algılanan fazla mesainiz bulunmuyor." />
                ) : (
                    <div className="space-y-3">
                        {claimableData.potential.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-purple-200 transition-all">
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-slate-800">{formatDateTurkish(item.date)}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        Algılanan: <strong className="text-purple-600">{item.actual_overtime_hours} sa</strong>
                                        {item.shift_end_time && <> · Vardiya bitiş: {item.shift_end_time?.slice(0, 5)}</>}
                                        {item.check_out_time && <> · Çıkış: {item.check_out_time?.slice(0, 5)}</>}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                    {item.already_claimed ? (
                                        <span className="px-3 py-1.5 bg-purple-50 text-purple-600 font-bold text-xs rounded-lg border border-purple-200">Talep Edildi</span>
                                    ) : (
                                        <button
                                            onClick={() => setClaimModal({
                                                open: true, type: 'POTENTIAL', target: item,
                                                title: 'Plansız Mesai Talep Et',
                                                subtitle: `${formatDateTurkish(item.date)} — ${item.actual_overtime_hours} saat`,
                                            })}
                                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                                        >
                                            <Send size={12} /> Talep Et
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* ═══ SECTION: MANUEL GIRIS ═══ */}
            <Section
                icon={<PenLine size={18} />}
                title="Manuel Ek Mesai Girişi"
                accent="amber"
                defaultOpen={false}
            >
                <form onSubmit={handleManualSubmit} className="space-y-3">
                    {manualError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium">{manualError}</div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
                            <input type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})}
                                className="input-field" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Başlangıç</label>
                            <input type="time" value={manualForm.start_time} onChange={e => setManualForm({...manualForm, start_time: e.target.value})}
                                className="input-field" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Bitiş</label>
                            <input type="time" value={manualForm.end_time} onChange={e => setManualForm({...manualForm, end_time: e.target.value})}
                                className="input-field" required />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Açıklama</label>
                        <textarea rows="2" value={manualForm.reason} onChange={e => setManualForm({...manualForm, reason: e.target.value})}
                            placeholder="Yapılan işin açıklaması..." className="input-field resize-none" required />
                    </div>
                    <button type="submit" disabled={manualSubmitting}
                        className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center gap-2">
                        {manualSubmitting ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                        {manualSubmitting ? 'Gönderiliyor...' : 'Talep Oluştur'}
                    </button>
                </form>
            </Section>

            {/* ═══ SECTION: TALEPLERIM ═══ */}
            <Section
                icon={<ClipboardList size={18} />}
                title="Tüm Ek Mesai Taleplerim"
                count={filteredRequests.length}
                accent="slate"
            >
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <select value={requestFilter.status} onChange={e => setRequestFilter(f => ({...f, status: e.target.value}))}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-200 outline-none">
                        <option value="ALL">Tüm Durumlar</option>
                        <option value="PENDING">Bekliyor</option>
                        <option value="APPROVED">Onaylandı</option>
                        <option value="REJECTED">Reddedildi</option>
                        <option value="CANCELLED">İptal Edildi</option>
                    </select>
                    <select value={requestFilter.source} onChange={e => setRequestFilter(f => ({...f, source: e.target.value}))}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-200 outline-none">
                        <option value="ALL">Tüm Kaynaklar</option>
                        <option value="INTENDED">Planlı</option>
                        <option value="POTENTIAL">Plansız</option>
                        <option value="MANUAL">Manuel</option>
                    </select>
                </div>

                {filteredRequests.length === 0 ? (
                    <EmptyState icon={<ClipboardList size={20} className="text-slate-300" />} text="Ek mesai talebiniz bulunmuyor." />
                ) : (
                    <div className="space-y-2">
                        {filteredRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm text-slate-800">{formatDateTurkish(req.date)}</span>
                                        <SourceBadge type={req.source_type} />
                                        <StatusBadge status={req.status} />
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {req.start_time && req.end_time && `${req.start_time?.slice(0, 5)} - ${req.end_time?.slice(0, 5)} · `}
                                        {formatDuration(req.duration_seconds)}
                                        {req.reason && <> · <span className="text-slate-400 truncate">{req.reason.slice(0, 60)}{req.reason.length > 60 ? '...' : ''}</span></>}
                                    </div>
                                    {req.rejection_reason && req.status === 'REJECTED' && (
                                        <div className="text-xs text-red-500 mt-1">Sebep: {req.rejection_reason}</div>
                                    )}
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                    {req.status === 'PENDING' && (
                                        <button
                                            onClick={() => setCancelModal({ open: true, target: req })}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <XCircle size={12} /> İptal Et
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* ═══ MODALS ═══ */}
            <ClaimModal
                isOpen={claimModal.open}
                title={claimModal.title}
                subtitle={claimModal.subtitle}
                onClose={() => setClaimModal({ open: false, type: null, target: null, title: '', subtitle: '' })}
                onSubmit={handleClaim}
                loading={actionLoading}
            />
            <CancelModal
                isOpen={cancelModal.open}
                date={cancelModal.target ? formatDateTurkish(cancelModal.target.date) : ''}
                onClose={() => setCancelModal({ open: false, target: null })}
                onSubmit={handleCancel}
                loading={actionLoading}
            />
            {isManager && (
                <CreateAssignmentModal
                    isOpen={showAssignModal}
                    onClose={() => setShowAssignModal(false)}
                    onSuccess={fetchData}
                    teamMembers={teamMembers}
                />
            )}
        </div>
    );
};

export default AssignedOvertimeTab;
