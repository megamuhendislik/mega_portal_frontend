import React, { useMemo, useState } from 'react';
import { User, Clock, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

const EmployeeNode = ({ node, onMemberClick, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="flex flex-col">
            <div
                onClick={(e) => {
                    // Clicking chevron toggles expand, clicking elsewhere selects member
                    onMemberClick(node.id);
                }}
                className={clsx(
                    "flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors group border-b border-slate-50 last:border-b-0",
                    depth > 0 && "bg-slate-50/50"
                )}
                style={{ paddingLeft: `${16 + (depth * 24)}px` }}
            >
                <div className="flex items-center gap-3">
                    {/* Expand/Collapse Toggle */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className={clsx(
                            "w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 transition-colors text-slate-400",
                            !hasChildren && "invisible"
                        )}
                    >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative",
                        node.status === 'IN' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                        {node.avatar || <User size={18} />}
                        {/* Status Indicator Dot */}
                        <div className={clsx(
                            "absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full flex items-center justify-center",
                            node.status === 'IN' ? "bg-emerald-500" : "bg-slate-400"
                        )}>
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                            {node.name}
                            {node.jobPosition && <span className="text-slate-500 font-normal ml-1">({node.jobPosition})</span>}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            {node.status === 'IN' ? 'İçeride' : 'Dışarıda'}
                            {node.lastActionTime && ` • ${node.lastActionTime}`}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-6 items-center">
                        <div className="text-right min-w-[80px]">
                            <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Bugün</p>
                            <p className="text-sm font-bold text-slate-800 font-mono">
                                {Math.floor(node.totalTodayMinutes / 60)}s {node.totalTodayMinutes % 60}dk
                            </p>
                        </div>
                        <div className="text-right hidden md:block min-w-[80px]">
                            <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Bu Ay</p>
                            <p className="text-sm font-bold text-blue-600 font-mono">
                                {node.monthWorkedHours || 0} Sa
                            </p>
                        </div>
                        <div className="text-right hidden md:block min-w-[80px]">
                            <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Onaylı FM</p>
                            <p className="text-sm font-bold text-emerald-600 font-mono">
                                {node.monthApprovedDTO || 0} dk
                            </p>
                        </div>
                        {parseInt(node.monthPendingDTO) > 0 && (
                            <div className="text-right hidden md:block min-w-[80px]">
                                <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Bekleyen</p>
                                <p className="text-sm font-bold text-orange-500 font-mono">
                                    {node.monthPendingDTO} dk
                                </p>
                            </div>
                        )}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
            </div>

            {/* Recursive Children */}
            {isExpanded && hasChildren && (
                <div className="border-l border-slate-200 ml-8 my-1">
                    {node.children.map(child => (
                        <EmployeeNode key={child.id} node={child} onMemberClick={onMemberClick} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

const TeamAttendanceOverview = ({ teamData, onMemberClick }) => {
    // teamData = [{ id, name, managerId, ... }]

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

        // 3. Sort (Optional: by name or status)
        // Let's sort roots and children by name
        const sortNodes = (nodes) => {
            nodes.sort((a, b) => a.name.localeCompare(b.name));
            nodes.forEach(n => {
                if (n.children.length > 0) sortNodes(n.children);
            });
        };
        sortNodes(roots);

        return roots;
    }, [teamData]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 className="font-bold text-slate-800">Ekip Hiyerarşisi</h3>
                    <p className="text-xs text-slate-500">Organizasyon şeması (Oto. Genişletilmiş)</p>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{teamData.length} Kişi</span>
            </div>
            <div className="bg-white">
                {hierarchy.map((node) => (
                    <EmployeeNode key={node.id} node={node} onMemberClick={onMemberClick} />
                ))}

                {teamData.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        Ekip üyesi bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamAttendanceOverview;
