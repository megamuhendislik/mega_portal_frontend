import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Filter, Utensils, Edit2 } from 'lucide-react';
import api from '../services/api';

const Requests = () => {
    const [activeTab, setActiveTab] = useState('my_requests');
    const [requests, setRequests] = useState([]);
    const [overtimeRequests, setOvertimeRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showMealModal, setShowMealModal] = useState(false);
    const [showEditOvertimeModal, setShowEditOvertimeModal] = useState(false);

    // Forms
    const [leaveForm, setLeaveForm] = useState({
        request_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        destination: '',
        contact_phone: ''
    });

    const [mealForm, setMealForm] = useState({
        description: ''
    });

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

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leave/requests/', leaveForm);
            setShowLeaveModal(false);
            fetchData();
            setLeaveForm({
                request_type: '',
                start_date: '',
                end_date: '',
                reason: '',
                destination: '',
                contact_phone: ''
            });
        } catch (error) {
            console.error('Error creating leave request:', error);
            alert('Talep oluşturulurken hata oluştu.');
        }
    };

    const handleMealSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/attendance/meal-requests/', mealForm);
            setShowMealModal(false);
            fetchData();
            setMealForm({ description: '' });
        } catch (error) {
            console.error('Error creating meal request:', error);
            alert(error.response?.data?.detail || error.response?.data?.[0] || 'Yemek talebi oluşturulurken hata oluştu.');
        }
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

    // --- UI Helpers ---

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><CheckCircle size={12} className="mr-1" /> Onaylandı</span>;
            case 'REJECTED': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><XCircle size={12} className="mr-1" /> Reddedildi</span>;
            case 'PENDING': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><Clock size={12} className="mr-1" /> Bekliyor</span>;
            case 'DELIVERED': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><CheckCircle size={12} className="mr-1" /> Teslim Edildi</span>;
            default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-medium">{status}</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Talepler</h2>
                    <p className="text-slate-500 mt-1">İzin, fazla mesai ve yemek talepleri yönetimi</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowMealModal(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-orange-500/30"
                    >
                        <Utensils size={18} className="mr-2" />
                        Yemek İste
                    </button>
                    <button
                        onClick={() => setShowLeaveModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-blue-500/30"
                    >
                        <Plus size={18} className="mr-2" />
                        Yeni İzin Talebi
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex space-x-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('my_requests')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'my_requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        İzin Taleplerim
                    </button>
                    <button
                        onClick={() => setActiveTab('overtime_requests')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'overtime_requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Fazla Mesai Taleplerim
                    </button>
                    <button
                        onClick={() => setActiveTab('meal_requests')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'meal_requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Yemek Taleplerim
                    </button>
                    <button
                        onClick={() => setActiveTab('incoming')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'incoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Gelen Talepler (Yönetici)
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    {/* LEAVE REQUESTS TABLE */}
                    {activeTab === 'my_requests' && (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Talep Türü</th>
                                    <th className="px-6 py-4">Tarihler</th>
                                    <th className="px-6 py-4">Süre</th>
                                    <th className="px-6 py-4">Açıklama</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4">Oluşturulma</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.length > 0 ? (
                                    requests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                {requestTypes.find(t => t.id === req.request_type)?.name || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <Calendar size={14} className="mr-2 text-slate-400" />
                                                    {req.start_date} - {req.end_date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{req.total_days} Gün</td>
                                            <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                            <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                                            <td className="px-6 py-4 text-slate-400">{new Date(req.created_at).toLocaleDateString('tr-TR')}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                            Henüz izin talebi bulunmuyor.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* OVERTIME REQUESTS TABLE */}
                    {activeTab === 'overtime_requests' && (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4">Saatler</th>
                                    <th className="px-6 py-4">Süre</th>
                                    <th className="px-6 py-4">Açıklama</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {overtimeRequests.length > 0 ? (
                                    overtimeRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                <div className="flex items-center">
                                                    <Calendar size={14} className="mr-2 text-slate-400" />
                                                    {req.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <Clock size={14} className="mr-2 text-slate-400" />
                                                    {req.start_time.substring(0, 5)} - {req.end_time.substring(0, 5)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{req.duration_minutes} Dk</td>
                                            <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                            <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                                            <td className="px-6 py-4">
                                                {req.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleEditOvertimeClick(req)}
                                                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                                        title="Düzenle"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                            Henüz fazla mesai talebi bulunmuyor.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* MEAL REQUESTS TABLE */}
                    {activeTab === 'meal_requests' && (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4">Açıklama / Tercih</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4">Oluşturulma</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mealRequests.length > 0 ? (
                                    mealRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                <div className="flex items-center">
                                                    <Calendar size={14} className="mr-2 text-slate-400" />
                                                    {req.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{req.description}</td>
                                            <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                                            <td className="px-6 py-4 text-slate-400">{new Date(req.created_at).toLocaleDateString('tr-TR')} {new Date(req.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                                            Henüz yemek talebi bulunmuyor.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'incoming' && (
                        <div className="p-8 text-center text-slate-500">
                            Yönetici onay ekranı henüz bu sayfaya taşınmadı. Lütfen "Onaylar" menüsünü kullanın.
                        </div>
                    )}
                </div>
            </div>

            {/* LEAVE REQUEST MODAL */}
            {showLeaveModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Yeni İzin Talebi</h3>
                            <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Talep Türü</label>
                                <select required value={leaveForm.request_type} onChange={e => setLeaveForm({ ...leaveForm, request_type: e.target.value })} className="input-field">
                                    <option value="">Seçiniz</option>
                                    {requestTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç</label>
                                    <input required type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş</label>
                                    <input required type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="input-field" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                <textarea required rows="3" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="input-field"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gidilecek Yer (Dış Görev)</label>
                                <input value={leaveForm.destination} onChange={e => setLeaveForm({ ...leaveForm, destination: e.target.value })} className="input-field" placeholder="Opsiyonel" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">İletişim Telefonu</label>
                                <input value={leaveForm.contact_phone} onChange={e => setLeaveForm({ ...leaveForm, contact_phone: e.target.value })} className="input-field" placeholder="Opsiyonel" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 transition-all">Gönder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MEAL REQUEST MODAL */}
            {showMealModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Yemek Talebi Oluştur</h3>
                            <button onClick={() => setShowMealModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleMealSubmit} className="p-6 space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                                <p>Yemek talebi sadece <strong>bugün</strong> için oluşturulabilir.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Yemek Tercihi / Açıklama</label>
                                <textarea required rows="3" value={mealForm.description} onChange={e => setMealForm({ ...mealForm, description: e.target.value })} className="input-field" placeholder="Örn: Tavuklu Salata, İçecek..."></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowMealModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium shadow-lg shadow-orange-500/30 transition-all">Talep Et</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT OVERTIME MODAL */}
            {showEditOvertimeModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
