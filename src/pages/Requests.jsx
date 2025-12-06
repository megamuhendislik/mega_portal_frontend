import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import api from '../services/api';

const Requests = () => {
    const [activeTab, setActiveTab] = useState('my_requests');
    const [requests, setRequests] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        request_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        destination: '',
        contact_phone: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [reqRes, typesRes] = await Promise.all([
                api.get('/leave/requests/'),
                api.get('/leave/types/')
            ]);
            setRequests(reqRes.data.results || reqRes.data);
            setRequestTypes(typesRes.data.results || typesRes.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leave/requests/', formData);
            setShowModal(false);
            fetchData();
            setFormData({
                request_type: '',
                start_date: '',
                end_date: '',
                reason: '',
                destination: '',
                contact_phone: ''
            });
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Error creating request. Please check the console.');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><CheckCircle size={12} className="mr-1" /> Onaylandı</span>;
            case 'REJECTED': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><XCircle size={12} className="mr-1" /> Reddedildi</span>;
            case 'PENDING': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><Clock size={12} className="mr-1" /> Bekliyor</span>;
            case 'ESCALATED': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium flex items-center"><AlertCircle size={12} className="mr-1" /> İletildi</span>;
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
                    <p className="text-slate-500 mt-1">İzin ve görev talepleri yönetimi</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus size={18} className="mr-2" />
                    Yeni Talep Oluştur
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('my_requests')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'my_requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Taleplerim
                    </button>
                    <button
                        onClick={() => setActiveTab('incoming')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'incoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Gelen Talepler (Yönetici)
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
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
                                        Henüz talep bulunmuyor.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Yeni Talep Oluştur</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Talep Türü</label>
                                <select required name="request_type" value={formData.request_type} onChange={handleInputChange} className="input-field">
                                    <option value="">Seçiniz</option>
                                    {requestTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç</label>
                                    <input required type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş</label>
                                    <input required type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="input-field" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                <textarea required name="reason" rows="3" value={formData.reason} onChange={handleInputChange} className="input-field"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gidilecek Yer (Dış Görev)</label>
                                <input name="destination" value={formData.destination} onChange={handleInputChange} className="input-field" placeholder="Opsiyonel" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">İletişim Telefonu</label>
                                <input name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} className="input-field" placeholder="Opsiyonel" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 transition-all">Gönder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Requests;
