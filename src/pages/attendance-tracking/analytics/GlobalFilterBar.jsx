import React, { useState, useEffect, useMemo } from 'react';
import { Select, Switch, DatePicker, Tag } from 'antd';
import { Calendar, Building2, Users, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import { useAnalyticsFilter } from './AnalyticsFilterContext';
import api from '../../../services/api';

const QUICK_FILTERS = [
    { key: 'this_month', label: 'Bu Ay' },
    { key: 'last_month', label: 'Ge\u00e7en Ay' },
    { key: 'last_90', label: 'Son 3 Ay' },
    { key: 'custom', label: '\u00d6zel Aral\u0131k' },
];

export default function GlobalFilterBar() {
    const {
        quickFilter, setQuickFilter,
        customRange, setCustomRange,
        selectedDepartment, setSelectedDepartment,
        selectedEmployees, setSelectedEmployees,
        showTeamAvg, setShowTeamAvg,
    } = useAnalyticsFilter();

    const [departments, setDepartments] = useState([]);
    const [deptLoading, setDeptLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [empLoading, setEmpLoading] = useState(true);

    /* ── Fetch departments ─────────────────────────── */
    useEffect(() => {
        let cancelled = false;
        api.get('/departments/')
            .then(res => {
                if (cancelled) return;
                const depts = res.data?.results || res.data || [];
                setDepartments(depts);
            })
            .catch(err => {
                console.error('Department fetch error:', err);
            })
            .finally(() => {
                if (!cancelled) setDeptLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    /* ── Fetch employees ───────────────────────────── */
    useEffect(() => {
        let cancelled = false;
        api.get('/employees/', { params: { page_size: 200, is_active: true } })
            .then(res => {
                if (cancelled) return;
                const emps = res.data?.results || res.data || [];
                setEmployees(emps);
            })
            .catch(err => {
                console.error('Employee fetch error:', err);
            })
            .finally(() => {
                if (!cancelled) setEmpLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    /* ── Department options ────────────────────────── */
    const deptOptions = useMemo(() => {
        return departments.map(d => ({ value: d.id, label: d.name }));
    }, [departments]);

    /* ── Employee options (filtered by selected dept) ─ */
    const empOptions = useMemo(() => {
        let filtered = employees.filter(e => e.is_active !== false);
        if (selectedDepartment) {
            filtered = filtered.filter(e =>
                e.department === selectedDepartment || e.department_id === selectedDepartment
            );
        }
        return filtered.map(e => ({
            value: e.id,
            label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.user?.email || `#${e.id}`,
        }));
    }, [employees, selectedDepartment]);

    /* ── Employee name lookup for tags ──────────────── */
    const empNameMap = useMemo(() => {
        const map = {};
        employees.forEach(e => {
            map[e.id] = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.user?.email || `#${e.id}`;
        });
        return map;
    }, [employees]);

    /* ── Handle quick filter with last_90 logic ─────── */
    const handleQuickFilter = (key) => {
        setQuickFilter(key);
    };

    /* ── Handle employee selection (max 10) ─────────── */
    const handleEmployeeChange = (val) => {
        setSelectedEmployees((val || []).slice(0, 10));
    };

    /* ── Remove single employee tag ────────────────── */
    const handleRemoveEmployee = (empId) => {
        setSelectedEmployees(prev => prev.filter(id => id !== empId));
    };

    /* ── Clear all employees ───────────────────────── */
    const handleClearAllEmployees = () => {
        setSelectedEmployees([]);
    };

    return (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 rounded-xl shadow-sm">
            {/* ── Main filter row ──────────────────── */}
            <div className="px-4 py-3 flex flex-wrap items-center gap-4">
                {/* 1. Date Quick Filters */}
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        {QUICK_FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => handleQuickFilter(f.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                    quickFilter === f.key
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    {quickFilter === 'custom' && (
                        <DatePicker.RangePicker
                            size="small"
                            value={
                                customRange.start && customRange.end
                                    ? [dayjs(customRange.start), dayjs(customRange.end)]
                                    : null
                            }
                            onChange={(dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setCustomRange({
                                        start: dates[0].format('YYYY-MM-DD'),
                                        end: dates[1].format('YYYY-MM-DD'),
                                    });
                                }
                            }}
                            className="rounded-lg"
                            placeholder={['Ba\u015flang\u0131\u00e7', 'Biti\u015f']}
                        />
                    )}
                </div>

                {/* 2. Department Select */}
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400 shrink-0" />
                    <Select
                        value={selectedDepartment}
                        onChange={(val) => {
                            setSelectedDepartment(val ?? null);
                            // Clear employees when department changes
                            if (val !== selectedDepartment) {
                                setSelectedEmployees([]);
                            }
                        }}
                        options={deptOptions}
                        size="small"
                        loading={deptLoading}
                        className="min-w-[180px]"
                        popupMatchSelectWidth={false}
                        placeholder="T\u00fcm Departmanlar"
                        allowClear
                        onClear={() => {
                            setSelectedDepartment(null);
                        }}
                    />
                </div>

                {/* 3. Employee Multi-Select */}
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400 shrink-0" />
                    <Select
                        mode="multiple"
                        value={selectedEmployees}
                        onChange={handleEmployeeChange}
                        options={empOptions}
                        size="small"
                        loading={empLoading}
                        className="min-w-[240px]"
                        popupMatchSelectWidth={false}
                        placeholder="\u00c7al\u0131\u015fan se\u00e7 (maks 10)"
                        maxTagCount={3}
                        maxTagPlaceholder={(omitted) => `+${omitted.length} ki\u015fi`}
                        maxTagTextLength={12}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </div>

                {/* 4. Team Avg Toggle (pushed to right) */}
                <div className="flex items-center gap-2 ml-auto">
                    <TrendingUp size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Ekip Ort.</span>
                    <Switch
                        checked={showTeamAvg}
                        onChange={setShowTeamAvg}
                        size="small"
                    />
                </div>
            </div>

            {/* ── Selected employees row ───────────── */}
            {selectedEmployees.length > 0 && (
                <div className="px-4 pb-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                    {selectedEmployees.map(empId => (
                        <Tag
                            key={empId}
                            closable
                            onClose={() => handleRemoveEmployee(empId)}
                            className="rounded-full border-0"
                            style={{
                                backgroundColor: '#eef2ff',
                                color: '#4338ca',
                            }}
                        >
                            {empNameMap[empId] || `#${empId}`}
                        </Tag>
                    ))}
                    <button
                        onClick={handleClearAllEmployees}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1"
                    >
                        T\u00fcm\u00fcn\u00fc temizle
                    </button>
                </div>
            )}
        </div>
    );
}
