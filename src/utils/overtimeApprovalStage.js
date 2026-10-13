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

export const ADMIN_REQUIRED_TAG = 'Sistem yöneticisi onayı gerekecek';
export const ADMIN_SUBMIT_NOTE = 'Talebiniz yönetici onayından sonra sistem yöneticisine gidecek.';
export const DUTY_ADMIN_SUBMIT_NOTE = 'Görevin sınırı aşan fazla mesaisi, yönetici onayından sonra sistem yöneticisine gidecek.';

// Bu tarihten itibaren haftalık sınır talebi engellemez; aşan talep sistem yöneticisine de gider.
// Öncesindeki FM'de sınır hâlâ engeller (backend 400 döner).
export const ADMIN_RULE_START = '2026-09-26';

export const adminRuleApplies = (isoDate) => {
    const day = String(isoDate || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= ADMIN_RULE_START;
};

// Kırmızı sınır uyarısı yalnız kural öncesi FM'de; tarih yoksa eskisi gibi gösterilir.
export const weeklyLimitBlocks = (willExceed, isoDate) => Boolean(willExceed) && !adminRuleApplies(isoDate);

// Planlı atama sınırı aşıyor ve en az bir gün kural kapsamındaysa sistem yöneticisi onayı da gerekir.
export const assignmentNeedsAdmin = (isOverLimit, isoDates) =>
    Boolean(isOverLimit) && (isoDates || []).some(adminRuleApplies);

// Talep oluşturuldu mesajı; sistem yöneticisi onayı gerekecekse not eklenir.
export const overtimeCreatedMessage = (adminPreview) => {
    const text = 'Fazla mesai talebiniz oluşturuldu.';
    return adminPreview?.required ? `${text} ${ADMIN_SUBMIT_NOTE}` : text;
};

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

// "21-27.09 haftası 47sa, sınır 30sa (17sa fazla)"
export const formatWeekOverrun = (data) => {
    if (!data) return '';
    const range = formatWeekRange(data.week_start, data.week_end);
    const total = data.week_total_seconds ?? data.total_seconds;
    if (!range || total == null) return '';
    let text = `${range} haftası ${fmtSaDkSec(total)}`;
    if (data.limit_seconds) text += `, sınır ${fmtSaDkSec(data.limit_seconds)}`;
    if (data.over_seconds > 0) text += ` (${fmtSaDkSec(data.over_seconds)} fazla)`;
    return text;
};

// applies=false (26.09 öncesi / sınırsız çalışan): kural yok, hiçbir şey gösterilmez.
const needsAdmin = (preview) => Boolean(preview?.required) && preview?.applies !== false;

const weekFacts = (preview) => {
    if (!preview?.required) return null;
    const range = formatWeekRange(preview.week_start, preview.week_end);
    const total = preview.week_total_seconds ?? preview.total_seconds;
    if (!range || total == null || !preview.limit_seconds) return null;
    return { range, total: fmtSaDkSec(total), limit: fmtSaDkSec(preview.limit_seconds) };
};

// Talep oluşturan çalışana: neden sistem yöneticisi onayı gerekecek.
// Toplama dış görev FM'si de girer; haftalık limit çubuğu onu saymadığı için ayrıca belirtilir.
export const employeeAdminNotice = (preview) => {
    if (!needsAdmin(preview)) return null;
    const f = weekFacts(preview);
    const reason = f ? `${f.range} haftasında dış görevler dahil fazla mesainiz ${f.total} oluyor, haftalık sınır ${f.limit}. ` : '';
    return `${reason}Bu yüzden talep, yöneticiniz onayladıktan sonra sistem yöneticisinin de onayına gidecek.`;
};

// Onaylayan yöneticiye. Onaylayan sistem yöneticisiyse iki aşama tek onayla biter.
export const managerAdminNotice = (preview, { approverIsAdmin = false } = {}) => {
    if (!needsAdmin(preview)) return null;
    const f = weekFacts(preview);
    const reason = f ? ` ${f.range} haftasında dış görevler dahil fazla mesai ${f.total} oluyor, sınır ${f.limit}.` : '';
    if (approverIsAdmin) return `Sistem yöneticisi olduğunuz için ikinci onay gerekmez, onayınızla talep tamamlanır.${reason}`;
    return `Onayınızdan sonra bu talep sistem yöneticisine gidecek.${reason}`;
};

// Dış görev formu: preview-duty-hours yanıtındaki admin_approval.
// Döner: null | { text, items } (items: birden çok hafta varsa satırlar)
export const dutyFormAdminNotice = (adminApproval) => {
    if (!adminApproval?.required) return null;
    const weeks = (adminApproval.weeks || []).filter(w => w?.required);
    const outro = 'Bu yüzden görevin fazla mesaisi, yöneticiniz onayladıktan sonra sistem yöneticisinin de onayına gidecek.';
    if (weeks.length === 1) {
        const f = weekFacts({ ...weeks[0], required: true });
        if (f) {
            return {
                text: `${f.range} haftasında fazla mesainiz ${f.total} oluyor, haftalık sınır ${f.limit}. ${outro}`,
                items: [],
            };
        }
    }
    const items = weeks.map(formatWeekOverrun).filter(Boolean);
    return {
        text: items.length ? `Bu haftalarda fazla mesainiz sınırı aşıyor. ${outro}` : outro,
        items,
    };
};

const shortDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: 'Europe/Istanbul',
    }).formatToParts(d).map(p => [p.type, p.value]));
    return `${parts.day}.${parts.month} ${parts.hour}:${parts.minute}`;
};

// Sistem yöneticisi kuyruğu/detayı: "21-27.09 haftası 47sa, sınır 30sa (17sa fazla). Yönetici onayı: X, 29.09 14:10."
export const adminQueueReason = (item) => {
    const week = formatWeekOverrun(item?.admin_limit_snapshot);
    const who = item?.manager_approved_by_name;
    const when = shortDateTime(item?.manager_approved_at);
    const manager = who ? `Yönetici onayı: ${[who, when].filter(Boolean).join(', ')}.` : '';
    return [week ? `${week}.` : '', manager].filter(Boolean).join(' ');
};

// Talep henüz yöneticideyken ileride sistem yöneticisi onayı gerekecek mi?
export const willNeedAdminApproval = (req) =>
    needsAdmin(req?.admin_approval_preview)
    && req?.status === 'PENDING'
    && !req?.manager_approved_at
    && req?.approval_stage !== APPROVAL_STAGE.ADMIN;

// Oluşturma yanıtlarında talep nesnesi farklı yerlerde dönebiliyor.
export const findAdminApprovalPreview = (data) => {
    if (!data || typeof data !== 'object') return null;
    const candidates = [data, data.request, data.overtime_request, data.result];
    if (Array.isArray(data.results)) candidates.push(...data.results);
    if (Array.isArray(data.requests)) candidates.push(...data.requests);
    for (const c of candidates) {
        if (c?.admin_approval_preview) return c.admin_approval_preview;
        if (c?.required !== undefined && c?.week_start) return c;
    }
    return null;
};

// Onay Bilgisi kartındaki neden satırı.
export const approvalReasonLine = (req) => {
    if (req?.admin_limit_snapshot) return formatWeekOverrun(req.admin_limit_snapshot);
    if (willNeedAdminApproval(req)) return formatWeekOverrun(req.admin_approval_preview);
    return '';
};

const DONE_AFTER_MANAGER = [APPROVAL_STAGE.ADMIN, APPROVAL_STAGE.COMPLETED, APPROVAL_STAGE.REJECTED_BY_ADMIN];

export const STAGE_STATE_LABELS = {
    done: 'Onaylandı',
    pending: 'Bekliyor',
    rejected: 'Reddedildi',
    waiting: 'Sırada',
    skipped: 'Gerek kalmadı',
    upcoming: 'Gerekecek',
};

// state: done | pending | rejected | waiting | skipped | upcoming
export const buildApprovalStages = (req) => {
    if (!req?.requires_admin_approval) {
        if (!willNeedAdminApproval(req)) return [];
        return [
            {
                key: 'MANAGER', title: 'Yönetici Onayı', state: 'pending',
                stateLabel: STAGE_STATE_LABELS.pending, by: null, at: null,
            },
            {
                key: 'ADMIN', title: 'Sistem Yöneticisi Onayı', state: 'upcoming',
                stateLabel: STAGE_STATE_LABELS.upcoming, by: null, at: null,
            },
        ];
    }
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

// Dış görev onay uyarısı: "Sınırı aşan fazla mesai (21-27.09, 15sa) onayınızdan sonra sistem yöneticisine gidecek."
export const dutyAdminApprovalNote = (warning) => {
    if (!warning?.admin_approval_required) return null;
    const weeks = (warning.weeks || [])
        .filter(w => w?.admin_required)
        .map(w => {
            const range = formatWeekRange(w.week_start, w.week_end);
            const over = w.over_seconds ?? w.over;
            return range && over > 0 ? `${range}, ${fmtSaDkSec(over)}` : range;
        })
        .filter(Boolean);
    if (weeks.length === 0) return DUTY_ADMIN_APPROVAL_NOTE;
    return `Sınırı aşan fazla mesai (${weeks.join('; ')}) onayınızdan sonra sistem yöneticisine gidecek.`;
};

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
