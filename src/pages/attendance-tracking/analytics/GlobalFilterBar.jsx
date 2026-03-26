import React, { useState, useEffect, useMemo } from 'react';
import { Select, Switch, DatePicker, Tag, Popover, Badge } from 'antd';
import { Calendar, Building2, Users, TrendingUp, Briefcase, Settings } from 'lucide-react';
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
        selectedDepartments, setSelectedDepartments,
        selectedEmployees, setSelectedEmployees,
        selectedRoles, setSelectedRoles,
        excludedEmployees, setExcludedEmployees,
        compareDepartments, setCompareDepartments,
        showTeamAvg, setShowTeamAvg,
    } = useAnalyticsFilter();

    const [departments, setDepartments] = useState([]);
    const [deptLoading, setDeptLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [empLoading, setEmpLoading] = useState(true);
    const [roles, setRoles] = useState([]);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);

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

    /* ── Fetch job positions (roles) ───────────────── */
    useEffect(() => {
        let cancelled = false;
        api.get('/job-positions/')
            .then(res => {
                if (cancelled) return;
                const positions = res.data?.results || res.data || [];
                setRoles(positions);
            })
            .catch(err => {
                console.error('Job positions fetch error:', err);
            })
            .finally(() => {
                if (!cancelled) setRolesLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    /* ── Department options ────────────────────────── */
    const deptOptions = useMemo(() => {
        return departments.map(d => ({ value: d.id, label: d.name }));
    }, [departments]);

    /* ── Role/Position options ─────────────────────── */
    const roleOptions = useMemo(() => {
        return roles.map(r => ({ value: r.id, label: r.name }));
    }, [roles]);

    /* ── Employee options (filtered by selected depts) ─ */
    const empOptions = useMemo(() => {
        let filtered = employees.filter(e => e.is_active !== false);
        if (selectedDepartments.length > 0) {
            filtered = filtered.filter(e =>
                selectedDepartments.includes(e.department) || selectedDepartments.includes(e.department_id)
            );
        }
        return filtered.map(e => ({
            value: e.id,
            label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.user?.email || `#${e.id}`,
        }));
    }, [employees, selectedDepartments]);

    /* ── All employee options (for exclude list) ───── */
    const allEmpOptions = useMemo(() => {
        return employees
            .filter(e => e.is_active !== false)
            .map(e => ({
                value: e.id,
                label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.user?.email || `#${e.id}`,
            }));
    }, [employees]);

    /* ── Employee name lookup for tags ──────────────── */
    const empNameMap = useMemo(() => {
        const map = {};
        employees.forEach(e => {
            map[e.id] = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.user?.email || `#${e.id}`;
        });
        return map;
    }, [employees]);

    /* ── Handle quick filter ─────────────────────────── */
    const handleQuickFilter = (key) => {
        setQuickFilter(key);
    };

    /* ── Handle department change ─────────────────────── */
    const handleDepartmentChange = (val) => {
        setSelectedDepartments(val || []);
        // Clear employees when departments change
        setSelectedEmployees([]);
    };

    /* ── Handle employee selection (max 10) ─────────── */
    const handleEmployeeChange = (val) => {
        setSelectedEmployees((val || []).slice(0, 10));
    };

    /* ── Handle role selection ───────────────────────── */
    const handleRoleChange = (val) => {
        setSelectedRoles(val || []);
    };

    /* ── Remove single employee tag ────────────────── */
    const handleRemoveEmployee = (empId) => {
        setSelectedEmployees(prev => prev.filter(id => id !== empId));
    };

    /* ── Clear all employees ───────────────────────── */
    const handleClearAllEmployees = () => {
        setSelectedEmployees([]);
    };

    /* ── Excluded employees count ──────────────────── */
    const excludedCount = excludedEmployees.length;

    /* ── Settings popover content ──────────────────── */
    const settingsContent = (
        <div className="w-[320px]">
            <div className="mb-2 text-sm font-semibold text-slate-700">Analizden Hari\u00e7 Tut</div>
            <p className="text-xs text-slate-400 mb-3">
                Se\u00e7ilen \u00e7al\u0131\u015fanlar t\u00fcm analiz sonu\u00e7lar\u0131ndan hari\u00e7 tutulur. Tercihleriniz otomatik kaydedilir.
            </p>
            <Select
                mode="multiple"
                value={excludedEmployees}
                onChange={(val) => setExcludedEmployees(val || [])}
                options={allEmpOptions}
                size="small"
                loading={empLoading}
                className="w-full"
                popupMatchSelectWidth={false}
                placeholder="\u00c7al\u0131\u015fan se\u00e7..."
                maxTagCount={3}
                maxTagPlaceholder={(omitted) => `+${omitted.length} ki\u015fi`}
                maxTagTextLength={12}
                allowClear
                showSearch
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
            />
            {excludedCount > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {excludedEmployees.map(empId => (
                        <Tag
                            key={empId}
                            closable
                            onClose={() => setExcludedEmployees(prev => prev.filter(id => id !== empId))}
                            className="rounded-full border-0 text-xs"
                            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                        >
                            {empNameMap[empId] || `#${empId}`}
                        </Tag>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 rounded-xl shadow-sm">
            {/* ── Row 1: Date + Department + Role + Settings ── */}
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

                {/* 2. Department Multi-Select */}
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400 shrink-0" />
                    <Select
                        mode="multiple"
                        value={selectedDepartments}
                        onChange={handleDepartmentChange}
                        options={deptOptions}
                        size="small"
                        loading={deptLoading}
                        className="min-w-[200px]"
                        popupMatchSelectWidth={false}
                        placeholder="Departman se\u00e7"
                        maxTagCount={2}
                        maxTagPlaceholder={(omitted) => `+${omitted.length} departman`}
                        maxTagTextLength={10}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </div>

                {/* 3. Role/Position Multi-Select */}
                <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-slate-400 shrink-0" />
                    <Select
                        mode="multiple"
                        value={selectedRoles}
                        onChange={handleRoleChange}
                        options={roleOptions}
                        size="small"
                        loading={rolesLoading}
                        className="min-w-[180px]"
                        popupMatchSelectWidth={false}
                        placeholder="Rol/Pozisyon se\u00e7"
                        maxTagCount={2}
                        maxTagPlaceholder={(omitted) => `+${omitted.length} rol`}
                        maxTagTextLength={10}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </div>

                {/* 4. Department Compare Toggle (only when >=2 depts selected) */}
                {selectedDepartments.length >= 2 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Departman Kar\u015f\u0131la\u015ft\u0131r</span>
                        <Switch
                            checked={compareDepartments}
                            onChange={setCompareDepartments}
                            size="small"
                        />
                    </div>
                )}

                {/* 5. Team Avg Toggle + Settings (pushed to right) */}
                <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Ekip Ort.</span>
                        <Switch
                            checked={showTeamAvg}
                            onChange={setShowTeamAvg}
                            size="small"
                        />
                    </div>

                    {/* Settings (Excluded Employees) */}
                    <Popover
                        content={settingsContent}
                        title={null}
                        trigger="click"
                        open={settingsOpen}
                        onOpenChange={setSettingsOpen}
                        placement="bottomRight"
                    >
                        <Badge count={excludedCount} size="small" offset={[-2, 2]}>
                            <button
                                className={`p-1.5 rounded-lg transition-colors ${
                                    excludedCount > 0
                                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                }`}
                                title="Ayarlar"
                            >
                                <Settings size={16} />
                            </button>
                        </Badge>
                    </Popover>
                </div>
            </div>

            {/* ── Row 2: Employee Select + Employee Tags ── */}
            <div className="px-4 pb-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-2">
                {/* Employee Multi-Select */}
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

                {/* Selected employee tags */}
                {selectedEmployees.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
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
        </div>
    );
}
