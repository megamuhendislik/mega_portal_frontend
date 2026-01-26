import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Filter, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Clock, Calendar, Utensils, CheckCircle2, XCircle, AlertCircle, Users, CreditCard } from 'lucide-react';
import api from '../services/api';
import RequestCard from '../components/RequestCard';
import CreateRequestModal from '../components/CreateRequestModal';
import RequestDetailModal from '../components/RequestDetailModal';

import useSmartPolling from '../hooks/useSmartPolling';
import { useAuth } from '../context/AuthContext';

const Requests = () => {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('my_requests');
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [cardlessEntryRequests, setCardlessEntryRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [teamHistoryRequests, setTeamHistoryRequests] = useState([]);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);
    const [editOvertimeForm, setEditOvertimeForm] = useState({ id: null, start_time: '', end_time: '', reason: '' });
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestType, setSelectedRequestType] = useState(null);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    // Auto-Refresh (Smart Polling every 30s)
    useSmartPolling(() => {
        if (!loading && !showCreateModal && !showEditOvertimeModal) {
            fetchData();
            if (activeTab === 'team_history') {
                fetchTeamHistory();
            }
        }
    }, 30000);

    // Fetch history when filter changes to HISTORY
    useEffect(() => {
        if (activeTab === 'team_history' && teamHistoryRequests.length === 0) {
            fetchTeamHistory();
        }
    }, [activeTab]);

    const fetchData = async () => {
        try {
            const [reqRes, typesRes, overtimeRes, mealRes, cardlessRes, teamRes] = await Promise.all([
                api.get('/leave/requests/'),
                api.get('/leave/types/'),
                api.get('/overtime-requests/'),
                api.get('/meal-requests/'),
                api.get('/cardless-entry-requests/'),
                api.get('/team-requests/'), // Unified Team Requests
            ]);
            setRequests(reqRes.data.results || reqRes.data);
            setRequestTypes(typesRes.data.results || typesRes.data);
            setOvertimeRequests(overtimeRes.data.results || overtimeRes.data);
            setMealRequests(mealRes.data.results || mealRes.data);
            setCardlessEntryRequests(cardlessRes.data.results || cardlessRes.data);

            // Unified Incoming Requests from Team Endpoint
            setIncomingRequests(teamRes.data || []);

        } catch (error) {
            console.error('Error fetching requests:', error);
            message.error("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamHistory = async () => {
        try {
            const res = await api.get('/leave/requests/team_history/');
            setTeamHistoryRequests(res.data.results || res.data);
        } catch (error) {
            console.error('Error fetching team history:', error);
        }
    };

    // --- Handlers ---

    const handleCreateSuccess = () => {
        fetchData();
    };

    const handleEditOvertimeClick = (req) => {
        setEditOvertimeForm({
            id: req.id,
            start_time: req.start_time,
            end_time: req.end_time,
            reason: req.reason
        });
        setShowEditOvertimeModal(true);
    };

    // Initial Data State for Resubmission
    const [createModalInitialData, setCreateModalInitialData] = useState(null);

    const handleResubmitOvertime = (req) => {
        setCreateModalInitialData({
            type: 'OVERTIME',
            data: req
        });
        setShowCreateModal(true);
    };

    const handleViewDetails = (request, type) => {
        setSelectedRequest(request);
        setSelectedRequestType(type);
        setShowDetailModal(true);
    };

    const handleEditOvertimeSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/overtime-requests/${editOvertimeForm.id}/`, {
                start_time: editOvertimeForm.start_time,
                end_time: editOvertimeForm.end_time,
                reason: editOvertimeForm.reason
            });
            setShowEditOvertimeModal(false);
            fetchData();
        } catch (error) {
            console.error('Error updating overtime request:', error);
            alert('Güncelleme sırasında hata oluştu.');
        }
    };

    const handleDeleteRequest = async (req, type) => {
        if (!window.confirm('Bu talebi silmek istediğinize emin misiniz?')) return;

        try {
            if (type === 'LEAVE') {
                await api.delete(`/leave/requests/${req.id}/`);
            } else if (type === 'OVERTIME') {
                await api.delete(`/overtime-requests/${req.id}/`);
            } else if (type === 'MEAL') {
                await api.delete(`/meal-requests/${req.id}/`);
            } else if (type === 'CARDLESS_ENTRY') {
                await api.delete(`/cardless-entry-requests/${req.id}/`);
            }
            fetchData();
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Silme işlemi başarısız oldu.');
        }
    };

    const handleApprove = async (req, notes = '') => {
        // if (!window.confirm('Bu talebi onaylamak istediğinize emin misiniz?')) return;
        try {
            let url = '';
            if (req.type === 'LEAVE') {
                url = `/leave/requests/${req.id}/approve_reject/`;
            } else if (req.type === 'OVERTIME') {
                url = `/overtime-requests/${req.id}/approve_reject/`;
            } else if (req.type === 'CARDLESS_ENTRY') {
                url = `/cardless-entry-requests/${req.id}/approve/`;
            }

            if (url) {
                await api.post(url, {
                    action: 'approve',
                    notes: notes || 'Onaylandı'
                });
                fetchData();
                if (activeTab === 'team_history') fetchTeamHistory();
            }
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Onaylama işlemi başarısız oldu.');
        }
    };

    const handleReject = async (req, reason) => {
        // const reason = window.prompt('Lütfen red sebebini giriniz:');
        if (reason === null) return; // Cancelled
        if (!reason) {
            alert('Red sebebi girmelisiniz.');
            return;
        }

        try {
            let url = '';
            if (req.type === 'LEAVE') {
                url = `/leave/requests/${req.id}/approve_reject/`;
            } else if (req.type === 'OVERTIME') {
                url = `/overtime-requests/${req.id}/approve_reject/`;
            } else if (req.type === 'CARDLESS_ENTRY') {
                url = `/cardless-entry-requests/${req.id}/reject/`;
            }

            if (url) {
                await api.post(url, {
                    action: 'reject',
                    reason: reason
                });
                fetchData();
                if (activeTab === 'team_history') fetchTeamHistory();
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('Reddetme işlemi başarısız oldu.');
        }
    };

    // --- UI Helpers ---

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1"><CheckCircle2 size={12} /> Onaylandı</span>;
            case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200 gap-1"><XCircle size={12} /> Reddedildi</span>;
            case 'PENDING': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 gap-1"><Clock size={12} /> Bekliyor</span>;
            case 'DELIVERED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 gap-1"><CheckCircle2 size={12} /> Teslim Edildi</span>;
            default: return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
        }
    };

    // --- Render Content ---

    const renderContent = () => {
        if (loading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 bg-slate-100 rounded-2xl"></div>
                    ))}
                </div>
            );
        }

        let content = null;

        if (activeTab === 'my_requests') {
            if (requests.length === 0) return <EmptyState title="İzin Talebi Yok" desc="Henüz oluşturulmuş bir izin talebiniz bulunmuyor." />;
            content = (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {requests.map(req => (
                        <RequestCard
                            onViewDetails={handleViewDetails}
                            key={req.id}
                            request={{ ...req, leave_type_name: requestTypes.find(t => t.id === req.request_type)?.name }}
                            type="LEAVE"
                            statusBadge={getStatusBadge}
                            onDelete={(r) => handleDeleteRequest(r, 'LEAVE')}
                        />
                    ))}
                </div>
            );
        } else if (activeTab === 'overtime_requests') {
            const drafts = overtimeRequests.filter(r => r.status === 'POTENTIAL');
            const submitted = overtimeRequests.filter(r => r.status !== 'POTENTIAL');

            if (overtimeRequests.length === 0) return <EmptyState title="Fazla Mesai Yok" desc="Henüz oluşturulmuş bir fazla mesai talebiniz bulunmuyor." />;

            content = (
                <div className="space-y-6">
                    {/* Drafts Banner */}
                    {drafts.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between shadow-sm animate-in slide-in-from-top-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {drafts.length} Adet Taslak Mesai Kaydı Mevcut
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        Sistem tarafından tespit edilen ve henüz talep edilmemiş mesaileriniz var.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCreateModal(true);
                                    // Optionally pre-select OVERTIME tab via state/props hack or context
                                    // Here we just open, user selects type easily. 
                                    // Or better: pass initialType='OVERTIME' to modal? Modal supports 'initialData' which sets type.
                                    setCreateModalInitialData({ type: 'OVERTIME', data: {} });
                                }}
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                Talebe Dönüştür
                            </button>
                        </div>
                    )}

                    {submitted.length === 0 && drafts.length > 0 ? (
                        <div className="text-center py-10 text-slate-400">gönderilmiş talep bulunamadı</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                            {submitted.map(req => (
                                <RequestCard
                                    onViewDetails={handleViewDetails}
                                    key={req.id}
                                    request={{ ...req, onResubmit: () => handleResubmitOvertime(req) }}
                                    type="OVERTIME"
                                    statusBadge={getStatusBadge}
                                    onEdit={handleEditOvertimeClick}
                                    onDelete={(r) => handleDeleteRequest(r, 'OVERTIME')}
                                />
                            ))}
                        </div>
                    )}
                </div>
            );
        } else if (activeTab === 'meal_requests') {
            if (mealRequests.length === 0) return <EmptyState title="Yemek Talebi Yok" desc="Henüz oluşturulmuş bir yemek talebiniz bulunmuyor." />;
            content = (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {mealRequests.map(req => (
                        <RequestCard
                            onViewDetails={handleViewDetails}
                            key={req.id}
                            request={req}
                            type="MEAL"
                            statusBadge={getStatusBadge}
                            onDelete={(r) => handleDeleteRequest(r, 'MEAL')}
                        />
                    ))}
                </div>
            );
        } else if (activeTab === 'cardless_entry_requests') {
            if (cardlessEntryRequests.length === 0) return <EmptyState title="Kartsız Giriş Yok" desc="Henüz oluşturulmuş bir kartsız giriş talebiniz bulunmuyor." />;
            content = (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {cardlessEntryRequests.map(req => (
                        <RequestCard
                            onViewDetails={handleViewDetails}
                            key={req.id}
                            request={req}
                            type="CARDLESS_ENTRY"
                            statusBadge={getStatusBadge}
                            onDelete={(r) => handleDeleteRequest(r, 'CARDLESS_ENTRY')}
                        />
                    ))}
                </div>
            );
        } else if (activeTab === 'incoming') {
            if (incomingRequests.length === 0) return <EmptyState title="Onay Bekleyen Talep Yok" desc="Şu anda onayınızı bekleyen herhangi bir talep bulunmuyor." />;

            content = (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {incomingRequests.map(req => (
                        <RequestCard
                            onViewDetails={handleViewDetails}
                            key={req.uniqueId || req.id}
                            request={{
                                ...req,
                                leave_type_name: req.request_type_detail?.name, // For Leave
                                employee_name: req.employee_detail?.full_name || req.employee_name // Fallback
                            }}
                            isIncoming={true}
                            statusBadge={getStatusBadge}
                            onApprove={(id, notes) => handleApprove(req, notes)}
                            onReject={(id, reason) => handleReject(req, reason)}
                        />
                    ))}
                </div>
            );
        } else if (activeTab === 'team_history') {
            if (teamHistoryRequests.length === 0) return <EmptyState title="Geçmiş Kayıt Yok" desc="Ekibinize ait herhangi bir geçmiş talep kaydı bulunamadı." />;

            content = (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {teamHistoryRequests.map(req => (
                        <RequestCard
                            onViewDetails={handleViewDetails}
                            key={req.id}
                            request={{
                                ...req,
                                leave_type_name: req.request_type_detail?.name,
                                employee_name: req.employee_detail?.full_name
                            }}
                            isIncoming={true} // To show employee info
                            // No actions passed -> Read Only
                            statusBadge={getStatusBadge}
                        />
                    ))}
                </div>
            );
        }

        return content;
    };

    const EmptyState = ({ title, desc }) => (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <Search size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-slate-500 max-w-xs mt-2">{desc}</p>
            {activeTab !== 'incoming' && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-6 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2 hover:underline"
                >
                    <Plus size={16} />
                    Yeni Talep Oluştur
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Taleplerim</h1>
                    <p className="text-slate-500 mt-2 text-lg">İzin, mesai ve yemek taleplerinizi buradan yönetebilirsiniz.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="group bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    Yeni Talep Oluştur
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Calendar size={64} className="text-blue-600" /></div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Toplam İzin Talebi</p>
                    <h3 className="text-3xl font-bold text-slate-800">{requests.length}</h3>
                    <div className="mt-2 h-1 w-12 bg-blue-500 rounded-full"></div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Clock size={64} className="text-amber-500" /></div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Fazla Mesai Talebi</p>
                    <h3 className="text-3xl font-bold text-slate-800">{overtimeRequests.length}</h3>
                    <div className="mt-2 h-1 w-12 bg-amber-500 rounded-full"></div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Utensils size={64} className="text-emerald-500" /></div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Yemek Talebi</p>
                    <h3 className="text-3xl font-bold text-slate-800">{mealRequests.length}</h3>
                    <div className="mt-2 h-1 w-12 bg-emerald-500 rounded-full"></div>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg shadow-slate-500/20 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowDownLeft size={64} /></div>
                    <p className="text-slate-400 text-sm font-medium mb-1">Bekleyen Onaylar</p>
                    <h3 className="text-3xl font-bold">{incomingRequests.length}</h3>
                    <div className="mt-2 h-1 w-12 bg-blue-400 rounded-full"></div>
                </div>
            </div>

            {/* Tabs & Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm sticky top-4 z-30 backdrop-blur-xl bg-white/80 supports-[backdrop-filter]:bg-white/60">
                <div className="flex p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'my_requests', label: 'İzin Taleplerim', show: true },
                        { id: 'overtime_requests', label: 'Fazla Mesai', show: hasPermission('request.overtime.manage') },
                        { id: 'meal_requests', label: 'Yemek', show: hasPermission('page.meal_tracking.access') },
                        { id: 'cardless_entry_requests', label: 'Kartsız Giriş', show: hasPermission('request.cardless_entry.manage') },
                        { id: 'incoming', label: 'Ekip Talepleri', badge: incomingRequests.length, show: hasPermission('request.annual_leave.manage') || hasPermission('request.overtime.manage') || hasPermission('request.cardless_entry.manage') },
                        { id: 'team_history', label: 'Ekip Geçmişi', show: hasPermission('request.annual_leave.manage') || hasPermission('request.overtime.manage') || hasPermission('request.cardless_entry.manage') }
                    ].filter(t => t.show).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2
                                ${activeTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-slate-100 text-slate-900' : 'bg-slate-200 text-slate-600'}`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Filter Button */}
                <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <SlidersHorizontal size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[300px]">
                {renderContent()}
            </div>

            {/* Modals */}
            <CreateRequestModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setCreateModalInitialData(null); }}
                onSuccess={handleCreateSuccess}
                requestTypes={requestTypes}
                initialData={createModalInitialData}
            />

            {/* Edit Overtime Modal */}
            {showEditOvertimeModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Mesai Talebini Düzenle</h3>
                            <button onClick={() => setShowEditOvertimeModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleEditOvertimeSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Saati</label>
                                    <input required type="time" value={editOvertimeForm.start_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, start_time: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Saati</label>
                                    <input required type="time" value={editOvertimeForm.end_time} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, end_time: e.target.value })} className="input-field" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                <textarea required rows="3" value={editOvertimeForm.reason} onChange={e => setEditOvertimeForm({ ...editOvertimeForm, reason: e.target.value })} className="input-field"></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowEditOvertimeModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 transition-all">Güncelle</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Request Detail Modal */}
            <RequestDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedRequest(null);
                    setSelectedRequestType(null);
                }}
                request={selectedRequest}
                requestType={selectedRequestType}
                onUpdate={fetchData}
            />
        </div>
    );
};

export default Requests;
