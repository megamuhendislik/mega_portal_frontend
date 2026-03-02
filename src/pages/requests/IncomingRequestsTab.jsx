import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Search, Clock, Utensils, CreditCard, User, Users,
    ArrowRightLeft, Shield, FileText, Inbox
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RequestListTable from '../../components/RequestListTable';
import RequestDetailModal from '../../components/RequestDetailModal';

const IncomingRequestsTab = ({ onPendingCountChange, refreshTrigger }) => {
    const { user } = useAuth();

    // Data states
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);
    const [substituteData, setSubstituteData] = useState(null);
    const [subordinates, setSubordinates] = useState([]);
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sub-tab: 'direct_incoming' | 'team_requests'
    const [activeSubTab, setActiveSubTab] = useState('direct_incoming');

    // Filters
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchText, setSearchText] = useState('');

    // Detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);

    // Compute directSubordinateIds
    const directSubordinateIds = useMemo(() => {
        if (!subordinates.length || !currentUserEmployeeId) return new Set();
        return new Set(
            subordinates.filter(sub => {
                if (sub.reports_to === currentUserEmployeeId) return true;
                if (sub.primary_managers && sub.primary_managers.some(m => m.id === currentUserEmployeeId)) return true;
                return false;
            }).map(s => s.id)
        );
    }, [subordinates, currentUserEmployeeId]);

    // --- Data Fetching ---
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [meRes, subsRes, teamRes, histRes, subAuthRes] = await Promise.allSettled([
                api.get('/employees/me/'),
                api.get('/employees/subordinates/'),
                api.get('/team-requests/'),
                api.get('/leave/requests/team_history/'),
                api.get('/substitute-authority/pending_requests/'),
            ]);

            if (meRes.status === 'fulfilled') {
                setCurrentUserEmployeeId(meRes.value.data.id);
            }
            if (subsRes.status === 'fulfilled') {
                setSubordinates(subsRes.value.data || []);
            }
            if (teamRes.status === 'fulfilled') {
                setIncomingRequests(teamRes.value.data || []);
            }
            if (histRes.status === 'fulfilled') {
                const hData = histRes.value.data;
                setTeamHistoryRequests(hData?.results || hData || []);
            }
            if (subAuthRes.status === 'fulfilled') {
                setSubstituteData(subAuthRes.value.data);
            } else {
                setSubstituteData(null);
            }
        } catch (e) {
            console.error('IncomingRequestsTab fetchAllData error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    // Cross-tab refresh trigger
    useEffect(() => {
        if (refreshTrigger > 0) fetchAllData();
    }, [refreshTrigger, fetchAllData]);

    // Notify parent about pending count
    const pendingCount = useMemo(() => {
        const teamPending = (incomingRequests || []).filter(r => r.status === 'PENDING').length;
        const subLeave = (substituteData?.leave_requests || []).length;
        const subOT = (substituteData?.overtime_requests || []).length;
        return teamPending + subLeave + subOT;
    }, [incomingRequests, substituteData]);

    useEffect(() => {
        if (onPendingCountChange) onPendingCountChange(pendingCount);
    }, [pendingCount, onPendingCountChange]);

    // --- Approval / Rejection Handlers ---
    const handleApprove = async (req, notes) => {
        try {
            if (req.type === 'LEAVE') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onayland\u0131' });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onayland\u0131' });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/approve/`, {});
            }
            fetchAllData();
        } catch (e) {
            alert(e.response?.data?.error || 'Islem basarisiz');
        }
    };

    const handleReject = async (req, reason) => {
        if (!reason) return;
        try {
            if (req.type === 'LEAVE') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, { action: 'reject', reason });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'reject', reason });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/reject/`, { reason });
            }
            fetchAllData();
        } catch (e) {
            alert(e.response?.data?.error || 'Islem basarisiz');
        }
    };

    const handleSubstituteApprove = async (req) => {
        try {
            if (req.type === 'LEAVE') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, {
                    action: 'approve', notes: 'Vekil olarak onayland\u0131', acting_as_substitute_for: req.principal_id,
                });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, {
                    action: 'approve', notes: 'Vekil olarak onayland\u0131', acting_as_substitute_for: req.principal_id,
                });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/approve/`, {
                    acting_as_substitute_for: req.principal_id,
                });
            }
            fetchAllData();
        } catch (e) {
            alert(e.response?.data?.error || 'Islem basarisiz');
        }
    };

    const handleSubstituteReject = async (req, reason) => {
        if (!reason) return;
        try {
            if (req.type === 'LEAVE') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, {
                    action: 'reject', reason, acting_as_substitute_for: req.principal_id,
                });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, {
                    action: 'reject', reason, acting_as_substitute_for: req.principal_id,
                });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/reject/`, {
                    reason, acting_as_substitute_for: req.principal_id,
                });
            }
            fetchAllData();
        } catch (e) {
            alert(e.response?.data?.error || 'Islem basarisiz');
        }
    };

    // --- Detail Modal ---
    const handleViewDetails = (r, t) => {
        setSelectedRequest(r);
        setSelectedRequestType(t);
        setShowDetailModal(true);
    };

    // --- Normalize helper ---
    const normalizeRequest = (r, source, isSubstitute = false, principalName = '') => ({
        ...r,
        employee_name: r.employee_name || r.employee_detail?.full_name || r.employee?.name || '',
        employee_department: r.employee_department || r.employee_detail?.department_name || r.employee?.department || '',
        employee_position: r.employee_position || '',
        target_approver_name: r.target_approver_name || r.target_approver_detail?.full_name || '',
        approved_by_name: r.approved_by_name || r.approved_by_detail?.full_name || '',
        leave_type_name: r.leave_type_name || r.request_type_detail?.name || '',
        start_date: r.start_date || r.date || r.created_at,
        type: r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : (r.type || 'UNKNOWN'),
        _source: source,
        _isSubstitute: isSubstitute,
        _principalName: principalName,
    });

    // --- SUB-TAB 1: Dogrudan Gelen (target_approver = me, PENDING + substitute) ---
    const directIncomingItems = useMemo(() => {
        const items = [];
        const seen = new Set();

        // PENDING incoming requests (target_approver = current user)
        (incomingRequests || []).forEach(r => {
            if (r.status !== 'PENDING') return;
            const key = `${r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : r.type}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest(r, r.level === 'direct' ? 'DIRECT' : 'INDIRECT'));
        });

        // Substitute requests
        if (substituteData) {
            const authorities = substituteData.authorities || [];
            (substituteData.leave_requests || []).forEach(r => {
                const key = `LEAVE-${r.id}`;
                if (seen.has(key)) return;
                seen.add(key);
                const principal = authorities.find(a => a.principal === r.principal_id);
                items.push(normalizeRequest(
                    { ...r, type: 'LEAVE' },
                    'SUBSTITUTE', true, principal?.principal_name || ''
                ));
            });
            (substituteData.overtime_requests || []).forEach(r => {
                const key = `OVERTIME-${r.id}`;
                if (seen.has(key)) return;
                seen.add(key);
                const principal = authorities.find(a => a.principal === r.principal_id);
                items.push(normalizeRequest(
                    { ...r, type: 'OVERTIME' },
                    'SUBSTITUTE', true, principal?.principal_name || ''
                ));
            });
        }

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [incomingRequests, substituteData]);

    // --- SUB-TAB 2: Ekip Talepleri (all team members, all statuses including history) ---
    const teamItems = useMemo(() => {
        const items = [];
        const seen = new Set();

        // All incoming team requests (all statuses)
        (incomingRequests || []).forEach(r => {
            const type = r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : (r.type || 'UNKNOWN');
            const key = `${type}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest(r, r.level === 'direct' ? 'DIRECT' : 'INDIRECT'));
        });

        // History (leave requests — don't duplicate)
        (teamHistoryRequests || []).forEach(r => {
            const histType = r.type || 'LEAVE';
            const key = `${histType}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            const empId = r.employee?.id || r.employee;
            items.push(normalizeRequest(
                { ...r, type: histType },
                directSubordinateIds.has(empId) ? 'DIRECT' : 'INDIRECT'
            ));
        });

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [incomingRequests, teamHistoryRequests, directSubordinateIds]);

    // Current items based on sub-tab
    const currentItems = activeSubTab === 'direct_incoming' ? directIncomingItems : teamItems;

    // Apply filters
    const filtered = useMemo(() => {
        return currentItems.filter(r => {
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (r.status === 'POTENTIAL') return false;
            if (activeSubTab === 'team_requests' && statusFilter !== 'ALL') {
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
    }, [currentItems, typeFilter, statusFilter, searchText, activeSubTab]);

    // Badge counts
    const directPendingCount = useMemo(() =>
        directIncomingItems.filter(r => r.status === 'PENDING' || r._isSubstitute).length
    , [directIncomingItems]);

    const teamPendingCount = useMemo(() =>
        teamItems.filter(r => r.status === 'PENDING').length
    , [teamItems]);

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

            {/* Sub-tabs + Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                {/* Sub-tab pills */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { setActiveSubTab('direct_incoming'); setStatusFilter('ALL'); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            activeSubTab === 'direct_incoming'
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Inbox size={14} />
                        Dogrudan Gelen
                        {directPendingCount > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                activeSubTab === 'direct_incoming' ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                            }`}>{directPendingCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveSubTab('team_requests')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            activeSubTab === 'team_requests'
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Users size={14} />
                        Ekip Talepleri
                        {teamPendingCount > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                activeSubTab === 'team_requests' ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                            }`}>{teamPendingCount}</span>
                        )}
                    </button>
                </div>

                {/* Type + Status + Search */}
                <div className="flex flex-col xl:flex-row gap-3 justify-between items-start xl:items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Isim ile ara..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* Type filter */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {['ALL', 'LEAVE', 'OVERTIME', 'MEAL', 'CARDLESS_ENTRY'].map(t => (
                                <button key={t} onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {t === 'ALL' ? 'Tumu' : t === 'LEAVE' ? 'Izin' : t === 'OVERTIME' ? 'Mesai' : t === 'MEAL' ? 'Yemek' : 'Kartsiz'}
                                </button>
                            ))}
                        </div>
                        {/* Status filter — only for Ekip Talepleri tab */}
                        {activeSubTab === 'team_requests' && (
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                            statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {s === 'ALL' ? 'Hepsi' : s === 'PENDING' ? 'Bekleyen' : s === 'APPROVED' ? 'Onayli' : 'Red'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Request list */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <Users size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">
                        {activeSubTab === 'direct_incoming' ? 'Bekleyen Gelen Talep Yok' : 'Ekip Talebi Yok'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Secili kriterlere uygun talep bulunmamaktadir.</p>
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
                    showEmployeeColumn={true}
                />
            )}

            {/* Detail Modal */}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={fetchAllData}
            />
        </div>
    );
};

export default IncomingRequestsTab;
