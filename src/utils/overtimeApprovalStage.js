// Haftalık sınırı aşan fazla mesai: yönetici onayından sonra sistem yöneticisi onayı.
// Sistem yöneticisini bekleyen talebin status'u PENDING kalır, approval_stage 'ADMIN' olur.
import { fmtSaDkSec } from './dateUtils.js';

export const APPROVAL_STAGE = {
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN',
    COMPLETED: 'COMPLETED',
    REJECTED_BY_ADMIN: 'REJECTED_BY_ADMIN',
};

export const ADMIN_PENDING_STATUS = 'ADMIN_PENDING';
export const ADMIN_REJECTED_STATUS = 'ADMIN_REJECTED';

export const ADMIN_PENDING_LABEL = 'Sistem Yöneticisinde';
export const ADMIN_REJECTED_LABEL = 'Reddedildi';

export const ADMIN_SENT_MESSAGE =
    'Onayınız alındı. Haftalık sınır aşıldığı için talep sistem yöneticisi onayına gönderildi.';

export const DUTY_ADMIN_APPROVAL_NOTE = 'Sınırı aşan fazla mesai sistem yöneticisi onayına gidecek.';

export const isAwaitingAdmin = (req) =>
    req?.approval_stage === APPROVAL_STAGE.ADMIN && (!req.status || req.status === 'PENDING');

export const isRejectedByAdmin = (req) => req?.approval_stage === APPROVAL_STAGE.REJECTED_BY_ADMIN;

export const resolveStatusKey = (req) => {
    if (isAwaitingAdmin(req)) return ADMIN_PENDING_STATUS;
    if (isRejectedByAdmin(req)) return ADMIN_REJECTED_STATUS;
    return req?.status;
};

// ADMIN aşamasındaki talepte karar sistem yöneticisinde.
export const isManagerActionable = (req) =>
    req?.status === 'PENDING' && req?.is_actionable !== false && !isAwaitingAdmin(req);

export const canAdminDecide = (req, isSystemAdmin) => Boolean(isSystemAdmin) && isAwaitingAdmin(req);

const dayMonth = (isoDate) => {
    const [, month, day] = String(isoDate || '').slice(0, 10).split('-');
    return day && month ? `${day}.${month}` : '';
};

// "21-27.09" ya da "28.09-04.10"
export const formatWeekRange = (start, end) => {
    const s = dayMonth(start);
    const e = dayMonth(end);
    if (!s || !e) return s || e || '';
    const [sd, sm] = s.split('.');
    const [, em] = e.split('.');
    return sm === em ? `${sd}-${e}` : `${s}-${e}`;
};

// "21-27.09 haftası: 47sa (sınır 30sa)"
export const formatAdminLimitSnapshot = (snapshot) => {
    if (!snapshot) return '';
    const range = formatWeekRange(snapshot.week_start, snapshot.week_end);
    let text = fmtSaDkSec(snapshot.week_total_seconds);
    if (snapshot.limit_seconds) text += ` (sınır ${fmtSaDkSec(snapshot.limit_seconds)})`;
    return range ? `${range} haftası: ${text}` : text;
};

const DONE_AFTER_MANAGER = [APPROVAL_STAGE.ADMIN, APPROVAL_STAGE.COMPLETED, APPROVAL_STAGE.REJECTED_BY_ADMIN];

export const STAGE_STATE_LABELS = {
    done: 'Onaylandı',
    pending: 'Bekliyor',
    rejected: 'Reddedildi',
    waiting: 'Sırada',
    skipped: 'Gerek kalmadı',
};

// state: done | pending | rejected | waiting | skipped
export const buildApprovalStages = (req) => {
    if (!req?.requires_admin_approval) return [];
    const stage = req.approval_stage;
    const closedWithoutAdmin = ['REJECTED', 'CANCELLED', 'CANCELED'].includes(req.status)
        && !DONE_AFTER_MANAGER.includes(stage);

    let managerState = 'pending';
    if (req.manager_approved_at || DONE_AFTER_MANAGER.includes(stage)) managerState = 'done';
    else if (req.status === 'REJECTED') managerState = 'rejected';
    else if (closedWithoutAdmin) managerState = 'skipped';

    let adminState = 'waiting';
    if (stage === APPROVAL_STAGE.COMPLETED) adminState = 'done';
    else if (stage === APPROVAL_STAGE.REJECTED_BY_ADMIN) adminState = 'rejected';
    else if (stage === APPROVAL_STAGE.ADMIN) adminState = 'pending';
    else if (closedWithoutAdmin) adminState = 'skipped';

    return [
        {
            key: 'MANAGER',
            title: 'Yönetici Onayı',
            state: managerState,
            stateLabel: STAGE_STATE_LABELS[managerState],
            by: req.manager_approved_by_name || null,
            at: req.manager_approved_at || null,
        },
        {
            key: 'ADMIN',
            title: 'Sistem Yöneticisi Onayı',
            state: adminState,
            stateLabel: STAGE_STATE_LABELS[adminState],
            by: req.admin_decision_by_name || null,
            at: req.admin_decision_at || null,
        },
    ];
};

export const interpretApprovalResponse = (data) => {
    if (data?.approval_stage === APPROVAL_STAGE.ADMIN) {
        return {
            sentToAdmin: true,
            level: 'info',
            message: ADMIN_SENT_MESSAGE,
            patch: {
                status: 'PENDING',
                approval_stage: APPROVAL_STAGE.ADMIN,
                requires_admin_approval: true,
                is_actionable: false,
            },
        };
    }
    return {
        sentToAdmin: false,
        level: 'success',
        message: null,
        patch: { status: 'APPROVED', is_actionable: false },
    };
};

export const dutyAdminApprovalNote = (warning) =>
    (warning?.admin_approval_required ? DUTY_ADMIN_APPROVAL_NOTE : null);

export const validateAdminDecision = (action, reason) => {
    if (action !== 'approve' && action !== 'reject') return 'Geçersiz işlem';
    if (action === 'reject' && !String(reason || '').trim()) return 'Reddetme sebebi girin';
    return null;
};

export const buildAdminDecisionPayload = (action, reason) => {
    const trimmed = String(reason || '').trim();
    if (action === 'reject') return { action: 'reject', reason: trimmed };
    return trimmed ? { action: 'approve', reason: trimmed } : { action: 'approve' };
};

export const normalizeAdminQueue = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;
    return [];
};

const QUEUE_SOURCE_LABELS = {
    CARD: 'Kart',
    POTENTIAL: 'Kart',
    MANUAL: 'Manuel',
    INTENDED: 'Planlı atama',
    DUTY: 'Dış görev',
};

// "Dış görev #1089", "Planlı atama", "Kart"
export const describeQueueSource = (item) => {
    const dutyId = item?.duty_request_id ?? item?.related_leave_request ?? null;
    let key = item?.source || null;
    if (!key && dutyId) key = 'DUTY';
    if (!key) key = item?.source_type || (item?.is_manual ? 'MANUAL' : null);
    const label = item?.source_label || QUEUE_SOURCE_LABELS[key] || key || 'Fazla mesai';
    return key === 'DUTY' && dutyId ? `${label} #${dutyId}` : label;
};

export const adminQueueTotals = (items = []) => ({
    count: items.length,
    totalSeconds: items.reduce((sum, item) => sum + (Number(item?.duration_seconds) || 0), 0),
});
