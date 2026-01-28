import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar as CalendarIcon } from 'lucide-react';
import api from '../services/api';
import moment from 'moment';

const PublicHolidays = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        type: 'FULL_DAY',
        description: '',
        start_time: ''
    });

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            const response = await api.get('/public-holidays/');
            const data = response.data;
            if (Array.isArray(data)) {
                setHolidays(data);
            } else if (data.results && Array.isArray(data.results)) {
                setHolidays(data.results);
            } else {
                setHolidays([]);
            }
        } catch (error) {
            console.error('Error fetching holidays:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInitForm = () => {
        setFormData({
            name: '',
            date: '',
            type: 'FULL_DAY',
            description: ''
        });
        setEditingId(null);
        setShowModal(true);
    };

    const handleEdit = (holiday) => {
        setFormData({
            name: holiday.name,
            date: holiday.date,
            type: holiday.type,
            description: holiday.description,
            start_time: holiday.start_time || ''
        });
        setEditingId(holiday.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu tatili silmek istediğinize emin misiniz?')) {
            try {
                await api.delete(`/public-holidays/${id}/`);
                fetchHolidays();
            } catch (error) {
                console.error('Error deleting holiday:', error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/public-holidays/${editingId}/`, formData);
            } else {
                await api.post('/public-holidays/', formData);
            }
            setShowModal(false);
            fetchHolidays();
        } catch (error) {
            console.error('Error saving holiday:', error);
            alert('Kaydetme hatası.');
        }
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Resmi Tatiller</h2>
                    <p className="text-slate-500 mt-1">Yıllık resmi tatil ve özel gün tanımları</p>
                </div>
                <button
                    onClick={handleInitForm}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus size={20} />
                    Yeni Tatil Ekle
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-semibold text-slate-700">Tarih</th>
                            <th className="p-4 font-semibold text-slate-700">Tatil Adı</th>
                            <th className="p-4 font-semibold text-slate-700">Tür</th>
                            <th className="p-4 font-semibold text-slate-700">Açıklama</th>
                            <th className="p-4 font-semibold text-slate-700 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {holidays.length > 0 ? (
                            holidays.map(holiday => (
                                <tr key={holiday.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-slate-600 font-medium">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon size={16} className="text-slate-400" />
                                            {moment(holiday.date).format('D MMMM YYYY, dddd')}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-800 font-semibold">{holiday.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${holiday.type === 'FULL_DAY'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {holiday.type === 'FULL_DAY' ? 'Tam Gün' : 'Yarım Gün'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500 text-sm">{holiday.description || '-'}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(holiday)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(holiday.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-400">
                                    Henüz kayıtlı tatil bulunmamaktadır.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingId ? 'Tatili Düzenle' : 'Yeni Tatil Ekle'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tatil Adı</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    placeholder="Örn: Cumhuriyet Bayramı"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tür</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="FULL_DAY">Tam Gün</option>
                                        <option value="HALF_DAY">Yarım Gün</option>
                                    </select>
                                </div>
                            </div>

                            {formData.type === 'HALF_DAY' && (
                                <div className="animate-fade-in mt-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Saati</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        className="input-field"
                                        placeholder="Örn: 13:00"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Yarım gün tatilin başladığı saat (Örn: Arife günleri 13:00)</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input-field h-24 resize-none"
                                    placeholder="Opsiyonel açıklama..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
                                >
                                    <Save size={18} />
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicHolidays;
