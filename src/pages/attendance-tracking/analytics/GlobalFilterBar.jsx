import React, { useState, useEffect, useMemo } from 'react';
import { Select, Switch, DatePicker, Tag, InputNumber, Badge } from 'antd';
import {
    Calendar, Building2, Users, TrendingUp, Briefcase,
    X, RotateCcw, SlidersHorizontal, ChevronDown, UserX, Filter,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useAnalyticsFilter } from './AnalyticsFilterContext';
import api from '../../../services/api';

const QUICK_FILTERS = [
    { key: 'this_month', label: 'Bu Ay' },
    { key: 'last_month', label: 'Geçen Ay' },
    { key: 'last_90', label: 'Son 3 Ay' },
    { key: 'custom', label: 'Özel Aralık' },
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
        // Advanced filters
        autoExcludeLowAttendance, setAutoExcludeLowAttendance,
        attendanceThreshold, setAttendanceThreshold,
        excludedDepartments, setExcludedDepartments,
        groupByRole, setGroupByRole,
    } = useAnalyticsFilter();

    const [departments, setDepartments] = useState([]);
    const [deptLoading, setDeptLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [empLoading, setEmpLoading] = useState(true);
    const [roles, setRoles] = useState([]);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [showQuickScope, setShowQuickScope] = useState(true);

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

    /* ── Department name lookup ─────────────────────── */
    const deptNameMap = useMemo(() => {
        const map = {};
        departments.forEach(d => { map[d.id] = d.name; });
        return map;
    }, [departments]);

    /* ── Bubble chip click handler (3-state cycle) ───── */
    const handleBubbleClick = (type, id) => {
        if (type === 'dept') {
            const isSelected = selectedDepartments.includes(id);
            const isExcluded = excludedDepartments.includes(id);

            if (isExcluded) {
                // Excluded → Normal (remove from excluded)
                setExcludedDepartments(prev => prev.filter(x => x !== id));
            } else if (isSelected) {
                // Selected → Excluded (remove from selected, add to excluded)
                setSelectedDepartments(prev => prev.filter(x => x !== id));
                setExcludedDepartments(prev => [...prev, id]);
            } else {
                // Normal → Selected
                setSelectedDepartments(prev => [...prev, id]);
            }
        }
    };

    const handleRoleBubbleClick = (id) => {
        setSelectedRoles(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

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

    /* ── Active filter detection ──────────────────── */
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedDepartments.length > 0) count++;
        if (selectedEmployees.length > 0) count++;
        if (selectedRoles.length > 0) count++;
        if (excludedEmployees.length > 0) count++;
        if (excludedDepartments.length > 0) count++;
        if (autoExcludeLowAttendance) count++;
        if (groupByRole) count++;
        return count;
    }, [selectedDepartments, selectedEmployees, selectedRoles, excludedEmployees, excludedDepartments, autoExcludeLowAttendance, groupByRole]);

    const hasActiveFilters = activeFilterCount > 0;

    const clearAllFilters = () => {
        setSelectedDepartments([]);
        setSelectedEmployees([]);
        setSelectedRoles([]);
        setExcludedEmployees([]);
        setExcludedDepartments([]);
        setQuickFilter('this_month');
        setCompareDepartments(false);
        setAutoExcludeLowAttendance(false);
        setAttendanceThreshold(50);
        setGroupByRole(false);
    };

    /* ── Advanced filter count (for the toggle badge) ── */
    const advancedFilterCount = useMemo(() => {
        let count = 0;
        if (autoExcludeLowAttendance) count++;
        if (excludedEmployees.length > 0) count++;
        if (excludedDepartments.length > 0) count++;
        if (groupByRole) count++;
        return count;
    }, [autoExcludeLowAttendance, excludedEmployees, excludedDepartments, groupByRole]);

    const showDepartmentSelector = departments.length > 1;

    return (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 rounded-xl shadow-sm">

            {/* ══════════════════════════════════════════════════════
                ROW 1: Tarih & Genel Ayarlar
               ══════════════════════════════════════════════════════ */}
            <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                {/* Date Quick Filters */}
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
                            placeholder={['Başlangıç', 'Bitiş']}
                        />
                    )}
                </div>

                {/* Separator */}
                <div className="w-px h-6 bg-slate-200 hidden sm:block" />

                {/* Team Avg Toggle */}
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Ekip Ort.</span>
                    <Switch
                        checked={showTeamAvg}
                        onChange={setShowTeamAvg}
                        size="small"
                    />
                </div>

                {/* Right side: Advanced toggle + Reset + Badge */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Active filter count badge */}
                    {hasActiveFilters && (
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-semibold"
                            title={`${activeFilterCount} aktif filtre`}
                        >
                            <Filter size={10} />
                            {activeFilterCount} filtre aktif
                        </span>
                    )}

                    {/* Clear all filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-medium hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Tüm filtreleri sıfırla"
                        >
                            <RotateCcw size={10} /> Tümünü Sıfırla
                        </button>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                ROW 2: Kapsam Filtreleri
               ══════════════════════════════════════════════════════ */}
            <div className="px-4 pb-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-2">
                {/* Department Multi-Select (only if >1 department) */}
                {showDepartmentSelector && (
                    <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden lg:inline">Departman:</span>
                        <Select
                            mode="multiple"
                            value={selectedDepartments}
                            onChange={handleDepartmentChange}
                            options={deptOptions}
                            size="small"
                            loading={deptLoading}
                            className="min-w-[200px]"
                            popupMatchSelectWidth={false}
                            placeholder="Departman seç"
                            maxTagCount={2}
                            maxTagPlaceholder={(omitted) => `+${omitted.length} departman`}
                            maxTagTextLength={10}
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                        {/* Compare toggle (only when >=2 depts selected) */}
                        {selectedDepartments.length >= 2 && (
                            <div className="flex items-center gap-1.5 ml-1">
                                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Karşılaştır</span>
                                <Switch
                                    checked={compareDepartments}
                                    onChange={setCompareDepartments}
                                    size="small"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Role/Position Multi-Select */}
                <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden lg:inline">Rol:</span>
                    <Select
                        mode="multiple"
                        value={selectedRoles}
                        onChange={handleRoleChange}
                        options={roleOptions}
                        size="small"
                        loading={rolesLoading}
                        className="min-w-[180px]"
                        popupMatchSelectWidth={false}
                        placeholder="Rol/Pozisyon seç"
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

                {/* Employee Multi-Select */}
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden lg:inline">Çalışan:</span>
                    <Select
                        mode="multiple"
                        value={selectedEmployees}
                        onChange={handleEmployeeChange}
                        options={empOptions}
                        size="small"
                        loading={empLoading}
                        className="min-w-[240px]"
                        popupMatchSelectWidth={false}
                        placeholder="Çalışan seç (maks 10)"
                        maxTagCount={3}
                        maxTagPlaceholder={(omitted) => `+${omitted.length} kişi`}
                        maxTagTextLength={12}
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </div>

                {/* Selected employee inline tags */}
                {selectedEmployees.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {selectedEmployees.map(empId => (
                            <Tag
                                key={empId}
                                closable
                                onClose={() => handleRemoveEmployee(empId)}
                                className="rounded-full border-0 text-xs"
                                style={{ backgroundColor: '#eef2ff', color: '#4338ca' }}
                            >
                                {empNameMap[empId] || `#${empId}`}
                            </Tag>
                        ))}
                        <button
                            onClick={() => setSelectedEmployees([])}
                            className="text-[10px] text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                        >
                            Tümünü temizle
                        </button>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
                ROW 2.5: Hızlı Kapsam Baloncukları
               ══════════════════════════════════════════════════════ */}
            {showQuickScope && (departments.length > 1 || roles.length > 0) && (
                <div className="px-4 py-2 border-t border-slate-100">
                    {/* Departman Baloncukları */}
                    {departments.length > 1 && (
                        <div className="mb-2">
                            <span className="text-[10px] text-slate-400 font-medium mr-2">Departmanlar:</span>
                            <div className="inline-flex flex-wrap gap-1.5">
                                {departments.map(dept => {
                                    const isExcluded = excludedDepartments.includes(dept.id);
                                    const isSelected = selectedDepartments.includes(dept.id);
                                    return (
                                        <button
                                            key={dept.id}
                                            onClick={() => handleBubbleClick('dept', dept.id)}
                                            className={`
                                                px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border
                                                ${isExcluded
                                                    ? 'bg-red-50 text-red-400 border-red-200 line-through opacity-60'
                                                    : isSelected
                                                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                                }
                                            `}
                                            title={isExcluded ? 'Hariç tutuldu \u2014 tıklayarak dahil edin' : isSelected ? 'Seçili \u2014 tıklayarak hariç tutun' : 'Tıklayarak filtreleyin'}
                                        >
                                            {isExcluded && <span className="mr-1">{'\u2715'}</span>}
                                            {isSelected && <span className="mr-1">{'\u2713'}</span>}
                                            {dept.name}
                                            {dept.employee_count != null && <span className="ml-1 text-[9px] opacity-60">({dept.employee_count})</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Rol Baloncukları */}
                    {roles.length > 0 && (
                        <div>
                            <span className="text-[10px] text-slate-400 font-medium mr-2">Roller:</span>
                            <div className="inline-flex flex-wrap gap-1.5">
                                {roles.map(role => {
                                    const isSelected = selectedRoles.includes(role.id);
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => handleRoleBubbleClick(role.id)}
                                            className={`
                                                px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border
                                                ${isSelected
                                                    ? 'bg-violet-100 text-violet-700 border-violet-300 shadow-sm'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                                                }
                                            `}
                                        >
                                            {isSelected && <span className="mr-1">{'\u2713'}</span>}
                                            {role.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Lejant */}
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Seçili (filtrele)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Hariç tutuldu</span>
                        <span>Tıklayarak: Seç {'\u2192'} Hariç Tut {'\u2192'} Normal</span>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                Advanced Toggle Button (between Row 2 and Row 3)
               ══════════════════════════════════════════════════════ */}
            <div className="px-4 pb-1 flex items-center">
                <button
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        advancedOpen || advancedFilterCount > 0
                            ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                >
                    <SlidersHorizontal size={12} />
                    <span>Gelişmiş Filtreler</span>
                    {advancedFilterCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {advancedFilterCount}
                        </span>
                    )}
                    <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════
                ROW 3: Gelişmiş Filtreler (collapsible)
               ══════════════════════════════════════════════════════ */}
            {advancedOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* 3a. Otomatik Hariç Tutma */}
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                            <span className="text-xs font-medium text-slate-600 mb-2 block">Otomatik Hariç Tutma</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoExcludeLowAttendance}
                                        onChange={(e) => setAutoExcludeLowAttendance(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs text-slate-600">Devam oranı</span>
                                </label>
                                <InputNumber
                                    size="small"
                                    min={0}
                                    max={100}
                                    value={attendanceThreshold}
                                    onChange={(val) => setAttendanceThreshold(val ?? 50)}
                                    disabled={!autoExcludeLowAttendance}
                                    className="w-16"
                                />
                                <span className="text-xs text-slate-600">% altı olanları hariç tut</span>
                            </div>
                        </div>

                        {/* 3d. Rol Bazlı Analiz Modu + Hızlı Kapsam */}
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                            <span className="text-xs font-medium text-slate-600 mb-2 block">Analiz Modu</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={groupByRole}
                                    onChange={(e) => setGroupByRole(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-slate-600">Rollere göre grupla ve analiz et</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input
                                    type="checkbox"
                                    checked={showQuickScope}
                                    onChange={(e) => setShowQuickScope(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-slate-600">Hızlı kapsam baloncuklarını göster</span>
                            </label>
                        </div>

                        {/* 3b. Kişi Hariç Tutma */}
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                            <span className="text-xs font-medium text-slate-600 mb-1.5 block">
                                <UserX size={12} className="inline mr-1 -mt-0.5" />
                                Analizden Hariç Tutulan Çalışanlar
                            </span>
                            <Select
                                mode="multiple"
                                value={excludedEmployees}
                                onChange={(val) => setExcludedEmployees(val || [])}
                                options={allEmpOptions}
                                size="small"
                                loading={empLoading}
                                className="w-full"
                                popupMatchSelectWidth={false}
                                placeholder="Hariç tutulacak çalışan seç..."
                                maxTagCount={3}
                                maxTagPlaceholder={(omitted) => `+${omitted.length} kişi`}
                                maxTagTextLength={12}
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                            {excludedEmployees.length > 0 && (
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

                        {/* 3c. Departman Hariç Tutma */}
                        <div className="p-3 bg-white rounded-lg border border-slate-100">
                            <span className="text-xs font-medium text-slate-600 mb-1.5 block">
                                <Building2 size={12} className="inline mr-1 -mt-0.5" />
                                Hariç Tutulan Departmanlar
                            </span>
                            <Select
                                mode="multiple"
                                value={excludedDepartments}
                                onChange={(val) => setExcludedDepartments(val || [])}
                                options={deptOptions}
                                size="small"
                                loading={deptLoading}
                                className="w-full"
                                popupMatchSelectWidth={false}
                                placeholder="Hariç tutulacak departman seç..."
                                maxTagCount={3}
                                maxTagPlaceholder={(omitted) => `+${omitted.length} departman`}
                                maxTagTextLength={10}
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                            {excludedDepartments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {excludedDepartments.map(deptId => (
                                        <Tag
                                            key={deptId}
                                            closable
                                            onClose={() => setExcludedDepartments(prev => prev.filter(id => id !== deptId))}
                                            className="rounded-full border-0 text-xs"
                                            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                                        >
                                            {deptNameMap[deptId] || `#${deptId}`}
                                        </Tag>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
