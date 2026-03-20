import React, { createContext, useContext, useState, useMemo } from 'react';

const RequestFilterContext = createContext(null);

export function RequestFilterProvider({ children }) {
    const [quickFilter, setQuickFilter] = useState('this_month');
    const [customRange, setCustomRange] = useState({ start: null, end: null });
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    const queryParams = useMemo(() => {
        const params = {};
        const today = new Date();

        if (quickFilter === 'custom' && customRange.start && customRange.end) {
            params.start_date = customRange.start;
            params.end_date = customRange.end;
        } else if (quickFilter === 'this_week') {
            const monday = new Date(today);
            monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
            params.start_date = monday.toISOString().split('T')[0];
            params.end_date = today.toISOString().split('T')[0];
        } else if (quickFilter === 'last_7') {
            const d = new Date(today);
            d.setDate(d.getDate() - 7);
            params.start_date = d.toISOString().split('T')[0];
            params.end_date = today.toISOString().split('T')[0];
        } else if (quickFilter === 'last_30') {
            const d = new Date(today);
            d.setDate(d.getDate() - 30);
            params.start_date = d.toISOString().split('T')[0];
            params.end_date = today.toISOString().split('T')[0];
        } else if (quickFilter === 'last_month') {
            const d = new Date(today.getFullYear(), today.getMonth() - 1, 26);
            const e = new Date(today.getFullYear(), today.getMonth(), 25);
            params.start_date = d.toISOString().split('T')[0];
            params.end_date = e.toISOString().split('T')[0];
        } else {
            // this_month = default fiscal month (26th-25th)
            if (today.getDate() >= 26) {
                params.start_date = new Date(today.getFullYear(), today.getMonth(), 26).toISOString().split('T')[0];
                params.end_date = new Date(today.getFullYear(), today.getMonth() + 1, 25).toISOString().split('T')[0];
            } else {
                params.start_date = new Date(today.getFullYear(), today.getMonth() - 1, 26).toISOString().split('T')[0];
                params.end_date = new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0];
            }
        }

        if (selectedDepartment) params.department_id = selectedDepartment;
        if (selectedEmployees.length) params.employee_ids = selectedEmployees;

        return params;
    }, [quickFilter, customRange, selectedDepartment, selectedEmployees]);

    const value = useMemo(() => ({
        quickFilter, setQuickFilter,
        customRange, setCustomRange,
        selectedDepartment, setSelectedDepartment,
        selectedEmployees, setSelectedEmployees,
        queryParams,
    }), [quickFilter, customRange, selectedDepartment, selectedEmployees, queryParams]);

    return (
        <RequestFilterContext.Provider value={value}>
            {children}
        </RequestFilterContext.Provider>
    );
}

export const useRequestFilter = () => {
    const ctx = useContext(RequestFilterContext);
    if (!ctx) throw new Error('useRequestFilter must be inside RequestFilterProvider');
    return ctx;
};
