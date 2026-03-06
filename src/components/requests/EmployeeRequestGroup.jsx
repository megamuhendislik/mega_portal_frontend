import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, User } from 'lucide-react';
import ExpandableRequestRow from './ExpandableRequestRow';

// ─── Main Component ───────────────────────────────────────────────────────
const EmployeeRequestGroup = ({
    employeeName,
    employeeDepartment,
    employeePosition,
    requests = [],
    isOpen,
    onToggle,
    onViewDetails,
    onApprove,
    onReject,
}) => {
    const [expandedRowId, setExpandedRowId] = useState(null);

    const handleRowToggle = (id) => {
        setExpandedRowId((prev) => (prev === id ? null : id));
    };

    const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

    // Build subtitle: "Department / Position" or just "Department"
    const subtitle = [employeeDepartment, employeePosition]
        .filter(Boolean)
        .join(' / ');

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* ─── Group Header ─────────────────────────────────────────── */}
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
            >
                {/* Expand/Collapse Chevron */}
                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                    isOpen ? 'bg-blue-100 text-blue-600' : 'text-slate-400'
                }`}>
                    {isOpen
                        ? <ChevronDown size={14} />
                        : <ChevronRight size={14} />
                    }
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200 shrink-0">
                    <User size={16} />
                </div>

                {/* Name + Subtitle */}
                <div className="flex-1 min-w-0 text-left">
                    <span className="font-bold text-slate-800 text-sm truncate block">
                        {employeeName || 'Bilinmiyor'}
                    </span>
                    {subtitle && (
                        <span className="text-xs text-slate-500 font-medium truncate block">
                            {subtitle}
                        </span>
                    )}
                </div>

                {/* Right side: pending badge + total count */}
                <div className="flex items-center gap-2 shrink-0">
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                            <Clock size={11} />
                            {pendingCount} bekleyen
                        </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium">
                        {requests.length} talep
                    </span>
                </div>
            </button>

            {/* ─── Group Content ────────────────────────────────────────── */}
            {isOpen && (
                <div className="border-t border-slate-100">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {/* Expand toggle column */}
                                <th className="w-8 pl-3 pr-0 py-2.5" />
                                <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Tür
                                </th>
                                <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Tarih
                                </th>
                                <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Saat Aralığı
                                </th>
                                <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Süre
                                </th>
                                <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Durum
                                </th>
                                <th className="px-3 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                                    İşlem
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {requests.map((req) => {
                                const compositeKey = `${req.type}-${req.id}`;
                                return (
                                    <ExpandableRequestRow
                                        key={compositeKey}
                                        req={req}
                                        isExpanded={expandedRowId === compositeKey}
                                        onToggle={() => setExpandedRowId(prev => prev === compositeKey ? null : compositeKey)}
                                        onViewDetails={onViewDetails}
                                        onApprove={onApprove}
                                        onReject={onReject}
                                        showEmployeeColumn={false}
                                        mode="incoming"
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EmployeeRequestGroup;
