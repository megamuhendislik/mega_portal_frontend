// Bildirim linkinden talep açma: /requests?tab=incoming&type=OVERTIME&id=5
// Tür → kayıt tablosu (id'ler tablo bazında benzersiz; LEAVE/EXTERNAL_DUTY ve HEALTH_REPORT/HOSPITAL_VISIT aynı tablo)
const TABLE_OF = {
    OVERTIME: 'overtime',
    LEAVE: 'leave',
    EXTERNAL_DUTY: 'leave',
    CARDLESS_ENTRY: 'cardless',
    MEAL: 'meal',
    HEALTH_REPORT: 'health',
    HOSPITAL_VISIT: 'health',
    SPECIAL_LEAVE: 'special',
};

export const DETAIL_ENDPOINTS = {
    OVERTIME: (id) => `/overtime-requests/${id}/`,
    LEAVE: (id) => `/leave/requests/${id}/`,
    EXTERNAL_DUTY: (id) => `/leave/requests/${id}/`,
    CARDLESS_ENTRY: (id) => `/cardless-entry-requests/${id}/`,
    MEAL: (id) => `/meal-requests/${id}/`,
    HEALTH_REPORT: (id) => `/health-reports/${id}/`,
    HOSPITAL_VISIT: (id) => `/health-reports/${id}/`,
    SPECIAL_LEAVE: (id) => `/special-leaves/${id}/`,
};

export function parseRequestDeepLink(searchParams) {
    const type = searchParams.get('type');
    const raw = searchParams.get('id');
    if (!TABLE_OF[type] || !/^\d+$/.test(raw || '')) return null;
    const id = Number(raw);
    return id > 0 ? { type, id } : null;
}

export function rowType(row) {
    return row?._type || row?.type || null;
}

export function findRequestRow(lists, deepLink) {
    if (!deepLink) return null;
    const table = TABLE_OF[deepLink.type];
    for (const list of lists) {
        for (const row of list || []) {
            if (TABLE_OF[rowType(row)] !== table) continue;
            if (Number(row.id ?? row.request_id) === deepLink.id) return row;
            if ((row._mergedSegments || []).some(s => Number(s?.id) === deepLink.id)) return row;
        }
    }
    return null;
}
