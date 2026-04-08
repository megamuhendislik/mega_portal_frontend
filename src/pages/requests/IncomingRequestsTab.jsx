import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Search, Users, Shield, UserCheck, UserCog, Clock, FileText, Info,
    ChevronLeft, ChevronRight, History, Loader2
} from 'lucide-react';
import { Tooltip, Modal, Select, message } from 'antd';
import api from '../../services/api';
import FiscalMonthPicker from '../../components/FiscalMonthPicker';
import ExpandableRequestRow from '../../components/requests/ExpandableRequestRow';
import RequestDetailModal from '../../components/RequestDetailModal';
import { isMidnightBoundary } from '../../utils/midnightWarning';
import { format } from 'date-fns';
const IncomingRequestsTab = ({ onPendingCountChange, onDataChange, refreshTrigger, filterType, primaryCount = 0, secondaryCount = 0, parentSearchText = '', sharedPrimarySubordinates, sharedSecondarySubordinates }) => {
    // Data states
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);
    const [substituteData, setSubstituteData] = useState(null);
    const [subordinates, setSubordinates] = useState([]);
    const [secondarySubIds, setSecondarySubIds] = useState(new Set());
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
    const [allTeamData, setAllTeamData] = useState([]);
    const [loading, setLoading] = useState(true);

    // "Load older data" state
    const [daysBack, setDaysBack] = useState(90);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [lastFetchedAt, setLastFetchedAt] = useState(null);
    const [metaInfo, setMetaInfo] = useState(null);

    // Sub-tab: 'primary_team' | 'secondary_team'
    const [activeSubTab, setActiveSubTab] = useState('primary_team');

    // Auto-select visible tab when one side is hidden
    useEffect(() => {
        if (primaryCount === 0 && secondaryCount > 0) setActiveSubTab('secondary_team');
    }, [primaryCount, secondaryCount]);

    // Filters
    const [typeFilter, setTypeFilter] = useState(filterType === 'overtime' ? 'OVERTIME' : 'ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [hideCancelled, setHideCancelled] = useState(() => {
        try { return localStorage.getItem('incoming_hide_cancelled') !== 'false'; } catch { return true; }
    });
    const [searchText, setSearchText] = useState('');
    const [dateFrom, setDateFrom] = useState(null);
    const [dateTo, setDateTo] = useState(null);
    const [personFilter, setPersonFilter] = useState('ALL');

    // Effective search: parent global search OR local search
    const effectiveSearch = parentSearchText || searchText;

    // Pagination
    const PAGE_SIZE = effectiveSearch ? 9999 : 50;
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

    // Use shared subordinate data from parent if available
    const parentProvidesSubs = sharedPrimarySubordinates !== undefined;

    useEffect(() => {
        if (!parentProvidesSubs) return;
        setSubordinates(sharedPrimarySubordinates || []);
        setSecondarySubIds(new Set((sharedSecondarySubordinates || []).map(s => s.id)));
    }, [parentProvidesSubs, sharedPrimarySubordinates, sharedSecondarySubordinates]);

    // Distribute consolidated init response to state
    const applyInitData = useCallback((d) => {
        if (d.employee) setCurrentUserEmployeeId(d.employee.id);
        if (!parentProvidesSubs) {
            if (d.primary_subordinates) setSubordinates(d.primary_subordinates || []);
            if (d.secondary_subordinates) setSecondarySubIds(new Set((d.secondary_subordinates || []).map(s => s.id)));
        }
        if (d.team_requests) setIncomingRequests(d.team_requests || []);
        if (d.team_history) {
            const hData = d.team_history;
            setTeamHistoryRequests(hData?.results || hData || []);
        }
        if (d.substitute_requests !== undefined) setSubstituteData(d.substitute_requests);
        if (d.all_team_requests) {
            const atData = d.all_team_requests || [];
            console.log('[fetchAllData] all_team toplam:', atData.length,
                'EXTERNAL_DUTY:', atData.filter(r => r.type === 'EXTERNAL_DUTY').length,
                'APPROVED ED:', atData.filter(r => r.type === 'EXTERNAL_DUTY' && r.status === 'APPROVED').map(r => ({ id: r.request_id, status: r.status, can_override: r.can_override }))
            );
            setAllTeamData(atData);
        }
        if (d._meta) setMetaInfo(d._meta);
    }, [parentProvidesSubs]);

    // Legacy fallback: original 7 parallel calls
    const fetchAllDataLegacy = useCallback(async () => {
        const requests = [
            api.get('/employees/me/'),
            parentProvidesSubs ? Promise.resolve({ _skipped: true }) : api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY' } }),
            api.get('/team-requests/'),
            api.get('/leave/requests/team_history/'),
            api.get('/substitute-authority/pending_requests/'),
            parentProvidesSubs ? Promise.resolve({ _skipped: true }) : api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY' } }),
            api.get('/team-requests/all_team/'),
        ];
        const [meRes, subsRes, teamRes, histRes, subAuthRes, secSubRes, allTeamRes] = await Promise.allSettled(requests);

        if (meRes.status === 'fulfilled') setCurrentUserEmployeeId(meRes.value.data.id);
        if (!parentProvidesSubs) {
            if (subsRes.status === 'fulfilled' && !subsRes.value._skipped) {
                setSubordinates(subsRes.value.data || []);
                if (secSubRes.status === 'fulfilled' && !secSubRes.value._skipped) {
                    setSecondarySubIds(new Set((secSubRes.value.data || []).map(s => s.id)));
                }
            }
        }
        if (teamRes.status === 'fulfilled') setIncomingRequests(teamRes.value.data || []);
        if (histRes.status === 'fulfilled') {
            const hData = histRes.value.data;
            setTeamHistoryRequests(hData?.results || hData || []);
        }
        if (subAuthRes.status === 'fulfilled') setSubstituteData(subAuthRes.value.data);
        else setSubstituteData(null);
        if (allTeamRes.status === 'fulfilled') {
            const atData = allTeamRes.value.data || [];
            console.log('[fetchAllData] all_team toplam:', atData.length,
                'EXTERNAL_DUTY:', atData.filter(r => r.type === 'EXTERNAL_DUTY').length,
                'APPROVED ED:', atData.filter(r => r.type === 'EXTERNAL_DUTY' && r.status === 'APPROVED').map(r => ({ id: r.request_id, status: r.status, can_override: r.can_override }))
            );
            setAllTeamData(atData);
        }
    }, [parentProvidesSubs]);

    // --- Data Fetching --- consolidated endpoint with legacy fallback
    const fetchAllData = useCallback(async (overrideDaysBack, { forceRefresh = false } = {}) => {
        const effectiveDays = overrideDaysBack !== undefined ? overrideDaysBack : daysBack;
        const isOlderLoad = effectiveDays !== 90;

        if (isOlderLoad) {
            setLoadingOlder(true);
        } else {
            setLoading(true);
        }
        try {
            const params = {};
            if (effectiveDays !== 90) params.days_back = effectiveDays;
            if (forceRefresh) params.force_refresh = '1';
            const res = await api.get('/requests-init/incoming-requests-init/', { params });
            applyInitData(res.data);
        } catch (e) {
            console.warn('IncomingRequestsTab: consolidated init failed, falling back to legacy calls', e);
            try {
                await fetchAllDataLegacy();
            } catch (e2) {
                console.error('IncomingRequestsTab fetchAllData legacy error:', e2);
            }
        } finally {
            setLoading(false);
            setLoadingOlder(false);
            setLastFetchedAt(new Date());
        }
    }, [daysBack, applyInitData, fetchAllDataLegacy]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    // Cross-tab refresh trigger (force_refresh to bypass backend cache)
    useEffect(() => {
        if (refreshTrigger > 0) fetchAllData(undefined, { forceRefresh: true });
    }, [refreshTrigger, fetchAllData]);

    // --- Approval / Rejection Handlers ---
    const handleApprove = async (req, notes) => {
        const effectiveType = req._type || req.type;
        console.log('[handleApprove] req.id:', req.id, 'req.type:', req.type, '_type:', req._type, 'effectiveType:', effectiveType);
        try {
            if (req.type === 'LEAVE' || req.type === 'EXTERNAL_DUTY') {
                console.log('[handleApprove] → POST /leave/requests/' + req.id + '/approve_reject/');
                await api.post(`/leave/requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onaylandı' });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'approve', notes: notes || 'Onaylandı' });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/approve/`, {});
            } else {
                console.warn('[handleApprove] Bilinmeyen talep tipi:', req.type, req);
                message.warning('Bilinmeyen talep tipi: ' + req.type);
                return;
            }
            console.log('[handleApprove] Başarılı, optimistic update...');
            // Optimistic: hemen local state güncelle (full refetch yok — cache sorununu önler)
            setIncomingRequests(prev => prev.filter(r => !(r.id === req.id && (r._type || r.type) === (req._type || req.type))));
            setAllTeamData(prev => prev.map(r => (r.id === req.id && (r._type || r.type) === (req._type || req.type)) ? { ...r, status: 'APPROVED', is_actionable: false } : r));
            message.success('Talep onaylandı');
            onDataChange?.();
        } catch (e) {
            console.error('[handleApprove] Hata:', e.response?.status, e.response?.data, e);
            const errorMsg = e.response?.data?.error || e.response?.data?.detail || 'İşlem başarısız. Lütfen tekrar deneyin.';
            message.error(errorMsg);
            // Hata durumunda force refresh ile güncel veri al
            try { await fetchAllData(undefined, { forceRefresh: true }); } catch {}
        }
    };

    const handleReject = async (req, reason) => {
        if (!reason) return;
        console.log('[handleReject] req.id:', req.id, 'req.type:', req.type);
        try {
            if (req.type === 'LEAVE' || req.type === 'EXTERNAL_DUTY') {
                await api.post(`/leave/requests/${req.id}/approve_reject/`, { action: 'reject', reason });
            } else if (req.type === 'OVERTIME') {
                await api.post(`/overtime-requests/${req.id}/approve_reject/`, { action: 'reject', reason });
            } else if (req.type === 'CARDLESS_ENTRY') {
                await api.post(`/cardless-entry-requests/${req.id}/reject/`, { reason });
            } else {
                console.warn('[handleReject] Bilinmeyen talep tipi:', req.type);
                return;
            }
            // Optimistic: hemen local state güncelle (full refetch yok — cache sorununu önler)
            setIncomingRequests(prev => prev.filter(r => !(r.id === req.id && (r._type || r.type) === (req._type || req.type))));
            setAllTeamData(prev => prev.map(r => (r.id === req.id && (r._type || r.type) === (req._type || req.type)) ? { ...r, status: 'REJECTED', is_actionable: false } : r));
            message.success('Talep reddedildi');
            onDataChange?.();
        } catch (e) {
            console.error('[handleReject] Hata:', e.response?.status, e.response?.data, e);
            const errorMsg = e.response?.data?.error || e.response?.data?.detail || 'İşlem başarısız. Lütfen tekrar deneyin.';
            message.error(errorMsg);
            try { await fetchAllData(undefined, { forceRefresh: true }); } catch {}
        }
    };

    const handleSubstituteApprove = async (req) => {
        try {
            if (req.type === 'LEAVE' || req.type === 'EXTERNAL_DUTY') {
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
            // Optimistic update for substitute
            setSubstituteData(prev => {
                if (!prev) return prev;
                // Remove from pending lists
                const updated = { ...prev };
                for (const key of Object.keys(updated)) {
                    if (Array.isArray(updated[key])) {
                        updated[key] = updated[key].filter(r => !(r.id === req.id && r.type === req.type));
                    }
                }
                return updated;
            });
            setAllTeamData(prev => prev.map(r => (r.id === req.id && r.type === req.type) ? { ...r, status: 'APPROVED', is_actionable: false } : r));
            message.success('Talep vekil olarak onaylandı');
            onDataChange?.();
        } catch (e) {
            message.error(e.response?.data?.error || 'İşlem başarısız');
            try { await fetchAllData(undefined, { forceRefresh: true }); } catch {}
        }
    };

    const handleSubstituteReject = async (req, reason) => {
        if (!reason) return;
        try {
            if (req.type === 'LEAVE' || req.type === 'EXTERNAL_DUTY') {
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
            // Optimistic update for substitute reject
            setSubstituteData(prev => {
                if (!prev) return prev;
                const updated = { ...prev };
                for (const key of Object.keys(updated)) {
                    if (Array.isArray(updated[key])) {
                        updated[key] = updated[key].filter(r => !(r.id === req.id && r.type === req.type));
                    }
                }
                return updated;
            });
            setAllTeamData(prev => prev.map(r => (r.id === req.id && r.type === req.type) ? { ...r, status: 'REJECTED', is_actionable: false } : r));
            message.success('Talep vekil olarak reddedildi');
            onDataChange?.();
        } catch (e) {
            message.error(e.response?.data?.error || 'İşlem başarısız');
            try { await fetchAllData(undefined, { forceRefresh: true }); } catch {}
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
        setSelectedRequestType(req._type || req.type);
        setShowDetailModal(true);
    };

    // --- Normalize helper ---
    const normalizeRequest = (r, source, isSubstitute = false, principalName = '') => ({
        ...r,
        id: r.request_id || r.id,
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
        _type: r.request_type_detail?.category === 'EXTERNAL_DUTY' ? 'EXTERNAL_DUTY' : (r.type === 'CARDLESS' ? 'CARDLESS_ENTRY' : (r.type || 'UNKNOWN')),
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
            // Hide cancelled when checkbox is checked
            if (hideCancelled && ['CANCELLED', 'CANCELED'].includes(r.status)) return false;
            if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (effectiveSearch) {
                const s = effectiveSearch.toLowerCase();
                const fields = [
                    r.employee_name, r.employee_department, r.leave_type_name,
                    r.reason, r.target_approver_name, r.approved_by_name,
                    String(r.request_id || r.id || ''),
                ];
                if (!fields.some(f => f && String(f).toLowerCase().includes(s))) return false;
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
    }, [currentItems, typeFilter, statusFilter, hideCancelled, effectiveSearch, dateFrom, dateTo, personFilter]);

    // Filtered pending actionable items (for "Onay Bekleyen" section)
    const filteredPendingActionable = useMemo(() => {
        if (activeSubTab !== 'primary_team') {
            // For secondary team, use old logic
            return filtered.filter(r => r.status === 'PENDING' || r._isSubstitute);
        }
        return pendingActionable.filter(r => {
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (r.status === 'POTENTIAL') return false;
            if (hideCancelled && ['CANCELLED', 'CANCELED'].includes(r.status)) return false;
            if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (effectiveSearch) {
                const s = effectiveSearch.toLowerCase();
                const fields = [
                    r.employee_name, r.employee_department, r.leave_type_name,
                    r.reason, r.target_approver_name, r.approved_by_name,
                    String(r.request_id || r.id || ''),
                ];
                if (!fields.some(f => f && String(f).toLowerCase().includes(s))) return false;
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
    }, [activeSubTab, filtered, pendingActionable, typeFilter, statusFilter, hideCancelled, effectiveSearch, dateFrom, dateTo, personFilter]);

    // All team filtered items (for "Ekip Talepleri" section — ALL statuses)
    const allTeamFiltered = useMemo(() => {
        if (activeSubTab !== 'primary_team') {
            // For secondary team, use old history logic
            return filtered.filter(r => r.status !== 'PENDING' && !r._isSubstitute);
        }
        return filtered;
    }, [activeSubTab, filtered]);

    // Reset pagination when filters change
    useEffect(() => { setPendingPage(1); setTeamPage(1); }, [typeFilter, statusFilter, hideCancelled, effectiveSearch, dateFrom, dateTo, personFilter, activeSubTab]);

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
                { key: 'EXTERNAL_DUTY', label: 'Dış Görev' },
                { key: 'OVERTIME', label: 'Mesai' },
                { key: 'MEAL', label: 'Yemek' },
                { key: 'CARDLESS_ENTRY', label: 'Kartsız' },
                { key: 'HEALTH_REPORT', label: 'Sağlık R.' },
                { key: 'HOSPITAL_VISIT', label: 'Hastane' },
                { key: 'SPECIAL_LEAVE', label: 'Özel İzin' },
            ];

    // Approve/reject handler wrapper
    const wrapApprove = async (r, notes) => {
        // 23:59 OT uyarı kontrolü
        if ((r.type === 'OVERTIME' || r._type === 'OVERTIME') && isMidnightBoundary(r.end_time)) {
            return new Promise((resolve, reject) => {
                Modal.confirm({
                    title: '⚠ Kartsız Çıkış İhtimali',
                    content: 'Bu talep 23:59\'da sonlanan bir kayda dayanmaktadır. Çalışanın çıkış kartı basmamış olma ihtimali bulunmaktadır. Gerçek çalışma saatlerini doğruladığınızdan emin olunuz.',
                    okText: 'Onayla',
                    cancelText: 'İptal',
                    okButtonProps: { danger: false },
                    onOk: async () => {
                        try {
                            if (r._isSubstitute) await handleSubstituteApprove(r);
                            else await handleApprove(r, notes);
                            resolve();
                        } catch (e) { reject(e); }
                    },
                    onCancel: () => reject(new Error('cancelled')),
                });
            });
        }
        if (r._isSubstitute) return handleSubstituteApprove(r);
        else return handleApprove(r, notes);
    };
    const wrapReject = async (r, reason) => {
        if (r._isSubstitute) return handleSubstituteReject(r, reason);
        else return handleReject(r, reason);
    };

    // --- Load older data handler ---
    const handleDaysBackChange = (newDaysBack) => {
        setDaysBack(newDaysBack);
        fetchAllData(newDaysBack);
    };


    if (loading) return <div className="animate-pulse h-96 bg-slate-50 rounded-3xl" />;

    const authorities = substituteData?.authorities || [];
    const hasSecondaryTeam = secondarySubIds.size > 0 || secondaryTeamItems.length > 0;

    return (
        <div className="space-y-6">
            {/* Data freshness indicator */}
            {lastFetchedAt && !loading && (
                <div className="flex items-center justify-end gap-3 px-1">
                    <span className="text-[11px] text-slate-400">
                        Veriler güncellendi: {format(lastFetchedAt, 'HH:mm:ss')}
                    </span>
                    <button
                        onClick={() => fetchAllData(undefined, { forceRefresh: true })}
                        className="text-[11px] text-blue-400 hover:text-blue-600 transition-colors"
                    >
                        ↻ Yenile
                    </button>
                </div>
            )}

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
                        defaultAll
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
                        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                    statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {s === 'ALL' ? 'Hepsi' : s === 'PENDING' ? 'Bekleyen' : s === 'APPROVED' ? 'Onaylı' : s === 'REJECTED' ? 'Red' : 'İptal'}
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors select-none">
                        <input type="checkbox" checked={hideCancelled} onChange={(e) => { setHideCancelled(e.target.checked); try { localStorage.setItem('incoming_hide_cancelled', e.target.checked); } catch { /* ignore */ } }} className="w-3.5 h-3.5 text-blue-600 rounded" />
                        İptal Edilenleri Gizle
                    </label>
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

            {/* Truncation warning */}
            {metaInfo?.is_truncated && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-amber-700">
                    <Info size={14} className="text-amber-500 flex-shrink-0" />
                    <span>
                        Toplam <strong>{metaInfo.all_team_total}</strong> talep bulundu, en son <strong>{metaInfo.result_cap}</strong> tanesi gösteriliyor.
                        Daha fazla görmek için zaman aralığını değiştirin veya filtre kullanın.
                    </span>
                </div>
            )}

            {/* Load older data bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <History size={14} className="text-slate-400" />
                    <span className="font-medium">
                        {daysBack === 90 ? 'Son 90 gün gösteriliyor.' : daysBack === 180 ? 'Son 6 ay gösteriliyor.' : daysBack === 365 ? 'Son 1 yıl gösteriliyor.' : 'Tüm veriler gösteriliyor.'}
                    </span>
                    {loadingOlder && <Loader2 size={14} className="animate-spin text-blue-500" />}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Zaman aralığı:</span>
                    <Select
                        size="small"
                        value={daysBack}
                        onChange={handleDaysBackChange}
                        loading={loadingOlder}
                        disabled={loadingOlder}
                        style={{ width: 140 }}
                        options={[
                            { value: 90, label: 'Son 90 gün' },
                            { value: 180, label: 'Son 6 ay' },
                            { value: 365, label: 'Son 1 yıl' },
                            { value: 0, label: 'Tümü (yavaş)' },
                        ]}
                    />
                </div>
            </div>

            {/* Detail Modal */}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={() => { fetchAllData(undefined, { forceRefresh: true }); onDataChange?.(); }}
                mode="incoming"
                onApprove={wrapApprove}
                onReject={wrapReject}
            />
        </div>
    );
};

export default IncomingRequestsTab;
