import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Clock, Calendar, Utensils } from 'lucide-react';
import api from '../services/api';
import RequestCard from '../components/RequestCard';
import CreateRequestModal from '../components/CreateRequestModal';

const Requests = () => {
    const [activeTab, setActiveTab] = useState('my_requests');
    const [requests, setRequests] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);

    // Edit Form
    const [editOvertimeForm, setEditOvertimeForm] = useState({
        id: null,
        start_time: '',
        end_time: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [reqRes, typesRes, overtimeRes, mealRes] = await Promise.all([
                api.get('/leave/requests/'),
                api.get('/leave/types/'),
                api.get('/attendance/overtime-requests/'),
                api.get('/attendance/meal-requests/')
            ]);
            setRequests(reqRes.data.results || reqRes.data);
            setRequestTypes(typesRes.data.results || typesRes.data);
            setOvertimeRequests(overtimeRes.data.results || overtimeRes.data);
            setMealRequests(mealRes.data.results || mealRes.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---

    const handleCreateSuccess = () => {
        fetchData();
        // Optional: Show success toast
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

    const handleEditOvertimeSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/attendance/overtime-requests/${editOvertimeForm.id}/`, {
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
                await api.delete(`/attendance/overtime-requests/${req.id}/`);
            } else if (type === 'MEAL') {
                // Assuming meal requests can be deleted
                await api.delete(`/attendance/meal-requests/${req.id}/`);
            }
            fetchData();
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Silme işlemi başarısız oldu.');
        }
    };

    // --- UI Helpers ---

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Onaylandı</span>;
            case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Reddedildi</span>;
            case 'PENDING': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Bekliyor</span>;
            case 'DELIVERED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Teslim Edildi</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map(req => (
                        <RequestCard
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
            if (overtimeRequests.length === 0) return <EmptyState title="Fazla Mesai Yok" desc="Henüz oluşturulmuş bir fazla mesai talebiniz bulunmuyor." />;
            content = (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {overtimeRequests.map(req => (
                        <RequestCard
                            key={req.id}
                            request={req}
                            type="OVERTIME"
                            statusBadge={getStatusBadge}
                            onEdit={handleEditOvertimeClick}
                            onDelete={(r) => handleDeleteRequest(r, 'OVERTIME')}
                        />
                    ))}
                </div>
            );
        } else if (activeTab === 'meal_requests') {
            if (mealRequests.length === 0) return <EmptyState title="Yemek Talebi Yok" desc="Henüz oluşturulmuş bir yemek talebiniz bulunmuyor." />;
            content = (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mealRequests.map(req => (
                        <RequestCard
                            key={req.id}
                            request={req}
                            type="MEAL"
                            statusBadge={getStatusBadge}
                            onDelete={(r) => handleDeleteRequest(r, 'MEAL')}
                        />
                    ))}
                </div>
            );
        } else if (activeTab === 'incoming') {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <ArrowDownLeft size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Gelen Talepler</h3>
                    <p className="text-slate-500 max-w-md mt-2">
                        Yönetici onay ekranı için lütfen "Onaylar" menüsünü kullanın. Bu alan yakında güncellenecektir.
                    </p>
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
            <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2 hover:underline"
            >
                <Plus size={16} />
                Yeni Talep Oluştur
            </button>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
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

            {/* Summary Cards (Optional - using static/calculated data for visual appeal) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Calendar size={64} /></div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Toplam İzin Talebi</p>
                    <h3 className="text-3xl font-bold">{requests.length}</h3>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={64} /></div>
                    <p className="text-amber-100 text-sm font-medium mb-1">Fazla Mesai Talebi</p>
                    <h3 className="text-3xl font-bold">{overtimeRequests.length}</h3>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Utensils size={64} /></div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">Yemek Talebi</p>
                    <h3 className="text-3xl font-bold">{mealRequests.length}</h3>
                </div>
            </div>

            {/* Tabs & Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto overflow-x-auto">
                    {[
                        { id: 'my_requests', label: 'İzin Taleplerim' },
                        { id: 'overtime_requests', label: 'Fazla Mesai' },
                        { id: 'meal_requests', label: 'Yemek' },
                        { id: 'incoming', label: 'Gelen Talepler' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filter Button (Visual only for now) */}
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
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
                requestTypes={requestTypes}
            />

            {/* Edit Overtime Modal (Inlined for simplicity as it's small) */}
            {showEditOvertimeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
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
                </div>
            )}
        </div>
    );
};

export default Requests;
