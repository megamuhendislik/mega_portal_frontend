// Dış görevden doğan FM talebi listede ayrı satır olmaz, dış görev satırının içinde gösterilir.
// Karar bekleyen (PENDING) FM ayrı kalır; ana dış görev listede yoksa FM de ayrı kalır.

const rowKind = (row) => row?._type || row?.type || null;
const rowId = (row) => Number(row?.id ?? row?.request_id);

export function isNestableDutyOvertime(row) {
    return rowKind(row) === 'OVERTIME'
        && row.related_leave_request != null
        && !['PENDING', 'POTENTIAL'].includes(row.status);
}

export function nestDutyOvertime(items) {
    if (!Array.isArray(items) || items.length === 0) return items;
    const dutyIds = new Set(
        items.filter(r => rowKind(r) === 'EXTERNAL_DUTY').map(rowId),
    );
    if (dutyIds.size === 0) return items;

    const children = new Map();
    const rest = [];
    for (const row of items) {
        const parentId = Number(row?.related_leave_request);
        if (isNestableDutyOvertime(row) && dutyIds.has(parentId)) {
            if (!children.has(parentId)) children.set(parentId, []);
            children.get(parentId).push(row);
        } else {
            rest.push(row);
        }
    }
    if (children.size === 0) return items;

    return rest.map(row => {
        if (rowKind(row) !== 'EXTERNAL_DUTY') return row;
        const nested = children.get(rowId(row));
        if (!nested) return row;
        nested.sort((a, b) => `${a.date || ''} ${a.start_time || ''}`.localeCompare(`${b.date || ''} ${b.start_time || ''}`));
        return { ...row, _dutyOvertime: nested };
    });
}

export function overtimeMinutes(row) {
    if (row?.duration_minutes != null) return row.duration_minutes;
    return Math.round((row?.duration_seconds || 0) / 60);
}

// Dış görev satırının içindeki onaylı FM toplamı (dakika)
export function nestedApprovedOvertimeMinutes(row) {
    return (row?._dutyOvertime || [])
        .filter(ot => ot.status === 'APPROVED')
        .reduce((sum, ot) => sum + overtimeMinutes(ot), 0);
}
