import React, { useMemo, useState, useEffect } from 'react';
import { User, Clock, ChevronRight, ChevronDown, Calendar, Maximize2, Minimize2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const StatusBadge = ({ status, isOnLeave, leaveStatus }) => {
    if (isOnLeave) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <Calendar size={12} />
                {leaveStatus || 'İzinde'}
            </span>
        );
    }
    if (status === 'IN') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ofiste
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            Dışarıda
        </span>
    );
};

const StackedProgressBar = ({ completed, missing, remaining, target }) => {
    // Convert all to raw numbers
    const c = parseFloat(completed || 0);
    const m = parseFloat(missing || 0);
    const r = parseFloat(remaining || 0);
    const t = parseFloat(target || 1); // Avoid div by zero

    // Calculate Percentages
    // Note: If C + M + R > T (due to surplus), it might overflow.
    // We should normalize against MAX(Total, Target) for the bar scale.
    const totalSum = c + m + r;
    const scaleBase = Math.max(totalSum, t);

    const pC = (c / scaleBase) * 100;
    const pM = (m / scaleBase) * 100;
    const pR = (r / scaleBase) * 100;

    return (
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex mb-1 border border-slate-200">
            {/* Completed */}
            <div style={{ width: `${pC}%` }} className="h-full bg-emerald-500" title={`Tamamlanan: ${c} sa`} />

            {/* Missing */}
            <div style={{ width: `${pM}%` }} className="h-full bg-red-400" title={`Eksik: ${m} sa`} />

            {/* Remaining */}
            <div style={{ width: `${pR}%` }} className="h-full bg-slate-300" title={`Kalan: ${r} sa`} />
        </div>
    );
};

const EmployeeCard = ({ node, onMemberClick, depth = 0, expandedIds, toggleExpand }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    // Net Balance Logic
    const balance = parseFloat(node.summaryNetBalance || 0);
    const isPositive = balance >= 0;

    return (
        <div className={clsx("flex flex-col transition-all duration-200", depth === 0 ? "mb-6" : "mb-4")}>
            {/* Main Card */}
            <div
                onClick={() => onMemberClick(node.id)}
                className={clsx(
                    "relative bg-white border rounded-xl overflow-hidden transition-all cursor-pointer group z-10",
                    depth === 0 ? "shadow-sm border-slate-200 hover:shadow-md" : "border-slate-200 hover:border-blue-300 hover:shadow-sm"
                )}
            >
                {/* Visual Depth Indicator (Left Color Bar) */}
                {depth > 0 && (
                    <div className={clsx(
                        "absolute left-0 top-0 bottom-0 w-1",
                        depth === 1 ? "bg-blue-400" : "bg-slate-300"
                    )}></div>
                )}

                {/* Header Section */}
                <div className={clsx("p-4 flex items-start justify-between gap-3", depth > 0 && "pl-5")}>
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-colors shrink-0",
                            node.isOnLeave ? "bg-amber-100 text-amber-600" :
                                node.status === 'IN' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                        )}>
                            {node.avatar || <User size={20} />}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-base leading-tight group-hover:text-blue-600 transition-colors truncate">
                                {node.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{node.jobPosition || 'Pozisyon Yok'}</p>
                            <div className="mt-2">
                                <StatusBadge status={node.status} isOnLeave={node.isOnLeave} leaveStatus={node.leaveStatus} />
                            </div>
                        </div>
                    </div>

                    {/* Expand Toggle */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(node.id);
                            }}
                            className={clsx(
                                "p-1.5 rounded-lg transition-colors border",
                                isExpanded ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                            )}
                        >
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                    )}
                </div>

                {/* Metrics Grid */}
                <div className={clsx("px-4 pb-4 grid grid-cols-2 gap-3 text-sm", depth > 0 && "pl-5")}>
                    {/* Today */}
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        <p className="text-xs text-slate-400 font-medium mb-1">Bugün</p>
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-slate-700 text-lg tabular-nums">
                                {Math.floor(node.totalTodayMinutes / 60)}
                            </span>
                            <span className="text-xs text-slate-500">sa</span>
                            <span className="font-bold text-slate-700 text-lg tabular-nums ml-1">
                                {node.totalTodayMinutes % 60}
                            </span>
                            <span className="text-xs text-slate-500">dk</span>
                        </div>
                    </div>

                    {/* Net Balance (Extra/Missing Total) */}
                    <div className={clsx("rounded-lg p-2.5 border", isPositive ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                        <p className={clsx("text-xs font-medium mb-1", isPositive ? "text-emerald-600" : "text-red-500")}>
                            {isPositive ? 'Net Fazla' : 'Net Eksik'}
                        </p>
                        <div className="flex items-baseline gap-1">
                            <span className={clsx("font-bold text-lg tabular-nums", isPositive ? "text-emerald-700" : "text-red-600")}>
                                {isPositive ? '+' : ''}{balance.toFixed(1)}
                            </span>
                            <span className={clsx("text-xs", isPositive ? "text-emerald-600" : "text-red-400")}>sa</span>
                        </div>
                    </div>

                    {/* Monthly Progress (3-Part Stack) */}
                    <div className="col-span-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs text-slate-400 font-medium tracking-wide">AYLIK HEDEF DAĞILIMI</p>
                            <p className="text-xs font-bold text-slate-700">{node.monthTarget} sa</p>
                        </div>

                        <StackedProgressBar
                            completed={node.summaryCompleted}
                            missing={node.summaryMissing}
                            remaining={node.summaryRemaining}
                            target={node.monthTarget}
                        />

                        <div className="flex justify-between text-[10px] mt-1.5">
                            <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                Tamamlanan ({node.summaryCompleted}sa)
                            </div>
                            <div className="flex items-center gap-1 text-red-500 font-medium">
                                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                Eksik ({node.summaryMissing}sa)
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 font-medium">
                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                Kalan ({node.summaryRemaining}sa)
                            </div>
                        </div>
                    </div>

                    {/* Extra Overtime (Separate) */}
                    <div className="col-span-2 flex items-center gap-4 bg-slate-50 rounded-lg p-2.5 border border-slate-100 mt-0">
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ek Mesai (Onaylı)</p>
                            <p className="font-bold text-emerald-600 text-sm">{node.monthApprovedDTO} dk</p>
                        </div>
                        <div className="border-l border-slate-200 pl-4">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Toplam Çaba (Normal+Ek)</p>
                            <p className="font-bold text-blue-600 text-sm">{node.summaryTotalWork} sa</p>
                        </div>
                    </div>
                </div>

                {node.lastActionTime && node.status !== 'OUT' && !node.isOnLeave && (
                    <div className={clsx("px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 text-xs text-slate-400", depth > 0 && "pl-5")}>
                        <Clock size={12} />
                        <span>Son Hareket: {node.lastActionTime}</span>
                    </div>
                )}
            </div>

            {/* Subordinate Grid Connector */}
            {hasChildren && isExpanded && (
                <div className="relative pl-6 md:pl-10 ml-6 pt-4 pb-2">
                    {/* Vertical Connector Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-300"></div>

                    <div className="mb-4 flex items-center gap-2">
                        {/* Horizontal Connector */}
                        <div className="w-4 h-px bg-slate-300"></div>

                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{node.name}'in Ekibi</span>
                        <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{node.children.length}</span>
                    </div>

                    {/* Grid for Children */}
                    {/* Using fewer columns for nested levels to avoid squeezing */}
                    <div className={clsx(
                        "grid gap-4",
                        depth === 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                    )}>
                        {node.children.map(child => (
                            <div key={child.id} className="relative">
                                {/* Horizontal Connector to Card */}
                                <div className="absolute top-8 -left-4 w-4 h-px bg-slate-300"></div>

                                <EmployeeCard
                                    node={child}
                                    onMemberClick={onMemberClick}
                                    depth={depth + 1}
                                    expandedIds={expandedIds}
                                    toggleExpand={toggleExpand}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PerformanceTableView = ({ teamData }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    const sortedData = useMemo(() => {
        let sortableItems = [...teamData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Computed Fields
                if (sortConfig.key === 'breakRatio') {
                    const aWork = parseFloat(a.monthWorkedHours || 0) * 60;
                    const aBreak = parseFloat(a.totalBreakMinutes || 0);
                    aValue = aBreak + aWork > 0 ? (aBreak / (aWork + aBreak)) : 0;

                    const bWork = parseFloat(b.monthWorkedHours || 0) * 60;
                    const bBreak = parseFloat(b.totalBreakMinutes || 0);
                    bValue = bBreak + bWork > 0 ? (bBreak / (bWork + bBreak)) : 0;
                } else {
                    // Standard Fields (Numbers)
                    aValue = parseFloat(aValue) || aValue; // Try parse float
                    bValue = parseFloat(bValue) || bValue;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [teamData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc'; // Default desc for stats
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <div className="w-3 h-3 ml-1 opacity-20">↕</div>;
        return sortConfig.direction === 'asc' ? <div className="w-3 h-3 ml-1">↑</div> : <div className="w-3 h-3 ml-1">↓</div>;
    };

    // Header Helper
    const Th = ({ k, label, align = 'left' }) => (
        <th
            className={`px-4 py-3 text-${align} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50`}
            onClick={() => requestSort(k)}
        >
            <div className={`flex items-center justify-${align === 'right' ? 'end' : 'start'}`}>
                {label} {getSortIcon(k)}
            </div>
        </th>
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <Th k="name" label="Çalışan" />
                            <Th k="jobPosition" label="Pozisyon" />
                            <Th k="summaryNetBalance" label="Net Bakiye" align="right" />
                            <Th k="monthWorkedHours" label="Çalışma (Sa)" align="right" />
                            <Th k="monthTarget" label="Hedef (Sa)" align="right" />
                            <Th k="breakRatio" label="Mola Oranı" align="right" />
                            <Th k="totalLateCount" label="Geç Kalma" align="right" />
                            <Th k="totalLateMinutes" label="Geç Süresi" align="right" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((emp) => {
                            const balance = parseFloat(emp.summaryNetBalance || 0);
                            const isPositive = balance >= 0;

                            // Break Ratio
                            const totalWorkMin = parseFloat(emp.monthWorkedHours || 0) * 60;
                            const totalBreakMin = parseFloat(emp.totalBreakMinutes || 0);
                            const totalActiveTime = totalWorkMin + totalBreakMin;
                            const breakRatio = totalActiveTime > 0 ? ((totalBreakMin / totalActiveTime) * 100).toFixed(1) : '0.0';

                            return (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {emp.avatar ? <img src={emp.avatar} className="w-full h-full rounded-full object-cover" /> : (emp.name ? emp.name.charAt(0) : 'U')}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                                                <div className="mt-0.5"><StatusBadge status={emp.status} isOnLeave={emp.isOnLeave} leaveStatus={emp.leaveStatus} /></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{emp.jobPosition || '-'}</td>

                                    <td className="px-4 py-3 text-right">
                                        <span className={clsx("font-bold text-sm", isPositive ? "text-emerald-600" : "text-red-500")}>
                                            {isPositive ? '+' : ''}{balance.toFixed(1)} sa
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">{emp.monthWorkedHours}</td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-400">{emp.monthTarget}</td>

                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-sm font-bold text-slate-700">{breakRatio}%</span>
                                            <span className="text-xs text-slate-400">({totalBreakMin}dk)</span>
                                        </div>
                                        {/* Mini Bar */}
                                        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 ml-auto max-w-[80px]">
                                            <div style={{ width: `${Math.min(breakRatio, 100)}%` }} className={clsx("h-full rounded-full", parseFloat(breakRatio) > 15 ? "bg-amber-400" : "bg-blue-400")}></div>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">{emp.totalLateCount}</td>

                                    <td className="px-4 py-3 text-right text-sm text-red-500 font-medium">
                                        {emp.totalLateMinutes > 0 ? `${emp.totalLateMinutes} dk` : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TeamAttendanceOverview = ({ teamData, onMemberClick }) => {
    // View Mode State
    const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

    // Transform flat list to hierarchy
    const hierarchy = useMemo(() => {
        if (!teamData) return [];

        const map = {};
        const roots = [];

        // 1. Initialize nodes
        teamData.forEach(item => {
            map[item.id] = { ...item, children: [] };
        });

        // 2. Link children to parents
        teamData.forEach(item => {
            const node = map[item.id];
            if (item.managerId && map[item.managerId]) {
                map[item.managerId].children.push(node);
            } else {
                roots.push(node);
            }
        });

        const sortNodes = (nodes) => {
            nodes.sort((a, b) => {
                // Sort Managers first, then by Name
                const aIsManager = a.children.length > 0 ? 1 : 0;
                const bIsManager = b.children.length > 0 ? 1 : 0;
                if (aIsManager !== bIsManager) return bIsManager - aIsManager;
                return a.name.localeCompare(b.name);
            });
            nodes.forEach(n => {
                if (n.children.length > 0) sortNodes(n.children);
            });
        };
        sortNodes(roots);

        return roots;
    }, [teamData]);

    // Manage Expansion State
    const [expandedIds, setExpandedIds] = useState(new Set());

    // Initially Expand All Roots
    useEffect(() => {
        if (hierarchy.length > 0) {
            const initialSet = new Set();
            const collectIds = (nodes) => {
                nodes.forEach(n => {
                    if (n.children.length > 0) {
                        initialSet.add(n.id);
                        collectIds(n.children);
                    }
                });
            };
            collectIds(hierarchy);
            setExpandedIds(initialSet);
        }
    }, [hierarchy]);

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allIds = new Set();
        const collectIds = (nodes) => {
            nodes.forEach(n => {
                if (n.children.length > 0) {
                    allIds.add(n.id);
                    collectIds(n.children);
                }
            });
        };
        collectIds(hierarchy);
        setExpandedIds(allIds);
    };

    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Ekip Özeti</h3>
                        <p className="text-sm text-slate-500">
                            {viewMode === 'card' ? 'Organizasyon Şeması' : 'Performans Listesi'}
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('card')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5",
                                viewMode === 'card' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Calendar size={14} /> Kart
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5",
                                viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <User size={14} /> Liste
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === 'card' && (
                        <>
                            <button
                                onClick={expandAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                                <Maximize2 size={14} />
                                Tümünü Aç
                            </button>
                            <button
                                onClick={collapseAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                                <Minimize2 size={14} />
                                Tümünü Kapat
                            </button>
                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        </>
                    )}

                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-slate-900 leading-none">{teamData.length}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kişi</span>
                    </div>
                </div>
            </div>

            {viewMode === 'list' ? (
                <PerformanceTableView teamData={teamData} />
            ) : (
                hierarchy.length > 0 ? (
                    <div>
                        {hierarchy.map((node) => (
                            <EmployeeCard
                                key={node.id}
                                node={node}
                                onMemberClick={onMemberClick}
                                expandedIds={expandedIds}
                                toggleExpand={toggleExpand}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-slate-900 font-medium mb-1">Ekip Bulunamadı</h3>
                        <p className="text-slate-500 text-sm">Görüntülenecek ekip üyesi yok.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default TeamAttendanceOverview;
