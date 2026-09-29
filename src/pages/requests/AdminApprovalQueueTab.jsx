import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldCheck, Check, X, Eye, AlertTriangle, Loader2 } from 'lucide-react';
import { message } from 'antd';
import api from '../../services/api';
import RequestDetailModal from '../../components/RequestDetailModal';
import { fmtSaDkSec } from '../../utils/dateUtils';
import { getApiErrorMessage } from '../../utils/requestActions';
import {
    adminQueueTotals,
    buildAdminDecisionPayload,
    describeQueueSource,
    formatAdminLimitSnapshot,
    normalizeAdminQueue,
    validateAdminDecision,
} from '../../utils/overtimeApprovalStage';

const fmtDate = (iso) => {
    if (!iso) return '-';
    return new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
};

const fmtDateTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
    });
};

const employeeName = (item) => item.employee_name || item.employee_detail?.full_name || 'Bilinmiyor';
const employeeDept = (item) => item.employee_department || item.department_name || item.employee_detail?.department_name || '';

// Yöneticisi onaylamış, haftalık sınırı aşan fazla mesailerin son onayı.
const AdminApprovalQueueTab = ({ onCountChange, onDataChange, refreshTrigger = 0, searchText = '' }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [detail, setDetail] = useState(null);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/overtime-requests/admin-approval-queue/');
            setItems(normalizeAdminQueue(res.data));
            setError('');
        } catch (err) {
            setItems([]);
            setError(err?.response?.status === 403
                ? 'Bu sayfayı görüntüleme yetkiniz yok.'
                : getApiErrorMessage(err, 'Liste yüklenemedi'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchQueue(); }, [fetchQueue, refreshTrigger]);

    useEffect(() => {
        if (onCountChange) onCountChange(items.length);
    }, [items.length, onCountChange]);

    const visible = useMemo(() => {
        const q = searchText.trim().toLocaleLowerCase('tr-TR');
        if (!q) return items;
        return items.filter(item => `${employeeName(item)} ${employeeDept(item)} ${item.id}`
            .toLocaleLowerCase('tr-TR').includes(q));
    }, [items, searchText]);

    const totals = adminQueueTotals(visible);

    const decide = async (item, action, reason = '') => {
        const problem = validateAdminDecision(action, reason);
        if (problem) {
            message.warning(problem);
            return;
        }
        setBusy(`${action}-${item.id}`);
        try {
            await api.post(`/overtime-requests/${item.id}/admin_decision/`, buildAdminDecisionPayload(action, reason));
            setItems(prev => prev.filter(r => r.id !== item.id));
            setRejectingId(null);
            setRejectReason('');
            message.success(action === 'approve' ? 'Fazla mesai onaylandı' : 'Fazla mesai reddedildi');
            onDataChange?.();
        } catch (err) {
            message.error(getApiErrorMessage(err, 'İşlem başarısız'));
            fetchQueue();
        } finally {
            setBusy(null);
        }
    };

    if (loading && items.length === 0) return <div className="animate-pulse h-64 bg-slate-50 rounded-3xl" />;

    return (
        <div className="space-y-4">
            {error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle size={16} /> {error}
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                        <ShieldCheck size={28} className="text-slate-300" />
                    </div>
                    <h3 className="text-base font-bold text-slate-700">Onay bekleyen fazla mesai yok</h3>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700">Onay Bekleyen ({totals.count})</h3>
                        <span className="text-xs text-slate-400">{fmtSaDkSec(totals.totalSeconds)}</span>
                        {loading && <Loader2 size={14} className="animate-spin text-slate-400 ml-auto" />}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-[11px] text-slate-400 uppercase tracking-wider">
                                    <th className="px-3 py-2 font-bold">Çalışan</th>
                                    <th className="px-3 py-2 font-bold">Tarih</th>
                                    <th className="px-3 py-2 font-bold text-right">Süre</th>
                                    <th className="px-3 py-2 font-bold">Kaynak</th>
                                    <th className="px-3 py-2 font-bold">Yönetici Onayı</th>
                                    <th className="px-3 py-2 font-bold">Hafta</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {visible.map(item => (
                                    <tr key={item.id} className="align-top hover:bg-slate-50/60">
                                        <td className="px-3 py-3">
                                            <div className="font-bold text-slate-800 text-sm">{employeeName(item)}</div>
                                            <div className="text-[10px] text-slate-400">{employeeDept(item) || '-'}</div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-800">{fmtDate(item.date)}</div>
                                            {item.start_time && (
                                                <div className="text-xs text-slate-500 tabular-nums">
                                                    {String(item.start_time).slice(0, 5)}-{String(item.end_time || '').slice(0, 5)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap">
                                            {fmtSaDkSec(item.duration_seconds)}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                                            {describeQueueSource(item)}
                                        </td>
                                        <td className="px-3 py-3 text-xs whitespace-nowrap">
                                            <div className="font-semibold text-slate-700">{item.manager_approved_by_name || '-'}</div>
                                            {item.manager_approved_at && <div className="text-slate-400">{fmtDateTime(item.manager_approved_at)}</div>}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-slate-600 min-w-[160px]">
                                            {formatAdminLimitSnapshot(item.admin_limit_snapshot) || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {rejectingId === item.id ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') decide(item, 'reject', rejectReason);
                                                            if (e.key === 'Escape') { setRejectingId(null); setRejectReason(''); }
                                                        }}
                                                        placeholder="Reddetme sebebi..."
                                                        className="w-48 px-2 py-1.5 border border-red-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => decide(item, 'reject', rejectReason)}
                                                        disabled={Boolean(busy)}
                                                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                                    >
                                                        Gönder
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold"
                                                    >
                                                        Vazgeç
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetail(item)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-100 text-xs font-medium"
                                                    >
                                                        <Eye size={13} /> İncele
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => decide(item, 'approve')}
                                                        disabled={Boolean(busy)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                                                    >
                                                        <Check size={13} /> {busy === `approve-${item.id}` ? 'Onaylanıyor...' : 'Onayla'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setRejectingId(item.id); setRejectReason(''); }}
                                                        disabled={Boolean(busy)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold disabled:opacity-50"
                                                    >
                                                        <X size={13} /> Reddet
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <RequestDetailModal
                isOpen={Boolean(detail)}
                onClose={() => setDetail(null)}
                request={detail}
                requestType="OVERTIME"
                mode="admin"
                onUpdate={() => { fetchQueue(); onDataChange?.(); }}
            />
        </div>
    );
};

export default AdminApprovalQueueTab;
