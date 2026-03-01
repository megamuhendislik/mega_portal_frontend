import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    Plus, Clock, Calendar, BarChart3, Layers, Users,
    CheckCircle2, XCircle, ArrowRightLeft, CalendarCheck, ArrowDownLeft
} from 'lucide-react';
import api from '../services/api';
import CreateRequestModal from '../components/CreateRequestModal';
import RequestDetailModal from '../components/RequestDetailModal';
import AssignedOvertimeTab from '../components/AssignedOvertimeTab';

import MyRequestsTab from './requests/MyRequestsTab';
import IncomingRequestsTab from './requests/IncomingRequestsTab';
import AnalyticsTab from './requests/AnalyticsTab';

import useSmartPolling from '../hooks/useSmartPolling';
import { useAuth } from '../context/AuthContext';

// =========== TAB BUTTON ===========
const TabButton = ({ active, onClick, children, badge, icon }) => (
    <button
        onClick={onClick}
        className={`relative px-3 sm:px-4 md:px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 outline-none
            ${active ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
        `}
    >
        {icon && <span className={active ? 'text-blue-500' : 'text-slate-400'}>{icon}</span>}
        {children}
        {badge > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold
                ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {badge}
            </span>
        )}
        {active && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
        )}
    </button>
);

// =========== MAIN PAGE ===========
const Requests = () => {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('my_requests');
    const [loading, setLoading] = useState(true);

    // Data States
    const [requests, setRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [cardlessEntryRequests, setCardlessEntryRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);

    // Substitute Data
    const [substituteData, setSubstituteData] = useState(null);
    const [substituteLoading, setSubstituteLoading] = useState(false);

    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);
    const [editOvertimeForm, setEditOvertimeForm] = useState({ id: null, start_time: '', end_time: '', reason: '' });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);
    const [subordinates, setSubordinates] = useState([]);
    const [subordinateIds, setSubordinateIds] = useState(new Set());
    const [directSubordinateIds, setDirectSubordinateIds] = useState(new Set());
    const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState(null);
    const [currentUserInfo, setCurrentUserInfo] = useState({ name: '', department: '' });

    const [createModalInitialData, setCreateModalInitialData] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const isManager = hasPermission('APPROVAL_LEAVE') || hasPermission('APPROVAL_OVERTIME') || subordinates.length > 0;

    // Pending counts for badge
    const pendingIncomingCount = incomingRequests.filter(r => r.status === 'PENDING').length;
    const substituteRequestCount = (substituteData?.leave_requests?.length || 0) + (substituteData?.overtime_requests?.length || 0);
    const totalIncomingBadge = pendingIncomingCount + substituteRequestCount;

    useSmartPolling(() => {
        if (!loading && !showCreateModal && !showEditOvertimeModal) fetchData();
    }, 30000);

    useEffect(() => {
        fetchData();
        fetchMe();
        fetchSubstituteRequests();
    }, []);

    useEffect(() => {
        if (isManager) fetchSubordinates();
    }, [isManager]);

    // Calculate Direct Subordinates
    useEffect(() => {
        if (subordinates.length > 0 && currentUserEmployeeId) {
            const directIds = new Set(
                subordinates.filter(sub => {
                    if (sub.reports_to === currentUserEmployeeId) return true;
                    if (sub.primary_managers && sub.primary_managers.some(m => m.id === currentUserEmployeeId)) return true;
                    return false;
                }).map(s => s.id)
            );
            setDirectSubordinateIds(directIds);
        }
    }, [subordinates, currentUserEmployeeId]);

    const fetchMe = async () => {
        try {
            const res = await api.get('/employees/me/');
            setCurrentUserEmployeeId(res.data.id);
            setCurrentUserInfo({
                name: res.data.full_name || `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim(),
                department: res.data.department_name || res.data.department?.name || '',
            });
        } catch (e) { console.error("Error fetching me:", e); }
    };

    const fetchSubordinates = async () => {
        try {
            const res = await api.get('/employees/subordinates/');
            setSubordinates(res.data);
            setSubordinateIds(new Set(res.data.map(e => e.id)));
        } catch (e) { console.error(e); }
    };

    const fetchData = async () => {
        try {
            const calls = [
                api.get('/leave/requests/'),
                api.get('/leave/types/'),
                api.get('/overtime-requests/'),
                api.get('/meal-requests/'),
                api.get('/cardless-entry-requests/'),
            ];

            const teamCalls = [
                api.get('/team-requests/').catch(() => ({ data: [] })),
                api.get('/leave/requests/team_history/').catch(() => ({ data: { results: [] } }))
            ];

            const [
                myRequestsRes, leaveTypesRes, overtimeRes, mealRes, cardlessRes
            ] = await Promise.all(calls);

            const [incomingRes, historyRes] = await Promise.all(teamCalls);

            setRequests(myRequestsRes.data.results || myRequestsRes.data);
            setRequestTypes(leaveTypesRes.data.results || leaveTypesRes.data);
            setOvertimeRequests(overtimeRes.data.results || overtimeRes.data);
            setMealRequests(mealRes.data.results || mealRes.data);
            setCardlessEntryRequests(cardlessRes.data.results || cardlessRes.data);

            setIncomingRequests(incomingRes.data || []);
            setTeamHistoryRequests(historyRes.data.results || historyRes.data || []);

        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchTeamHistory = async () => {
        try {
            const res = await api.get('/leave/requests/team_history/');
            setTeamHistoryRequests(res.data.results || res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSubstituteRequests = async () => {
        setSubstituteLoading(true);
        try {
            const res = await api.get('/substitute-authority/pending_requests/');
            setSubstituteData(res.data);
        } catch (e) {
            setSubstituteData(null);
        } finally {
            setSubstituteLoading(false);
        }
    };

    // --- Handlers ---
    const handleCreateSuccess = (approverName) => {
        fetchData();
        if (approverName) {
            setSuccessMessage(`Talebiniz ${approverName} adlı yöneticiye gönderildi.`);
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    };
    const handleViewDetails = (r, t) => { setSelectedRequest(r); setSelectedRequestType(t); setShowDetailModal(true); };
    const handleEditOvertimeClick = (r) => { setEditOvertimeForm({ id: r.id, start_time: r.start_time, end_time: r.end_time, reason: r.reason }); setShowEditOvertimeModal(true); };
    const handleResubmitOvertime = (r) => { setCreateModalInitialData({ type: 'OVERTIME', data: r }); setShowCreateModal(true); };

    const handleDeleteRequest = async (r) => {
        if (!window.confirm('Emin misiniz?')) return;
        const t = r.type || r._type;
        try {
            if (t === 'LEAVE') await api.delete(`/leave/requests/${r.id}/`);
            else if (t === 'OVERTIME') await api.delete(`/overtime-requests/${r.id}/`);
            else if (t === 'MEAL') await api.delete(`/meal-requests/${r.id}/`);
            else if (t === 'CARDLESS_ENTRY') await api.delete(`/cardless-entry-requests/${r.id}/`);
            fetchData();
        } catch (e) { alert('Hata oluştu'); }
    };

    const handleApprove = async (req, notes) => {
        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            else if (req.type === 'CARDLESS_ENTRY' || req.type === 'CARDLESS') url = `/cardless-entry-requests/${req.id}/approve/`;
            else if (req.type === 'MEAL') url = `/meal-requests/${req.id}/toggle_order/`;
            if (url) { await api.post(url, { action: 'approve', notes: notes || 'Onaylandı' }); fetchData(); }
        } catch (e) { alert('İşlem başarısız'); }
    };

    const handleReject = async (req, reason) => {
        if (!reason) return;
        try {
            let url = '';
            if (req.type === 'LEAVE') url = `/leave/requests/${req.id}/approve_reject/`;
            else if (req.type === 'OVERTIME') url = `/overtime-requests/${req.id}/approve_reject/`;
            else if (req.type === 'CARDLESS_ENTRY' || req.type === 'CARDLESS') url = `/cardless-entry-requests/${req.id}/reject/`;
            else if (req.type === 'MEAL') url = `/meal-requests/${req.id}/reject/`;
            if (url) { await api.post(url, { action: 'reject', reason }); fetchData(); }
        } catch (e) { alert('İşlem başarısız'); }
    };

    const handleSubstituteApprove = async (req) => {
        try {
            let url = '';
            let payload = {};
            if (req.type === 'LEAVE') {
                url = `/leave/requests/${req.id}/approve_reject/`;
                payload = { action: 'approve', notes: 'Vekil olarak onaylandı', acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'OVERTIME') {
                url = `/overtime-requests/${req.id}/approve_reject/`;
                payload = { action: 'approve', notes: 'Vekil olarak onaylandı', acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'CARDLESS_ENTRY') {
                url = `/cardless-entry-requests/${req.id}/approve/`;
                payload = { acting_as_substitute_for: req.principal_id };
            }
            if (!url) return;
            await api.post(url, payload);
            fetchData();
            fetchSubstituteRequests();
        } catch (e) {
            alert(e.response?.data?.error || 'İşlem başarısız');
        }
    };

    const handleSubstituteReject = async (req, reason) => {
        if (!reason) return;
        try {
            let url = '';
            let payload = {};
            if (req.type === 'LEAVE') {
                url = `/leave/requests/${req.id}/approve_reject/`;
                payload = { action: 'reject', reason, acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'OVERTIME') {
                url = `/overtime-requests/${req.id}/approve_reject/`;
                payload = { action: 'reject', reason, acting_as_substitute_for: req.principal_id };
            } else if (req.type === 'CARDLESS_ENTRY') {
                url = `/cardless-entry-requests/${req.id}/reject/`;
                payload = { reason, acting_as_substitute_for: req.principal_id };
            }
            if (!url) return;
            await api.post(url, payload);
            fetchData();
            fetchSubstituteRequests();
        } catch (e) {
            alert(e.response?.data?.error || 'İşlem başarısız');
        }
    };

    const handleEditOvertimeSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/overtime-requests/${editOvertimeForm.id}/`, editOvertimeForm);
            setShowEditOvertimeModal(false);
            fetchData();
        } catch (e) { alert('Hata'); }
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Kendi Taleplerim</h1>
                    <p className="text-slate-500 font-medium">Bütün izin, mesai ve diğer taleplerinizi tek yerden yönetin.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="group bg-slate-900 hover:bg-black text-white px-7 py-3 rounded-2xl font-bold shadow-xl shadow-slate-200 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    Yeni Talep Oluştur
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm font-semibold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
                        <XCircle size={16} />
                    </button>
                </div>
            )}

            {/* Navigation Tabs — 4 Ana Tab */}
            <div className="border-b border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
                <TabButton
                    active={activeTab === 'my_requests'}
                    onClick={() => setActiveTab('my_requests')}
                    icon={<Layers size={18} />}
                >
                    Kendi Taleplerim
                </TabButton>

                {isManager && (
                    <TabButton
                        active={activeTab === 'incoming_requests'}
                        onClick={() => setActiveTab('incoming_requests')}
                        icon={<ArrowDownLeft size={18} />}
                        badge={totalIncomingBadge}
                    >
                        Gelen Talepler
                    </TabButton>
                )}

                <TabButton
                    active={activeTab === 'assigned_overtime'}
                    onClick={() => setActiveTab('assigned_overtime')}
                    icon={<CalendarCheck size={18} />}
                >
                    Ek Mesai
                </TabButton>

                <TabButton
                    active={activeTab === 'analytics'}
                    onClick={() => setActiveTab('analytics')}
                    icon={<BarChart3 size={18} />}
                >
                    Analiz
                </TabButton>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'my_requests' && (
                    <MyRequestsTab
                        requests={requests}
                        overtimeRequests={overtimeRequests}
                        mealRequests={mealRequests}
                        cardlessEntryRequests={cardlessEntryRequests}
                        requestTypes={requestTypes}
                        loading={loading}
                        handleDeleteRequest={handleDeleteRequest}
                        handleEditOvertimeClick={handleEditOvertimeClick}
                        handleResubmitOvertime={handleResubmitOvertime}
                        handleViewDetails={handleViewDetails}
                        setShowCreateModal={setShowCreateModal}
                        currentUserInfo={currentUserInfo}
                    />
                )}
                {activeTab === 'incoming_requests' && isManager && (
                    <IncomingRequestsTab
                        incomingRequests={incomingRequests}
                        teamHistoryRequests={teamHistoryRequests}
                        substituteData={substituteData}
                        subordinates={subordinates}
                        directSubordinateIds={directSubordinateIds}
                        loading={loading}
                        handleApprove={handleApprove}
                        handleReject={handleReject}
                        handleSubstituteApprove={handleSubstituteApprove}
                        handleSubstituteReject={handleSubstituteReject}
                        handleViewDetails={handleViewDetails}
                        fetchTeamHistory={fetchTeamHistory}
                    />
                )}
                {activeTab === 'assigned_overtime' && (
                    <AssignedOvertimeTab />
                )}
                {activeTab === 'analytics' && (
                    <AnalyticsTab subordinates={subordinates} loading={loading} isManager={isManager} />
                )}
            </div>

            {/* Modals */}
            <CreateRequestModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setCreateModalInitialData(null); }}
                onSuccess={handleCreateSuccess}
                requestTypes={requestTypes}
                initialData={createModalInitialData}
                onOvertimeTabSwitch={() => setActiveTab('assigned_overtime')}
            />
            {showEditOvertimeModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold text-slate-900">Mesai Düzenle</h3>
                        <form onSubmit={handleEditOvertimeSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <input type="time" required value={editOvertimeForm.start_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, start_time: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" />
                                <input type="time" required value={editOvertimeForm.end_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, end_time: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" />
                            </div>
                            <textarea required rows="3" value={editOvertimeForm.reason} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, reason: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl border-none resize-none" placeholder="Açıklama" />
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowEditOvertimeModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">İptal</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>, document.body
            )}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={fetchData}
            />
        </div>
    );
};

export default Requests;
