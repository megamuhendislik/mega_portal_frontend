import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    Clock, XCircle, Users, Loader2, PenLine, Send,
    ClipboardList, CalendarCheck, X, LogIn, LogOut,
    Coffee, Briefcase, Sun, Eye
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CreateAssignmentModal from '../../components/overtime/CreateAssignmentModal';
import RequestDetailModal from '../../components/RequestDetailModal';

// CONSTANTS & HELPERS
const DAY_NAMES = ['Pazar', 'Pazartesi', 'Sal\u0131', '\u00c7ar\u015famba', 'Per\u015fembe', 'Cuma', 'Cumartesi'];
const MONTH_NAMES = ['Ocak', '\u015eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00fcl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];

function formatDateTurkish(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${DAY_NAMES[d.getDay()]}`;
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0 dk';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h} sa ${m} dk`;
    if (h > 0) return `${h} sa`;
    return `${m} dk`;
}

// MICRO COMPONENTS
const Pill = ({ children, color = 'slate' }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        slate: 'bg-slate-100 text-slate-500 border-slate-200',
        sky: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${colors[color]}`}>
            {children}
        </span>
    );
};

const SourceBadge = ({ type }) => {
    const map = { INTENDED: ['Planl\u0131', 'emerald'], POTENTIAL: ['Alg\u0131lanan', 'amber'], MANUAL: ['Manuel', 'blue'] };
    const [label, color] = map[type] || [type || '?', 'slate'];
    return <Pill color={color}>{label}</Pill>;
};

const StatusBadge = ({ status }) => {
    const map = {
        PENDING: ['Bekliyor', 'amber'],
        APPROVED: ['Onayland\u0131', 'emerald'],
        REJECTED: ['Reddedildi', 'red'],
        CANCELLED: ['\u0130ptal', 'slate'],
    };
    const [label, color] = map[status] || [status, 'slate'];
    return <Pill color={color}>{label}</Pill>;
};

const AssignmentStatusBadge = ({ status }) => {
    const map = {
        ASSIGNED: ['Atand\u0131', 'blue'],
        CLAIMED: ['Talep Edildi', 'emerald'],
        EXPIRED: ['S\u00fcresi Doldu', 'slate'],
        CANCELLED: ['\u0130ptal', 'red'],
    };
    const [label, color] = map[status] || [status, 'slate'];
    return <Pill color={color}>{label}</Pill>;
};

const EmptyState = ({ text }) => (
    <div className="py-12 text-center">
        <p className="text-sm text-slate-400 font-medium">{text}</p>
    </div>
);

const SectionHeader = ({ icon, title, count, children }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            {icon && <span className="text-slate-400">{icon}</span>}
            <h3 className="font-bold text-slate-800 text-[15px] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
            {count !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">{count}</span>
            )}
        </div>
        {children}
    </div>
);

// MODALS
const ClaimModal = ({ isOpen, title, subtitle, onClose, onSubmit, loading, weeklyOtStatus }) => {
    const [reason, setReason] = useState('');
    if (!isOpen) return null;
    const isOverLimit = weeklyOtStatus?.is_over_limit;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}

                {/* Weekly OT Limit Warning */}
                {weeklyOtStatus && !weeklyOtStatus.is_unlimited && (
                    <div className={`px-3 py-2 rounded-xl text-sm font-medium border ${
                        isOverLimit
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                        <p className="font-bold text-xs mb-0.5">
                            Haftal\u0131k Mesai: {weeklyOtStatus.used_hours}/{weeklyOtStatus.limit_hours} saat
                        </p>
                        {isOverLimit ? (
                            <p className="text-xs">Son 7 g\u00fcnde ek mesai limitinize ula\u015ft\u0131n\u0131z. Yeni talep olu\u015fturamazs\u0131n\u0131z.</p>
                        ) : (
                            <p className="text-xs">Kalan: {weeklyOtStatus.remaining_hours} saat</p>
                        )}
                    </div>
                )}

                <textarea rows="3" value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="A\u00e7\u0131klama (opsiyonel)..." className="input-field resize-none" />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazge\u00e7</button>
                    <button onClick={() => { onSubmit(reason); setReason(''); }} disabled={loading || isOverLimit}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
                        {loading ? 'G\u00f6nderiliyor...' : isOverLimit ? 'Limit Dolu' : 'Talep Et'}
                    </button>
                </div>
            </div>
        </div>, document.body
    );
};

const ManualEntryModal = ({ isOpen, onClose, onSubmit, loading, fetchWeeklyOtStatus, weeklyOtStatus }) => {
    const [form, setForm] = useState({ date: '', start_time: '', end_time: '', reason: '' });
    const [error, setError] = useState('');
    const isOverLimit = weeklyOtStatus?.is_over_limit;

    if (!isOpen) return null;

    const handleDateChange = (newDate) => {
        setForm(prev => ({ ...prev, date: newDate }));
        if (newDate && fetchWeeklyOtStatus) fetchWeeklyOtStatus(newDate);
    };

    const handleSubmit = () => {
        if (!form.date || !form.start_time || !form.end_time) { setError('T\u00fcm alanlar\u0131 doldurunuz.'); return; }
        if (form.end_time <= form.start_time) { setError('Biti\u015f saati ba\u015flang\u0131\u00e7tan b\u00fcy\u00fck olmal\u0131.'); return; }
        if (!form.reason.trim()) { setError('A\u00e7\u0131klama giriniz.'); return; }
        if (isOverLimit) { setError('Haftal\u0131k ek mesai limitinize ula\u015ft\u0131n\u0131z.'); return; }
        setError('');
        onSubmit(form);
    };

    const handleClose = () => {
        setForm({ date: '', start_time: '', end_time: '', reason: '' });
        setError('');
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Manuel Ek Mesai Giri\u015fi</h3>
                    <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium">{error}</div>}

                {/* Weekly OT Limit Warning */}
                {weeklyOtStatus && !weeklyOtStatus.is_unlimited && (
                    <div className={`px-3 py-2 rounded-xl text-sm font-medium border ${
                        isOverLimit
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                        <p className="font-bold text-xs mb-0.5">
                            Haftal\u0131k Mesai: {weeklyOtStatus.used_hours}/{weeklyOtStatus.limit_hours} saat
                        </p>
                        {isOverLimit ? (
                            <p className="text-xs">Son 7 g\u00fcnde ek mesai limitinize ula\u015ft\u0131n\u0131z.</p>
                        ) : (
                            <p className="text-xs">Kalan: {weeklyOtStatus.remaining_hours} saat</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
                        <input type="date" value={form.date} onChange={e => handleDateChange(e.target.value)} className="input-field" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Ba\u015flang\u0131\u00e7</label>
                        <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="input-field" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Biti\u015f</label>
                        <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="input-field" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">A\u00e7\u0131klama</label>
                    <textarea rows="2" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                        placeholder="Yap\u0131lan i\u015fin a\u00e7\u0131klamas\u0131..." className="input-field resize-none" />
                </div>
                <div className="flex gap-2">
                    <button onClick={handleClose} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazge\u00e7</button>
                    <button onClick={handleSubmit} disabled={loading || isOverLimit}
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                        {loading ? 'G\u00f6nderiliyor...' : isOverLimit ? 'Limit Dolu' : 'Talep Olu\u015ftur'}
                    </button>
                </div>
            </div>
        </div>, document.body
    );
};

const CancelConfirmModal = ({ isOpen, date, onClose, onSubmit, loading }) => {
    const [reason, setReason] = useState('');
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    <XCircle size={20} className="text-red-500" /> Talebi \u0130ptal Et
                </h3>
                <p className="text-sm text-slate-500"><strong>{date}</strong> tarihli talebi iptal etmek istedi\u011finize emin misiniz?</p>
                <textarea rows="2" value={reason} onChange={e => setReason(e.target.value)} placeholder="\u0130ptal sebebi (opsiyonel)" className="input-field resize-none" />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazge\u00e7</button>
                    <button onClick={() => { onSubmit(reason); setReason(''); }} disabled={loading}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-500/20 disabled:opacity-50">
                        \u0130ptal Et
                    </button>
                </div>
            </div>
        </div>, document.body
    );
};

// CLAIMABLE CARD
const ClaimableCard = ({ item, type, onClaim }) => {
    const entries = item.entries || [];
    const isOffDay = item.is_off_day;
    const d = new Date(item.date + 'T00:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();

    const showClaimButton = type === 'potential'
        ? (item.actual_overtime_seconds > 0 && !item.already_claimed && !item.claim_status)
        : (item.actual_overtime_hours > 0 && !item.already_claimed && !item.claim_status);

    return (
        <div className="rounded-xl border border-slate-100 bg-white hover:border-blue-200 transition-all overflow-hidden">
            <div className="flex">
                <div className={`w-[72px] flex-shrink-0 flex flex-col items-center justify-center py-3 ${isOffDay ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <span className="text-[22px] font-black text-slate-800 leading-none">{dayNum}</span>
                    <span className="text-[10px] font-bold text-slate-500 mt-0.5">{monthName} {year}</span>
                    <span className={`text-[10px] font-bold mt-0.5 ${isOffDay ? 'text-amber-600' : 'text-slate-400'}`}>{dayName}</span>
                    {isOffDay && <span className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-100 text-amber-700">TATIL</span>}
                </div>

                <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                        {item.shift_start_time && item.shift_end_time && !isOffDay && (
                            <span className="flex items-center gap-1"><Briefcase size={11} className="text-slate-400" /> Vardiya: {item.shift_start_time} - {item.shift_end_time}</span>
                        )}
                        {isOffDay && <span className="flex items-center gap-1 text-amber-600 font-bold"><Sun size={11} /> Tatil / \u0130zin G\u00fcn\u00fc</span>}
                    </div>
                    {entries.length > 0 && (
                        <div className="space-y-1 mb-2">
                            {entries.map((e, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    {entries.length > 1 && <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] font-extrabold flex items-center justify-center flex-shrink-0">{idx + 1}</span>}
                                    <span className="flex items-center gap-1 text-emerald-700 font-medium"><LogIn size={10} /> {e.check_in || '-'}</span>
                                    <span className="text-slate-300">-&gt;</span>
                                    <span className="flex items-center gap-1 text-red-600 font-medium"><LogOut size={10} /> {e.check_out || '-'}</span>
                                    {e.total_seconds > 0 && <span className="text-slate-400 ml-1">({formatDuration(e.total_seconds)})</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    {type === 'potential' && item.start_time && item.end_time && item.actual_overtime_seconds > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-purple-700 mb-1.5"><Clock size={10} /><span className="font-bold">{item.start_time} - {item.end_time}</span></div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        {item.total_work_hours > 0 && <span className="text-slate-500">Toplam: <strong className="text-slate-700">{item.total_work_hours} sa</strong></span>}
                        <span className="text-slate-500">Fazla Mesai: <strong className={type === 'potential' ? 'text-purple-700' : 'text-blue-700'}>{item.actual_overtime_hours} sa</strong></span>
                        {item.total_break_seconds > 0 && <span className="flex items-center gap-0.5 text-slate-400"><Coffee size={10} /> {formatDuration(item.total_break_seconds)}</span>}
                        {type === 'intended' && <span className="text-slate-500">Maks: <strong className="text-slate-700">{item.max_duration_hours} sa</strong></span>}
                    </div>
                    {item.manager_name && <div className="text-[11px] text-slate-400 mt-1">Atayan: {item.manager_name}</div>}
                    {item.task_description && <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">{item.task_description}</div>}
                </div>

                {/* Action column */}
                <div className="flex flex-col items-end justify-center gap-1.5 px-3 flex-shrink-0">
                    {item.claim_status === 'APPROVED' ? (
                        <Pill color="emerald">Onayland\u0131</Pill>
                    ) : item.claim_status === 'PENDING' ? (
                        <Pill color="amber">Bekliyor</Pill>
                    ) : item.is_rejected ? (
                        <>
                            <Pill color="red">Reddedildi</Pill>
                            <button onClick={onClaim}
                                className="px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700">
                                <Send size={10} /> Tekrar Talep
                            </button>
                        </>
                    ) : showClaimButton ? (
                        <button onClick={onClaim}
                            className={`px-3.5 py-1.5 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 ${
                                type === 'potential' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}>
                            <Send size={11} /> Talep Et
                        </button>
                    ) : (
                        <Pill color="slate">Bekleniyor</Pill>
                    )}
                </div>
            </div>
        </div>
    );
};

// MAIN COMPONENT
const OvertimeRequestsTab = ({ onDataChange, refreshTrigger }) => {
    const { hasPermission } = useAuth();

    // Data
    const [loading, setLoading] = useState(true);
    const [isManager, setIsManager] = useState(false);
    const [claimableData, setClaimableData] = useState({ intended: [], potential: [] });
    const [myRequests, setMyRequests] = useState([]);
    const [teamAssignments, setTeamAssignments] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);

    // Weekly OT Limit
    const [weeklyOtStatus, setWeeklyOtStatus] = useState(null);

    const fetchWeeklyOtStatus = useCallback(async (refDate) => {
        try {
            const params = refDate ? `?reference_date=${refDate}` : '';
            const res = await api.get(`/overtime-requests/weekly-ot-status/${params}`);
            setWeeklyOtStatus(res.data);
        } catch (err) {
            console.error('Weekly OT status fetch error:', err);
        }
    }, []);

    useEffect(() => { fetchWeeklyOtStatus(); }, [fetchWeeklyOtStatus]);

    // Modals
    const [claimModal, setClaimModal] = useState({ open: false, type: null, target: null, title: '', subtitle: '' });
    const [cancelModal, setCancelModal] = useState({ open: false, target: null });
    const [showManualModal, setShowManualModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ open: false, request: null });
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch all data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const calls = [
                api.get('/overtime-assignments/claimable/'),
                api.get('/overtime-requests/'),
                api.get('/employees/subordinates/'),
            ];
            const results = await Promise.allSettled(calls);

            if (results[0].status === 'fulfilled') setClaimableData(results[0].value.data);
            if (results[1].status === 'fulfilled') setMyRequests(results[1].value.data);

            // Manager check
            let managerDetected = hasPermission('APPROVAL_OVERTIME');
            if (results[2].status === 'fulfilled') {
                const subs = results[2].value.data;
                const subList = Array.isArray(subs) ? subs : (subs.results || []);
                if (subList.length > 0) managerDetected = true;
            }
            setIsManager(managerDetected);

            // Manager-only fetches
            if (managerDetected) {
                const mgrCalls = [
                    api.get('/overtime-assignments/team/'),
                    api.get('/employees/', { params: { page_size: 200 } }),
                ];
                const mgrResults = await Promise.allSettled(mgrCalls);
                let rawAssignments = [];
                if (mgrResults[0].status === 'fulfilled') {
                    rawAssignments = mgrResults[0].value.data;
                    // Enrich team assignments with weekly OT status
                    const enriched = await Promise.all(
                        (Array.isArray(rawAssignments) ? rawAssignments : []).map(async (a) => {
                            try {
                                const res = await api.get(`/overtime-requests/weekly-ot-status/?employee_id=${a.employee}&reference_date=${a.date}`);
                                return { ...a, _weeklyOtStatus: res.data };
                            } catch {
                                return a;
                            }
                        })
                    );
                    setTeamAssignments(enriched);
                }
                if (mgrResults[1].status === 'fulfilled') {
                    const d = mgrResults[1].value.data;
                    setTeamMembers(Array.isArray(d) ? d : (d.results || []));
                }
            }
        } catch (err) {
            console.error('OvertimeRequestsTab fetchData error:', err);
        }
        setLoading(false);
    }, [hasPermission]);

    useEffect(() => { fetchData(); }, [fetchData, refreshTrigger]);

    const refetchAll = useCallback(() => {
        fetchData();
        if (onDataChange) onDataChange();
    }, [fetchData, onDataChange]);

    // Handlers
    const handleClaim = async (reason) => {
        setActionLoading(true);
        try {
            const { type, target } = claimModal;
            if (type === 'INTENDED') {
                await api.post(`/overtime-assignments/${target.assignment_id}/claim/`, { reason: reason || undefined });
            } else if (type === 'POTENTIAL') {
                await api.post('/overtime-requests/claim-potential/', {
                    ...(target.overtime_request_id ? { overtime_request_id: target.overtime_request_id } : { attendance_id: target.attendance_id }),
                    reason: reason || undefined,
                });
            }
            setClaimModal({ open: false, type: null, target: null, title: '', subtitle: '' });
            refetchAll();
        } catch (err) {
            alert(err.response?.data?.error || 'Talep s\u0131ras\u0131nda hata olu\u015ftu.');
        }
        setActionLoading(false);
    };

    const handleCancelRequest = async (reason) => {
        setActionLoading(true);
        try {
            await api.post(`/overtime-requests/${cancelModal.target.id}/cancel/`, { reason: reason || undefined });
            setCancelModal({ open: false, target: null });
            refetchAll();
        } catch (err) {
            alert(err.response?.data?.error || '\u0130ptal s\u0131ras\u0131nda hata olu\u015ftu.');
        }
        setActionLoading(false);
    };

    const handleManualSubmit = async (form) => {
        setActionLoading(true);
        try {
            await api.post('/overtime-requests/manual-entry/', {
                date: form.date, start_time: form.start_time,
                end_time: form.end_time, reason: form.reason.trim(),
            });
            setShowManualModal(false);
            refetchAll();
        } catch (err) {
            alert(err.response?.data?.error || err.response?.data?.detail || 'Hata olu\u015ftu.');
        }
        setActionLoading(false);
    };

    const handleCancelAssignment = async (a) => {
        if (!window.confirm(`${a.employee_name} - ${formatDateTurkish(a.date)} atamas\u0131n\u0131 iptal etmek istiyor musunuz?`)) return;
        try {
            await api.post(`/overtime-assignments/${a.id}/cancel/`);
            refetchAll();
        } catch (err) {
            alert(err.response?.data?.error || 'Hata olu\u015ftu.');
        }
    };

    // Computed
    const visibleIntended = useMemo(() => {
        return claimableData.intended.filter(item => item.actual_overtime_hours > 0 || item.claim_status);
    }, [claimableData.intended]);

    const filteredRequests = useMemo(() => {
        return myRequests.filter(r => r.status !== 'POTENTIAL');
    }, [myRequests]);

    // Loading
    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">

            {/* ─── ACTION BUTTONS ─── */}
            <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowManualModal(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2">
                    <PenLine size={15} /> Kendim \u0130\u00e7in OT Talebi
                </button>
                {isManager && (
                    <button onClick={() => setShowAssignModal(true)}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2">
                        <Users size={15} /> Ekibime OT Ata
                    </button>
                )}
            </div>

            {/* SECTION 1: Talep Edilebilir Mesailer */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                <SectionHeader icon={<CalendarCheck size={16} />} title="Talep Edilebilir Mesailer"
                    count={visibleIntended.length + claimableData.potential.length} />

                {visibleIntended.length === 0 && claimableData.potential.length === 0 ? (
                    <EmptyState text="Talep edilebilir mesai bulunmuyor" />
                ) : (
                    <div className="space-y-4">
                        {/* Intended (Planned) */}
                        {visibleIntended.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Pill color="blue">Planl\u0131</Pill>
                                    <span className="text-xs text-slate-400 font-medium">{visibleIntended.length} atama</span>
                                </div>
                                <div className="space-y-2">
                                    {visibleIntended.map((item, i) => (
                                        <ClaimableCard key={`i-${i}`} item={item} type="intended"
                                            onClaim={() => {
                                                fetchWeeklyOtStatus(item.date);
                                                setClaimModal({
                                                    open: true, type: 'INTENDED', target: item,
                                                    title: 'Planl\u0131 Mesai Talep Et',
                                                    subtitle: `${formatDateTurkish(item.date)} - ${item.claimable_hours || item.actual_overtime_hours} saat`,
                                                });
                                            }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Potential (Detected) */}
                        {claimableData.potential.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Pill color="purple">Algılanan</Pill>
                                    <span className="text-xs text-slate-400 font-medium">{claimableData.potential.length} mesai</span>
                                </div>
                                <div className="space-y-2">
                                    {claimableData.potential.map((item, i) => (
                                        <ClaimableCard key={`p-${i}`} item={item} type="potential"
                                            onClaim={() => {
                                                fetchWeeklyOtStatus(item.date);
                                                setClaimModal({
                                                    open: true, type: 'POTENTIAL', target: item,
                                                    title: 'Algılanan Mesai Talep Et',
                                                    subtitle: `${formatDateTurkish(item.date)}${item.start_time && item.end_time ? ` (${item.start_time}-${item.end_time})` : ''} - ${item.actual_overtime_hours} saat`,
                                                });
                                            }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SECTION 2: Mevcut OT Taleplerim */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                <SectionHeader icon={<ClipboardList size={16} />} title="Mevcut OT Taleplerim" count={filteredRequests.length} />

                {filteredRequests.length === 0 ? (
                    <EmptyState text="Ek mesai talebiniz bulunmuyor." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Kaynak</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Süre</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Durum</th>
                                    <th className="text-right py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">\u0130\u015flemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map(req => (
                                    <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 px-3 font-medium text-slate-700">{formatDateShort(req.date)}</td>
                                        <td className="py-3 px-3"><SourceBadge type={req.source_type} /></td>
                                        <td className="py-3 px-3 text-slate-600">
                                            {req.duration_seconds > 0 ? formatDuration(req.duration_seconds)
                                                : req.start_time && req.end_time ? `${req.start_time?.slice(0, 5)} - ${req.end_time?.slice(0, 5)}` : '-'}
                                        </td>
                                        <td className="py-3 px-3"><StatusBadge status={req.status} /></td>
                                        <td className="py-3 px-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setDetailModal({ open: true, request: req })}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1">
                                                    <Eye size={10} /> Detay
                                                </button>
                                                {req.status === 'PENDING' && (
                                                    <button onClick={() => setCancelModal({ open: true, target: req })}
                                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1">
                                                        <XCircle size={10} /> \u0130ptal
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SECTION 3: Ekip Atamalar\u0131 (manager only) */}
            {isManager && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
                    <SectionHeader icon={<Users size={16} />} title="Ekip Atamalar\u0131" count={teamAssignments.length} />

                    {teamAssignments.length === 0 ? (
                        <EmptyState text="Ekip atamas\u0131 bulunmuyor." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Çalışan</th>
                                        <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
                                        <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Maks Süre</th>
                                        <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Durum</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">\u0130\u015flemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamAssignments.map(a => (
                                        <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-3">
                                                <div className="font-medium text-slate-700">{a.employee_name}</div>
                                                {a._weeklyOtStatus && !a._weeklyOtStatus.is_unlimited && (
                                                    <div className={`mt-1 px-2 py-1 rounded-lg text-[10px] font-bold inline-block ${
                                                        a._weeklyOtStatus.is_over_limit
                                                            ? 'bg-red-50 text-red-600 border border-red-200'
                                                            : (a._weeklyOtStatus.used_hours / a._weeklyOtStatus.limit_hours) > 0.7
                                                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                                                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                    }`}>
                                                        Haftal\u0131k Mesai: {a._weeklyOtStatus.used_hours}/{a._weeklyOtStatus.limit_hours} sa
                                                        {a._weeklyOtStatus.is_over_limit && ' \u2014 L\u0130M\u0130T A\u015eILMI\u015e'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{formatDateShort(a.date)}</td>
                                            <td className="py-3 px-3 text-slate-600">{a.max_duration_hours} sa</td>
                                            <td className="py-3 px-3"><AssignmentStatusBadge status={a.status} /></td>
                                            <td className="py-3 px-3 text-right">
                                                {a.status === 'ASSIGNED' && (
                                                    <button onClick={() => handleCancelAssignment(a)}
                                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1">
                                                        <XCircle size={10} /> \u0130ptal
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODALS */}
            <ClaimModal
                isOpen={claimModal.open}
                title={claimModal.title}
                subtitle={claimModal.subtitle}
                onClose={() => setClaimModal({ open: false, type: null, target: null, title: '', subtitle: '' })}
                onSubmit={handleClaim}
                loading={actionLoading}
                weeklyOtStatus={weeklyOtStatus}
            />
            <CancelConfirmModal
                isOpen={cancelModal.open}
                date={cancelModal.target ? formatDateTurkish(cancelModal.target.date) : ''}
                onClose={() => setCancelModal({ open: false, target: null })}
                onSubmit={handleCancelRequest}
                loading={actionLoading}
            />
            <ManualEntryModal
                isOpen={showManualModal}
                onClose={() => setShowManualModal(false)}
                onSubmit={handleManualSubmit}
                loading={actionLoading}
                fetchWeeklyOtStatus={fetchWeeklyOtStatus}
                weeklyOtStatus={weeklyOtStatus}
            />
            {isManager && (
                <CreateAssignmentModal
                    isOpen={showAssignModal}
                    onClose={() => setShowAssignModal(false)}
                    onSuccess={refetchAll}
                    teamMembers={teamMembers}
                />
            )}
            <RequestDetailModal
                isOpen={detailModal.open}
                onClose={() => setDetailModal({ open: false, request: null })}
                request={detailModal.request}
                requestType="OVERTIME"
                onUpdate={refetchAll}
            />
        </div>
    );
};

export default OvertimeRequestsTab;
