import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Calendar, Clock, Utensils, CreditCard, User, Users,
    CheckCircle2, XCircle, AlertCircle, ArrowRightLeft, Shield,
    ChevronDown, ChevronRight, FileText, MoreHorizontal
} from 'lucide-react';
import RequestListTable from '../../components/RequestListTable';

const IncomingRequestsTab = ({
    incomingRequests,          // from /team-requests/
    teamHistoryRequests,       // from /leave/requests/team_history/
    substituteData,            // from /substitute-authority/pending_requests/
    subordinates,
    directSubordinateIds,
    loading,
    handleApprove,
    handleReject,
    handleSubstituteApprove,
    handleSubstituteReject,
    handleViewDetails,
    fetchTeamHistory,
}) => {
    const [sourceFilter, setSourceFilter] = useState('ALL'); // ALL, DIRECT, INDIRECT, SUBSTITUTE
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchText, setSearchText] = useState('');

    useEffect(() => { fetchTeamHistory(); }, []);

    // Normalize all incoming requests into unified format
    const allRequests = useMemo(() => {
        const items = [];

        // 1. Team requests (direct + indirect)
        const incomingIds = new Set();
        (incomingRequests || []).forEach(r => {
            incomingIds.add(`${r.type}-${r.id}`);
            items.push({
                ...r,
                employee_name: r.employee_name || r.employee_detail?.full_name || r.employee?.name || '',
                employee_department: r.employee_department || r.employee_detail?.department_name || r.employee?.department || '',
                employee_position: r.employee_position || '',
                target_approver_name: r.target_approver_name || r.target_approver_detail?.full_name || '',
                approved_by_name: r.approved_by_name || r.approved_by_detail?.full_name || '',
                leave_type_name: r.leave_type_name || r.request_type_detail?.name || '',
                start_date: r.start_date || r.date || r.created_at,
                type: r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : (r.type || 'UNKNOWN'),
                _source: r.level === 'direct' ? 'DIRECT' : 'INDIRECT',
                _isSubstitute: false,
            });
        });

        // 2. History (leave requests only — don't duplicate)
        (teamHistoryRequests || []).forEach(r => {
            const histType = r.type || 'LEAVE'; // team_history only returns leave requests
            const key = `${histType}-${r.id}`;
            if (incomingIds.has(key)) return;
            const empId = r.employee?.id || r.employee;
            items.push({
                ...r,
                employee_name: r.employee_name || r.employee_detail?.full_name || r.employee?.name || '',
                employee_department: r.employee_department || r.employee_detail?.department_name || r.employee?.department || '',
                employee_position: r.employee_position || '',
                target_approver_name: r.target_approver_name || r.target_approver_detail?.full_name || '',
                approved_by_name: r.approved_by_name || r.approved_by_detail?.full_name || '',
                leave_type_name: r.leave_type_name || r.request_type_detail?.name || '',
                start_date: r.start_date || r.date || r.created_at,
                type: histType,
                _source: directSubordinateIds.has(empId) ? 'DIRECT' : 'INDIRECT',
                _isSubstitute: false,
            });
        });

        // 3. Substitute requests
        if (substituteData) {
            const authorities = substituteData.authorities || [];
            (substituteData.leave_requests || []).forEach(r => {
                const principal = authorities.find(a => a.principal === r.principal_id);
                items.push({
                    ...r,
                    _type: 'LEAVE', type: 'LEAVE',
                    _source: 'SUBSTITUTE',
                    _isSubstitute: true,
                    _principalName: principal?.principal_name || '',
                    employee_name: r.employee_name || r.employee_detail?.full_name || r.employee?.name || '',
                    employee_department: r.employee_department || r.employee_detail?.department_name || r.employee?.department || '',
                    target_approver_name: r.target_approver_name || r.target_approver_detail?.full_name || '',
                    approved_by_name: r.approved_by_name || r.approved_by_detail?.full_name || '',
                    leave_type_name: r.leave_type_name || r.request_type_detail?.name || '',
                    start_date: r.start_date || r.created_at,
                    _sortDate: r.start_date || r.created_at,
                });
            });
            (substituteData.overtime_requests || []).forEach(r => {
                const principal = authorities.find(a => a.principal === r.principal_id);
                items.push({
                    ...r,
                    _type: 'OVERTIME', type: 'OVERTIME',
                    _source: 'SUBSTITUTE',
                    _isSubstitute: true,
                    _principalName: principal?.principal_name || '',
                    employee_name: r.employee_name || r.employee_detail?.full_name || r.employee?.name || '',
                    employee_department: r.employee_department || r.employee_detail?.department_name || r.employee?.department || '',
                    target_approver_name: r.target_approver_name || r.target_approver_detail?.full_name || '',
                    start_date: r.date || r.created_at,
                    _sortDate: r.date || r.created_at,
                });
            });
        }

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [incomingRequests, teamHistoryRequests, substituteData, directSubordinateIds]);

    const filtered = useMemo(() => {
        return allRequests.filter(r => {
            if (sourceFilter !== 'ALL' && r._source !== sourceFilter) return false;
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (statusFilter === 'ALL') {
                if (r.status === 'POTENTIAL') return false;
            } else if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED', 'CANCELLED': 'REJECTED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (searchText) {
                const s = searchText.toLowerCase();
                if (!r.employee_name?.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [allRequests, sourceFilter, typeFilter, statusFilter, searchText]);

    const counts = useMemo(() => ({
        all: allRequests.filter(r => r.status !== 'POTENTIAL').length,
        direct: allRequests.filter(r => r._source === 'DIRECT').length,
        indirect: allRequests.filter(r => r._source === 'INDIRECT').length,
        substitute: allRequests.filter(r => r._source === 'SUBSTITUTE').length,
        pending: allRequests.filter(r => r.status === 'PENDING').length,
    }), [allRequests]);

    if (loading) return <div className="animate-pulse h-96 bg-slate-50 rounded-3xl" />;

    const authorities = substituteData?.authorities || [];

    return (
        <div className="space-y-6">
            {/* Active substitute authorities banner */}
            {authorities.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={16} className="text-blue-600" />
                        <span className="text-sm font-bold text-blue-900">Aktif Vekalet Yetkileri</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {authorities.map(auth => (
                            <span key={auth.id} className="bg-white rounded-lg px-3 py-1.5 border border-blue-100 text-xs font-bold text-slate-700">
                                {auth.principal_name} ({new Date(auth.valid_from).toLocaleDateString('tr-TR')} — {new Date(auth.valid_to).toLocaleDateString('tr-TR')})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                {/* Source sub-filter */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'ALL', label: 'Tümü', count: counts.all, icon: null },
                        { key: 'DIRECT', label: 'Doğrudan', count: counts.direct, icon: <User size={14} /> },
                        { key: 'INDIRECT', label: 'Ekibimin Talepleri', count: counts.indirect, icon: <Users size={14} /> },
                        { key: 'SUBSTITUTE', label: 'Vekalet', count: counts.substitute, icon: <ArrowRightLeft size={14} /> },
                    ].map(({ key, label, count, icon }) => (
                        <button
                            key={key}
                            onClick={() => setSourceFilter(key)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                                sourceFilter === key
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {icon}
                            {label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                    sourceFilter === key ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                                }`}>{count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Type + Status + Search */}
                <div className="flex flex-col xl:flex-row gap-3 justify-between items-start xl:items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="İsim ile ara..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {['ALL', 'LEAVE', 'OVERTIME', 'MEAL', 'CARDLESS_ENTRY'].map(t => (
                                <button key={t} onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {t === 'ALL' ? 'Tümü' : t === 'LEAVE' ? 'İzin' : t === 'OVERTIME' ? 'Mesai' : t === 'MEAL' ? 'Yemek' : 'Kartsız'}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {s === 'ALL' ? 'Hepsi' : s === 'PENDING' ? 'Bekleyen' : s === 'APPROVED' ? 'Onaylı' : 'Red'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Request list */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <Users size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Gelen Talep Yok</h3>
                    <p className="text-sm text-slate-500 mt-1">Seçili kriterlere uygun gelen talep bulunmamaktadır.</p>
                </div>
            ) : (
                <RequestListTable
                    requests={filtered}
                    onViewDetails={handleViewDetails}
                    onApprove={(req, notes) => {
                        if (req._isSubstitute) handleSubstituteApprove(req);
                        else handleApprove(req, notes);
                    }}
                    onReject={(req, reason) => {
                        if (req._isSubstitute) handleSubstituteReject(req, reason);
                        else handleReject(req, reason);
                    }}
                    showSourceBadge={true}
                />
            )}
        </div>
    );
};

export default IncomingRequestsTab;
