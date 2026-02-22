
import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, AlignLeft, Palette } from 'lucide-react';
import api from '../services/api';
import moment from 'moment';

const COLORS = [
    { name: 'Mavi', value: '#3b82f6' },
    { name: 'Yeşil', value: '#10b981' },
    { name: 'Kırmızı', value: '#ef4444' },
    { name: 'Sarı', value: '#f59e0b' },
    { name: 'Mor', value: '#8b5cf6' },
    { name: 'Gri', value: '#64748b' },
];

const CreatePersonalEventModal = ({ onClose, onSuccess, initialDate }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: initialDate ? moment(initialDate).format('YYYY-MM-DD') : '',
        start_time: '09:00',
        end_date: initialDate ? moment(initialDate).format('YYYY-MM-DD') : '',
        end_time: '10:00',
        color: '#3b82f6',
        is_all_day: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const start = `${formData.start_date}T${formData.start_time}`;
            const end = `${formData.end_date}T${formData.end_time}`;

            const payload = {
                title: formData.title,
                description: formData.description,
                start_time: start,
                end_time: end,
                is_all_day: formData.is_all_day,
                color: formData.color
            };

            await api.post('/personal-events/', payload);
            onSuccess();
        } catch (error) {
            console.error("Failed to create event:", error);
            alert("Etkinlik oluşturulurken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Yeni Etkinlik Ekle</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Başlık</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Örn: Diş Randevusu"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Başlangıç</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                                />
                                {!formData.is_all_day && (
                                    <input
                                        type="time"
                                        name="start_time"
                                        value={formData.start_time}
                                        onChange={handleChange}
                                        required
                                        className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Bitiş</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                                />
                                {!formData.is_all_day && (
                                    <input
                                        type="time"
                                        name="end_time"
                                        value={formData.end_time}
                                        onChange={handleChange}
                                        required
                                        className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_all_day"
                            name="is_all_day"
                            checked={formData.is_all_day}
                            onChange={handleChange}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_all_day" className="text-sm font-medium text-slate-700">Tüm Gün</label>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-2">Renk</label>
                        <div className="flex gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, color: c.value }))}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c.value ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Not/Açıklama</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm h-24 resize-none"
                            placeholder="Detaylı açıklama..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePersonalEventModal;
