import { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Clock, CalendarCheck, AlertCircle, CheckCircle2, XCircle, Timer, Loader2, ChevronDown, Calendar, Info, PenLine, Zap, Eye, Plus, FileText, Search } from 'lucide-react';
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
            if (past && !today && (assignment.actual_overtime_hours == null || assignment.actual_overtime_hours === 0)) {
                return {
                    label: 'Süresi Doldu',
                    color: 'bg-red-100 text-red-700',
                    icon: <XCircle size={12} />,
                    canClaim: false,
                };
            }
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

/* ----- Source Type Badge ----- */
function SourceBadge({ type }) {
    const configs = {
        INTENDED: { label: 'Planli', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        POTENTIAL: { label: 'Algilanan', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
        MANUAL: { label: 'Manuel', bg: 'bg-red-100 text-red-700 border-red-200' },
    };
    const cfg = configs[type] || configs.POTENTIAL;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg}`}>
            {cfg.label}
        </span>
    );
}

/* ----- Reusable Popup Modal (portal-based) ----- */
function ClaimModal({ open, onClose, title, icon, children }) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [open]);

    if (!open) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all">
                        <XCircle size={20} className="text-slate-400" />
                    </button>
                </div>
                {/* Body */}
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function AssignedOvertimeTab() {
    const [assignments, setAssignments] = useState([]);
    const [claimableData, setClaimableData] = useState({ intended: [], potential: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'past' | 'future'

    // Claim state for INTENDED items
    const [intendedClaimTarget, setIntendedClaimTarget] = useState(null);
    const [intendedReason, setIntendedReason] = useState('');
    const [intendedConfirmOpen, setIntendedConfirmOpen] = useState(false);

    // Claim state for POTENTIAL items
    const [potentialClaimTarget, setPotentialClaimTarget] = useState(null);
    const [potentialReason, setPotentialReason] = useState('');
    const [potentialConfirmOpen, setPotentialConfirmOpen] = useState(false);

    const [claimLoading, setClaimLoading] = useState(false);
    const [claimError, setClaimError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // --- Manual Entry State ---
    const [manualOpen, setManualOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        work_date: '',
        start_time: '',
        end_time: '',
        reason: '',
    });
    const [manualLoading, setManualLoading] = useState(false);
    const [manualError, setManualError] = useState('');

    // Collapsible sections
    const [intendedOpen, setIntendedOpen] = useState(true);
    const [potentialOpen, setPotentialOpen] = useState(true);
    const [allAssignmentsOpen, setAllAssignmentsOpen] = useState(true);

    // My OvertimeRequests
    const [myOvertimeRequests, setMyOvertimeRequests] = useState([]);
    const [searchText, setSearchText] = useState('');

    const fetchData = async () => {
        try {
            setError('');
            const [assignRes, claimableRes, requestsRes] = await Promise.allSettled([
                api.get('/overtime-assignments/'),
                api.get('/overtime-assignments/claimable/'),
                api.get('/overtime-requests/'),
            ]);

            // Assignments
            if (assignRes.status === 'fulfilled') {
                const data = assignRes.value.data?.results || assignRes.value.data || [];
                setAssignments(Array.isArray(data) ? data : []);
            } else {
                console.error('Assignments fetch error:', assignRes.reason);
                setAssignments([]);
            }

            // Claimable
            if (claimableRes.status === 'fulfilled') {
                const data = claimableRes.value.data || {};
                setClaimableData({
                    intended: Array.isArray(data.intended) ? data.intended : [],
                    potential: Array.isArray(data.potential) ? data.potential : [],
                });
            } else {
                console.error('Claimable fetch error:', claimableRes.reason);
                setClaimableData({ intended: [], potential: [] });
            }

            // My OvertimeRequests
            if (requestsRes.status === 'fulfilled') {
                const data = requestsRes.value.data?.results || requestsRes.value.data || [];
                setMyOvertimeRequests(Array.isArray(data) ? data : []);
            } else {
                console.error('OvertimeRequests fetch error:', requestsRes.reason);
                setMyOvertimeRequests([]);
            }

            // Only set error if all failed
            if (assignRes.status === 'rejected' && claimableRes.status === 'rejected' && requestsRes.status === 'rejected') {
                setError('Mesai verileri yuklenemedi.');
            }
        } catch (err) {
            console.error('AssignedOvertimeTab fetch error:', err);
            setError('Mesai verileri yuklenemedi.');
            setAssignments([]);
            setClaimableData({ intended: [], potential: [] });
            setMyOvertimeRequests([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Combined list for "Tum Isteklerim" section ---
    // POTENTIAL requests are excluded — they belong in "Algilanan Fazla Mesai" section
    const combinedItems = useMemo(() => {
        const assignmentItems = assignments.map(a => ({ ...a, _kind: 'assignment' }));
        const requestItems = myOvertimeRequests
            .filter(r => r.status !== 'POTENTIAL')
            .map(r => ({ ...r, _kind: 'request' }));

        let items = [...assignmentItems, ...requestItems];

        // Apply time filter
        if (filter === 'past') {
            items = items.filter(a => isDatePast(a.date) || isDateToday(a.date));
        } else if (filter === 'future') {
            items = items.filter(a => !isDatePast(a.date) && !isDateToday(a.date));
        }

        // Apply search filter
        if (searchText.trim()) {
            const q = searchText.trim().toLowerCase();
            items = items.filter(item => {
                const dateStr = formatDateTurkish(item.date).toLowerCase();
                const reason = (item.reason || item.task_description || '').toLowerCase();
                const status = item._kind === 'request'
                    ? (item.status || '').toLowerCase()
                    : (getStatusConfig(item)?.label || '').toLowerCase();
                const sourceType = (item.source_type || '').toLowerCase();
                return dateStr.includes(q) || reason.includes(q) || status.includes(q) || sourceType.includes(q);
            });
        }

        return items;
    }, [assignments, myOvertimeRequests, filter, searchText]);

    const sorted = useMemo(() => {
        return [...combinedItems].sort((a, b) => {
            const dateA = a._kind === 'request' ? a.date : a.date;
            const dateB = b._kind === 'request' ? b.date : b.date;
            return new Date(dateB) - new Date(dateA);
        });
    }, [combinedItems]);

    // Count for badge (exclude POTENTIAL — they are in "Algilanan Fazla Mesai")
    const totalItemsCount = useMemo(() => {
        const nonPotentialRequests = myOvertimeRequests.filter(r => r.status !== 'POTENTIAL');
        return assignments.length + nonPotentialRequests.length;
    }, [assignments, myOvertimeRequests]);

    // ==================== INTENDED Claim ====================
    const handleOpenIntendedClaim = (item) => {
        setIntendedClaimTarget(item);
        setIntendedReason('');
        setIntendedConfirmOpen(false);
        setClaimError('');
    };

    const handleCloseIntendedClaim = () => {
        setIntendedClaimTarget(null);
        setIntendedReason('');
        setIntendedConfirmOpen(false);
        setClaimError('');
    };

    const handleIntendedClaimSubmit = async () => {
        if (!intendedClaimTarget) return;
        if (!intendedReason.trim()) {
            setClaimError('Gerekce giriniz.');
            setIntendedConfirmOpen(false);
            return;
        }

        setClaimLoading(true);
        setClaimError('');
        try {
            await api.post(`/overtime-assignments/${intendedClaimTarget.assignment_id}/claim/`, {
                reason: intendedReason.trim(),
            });
            setSuccessMsg('Planli mesai talebi basariyla olusturuldu.');
            setTimeout(() => setSuccessMsg(''), 4000);
            handleCloseIntendedClaim();
            await fetchData();
        } catch (err) {
            const detail = err.response?.data?.detail || err.response?.data?.error || JSON.stringify(err.response?.data) || 'Talep olusturulamadi.';
            setClaimError(typeof detail === 'string' ? detail : 'Talep olusturulamadi.');
            setIntendedConfirmOpen(false);
        } finally {
            setClaimLoading(false);
        }
    };

    // ==================== POTENTIAL Claim ====================
    const handleOpenPotentialClaim = (item) => {
        setPotentialClaimTarget(item);
        setPotentialReason('');
        setPotentialConfirmOpen(false);
        setClaimError('');
    };

    const handleClosePotentialClaim = () => {
        setPotentialClaimTarget(null);
        setPotentialReason('');
        setPotentialConfirmOpen(false);
        setClaimError('');
    };

    const handlePotentialClaimSubmit = async () => {
        if (!potentialClaimTarget) return;
        if (!potentialReason.trim()) {
            setClaimError('Gerekce giriniz.');
            setPotentialConfirmOpen(false);
            return;
        }

        setClaimLoading(true);
        setClaimError('');
        try {
            await api.post('/overtime-requests/claim-potential/', {
                attendance_id: potentialClaimTarget.attendance_id,
                reason: potentialReason.trim(),
            });
            setSuccessMsg('Algilanan mesai talebi basariyla olusturuldu.');
            setTimeout(() => setSuccessMsg(''), 4000);
            handleClosePotentialClaim();
            await fetchData();
        } catch (err) {
            const detail = err.response?.data?.detail || err.response?.data?.error || JSON.stringify(err.response?.data) || 'Talep olusturulamadi.';
            setClaimError(typeof detail === 'string' ? detail : 'Talep olusturulamadi.');
            setPotentialConfirmOpen(false);
        } finally {
            setClaimLoading(false);
        }
    };

    // --- Manual Entry Handlers ---
    const handleManualReset = () => {
        setManualForm({ work_date: '', start_time: '', end_time: '', reason: '' });
        setManualError('');
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setManualError('');

        // Validation
        if (!manualForm.work_date) {
            setManualError('Tarih secimi zorunludur.');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(manualForm.work_date + 'T00:00:00');
        if (selectedDate > today) {
            setManualError('Gelecek tarih secilemez. Bugun veya gecmis tarih secin.');
            return;
        }

        if (!manualForm.start_time || !manualForm.end_time) {
            setManualError('Baslangic ve bitis saati zorunludur.');
            return;
        }

        if (manualForm.start_time >= manualForm.end_time) {
            setManualError('Bitis saati baslangic saatinden sonra olmalidir.');
            return;
        }

        // Bugün seçildiyse bitiş saati şu anki saatten sonra olamaz
        const isToday = selectedDate.getTime() === today.getTime();
        if (isToday) {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            if (manualForm.end_time > currentTime) {
                setManualError('Bugun icin bitis saati su anki saatten sonra olamaz.');
                return;
            }
        }

        if (!manualForm.reason.trim()) {
            setManualError('Sebep alani zorunludur.');
            return;
        }

        if (manualForm.reason.trim().length > 500) {
            setManualError('Sebep en fazla 500 karakter olabilir.');
            return;
        }

        setManualLoading(true);
        try {
            await api.post('/overtime-requests/manual-entry/', {
                date: manualForm.work_date,
                start_time: manualForm.start_time,
                end_time: manualForm.end_time,
                reason: manualForm.reason.trim(),
            });
            setSuccessMsg('Manuel mesai girisi basariyla olusturuldu.');
            setTimeout(() => setSuccessMsg(''), 4000);
            handleManualReset();
            setManualOpen(false);
            await fetchData();
        } catch (err) {
            const data = err.response?.data;
            let msg = 'Manuel giris olusturulamadi.';
            if (data) {
                if (typeof data === 'string') msg = data;
                else if (data.detail) msg = data.detail;
                else if (data.error) msg = data.error;
                else if (data.non_field_errors) msg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors;
                else {
                    // Collect field-level errors
                    const fieldErrors = Object.entries(data)
                        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                        .join(' | ');
                    if (fieldErrors) msg = fieldErrors;
                }
            }
            setManualError(msg);
        } finally {
            setManualLoading(false);
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
    if (error && assignments.length === 0 && claimableData.intended.length === 0 && claimableData.potential.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                    <AlertCircle size={32} className="text-red-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Hata</h3>
                <p className="text-sm text-slate-500 mt-1">{error}</p>
                <button onClick={() => { setLoading(true); fetchData(); }} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                    Tekrar Dene
                </button>
            </div>
        );
    }

    const hasClaimable = claimableData.intended.length > 0 || claimableData.potential.length > 0;

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

            {/* ==================== Tum Isteklerim (Full List - FIRST SECTION) ==================== */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-all">
                    <button
                        onClick={() => setAllAssignmentsOpen(!allAssignmentsOpen)}
                        className="flex items-center gap-3 flex-1"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                            <Eye size={22} />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-slate-800">Tum Isteklerim</h3>
                                {totalItemsCount > 0 && (
                                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[11px] font-bold rounded-full">
                                        {totalItemsCount}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">Ek mesai taleplerinizi yonetin ve takip edin</p>
                        </div>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); setManualOpen(true); setManualError(''); }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                            <Plus size={16} />
                            Istek Olustur
                        </button>
                        <button onClick={() => setAllAssignmentsOpen(!allAssignmentsOpen)} className="p-1">
                            <div className={`transition-transform duration-200 ${allAssignmentsOpen ? 'rotate-180' : ''}`}>
                                <ChevronDown size={20} className="text-slate-400" />
                            </div>
                        </button>
                    </div>
                </div>

                {allAssignmentsOpen && (
                    <div className="border-t border-slate-100">
                        {/* Filters */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Time filter */}
                                <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
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
                                {/* Search filter */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        placeholder="Tarih, aciklama ara..."
                                        className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 w-48 sm:w-56"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Empty State */}
                        {sorted.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                                    <CalendarCheck size={24} className="text-slate-300" />
                                </div>
                                <p className="text-sm text-slate-500">
                                    {searchText.trim()
                                        ? 'Aramanizla eslesen sonuc bulunamadi.'
                                        : filter === 'past'
                                        ? 'Gerceklesmis mesai istegi bulunamadi.'
                                        : filter === 'future'
                                        ? 'Gelecek tarihli mesai istegi bulunamadi.'
                                        : 'Henuz ek mesai istegi bulunmamaktadir.'}
                                </p>
                            </div>
                        )}

                        {/* Combined Cards */}
                        <div className="divide-y divide-slate-100">
                            {sorted.map(item => {
                                if (item._kind === 'request') {
                                    // OvertimeRequest card
                                    const reqStatusConfig = {
                                        PENDING: { label: 'Onay Bekliyor', color: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
                                        APPROVED: { label: 'Onaylandi', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> },
                                        REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
                                        CANCELLED: { label: 'Iptal Edildi', color: 'bg-slate-100 text-slate-500', icon: <XCircle size={12} /> },
                                    };
                                    const sCfg = reqStatusConfig[item.status] || { label: item.status, color: 'bg-slate-100 text-slate-600', icon: <Info size={12} /> };
                                    const durationMin = item.duration_seconds ? Math.round(item.duration_seconds / 60) : null;
                                    const durationHours = durationMin ? (durationMin / 60).toFixed(1) : null;

                                    return (
                                        <div key={`req-${item.id}`} className="p-5 hover:bg-slate-50/30 transition-all">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                                                        item.status === 'APPROVED' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                                                        item.status === 'REJECTED' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                                        item.status === 'PENDING' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                                                        'bg-gradient-to-br from-slate-400 to-slate-500'
                                                    }`}>
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h4 className="font-bold text-slate-800 text-sm">
                                                                {formatDateTurkish(item.date)}
                                                            </h4>
                                                            {durationHours && (
                                                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full">
                                                                    {durationHours} saat
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                                            {item.start_time && <span>Baslangic: <span className="font-semibold text-slate-700">{item.start_time.slice(0, 5)}</span></span>}
                                                            {item.end_time && <span>Bitis: <span className="font-semibold text-slate-700">{item.end_time.slice(0, 5)}</span></span>}
                                                            {item.target_approver_name && <span>Onaylayan: <span className="font-semibold text-slate-700">{item.target_approver_name}</span></span>}
                                                        </div>
                                                        {item.reason && (
                                                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                                <Info size={11} />
                                                                {item.reason}
                                                            </p>
                                                        )}
                                                        {/* Status Badge */}
                                                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sCfg.color}`}>
                                                                {sCfg.icon}
                                                                {sCfg.label}
                                                            </span>
                                                            {item.source_type && (
                                                                <SourceBadge type={item.source_type} />
                                                            )}
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                                                <FileText size={10} />
                                                                Talep
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // OvertimeAssignment card (existing)
                                const statusCfg = getStatusConfig(item);
                                return (
                                    <div key={`all-${item.id}`} className="p-5 hover:bg-slate-50/30 transition-all">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                                                    statusCfg.canClaim ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                                                    item.status === 'CLAIMED' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                                                    item.status === 'EXPIRED' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                                    !isDatePast(item.date) ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                                                    'bg-gradient-to-br from-slate-400 to-slate-500'
                                                }`}>
                                                    <Calendar size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <h4 className="font-bold text-slate-800 text-sm">
                                                            {formatDateTurkish(item.date)}
                                                        </h4>
                                                        <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full">
                                                            {item.max_duration_hours} saat maks
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        Atayan: <span className="font-semibold text-slate-700">{item.assigned_by_name || '-'}</span>
                                                    </p>
                                                    {item.notes && (
                                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <Info size={11} />
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                    {/* Status Badge */}
                                                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusCfg.color}`}>
                                                            {statusCfg.icon}
                                                            {statusCfg.label}
                                                        </span>
                                                        {item.source_type && (
                                                            <SourceBadge type={item.source_type} />
                                                        )}
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                                                            <Calendar size={10} />
                                                            Atama
                                                        </span>
                                                        {item.overtime_request && item.status === 'CLAIMED' && (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                Talep #{item.overtime_request}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ==================== Manual Overtime Entry Button ==================== */}
            <button
                onClick={() => { setManualOpen(true); setManualError(''); }}
                className="w-full flex items-center gap-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50/50 transition-all active:scale-[0.99]"
            >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shrink-0">
                    <PenLine size={22} />
                </div>
                <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-800">Manuel Ek Mesai Girisi</h3>
                        <SourceBadge type="MANUAL" />
                    </div>
                    <p className="text-xs text-slate-500">Kart kaydi olmayan gunler icin mesai girisi yapin</p>
                </div>
                <PenLine size={20} className="text-slate-400 shrink-0" />
            </button>

            {/* Manual Entry Modal */}
            <ClaimModal
                open={manualOpen}
                onClose={() => { handleManualReset(); setManualOpen(false); }}
                title="Manuel Ek Mesai Girisi"
                icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white"><PenLine size={18} /></div>}
            >
                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-1">
                        <p className="text-xs text-slate-600 flex items-center gap-2">
                            <Info size={14} className="text-orange-500 shrink-0" />
                            Kart okuyucu kaydi olmayan gunler icin mesai bilgilerinizi girebilirsiniz.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
                            <input
                                type="date"
                                value={manualForm.work_date}
                                max={(() => {
                                    const yesterday = new Date();
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    return yesterday.toISOString().split('T')[0];
                                })()}
                                onChange={e => setManualForm({ ...manualForm, work_date: e.target.value })}
                                className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Baslangic Saati</label>
                            <input
                                type="time"
                                value={manualForm.start_time}
                                onChange={e => setManualForm({ ...manualForm, start_time: e.target.value })}
                                className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Bitis Saati</label>
                            <input
                                type="time"
                                value={manualForm.end_time}
                                onChange={e => setManualForm({ ...manualForm, end_time: e.target.value })}
                                className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">
                            Sebep <span className="text-slate-400 font-normal">(zorunlu, maks 500 karakter)</span>
                        </label>
                        <textarea
                            rows="3"
                            value={manualForm.reason}
                            onChange={e => setManualForm({ ...manualForm, reason: e.target.value })}
                            maxLength={500}
                            className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                            placeholder="Ornegin: Acil proje teslimi nedeniyle fazla mesai yapildi..."
                            required
                        />
                        {manualForm.reason.length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-1 text-right">{manualForm.reason.length}/500</p>
                        )}
                    </div>

                    {manualError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={14} />
                            {manualError}
                        </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => { handleManualReset(); setManualOpen(false); }}
                            className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm transition-all"
                        >
                            Iptal
                        </button>
                        <button
                            type="submit"
                            disabled={manualLoading}
                            className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl text-sm hover:bg-orange-700 shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {manualLoading ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                            Manuel Giris Gonder
                        </button>
                    </div>
                </form>
            </ClaimModal>

            {/* ==================== Section A: Planli Mesai (INTENDED) ==================== */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setIntendedOpen(!intendedOpen)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
                            <CalendarCheck size={22} />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-slate-800">Planli Mesai Istekleri</h3>
                                <SourceBadge type="INTENDED" />
                                {claimableData.intended.length > 0 && (
                                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-full">
                                        {claimableData.intended.length}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">Yoneticiniz tarafindan atanmis mesailer. Gecmise yonelik 2 mali ay icinde talep edilebilir.</p>
                        </div>
                    </div>
                    <div className={`transition-transform duration-200 ${intendedOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={20} className="text-slate-400" />
                    </div>
                </button>

                {intendedOpen && (
                    <div className="border-t border-slate-100">
                        {claimableData.intended.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3 border border-emerald-100">
                                    <CalendarCheck size={24} className="text-emerald-300" />
                                </div>
                                <p className="text-sm text-slate-500">Talep edilebilir planli mesai istegi bulunamadi.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {claimableData.intended.map((item) => {
                                    const isPast = isDatePast(item.date) && !isDateToday(item.date);
                                    const hasNoOT = !item.actual_overtime_hours || item.actual_overtime_hours === 0;
                                    const isExpired = isPast && hasNoOT;

                                    return (
                                        <div key={`intended-${item.assignment_id}`} className={`p-5 transition-all ${isExpired ? 'opacity-50' : 'hover:bg-slate-50/30'}`}>
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                                                        isExpired ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                                    }`}>
                                                        <Calendar size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h4 className={`font-bold text-base ${isExpired ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                                {formatDateTurkish(item.date)}
                                                            </h4>
                                                            {item.is_today && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full">Bugun</span>
                                                            )}
                                                            {isExpired && (
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[11px] font-bold rounded-full flex items-center gap-1">
                                                                    <XCircle size={10} />
                                                                    Gerceklesmedi
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                                                            <span>Atayan: <span className="font-semibold text-slate-700">{item.manager_name || '-'}</span></span>
                                                            <span>Maks: <span className="font-semibold text-violet-700">{item.max_duration_hours} saat</span></span>
                                                            <span>Gerceklesen: <span className={`font-semibold ${isExpired ? 'text-red-500' : 'text-emerald-700'}`}>{item.actual_overtime_hours ?? '-'} saat</span></span>
                                                        </div>
                                                        {item.task_description && (
                                                            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                                                <Info size={12} className="shrink-0" />
                                                                {item.task_description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                                            {item.shift_end_time && <span>Vardiya bitis: {item.shift_end_time}</span>}
                                                            {item.check_out_time && <span>Cikis: {item.check_out_time}</span>}
                                                        </div>
                                                        <div className="mt-2">
                                                            <SourceBadge type="INTENDED" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Claim Button — hidden for expired items */}
                                                {!item.already_claimed && !isExpired && (
                                                    <button
                                                        onClick={() => handleOpenIntendedClaim(item)}
                                                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                                                    >
                                                        <Clock size={16} />
                                                        Talep Et
                                                    </button>
                                                )}
                                                {item.already_claimed && (
                                                    <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold flex items-center gap-1.5 shrink-0">
                                                        <CheckCircle2 size={16} />
                                                        Talep Edildi
                                                    </span>
                                                )}
                                                {isExpired && !item.already_claimed && (
                                                    <span className="px-4 py-2 bg-red-50 text-red-400 rounded-xl text-sm font-bold flex items-center gap-1.5 shrink-0">
                                                        <XCircle size={16} />
                                                        Suresi Doldu
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* INTENDED Claim Modal */}
            <ClaimModal
                open={intendedClaimTarget !== null}
                onClose={handleCloseIntendedClaim}
                title="Planli Mesai Talebi"
                icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white"><CalendarCheck size={18} /></div>}
            >
                {intendedClaimTarget && (
                    <div className="space-y-4">
                        {/* Item details */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={16} className="text-emerald-600" />
                                <span className="font-bold text-slate-800">{formatDateTurkish(intendedClaimTarget.date)}</span>
                                {intendedClaimTarget.is_today && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full">Bugun</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-slate-500">Atayan: <span className="font-semibold text-slate-700">{intendedClaimTarget.manager_name || '-'}</span></div>
                                <div className="text-slate-500">Maks sure: <span className="font-semibold text-violet-700">{intendedClaimTarget.max_duration_hours} saat</span></div>
                                <div className="text-slate-500">Gerceklesen: <span className="font-semibold text-emerald-700">{intendedClaimTarget.actual_overtime_hours ?? '-'} saat</span></div>
                                {intendedClaimTarget.claimable_hours != null && (
                                    <div className="text-slate-500">Talep edilecek: <span className="font-semibold text-emerald-700">{intendedClaimTarget.claimable_hours} saat</span></div>
                                )}
                            </div>
                            {intendedClaimTarget.task_description && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 pt-1 border-t border-emerald-100">
                                    <Info size={12} className="shrink-0 text-emerald-500" />
                                    {intendedClaimTarget.task_description}
                                </p>
                            )}
                        </div>

                        {/* Auto-fill info */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-xs text-slate-600 flex items-center gap-2">
                                <Info size={14} className="text-blue-500 shrink-0" />
                                Baslangic/bitis saati ve sure otomatik olarak devam kaydinden doldurulacaktir.
                            </p>
                        </div>

                        {/* Reason textarea */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Gerekce <span className="text-red-400">*</span></label>
                            <textarea
                                rows="3"
                                value={intendedReason}
                                onChange={e => setIntendedReason(e.target.value)}
                                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none"
                                placeholder="Mesai gerekce aciklamasi..."
                            />
                        </div>

                        {/* Error */}
                        {claimError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={14} />
                                {claimError}
                            </div>
                        )}

                        {/* Confirmation step INSIDE modal */}
                        {intendedConfirmOpen ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm font-bold text-amber-800 mb-3">
                                    Emin misiniz? Bu atama icin bir kez talep edilebilir.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIntendedConfirmOpen(false)}
                                        disabled={claimLoading}
                                        className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg text-sm transition-all"
                                    >
                                        Vazgec
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleIntendedClaimSubmit}
                                        disabled={claimLoading}
                                        className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {claimLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        Onayla
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleCloseIntendedClaim}
                                    className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm transition-all"
                                >
                                    Iptal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!intendedReason.trim()) {
                                            setClaimError('Gerekce giriniz.');
                                            return;
                                        }
                                        setClaimError('');
                                        setIntendedConfirmOpen(true);
                                    }}
                                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    Talep Et
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </ClaimModal>

            {/* ==================== Section B: Algilanan Mesai (POTENTIAL) ==================== */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setPotentialOpen(!potentialOpen)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                            <Zap size={22} />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-slate-800">Algilanan Fazla Mesai</h3>
                                <SourceBadge type="POTENTIAL" />
                                {claimableData.potential.length > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-600 text-white text-[11px] font-bold rounded-full">
                                        {claimableData.potential.length}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">Kart okuyucu verisinden algilanan fazla mesailer. Gecmise yonelik 2 mali ay icinde talep edilebilir.</p>
                        </div>
                    </div>
                    <div className={`transition-transform duration-200 ${potentialOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={20} className="text-slate-400" />
                    </div>
                </button>

                {potentialOpen && (
                    <div className="border-t border-slate-100">
                        {claimableData.potential.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-3 border border-amber-100">
                                    <Zap size={24} className="text-amber-300" />
                                </div>
                                <p className="text-sm text-slate-500">Talep edilebilir algilanan mesai bulunamadi.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {claimableData.potential.map((item) => {
                                    return (
                                        <div key={`potential-${item.attendance_id}`} className="p-5 hover:bg-slate-50/30 transition-all">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                        <Zap size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h4 className="font-bold text-slate-800 text-base">
                                                                {formatDateTurkish(item.date)}
                                                            </h4>
                                                            {item.is_today && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full">Bugun</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                                                            <span>Fazla mesai: <span className="font-semibold text-amber-700">{item.actual_overtime_hours} saat</span></span>
                                                            <span>Vardiya bitis: <span className="font-semibold text-slate-700">{item.shift_end_time || '-'}</span></span>
                                                            <span>Cikis: <span className="font-semibold text-slate-700">{item.check_out_time || '-'}</span></span>
                                                        </div>
                                                        <div className="mt-2">
                                                            <SourceBadge type="POTENTIAL" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Claim Button */}
                                                {!item.already_claimed && (
                                                    <button
                                                        onClick={() => handleOpenPotentialClaim(item)}
                                                        className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                                                    >
                                                        <Clock size={16} />
                                                        Talep Et
                                                    </button>
                                                )}
                                                {item.already_claimed && (
                                                    <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold flex items-center gap-1.5 shrink-0">
                                                        <CheckCircle2 size={16} />
                                                        Talep Edildi
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* POTENTIAL Claim Modal */}
            <ClaimModal
                open={potentialClaimTarget !== null}
                onClose={handleClosePotentialClaim}
                title="Algilanan Mesai Talebi"
                icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white"><Zap size={18} /></div>}
            >
                {potentialClaimTarget && (
                    <div className="space-y-4">
                        {/* Item details */}
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={16} className="text-amber-600" />
                                <span className="font-bold text-slate-800">{formatDateTurkish(potentialClaimTarget.date)}</span>
                                {potentialClaimTarget.is_today && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full">Bugun</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-slate-500">Fazla mesai: <span className="font-semibold text-amber-700">{potentialClaimTarget.actual_overtime_hours} saat</span></div>
                                <div className="text-slate-500">Vardiya bitis: <span className="font-semibold text-slate-700">{potentialClaimTarget.shift_end_time || '-'}</span></div>
                                <div className="text-slate-500">Cikis: <span className="font-semibold text-slate-700">{potentialClaimTarget.check_out_time || '-'}</span></div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-xs text-slate-600 flex items-center gap-2">
                                <Info size={14} className="text-blue-500 shrink-0" />
                                Bu gun icin mesai atamaniz bulunmuyor. Kart okuyucu verilerinize gore fazla mesai algilanmistir.
                            </p>
                        </div>

                        {/* Reason textarea */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Gerekce <span className="text-red-400">*</span></label>
                            <textarea
                                rows="3"
                                value={potentialReason}
                                onChange={e => setPotentialReason(e.target.value)}
                                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                                placeholder="Mesai gerekce aciklamasi..."
                            />
                        </div>

                        {/* Error */}
                        {claimError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={14} />
                                {claimError}
                            </div>
                        )}

                        {/* Confirmation step INSIDE modal */}
                        {potentialConfirmOpen ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm font-bold text-amber-800 mb-3">
                                    Emin misiniz? Bu mesai icin bir kez talep edilebilir.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setPotentialConfirmOpen(false)}
                                        disabled={claimLoading}
                                        className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg text-sm transition-all"
                                    >
                                        Vazgec
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePotentialClaimSubmit}
                                        disabled={claimLoading}
                                        className="px-5 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {claimLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        Onayla
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleClosePotentialClaim}
                                    className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm transition-all"
                                >
                                    Iptal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!potentialReason.trim()) {
                                            setClaimError('Gerekce giriniz.');
                                            return;
                                        }
                                        setClaimError('');
                                        setPotentialConfirmOpen(true);
                                    }}
                                    className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-sm hover:bg-amber-700 shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    Talep Et
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </ClaimModal>

        </div>
    );
}
