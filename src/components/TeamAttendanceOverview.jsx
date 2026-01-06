import React, { useMemo, useState, useEffect } from 'react';
import { User, Clock, ChevronRight, ChevronDown, Calendar, Maximize2, Minimize2 } from 'lucide-react';
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

const EmployeeCard = ({ node, onMemberClick, depth = 0, expandedIds, toggleExpand }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    // Calculate Balance (Surplus/Deficit)
    const monthDeficit = node.monthTarget - node.monthWorkedHours;
    const isDeficit = monthDeficit > 0;

    return (
        <div className={clsx("flex flex-col transition-all duration-200", depth === 0 ? "mb-4" : "")}>
            {/* Main Card */}
            <div
                onClick={() => onMemberClick(node.id)}
                className={clsx(
                    "relative bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group",
                    depth === 0 ? "shadow-sm border-slate-200" : "border-slate-200 hover:border-blue-300"
                )}
            >
                {/* Header Section */}
                <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-colors",
                            node.isOnLeave ? "bg-amber-100 text-amber-600" :
                                node.status === 'IN' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                        )}>
                            {node.avatar || <User size={20} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-base leading-tight group-hover:text-blue-600 transition-colors">
                                {node.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">{node.jobPosition || 'Pozisyon Yok'}</p>
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
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                    )}
                </div>

                {/* Metrics Grid */}
                <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm">
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

                    {/* Monthly Performance */}
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                        <p className="text-xs text-slate-400 font-medium mb-1 flex justify-between">
                            <span>Bu Ay</span>
                            <span className={clsx("text-[10px]", isDeficit ? "text-red-500" : "text-emerald-500")}>
                                {isDeficit ? `-${monthDeficit.toFixed(1)} sa` : `+${(monthDeficit * -1).toFixed(1)} sa`}
                            </span>
                        </p>
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-blue-600 text-lg tabular-nums">
                                {node.monthWorkedHours}
                            </span>
                            <span className="text-xs text-slate-400">/ {node.monthTarget} sa</span>
                        </div>
                    </div>

                    {/* Overtime Info */}
                    {(parseInt(node.monthApprovedDTO) > 0 || parseInt(node.monthPendingDTO) > 0) && (
                        <div className="col-span-2 flex items-center gap-4 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <div>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Onaylı FM</p>
                                <p className="font-bold text-emerald-600 text-sm">{node.monthApprovedDTO} dk</p>
                            </div>
                            {parseInt(node.monthPendingDTO) > 0 && (
                                <div className="border-l border-slate-200 pl-4">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Bekleyen</p>
                                    <p className="font-bold text-amber-500 text-sm">{node.monthPendingDTO} dk</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {node.lastActionTime && node.status !== 'OUT' && !node.isOnLeave && (
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={12} />
                        <span>Son Hareket: {node.lastActionTime}</span>
                    </div>
                )}
            </div>

            {/* Subordinate Grid */}
            {hasChildren && isExpanded && (
                <div className="mt-4 pl-4 md:pl-8 border-l-2 border-slate-100 ml-4 md:ml-6 pb-2">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{node.name}'in Ekibi</span>
                        <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{node.children.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {node.children.map(child => (
                            <EmployeeCard
                                key={child.id}
                                node={child}
                                onMemberClick={onMemberClick}
                                depth={depth + 1}
                                expandedIds={expandedIds}
                                toggleExpand={toggleExpand}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TeamAttendanceOverview = ({ teamData, onMemberClick }) => {
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
            // Optional: Initially expand only top level? 
            // Or let's expand everything by default as per previous behavior
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
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Ekip Özeti</h3>
                    <p className="text-sm text-slate-500">Organizasyon şeması ve anlık durumlar</p>
                </div>

                <div className="flex items-center gap-3">
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

                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-slate-900 leading-none">{teamData.length}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Toplam</span>
                    </div>
                </div>
            </div>

            {hierarchy.length > 0 ? (
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
            )}
        </div>
    );
};

export default TeamAttendanceOverview;
