import { isMidnightBoundary } from '../../utils/midnightWarning';

const WARNING_CODE = 'NON_WORKING_DAY_OVERTIME';
const MISSING_EXIT_CODE = 'MISSING_EXIT';
const RAW_WORK_MODE = 'RAW_WORK_OVERTIME';

export const getSubstituteLeaveType = (request) => (
    request?.type === 'EXTERNAL_DUTY' ||
    request?.request_type_detail?.category === 'EXTERNAL_DUTY'
        ? 'EXTERNAL_DUTY'
        : 'LEAVE'
);

const asArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const getOvertimeSourceId = (source) => (
    source?.overtime_request_id ?? source?.attendance_id ?? source?.id
);

const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');

const firstNumber = (...values) => {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const number = Number(value);
        if (Number.isFinite(number)) return Math.max(0, number);
    }
    return 0;
};

const normalizeStatus = (...values) => {
    const value = values.find(item => item !== null && item !== undefined && item !== '');
    if (!value) return null;
    if (typeof value === 'string') return { code: value, label: value };
    return value;
};

export const formatOvertimeSeconds = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    const parts = [];
    if (hours) parts.push(`${hours}sa`);
    if (minutes) parts.push(`${minutes}dk`);
    if (remainder) parts.push(`${remainder}sn`);
    return parts.length > 0 ? parts.join(' ') : '0dk';
};

export const formatOvertimeMinutes = (minutes) => (
    formatOvertimeSeconds(firstNumber(minutes) * 60)
);

export const formatWarningDate = (value) => {
    if (!value) return '';
    const parsed = new Date(`${dateOnly(value)}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Istanbul',
    });
};

export const getNonWorkingDayOvertimeRuleText = (warning) => {
    const sourceKind = String(warning?.sourceKind || warning?.source_kind || '').toUpperCase();
    const calculationMode = warning?.calculationMode || warning?.calculation_mode;
    const deductScheduledLunch = warning?.deductScheduledLunch ?? warning?.deduct_scheduled_lunch;

    if (calculationMode === RAW_WORK_MODE || deductScheduledLunch === false) {
        return (
            'Olağan çalışma (kartlı, kartsız veya manuel kayıt) ham giriş-çıkış süresi üzerinden fazla mesai sayılır; ' +
            'öğle arası düşülmez ve servis toleransı uygulanmaz.'
        );
    }

    if (deductScheduledLunch === true || ['DUTY', 'EXTERNAL_DUTY'].includes(sourceKind)) {
        return (
            'Dış görev fazla mesai sayılır; yalnızca planlı öğle arasıyla çakışan süre düşülür.'
        );
    }

    return warning?.message || (
        'Bu tarihte normal çalışma yükümlülüğü bulunmadığından çalışma fazla mesai sayılır.'
    );
};

const normalizeWarning = (warning, context = {}, day = null, inferredSourceKind = '') => {
    const sourceKind = warning?.source_kind || context?.source_kind || inferredSourceKind || '';
    const calculationMode = warning?.calculation_mode || context?.calculation_mode || null;
    const deductScheduledLunch = warning?.deduct_scheduled_lunch ??
        context?.deduct_scheduled_lunch ??
        (calculationMode === RAW_WORK_MODE ? false : undefined);
    const overtimeMinutes = firstNumber(
        warning?.overtime_minutes,
        day?.overtime_minutes,
        context?.overtime_minutes,
    );
    const overtimeSeconds = firstNumber(
        warning?.overtime_seconds,
        context?.actual_overtime_seconds,
        context?.overtime_seconds,
        context?.duration_seconds,
        overtimeMinutes * 60,
    );
    const normalized = {
        ...warning,
        code: WARNING_CODE,
        date: dateOnly(warning?.date || day?.date || context?.date),
        status: normalizeStatus(
            warning?.status,
            warning?.non_working_status,
            day?.non_working_status,
            context?.non_working_status,
        ),
        sourceKind,
        calculationMode,
        deductScheduledLunch,
        overtimeSeconds,
        overtimeMinutes: overtimeSeconds / 60,
    };
    normalized.ruleText = getNonWorkingDayOvertimeRuleText(normalized);
    return normalized;
};

const collectWarningEntries = (source) => {
    if (!source) return [];
    if (Array.isArray(source)) return source.flatMap(collectWarningEntries);
    if (typeof source !== 'object') return [];

    const nestedItems = source?._dayGroup?.items || source?.items;
    if (Array.isArray(nestedItems) && nestedItems.length > 0) {
        return nestedItems.flatMap(collectWarningEntries);
    }

    const entries = [];
    if (source.code === WARNING_CODE) {
        entries.push(normalizeWarning(source));
    }

    for (const warning of asArray(source.non_working_day_overtime_warning)) {
        if (warning?.code === WARNING_CODE) {
            entries.push(normalizeWarning(warning, source));
        }
    }

    // Canonical serializer warnings are authoritative. Transitional payloads
    // can still include legacy duty preview fields, which describe the same
    // overtime and must not be counted or displayed twice.
    if (entries.length > 0) return entries;

    const preview = source.duty_work_info || source;
    const days = preview.days || preview.preview_days || [];
    const explicitWarnings = preview.warnings || preview.preview_warnings || [];
    if (days.length > 0 || explicitWarnings.length > 0) {
        const daysByDate = new Map(
            days
                .filter(day => day?.date)
                .map(day => [dateOnly(day.date), day]),
        );
        const dutyWarnings = explicitWarnings.filter(warning => warning?.code === WARNING_CODE);

        if (dutyWarnings.length > 0) {
            for (const warning of dutyWarnings) {
                entries.push(normalizeWarning(
                    warning,
                    preview,
                    daysByDate.get(dateOnly(warning.date)),
                    'DUTY',
                ));
            }
        } else {
            for (const day of days.filter(item => item?.is_non_working_status_day)) {
                entries.push(normalizeWarning({
                    code: WARNING_CODE,
                    date: day.date,
                    status: day.non_working_status,
                }, preview, day, 'DUTY'));
            }
        }
    }

    return entries;
};

export const getNonWorkingDayOvertimeWarnings = (source) => {
    const grouped = new Map();
    for (const warning of collectWarningEntries(source)) {
        const statusKey = warning.status?.code || warning.status?.label || '';
        const key = [
            warning.date,
            statusKey,
            warning.sourceKind,
            warning.calculationMode,
            String(warning.deductScheduledLunch),
        ].join('|');
        const existing = grouped.get(key);
        if (existing) {
            existing.overtimeSeconds += warning.overtimeSeconds;
            existing.overtimeMinutes = existing.overtimeSeconds / 60;
        } else {
            grouped.set(key, { ...warning });
        }
    }
    return [...grouped.values()];
};

export const selectOvertimeWarningSources = (sources, selectedIds) => {
    if (!Array.isArray(sources)) return sources;
    const values = selectedIds instanceof Set ? [...selectedIds] : asArray(selectedIds);
    const selectedKeys = new Set(values.map(value => String(value)));
    return sources.filter(source => {
        const id = getOvertimeSourceId(source);
        return id !== null && id !== undefined && selectedKeys.has(String(id));
    });
};

export const withNonWorkingDayOvertimeSeconds = (source, overtimeSeconds) => {
    if (!source || typeof source !== 'object') return source;
    const seconds = Math.max(0, Math.round(Number(overtimeSeconds) || 0));

    if (source.code === WARNING_CODE) {
        return { ...source, overtime_seconds: seconds };
    }

    const direct = source.non_working_day_overtime_warning;
    if (!direct) return source;
    if (Array.isArray(direct)) {
        return {
            ...source,
            non_working_day_overtime_warning: direct.map((warning, index) => ({
                ...warning,
                overtime_seconds: index === 0 ? seconds : 0,
            })),
        };
    }
    return {
        ...source,
        non_working_day_overtime_warning: {
            ...direct,
            overtime_seconds: seconds,
        },
    };
};

export const buildNonWorkingDayApprovalMessage = (source) => {
    const warnings = getNonWorkingDayOvertimeWarnings(source);
    if (warnings.length === 0) return '';

    const totalSeconds = warnings.reduce(
        (sum, warning) => sum + warning.overtimeSeconds,
        0,
    );
    const statusLabels = [...new Set(
        warnings.map(warning => warning.status?.label).filter(Boolean),
    )].join(', ');
    const rules = [...new Set(warnings.map(warning => warning.ruleText).filter(Boolean))];
    const duration = totalSeconds > 0
        ? ` Toplam ${formatOvertimeSeconds(totalSeconds)} fazla mesai oluşur.`
        : '';

    return (
        `Çalışan bu tarihte ${statusLabels || 'izin / rapor'} statüsündedir; ` +
        `normal çalışma yükümlülüğü yoktur.${duration} ${rules.join(' ')}` +
        ' Otomatik onay haftalık fazla mesai limiti kurallarına tabidir. Devam etmek istiyor musunuz?'
    );
};

export const buildOvertimeApprovalWarnings = (source) => {
    const warnings = [];
    const absenceDayMessage = buildNonWorkingDayApprovalMessage(source);
    if (absenceDayMessage) {
        warnings.push({
            code: WARNING_CODE,
            title: 'İzin / Rapor Gününde Fazla Mesai',
            message: absenceDayMessage,
        });
    }

    const requestType = source?._type || source?.type;
    if (requestType === 'OVERTIME' && isMidnightBoundary(source?.end_time)) {
        warnings.push({
            code: MISSING_EXIT_CODE,
            title: 'Kartsız Çıkış İhtimali',
            message: (
                'Bu talep 23:59\'da sonlanan bir kayda dayanmaktadır. Çalışanın çıkış kartı ' +
                'basmamış olma ihtimali bulunmaktadır. Gerçek çalışma saatlerini doğruladığınızdan emin olunuz.'
            ),
        });
    }

    return warnings;
};

export const calculateOvertimeSeconds = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const parseTime = (value) => {
        const parts = String(value).split(':').map(Number);
        if (parts.length < 2 || parts.some(part => !Number.isFinite(part))) return null;
        const [hours, minutes, seconds = 0] = parts;
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
            return null;
        }
        return (hours * 3600) + (minutes * 60) + seconds;
    };
    const startSeconds = parseTime(startTime);
    const endSeconds = parseTime(endTime);
    if (startSeconds === null || endSeconds === null) return 0;
    const difference = endSeconds - startSeconds;
    return difference > 0 ? difference : 0;
};

export const fetchNonWorkingDayOvertimeWarning = async (
    apiClient,
    date,
    sourceKind = 'MANUAL',
    overtimeSeconds = 0,
) => {
    if (!date) return null;
    const response = await apiClient.get('/overtime-requests/non-working-day-warning/', {
        params: {
            date,
            source_kind: sourceKind,
            overtime_seconds: Math.max(0, Math.round(Number(overtimeSeconds) || 0)),
        },
    });
    return response?.data || null;
};
