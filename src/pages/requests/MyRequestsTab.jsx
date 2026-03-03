import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    Search, Calendar, Clock, Utensils, CreditCard, Plus,
    CheckCircle2, XCircle, AlertCircle, Zap
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RequestListTable from '../../components/RequestListTable';
import CreateRequestModal from '../../components/CreateRequestModal';
import RequestDetailModal from '../../components/RequestDetailModal';

const filterChipColors = {
    blue:    { bg50: 'bg-blue-50',    text700: 'text-blue-700',    ring200: 'ring-blue-200',    text600: 'text-blue-600' },
    amber:   { bg50: 'bg-amber-50',   text700: 'text-amber-700',   ring200: 'ring-amber-200',   text600: 'text-amber-600' },
    emerald: { bg50: 'bg-emerald-50', text700: 'text-emerald-700', ring200: 'ring-emerald-200', text600: 'text-emerald-600' },
    purple:  { bg50: 'bg-purple-50',  text700: 'text-purple-700',  ring200: 'ring-purple-200',  text600: 'text-purple-600' },
    red:     { bg50: 'bg-red-50',     text700: 'text-red-700',     ring200: 'ring-red-200',     text600: 'text-red-600' },
    slate:   { bg50: 'bg-slate-50',   text700: 'text-slate-700',   ring200: 'ring-slate-200',   text600: 'text-slate-600' },
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

const StatCard = ({ label, value, icon, color }) => (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
                <div className={color.replace('bg-', 'text-').replace('/10', '')}>{icon}</div>
            </div>
        </div>
    </div>
);

const MyRequestsTab = ({ onDataChange, refreshTrigger }) => {
    const { user } = useAuth();

    // Data states
    const [requests, setRequests] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [cardlessEntryRequests, setCardlessEntryRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
    const [currentUserInfo, setCurrentUserInfo] = useState({ name: '', department: '' });
    const [loading, setLoading] = useState(true);

    // UI states
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showPotential, setShowPotential] = useState(true);
    const [claimingId, setClaimingId] = useState(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createModalInitialData, setCreateModalInitialData] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);
    const [editOvertimeForm, setEditOvertimeForm] = useState({ id: null, start_time: '', end_time: '', reason: '' });

    // Fetch all data
    const fetchData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                api.get('/employees/me/'),
                api.get('/leave/requests/'),
                api.get('/leave/types/'),
                api.get('/overtime-requests/'),
                api.get('/meal-requests/'),
                api.get('/cardless-entry-requests/'),
            ]);

            const [meRes, leaveRes, typesRes, otRes, mealRes, cardlessRes] = results;

            if (meRes.status === 'fulfilled') {
                const me = meRes.value.data;
                setCurrentUserEmployeeId(me.id);
                setCurrentUserInfo({
                    name: me.full_name || `${me.first_name || ''} ${me.last_name || ''}`.trim(),
                    department: me.department_name || me.department?.name || '',
                });
            }
            if (leaveRes.status === 'fulfilled') {
                setRequests(leaveRes.value.data.results || leaveRes.value.data);
            }
            if (typesRes.status === 'fulfilled') {
                setRequestTypes(typesRes.value.data.results || typesRes.value.data);
            }
            if (otRes.status === 'fulfilled') {
                setOvertimeRequests(otRes.value.data.results || otRes.value.data);
            }
            if (mealRes.status === 'fulfilled') {
                setMealRequests(mealRes.value.data.results || mealRes.value.data);
            }
            if (cardlessRes.status === 'fulfilled') {
                setCardlessEntryRequests(cardlessRes.value.data.results || cardlessRes.value.data);
            }
        } catch (e) {
            console.error('MyRequestsTab fetchData error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

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

    const handleDeleteRequest = useCallback(async (r) => {
        if (!window.confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
        const t = r.type || r._type;
        try {
            if (t === 'LEAVE') await api.delete(`/leave/requests/${r.id}/`);
            else if (t === 'OVERTIME') await api.delete(`/overtime-requests/${r.id}/`);
            else if (t === 'MEAL') await api.delete(`/meal-requests/${r.id}/`);
            else if (t === 'CARDLESS_ENTRY') await api.delete(`/cardless-entry-requests/${r.id}/`);
            await fetchData();
            notifyParent();
        } catch (e) {
            alert(e.response?.data?.error || e.response?.data?.detail || 'Silme işlemi başarısız oldu.');
        }
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

    const handleClaimPotential = useCallback(async (req) => {
        setClaimingId(req.id);
        try {
            await api.post('/overtime-requests/claim-potential/', {
                overtime_request_id: req.id,
                reason: 'Talep edildi',
            });
            await fetchData();
            notifyParent();
        } catch (e) {
            alert(e.response?.data?.error || e.response?.data?.detail || 'Talep işlemi başarısız oldu.');
        } finally {
            setClaimingId(null);
        }
    }, [fetchData, notifyParent]);

    const handleCreateSuccess = useCallback((approverName) => {
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
        requests.filter(isMyRequest).forEach(r => items.push({
            ...r, ...myInfo, _type: 'LEAVE', type: 'LEAVE',
            _sortDate: r.start_date || r.created_at,
            leave_type_name: r.leave_type_name || requestTypes.find(t => t.id === r.request_type)?.name || r.request_type_detail?.name || '',
            target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
            approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
        }));
        overtimeRequests.filter(isMyRequest).forEach(r => items.push({
            ...r, ...myInfo, _type: 'OVERTIME', type: 'OVERTIME',
            _sortDate: r.date || r.created_at,
            onResubmit: () => handleResubmitOvertime(r),
            target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
            approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
        }));
        mealRequests.filter(isMyRequest).forEach(r => items.push({ ...r, ...myInfo, _type: 'MEAL', type: 'MEAL', _sortDate: r.date || r.created_at }));
        cardlessEntryRequests.filter(isMyRequest).forEach(r => items.push({
            ...r, ...myInfo, _type: 'CARDLESS_ENTRY', type: 'CARDLESS_ENTRY',
            _sortDate: r.date || r.created_at,
            target_approver_name: r.target_approver_detail?.full_name || r.target_approver_name || null,
            approved_by_name: r.approved_by_detail?.full_name || r.approved_by_name || null,
        }));
        items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));
        return items;
    }, [requests, overtimeRequests, mealRequests, cardlessEntryRequests, requestTypes, currentUserInfo, currentUserEmployeeId, handleResubmitOvertime]);

    const filtered = useMemo(() => {
        return allMyRequests.filter(r => {
            if (typeFilter !== 'ALL' && r._type !== typeFilter) return false;
            if (statusFilter !== 'ALL') {
                const statusGroup = { 'ORDERED': 'APPROVED', 'CANCELLED': 'REJECTED' };
                const effectiveStatus = statusGroup[r.status] || r.status;
                if (effectiveStatus !== statusFilter) return false;
            }
            if (!showPotential && r.status === 'POTENTIAL') return false;
            return true;
        });
    }, [allMyRequests, typeFilter, statusFilter, showPotential]);

    const counts = useMemo(() => {
        const actual = allMyRequests.filter(r => r.status !== 'POTENTIAL');
        return {
            all: actual.length,
            leave: actual.filter(r => r._type === 'LEAVE').length,
            overtime: actual.filter(r => r._type === 'OVERTIME').length,
            meal: actual.filter(r => r._type === 'MEAL').length,
            cardless: actual.filter(r => r._type === 'CARDLESS_ENTRY').length,
            pending: actual.filter(r => r.status === 'PENDING').length,
            approved: actual.filter(r => ['APPROVED', 'ORDERED'].includes(r.status)).length,
            rejected: actual.filter(r => ['REJECTED', 'CANCELLED'].includes(r.status)).length,
        };
    }, [allMyRequests]);

    // Custom onEdit that routes OVERTIME to edit modal, others to view
    const handleEdit = useCallback((req) => {
        if (req._type === 'OVERTIME' || req.type === 'OVERTIME') {
            handleEditOvertimeClick(req);
        }
    }, [handleEditOvertimeClick]);

    // Wrap onViewDetails to also add claim action for POTENTIAL OT
    const wrappedRequests = useMemo(() => {
        return filtered.map(r => {
            if (r._type === 'OVERTIME' && r.status === 'POTENTIAL') {
                return { ...r, _claimAction: () => handleClaimPotential(r), _claiming: claimingId === r.id };
            }
            return r;
        });
    }, [filtered, handleClaimPotential, claimingId]);

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

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="İzin" value={counts.leave} icon={<Calendar size={20} />} color="bg-blue-500" />
                <StatCard label="Fazla Mesai" value={counts.overtime} icon={<Clock size={20} />} color="bg-amber-500" />
                <StatCard label="Yemek" value={counts.meal} icon={<Utensils size={20} />} color="bg-emerald-500" />
                <StatCard label="Kartsız Giriş" value={counts.cardless} icon={<CreditCard size={20} />} color="bg-purple-500" />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex flex-wrap gap-2">
                    <FilterChip active={typeFilter === 'ALL'} onClick={() => setTypeFilter('ALL')} label="Tümü" count={counts.all} color="slate" />
                    <FilterChip active={typeFilter === 'LEAVE'} onClick={() => setTypeFilter('LEAVE')} label="İzin" icon={<Calendar size={14} />} count={counts.leave} color="blue" />
                    <FilterChip active={typeFilter === 'OVERTIME'} onClick={() => setTypeFilter('OVERTIME')} label="Mesai" icon={<Clock size={14} />} count={counts.overtime} color="amber" />
                    <FilterChip active={typeFilter === 'MEAL'} onClick={() => setTypeFilter('MEAL')} label="Yemek" icon={<Utensils size={14} />} count={counts.meal} color="emerald" />
                    <FilterChip active={typeFilter === 'CARDLESS_ENTRY'} onClick={() => setTypeFilter('CARDLESS_ENTRY')} label="Kartsız" icon={<CreditCard size={14} />} count={counts.cardless} color="purple" />
                </div>
                <div className="flex flex-wrap gap-2">
                    <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Tümü" color="slate" />
                    <FilterChip active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Bekleyen" count={counts.pending} color="amber" />
                    <FilterChip active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter('APPROVED')} label="Onaylı" count={counts.approved} color="emerald" />
                    <FilterChip active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter('REJECTED')} label="Red" count={counts.rejected} color="red" />
                    <div className="h-8 w-px bg-slate-200 mx-1 self-center hidden sm:block" />
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-full cursor-pointer hover:bg-slate-50 transition-colors select-none">
                        <input type="checkbox" checked={showPotential} onChange={(e) => setShowPotential(e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" />
                        Potansiyel
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
                                Potansiyel fazla mesai tespitleriniz var. Talep etmek için satırdaki butonu kullanın.
                            </p>
                        </div>
                    )}
                    <RequestListTable
                        requests={wrappedRequests}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                        showEmployeeColumn={false}
                        claimPotentialRenderer={(req) => {
                            if (!req._claimAction) return null;
                            return (
                                <button
                                    onClick={(e) => { e.stopPropagation(); req._claimAction(); }}
                                    disabled={req._claiming}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    title="Bu potansiyel mesaiyi talep et"
                                >
                                    <Zap size={12} />
                                    {req._claiming ? 'İşleniyor...' : 'Talep Et'}
                                </button>
                            );
                        }}
                    />
                </div>
            )}

            {/* Create Request Modal */}
            <CreateRequestModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setCreateModalInitialData(null); }}
                onSuccess={handleCreateSuccess}
                requestTypes={requestTypes}
                initialData={createModalInitialData}
            />

            {/* Edit Overtime Modal */}
            {showEditOvertimeModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
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
                </div>,
                document.body
            )}

            {/* Request Detail Modal */}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={() => { fetchData(); notifyParent(); }}
            />
        </div>
    );
};

export default MyRequestsTab;
