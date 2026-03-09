import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Search, Users, Shield, Inbox, UserCheck, UserCog
} from 'lucide-react';
import api from '../../services/api';
import ExpandableRequestRow from '../../components/requests/ExpandableRequestRow';
import EmployeeRequestGroup from '../../components/requests/EmployeeRequestGroup';
import RequestDetailModal from '../../components/RequestDetailModal';

const IncomingRequestsTab = ({ onPendingCountChange, refreshTrigger, filterType }) => {
    // Data states
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);
    const [substituteData, setSubstituteData] = useState(null);
    const [subordinates, setSubordinates] = useState([]);
    const [secondaryOnlyIds, setSecondaryOnlyIds] = useState(new Set());
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sub-tab: 'direct_incoming' | 'team_requests'
    const [activeSubTab, setActiveSubTab] = useState('direct_incoming');

    // Manager type filter for direct incoming: 'all' | 'primary' | 'secondary'
    const [directManagerFilter, setDirectManagerFilter] = useState('all');

    // Filters
    const [typeFilter, setTypeFilter] = useState(filterType === 'overtime' ? 'OVERTIME' : 'ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchText, setSearchText] = useState('');

    // Detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);

    // Expandable row state for direct incoming (flat table)
    const [directExpandedId, setDirectExpandedId] = useState(null);

    // Open groups state for team requests (employee accordion)
    const [openGroups, setOpenGroups] = useState(new Set());

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
            const [meRes, subsRes, teamRes, histRes, subAuthRes, secSubRes] = await Promise.allSettled([
                api.get('/employees/me/'),
                api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY' } }),
                api.get('/team-requests/'),
                api.get('/leave/requests/team_history/'),
                api.get('/substitute-authority/pending_requests/'),
                api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY' } }),
            ]);

            if (meRes.status === 'fulfilled') {
                setCurrentUserEmployeeId(meRes.value.data.id);
            }
            if (subsRes.status === 'fulfilled') {
                const allSubs = subsRes.value.data || [];
                setSubordinates(allSubs);
                const priSubIds = new Set(allSubs.map(s => s.id));
                if (secSubRes.status === 'fulfilled') {
                    const secSubs = secSubRes.value.data || [];
                    const secIds = new Set(secSubs.map(s => s.id));
                    const secOnly = new Set([...secIds].filter(id => !priSubIds.has(id)));
                    setSecondaryOnlyIds(secOnly);
                }
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
        const subCE = (substituteData?.cardless_entry_requests || []).length;
        return teamPending + subLeave + subOT + subCE;
    }, [incomingRequests, substituteData]);

    useEffect(() => {
        if (onPendingCountChange) onPendingCountChange(pendingCount);
    }, [pendingCount, onPendingCountChange]);

    // --- Approval / Rejection Handlers ---
    const handleApprove = async (req, notes) => {
        try {
            if (req.type === 'LEAVE') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onaylandı' });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onaylandı' });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/approve/`, {});
            } else if (req.type === 'HEALTH_REPORT' || req.type === 'HOSPITAL_VISIT') {
                await api.post(`/health-reports/${req.id}/approve/`);
            }
            fetchAllData();
        } catch (e) {
            alert(e.response?.data?.error || 'İşlem başarısız');
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
            } else if (req.type === 'HEALTH_REPORT' || req.type === 'HOSPITAL_VISIT') {
                await api.post(`/health-reports/${req.id}/reject/`, { reason });
            }
            fetchAllData();
        } catch (e) {
            alert(e.response?.data?.error || 'İşlem başarısız');
        }
    };

    const handleSubstituteApprove = async (req) => {
        try {
            if (req.type === 'LEAVE') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, {
                    action: 'approve', notes: 'Vekil olarak onaylandı', acting_as_substitute_for: req.principal_id,
                });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, {
                    action: 'approve', notes: 'Vekil olarak onaylandı', acting_as_substitute_for: req.principal_id,
                });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/approve/`, {
                    acting_as_substitute_for: req.principal_id,
                });
            }
            fetchAllData();
        } catch (e) {
            alert(e.response?.data?.error || 'İşlem başarısız');
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
            alert(e.response?.data?.error || 'İşlem başarısız');
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
        employee_id: r.employee?.id || r.employee_id || r.employee || null,
        target_approver_name: r.target_approver_name || r.target_approver_detail?.full_name || '',
        approved_by_name: r.approved_by_name || r.approved_by_detail?.full_name || '',
        approver_target: r.approver_target || null,
        request_scope: r.request_scope || null,
        manager_type: r.manager_type || null,
        leave_type_name: r.leave_type_name || r.request_type_detail?.name || '',
        start_date: r.start_date || r.date || r.created_at,
        type: r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : (r.type || 'UNKNOWN'),
        _source: source,
        _isSubstitute: isSubstitute,
        _principalName: principalName,
    });

    // --- SUB-TAB 1: Doğrudan Gelen (request_scope = 'direct', PENDING + substitute) ---
    const directIncomingItems = useMemo(() => {
        const items = [];
        const seen = new Set();

        // PENDING incoming requests — sadece doğrudan bana yönlendirilmiş (backend request_scope)
        (incomingRequests || []).forEach(r => {
            if (r.status !== 'PENDING') return;
            if (r.request_scope !== 'direct') return;
            const key = `${r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : r.type}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest(r, r.level === 'direct' ? 'DIRECT' : 'INDIRECT'));
        });

        // Substitute requests (vekalet — her zaman doğrudan gelen'de, manager_type='primary')
        if (substituteData) {
            const authorities = substituteData.authorities || [];
            (substituteData.leave_requests || []).forEach(r => {
                const key = `LEAVE-${r.id}`;
                if (seen.has(key)) return;
                seen.add(key);
                const principal = authorities.find(a => a.principal === r.principal_id);
                items.push(normalizeRequest(
                    { ...r, type: 'LEAVE', manager_type: 'PRIMARY' },
                    'SUBSTITUTE', true, principal?.principal_name || ''
                ));
            });
            (substituteData.overtime_requests || []).forEach(r => {
                const key = `OVERTIME-${r.id}`;
                if (seen.has(key)) return;
                seen.add(key);
                const principal = authorities.find(a => a.principal === r.principal_id);
                items.push(normalizeRequest(
                    { ...r, type: 'OVERTIME', manager_type: 'PRIMARY' },
                    'SUBSTITUTE', true, principal?.principal_name || ''
                ));
            });
            (substituteData.cardless_entry_requests || []).forEach(r => {
                const key = `CARDLESS_ENTRY-${r.id}`;
                if (seen.has(key)) return;
                seen.add(key);
                const principal = authorities.find(a => a.principal === r.principal_id);
                items.push(normalizeRequest(
                    { ...r, type: 'CARDLESS_ENTRY', manager_type: 'PRIMARY' },
                    'SUBSTITUTE', true, principal?.principal_name || ''
                ));
            });
        }

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [incomingRequests, substituteData]);

    // PRIMARY / SECONDARY counts for direct incoming badge
    const primaryCount = useMemo(() =>
        directIncomingItems.filter(r => (r.manager_type || 'PRIMARY') === 'PRIMARY').length
    , [directIncomingItems]);

    const secondaryCount = useMemo(() =>
        directIncomingItems.filter(r => r.manager_type === 'SECONDARY').length
    , [directIncomingItems]);

    // --- SUB-TAB 2: Ekip Talepleri (alt yöneticilere gelen talepler, tüm durumlar) ---
    const teamItems = useMemo(() => {
        const items = [];
        const seen = new Set();

        // Team requests — backend request_scope='team' olanlar (alt yöneticilere gelen)
        (incomingRequests || []).forEach(r => {
            if (r.request_scope === 'direct') return;
            const type = r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : (r.type || 'UNKNOWN');
            const key = `${type}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest(r, r.level === 'direct' ? 'DIRECT' : 'INDIRECT'));
        });

        // History (leave requests — don't duplicate) — sadece dolaylı çalışanların geçmişi
        (teamHistoryRequests || []).forEach(r => {
            const empId = r.employee?.id || r.employee;
            if (directSubordinateIds.has(empId)) return;
            const histTargetId = typeof r.target_approver === 'object'
                ? r.target_approver?.id
                : r.target_approver;
            if (histTargetId === currentUserEmployeeId) return;
            const histType = r.type || 'LEAVE';
            const key = `${histType}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest(
                { ...r, type: histType },
                'INDIRECT'
            ));
        });

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [incomingRequests, teamHistoryRequests, directSubordinateIds, currentUserEmployeeId]);

    // Current items based on sub-tab
    const currentItems = activeSubTab === 'direct_incoming' ? directIncomingItems : teamItems;

    // Apply filters (including manager_type filter for direct)
    const filtered = useMemo(() => {
        return currentItems.filter(r => {
            // Manager type filter for direct incoming
            if (activeSubTab === 'direct_incoming' && directManagerFilter !== 'all') {
                const mType = (r.manager_type || 'PRIMARY').toUpperCase();
                if (directManagerFilter === 'primary' && mType !== 'PRIMARY') return false;
                if (directManagerFilter === 'secondary' && mType !== 'SECONDARY') return false;
            }
            // SECONDARY-only employee safety filter: only show OT requests
            const empId = r.employee_id || r.employee?.id || r.employee;
            if (empId && secondaryOnlyIds.has(empId)) {
                const rType = r.type || '';
                if (!rType.includes('OVERTIME') && rType !== 'OVERTIME') return false;
            }
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
    }, [currentItems, typeFilter, statusFilter, searchText, activeSubTab, secondaryOnlyIds, directManagerFilter]);

    // Badge counts
    const directPendingCount = useMemo(() =>
        directIncomingItems.filter(r => r.status === 'PENDING' || r._isSubstitute).length
    , [directIncomingItems]);

    const teamPendingCount = useMemo(() =>
        teamItems.filter(r => r.status === 'PENDING').length
    , [teamItems]);

    // Group filtered items by employee for team_requests sub-tab
    const groupedByEmployee = useMemo(() => {
        if (activeSubTab !== 'team_requests') return [];
        const groups = {};
        filtered.forEach(r => {
            const empKey = r.employee_id || r.employee || r.employee_name || 'unknown';
            const name = r.employee_name || 'Bilinmiyor';
            if (!groups[empKey]) {
                groups[empKey] = {
                    employeeKey: String(empKey),
                    employeeName: name,
                    employeeDepartment: r.employee_department || '',
                    employeePosition: r.employee_position || '',
                    requests: [],
                };
            }
            groups[empKey].requests.push(r);
        });
        return Object.values(groups).sort((a, b) => {
            const aPending = a.requests.filter(r => r.status === 'PENDING').length;
            const bPending = b.requests.filter(r => r.status === 'PENDING').length;
            if (bPending !== aPending) return bPending - aPending;
            return a.employeeName.localeCompare(b.employeeName, 'tr');
        });
    }, [filtered, activeSubTab]);

    // Initialize open groups only once when first switching to team_requests
    const groupsInitialized = useRef(false);
    useEffect(() => {
        if (activeSubTab === 'team_requests' && groupedByEmployee.length > 0 && !groupsInitialized.current) {
            const pendingGroups = new Set(
                groupedByEmployee
                    .filter(g => g.requests.some(r => r.status === 'PENDING'))
                    .map(g => g.employeeKey)
            );
            setOpenGroups(pendingGroups);
            groupsInitialized.current = true;
        }
        if (activeSubTab !== 'team_requests') {
            groupsInitialized.current = false;
        }
    }, [activeSubTab, groupedByEmployee]);

    // Type filter options
    const typeFilterOptions = filterType
        ? []
        : [
            { key: 'ALL', label: 'Tümü' },
            { key: 'LEAVE', label: 'İzin' },
            { key: 'OVERTIME', label: 'Mesai' },
            { key: 'MEAL', label: 'Yemek' },
            { key: 'CARDLESS_ENTRY', label: 'Kartsız' },
            { key: 'HEALTH_REPORT', label: 'Sağlık R.' },
            { key: 'HOSPITAL_VISIT', label: 'Hastane' },
        ];

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
                        onClick={() => { setActiveSubTab('direct_incoming'); setStatusFilter('ALL'); setDirectManagerFilter('all'); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            activeSubTab === 'direct_incoming'
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Inbox size={14} />
                        Doğrudan Talepler
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

                {/* PRIMARY / SECONDARY sub-filter for direct incoming */}
                {activeSubTab === 'direct_incoming' && secondaryCount > 0 && (
                    <div className="flex gap-1.5 border-t border-slate-100 pt-3">
                        {[
                            { key: 'all', label: 'Tümü', count: directPendingCount },
                            { key: 'primary', label: 'Birincil Yönetici', icon: <UserCheck size={12} />, count: primaryCount },
                            { key: 'secondary', label: 'İkincil Yönetici', icon: <UserCog size={12} />, count: secondaryCount },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setDirectManagerFilter(opt.key)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                                    directManagerFilter === opt.key
                                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                {opt.icon}
                                {opt.label}
                                {opt.count > 0 && (
                                    <span className={`px-1 py-0.5 rounded text-[9px] ${
                                        directManagerFilter === opt.key ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                                    }`}>{opt.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

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
                        {/* Type filter — hidden when filterType prop locks it */}
                        {typeFilterOptions.length > 0 && (
                            <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-0.5">
                                {typeFilterOptions.map(t => (
                                    <button key={t.key} onClick={() => setTypeFilter(t.key)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                            typeFilter === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Status filter — only for Ekip Talepleri tab */}
                        {activeSubTab === 'team_requests' && (
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
                    <p className="text-sm text-slate-500 mt-1">Seçili kriterlere uygun talep bulunmamaktadır.</p>
                </div>
            ) : activeSubTab === 'direct_incoming' ? (
                /* Doğrudan Gelen — flat expandable table */
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-[11px] text-slate-400 uppercase tracking-wider">
                                    <th className="pl-3 pr-1 py-2 w-8"></th>
                                    <th className="px-3 py-2 font-bold">Talep Eden</th>
                                    <th className="px-3 py-2 font-bold">Tür</th>
                                    <th className="px-3 py-2 font-bold">Tarih</th>
                                    <th className="px-3 py-2 font-bold">Saat Aralığı</th>
                                    <th className="px-3 py-2 font-bold">Süre</th>
                                    <th className="px-3 py-2 font-bold">Durum</th>
                                    <th className="px-3 py-2 font-bold text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(req => (
                                    <ExpandableRequestRow
                                        key={`${req.type}-${req.id}`}
                                        req={req}
                                        isExpanded={directExpandedId === `${req.type}-${req.id}`}
                                        onToggle={() => {
                                            const key = `${req.type}-${req.id}`;
                                            setDirectExpandedId(prev => prev === key ? null : key);
                                        }}
                                        onViewDetails={handleViewDetails}
                                        onApprove={(r, notes) => {
                                            if (r._isSubstitute) handleSubstituteApprove(r);
                                            else handleApprove(r, notes);
                                        }}
                                        onReject={(r, reason) => {
                                            if (r._isSubstitute) handleSubstituteReject(r, reason);
                                            else handleReject(r, reason);
                                        }}
                                        showEmployeeColumn={true}
                                        mode="incoming"
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Ekip Talepleri — employee-grouped accordion */
                <div className="space-y-3">
                    {groupedByEmployee.map(group => (
                        <EmployeeRequestGroup
                            key={group.employeeKey}
                            employeeName={group.employeeName}
                            employeeDepartment={group.employeeDepartment}
                            employeePosition={group.employeePosition}
                            requests={group.requests}
                            isOpen={openGroups.has(group.employeeKey)}
                            onToggle={() => {
                                setOpenGroups(prev => {
                                    const next = new Set(prev);
                                    if (next.has(group.employeeKey)) next.delete(group.employeeKey);
                                    else next.add(group.employeeKey);
                                    return next;
                                });
                            }}
                            onViewDetails={handleViewDetails}
                            onApprove={(req, notes) => {
                                if (req._isSubstitute) handleSubstituteApprove(req);
                                else handleApprove(req, notes);
                            }}
                            onReject={(req, reason) => {
                                if (req._isSubstitute) handleSubstituteReject(req, reason);
                                else handleReject(req, reason);
                            }}
                        />
                    ))}
                </div>
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
