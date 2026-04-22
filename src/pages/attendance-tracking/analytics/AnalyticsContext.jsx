import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../services/api';

const AnalyticsContext = createContext(null);
export const useAnalytics = () => useContext(AnalyticsContext);

/**
 * Provides global analytics state: date range, filters, bulk data, employee list.
 */
export function AnalyticsProvider({ children }) {
    // --- Date range ---
    const getFiscalDefaults = () => {
        const now = new Date();
        const d = now.getDate(), m = now.getMonth() + 1, y = now.getFullYear();
        let startMonth, startYear;
        if (d >= 26) {
            startMonth = m; startYear = y;
        } else {
            startMonth = m === 1 ? 12 : m - 1;
            startYear = m === 1 ? y - 1 : y;
        }
        const endMonth = startMonth === 12 ? 1 : startMonth + 1;
        const endYear = startMonth === 12 ? startYear + 1 : startYear;
        const fmt = (yr, mo, dy) => `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
        return {
            startDate: fmt(startYear, startMonth, 26),
            endDate: fmt(endYear, endMonth, 25),
        };
    };

    const defaults = getFiscalDefaults();
    const [startDate, setStartDate] = useState(defaults.startDate);
    const [endDate, setEndDate] = useState(defaults.endDate);

    // --- Filters ---
    const [departmentIds, setDepartmentIds] = useState([]);
    const [positionIds, setPositionIds] = useState([]);
    const [minAttendancePct, setMinAttendancePct] = useState(50);
    const [minAttendanceEnabled, setMinAttendanceEnabled] = useState(true);

    // --- Departments / Positions lists ---
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);

    // --- Team employees ---
    const [employees, setEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(true);

    // --- Bulk data ---
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastFetchedAt, setLastFetchedAt] = useState(null);

    // Query params for API calls
    const queryParams = useMemo(() => {
        const p = { start_date: startDate, end_date: endDate };
        if (departmentIds.length) p.department_ids = departmentIds.join(',');
        if (positionIds.length) p.position_ids = positionIds.join(',');
        if (minAttendanceEnabled && minAttendancePct > 0) p.min_attendance_pct = minAttendancePct;
        return p;
    }, [startDate, endDate, departmentIds, positionIds, minAttendancePct, minAttendanceEnabled]);

    // Fetch departments & positions once
    useEffect(() => {
        const load = async () => {
            try {
                const [deptRes, posRes] = await Promise.allSettled([
                    api.get('/departments/'),
                    api.get('/job-positions/'),
                ]);
                if (deptRes.status === 'fulfilled') {
                    const d = deptRes.value.data;
                    setDepartments(Array.isArray(d) ? d : d.results || []);
                }
                if (posRes.status === 'fulfilled') {
                    const d = posRes.value.data;
                    setPositions(Array.isArray(d) ? d : d.results || []);
                }
            } catch { /* silent */ }
        };
        load();
    }, []);

    // Fetch team employees
    useEffect(() => {
        const loadEmployees = async () => {
            setEmployeesLoading(true);
            try {
                const res = await api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY', include_indirect: true } });
                const d = res.data;
                setEmployees(Array.isArray(d) ? d : d.results || []);
            } catch {
                setEmployees([]);
            }
            setEmployeesLoading(false);
        };
        loadEmployees();
    }, []);

    // Fetch bulk analytics data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const sections = 'team_overview,entry_exit,work_hours,overtime,break_meal,absence_leave';
            const res = await api.get('/attendance-analytics/bulk/', {
                params: { ...queryParams, sections },
                timeout: 60000,
            });
            setData(res.data);
            setLastFetchedAt(new Date());
        } catch (err) {
            console.error('Bulk analytics error:', err);
        }
        setLoading(false);
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const value = useMemo(() => ({
        // Date
        startDate, setStartDate, endDate, setEndDate,
        // Filters
        departmentIds, setDepartmentIds,
        positionIds, setPositionIds,
        minAttendancePct, setMinAttendancePct,
        minAttendanceEnabled, setMinAttendanceEnabled,
        // Lookups
        departments, positions, employees, employeesLoading,
        // Data
        data, loading, lastFetchedAt, queryParams,
        refetch: fetchData,
    }), [startDate, endDate, departmentIds, positionIds, minAttendancePct, minAttendanceEnabled,
        departments, positions, employees, employeesLoading, data, loading, lastFetchedAt, queryParams, fetchData]);

    return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
