import React, { useState, useEffect, useMemo } from 'react';
import {
    Clock, AlertCircle, Users,
    Search, RefreshCw,
    BarChart3, List, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment';
import { getIstanbulToday } from '../utils/dateUtils';
import {
    formatMinutes,
    EmployeeAttendanceRow,
    HierarchyGroupRow,
    EmployeeDetailModal,
} from './attendance-tracking/AttendanceComponents';
import TeamAnalyticsDashboard from './attendance-tracking/TeamAnalyticsDashboard';
import TeamAttendanceAnalytics from '../components/TeamAttendanceAnalytics';
import OvertimeManagementTab from './attendance-tracking/OvertimeManagementTab';

const AttendanceTracking = ({ embedded = false, year: propYear, month: propMonth, scope = 'MONTHLY', onMemberClick }) => {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [hierarchyData, setHierarchyData] = useState([]); // Tree structure
    const [secondaryTeam, setSecondaryTeam] = useState([]);
    const [substituteTeams, setSubstituteTeams] = useState(null);
    const [showSubstituteTeam, setShowSubstituteTeam] = useState(false);

    // State — propMonth is 0-based (from Attendance.jsx), convert to 1-based for API
    // Default to fiscal month: if day >= 26, we're in next month's fiscal period
    const getFiscalMonth = () => {
        const [, m, d] = getIstanbulToday().split('-').map(Number);
        if (d >= 26) {
            return m + 1 > 12 ? 1 : m + 1;
        }
        return m;
    };
    const getFiscalYear = () => {
        const [y, m, d] = getIstanbulToday().split('-').map(Number);
        if (d >= 26 && m === 12) {
            return y + 1; // December 26+ → January of next year
        }
        return y;
    };
    const [year, setYear] = useState(propYear || getFiscalYear());
    const [month, setMonth] = useState(propMonth != null ? propMonth + 1 : getFiscalMonth());

    useEffect(() => {
        if (propYear) setYear(propYear);
        if (propMonth != null) setMonth(propMonth + 1);
    }, [propYear, propMonth]);

    const [selectedDept, setSelectedDept] = useState('');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortMode, setSortMode] = useState('NAME');
    const [hierarchySort, setHierarchySort] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [expandedDepts, setExpandedDepts] = useState({}); // {deptId: true}
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'analytics' | 'overtime'
    const [teamTab, setTeamTab] = useState('primary'); // 'primary' | 'secondary'

    // Summary State
    const [summary, setSummary] = useState({
        totalWorked: 0,
        totalOvertime: 0,
        totalMissing: 0,
        netBalance: 0,
        activeCount: 0,
        efficiency: 0
    });

    // PRIMARY-only stats: backend marks each employee with relationship_type
    const primaryStats = useMemo(() => {
        return stats.filter(s => s.relationship_type !== 'SECONDARY');
    }, [stats]);

    const secondaryStats = useMemo(() => {
        const secIds = new Set(secondaryTeam.map(e => e.id));
        return stats.filter(s => secIds.has(s.employee_id));
    }, [stats, secondaryTeam]);

    const [initialLoad, setInitialLoad] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [fiscalPeriod, setFiscalPeriod] = useState({ start: null, end: null });

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [year, month, selectedDept]);

    // Manual refresh handler (called by refresh button)
    const handleRefresh = () => {
        fetchAllData();
    };

    const fetchAllData = async () => {
        // Only show loading spinner on first load
        if (initialLoad) setLoading(true);
        setFetchError(null);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;
            params.include_inactive = 'true';

            const [statsRes, hierarchyRes, secondaryRes, substituteRes] = await Promise.allSettled([
                api.get('/dashboard/stats/', { params, timeout: 60000 }),
                api.get('/dashboard/team_hierarchy/', { timeout: 60000 }),
                api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY' }, timeout: 30000 }),
                api.get('/dashboard/substitute_team/', { timeout: 30000 })
            ]);

            // Process stats — response is { results: [...], fiscal_period_start, fiscal_period_end }
            const statsRaw = statsRes.status === 'fulfilled' ? statsRes.value.data : [];
            let data;
            if (statsRaw && !Array.isArray(statsRaw) && Array.isArray(statsRaw.results)) {
                data = statsRaw.results;
                setFiscalPeriod({
                    start: statsRaw.fiscal_period_start || null,
                    end: statsRaw.fiscal_period_end || null,
                });
            } else {
                data = Array.isArray(statsRaw) ? statsRaw : [];
            }
            setStats(data);

            // Summary: only count PRIMARY employees (exclude SECONDARY-only)
            const primaryData = data.filter(d => d.relationship_type !== 'SECONDARY');
            const worked = primaryData.reduce((acc, curr) => acc + (curr.total_worked || 0), 0);
            const overtime = primaryData.reduce((acc, curr) => acc + (curr.total_overtime || 0), 0);
            const missing = primaryData.reduce((acc, curr) => acc + (curr.total_missing || 0), 0);
            const balance = primaryData.reduce((acc, curr) => acc + (curr.monthly_net_balance || 0), 0);
            const online = primaryData.filter(d => d.is_online).length;

            setSummary({
                totalWorked: worked,
                totalOvertime: overtime,
                totalMissing: missing,
                netBalance: balance,
                activeCount: primaryData.length,
                onlineCount: online
            });

            // Process hierarchy
            const hierarchyData_raw = hierarchyRes.status === 'fulfilled' ? hierarchyRes.value.data : [];
            const hData = Array.isArray(hierarchyData_raw) ? hierarchyData_raw : [];
            setHierarchyData(hData);

            // Process secondary team
            let secData = [];
            if (secondaryRes.status === 'fulfilled') {
                secData = Array.isArray(secondaryRes.value.data) ? secondaryRes.value.data : [];
                setSecondaryTeam(secData);
            }

            // Auto-switch to secondary tab if no primary team but secondary exists
            const hasPrimary = data.some(d => d.relationship_type !== 'SECONDARY');
            if (!hasPrimary && secData.length > 0) {
                setTeamTab('secondary');
            } else if (hasPrimary && teamTab === 'secondary' && secData.length === 0) {
                setTeamTab('primary');
            }

            // Process substitute team
            if (substituteRes.status === 'fulfilled') {
                const subData = substituteRes.value.data;
                if (subData?.teams && Object.keys(subData.teams).length > 0) {
                    setSubstituteTeams(subData);
                } else {
                    setSubstituteTeams(null);
                }
            }
            if (initialLoad && hData.length) {
                const initialExpanded = {};
                const expandAll = (nodes) => {
                    nodes.forEach(n => {
                        if (n.children?.length > 0) {
                            initialExpanded[n.id] = true;
                            expandAll(n.children);
                        }
                    });
                };
                expandAll(hData);
                setExpandedDepts(prev => ({ ...prev, ...initialExpanded }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setFetchError(error.code === 'ECONNABORTED' ? 'Zaman aşımı: Veri yüklenemedi. Tekrar deneyin.' : 'Ekip verisi yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments/');
            setDepartments(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    // Turkish-aware normalize for search: lowercase + strip diacritics (ışık → isik)
    const trNorm = (s) => (s || '').toLocaleLowerCase('tr').replace(/[şçöüğı]/g, c => ({ ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', ı: 'i' })[c]);

    // Filter Logic (Common for List) — use primaryStats for primary tab
    const activeStats = teamTab === 'secondary' ? secondaryStats : primaryStats;
    const avgOT = activeStats.length > 0 ? activeStats.reduce((a, c) => a + (c.total_overtime || 0), 0) / activeStats.length : 0;

    const filteredStats = activeStats.filter(item => {
        const matchesSearch = trNorm(item.employee_name).includes(trNorm(searchTerm)) ||
            trNorm(item.department).includes(trNorm(searchTerm));

        if (!matchesSearch) return false;

        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'ONLINE') return item.is_online;
        if (filterStatus === 'LATE') return item.total_late > 0;
        if (filterStatus === 'OVERTIME') return item.total_overtime > 0;
        if (filterStatus === 'MISSING') return item.total_missing > 0;
        if (filterStatus === 'ABOVE_AVG_OT') return (item.total_overtime || 0) > avgOT && avgOT > 0;
        if (filterStatus === 'BELOW_TARGET') return (item.total_missing || 0) > 0;

        return true;
    });

    // Flatten hierarchy tree into ordered employee IDs
    const getHierarchyOrder = () => {
        const order = [];
        const flatten = (nodes) => {
            if (!nodes) return;
            nodes.forEach(node => {
                if (node.type !== 'GROUP' && node.id) order.push(node.id);
                if (node.children) flatten(node.children);
            });
        };
        flatten(hierarchyData);
        return order;
    };

    // Sort Logic
    const sortedStats = useMemo(() => {
        const stats = [...filteredStats];
        if (hierarchySort && hierarchyData.length > 0) {
            const order = getHierarchyOrder();
            stats.sort((a, b) => {
                const idxA = order.indexOf(a.employee_id);
                const idxB = order.indexOf(b.employee_id);
                return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
            });
        } else {
            stats.sort((a, b) => {
                if (sortMode === 'OT_DESC') return (b.total_overtime || 0) - (a.total_overtime || 0);
                if (sortMode === 'MISSING_DESC') return (b.total_missing || 0) - (a.total_missing || 0);
                if (sortMode === 'NORMAL_DESC') return (b.total_worked || 0) - (a.total_worked || 0);
                if (sortMode === 'NET_WORST') return (a.monthly_deviation || 0) - (b.monthly_deviation || 0);
                if (sortMode === 'NET_BEST') return (b.monthly_deviation || 0) - (a.monthly_deviation || 0);
                return (a.employee_name || '').localeCompare(b.employee_name || '', 'tr');
            });
        }
        return stats;
    }, [filteredStats, hierarchySort, hierarchyData, sortMode]);

    // --- HIERARCHY HELPERS ---

    // Merge Stats into Hierarchy Tree (manager-based)
    const getMergedHierarchy = () => {
        if (!hierarchyData || hierarchyData.length === 0) return [];

        // Create a map of stats for O(1) lookup
        const statsMap = {};
        stats.forEach(s => statsMap[s.employee_id] = s);

        const attachStats = (nodes) => {
            return nodes.map(node => {
                let newNode = { ...node };
                if (node.type === 'GROUP') {
                    // Role group node from backend
                    newNode.children = attachStats(node.children || []);
                } else {
                    newNode.type = 'EMP';
                    newNode.stats = statsMap[node.id] || null;
                    newNode.children = attachStats(node.children || []);
                }
                return newNode;
            });
        };

        return attachStats(hierarchyData);
    };

    const toggleDept = (id) => {
        setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleEmployeeClick = (employeeId) => {
        if (embedded && onMemberClick) {
            onMemberClick(employeeId);
        } else {
            navigate(`/attendance?employee_id=${employeeId}`);
        }
    };

    // Elapsed weeks (Monday-to-Monday) in the current fiscal period
    const elapsedWeeks = useMemo(() => {
        let fiscalStart, fiscalEnd;
        if (fiscalPeriod.start && fiscalPeriod.end) {
            fiscalStart = moment(fiscalPeriod.start);
            fiscalEnd = moment(fiscalPeriod.end);
        } else {
            // Fallback until backend responds
            fiscalStart = moment([year, month - 2, 26]);
            fiscalEnd = moment([year, month - 1, 25]);
        }
        const today = moment();
        const effectiveEnd = moment.min(today, fiscalEnd);

        if (effectiveEnd.isBefore(fiscalStart)) return 1;

        // Find first Monday on or after fiscal start
        const firstMonday = fiscalStart.clone();
        while (firstMonday.day() !== 1) firstMonday.add(1, 'day');

        // Days from first Monday to effective end
        const daysFromFirstMonday = effectiveEnd.diff(firstMonday, 'days');
        if (daysFromFirstMonday < 0) return 1;

        return Math.floor(daysFromFirstMonday / 7) + 1;
    }, [fiscalPeriod, year, month]);

    // Recursive function to aggregate stats for a node and its children (subordinates)
    const calculateNodeStats = (node) => {
        let agg = {
            count: 0, onlineCount: 0,
            total_worked: 0, total_overtime: 0, total_missing: 0,
            past_target_minutes: 0,
            today_normal: 0, today_overtime: 0, today_break: 0,
            monthly_deviation: 0,
            sum_daily_avg_worked: 0,
            sum_daily_avg_missing: 0,
            sum_daily_avg_overtime: 0,
        };

        // Count this node's own stats
        const s = node.stats || {};
        if (s.employee_id) {
            agg.count += 1;
            if (s.is_online) agg.onlineCount += 1;
            agg.total_worked += (s.total_worked || 0);
            agg.total_overtime += (s.total_overtime || 0);
            agg.total_missing += (s.total_missing || 0);
            agg.past_target_minutes += (s.past_target_minutes || 0);
            agg.today_normal += (s.today_normal || 0);
            agg.today_overtime += (s.today_overtime || 0);
            agg.today_break += (s.today_break || 0);
            agg.monthly_deviation += (s.monthly_deviation || 0);
            const days = s.elapsed_work_days || 1;
            agg.sum_daily_avg_worked += (s.total_worked || 0) / days;
            agg.sum_daily_avg_missing += (s.total_missing || 0) / days;
            agg.sum_daily_avg_overtime += (s.total_overtime || 0) / days;
        }

        // Aggregate children (subordinates)
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                const childStats = calculateNodeStats(child);
                agg.count += childStats.count;
                agg.onlineCount += childStats.onlineCount;
                agg.total_worked += childStats.total_worked;
                agg.total_overtime += childStats.total_overtime;
                agg.total_missing += childStats.total_missing;
                agg.past_target_minutes += childStats.past_target_minutes;
                agg.today_normal += childStats.today_normal;
                agg.today_overtime += childStats.today_overtime;
                agg.today_break += childStats.today_break;
                agg.monthly_deviation += childStats.monthly_deviation;
                agg.sum_daily_avg_worked += childStats.sum_daily_avg_worked;
                agg.sum_daily_avg_missing += childStats.sum_daily_avg_missing;
                agg.sum_daily_avg_overtime += childStats.sum_daily_avg_overtime;
            });
        }

        return agg;
    };

    // Check if any node in the subtree matches the current search/filter
    const hasMatchingDescendant = (node) => {
        if (!node) return false;
        // Check this node itself (only non-GROUP employee nodes)
        if (node.type !== 'GROUP') {
            const s = node.stats || {};
            const nameMatch = searchTerm === '' ||
                trNorm(node.name).includes(trNorm(searchTerm)) ||
                trNorm(node.title).includes(trNorm(searchTerm));
            let statusMatch = true;
            if (filterStatus === 'ONLINE') statusMatch = s.is_online;
            else if (filterStatus === 'OVERTIME') statusMatch = (s.total_overtime || 0) > 0;
            else if (filterStatus === 'MISSING') statusMatch = (s.total_missing || 0) > 0;
            if (nameMatch && statusMatch && (s.employee_id || stats.length === 0)) return true;
        }
        // Check children recursively
        if (node.children) {
            return node.children.some(child => hasMatchingDescendant(child));
        }
        return false;
    };

    const isSearchActive = searchTerm !== '' || (filterStatus !== 'ALL');

    const sortChildren = (children) => {
        if (!children || children.length === 0) return children;
        return [...children].sort((a, b) => {
            if (a.type === 'GROUP' && b.type !== 'GROUP') return -1;
            if (a.type !== 'GROUP' && b.type === 'GROUP') return 1;
            if (a.type === 'GROUP' && b.type === 'GROUP') return 0;
            const sa = a.stats || {};
            const sb = b.stats || {};
            if (sortMode === 'OT_DESC') return (sb.total_overtime || 0) - (sa.total_overtime || 0);
            if (sortMode === 'MISSING_DESC') return (sb.total_missing || 0) - (sa.total_missing || 0);
            if (sortMode === 'NORMAL_DESC') return (sb.total_worked || 0) - (sa.total_worked || 0);
            if (sortMode === 'NET_WORST') return (sa.monthly_deviation || 0) - (sb.monthly_deviation || 0);
            if (sortMode === 'NET_BEST') return (sb.monthly_deviation || 0) - (sa.monthly_deviation || 0);
            return (a.name || '').localeCompare(b.name || '', 'tr');
        });
    };

    const renderHierarchyRows = (nodes, depth = 0) => {
        if (!nodes) return null;
        const sorted = sortChildren(nodes);

        return sorted.map(node => {
            // GROUP node (role group header)
            if (node.type === 'GROUP') {
                // When searching, hide groups with no matching descendants
                if (isSearchActive && !hasMatchingDescendant(node)) return null;

                const isExpanded = expandedDepts[node.id];
                const nodeStats = calculateNodeStats(node);
                // Auto-expand when searching
                const showChildren = isSearchActive ? true : isExpanded;

                return (
                    <React.Fragment key={node.id}>
                        <HierarchyGroupRow
                            node={node}
                            depth={depth}
                            isExpanded={showChildren}
                            onToggle={() => toggleDept(node.id)}
                            nodeStats={nodeStats}
                            elapsedWeeks={elapsedWeeks}
                        />
                        {showChildren && renderHierarchyRows(node.children, depth + 1)}
                    </React.Fragment>
                );
            }

            const s = node.stats || {};
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedDepts[node.id];

            // Apply Search & Status Filter
            const matchesSearch = searchTerm === '' ||
                trNorm(node.name).includes(trNorm(searchTerm)) ||
                trNorm(node.title).includes(trNorm(searchTerm));

            let matchesStatus = true;
            if (filterStatus === 'ONLINE') matchesStatus = s.is_online;
            else if (filterStatus === 'OVERTIME') matchesStatus = (s.total_overtime || 0) > 0;
            else if (filterStatus === 'MISSING') matchesStatus = (s.total_missing || 0) > 0;

            // For managers: show if they match OR have matching descendants
            const selfMatches = matchesSearch && matchesStatus && (s.employee_id || stats.length === 0);
            const childrenMatch = hasChildren && isSearchActive && hasMatchingDescendant({ children: node.children });

            if (!selfMatches && !childrenMatch) return null;
            if (!s.employee_id && stats.length > 0 && !childrenMatch) return null;

            const nodeStats = hasChildren ? calculateNodeStats(node) : null;
            // Auto-expand managers when searching and children match
            const showChildren = isSearchActive ? true : isExpanded;

            return (
                <React.Fragment key={(hasChildren ? 'mgr-' : 'emp-') + node.id}>
                    <EmployeeAttendanceRow
                        s={s}
                        name={node.name}
                        title={node.title}
                        id={node.id}
                        depth={depth}
                        isManager={hasChildren}
                        nodeStats={nodeStats}
                        isExpanded={showChildren}
                        onToggle={hasChildren ? () => toggleDept(node.id) : null}
                        hierarchySort={hierarchySort}
                        onEmployeeClick={handleEmployeeClick}
                    />
                    {hasChildren && showChildren && renderHierarchyRows(node.children, depth + 1)}
                </React.Fragment>
            );
        });
    };

    return (
        <div className="p-2 sm:p-4 md:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-5">

            {/* Header Area */}
            {!embedded && (
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                            Yönetici Konsolu
                        </h1>
                        <p className="text-slate-400 mt-1 text-sm">Ekip performansı ve mesai durumunun gerçek zamanlı analizi</p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Personel ara..."
                                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all w-full md:w-44 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="h-5 w-px bg-slate-200"></div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 py-1.5 pl-2.5 pr-7 cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            <option value="ALL">Tüm Durumlar</option>
                            <option value="ONLINE">Ofiste</option>
                            <option value="OVERTIME">Fazla Mesai</option>
                            <option value="MISSING">Eksik</option>
                            <option value="ABOVE_AVG_OT">Ort. Üstü Mesai</option>
                            <option value="BELOW_TARGET">Beklenti Altı</option>
                        </select>
                        <div className="h-5 w-px bg-slate-200"></div>

                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 py-1.5 pl-2.5 pr-7 cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 py-1.5 pl-2.5 pr-7 cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            {moment.months().map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 py-1.5 pl-2.5 pr-7 cursor-pointer hover:border-indigo-300 transition-colors max-w-[180px]"
                        >
                            <option value="">Tüm Departmanlar</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="h-5 w-px bg-slate-200"></div>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50 border border-slate-200"
                            title="Verileri Yenile"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            )}

            {/* Embedded Controls */}
            {embedded && (
                <div className="flex flex-wrap gap-2.5 items-center mb-3">
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Ekip içinde ara..."
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all w-full outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:border-indigo-300 transition-colors max-w-[200px]"
                    >
                        <option value="">Tüm Ekip</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-2 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                        title="Verileri Yenile"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            )}

            {/* Executive Summary Cards */}
            <div className={`grid gap-3 md:gap-4 ${scope === 'DAILY' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'}`}>
                <div className="relative overflow-hidden bg-slate-800 text-white p-5 rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent" />
                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="p-2.5 bg-white/10 rounded-xl">
                            <Users size={22} className="text-white/90" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Toplam Personel</p>
                            <h3 className="text-2xl font-bold tabular-nums mt-0.5">{summary.activeCount}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl relative">
                            <Users size={22} />
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Şu an Ofiste</p>
                            <h3 className="text-2xl font-bold text-slate-800 tabular-nums mt-0.5">{summary.onlineCount}</h3>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-100 mt-3 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                            style={{ width: `${summary.activeCount > 0 ? (summary.onlineCount / summary.activeCount) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {scope !== 'DAILY' && (
                    <>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Fazla Mesai</p>
                                    <h3 className="text-2xl font-bold text-slate-800 tabular-nums mt-0.5">{formatMinutes(summary.totalOvertime)}</h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                        Ort: {formatMinutes(Math.round(summary.totalOvertime / (summary.activeCount || 1)))} / kişi
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
                            <div className="flex items-center gap-3.5">
                                <div className={`p-2.5 rounded-xl ${summary.totalMissing > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                                    <AlertCircle size={22} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Kayıp Zaman</p>
                                    <h3 className="text-2xl font-bold text-slate-800 tabular-nums mt-0.5">{formatMinutes(summary.totalMissing)}</h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                        Ort: {formatMinutes(Math.round(summary.totalMissing / (summary.activeCount || 1)))} / kişi
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Ana Tab'lar — show when secondary exists OR both exist */}
            {secondaryTeam.length > 0 && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 w-fit">
                    {primaryStats.length > 0 && (
                        <button
                            onClick={() => setTeamTab('primary')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                teamTab === 'primary'
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <Users size={16} />
                            Ana Ekibim
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-bold tabular-nums">
                                {primaryStats.length}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => setTeamTab('secondary')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            teamTab === 'secondary'
                                ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200/80'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Users size={16} />
                        İkincil Ekip
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold tabular-nums">
                            {secondaryTeam.length}
                        </span>
                    </button>
                </div>
            )}

            {/* View Toggle: Liste / Analiz / Ek Mesai */}
            {activeStats.length > 0 && (
                <div className={`flex items-center gap-1 bg-white p-1 rounded-xl border w-fit ${
                    teamTab === 'secondary' ? 'border-amber-200/80' : 'border-slate-200/80'
                }`}>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            viewMode === 'list'
                                ? teamTab === 'secondary'
                                    ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200/80'
                                    : 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <List size={14} />
                        Liste
                    </button>
                    <button
                        onClick={() => setViewMode('analytics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            viewMode === 'analytics'
                                ? teamTab === 'secondary'
                                    ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200/80'
                                    : 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <BarChart3 size={14} />
                        Analiz
                    </button>
                    <button
                        onClick={() => setViewMode('overtime')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            viewMode === 'overtime'
                                ? teamTab === 'secondary'
                                    ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200/80'
                                    : 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Clock size={14} />
                        Ek Mesai
                    </button>
                </div>
            )}

            {/* Analytics View */}
            {viewMode === 'analytics' && primaryStats.length > 0 && teamTab === 'primary' && (
                <TeamAttendanceAnalytics
                    stats={primaryStats}
                    year={year}
                    month={month}
                    secondaryTeam={secondaryTeam}
                    onPersonClick={(person) => setSelectedEmployee(person)}
                />
            )}
            {viewMode === 'analytics' && secondaryStats.length > 0 && teamTab === 'secondary' && (
                <TeamAnalyticsDashboard stats={secondaryStats} year={year} month={month} departmentId={selectedDept} relationshipType="SECONDARY" />
            )}

            {/* Overtime Management View */}
            {viewMode === 'overtime' && teamTab === 'primary' && (
                <OvertimeManagementTab
                    employees={primaryStats.map(s => ({
                        id: s.employee_id,
                        name: s.employee_name,
                        department: s.department,
                    }))}
                    onRefresh={handleRefresh}
                />
            )}
            {viewMode === 'overtime' && teamTab === 'secondary' && (
                <OvertimeManagementTab
                    employees={secondaryTeam.map(e => ({
                        id: e.id,
                        name: `${e.first_name} ${e.last_name}`,
                        department: typeof e.department === 'object' ? e.department?.name : (e.department || ''),
                    }))}
                    onRefresh={handleRefresh}
                />
            )}

            {/* Main Table */}
            {viewMode === 'list' && teamTab === 'primary' && <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4 px-4 md:px-5 py-2.5 border-b border-slate-100 bg-slate-50/40">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={hierarchySort}
                            onChange={(e) => setHierarchySort(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-600">Hiyerarşi Görünümü</span>
                    </label>
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 py-1.5 pl-2 pr-6 cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                        <option value="NAME">İsim (A-Z)</option>
                        <option value="OT_DESC">En Çok Ek Mesai</option>
                        <option value="MISSING_DESC">En Çok Eksik</option>
                        <option value="NORMAL_DESC">En Çok Çalışma</option>
                        <option value="NET_WORST">Net: En Çok Eksik</option>
                        <option value="NET_BEST">Net: En Çok Fazla</option>
                    </select>
                    <span className="text-[11px] text-slate-400 ml-auto tabular-nums">{primaryStats.length} kişi</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            {/* Section headers */}
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th colSpan="2" className="p-1.5 pl-5"></th>
                                <th colSpan="3" className="p-1.5 text-center">
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.12em] bg-indigo-50/80 px-2.5 py-0.5 rounded-full border border-indigo-100/80">Bugün</span>
                                </th>
                                <th colSpan="3" className="p-1.5 text-center">
                                    <span className="text-[9px] font-bold text-violet-500 uppercase tracking-[0.12em] bg-violet-50/80 px-2.5 py-0.5 rounded-full border border-violet-100/80">Aylık Birikimli</span>
                                </th>
                            </tr>
                            {/* Column headers */}
                            <tr className="border-b border-slate-200/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-2.5 pl-5 pr-3">Personel</th>
                                <th className="py-2.5 px-3 w-20">Durum</th>
                                <th className="py-2.5 px-3 text-center w-24">Normal</th>
                                <th className="py-2.5 px-3 text-center w-24">F. Mesai</th>
                                <th className="py-2.5 px-3 text-center w-20">Mola</th>
                                <th className="py-2.5 px-3 text-center w-24">Çalışma</th>
                                <th className="py-2.5 px-3 text-center w-24">F. Mesai</th>
                                <th className="py-2.5 px-3 text-center w-32">Net Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="8" className="p-12 text-center text-slate-400 animate-pulse">Yükleniyor...</td></tr>
                            ) : fetchError ? (
                                <tr><td colSpan="8" className="p-12 text-center">
                                    <div className="text-red-500 font-semibold mb-2">{fetchError}</div>
                                    <button onClick={handleRefresh} className="text-sm text-indigo-600 hover:text-indigo-800 font-bold">Tekrar Dene</button>
                                </td></tr>
                            ) : hierarchySort ? (
                                /* HIERARCHY MODE */
                                (() => {
                                    const mergedData = getMergedHierarchy();
                                    return mergedData.length === 0
                                        ? <tr><td colSpan="8" className="p-12 text-center text-slate-400">Veri bulunamadı.</td></tr>
                                        : renderHierarchyRows(mergedData);
                                })()
                            ) : (
                                /* FLAT LIST MODE */
                                sortedStats.length === 0 ? (
                                    <tr><td colSpan="8" className="p-12 text-center text-slate-400">Görüntülenecek veri bulunamadı.</td></tr>
                                ) : (
                                    sortedStats.map(item => (
                                        <EmployeeAttendanceRow
                                            key={'emp-' + item.employee_id}
                                            s={item}
                                            name={item.employee_name}
                                            title={item.department}
                                            id={item.employee_id}
                                            depth={0}
                                            hierarchySort={hierarchySort}
                                            onEmployeeClick={handleEmployeeClick}
                                        />
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>}

            {/* SECONDARY TEAM LIST */}
            {viewMode === 'list' && teamTab === 'secondary' && (
                <div className="bg-white rounded-2xl shadow-sm border border-amber-200/80 overflow-hidden">
                    <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/40 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-600">
                            İkincil ekip üyeleri için sadece ek mesai bilgileri görüntülenir.
                        </span>
                    </div>
                    <div className="divide-y divide-amber-50">
                        {secondaryTeam.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">İkincil ekip üyesi bulunamadı.</div>
                        ) : (
                            secondaryTeam.map(emp => {
                                const empStats = stats.find(s => s.employee_id === emp.id);
                                const otTotal = empStats ? (empStats.total_overtime || 0) : 0;
                                const otIntended = empStats?.ot_intended_minutes || 0;
                                const otPotential = empStats?.ot_potential_minutes || 0;
                                const otManual = empStats?.ot_manual_minutes || 0;
                                return (
                                    <div
                                        key={emp.id}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-amber-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-black text-amber-700">
                                                    {emp.first_name?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">{emp.first_name} {emp.last_name}</span>
                                                {emp.department && <span className="text-[11px] text-slate-400 ml-2">{typeof emp.department === 'object' ? emp.department.name : emp.department}</span>}
                                            </div>
                                            {otTotal > 0 && (
                                                <span className="text-[10px] font-bold text-amber-600 tabular-nums bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                                                    FM: {formatMinutes(otTotal)}
                                                </span>
                                            )}
                                            {otIntended > 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-bold border border-indigo-200">
                                                    Planlı {formatMinutes(otIntended)}
                                                </span>
                                            )}
                                            {otPotential > 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold border border-amber-200">
                                                    Algılanan {formatMinutes(otPotential)}
                                                </span>
                                            )}
                                            {otManual > 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold border border-violet-200">
                                                    Manuel {formatMinutes(otManual)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* SUBSTITUTE TEAM */}
            {substituteTeams && Object.keys(substituteTeams.teams).length > 0 && (
                <div className="mt-4 border-t border-indigo-200/50 pt-4">
                    <button
                        onClick={() => setShowSubstituteTeam(!showSubstituteTeam)}
                        className="flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-800 mb-3 transition-colors"
                    >
                        {showSubstituteTeam ? '▼' : '▶'}
                        Vekalet Ettiğim Ekip Üyeleri ({Object.values(substituteTeams.teams).reduce((sum, t) => sum + t.employees.length, 0)} kişi)
                    </button>
                    {showSubstituteTeam && (
                        <div className="space-y-3">
                            {Object.values(substituteTeams.teams).map(team => (
                                <div key={team.principal_id} className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/30">
                                    <div className="text-xs font-semibold text-indigo-600 mb-2">
                                        {team.principal_name} adına vekalet ({team.valid_from} — {team.valid_to})
                                    </div>
                                    <div className="space-y-1">
                                        {team.employees.map(emp => (
                                            <div key={emp.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-700">{emp.first_name} {emp.last_name}</span>
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">Vekalet</span>
                                                    {emp.department && <span className="text-xs text-slate-500">{typeof emp.department === 'object' ? emp.department.name : emp.department}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* DETAIL MODAL */}
            <EmployeeDetailModal
                employee={selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
            />
        </div >
    );
};

export default AttendanceTracking;
