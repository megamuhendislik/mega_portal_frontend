import React, { createContext, useContext, useState, useMemo } from 'react';
import { getIstanbulToday, getIstanbulTodayParts, getIstanbulDateOffset } from '../../../utils/dateUtils';

const AnalyticsFilterContext = createContext(null);

export function AnalyticsFilterProvider({ children }) {
    const [quickFilter, setQuickFilter] = useState('this_month');
    const [customRange, setCustomRange] = useState({ start: null, end: null });
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [showTeamAvg, setShowTeamAvg] = useState(true);

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

        if (selectedDepartment) params.department_id = selectedDepartment;
        if (selectedEmployees.length) params.employee_ids = selectedEmployees.join(',');

        return params;
    }, [quickFilter, customRange, selectedDepartment, selectedEmployees]);

    const value = useMemo(() => ({
        quickFilter, setQuickFilter,
        customRange, setCustomRange,
        selectedDepartment, setSelectedDepartment,
        selectedEmployees, setSelectedEmployees,
        showTeamAvg, setShowTeamAvg,
        queryParams,
    }), [quickFilter, customRange, selectedDepartment, selectedEmployees, showTeamAvg, queryParams]);

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
