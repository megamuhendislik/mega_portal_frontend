const WARNING_CODE = 'NON_WORKING_DAY_OVERTIME';

export const getSubstituteLeaveType = (request) => (
    request?.type === 'EXTERNAL_DUTY' ||
    request?.request_type_detail?.category === 'EXTERNAL_DUTY'
        ? 'EXTERNAL_DUTY'
        : 'LEAVE'
);

const unwrapPreview = (source) => {
    if (!source) return {};
    return source.duty_work_info || source;
};

export const formatOvertimeMinutes = (minutes) => {
    const total = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(total / 60);
    const remainder = total % 60;
    if (hours && remainder) return `${hours}sa ${remainder}dk`;
    if (hours) return `${hours}sa`;
    return `${remainder}dk`;
};

export const formatWarningDate = (value) => {
    if (!value) return '';
    const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Istanbul',
    });
};

export const getNonWorkingDayOvertimeWarnings = (source) => {
    const preview = unwrapPreview(source);
    const days = preview.days || preview.preview_days || [];
    const explicitWarnings = preview.warnings || preview.preview_warnings || [];
    const daysByDate = new Map(
        days
            .filter(day => day?.date)
            .map(day => [String(day.date).slice(0, 10), day]),
    );

    const normalized = explicitWarnings
        .filter(warning => warning?.code === WARNING_CODE)
        .map(warning => {
            const date = warning.date ? String(warning.date).slice(0, 10) : '';
            const day = daysByDate.get(date);
            return {
                ...warning,
                date,
                status: warning.status || day?.non_working_status || null,
                overtimeMinutes: day?.overtime_minutes || 0,
            };
        });

    if (normalized.length > 0) return normalized;

    return days
        .filter(day => day?.is_non_working_status_day)
        .map(day => ({
            code: WARNING_CODE,
            date: String(day.date || '').slice(0, 10),
            status: day.non_working_status || null,
            message: '',
            overtimeMinutes: day.overtime_minutes || 0,
        }));
};

export const buildNonWorkingDayApprovalMessage = (source) => {
    const warnings = getNonWorkingDayOvertimeWarnings(source);
    if (warnings.length === 0) return '';

    const totalMinutes = warnings.reduce(
        (sum, warning) => sum + (Number(warning.overtimeMinutes) || 0),
        0,
    );
    const statusLabels = [...new Set(
        warnings.map(warning => warning.status?.label).filter(Boolean),
    )].join(', ');
    const duration = totalMinutes > 0
        ? ` Toplam ${formatOvertimeMinutes(totalMinutes)}`
        : '';

    return (
        `Çalışan bu tarihte ${statusLabels || 'izin / rapor'} statüsündedir; ` +
        `normal çalışma yükümlülüğü yoktur.${duration} fazla mesai, normal iş günü ` +
        'öğle arası düşülerek hesaplanacaktır. Otomatik onay haftalık fazla mesai ' +
        'limiti kurallarına tabidir. Devam etmek istiyor musunuz?'
    );
};
