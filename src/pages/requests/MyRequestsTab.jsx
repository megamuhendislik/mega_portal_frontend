import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Search, Calendar, Clock, Utensils, CreditCard, Plus, Briefcase,
    CheckCircle2, XCircle, AlertCircle, Zap, HeartPulse, Stethoscope, Cake, Info, FileText,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { Tooltip, Modal, message } from 'antd';
import api from '../../services/api';
import ModalOverlay from '../../components/ui/ModalOverlay';
import ExpandableRequestRow from '../../components/requests/ExpandableRequestRow';
import CreateRequestModal from '../../components/CreateRequestModal';
import OvertimeClaimModal from '../../components/overtime/OvertimeClaimModal';
import FiscalMonthPicker from '../../components/FiscalMonthPicker';
import RequestDetailModal from '../../components/RequestDetailModal';
import { isMidnightBoundary } from '../../utils/midnightWarning';

const filterChipColors = {
    blue:    { bg50: 'bg-blue-50',    text700: 'text-blue-700',    ring200: 'ring-blue-200',    text600: 'text-blue-600' },
    amber:   { bg50: 'bg-amber-50',   text700: 'text-amber-700',   ring200: 'ring-amber-200',   text600: 'text-amber-600' },
    emerald: { bg50: 'bg-emerald-50', text700: 'text-emerald-700', ring200: 'ring-emerald-200', text600: 'text-emerald-600' },
    purple:  { bg50: 'bg-purple-50',  text700: 'text-purple-700',  ring200: 'ring-purple-200',  text600: 'text-purple-600' },
    red:     { bg50: 'bg-red-50',     text700: 'text-red-700',     ring200: 'ring-red-200',     text600: 'text-red-600' },
    slate:   { bg50: 'bg-slate-50',   text700: 'text-slate-700',   ring200: 'ring-slate-200',   text600: 'text-slate-600' },
    indigo:  { bg50: 'bg-indigo-50',  text700: 'text-indigo-700',  ring200: 'ring-indigo-200',  text600: 'text-indigo-600' },
};

const FilterChip = ({ active, onClick, label, icon, count, color = 'blue' }) => {
    const c = filterChipColors[color] || filterChipColors.blue;
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all duration-200 outline-none ${
                active
                    ? `${c.bg50} ${c.text700} ring-1 ${c.ring200} shadow-sm`
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            {icon && <span className={active ? c.text600 : 'text-slate-400'}>{icon}</span>}
            {label}
            {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/60' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                </span>
            )}
        </button>
    );
};

const StatCard = ({ label, value, icon, color, tooltip }) => (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {label}
                    {tooltip && (
                        <Tooltip title={tooltip}>
                            <Info size={14} className="text-slate-400 cursor-help inline-block ml-1" />
                        </Tooltip>
                    )}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
                <div className={color.replace('bg-', 'text-').replace('/10', '')}>{icon}</div>
            </div>
        </div>
    </div>
);

const MyRequestsTab = ({ onDataChange, refreshTrigger, searchText = '' }) => {
    // Data states
    const [requests, setRequests] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [cardlessEntryRequests, setCardlessEntryRequests] = useState([]);
    const [healthReports, setHealthReports] = useState([]);
    const [specialLeaves, setSpecialLeaves] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [birthdayBalance, setBirthdayBalance] = useState(null);
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
    const [currentUserInfo, setCurrentUserInfo] = useState({ name: '', department: '' });
    const [loading, setLoading] = useState(true);

    // UI states
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showPotential, setShowPotential] = useState(true);
    const [hideCancelled, setHideCancelled] = useState(() => {
        try { return localStorage.getItem('myreqs_hide_cancelled') !== 'false'; } catch { return true; /* ignore */ }
    });
    const [claimingId, setClaimingId] = useState(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createModalInitialData, setCreateModalInitialData] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);
    const [editOvertimeForm, setEditOvertimeForm] = useState({ id: null, start_time: '', end_time: '', reason: '' });
    const [expandedRowId] = useState(null);
    const [claimManagers, setClaimManagers] = useState([]);
    const [claimModal, setClaimModal] = useState({ open: false, target: null });
    const [overtimeModalOpen, setOvertimeModalOpen] = useState(false);

    // Date range filter (null = tüm dönemler, default)
    const [dateFrom, setDateFrom] = useState(null);
    const [dateTo, setDateTo] = useState(null);

    // Pagination
    const PAGE_SIZE = 50;
    const [currentPage, setCurrentPage] = useState(1);

    // Distribute consolidated init response to state
    const applyInitData = useCallback((d) => {
        if (d.employee) {
            const me = d.employee;
            setCurrentUserEmployeeId(me.id);
            setCurrentUserInfo({
                name: me.full_name || `${me.first_name || ''} ${me.last_name || ''}`.trim(),
                department: me.department_name || me.department?.name || '',
            });
        }
        if (d.leave_requests) setRequests(d.leave_requests.results || d.leave_requests);
        if (d.leave_types) setRequestTypes(d.leave_types.results || d.leave_types);
        if (d.overtime_requests) setOvertimeRequests(d.overtime_requests.results || d.overtime_requests);
        if (d.meal_requests) setMealRequests(d.meal_requests.results || d.meal_requests);
        if (d.cardless_entries) setCardlessEntryRequests(d.cardless_entries.results || d.cardless_entries);
        if (d.health_reports) setHealthReports(d.health_reports.results || d.health_reports);
        if (d.birthday_balance !== undefined) setBirthdayBalance(d.birthday_balance);
        if (d.special_leaves) setSpecialLeaves(d.special_leaves.results || d.special_leaves);
        if (d.available_approvers) setClaimManagers(d.available_approvers);
    }, []);

    // Legacy fallback: original 10 parallel calls
    const fetchDataLegacy = useCallback(async () => {
        const results = await Promise.allSettled([
            api.get('/employees/me/'),
            api.get('/leave/requests/'),
            api.get('/leave/types/'),
            api.get('/overtime-requests/'),
            api.get('/meal-requests/'),
            api.get('/cardless-entry-requests/'),
            api.get('/health-reports/'),
            api.get('/leave-requests/birthday-balance/'),
            api.get('/special-leaves/'),
            api.get('/available-approvers/?type=OVERTIME'),
        ]);

        const [meRes, leaveRes, typesRes, otRes, mealRes, cardlessRes, healthRes, birthdayRes, specialLeavesRes, approversRes] = results;

        if (meRes.status === 'fulfilled') {
            const me = meRes.value.data;
            setCurrentUserEmployeeId(me.id);
            setCurrentUserInfo({
                name: me.full_name || `${me.first_name || ''} ${me.last_name || ''}`.trim(),
                department: me.department_name || me.department?.name || '',
            });
        }
        if (leaveRes.status === 'fulfilled') setRequests(leaveRes.value.data.results || leaveRes.value.data);
        if (typesRes.status === 'fulfilled') setRequestTypes(typesRes.value.data.results || typesRes.value.data);
        if (otRes.status === 'fulfilled') setOvertimeRequests(otRes.value.data.results || otRes.value.data);
        if (mealRes.status === 'fulfilled') setMealRequests(mealRes.value.data.results || mealRes.value.data);
        if (cardlessRes.status === 'fulfilled') setCardlessEntryRequests(cardlessRes.value.data.results || cardlessRes.value.data);
        if (healthRes.status === 'fulfilled') setHealthReports(healthRes.value.data.results || healthRes.value.data);
        if (birthdayRes.status === 'fulfilled') setBirthdayBalance(birthdayRes.value.data);
        if (specialLeavesRes.status === 'fulfilled') setSpecialLeaves(specialLeavesRes.value.data.results || specialLeavesRes.value.data);
        if (approversRes.status === 'fulfilled') setClaimManagers(approversRes.value.data || []);
    }, []);

    // Fetch all data — consolidated endpoint with legacy fallback
    const fetchData = useCallback(async () => {
        try {
            const res = await api.get('/requests-init/my-requests-init/');
            applyInitData(res.data);
        } catch (e) {
            console.warn('MyRequestsTab: consolidated init failed, falling back to legacy calls', e);
            try {
                await fetchDataLegacy();
            } catch (e2) {
                console.error('MyRequestsTab fetchData legacy error:', e2);
            }
        } finally {
            setLoading(false);
        }
    }, [applyInitData, fetchDataLegacy]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Refresh when refreshTrigger changes
    useEffect(() => {
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            fetchData();
        }
    }, [refreshTrigger, fetchData]);

    // Notify parent when data changes
    const notifyParent = useCallback(() => {
        if (onDataChange) onDataChange();
    }, [onDataChange]);

    // --- Handlers ---

    const REQUEST_CANCEL_MAP = {
        LEAVE: '/leave/requests',
        OVERTIME: '/overtime-requests',
        CARDLESS_ENTRY: '/cardless-entry-requests',
        MEAL: '/meal-requests',
        HEALTH_REPORT: '/health-reports',
        HOSPITAL_VISIT: '/health-reports',
        SPECIAL_LEAVE: '/special-leaves',
    };

    const handleDeleteRequest = useCallback((req) => {
        const reqType = req._type || req.type;
        const endpoint = REQUEST_CANCEL_MAP[reqType];
        if (!endpoint) return;

        Modal.confirm({
            title: 'Talebi İptal Et',
            content: 'Bu talebi iptal etmek istediğinize emin misiniz?',
            okText: 'Evet, İptal Et',
            cancelText: 'Vazgeç',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await api.post(`${endpoint}/${req.id}/cancel/`);
                    message.success('Talep iptal edildi.');
                    await fetchData();
                    notifyParent();
                } catch (err) {
                    message.error(err.response?.data?.error || err.response?.data?.detail || 'İptal işlemi başarısız.');
                }
            },
        });
    }, [fetchData, notifyParent]);

    const handleEditOvertimeClick = useCallback((r) => {
        setEditOvertimeForm({
            id: r.id,
            start_time: r.start_time ? r.start_time.substring(0, 5) : '',
            end_time: r.end_time ? r.end_time.substring(0, 5) : '',
            reason: r.reason || '',
        });
        setShowEditOvertimeModal(true);
    }, []);

    const handleEditOvertimeSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/overtime-requests/${editOvertimeForm.id}/`, {
                start_time: editOvertimeForm.start_time,
                end_time: editOvertimeForm.end_time,
                reason: editOvertimeForm.reason,
            });
            setShowEditOvertimeModal(false);
            await fetchData();
            notifyParent();
        } catch (e) {
            alert(e.response?.data?.error || e.response?.data?.detail || 'Düzenleme başarısız oldu.');
        }
    }, [editOvertimeForm, fetchData, notifyParent]);

    const handleResubmitOvertime = useCallback((r) => {
        setCreateModalInitialData({ type: 'OVERTIME', data: r });
        setShowCreateModal(true);
    }, []);

    const handleViewDetails = useCallback((r, t) => {
        setSelectedRequest(r);
        setSelectedRequestType(t);
        setShowDetailModal(true);
    }, []);

    const handleClaimPotential = useCallback((req) => {
        // Aynı gündeki tüm POTENTIAL segmentlerini bul
        const sameDayPotentials = (overtimeRequests || []).filter(
            r => r.status === 'POTENTIAL' && r.date === req.date
        );
        // Hepsi varsayılan seçili
        const selectedIds = sameDayPotentials.map(r => r.id);
        setClaimModal({ open: true, target: req, segments: sameDayPotentials, selectedIds });
    }, [overtimeRequests]);

    const handleClaimSubmit = useCallback(async (reason, selectedManagerId) => {
        const { target, segments = [], selectedIds = [] } = claimModal;
        if (!target || selectedIds.length === 0) return;
        setClaimModal({ open: false, target: null, segments: [], selectedIds: [] });
        setClaimingId(target.id);
        try {
            const payload = {
                reason: reason || 'Talep edildi',
            };
            // Seçili segment'leri claim et
            if (selectedIds.length > 1) {
                payload.overtime_request_ids = selectedIds;
            } else {
                payload.overtime_request_id = selectedIds[0];
            }
            // Çıkarılan segment'ler — exclude_from_merge flag'i için
            const allIds = segments.map(s => s.id);
            const excludedIds = allIds.filter(id => !selectedIds.includes(id));
            if (excludedIds.length > 0) {
                payload.excluded_ids = excludedIds;
            }
            if (selectedManagerId) {
                payload.target_approver_id = selectedManagerId;
            } else if (claimManagers.length === 1) {
                payload.target_approver_id = claimManagers[0].id;
            }
            await api.post('/overtime-requests/claim-potential/', payload);
            await fetchData();
            notifyParent();
        } catch (e) {
            alert(e.response?.data?.error || e.response?.data?.detail || 'Talep işlemi başarısız oldu.');
        } finally {
            setClaimingId(null);
        }
    }, [claimModal, claimManagers, fetchData, notifyParent]);

    const handleCreateSuccess = useCallback(() => {
        fetchData();
        notifyParent();
    }, [fetchData, notifyParent]);

    // --- Combined & filtered data ---

    const allMyRequests = useMemo(() => {
        // Helper: check if a request belongs to the current user
        const isMyRequest = (r) => {
            if (!currentUserEmployeeId) return true; // fallback if ID not loaded yet
            const empId = typeof r.employee === 'object' ? r.employee?.id : r.employee;
            return empId === currentUserEmployeeId;
        };

        const items = [];
        const myInfo = { employee_name: currentUserInfo?.name || '', employee_department: currentUserInfo?.department || '' };
        requests.filter(isMyRequest).forEach(r => {
            const category = r.request_type_detail?.category || requestTypes.find(t => t.id === r.request_type)?.category || '';
            const isExternalDuty = category === 'EXTERNAL_DUTY';
            items.push({
                ...r, ...myInfo,
                _type: isExternalDuty ? 'EXTERNAL_DUTY' : 'LEAVE',
                type: isExternalDuty ? 'LEAVE' : 'LEAVE',  // Keep type as LEAVE for component compatibility
                _sortDate: r.start_date || r.created_at,
                leave_type_name: r.leave_type_name || requestTypes.find(t => t.id === r.request_type)?.name || r.request_type_detail?.name || '',
                leave_type_code: r.leave_type_code || requestTypes.find(t => t.id === r.request_type)?.code || r.request_type_detail?.code || '',
                target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
                approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
            });
        });
        // OT talepler — POTENTIAL olanları gün bazlı grupla, diğerlerini olduğu gibi ekle
        const otByDay = {};
        overtimeRequests.filter(isMyRequest).forEach(r => {
            if (r.status === 'POTENTIAL') {
                const d = r.date;
                if (!otByDay[d]) otByDay[d] = [];
                otByDay[d].push(r);
            } else {
                items.push({
                    ...r, ...myInfo, _type: 'OVERTIME', type: 'OVERTIME',
                    _sortDate: r.date || r.created_at,
                    onResubmit: () => handleResubmitOvertime(r),
                    target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
                    approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
                });
            }
        });
        // Gruplanmış POTENTIAL'leri ekle — gün başına tek satır
        Object.entries(otByDay).forEach(([d, pots]) => {
            const totalDur = pots.reduce((s, p) => s + (p.duration_seconds || 0), 0);
            const allTimes = pots.map(p => `${p.start_time?.slice(0,5) || '?'}-${p.end_time?.slice(0,5) || '?'}`).join(', ');
            const first = pots[0];
            // Birleşik POTENTIAL satırı
            items.push({
                ...first, ...myInfo,
                _type: 'OVERTIME', type: 'OVERTIME',
                _sortDate: d || first.created_at,
                duration_seconds: totalDur,
                _mergedSegments: pots,
                _mergedTimeRange: allTimes,
                _mergedCount: pots.length,
                target_approver_name: first.target_approver_detail?.full_name || first.target_approver_name || null,
                approved_by_name: first.approved_by_detail?.full_name || first.approved_by_name || null,
            });
        });
        mealRequests.filter(isMyRequest).forEach(r => items.push({ ...r, ...myInfo, _type: 'MEAL', type: 'MEAL', _sortDate: r.date || r.created_at }));
        cardlessEntryRequests.filter(isMyRequest).forEach(r => items.push({
            ...r, ...myInfo, _type: 'CARDLESS_ENTRY', type: 'CARDLESS_ENTRY',
            _sortDate: r.date || r.created_at,
            target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
            approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
        }));
        healthReports.filter(isMyRequest).forEach(r => items.push({
            ...r, ...myInfo,
            _type: r.report_type === 'HOSPITAL_VISIT' ? 'HOSPITAL_VISIT' : 'HEALTH_REPORT',
            type: r.report_type === 'HOSPITAL_VISIT' ? 'HOSPITAL_VISIT' : 'HEALTH_REPORT',
            _sortDate: r.start_date || r.created_at,
            target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
            approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
        }));
        specialLeaves.filter(isMyRequest).forEach(r => items.push({
            ...r, ...myInfo,
            _type: 'SPECIAL_LEAVE',
            type: 'SPECIAL_LEAVE',
            _sortDate: r.created_at || r.start_date,
            _displayDate: r.start_date,
            type_label: `Özel İzin - ${r.leave_type_display || r.leave_type}`,
            leave_type_name: `Özel İzin - ${r.leave_type_display || r.leave_type}`,
            start_date: r.start_date,
            end_date: r.end_date,
            status: r.status,
            reason: r.description || r.reason || '',
            total_days: r.total_days,
        }));
        items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
        return items;
    }, [requests, overtimeRequests, mealRequests, cardlessEntryRequests, healthReports, specialLeaves, requestTypes, currentUserInfo, currentUserEmployeeId, handleResubmitOvertime]);

    const filtered = useMemo(() => {
        return allMyRequests.filter(r => {
            // Global search filter
            if (searchText) {
                const s = searchText.toLowerCase();
                const fields = [
                    r.leave_type_name, r.type_label, r.reason,
                    r.target_approver_name, r.approved_by_name,
                    r.description, r.task_description,
                    String(r.id || ''),
                ];
                if (!fields.some(f => f && String(f).toLowerCase().includes(s))) return false;
            }
            // Date range filter
            if (dateFrom) {
                const reqDateStr = (r._sortDate || r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (reqDateStr && reqDateStr < dateFrom) return false;
            }
            if (dateTo) {
                const reqDateStr = (r._sortDate || r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (reqDateStr && reqDateStr > dateTo) return false;
            }
            if (typeFilter !== 'ALL' && r._type !== typeFilter) return false;
            if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED', 'CANCELED': 'CANCELLED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (!showPotential && r.status === 'POTENTIAL') return false;
            if (hideCancelled && ['CANCELLED', 'CANCELED'].includes(r.status)) return false;
            return true;
        });
    }, [allMyRequests, typeFilter, statusFilter, showPotential, hideCancelled, dateFrom, dateTo, searchText]);

    const counts = useMemo(() => {
        const dateFiltered = allMyRequests.filter(r => {
            if (dateFrom) {
                const ds = (r._sortDate || r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (ds && ds < dateFrom) return false;
            }
            if (dateTo) {
                const ds = (r._sortDate || r.start_date || r.date || r.created_at || '').substring(0, 10);
                if (ds && ds > dateTo) return false;
            }
            return true;
        });
        const actual = dateFiltered.filter(r => r.status !== 'POTENTIAL');
        return {
            all: actual.length,
            leave: actual.filter(r => r._type === 'LEAVE').length,
            external_duty: actual.filter(r => r._type === 'EXTERNAL_DUTY').length,
            overtime: actual.filter(r => r._type === 'OVERTIME').length,
            meal: actual.filter(r => r._type === 'MEAL').length,
            cardless: actual.filter(r => r._type === 'CARDLESS_ENTRY').length,
            health_report: actual.filter(r => r._type === 'HEALTH_REPORT').length,
            hospital_visit: actual.filter(r => r._type === 'HOSPITAL_VISIT').length,
            special_leave: actual.filter(r => r._type === 'SPECIAL_LEAVE').length,
            pending: actual.filter(r => r.status === 'PENDING').length,
            approved: actual.filter(r => ['APPROVED', 'ORDERED'].includes(r.status)).length,
            rejected: actual.filter(r => r.status === 'REJECTED').length,
            cancelled: actual.filter(r => ['CANCELLED', 'CANCELED'].includes(r.status)).length,
        };
    }, [allMyRequests, dateFrom, dateTo]);

    // Custom onEdit that routes OVERTIME to edit modal, others to detail modal
    const handleEdit = useCallback((req) => {
        if (req._type === 'OVERTIME' || req.type === 'OVERTIME') {
            handleEditOvertimeClick(req);
        } else {
            handleViewDetails(req, req._type || req.type);
        }
    }, [handleEditOvertimeClick, handleViewDetails]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [typeFilter, statusFilter, showPotential, dateFrom, dateTo, searchText]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginatedFiltered = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, currentPage]);

    // Wrap onViewDetails to also add claim action for POTENTIAL OT
    const wrappedRequests = useMemo(() => {
        return paginatedFiltered.map(r => {
            if (r._type === 'OVERTIME' && r.status === 'POTENTIAL') {
                return { ...r, _claimAction: () => handleClaimPotential(r), _claiming: claimingId === r.id };
            }
            return r;
        });
    }, [paginatedFiltered, handleClaimPotential, claimingId]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header with Yeni Talep button */}
            <div className="flex items-center justify-between">
                <div />
                <button
                    onClick={() => { setCreateModalInitialData(null); setShowCreateModal(true); }}
                    className="group bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-2xl font-bold shadow-xl shadow-slate-200 transition-all flex items-center gap-2 active:scale-95 text-sm"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Yeni Talep
                </button>
            </div>

            {/* Birthday Banner */}
            {birthdayBalance?.is_birthday_month && !birthdayBalance?.is_used && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎂</span>
                        <div>
                            <p className="font-bold text-pink-700">Doğum günü ayınız!</p>
                            <p className="text-sm text-pink-600">1 günlük doğum günü izni hakkınız var</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setCreateModalInitialData({ preselect_type: 'BIRTHDAY_LEAVE' });
                            setShowCreateModal(true);
                        }}
                        className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                    >
                        <Cake size={16} /> Doğum Günü İzni Talep Et
                    </button>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="İzin" value={counts.leave} icon={<Calendar size={20} />} color="bg-blue-500" tooltip="Bu mali dönemde oluşturduğunuz izin talepleri" />
                <StatCard label="Fazla Mesai" value={counts.overtime} icon={<Clock size={20} />} color="bg-amber-500" tooltip="Bu mali dönemde oluşturduğunuz ek mesai talepleri" />
                <StatCard label="Yemek" value={counts.meal} icon={<Utensils size={20} />} color="bg-emerald-500" tooltip="Bu mali dönemde oluşturduğunuz yemek talepleri" />
                <StatCard label="Kartsız Giriş" value={counts.cardless} icon={<CreditCard size={20} />} color="bg-purple-500" tooltip="Bu mali dönemde oluşturduğunuz kartsız giriş talepleri" />
            </div>

            {/* Mali Dönem Filtresi */}
            <div className="mb-4 flex items-center gap-2">
                <FiscalMonthPicker
                    defaultAll
                    onDateChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
                />
                <Tooltip title="Mali dönem her ayın 26'sından başlayıp, bir sonraki ayın 25'ine kadar sürer.">
                    <Info size={14} className="text-slate-400 cursor-help inline-block" />
                </Tooltip>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex flex-wrap gap-2">
                    <FilterChip active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} label="Tümü" count={counts.all} color="slate" />
                    <FilterChip active={typeFilter === 'LEAVE'} onClick={() => setTypeFilter('LEAVE')} label="İzin" icon={<Calendar size={14} />} count={counts.leave} color="blue" />
                    <FilterChip active={typeFilter === 'EXTERNAL_DUTY'} onClick={() => setTypeFilter(typeFilter === 'EXTERNAL_DUTY' ? 'ALL' : 'EXTERNAL_DUTY')} label="Dış Görev" icon={<Briefcase size={14} />} count={counts.external_duty} color="indigo" />
                    <FilterChip active={typeFilter === 'OVERTIME'} onClick={() => setTypeFilter('OVERTIME')} label="Mesai" icon={<Clock size={14} />} count={counts.overtime} color="amber" />
                    <FilterChip active={typeFilter === 'MEAL'} onClick={() => setTypeFilter('MEAL')} label="Yemek" icon={<Utensils size={14} />} count={counts.meal} color="emerald" />
                    <FilterChip active={typeFilter === 'CARDLESS_ENTRY'} onClick={() => setTypeFilter('CARDLESS_ENTRY')} label="Kartsız" icon={<CreditCard size={14} />} count={counts.cardless} color="purple" />
                    <FilterChip active={typeFilter === 'HEALTH_REPORT'} onClick={() => setTypeFilter(typeFilter === 'HEALTH_REPORT' ? 'ALL' : 'HEALTH_REPORT')} label="Sağlık Raporu" icon={<HeartPulse size={14} />} count={counts.health_report} color="red" />
                    <FilterChip active={typeFilter === 'HOSPITAL_VISIT'} onClick={() => setTypeFilter(typeFilter === 'HOSPITAL_VISIT' ? 'ALL' : 'HOSPITAL_VISIT')} label="Hastane Ziyareti" icon={<Stethoscope size={14} />} count={counts.hospital_visit} color="red" />
                    <FilterChip active={typeFilter === 'SPECIAL_LEAVE'} onClick={() => setTypeFilter(typeFilter === 'SPECIAL_LEAVE' ? 'ALL' : 'SPECIAL_LEAVE')} label="Özel İzin" icon={<FileText size={14} />} count={counts.special_leave} color="indigo" />
                </div>
                <div className="flex flex-wrap gap-2">
                    <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Tümü" color="slate" />
                    <FilterChip active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Bekleyen" count={counts.pending} color="amber" />
                    <FilterChip active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter('APPROVED')} label="Onaylı" count={counts.approved} color="emerald" />
                    <FilterChip active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter('REJECTED')} label="Red" count={counts.rejected} color="red" />
                    <FilterChip active={statusFilter === 'CANCELLED'} onClick={() => setStatusFilter('CANCELLED')} label="İptal" count={counts.cancelled} color="slate" />
                    <div className="h-8 w-px bg-slate-200 mx-1 self-center hidden sm:block" />
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-full cursor-pointer hover:bg-slate-50 transition-colors select-none">
                        <input type="checkbox" checked={showPotential} onChange={(e) => setShowPotential(e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" />
                        Potansiyel
                        <Tooltip title="Sistem tarafından algılanan fazla mesai tespitleri. Bunlar henüz talep olarak oluşturulmamıştır. 'Talep Et' butonuyla resmi talep oluşturabilirsiniz.">
                            <Info size={14} className="text-slate-400 cursor-help inline-block ml-1" />
                        </Tooltip>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-full cursor-pointer hover:bg-slate-50 transition-colors select-none">
                        <input type="checkbox" checked={hideCancelled} onChange={(e) => { setHideCancelled(e.target.checked); try { localStorage.setItem('myreqs_hide_cancelled', e.target.checked); } catch { /* ignore */ } }} className="w-3.5 h-3.5 text-blue-600 rounded" />
                        İptal Edilenleri Gizle
                    </label>
                </div>
            </div>

            {/* Request List or Empty State */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                        <Search size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Talep Bulunamadı</h3>
                    <p className="text-slate-500 max-w-sm mt-2 text-sm">Seçili kriterlere uygun talep yok.</p>
                    <button onClick={() => { setCreateModalInitialData(null); setShowCreateModal(true); }} className="mt-8 px-6 py-3 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                        <Plus size={18} /> Yeni Talep Oluştur
                    </button>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Potential OT claim buttons row */}
                    {wrappedRequests.some(r => r._claimAction) && (
                        <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                            <p className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1.5">
                                <AlertCircle size={14} />
                                <Tooltip title="Sistem, vardiya saatleriniz dışında çalıştığınızı tespit ettiğinde otomatik olarak potansiyel mesai kaydı oluşturur.">
                                    <span className="underline decoration-dotted cursor-help">Potansiyel fazla mesai</span>
                                </Tooltip>
                                {' '}tespitleriniz var.{' '}
                                <Tooltip title="Talep ettikten sonra yöneticinize onay için gönderilir.">
                                    <span className="underline decoration-dotted cursor-help">Talep etmek</span>
                                </Tooltip>
                                {' '}için satırdaki butonu kullanın.
                            </p>
                        </div>
                    )}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[11px] text-slate-400 uppercase tracking-wider">
                                        <th className="pl-3 pr-1 py-2 w-8"></th>
                                        <th className="px-3 py-2 font-bold">Tür</th>
                                        <th className="px-3 py-2 font-bold">Tarih</th>
                                        <th className="px-3 py-2 font-bold">Saat Aralığı</th>
                                        <th className="px-3 py-2 font-bold">Süre</th>
                                        <th className="px-3 py-2 font-bold">Durum</th>
                                        <th className="px-3 py-2 font-bold text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {wrappedRequests.map(req => (
                                        <ExpandableRequestRow
                                            key={`${req._type || req.type}-${req.id}`}
                                            req={req}
                                            isExpanded={expandedRowId === `${req._type || req.type}-${req.id}`}
                                            onToggle={() => handleViewDetails(req, req._type || req.type)}
                                            onViewDetails={handleViewDetails}
                                            onEdit={handleEdit}
                                            onDelete={handleDeleteRequest}
                                            showEmployeeColumn={false}
                                            mode="personal"
                                            claimPotentialRenderer={(r) => {
                                                if (!r._claimAction) return null;
                                                return (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); r._claimAction(); }}
                                                        disabled={r._claiming}
                                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                                        title="Bu potansiyel mesaiyi talep et"
                                                    >
                                                        <Zap size={12} />
                                                        {r._claiming ? 'İşleniyor...' : 'Talep Et'}
                                                    </button>
                                                );
                                            }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                                <span className="text-xs font-bold text-slate-500">
                                    {filtered.length} talep, sayfa {currentPage}/{totalPages}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="px-2 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"
                                    >İlk</button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"
                                    ><ChevronLeft size={16} /></button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let page;
                                        if (totalPages <= 5) page = i + 1;
                                        else if (currentPage <= 3) page = i + 1;
                                        else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                                        else page = currentPage - 2 + i;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-slate-800 text-white shadow-sm'
                                                        : 'text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >{page}</button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"
                                    ><ChevronRight size={16} /></button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="px-2 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 text-slate-600"
                                    >Son</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Request Modal */}
            <CreateRequestModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setCreateModalInitialData(null); }}
                onSuccess={handleCreateSuccess}
                requestTypes={requestTypes}
                initialData={createModalInitialData}
                onOvertimeOpen={() => setOvertimeModalOpen(true)}
            />

            {/* Overtime Claim Modal (new unified OT modal) */}
            <OvertimeClaimModal
                open={overtimeModalOpen}
                onClose={() => setOvertimeModalOpen(false)}
                onSuccess={() => { setOvertimeModalOpen(false); handleCreateSuccess(); }}
            />

            {/* Edit Overtime Modal */}
            <ModalOverlay open={showEditOvertimeModal} onClose={() => setShowEditOvertimeModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold text-slate-900">Mesai Düzenle</h3>
                        <form onSubmit={handleEditOvertimeSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Başlangıç</label>
                                    <input
                                        type="time"
                                        required
                                        value={editOvertimeForm.start_time}
                                        onChange={e => setEditOvertimeForm(prev => ({ ...prev, start_time: e.target.value }))}
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Bitiş</label>
                                    <input
                                        type="time"
                                        required
                                        value={editOvertimeForm.end_time}
                                        onChange={e => setEditOvertimeForm(prev => ({ ...prev, end_time: e.target.value }))}
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold"
                                    />
                                </div>
                            </div>
                            <textarea
                                required
                                rows="3"
                                value={editOvertimeForm.reason}
                                onChange={e => setEditOvertimeForm(prev => ({ ...prev, reason: e.target.value }))}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none resize-none"
                                placeholder="Açıklama"
                            />
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowEditOvertimeModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">
                                    İptal
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
            </ModalOverlay>

            {/* Request Detail Modal */}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={() => { fetchData(); notifyParent(); }}
            />

            {/* Claim Modal — multi-PRIMARY yönetici seçimi */}
            {claimModal.open && (
                <ModalOverlay open={claimModal.open} onClose={() => setClaimModal({ open: false, target: null })}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Mesai Talep Et</h3>
                            <button onClick={() => setClaimModal({ open: false, target: null })} className="p-1 hover:bg-slate-100 rounded-lg">
                                <XCircle size={18} className="text-slate-400" />
                            </button>
                        </div>
                        {/* 23:59 kartsız çıkış uyarısı */}
                        {claimModal.target && isMidnightBoundary(claimModal.target.end_time) && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <span className="text-amber-500 mt-0.5">⚠</span>
                                <p className="text-sm text-amber-700 m-0">
                                    Bu talep 23:59'a kadar uzanan bir kayda dayanmaktadır. Çıkış kartı basılmamış olabilir. Lütfen gerçek çalışma saatlerinizi kontrol ediniz.
                                </p>
                            </div>
                        )}
                        {/* Segment listesi — checkbox ile seçim */}
                        {claimModal.segments && claimModal.segments.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500">Mesai Segmentleri</label>
                                {claimModal.segments.map(seg => {
                                    const isChecked = (claimModal.selectedIds || []).includes(seg.id);
                                    const dur = seg.duration_seconds || seg.duration_minutes * 60 || 0;
                                    const mins = Math.round(dur / 60);
                                    const h = Math.floor(mins / 60);
                                    const m = mins % 60;
                                    const durStr = h > 0 ? `${h} sa ${m > 0 ? m + ' dk' : ''}` : `${m} dk`;
                                    return (
                                        <label key={seg.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${isChecked ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    setClaimModal(prev => ({
                                                        ...prev,
                                                        selectedIds: isChecked
                                                            ? prev.selectedIds.filter(id => id !== seg.id)
                                                            : [...(prev.selectedIds || []), seg.id]
                                                    }));
                                                }}
                                                className="accent-purple-600 w-4 h-4"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-bold text-slate-700">
                                                    {seg.start_time?.slice(0,5)} - {seg.end_time?.slice(0,5)}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-2">({durStr})</span>
                                            </div>
                                        </label>
                                    );
                                })}
                                {claimModal.segments.length > 1 && (
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Seçili: {(claimModal.selectedIds || []).length}/{claimModal.segments.length} segment
                                        {(claimModal.selectedIds || []).length < claimModal.segments.length && ' — çıkarılan segmentler ayrı tutulacak'}
                                    </p>
                                )}
                            </div>
                        )}
                        {/* Tek segment ise sadece tarih/saat göster */}
                        {(!claimModal.segments || claimModal.segments.length <= 1) && claimModal.target && (
                            <p className="text-sm text-slate-500">
                                {claimModal.target.date} &bull; {claimModal.target.start_time?.slice(0,5)} - {claimModal.target.end_time?.slice(0,5)}
                            </p>
                        )}
                        {claimManagers.length === 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                                    <AlertCircle size={14} />
                                    Yöneticiniz tanımlanmamış. İK ile iletişime geçin.
                                </p>
                            </div>
                        )}
                        {claimManagers.length > 1 && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Onay Yöneticisi</label>
                                <select
                                    id="claim-manager-select"
                                    defaultValue={(() => { const p = claimManagers.find(m => m.relationship === 'PRIMARY'); return p ? p.id : claimManagers[0]?.id; })()}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none"
                                >
                                    {claimManagers.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.relationship === 'PRIMARY' ? '⭐ ' : '🔹 '}{m.name}{m.relationship === 'PRIMARY' ? ' (Birincil)' : ' (İkincil)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <textarea
                            id="claim-reason-input"
                            rows="3"
                            placeholder="Açıklama (opsiyonel)..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none resize-none"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setClaimModal({ open: false, target: null })} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazgeç</button>
                            <button
                                onClick={() => {
                                    const selectEl = document.getElementById('claim-manager-select');
                                    const reasonEl = document.getElementById('claim-reason-input');
                                    const managerId = selectEl ? Number(selectEl.value) : (claimManagers.length === 1 ? claimManagers[0].id : null);
                                    handleClaimSubmit(reasonEl?.value || '', managerId);
                                }}
                                disabled={claimManagers.length === 0 || (claimModal.selectedIds || []).length === 0}
                                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all"
                            >
                                Talep Et
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
};

export default MyRequestsTab;
