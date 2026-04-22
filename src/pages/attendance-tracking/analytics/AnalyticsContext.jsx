import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../services/api';

const AnalyticsContext = createContext(null);
export const useAnalytics = () => useContext(AnalyticsContext);

// ─── Fiscal month utilities ───
const TR_MONTHS = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function getFiscalMonth(offset = 0) {
    const now = new Date();
    const d = now.getDate(), m = now.getMonth() + 1, y = now.getFullYear();
    let baseMonth = d >= 26 ? m : (m === 1 ? 12 : m - 1);
    let baseYear = d >= 26 ? y : (m === 1 ? y - 1 : y);

    // Apply offset
    let targetMonth = baseMonth + offset;
    let targetYear = baseYear;
    while (targetMonth <= 0) { targetMonth += 12; targetYear--; }
    while (targetMonth > 12) { targetMonth -= 12; targetYear++; }

    const endMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    const endYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    const fmt = (yr, mo, dy) => `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;

    return {
        startDate: fmt(targetYear, targetMonth, 26),
        endDate: fmt(endYear, endMonth, 25),
        month: targetMonth,
        year: targetYear,
        label: `${TR_MONTHS[targetMonth]} ${targetYear}`,
    };
}

export function getFiscalRange(startOffset, endOffset) {
    const start = getFiscalMonth(startOffset);
    const end = getFiscalMonth(endOffset);
    return { startDate: start.startDate, endDate: end.endDate };
}

/** Compare mode options */
export const COMPARE_MODES = [
    { key: 'none', label: 'Karşılaştırma Kapalı' },
    { key: 'prev_month', label: 'Önceki Ay' },
    { key: 'prev_quarter', label: 'Önceki Çeyrek (3 Ay Ort.)' },
    { key: 'same_last_year', label: 'Geçen Yıl Aynı Ay' },
    { key: 'custom', label: 'Özel Dönem' },
];

/**
 * AnalyticsProvider — Provides global analytics state with period comparison support.
 */
export function AnalyticsProvider({ children }) {
    // ─── Primary period ───
    const current = getFiscalMonth(0);
    const [monthOffset, setMonthOffset] = useState(0);
    const [startDate, setStartDate] = useState(current.startDate);
    const [endDate, setEndDate] = useState(current.endDate);
    const [periodLabel, setPeriodLabel] = useState(current.label);
    const [isMultiMonth, setIsMultiMonth] = useState(false);

    // ─── Comparison period ───
    const [compareMode, setCompareMode] = useState('none');
    const [compareStartDate, setCompareStartDate] = useState('');
    const [compareEndDate, setCompareEndDate] = useState('');
    const [compareLabel, setCompareLabel] = useState('');

    // ─── Filters ───
    const [departmentIds, setDepartmentIds] = useState([]);
    const [positionIds, setPositionIds] = useState([]);
    const [minAttendancePct, setMinAttendancePct] = useState(50);
    const [minAttendanceEnabled, setMinAttendanceEnabled] = useState(true);

    // ─── Lookups ───
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(true);

    // ─── Data ───
    const [data, setData] = useState(null);
    const [compareData, setCompareData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [compareLoading, setCompareLoading] = useState(false);
    const [lastFetchedAt, setLastFetchedAt] = useState(null);

    // Navigate to a fiscal month by offset from current
    const navigateMonth = useCallback((offset) => {
        const fm = getFiscalMonth(offset);
        setMonthOffset(offset);
        setStartDate(fm.startDate);
        setEndDate(fm.endDate);
        setPeriodLabel(fm.label);
        setIsMultiMonth(false);
    }, []);

    // Navigate to a multi-month range
    const navigateRange = useCallback((startOff, endOff, label) => {
        const start = getFiscalMonth(startOff);
        const end = getFiscalMonth(endOff);
        setMonthOffset(endOff);
        setStartDate(start.startDate);
        setEndDate(end.endDate);
        setPeriodLabel(label || `${start.label} — ${end.label}`);
        setIsMultiMonth(true);
    }, []);

    // Update comparison dates when mode changes
    useEffect(() => {
        if (compareMode === 'none') {
            setCompareStartDate('');
            setCompareEndDate('');
            setCompareLabel('');
            setCompareData(null);
            return;
        }
        if (compareMode === 'prev_month') {
            const prev = getFiscalMonth(monthOffset - 1);
            setCompareStartDate(prev.startDate);
            setCompareEndDate(prev.endDate);
            setCompareLabel(prev.label);
        } else if (compareMode === 'prev_quarter') {
            const s = getFiscalMonth(monthOffset - 3);
            const e = getFiscalMonth(monthOffset - 1);
            setCompareStartDate(s.startDate);
            setCompareEndDate(e.endDate);
            setCompareLabel(`${s.label} — ${e.label} (Ort.)`);
        } else if (compareMode === 'same_last_year') {
            const prev = getFiscalMonth(monthOffset - 12);
            setCompareStartDate(prev.startDate);
            setCompareEndDate(prev.endDate);
            setCompareLabel(prev.label);
        }
        // 'custom' is set manually by user
    }, [compareMode, monthOffset]);

    // Query params
    const queryParams = useMemo(() => {
        const p = { start_date: startDate, end_date: endDate };
        if (departmentIds.length) p.department_ids = departmentIds.join(',');
        if (positionIds.length) p.position_ids = positionIds.join(',');
        if (minAttendanceEnabled && minAttendancePct > 0) p.min_attendance_pct = minAttendancePct;
        return p;
    }, [startDate, endDate, departmentIds, positionIds, minAttendancePct, minAttendanceEnabled]);

    const compareQueryParams = useMemo(() => {
        if (!compareStartDate || !compareEndDate) return null;
        const p = { start_date: compareStartDate, end_date: compareEndDate };
        if (departmentIds.length) p.department_ids = departmentIds.join(',');
        if (positionIds.length) p.position_ids = positionIds.join(',');
        if (minAttendanceEnabled && minAttendancePct > 0) p.min_attendance_pct = minAttendancePct;
        return p;
    }, [compareStartDate, compareEndDate, departmentIds, positionIds, minAttendancePct, minAttendanceEnabled]);

    // Fetch lookups once
    useEffect(() => {
        (async () => {
            try {
                const [deptRes, posRes] = await Promise.allSettled([api.get('/departments/'), api.get('/job-positions/')]);
                if (deptRes.status === 'fulfilled') { const d = deptRes.value.data; setDepartments(Array.isArray(d) ? d : d.results || []); }
                if (posRes.status === 'fulfilled') { const d = posRes.value.data; setPositions(Array.isArray(d) ? d : d.results || []); }
            } catch { /* silent */ }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            setEmployeesLoading(true);
            try {
                const res = await api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY', include_indirect: true } });
                const d = res.data;
                setEmployees(Array.isArray(d) ? d : d.results || []);
            } catch { setEmployees([]); }
            setEmployeesLoading(false);
        })();
    }, []);

    // Fetch primary data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const sections = 'team_overview,entry_exit,work_hours,overtime,break_meal,absence_leave';
            const res = await api.get('/attendance-analytics/bulk/', { params: { ...queryParams, sections }, timeout: 60000 });
            setData(res.data);
            setLastFetchedAt(new Date());
        } catch (err) { console.error('Bulk analytics error:', err); }
        setLoading(false);
    }, [queryParams]);

    // Fetch comparison data
    const fetchCompareData = useCallback(async () => {
        if (!compareQueryParams) { setCompareData(null); return; }
        setCompareLoading(true);
        try {
            const sections = 'team_overview,entry_exit,work_hours,overtime,break_meal';
            const res = await api.get('/attendance-analytics/bulk/', { params: { ...compareQueryParams, sections }, timeout: 60000 });
            setCompareData(res.data);
        } catch (err) {
            console.error('Compare analytics error:', err);
            setCompareData(null);
        }
        setCompareLoading(false);
    }, [compareQueryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchCompareData(); }, [fetchCompareData]);

    // Compute deltas between primary and compare data
    const deltas = useMemo(() => {
        if (!data?.team_overview?.kpi || !compareData?.team_overview?.kpi) return null;
        const primary = data.team_overview.kpi;
        const compare = compareData.team_overview.kpi;
        const delta = (a, b) => b !== 0 ? Math.round((a - b) / Math.abs(b) * 100) : (a > 0 ? 100 : 0);
        return {
            efficiency: delta(primary.avg_efficiency_pct || 0, compare.avg_efficiency_pct || 0),
            worked: delta(primary.total_worked_hours || 0, compare.total_worked_hours || 0),
            overtime: delta(primary.total_overtime_hours || 0, compare.total_overtime_hours || 0),
            missing: delta(primary.total_missing_hours || 0, compare.total_missing_hours || 0),
            attendance: delta(primary.attendance_rate_pct || 0, compare.attendance_rate_pct || 0),
            health: (primary.health_score || 0) - (compare.health_score || 0),
            raw: { primary, compare },
        };
    }, [data, compareData]);

    const value = useMemo(() => ({
        // Period
        startDate, endDate, periodLabel, isMultiMonth, monthOffset,
        setStartDate, setEndDate,
        navigateMonth, navigateRange,
        // Compare
        compareMode, setCompareMode,
        compareStartDate, setCompareStartDate,
        compareEndDate, setCompareEndDate,
        compareLabel,
        compareData, compareLoading,
        deltas,
        isComparing: compareMode !== 'none' && !!compareData,
        // Filters
        departmentIds, setDepartmentIds,
        positionIds, setPositionIds,
        minAttendancePct, setMinAttendancePct,
        minAttendanceEnabled, setMinAttendanceEnabled,
        // Lookups
        departments, positions, employees, employeesLoading,
        // Data
        data, loading, lastFetchedAt, queryParams, compareQueryParams,
        refetch: () => { fetchData(); fetchCompareData(); },
    }), [startDate, endDate, periodLabel, isMultiMonth, monthOffset,
        navigateMonth, navigateRange,
        compareMode, compareStartDate, compareEndDate, compareLabel,
        compareData, compareLoading, deltas,
        departmentIds, positionIds, minAttendancePct, minAttendanceEnabled,
        departments, positions, employees, employeesLoading,
        data, loading, lastFetchedAt, queryParams, compareQueryParams,
        fetchData, fetchCompareData]);

    return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
