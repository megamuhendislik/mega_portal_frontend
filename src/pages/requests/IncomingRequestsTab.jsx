import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Search, Users, Shield, UserCheck, UserCog, Clock, FileText, Info,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { Tooltip } from 'antd';
import api from '../../services/api';
import FiscalMonthPicker from '../../components/FiscalMonthPicker';
import ExpandableRequestRow from '../../components/requests/ExpandableRequestRow';
import RequestDetailModal from '../../components/RequestDetailModal';
const IncomingRequestsTab = ({ onPendingCountChange, onDataChange, refreshTrigger, filterType, primaryCount = 0, secondaryCount = 0 }) => {
    // Data states
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);
    const [substituteData, setSubstituteData] = useState(null);
    const [subordinates, setSubordinates] = useState([]);
    const [secondarySubIds, setSecondarySubIds] = useState(new Set());
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
    const [allTeamData, setAllTeamData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Sub-tab: 'primary_team' | 'secondary_team'
    const [activeSubTab, setActiveSubTab] = useState('primary_team');

    // Auto-select visible tab when one side is hidden
    useEffect(() => {
        if (primaryCount === 0 && secondaryCount > 0) setActiveSubTab('secondary_team');
    }, [primaryCount, secondaryCount]);

    // Filters
    const [typeFilter, setTypeFilter] = useState(filterType === 'overtime' ? 'OVERTIME' : 'ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchText, setSearchText] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [personFilter, setPersonFilter] = useState('ALL');

    // Pagination
    const PAGE_SIZE = 50;
    const [pendingPage, setPendingPage] = useState(1);
    const [teamPage, setTeamPage] = useState(1);

    // Detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);

    // Expandable row state (flat table)
    const [expandedId, setExpandedId] = useState(null);

    // Compute directSubordinateIds (PRIMARY subordinates)
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
            const [meRes, subsRes, teamRes, histRes, subAuthRes, secSubRes, allTeamRes] = await Promise.allSettled([
                api.get('/employees/me/'),
                api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY' } }),
                api.get('/team-requests/'),
                api.get('/leave/requests/team_history/'),
                api.get('/substitute-authority/pending_requests/'),
                api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY' } }),
                api.get('/team-requests/all_team/'),
            ]);

            if (meRes.status === 'fulfilled') {
                setCurrentUserEmployeeId(meRes.value.data.id);
            }
            if (subsRes.status === 'fulfilled') {
                const allSubs = subsRes.value.data || [];
                setSubordinates(allSubs);
                if (secSubRes.status === 'fulfilled') {
                    const secSubs = secSubRes.value.data || [];
                    setSecondarySubIds(new Set(secSubs.map(s => s.id)));
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
            if (allTeamRes.status === 'fulfilled') {
                setAllTeamData(allTeamRes.value.data || []);
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

    // --- Approval / Rejection Handlers ---
    const handleApprove = async (req, notes) => {
        try {
            if (req.type === 'LEAVE') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onaylandı' });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onaylandı' });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/approve/`, {});
            }
            fetchAllData();
            onDataChange?.();
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
            }
            fetchAllData();
            onDataChange?.();
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
            onDataChange?.();
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
            onDataChange?.();
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

    // Override detail modal (from ExpandableRequestRow "Karar Değiştir" button)
    const handleViewDetail = (req) => {
        setSelectedRequest(req);
        setSelectedRequestType(req.type);
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

    // --- ALL TEAM: normalized data from all_team endpoint ---
    const allTeamNormalized = useMemo(() => {
        return (allTeamData || []).map(r => ({
            ...r,
            id: r.request_id || r.id,
            employee_name: r.employee_name || '',
            employee_department: r.department_name || r.employee_department || '',
            target_approver_name: r.target_approver_name || '',
            approved_by_name: r.approved_by_name || '',
            start_date: r.date || r.start_date,
            date: r.date,
            leave_type_name: r.request_type_name || r.leave_type_name || '',
            _source: 'ALL_TEAM',
            _isSubstitute: false,
            _principalName: '',
        }));
    }, [allTeamData]);

    // --- PENDING ACTIONABLE: items where I can approve/reject (all_team is_actionable + substitutes) ---
    const pendingActionable = useMemo(() => {
        const items = [];
        const seen = new Set();

        // From all_team data: actionable pending
        allTeamNormalized.forEach(r => {
            if (r.is_actionable && r.status === 'PENDING') {
                const key = `${r.type}-${r.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    items.push(r);
                }
            }
        });

        // Substitute requests (always in pending section)
        if (substituteData) {
            const authorities = substituteData.authorities || [];
            (substituteData.leave_requests || []).forEach(r => {
                const key = `LEAVE-${r.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    const principal = authorities.find(a => a.principal === r.principal_id);
                    items.push({
                        ...r,
                        type: 'LEAVE',
                        employee_name: r.employee_name || r.employee_detail?.full_name || '',
                        employee_department: r.employee_department || r.employee_detail?.department_name || '',
                        target_approver_name: r.target_approver_name || r.target_approver_detail?.full_name || '',
                        start_date: r.start_date || r.date,
                        leave_type_name: r.leave_type_name || r.request_type_detail?.name || '',
                        _source: 'SUBSTITUTE',
                        _isSubstitute: true,
                        _principalName: principal?.principal_name || '',
                        is_actionable: true,
                    });
                }
            });
            (substituteData.overtime_requests || []).forEach(r => {
                const key = `OVERTIME-${r.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    const principal = authorities.find(a => a.principal === r.principal_id);
                    items.push({
                        ...r,
                        type: 'OVERTIME',
                        employee_name: r.employee_name || r.employee_detail?.full_name || '',
                        employee_department: '',
                        target_approver_name: r.target_approver_name || '',
                        start_date: r.date,
                        _source: 'SUBSTITUTE',
                        _isSubstitute: true,
                        _principalName: principal?.principal_name || '',
                        is_actionable: true,
                    });
                }
            });
            (substituteData.cardless_entry_requests || []).forEach(r => {
                const key = `CARDLESS_ENTRY-${r.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    const principal = authorities.find(a => a.principal === r.principal_id);
                    items.push({
                        ...r,
                        type: 'CARDLESS_ENTRY',
                        employee_name: r.employee_name || r.employee_detail?.full_name || '',
                        employee_department: '',
                        target_approver_name: r.target_approver_name || '',
                        start_date: r.date,
                        _source: 'SUBSTITUTE',
                        _isSubstitute: true,
                        _principalName: principal?.principal_name || '',
                        is_actionable: true,
                    });
                }
            });
        }

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [allTeamNormalized, substituteData]);

    // Notify parent about pending count
    const pendingCount = useMemo(() => {
        return pendingActionable.length;
    }, [pendingActionable]);

    useEffect(() => {
        if (onPendingCountChange) onPendingCountChange(pendingCount);
    }, [pendingCount, onPendingCountChange]);

    // --- PRIMARY TEAM (legacy): for pendingCount fallback and backward compat ---
    const primaryTeamItems = useMemo(() => {
        // Use allTeamNormalized as the primary source when available, fallback to old logic
        if (allTeamNormalized.length > 0) return allTeamNormalized;

        const items = [];
        const seen = new Set();

        // All incoming requests with manager_type PRIMARY or null
        (incomingRequests || []).forEach(r => {
            const mType = (r.manager_type || 'PRIMARY').toUpperCase();
            if (mType !== 'PRIMARY') return;
            const key = `${r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : r.type}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest(r, r.level === 'direct' ? 'DIRECT' : 'INDIRECT'));
        });

        // Substitute requests always go to primary team
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

        // Include team history for PRIMARY subordinates (non-duplicate leave history)
        (teamHistoryRequests || []).forEach(r => {
            const empId = r.employee?.id || r.employee;
            // Skip if this employee is a secondary-only subordinate
            if (secondarySubIds.has(empId) && !directSubordinateIds.has(empId)) return;
            const histType = r.type || 'LEAVE';
            const key = `${histType}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest({ ...r, type: histType }, 'INDIRECT'));
        });

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [allTeamNormalized, incomingRequests, substituteData, teamHistoryRequests, secondarySubIds, directSubordinateIds]);

    // --- SECONDARY TEAM: Only OVERTIME requests where manager_type is SECONDARY ---
    const secondaryTeamItems = useMemo(() => {
        const items = [];
        const seen = new Set();

        (incomingRequests || []).forEach(r => {
            if (r.manager_type !== 'SECONDARY') return;
            // SECONDARY can only see OVERTIME
            const type = r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : (r.type || 'UNKNOWN');
            if (type !== 'OVERTIME') return;
            const key = `${type}-${r.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            items.push(normalizeRequest(r, r.level === 'direct' ? 'DIRECT' : 'INDIRECT'));
        });

        items.sort((a, b) => new Date(b.start_date || b.date || b.created_at) - new Date(a.start_date || a.date || a.created_at));
        return items;
    }, [incomingRequests]);

    // Current items based on sub-tab (primary uses allTeamNormalized when available)
    const currentItems = activeSubTab === 'primary_team' ? primaryTeamItems : secondaryTeamItems;

    // Badge counts
    const primaryPendingCount = useMemo(() =>
        pendingActionable.length
    , [pendingActionable]);

    const secondaryPendingCount = useMemo(() =>
        secondaryTeamItems.filter(r => r.status === 'PENDING').length
    , [secondaryTeamItems]);

    // Unique employees for person filter dropdown
    const uniqueEmployees = useMemo(() => {
        const empMap = new Map();
        currentItems.forEach(r => {
            const empId = String(r.employee_id || r.employee || '');
            if (empId && empId !== 'null' && empId !== 'undefined' && !empMap.has(empId)) {
                empMap.set(empId, r.employee_name || 'Bilinmiyor');
            }
        });
        return Array.from(empMap.entries()).sort((a, b) => a[1].localeCompare(b[1], 'tr'));
    }, [currentItems]);

    // Apply filters
    const filtered = useMemo(() => {
        return currentItems.filter(r => {
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (r.status === 'POTENTIAL') return false;
            if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED', 'CANCELLED': 'REJECTED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (searchText) {
                const s = searchText.toLowerCase();
                if (!r.employee_name?.toLowerCase().includes(s)) return false;
            }
            // Date range filter (SPECIAL_LEAVE with PENDING status bypasses — manager should always see pending special leaves)
            const skipDateFilter = r.type === 'SPECIAL_LEAVE' && r.status === 'PENDING';
            if (!skipDateFilter && dateFrom) {
                const reqDateStr = (r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (reqDateStr && reqDateStr < dateFrom) return false;
            }
            if (!skipDateFilter && dateTo) {
                const reqDateStr = (r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (reqDateStr && reqDateStr > dateTo) return false;
            }
            // Person filter
            if (personFilter !== 'ALL') {
                const empId = String(r.employee_id || r.employee || '');
                if (empId !== personFilter) return false;
            }
            return true;
        });
    }, [currentItems, typeFilter, statusFilter, searchText, dateFrom, dateTo, personFilter]);

    // Filtered pending actionable items (for "Onay Bekleyen" section)
    const filteredPendingActionable = useMemo(() => {
        if (activeSubTab !== 'primary_team') {
            // For secondary team, use old logic
            return filtered.filter(r => r.status === 'PENDING' || r._isSubstitute);
        }
        return pendingActionable.filter(r => {
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (r.status === 'POTENTIAL') return false;
            if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED', 'CANCELLED': 'REJECTED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (searchText) {
                const s = searchText.toLowerCase();
                if (!r.employee_name?.toLowerCase().includes(s)) return false;
            }
            const skipDateFilter2 = r.type === 'SPECIAL_LEAVE' && r.status === 'PENDING';
            if (!skipDateFilter2 && dateFrom) {
                const reqDateStr = (r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (reqDateStr && reqDateStr < dateFrom) return false;
            }
            if (!skipDateFilter2 && dateTo) {
                const reqDateStr = (r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (reqDateStr && reqDateStr > dateTo) return false;
            }
            if (personFilter !== 'ALL') {
                const empId = String(r.employee_id || r.employee || '');
                if (empId !== personFilter) return false;
            }
            return true;
        });
    }, [activeSubTab, filtered, pendingActionable, typeFilter, statusFilter, searchText, dateFrom, dateTo, personFilter]);

    // All team filtered items (for "Ekip Talepleri" section — ALL statuses)
    const allTeamFiltered = useMemo(() => {
        if (activeSubTab !== 'primary_team') {
            // For secondary team, use old history logic
            return filtered.filter(r => r.status !== 'PENDING' && !r._isSubstitute);
        }
        return filtered;
    }, [activeSubTab, filtered]);

    // Reset pagination when filters change
    useEffect(() => { setPendingPage(1); setTeamPage(1); }, [typeFilter, statusFilter, searchText, dateFrom, dateTo, personFilter, activeSubTab]);

    // Paginated pending
    const pendingTotalPages = Math.max(1, Math.ceil(filteredPendingActionable.length / PAGE_SIZE));
    const paginatedPending = useMemo(() => {
        const start = (pendingPage - 1) * PAGE_SIZE;
        return filteredPendingActionable.slice(start, start + PAGE_SIZE);
    }, [filteredPendingActionable, pendingPage]);

    // Paginated team
    const teamTotalPages = Math.max(1, Math.ceil(allTeamFiltered.length / PAGE_SIZE));
    const paginatedTeam = useMemo(() => {
        const start = (teamPage - 1) * PAGE_SIZE;
        return allTeamFiltered.slice(start, start + PAGE_SIZE);
    }, [allTeamFiltered, teamPage]);

    // Type filter options
    const typeFilterOptions = filterType
        ? []
        : activeSubTab === 'secondary_team'
            ? [
                { key: 'ALL', label: 'Tümü' },
                { key: 'OVERTIME', label: 'Mesai' },
            ]
            : [
                { key: 'ALL', label: 'Tümü' },
                { key: 'LEAVE', label: 'İzin' },
                { key: 'OVERTIME', label: 'Mesai' },
                { key: 'MEAL', label: 'Yemek' },
                { key: 'CARDLESS_ENTRY', label: 'Kartsız' },
                { key: 'HEALTH_REPORT', label: 'Sağlık R.' },
                { key: 'HOSPITAL_VISIT', label: 'Hastane' },
                { key: 'SPECIAL_LEAVE', label: 'Özel İzin' },
            ];

    // Approve/reject handler wrapper
    const wrapApprove = (r, notes) => {
        if (r._isSubstitute) handleSubstituteApprove(r);
        else handleApprove(r, notes);
    };
    const wrapReject = (r, reason) => {
        if (r._isSubstitute) handleSubstituteReject(r, reason);
        else handleReject(r, reason);
    };

    if (loading) return <div className="animate-pulse h-96 bg-slate-50 rounded-3xl" />;

    const authorities = substituteData?.authorities || [];
    const hasSecondaryTeam = secondarySubIds.size > 0 || secondaryTeamItems.length > 0;

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
                                {auth.principal_name} ({new Date(auth.valid_from).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })} — {new Date(auth.valid_to).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Sub-tabs + Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                {/* Sub-tab pills */}
                <div className="flex flex-wrap gap-2">
                    {primaryCount > 0 && (
                        <button
                            onClick={() => { setActiveSubTab('primary_team'); setStatusFilter('ALL'); setTypeFilter(filterType === 'overtime' ? 'OVERTIME' : 'ALL'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                                activeSubTab === 'primary_team'
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <UserCheck size={14} />
                            Birincil Ekip
                            <Tooltip title="Sizin doğrudan yöneticiniz olduğunuz çalışanların talepleri">
                                <Info size={14} className="text-slate-400 cursor-help inline-block ml-1" />
                            </Tooltip>
                            {primaryPendingCount > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                    activeSubTab === 'primary_team' ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                                }`}>{primaryPendingCount}</span>
                            )}
                        </button>
                    )}
                    {(secondaryCount > 0 || hasSecondaryTeam) && (
                        <button
                            onClick={() => { setActiveSubTab('secondary_team'); setStatusFilter('ALL'); setTypeFilter('ALL'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                                activeSubTab === 'secondary_team'
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <UserCog size={14} />
                            İkincil Ekip
                            <Tooltip title="İkincil yönetici olarak atandığınız çalışanların talepleri. İkincil yöneticiler sadece ek mesai işlemleri yapabilir.">
                                <Info size={14} className="text-slate-400 cursor-help inline-block ml-1" />
                            </Tooltip>
                            {secondaryPendingCount > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                    activeSubTab === 'secondary_team' ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                                }`}>{secondaryPendingCount}</span>
                            )}
                        </button>
                    )}
                </div>

                {/* Filters row 1: Search + Person + Date Range */}
                <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Info size={12} className="text-slate-400" />
                    <span>Çalışan adı, talep türü veya tarih ile arayabilirsiniz.</span>
                </div>
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="İsim ile ara..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <select
                        value={personFilter}
                        onChange={(e) => setPersonFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-48"
                    >
                        <option value="ALL">Tüm Personel</option>
                        {uniqueEmployees.map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                    <FiscalMonthPicker
                        onDateChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
                    />
                </div>
                {/* Filters row 2: Type + Status */}
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Type filter */}
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
                    {/* Status filter */}
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

            {/* Request list */}
            {filteredPendingActionable.length === 0 && allTeamFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <Users size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">
                        {activeSubTab === 'primary_team' ? 'Birincil Ekipte Talep Yok' : 'İkincil Ekipte Talep Yok'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Seçili kriterlere uygun talep bulunmamaktadır.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* PENDING ACTIONABLE requests — flat table */}
                    {filteredPendingActionable.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/30">
                                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                    <Clock size={14} />
                                    Onay Bekleyen ({filteredPendingActionable.length})
                                    <Tooltip title="Onayınızı bekleyen talepler. Onaylama veya reddetme işlemi yapabilirsiniz.">
                                        <Info size={14} className="text-slate-400 cursor-help inline-block ml-1" />
                                    </Tooltip>
                                </h3>
                            </div>
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
                                            <th className="px-3 py-2 font-bold">Talep Edilen</th>
                                            <th className="px-3 py-2 font-bold text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedPending.map(req => (
                                            <ExpandableRequestRow
                                                key={`${req.type}-${req.id}`}
                                                req={req}
                                                isExpanded={expandedId === `${req.type}-${req.id}`}
                                                onToggle={() => {
                                                    const key = `${req.type}-${req.id}`;
                                                    setExpandedId(prev => prev === key ? null : key);
                                                }}
                                                onViewDetails={handleViewDetails}
                                                onViewDetail={handleViewDetail}
                                                onApprove={wrapApprove}
                                                onReject={wrapReject}
                                                showEmployeeColumn={true}
                                                mode="incoming"
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pending Pagination */}
                            {pendingTotalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                                    <span className="text-xs font-bold text-slate-500">
                                        {filteredPendingActionable.length} talep, sayfa {pendingPage}/{pendingTotalPages}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setPendingPage(1)} disabled={pendingPage === 1}
                                            className="px-2 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600">İlk</button>
                                        <button onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingPage === 1}
                                            className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"><ChevronLeft size={16} /></button>
                                        {Array.from({ length: Math.min(5, pendingTotalPages) }, (_, i) => {
                                            let page;
                                            if (pendingTotalPages <= 5) page = i + 1;
                                            else if (pendingPage <= 3) page = i + 1;
                                            else if (pendingPage >= pendingTotalPages - 2) page = pendingTotalPages - 4 + i;
                                            else page = pendingPage - 2 + i;
                                            return (
                                                <button key={page} onClick={() => setPendingPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${pendingPage === page ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                                                >{page}</button>
                                            );
                                        })}
                                        <button onClick={() => setPendingPage(p => Math.min(pendingTotalPages, p + 1))} disabled={pendingPage === pendingTotalPages}
                                            className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"><ChevronRight size={16} /></button>
                                        <button onClick={() => setPendingPage(pendingTotalPages)} disabled={pendingPage === pendingTotalPages}
                                            className="px-2 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600">Son</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ekip Talepleri — ALL team requests (replaces old "Gecmis Talepler") */}
                    {allTeamFiltered.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/30">
                                <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                    <Users size={14} />
                                    {activeSubTab === 'primary_team' ? 'Ekip Talepleri' : 'Geçmiş Talepler'} ({allTeamFiltered.length})
                                    <Tooltip title="Ekibinizdeki çalışanların tüm talep geçmişi. 'Değiştir' butonu ile önceki kararları değiştirebilirsiniz (override).">
                                        <Info size={14} className="text-slate-400 cursor-help inline-block ml-1" />
                                    </Tooltip>
                                </h3>
                            </div>
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
                                            <th className="px-3 py-2 font-bold">Talep Edilen</th>
                                            <th className="px-3 py-2 font-bold text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedTeam.map(req => (
                                            <ExpandableRequestRow
                                                key={`team-${req.type}-${req.id}`}
                                                req={req}
                                                isExpanded={expandedId === `team-${req.type}-${req.id}`}
                                                onToggle={() => {
                                                    const key = `team-${req.type}-${req.id}`;
                                                    setExpandedId(prev => prev === key ? null : key);
                                                }}
                                                onViewDetails={handleViewDetails}
                                                onViewDetail={handleViewDetail}
                                                onApprove={wrapApprove}
                                                onReject={wrapReject}
                                                showEmployeeColumn={true}
                                                mode="incoming"
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Team Pagination */}
                            {teamTotalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                                    <span className="text-xs font-bold text-slate-500">
                                        {allTeamFiltered.length} talep, sayfa {teamPage}/{teamTotalPages}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setTeamPage(1)} disabled={teamPage === 1}
                                            className="px-2 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600">İlk</button>
                                        <button onClick={() => setTeamPage(p => Math.max(1, p - 1))} disabled={teamPage === 1}
                                            className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"><ChevronLeft size={16} /></button>
                                        {Array.from({ length: Math.min(5, teamTotalPages) }, (_, i) => {
                                            let page;
                                            if (teamTotalPages <= 5) page = i + 1;
                                            else if (teamPage <= 3) page = i + 1;
                                            else if (teamPage >= teamTotalPages - 2) page = teamTotalPages - 4 + i;
                                            else page = teamPage - 2 + i;
                                            return (
                                                <button key={page} onClick={() => setTeamPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${teamPage === page ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                                                >{page}</button>
                                            );
                                        })}
                                        <button onClick={() => setTeamPage(p => Math.min(teamTotalPages, p + 1))} disabled={teamPage === teamTotalPages}
                                            className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"><ChevronRight size={16} /></button>
                                        <button onClick={() => setTeamPage(teamTotalPages)} disabled={teamPage === teamTotalPages}
                                            className="px-2 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600">Son</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={() => { fetchAllData(); onDataChange?.(); }}
            />
        </div>
    );
};

export default IncomingRequestsTab;
