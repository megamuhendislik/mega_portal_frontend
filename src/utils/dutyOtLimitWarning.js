// Dış görev onayında uyarılar: haftalık FM sınırı aşımı ve çalışanın görev
// günlerinde izinde olması.
//
// İkisi de onayı engellemez (görev FM'si sınırdan muaf; izin günündeki görevin
// tamamı FM sayılır). Backend uyarı varsa onayı 409 + OT_LIMIT_ACK_REQUIRED ile
// durdurur (`warnings`: OT_LIMIT_EXCEEDED / EMPLOYEE_ON_LEAVE). Yönetici
// "Emin misiniz?" sorusunu kabul ederse istek `acknowledge_ot_limit: true` ile
// tekrar gönderilir; tek bayrak gösterilen tüm uyarıları kapsar.
import { fmtSaDkSec } from './dateUtils.js';

export const DUTY_OT_LIMIT_ACK_CODE = 'OT_LIMIT_ACK_REQUIRED';
export const DUTY_OT_LIMIT_ACK_FIELD = 'acknowledge_ot_limit';

export const getDutyOtLimitWarning = (error) => {
    const response = error?.response;
    if (response?.status !== 409 || response?.data?.code !== DUTY_OT_LIMIT_ACK_CODE) return null;
    return response.data.ot_limit_warning || null;
};

const dayMonth = (isoDate) => {
    const [, month, day] = String(isoDate || '').split('-');
    return day && month ? `${day}.${month}` : String(isoDate || '');
};

export const buildDutyOtLimitRows = (warning) => (warning?.weeks || []).map(week => ({
    key: week.week_start,
    weekLabel: `${dayMonth(week.week_start)} – ${dayMonth(week.week_end)}`,
    counted: fmtSaDkSec(week.counted_seconds),
    existingDuty: fmtSaDkSec(week.existing_duty_seconds),
    projected: fmtSaDkSec(week.projected_duty_seconds),
    total: fmtSaDkSec(week.total_seconds),
    limit: fmtSaDkSec(week.limit_seconds),
    over: week.exceeds ? fmtSaDkSec(week.over_seconds) : '—',
    exceeds: Boolean(week.exceeds),
    limitExempt: week.limit_exempt !== false,
}));

const LEAVE_STATUS_LABELS = { APPROVED: 'onaylı', PENDING: 'bekliyor' };

export const buildLeaveOverlapRows = (warning) => (warning?.leave_overlaps || []).map(item => ({
    key: `${item.date}-${item.leave_request_id}`,
    dateLabel: dayMonth(item.date),
    typeName: item.leave_type_name,
    statusLabel: LEAVE_STATUS_LABELS[item.status] || item.status,
    timeLabel: item.full_day ? 'tam gün' : `${item.start_time}–${item.end_time}`,
    pending: item.status === 'PENDING',
}));

export const dutyWarningTitle = (warning) => {
    if (warning?.exceeds_limit && warning?.has_leave_overlap) return 'Fazla Mesai Sınırı Aşılıyor ve Çalışan İzinde';
    if (warning?.has_leave_overlap) return 'Çalışan Görev Günlerinde İzinde';
    return 'Haftalık Fazla Mesai Sınırı Aşılıyor';
};

// send(extra) isteği gönderir; confirm(warning) → Promise<boolean>.
// Döner: { cancelled, acknowledged, response }.
export const postWithDutyOtLimitAck = async (send, confirm) => {
    try {
        const response = await send({});
        return { cancelled: false, acknowledged: false, response };
    } catch (error) {
        const warning = getDutyOtLimitWarning(error);
        if (!warning) throw error;
        const confirmed = await confirm(warning);
        if (!confirmed) return { cancelled: true, acknowledged: false, response: null };
        const response = await send({ [DUTY_OT_LIMIT_ACK_FIELD]: true });
        return { cancelled: false, acknowledged: true, response };
    }
};
