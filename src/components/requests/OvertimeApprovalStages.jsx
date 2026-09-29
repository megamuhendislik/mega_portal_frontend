import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import {
    buildApprovalStages,
    canAdminDecide,
    formatAdminLimitSnapshot,
    validateAdminDecision,
} from '../../utils/overtimeApprovalStage';

const STATE_TEXT = {
    done: 'text-emerald-700',
    pending: 'text-amber-700',
    rejected: 'text-red-700',
    waiting: 'text-slate-400',
    skipped: 'text-slate-400',
};

const fmtDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Istanbul',
    });
};

const OvertimeApprovalStages = ({ request, isSystemAdmin = false, targetName = null, onAdminDecision }) => {
    const [rejectMode, setRejectMode] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState('');

    const stages = buildApprovalStages(request);
    if (stages.length === 0) return null;

    const snapshot = formatAdminLimitSnapshot(request?.admin_limit_snapshot);
    const showActions = Boolean(onAdminDecision) && canAdminDecide(request, isSystemAdmin);

    const submit = async (action) => {
        const problem = validateAdminDecision(action, reason);
        if (problem) {
            setError(problem);
            return;
        }
        setError('');
        setBusy(action);
        try {
            await onAdminDecision(action, reason);
            setRejectMode(false);
            setReason('');
        } catch {
            // Hata mesajını çağıran gösterir.
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Onay Bilgisi</div>
            <div className="space-y-2">
                {targetName && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Onaya Gönderilen</span>
                        <span className="text-sm text-blue-700 font-bold">{targetName}</span>
                    </div>
                )}
                {stages.map(stage => (
                    <div key={stage.key} className="flex items-start justify-between gap-3" data-stage={stage.key} data-state={stage.state}>
                        <span className="text-sm font-medium text-slate-600">{stage.title}</span>
                        <div className="text-right">
                            <span className={`text-sm font-bold ${STATE_TEXT[stage.state] || STATE_TEXT.waiting}`}>
                                {stage.state === 'done' && stage.by ? stage.by : stage.stateLabel}
                            </span>
                            {(stage.at || (stage.state !== 'done' && stage.by)) && (
                                <div className="text-xs text-slate-400">
                                    {[stage.state !== 'done' ? stage.by : null, fmtDateTime(stage.at)].filter(Boolean).join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {snapshot && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Haftalık Fazla Mesai</span>
                        <span className="text-sm text-slate-700">{snapshot}</span>
                    </div>
                )}
            </div>

            {showActions && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {!rejectMode ? (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => submit('approve')}
                                disabled={Boolean(busy)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Check size={14} />
                                {busy === 'approve' ? 'Onaylanıyor...' : 'Onayla'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRejectMode(true); setError(''); }}
                                disabled={Boolean(busy)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X size={14} />
                                Reddet
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={reason}
                                onChange={(e) => { setReason(e.target.value); setError(''); }}
                                placeholder="Reddetme sebebi..."
                                className="flex-1 min-w-[200px] px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => submit('reject')}
                                disabled={Boolean(busy)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {busy === 'reject' ? 'Reddediliyor...' : 'Gönder'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRejectMode(false); setReason(''); setError(''); }}
                                className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm font-bold"
                            >
                                Vazgeç
                            </button>
                        </div>
                    )}
                    {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                </div>
            )}
        </div>
    );
};

export default OvertimeApprovalStages;
