import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { getIstanbulToday, getIstanbulTodayParts, getIstanbulDateOffset } from '../../../utils/dateUtils';

const AnalyticsFilterContext = createContext(null);

const EXCLUDED_STORAGE_KEY = 'analytics_excluded_employees';

function loadExcluded() {
    try {
        const raw = localStorage.getItem(EXCLUDED_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch { /* ignore */ }
    return [];
}

export function AnalyticsFilterProvider({ children }) {
    const [quickFilter, setQuickFilter] = useState('this_month');
    const [customRange, setCustomRange] = useState({ start: null, end: null });
    const [selectedDepartmentsRaw, setSelectedDepartmentsRaw] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [excludedEmployees, setExcludedEmployeesRaw] = useState(loadExcluded);
    const [compareDepartments, setCompareDepartments] = useState(false);
    const [showTeamAvg, setShowTeamAvg] = useState(true);

    // Wrap department setter to auto-reset compare mode when < 2 depts
    const setSelectedDepartments = useCallback((val) => {
        setSelectedDepartmentsRaw(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            if (next.length < 2) setCompareDepartments(false);
            return next;
        });
    }, []);
    const selectedDepartments = selectedDepartmentsRaw;

    // Persist excluded employees to localStorage
    const setExcludedEmployees = useCallback((val) => {
        setExcludedEmployeesRaw(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            try { localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const queryParams = useMemo(() => {
        const params = {};
        const todayStr = getIstanbulToday();
        const { year, month, day } = getIstanbulTodayParts();

        if (quickFilter === 'custom' && customRange.start && customRange.end) {
            params.start_date = customRange.start;
            params.end_date = customRange.end;
        } else if (quickFilter === 'last_90') {
            params.start_date = getIstanbulDateOffset(-90);
            params.end_date = todayStr;
        } else if (quickFilter === 'last_month') {
            const d = new Date(year, month - 2, 26);
            const e = new Date(year, month - 1, 25);
            params.start_date = d.toLocaleDateString('en-CA');
            params.end_date = e.toLocaleDateString('en-CA');
        } else {
            // this_month = default fiscal month (26th-25th)
            if (day >= 26) {
                params.start_date = new Date(year, month - 1, 26).toLocaleDateString('en-CA');
                params.end_date = new Date(year, month, 25).toLocaleDateString('en-CA');
            } else {
                params.start_date = new Date(year, month - 2, 26).toLocaleDateString('en-CA');
                params.end_date = new Date(year, month - 1, 25).toLocaleDateString('en-CA');
            }
        }

        if (selectedDepartments.length) params.department_ids = selectedDepartments.join(',');
        if (selectedEmployees.length) params.employee_ids = selectedEmployees.join(',');
        if (selectedRoles.length) params.position_ids = selectedRoles.join(',');
        if (excludedEmployees.length) params.exclude_employee_ids = excludedEmployees.join(',');
        if (compareDepartments && selectedDepartments.length >= 2) params.compare_departments = '1';

        return params;
    }, [quickFilter, customRange, selectedDepartments, selectedEmployees, selectedRoles, excludedEmployees, compareDepartments]);

    const value = useMemo(() => ({
        quickFilter, setQuickFilter,
        customRange, setCustomRange,
        selectedDepartments, setSelectedDepartments,
        selectedEmployees, setSelectedEmployees,
        selectedRoles, setSelectedRoles,
        excludedEmployees, setExcludedEmployees,
        compareDepartments, setCompareDepartments,
        showTeamAvg, setShowTeamAvg,
        queryParams,
    }), [quickFilter, customRange, selectedDepartments, selectedEmployees, selectedRoles, excludedEmployees, compareDepartments, showTeamAvg, queryParams, setSelectedDepartments, setExcludedEmployees]);

    return (
        <AnalyticsFilterContext.Provider value={value}>
            {children}
        </AnalyticsFilterContext.Provider>
    );
}

export const useAnalyticsFilter = () => {
    const ctx = useContext(AnalyticsFilterContext);
    if (!ctx) throw new Error('useAnalyticsFilter must be inside AnalyticsFilterProvider');
    return ctx;
};
