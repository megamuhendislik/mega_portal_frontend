import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Clock, AlignLeft, Users, Building, Bell, Check, Lock, Globe } from 'lucide-react';
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

const AgendaEventModal = ({ onClose, onSuccess, initialDate, initialData = null }) => {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Mode: 'PRIVATE' or 'SHARED'
    const [shareMode, setShareMode] = useState(initialData?.shared_with?.length > 0 || initialData?.shared_departments?.length > 0 ? 'SHARED' : 'PRIVATE');

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        start_date: initialData ? moment(initialData.start_time).format('YYYY-MM-DD') : (initialDate ? moment(initialDate).format('YYYY-MM-DD') : ''),
        start_time: initialData ? moment(initialData.start_time).format('HH:mm') : '09:00',
        end_date: initialData ? moment(initialData.end_time).format('YYYY-MM-DD') : (initialDate ? moment(initialDate).format('YYYY-MM-DD') : ''),
        end_time: initialData ? moment(initialData.end_time).format('HH:mm') : '10:00',
        color: initialData?.color || '#3b82f6',
        is_all_day: initialData?.is_all_day || false,

        shared_with: initialData?.shared_with || [], // IDs
        shared_departments: initialData?.shared_departments || [], // IDs
        reminders: initialData?.reminders || { '1d': false, '3d': false, '7d': false, 'on_event': true }
    });

    useEffect(() => {
        // Load options for sharing
        const loadOptions = async () => {
            try {
                const [empRes, depRes] = await Promise.all([
                    api.get('/employees/'),
                    api.get('/core/departments/') // Assuming this maps to DepartmentViewSet
                ]);
                // Handle pagination if results key exists
                setEmployees(empRes.data.results || empRes.data);
                setDepartments(depRes.data.results || depRes.data);
            } catch (err) {
                console.error("Failed to load options", err);
            }
        };
        loadOptions();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleReminder = (key) => {
        setFormData(prev => ({
            ...prev,
            reminders: { ...prev.reminders, [key]: !prev.reminders[key] }
        }));
    };

    const toggleSelection = (listName, id) => {
        setFormData(prev => {
            const list = prev[listName];
            if (list.includes(id)) {
                return { ...prev, [listName]: list.filter(x => x !== id) };
            } else {
                return { ...prev, [listName]: [...list, id] };
            }
        });
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
                color: formData.color,
                reminders: formData.reminders,
                shared_with: shareMode === 'SHARED' ? formData.shared_with : [],
                shared_departments: shareMode === 'SHARED' ? formData.shared_departments : []
            };

            if (initialData?.id) {
                await api.patch(`/attendance/personal-events/${initialData.id}/`, payload);
            } else {
                await api.post('/attendance/personal-events/', payload);
            }
            onSuccess();
        } catch (error) {
            console.error("Failed to save event:", error);
            alert("Etkinlik kaydedilirken hata oluştu: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {initialData ? 'Etkinliği Düzenle' : 'Yeni Not / Etkinlik'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Header: Title & Type */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BAŞLIK</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className="w-full text-lg font-bold p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                placeholder="Örn: Proje Toplantısı"
                                autoFocus
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-lg w-max">
                            <button
                                type="button"
                                onClick={() => setShareMode('PRIVATE')}
                                className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${shareMode === 'PRIVATE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Lock size={14} /> Kişisel (Gizli)
                            </button>
                            <button
                                type="button"
                                onClick={() => setShareMode('SHARED')}
                                className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${shareMode === 'SHARED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Globe size={14} /> Paylaşımlı
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Timing & Color */}
                        <div className="space-y-6">
                            {/* Date & Time */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-500" /> Zamanlama
                                </h4>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex gap-2 mb-1">
                                            <input
                                                type="date"
                                                name="start_date"
                                                value={formData.start_date}
                                                onChange={handleChange}
                                                required
                                                className="flex-1 p-2 rounded-lg border border-slate-300 text-sm font-medium"
                                            />
                                            {!formData.is_all_day && (
                                                <input
                                                    type="time"
                                                    name="start_time"
                                                    value={formData.start_time}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-24 p-2 rounded-lg border border-slate-300 text-sm font-medium"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                name="end_date"
                                                value={formData.end_date}
                                                onChange={handleChange}
                                                required
                                                className="flex-1 p-2 rounded-lg border border-slate-300 text-sm font-medium"
                                            />
                                            {!formData.is_all_day && (
                                                <input
                                                    type="time"
                                                    name="end_time"
                                                    value={formData.end_time}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-24 p-2 rounded-lg border border-slate-300 text-sm font-medium"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <input
                                            type="checkbox"
                                            id="is_all_day"
                                            name="is_all_day"
                                            checked={formData.is_all_day}
                                            onChange={handleChange}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="is_all_day" className="text-sm font-medium text-slate-600 select-none cursor-pointer">Tüm Gün Sürer</label>
                                    </div>
                                </div>
                            </div>

                            {/* Event Type Selector (Replacing Color) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ETKİNLİK TÜRÜ</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { name: 'Genel', value: '#3b82f6', icon: <Check size={14} /> },
                                        { name: 'Toplantı', value: '#8b5cf6', icon: <Users size={14} /> },
                                        { name: 'Not / Kişisel', value: '#64748b', icon: <AlignLeft size={14} /> },
                                        { name: 'Hatırlatma', value: '#f59e0b', icon: <Bell size={14} /> },
                                        { name: 'Acil / Önemli', value: '#ef4444', icon: <Bell size={14} /> },
                                        { name: 'İzin / Seyahat', value: '#10b981', icon: <Globe size={14} /> },
                                    ].map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, color: type.value }))}
                                            className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border ${formData.color === type.value ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.value }}></div>
                                            {type.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Sharing & Reminders */}
                        <div className="space-y-6">

                            {shareMode === 'SHARED' && (
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-right-4">
                                    <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                        <Users size={16} className="text-emerald-600" /> Paylaşım Ayarları
                                    </h4>

                                    {/* Departments */}
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700/70 uppercase mb-1.5 flex items-center gap-1">
                                            <Building size={12} /> Departmanlar
                                        </label>
                                        <div className="max-h-24 overflow-y-auto bg-white border border-emerald-200 rounded-lg p-2 text-sm space-y-1">
                                            {departments.map(dept => (
                                                <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-emerald-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.shared_departments.includes(dept.id)}
                                                        onChange={() => toggleSelection('shared_departments', dept.id)}
                                                        className="rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                                    />
                                                    <span className="truncate">{dept.name}</span>
                                                </label>
                                            ))}
                                            {departments.length === 0 && <span className="text-slate-400 italic text-xs">Departman bulunamadı</span>}
                                        </div>
                                    </div>

                                    {/* Employees */}
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-700/70 uppercase mb-1.5 flex items-center gap-1">
                                            <Users size={12} /> Kişiler
                                        </label>
                                        <div className="max-h-32 overflow-y-auto bg-white border border-emerald-200 rounded-lg p-2 text-sm space-y-1">
                                            {employees.map(emp => (
                                                <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-emerald-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.shared_with.includes(emp.id)}
                                                        onChange={() => toggleSelection('shared_with', emp.id)}
                                                        className="rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                                    />
                                                    <span className="truncate">{emp.first_name} {emp.last_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reminders */}
                            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-3">
                                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                    <Bell size={16} className="text-amber-600" /> Hatırlatıcılar
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-amber-100 hover:border-amber-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.reminders['on_event']}
                                            onChange={() => toggleReminder('on_event')}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-slate-600">Etkinlik Günü</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-amber-100 hover:border-amber-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.reminders['1d']}
                                            onChange={() => toggleReminder('1d')}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-slate-600">1 Gün Önce</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-amber-100 hover:border-amber-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.reminders['3d']}
                                            onChange={() => toggleReminder('3d')}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-slate-600">3 Gün Önce</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-amber-100 hover:border-amber-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.reminders['7d']}
                                            onChange={() => toggleReminder('7d')}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-slate-600">1 Hafta Önce</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NOT / AÇIKLAMA</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm h-24 resize-none shadow-sm"
                            placeholder="Etkinlik veya not ile ilgili detaylar..."
                        />
                    </div>

                </form>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AgendaEventModal;
