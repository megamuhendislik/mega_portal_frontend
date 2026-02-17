import React, { useState, useEffect } from 'react';
import {
    Calendar, Filter, Download, ChevronRight, Clock, AlertCircle,
    CheckCircle, Coffee, Users, TrendingUp, Activity, Briefcase,
    MoreHorizontal, Search, ArrowUpRight, ArrowDownRight, X, LogIn, LogOut,
    Network, Filter as FilterIcon, ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment';
import useInterval from '../hooks/useInterval';

const AttendanceTracking = ({ embedded = false, year: propYear, month: propMonth, scope = 'MONTHLY', onMemberClick }) => {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('HIERARCHY'); // LIST, GRID, HIERARCHY
    const [matrixData, setMatrixData] = useState(null);
    const [hierarchyData, setHierarchyData] = useState([]); // Tree structure

    // State
    const [year, setYear] = useState(propYear || moment().year());
    const [month, setMonth] = useState(propMonth || moment().month() + 1);

    useEffect(() => {
        if (propYear) setYear(propYear);
        if (propMonth) setMonth(propMonth);
    }, [propYear, propMonth]);

    const [selectedDept, setSelectedDept] = useState('');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortMode, setSortMode] = useState('NAME');
    const [hierarchySort, setHierarchySort] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [expandedDepts, setExpandedDepts] = useState({}); // {deptId: true}

    // Summary State
    const [summary, setSummary] = useState({
        totalWorked: 0,
        totalOvertime: 0,
        totalMissing: 0,
        netBalance: 0,
        activeCount: 0,
        efficiency: 0
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (viewMode === 'GRID') {
            fetchTeamMatrix();
        } else if (viewMode === 'HIERARCHY') {
            fetchHierarchy(); // Hierarchy needs stats too, but we fetch hierarchy structure first/parallel
            fetchStats();
        } else {
            fetchStats();
        }
    }, [viewMode, year, month, selectedDept]);

    // Auto-Refresh
    useInterval(() => {
        if (!loading) {
            viewMode === 'GRID' ? fetchTeamMatrix() : fetchStats();
        }
    }, 30000);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments/');
            setDepartments(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;
            params.include_inactive = 'true'; // Backend supports this now

            const res = await api.get('/dashboard/stats/', { params });
            const data = Array.isArray(res.data) ? res.data : [];
            setStats(data);

            // Calculate Executive Summaries
            const worked = data.reduce((acc, curr) => acc + (curr.total_worked || 0), 0);
            const required = data.reduce((acc, curr) => acc + (curr.monthly_required || 0), 0);
            const overtime = data.reduce((acc, curr) => acc + (curr.total_overtime || 0), 0);
            const missing = data.reduce((acc, curr) => acc + (curr.total_missing || 0), 0);
            const balance = data.reduce((acc, curr) => acc + (curr.monthly_net_balance || 0), 0);

            // Online Count (Real-Time)
            const online = (data || []).filter(d => d.is_online).length;
            const active = data.length;

            setSummary({
                totalWorked: worked,
                totalOvertime: overtime,
                totalMissing: missing,
                netBalance: balance,
                activeCount: active,
                onlineCount: online // Replaces Efficiency
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamMatrix = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;
            const res = await api.get('/stats/team_matrix/', { params });
            // Matrix data must have .data property which is array
            setMatrixData(res.data && Array.isArray(res.data.data) ? res.data : null);
        } catch (error) {
            console.error('Error fetching matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHierarchy = async () => {
        setLoading(true);
        try {
            const res = await api.get('/dashboard/team_hierarchy/');
            setHierarchyData(Array.isArray(res.data) ? res.data : []);
            // Auto expand all nodes that have children
            if (Array.isArray(res.data)) {
                const initialExpanded = {};
                const expandAll = (nodes) => {
                    nodes.forEach(n => {
                        if (n.children && n.children.length > 0) {
                            initialExpanded[n.id] = true;
                            expandAll(n.children);
                        }
                    });
                };
                expandAll(res.data);
                setExpandedDepts(prev => ({ ...prev, ...initialExpanded }));
            }
        } catch (error) {
            console.error('Error fetching hierarchy:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatMinutes = (minutes) => {
        if (!minutes) return '0s 0dk';
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;
        return `${hours}s ${mins}dk`;
    };

    const renderDeviation = (statsObj) => {
        const missing = statsObj.total_missing || 0;
        const overtime = statsObj.total_overtime || 0;

        if (missing > 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
                    <ArrowDownRight size={12} /> Eksik
                </span>
            );
        }
        if (overtime > 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                    <ArrowUpRight size={12} /> Fazla
                </span>
            );
        }
        return <span className="text-slate-300">—</span>;
    };

    // Filter Logic (Common for List)
    const avgOT = stats.length > 0 ? stats.reduce((a, c) => a + (c.total_overtime || 0), 0) / stats.length : 0;

    const filteredStats = stats.filter(item => {
        const matchesSearch = (item.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.job_title || '').toLowerCase().includes(searchTerm.toLowerCase());

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
    const sortedStats = [...filteredStats].sort((a, b) => {
        if (hierarchySort && hierarchyData.length > 0) {
            const order = getHierarchyOrder();
            const idxA = order.indexOf(a.employee_id);
            const idxB = order.indexOf(b.employee_id);
            return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
        }
        if (sortMode === 'OT_DESC') return (b.total_overtime || 0) - (a.total_overtime || 0);
        if (sortMode === 'MISSING_DESC') return (b.total_missing || 0) - (a.total_missing || 0);
        if (sortMode === 'NORMAL_DESC') return (b.total_worked || 0) - (a.total_worked || 0);
        return (a.employee_name || '').localeCompare(b.employee_name || '', 'tr');
    });

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

    // Recursive function to aggregate stats for a node and its children (subordinates)
    const calculateNodeStats = (node) => {
        let agg = {
            count: 0, onlineCount: 0,
            total_worked: 0, total_overtime: 0, total_missing: 0,
            today_normal: 0, today_overtime: 0, today_break: 0,
            monthly_deviation: 0
        };

        // Count this node's own stats
        const s = node.stats || {};
        if (s.employee_id) {
            agg.count += 1;
            if (s.is_online) agg.onlineCount += 1;
            agg.total_worked += (s.total_worked || 0);
            agg.total_overtime += (s.total_overtime || 0);
            agg.total_missing += (s.total_missing || 0);
            agg.today_normal += (s.today_normal || 0);
            agg.today_overtime += (s.today_overtime || 0);
            agg.today_break += (s.today_break || 0);
            agg.monthly_deviation += (s.monthly_deviation || 0);
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
                agg.today_normal += childStats.today_normal;
                agg.today_overtime += childStats.today_overtime;
                agg.today_break += childStats.today_break;
                agg.monthly_deviation += childStats.monthly_deviation;
            });
        }

        return agg;
    };

    const renderHierarchyRows = (nodes, depth = 0) => {
        if (!nodes) return null;

        return nodes.map(node => {
            // GROUP node (role group header)
            if (node.type === 'GROUP') {
                const isExpanded = expandedDepts[node.id];
                const nodeStats = calculateNodeStats(node);
                const memberCount = node.children ? node.children.length : 0;

                return (
                    <React.Fragment key={node.id}>
                        <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                            <td className="p-3 pl-6">
                                <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleDept(node.id)} style={{ paddingLeft: `${depth * 20}px` }}>
                                    <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'}`}>
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                                    </div>
                                    <span className="font-bold text-sm text-slate-700">{node.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200">{memberCount} Kişi</span>
                                </div>
                            </td>
                            <td className="p-3">
                                {nodeStats.onlineCount > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        {nodeStats.onlineCount} Ofiste
                                    </span>
                                )}
                            </td>
                            <td className="p-3">
                                {nodeStats.today_normal > 0 && <span className="text-xs font-mono font-bold text-slate-600">{formatMinutes(nodeStats.today_normal)}</span>}
                            </td>
                            <td className="p-3 text-center">
                                {nodeStats.today_overtime > 0 && <span className="text-xs font-mono font-bold text-amber-600">+{formatMinutes(nodeStats.today_overtime)}</span>}
                            </td>
                            <td className="p-3 text-center">
                                {nodeStats.today_break > 0 && <span className="text-xs font-mono font-bold text-slate-500">{formatMinutes(nodeStats.today_break)}</span>}
                            </td>
                            <td className="p-3 text-right">
                                {renderDeviation(nodeStats)}
                            </td>
                            <td className="p-3"></td>
                        </tr>
                        {isExpanded && renderHierarchyRows(node.children, depth + 1)}
                    </React.Fragment>
                );
            }

            const s = node.stats || {};
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedDepts[node.id];

            // Apply Search & Status Filter
            const matchesSearch = searchTerm === '' ||
                (node.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (node.title || '').toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            if (filterStatus === 'ONLINE') matchesStatus = s.is_online;
            else if (filterStatus === 'OVERTIME') matchesStatus = s.total_overtime > 0;
            else if (filterStatus === 'MISSING') matchesStatus = s.total_missing > 0;

            if (!matchesSearch || !matchesStatus) return null;
            if (!s.employee_id && stats.length > 0) return null;

            // Manager row (has subordinates) - show as expandable with aggregate stats
            if (hasChildren) {
                const nodeStats = calculateNodeStats(node);

                return (
                    <React.Fragment key={'mgr-' + node.id}>
                        <tr className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-100/50 transition-all">
                            <td className="p-3 pl-6">
                                <div className="flex items-center gap-3" style={{ paddingLeft: `${depth * 20}px` }}>
                                    <div className="cursor-pointer p-1 rounded-md transition-colors bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500" onClick={() => toggleDept(node.id)}>
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                                    </div>
                                    <div className="relative shrink-0">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                                            {(node.name || '?').charAt(0)}
                                        </div>
                                        {s.is_online && (
                                            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500"></span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700 text-sm cursor-pointer hover:text-indigo-600 hover:underline transition-colors" onClick={(e) => { e.stopPropagation(); handleEmployeeClick(node.id); }}>{node.name}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100 font-semibold">{nodeStats.count} Kişi</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-medium">{node.title}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-3">
                                {s.is_online ?
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Ofiste</span> :
                                    <span className="text-[10px] font-bold text-slate-400">Dışarıda</span>
                                }
                            </td>
                            <td className="p-3">
                                <span className="text-xs font-bold text-slate-700">{formatMinutes(s.today_normal)}</span>
                            </td>
                            <td className="p-3 text-center">
                                {s.today_overtime > 0 ? <span className="text-amber-600 font-bold text-xs">+{formatMinutes(s.today_overtime)}</span> : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-3 text-center">
                                {s.today_break > 0 ? <span className="text-slate-500 font-medium text-xs">{formatMinutes(s.today_break)}</span> : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-3 text-right">
                                {renderDeviation(nodeStats)}
                            </td>
                            <td className="p-3 text-center">
                                <button className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-md transition-colors" onClick={() => setSelectedEmployee(s)}>
                                    <Activity size={14} />
                                </button>
                            </td>
                        </tr>
                        {isExpanded && renderHierarchyRows(node.children, depth + 1)}
                    </React.Fragment>
                );
            }

            // Leaf employee row (no subordinates)
            return (
                <React.Fragment key={'emp-' + node.id}>
                    <tr className="hover:bg-slate-50/80 transition-all group border-b border-slate-50">
                        <td className="p-4 pl-6">
                            <div className="flex items-center gap-3" style={{ paddingLeft: `${depth * 20}px` }}>
                                <div className="relative shrink-0">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-white text-slate-600 border border-slate-100 shadow-sm">
                                        {(node.name || '?').charAt(0)}
                                    </div>
                                    {s.is_online && (
                                        <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500"></span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-slate-700 text-sm whitespace-nowrap cursor-pointer hover:text-indigo-600 hover:underline transition-colors" onClick={() => handleEmployeeClick(node.id)}>{node.name}</span>
                                    <span className="text-[11px] text-slate-400 font-medium">{node.title}</span>
                                </div>
                            </div>
                        </td>
                        <td className="p-4">
                            {s.is_online ?
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Ofiste</span> :
                                <span className="text-[10px] font-bold text-slate-400">Dışarıda</span>
                            }
                        </td>
                        <td className="p-4">
                            <span className="text-xs font-bold text-slate-700">{formatMinutes(s.today_normal)}</span>
                        </td>
                        <td className="p-4 text-center">
                            {s.today_overtime > 0 ? <span className="text-amber-600 font-bold text-xs">+{formatMinutes(s.today_overtime)}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-4 text-center">
                            {s.today_break > 0 ? <span className="text-slate-500 font-medium text-xs">{formatMinutes(s.today_break)}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-4 text-right">
                            {renderDeviation(s)}
                        </td>
                        <td className="p-4 text-center">
                            <button className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-md transition-colors" onClick={() => setSelectedEmployee(s)}>
                                <Activity size={14} />
                            </button>
                        </td>
                    </tr>
                </React.Fragment>
            );
        });
    };

    const renderHierarchyView = () => {
        const mergedData = getMergedHierarchy();

        return (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="p-4 pl-6">Organizasyon / Personel</th>
                                <th className="p-4 w-24">Durum</th>
                                <th className="p-4 w-32">Bugün Çalışma</th>
                                <th className="p-4 text-center w-24">F. Mesai</th>
                                <th className="p-4 text-center w-24">Mola</th>
                                <th className="p-4 text-right w-24">Aylık Durum</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400 animate-pulse">Organizasyon şeması yükleniyor...</td></tr>
                            ) : mergedData.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400">Veri bulunamadı.</td></tr>
                            ) : (
                                renderHierarchyRows(mergedData)
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderGridView = () => {
        if (!matrixData) return null;
        const daysHeader = Array.from({ length: matrixData.days_in_month }, (_, i) => i + 1);

        return (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-4 text-left border-b min-w-[200px] sticky left-0 z-10 bg-slate-50/95 backdrop-blur">Personel</th>
                                {daysHeader.map(d => (
                                    <th key={d} className="p-2 text-center border-b min-w-[40px] text-xs font-semibold text-slate-500">
                                        {d}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrixData.data.map(row => (
                                <tr key={row.employee.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0">
                                    <td className="p-4 bg-white/95 sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="font-bold text-slate-800">{row.employee.name}</div>
                                        <div className="text-xs text-slate-500">{row.employee.department}</div>
                                    </td>
                                    {row.days.map((day, idx) => (
                                        <td key={idx} className="p-1 text-center relative group">
                                            <div
                                                className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-110 hover:shadow-md cursor-help"
                                                style={{ backgroundColor: day.color }}
                                            >
                                                {day.status === 'NORMAL' ? '✓' :
                                                    day.status === 'MISSING' ? '!' :
                                                        day.status === 'OVERTIME' ? '+' :
                                                            day.status === 'OFF' ? '-' :
                                                                day.status === 'HOLIDAY' ? 'H' :
                                                                    day.status === 'LEAVE' ? 'İ' : '•'}
                                            </div>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-48 bg-slate-900/90 text-white text-xs p-3 rounded-lg shadow-xl backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                                <div className="font-bold mb-1 border-b border-white/20 pb-1">{moment(day.date).format('LL')}</div>
                                                <div className="leading-relaxed">{day.description}</div>
                                                <div className="mt-1 text-xs opacity-70">Giriş/Çıkış: {day.check_in || '-'} / {day.check_out || '-'}</div>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">

            {/* Header Area */}
            {!embedded && (
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
                            Yönetici Konsolu
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Ekip performansı ve mesai durumunun gerçek zamanlı analizi.</p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Personel ara..."
                                className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="ALL">Tüm Durumlar</option>
                            <option value="ONLINE">Ofiste</option>
                            <option value="OVERTIME">Fazla Mesai</option>
                            <option value="MISSING">Eksik</option>
                            <option value="LATE">Geç Kalanlar</option>
                            <option value="ABOVE_AVG_OT">Ort. Üstü Mesai</option>
                            <option value="BELOW_TARGET">Beklenti Altı</option>
                        </select>

                        {/* Sort */}
                        <select
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="NAME">Sırala: İsim (A-Z)</option>
                            <option value="OT_DESC">Sırala: En Çok Ek Mesai</option>
                            <option value="MISSING_DESC">Sırala: En Çok Eksik</option>
                            <option value="NORMAL_DESC">Sırala: En Çok Çalışma</option>
                        </select>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            {moment.months().map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors max-w-[200px]"
                        >
                            <option value="">Tüm Departmanlar</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setViewMode('HIERARCHY')} className={`p-2 rounded-lg transition-all ${viewMode === 'HIERARCHY' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Hiyerarşik Liste"><Network size={18} /></button>
                            <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Düz Liste"><Activity size={18} /></button>
                            <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Matris Görünüm"><Calendar size={18} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* Embedded Controls */}
            {embedded && (
                <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Ekip içinde ara..."
                                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all w-64 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 py-2.5 pl-3 pr-8 cursor-pointer hover:border-indigo-300 transition-colors max-w-[200px] shadow-sm"
                        >
                            <option value="">Tüm Ekip</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('HIERARCHY')} className={`p-2 rounded-lg transition-all ${viewMode === 'HIERARCHY' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Network size={18} /></button>
                        <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Activity size={18} /></button>
                        <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Calendar size={18} /></button>
                    </div>
                </div>
            )}

            {/* Executive Summary Cards */}
            <div className={`grid gap-6 ${scope === 'DAILY' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
                <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:-translate-y-1">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Users size={28} className="text-white" />
                        </div>
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">Toplam Personel</p>
                            <h3 className="text-3xl font-bold">{summary.activeCount} <span className="text-sm font-normal text-indigo-200">Kişi</span></h3>
                        </div>
                    </div>
                </div>

                <div className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <div className="relative">
                                <Users size={28} />
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Şu an Ofiste</p>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{summary.onlineCount} <span className="text-sm font-normal text-slate-400">Kişi</span></h3>
                        </div>
                    </div>
                    {/* Progress Bar for Online Ratio */}
                    <div className="h-1 w-full bg-slate-100 mt-4 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                            style={{ width: `${summary.activeCount > 0 ? (summary.onlineCount / summary.activeCount) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>

                {scope !== 'DAILY' && (
                    <>
                        <div className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                    <Clock size={28} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Fazla Mesai</p>
                                    <div className="flex items-end gap-2">
                                        <h3 className="text-3xl font-bold text-slate-800">{formatMinutes(summary.totalOvertime)}</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Ort: {formatMinutes(Math.round(summary.totalOvertime / (summary.activeCount || 1)))} / kişi
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${summary.totalMissing > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <AlertCircle size={28} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Kayıp Zaman</p>
                                    <h3 className="text-3xl font-bold text-slate-800">{formatMinutes(summary.totalMissing)}</h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Ort: {formatMinutes(Math.round(summary.totalMissing / (summary.activeCount || 1)))} / kişi
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Main Content Area */}
            {viewMode === 'LIST' ? (
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    {/* Checkbox Bar */}
                    <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={hierarchySort}
                                onChange={(e) => setHierarchySort(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="text-sm font-semibold text-slate-600">Hiyerarşiye göre sırala</span>
                        </label>
                        {!hierarchySort && (
                            <select
                                value={sortMode}
                                onChange={(e) => setSortMode(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 py-1.5 pl-2 pr-6 cursor-pointer hover:border-indigo-300 transition-colors"
                            >
                                <option value="NAME">İsim (A-Z)</option>
                                <option value="OT_DESC">En Çok Ek Mesai</option>
                                <option value="MISSING_DESC">En Çok Eksik</option>
                                <option value="NORMAL_DESC">En Çok Çalışma</option>
                            </select>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">{sortedStats.length} kişi</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                {/* Section headers */}
                                <tr className="bg-slate-50/60 border-b border-slate-100">
                                    <th colSpan="2" className="p-2 pl-6"></th>
                                    <th colSpan="3" className="p-2 text-center">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Bugün</span>
                                    </th>
                                    <th colSpan="3" className="p-2 text-center">
                                        <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest bg-violet-50 px-3 py-1 rounded-full border border-violet-100">Aylık Birikimli</span>
                                    </th>
                                    <th className="p-2"></th>
                                </tr>
                                {/* Column headers */}
                                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3 pl-6 pr-3">Personel</th>
                                    <th className="py-3 px-3 w-20">Durum</th>
                                    <th className="py-3 px-3 text-center w-24">Normal</th>
                                    <th className="py-3 px-3 text-center w-24">F. Mesai</th>
                                    <th className="py-3 px-3 text-center w-20">Mola</th>
                                    <th className="py-3 px-3 text-center w-24">Çalışma</th>
                                    <th className="py-3 px-3 text-center w-24">F. Mesai</th>
                                    <th className="py-3 px-3 text-center w-32">Net Durum</th>
                                    <th className="py-3 px-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="9" className="p-12 text-center text-slate-400 animate-pulse">Analiz ediliyor...</td></tr>
                                ) : sortedStats.length === 0 ? (
                                    <tr><td colSpan="9" className="p-12 text-center text-slate-400">Görüntülenecek veri bulunamadı.</td></tr>
                                ) : (
                                    sortedStats.map(item => {
                                        const deviation = item.monthly_deviation || 0;
                                        return (
                                            <tr key={item.employee_id} className="hover:bg-slate-50/80 transition-all group">
                                                {/* Personel */}
                                                <td className="py-3 pl-6 pr-3">
                                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                                                        if (embedded && onMemberClick) onMemberClick(item.employee_id);
                                                        else handleEmployeeClick(item.employee_id);
                                                    }}>
                                                        <div className="relative shrink-0">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold border border-white shadow-sm">
                                                                {(item.employee_name || '?').charAt(0)}
                                                            </div>
                                                            {item.is_online && (
                                                                <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500"></span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-700 text-sm truncate hover:text-indigo-600 transition-colors">{item.employee_name}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium truncate">{item.department}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Durum */}
                                                <td className="py-3 px-3">
                                                    {item.is_online ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Ofiste</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400">Dışarıda</span>
                                                    )}
                                                </td>
                                                {/* BUGÜN: Normal */}
                                                <td className="py-3 px-3 text-center">
                                                    <span className="text-xs font-bold text-slate-700 font-mono">{formatMinutes(item.today_normal)}</span>
                                                </td>
                                                {/* BUGÜN: F.Mesai */}
                                                <td className="py-3 px-3 text-center">
                                                    {item.today_overtime > 0 ? (
                                                        <span className="text-xs font-bold text-amber-600 font-mono">+{formatMinutes(item.today_overtime)}</span>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                {/* BUGÜN: Mola */}
                                                <td className="py-3 px-3 text-center">
                                                    {item.today_break > 0 ? (
                                                        <span className="text-xs font-medium text-slate-500 font-mono">{formatMinutes(item.today_break)}</span>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                {/* AYLIK: Çalışma */}
                                                <td className="py-3 px-3 text-center">
                                                    <span className="text-xs font-semibold text-slate-600 font-mono">{formatMinutes(item.total_worked)}</span>
                                                </td>
                                                {/* AYLIK: F.Mesai */}
                                                <td className="py-3 px-3 text-center">
                                                    {item.total_overtime > 0 ? (
                                                        <span className="text-xs font-bold text-amber-600 font-mono">+{formatMinutes(item.total_overtime)}</span>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                {/* AYLIK: Net Durum */}
                                                <td className="py-3 px-3 text-center">
                                                    {(item.total_missing || 0) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                                                            <ArrowDownRight size={11} />
                                                            {formatMinutes(item.total_missing)} Eksik
                                                        </span>
                                                    ) : (item.total_overtime || 0) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                                            <ArrowUpRight size={11} />
                                                            {formatMinutes(item.total_overtime)} Fazla
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </td>
                                                {/* Actions */}
                                                <td className="py-3 px-3 text-center">
                                                    <button className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-md transition-colors" onClick={() => setSelectedEmployee(item)}>
                                                        <Activity size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : viewMode === 'GRID' ? (
                renderGridView()
            ) : (
                renderHierarchyView()
            )}

            {/* DETAIL MODAL */}
            {
                selectedEmployee && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedEmployee(null)} />

                        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                                        {(selectedEmployee.employee_name || '?').charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{selectedEmployee.employee_name}</h3>
                                        <p className="text-sm text-slate-500 font-medium">{selectedEmployee.department}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedEmployee(null)}
                                    className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body - Daily Details */}
                            <div className="p-6 space-y-8">

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Normal</div>
                                        <div className="text-2xl font-bold text-blue-700">{formatMinutes(selectedEmployee.today_normal || 0)}</div>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                        <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Fazla</div>
                                        <div className="text-2xl font-bold text-amber-700">+{formatMinutes(selectedEmployee.today_overtime || 0)}</div>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Eksik</div>
                                        <div className="text-2xl font-bold text-red-700">-{formatMinutes(selectedEmployee.today_missing || 0)}</div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mola</div>
                                        <div className="text-2xl font-bold text-slate-700">{formatMinutes(selectedEmployee.today_break || 0)}</div>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <Clock size={16} className="text-slate-400" />
                                        Zaman Çizelgesi
                                    </h4>
                                    <div className="relative w-full h-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                                        {/* Using same logic as row but bigger */}
                                        {(() => {
                                            if (!selectedEmployee.today_check_in) return <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm italic">Giriş Yok</div>;

                                            const startMin = 420; // 07:00
                                            const totalRange = 900; // 15 hours
                                            const getMin = (iso) => {
                                                if (!iso) return null;
                                                const d = moment(iso);
                                                return d.hours() * 60 + d.minutes();
                                            };
                                            const inMin = getMin(selectedEmployee.today_check_in);
                                            const outMin = getMin(selectedEmployee.today_check_out) || (selectedEmployee.is_online ? moment().hours() * 60 + moment().minutes() : inMin + 60);

                                            const barStart = Math.max(0, ((inMin - startMin) / totalRange) * 100);
                                            const barWidth = Math.min(100 - barStart, Math.max(1, ((outMin - inMin) / totalRange) * 100));

                                            return (
                                                <>
                                                    {[0, 20, 40, 60, 80, 100].map(p => (
                                                        <div key={p} className="absolute top-0 bottom-0 border-l border-slate-200/50" style={{ left: `${p}%` }}>
                                                            <span className="absolute top-1 left-1 text-[10px] text-slate-400 font-mono">
                                                                {moment().startOf('day').add(7 + (p / 100) * 15, 'hours').format('HH:mm')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div
                                                        className={`absolute top-4 bottom-4 rounded-md shadow-sm flex items-center justify-center px-4 text-xs font-bold text-white whitespace-nowrap transition-all duration-500 ${selectedEmployee.is_online ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-slate-400'}`}
                                                        style={{ left: `${barStart}%`, width: `${barWidth}%` }}
                                                    >
                                                        {moment(selectedEmployee.today_check_in).format('HH:mm')} - {selectedEmployee.today_check_out ? moment(selectedEmployee.today_check_out).format('HH:mm') : 'Şimdi'}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Additional Details (Times) */}
                                <div className="flex items-center justify-between text-sm p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><LogIn size={16} /></div>
                                        <div>
                                            <div className="text-xs text-slate-400 font-semibold">Giriş Saati</div>
                                            <div className="font-bold text-slate-700 font-mono">{selectedEmployee.today_check_in ? moment(selectedEmployee.today_check_in).format('HH:mm:ss') : '-'}</div>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200"></div>
                                    <div className="flex items-center gap-3 text-right">
                                        <div>
                                            <div className="text-xs text-slate-400 font-semibold">Çıkış Saati</div>
                                            <div className="font-bold text-slate-700 font-mono">{selectedEmployee.today_check_out ? moment(selectedEmployee.today_check_out).format('HH:mm:ss') : (selectedEmployee.is_online ? <span className="text-emerald-500 animate-pulse">Ofiste</span> : '-')}</div>
                                        </div>
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><LogOut size={16} /></div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AttendanceTracking;
