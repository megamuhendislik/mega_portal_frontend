import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Briefcase, Building, Calendar, MapPin, Shield, Check, X, UserPlus, Settings } from 'lucide-react';
import api from '../services/api';

const Profile = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [formData, setFormData] = useState({});

    // Fetch employees for substitute selection when editing starts
    useEffect(() => {
        if (isEditing && employees.length === 0) {
            const fetchEmployees = async () => {
                try {
                    const res = await api.get('/employees/');
                    // Filter out self
                    setEmployees(res.data.filter(e => e.id !== user.employee.id));
                } catch (err) {
                    console.error('Error fetching employees:', err);
                }
            };
            fetchEmployees();
        }
    }, [isEditing, user]);

    useEffect(() => {
        if (user && user.employee) {
            // Initialize form with current data
            // Note: user.employee.substitutes might be IDs or objects depending on serializer. 
            // EmployeeDetailSerializer usually returns objects or IDs?
            // Let's assume potentially objects. We need IDs for the form.
            const subs = user.employee.substitutes?.map(s => (typeof s === 'object' ? s.id : s)) || [];

            setFormData({
                phone_secondary: user.employee.phone_secondary || '',
                address: user.employee.address || '',
                emergency_contact_name: user.employee.emergency_contact_name || '',
                emergency_contact_phone: user.employee.emergency_contact_phone || '',
                lunch_start: user.employee.lunch_start || '',
                lunch_end: user.employee.lunch_end || '',
                substitutes: subs
            });
        }
    }, [user, isEditing]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.patch('/employees/me/', formData);
            // Ideally refresh user context or show success
            setIsEditing(false);
            window.location.reload(); // Simple way to refresh context for now
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Güncelleme sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Cover Image */}
                <div className="h-48 bg-gradient-to-r from-slate-800 to-slate-900 relative">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40"></div>
                </div>

                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row items-end -mt-16 mb-6 relative z-10">
                        {/* Profile Picture */}
                        <div className="h-32 w-32 rounded-2xl bg-white p-1.5 shadow-xl">
                            <div className="h-full w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 text-4xl font-bold border border-slate-200">
                                {user.first_name?.[0] || user.username?.[0] || 'U'}
                            </div>
                        </div>

                        {/* Name & Role */}
                        <div className="mt-4 md:mt-0 md:ml-6 flex-1">
                            <h1 className="text-3xl font-bold text-slate-900">{user.first_name} {user.last_name}</h1>
                            <div className="flex items-center space-x-4 mt-2 text-slate-600">
                                <span className="flex items-center text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                                    <Briefcase size={14} className="mr-1.5" />
                                    {user.job_position?.name || 'Pozisyon Belirtilmemiş'}
                                </span>
                                <span className="flex items-center text-sm">
                                    <MapPin size={16} className="mr-1.5 text-slate-400" />
                                    İstanbul, TR
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 md:mt-0 flex space-x-3">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Profili Düzenle
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editing Modal Overlay */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <h2 className="text-xl font-bold text-slate-800">Profili Düzenle</h2>
                            <button onClick={() => setIsEditing(false)} className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Contact Info */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Phone size={14} /> İletişim Bilgileri
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">İkinci Telefon</label>
                                        <input
                                            value={formData.phone_secondary}
                                            onChange={e => setFormData({ ...formData, phone_secondary: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Adres</label>
                                        <input
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Shield size={14} /> Acil Durum Kişisi
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
                                        <input
                                            value={formData.emergency_contact_name}
                                            onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
                                        <input
                                            value={formData.emergency_contact_phone}
                                            onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Lunch Preferences */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Utensils size={14} /> Yemek ve Mola Tercihleri
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğle Yemeği Başlangıç</label>
                                        <input
                                            type="time"
                                            value={formData.lunch_start}
                                            onChange={e => setFormData({ ...formData, lunch_start: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğle Yemeği Bitiş</label>
                                        <input
                                            type="time"
                                            value={formData.lunch_end}
                                            onChange={e => setFormData({ ...formData, lunch_end: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Substitutes */}
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <UserPlus size={14} className="text-indigo-600" /> Vekillerim (Substitutes)
                                </h3>
                                <p className="text-xs text-indigo-700 mb-3">
                                    İzinli olduğunuz durumlarda sizin yerinize işlem yapabilecek veya onay verebilecek kişileri buradan seçebilirsiniz.
                                </p>
                                <div className="relative">
                                    <select
                                        multiple
                                        value={formData.substitutes}
                                        onChange={e => {
                                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                                            setFormData({ ...formData, substitutes: selected });
                                        }}
                                        className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none h-32 custom-scrollbar"
                                    >
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.first_name} {emp.last_name} — {emp.job_position?.name || 'Pozisyonsuz'}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-400 mt-2 text-right">Birden fazla seçim için CTRL (Windows) veya CMD (Mac) tuşuna basılı tutarak tıklayınız.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50">vazgeç</button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 flex items-center gap-2"
                            >
                                {loading ? 'Kaydediliyor...' : <><Check size={18} /> Kaydet</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Right Column - Status & Meta */}
                <div className="md:col-span-1 space-y-6 order-last md:order-first">
                    <div className="card bg-slate-900 text-white border-none shadow-xl shadow-slate-900/10">
                        <h3 className="text-lg font-bold mb-4 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-400" />
                            Hesap Durumu
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                <span className="text-slate-400 text-sm">Durum</span>
                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/30">AKTİF</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                <span className="text-slate-400 text-sm">Çalışan Kodu</span>
                                <span className="font-mono text-slate-200">{user.employee_code}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                <span className="text-slate-400 text-sm">İşe Giriş</span>
                                <span className="text-slate-200 text-sm">{user.hired_date || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        {/* Display Substitutes Info */}
                        <div className="mb-4 pb-4 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Vekillerim</h3>
                            <p className="text-xs text-slate-500">Sizin yerinize işlem yapabilenler.</p>
                        </div>
                        {user.employee?.substitutes?.length > 0 ? (
                            <div className="space-y-2">
                                {user.employee.substitutes.map(sub => (
                                    <div key={typeof sub === 'object' ? sub.id : sub} className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50 text-indigo-900 text-sm font-medium">
                                        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                            {typeof sub === 'object' ? sub.first_name?.[0] : '?'}
                                        </div>
                                        {typeof sub === 'object' ? `${sub.first_name} ${sub.last_name}` : 'Yükleniyor...'}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-400 text-sm">Henüz vekil atanmamış.</div>
                        )}
                    </div>
                </div>

                {/* Left Column - Personal Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="card">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
                            <User className="w-5 h-5 mr-2 text-blue-500" />
                            Kişisel Bilgiler
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kullanıcı Adı</label>
                                <div className="flex items-center text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <Shield className="w-4 h-4 mr-3 text-slate-400" />
                                    {user.username}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-posta Adresi</label>
                                <div className="flex items-center text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <Mail className="w-4 h-4 mr-3 text-slate-400" />
                                    {user.email}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Telefon Numarası</label>
                                <div className="flex items-center text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <Phone className="w-4 h-4 mr-3 text-slate-400" />
                                    {user.phone || 'Belirtilmemiş'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departman</label>
                                <div className="flex items-center text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <Building className="w-4 h-4 mr-3 text-slate-400" />
                                    {user.department?.name || 'Belirtilmemiş'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple Icon component just for this file if Utensils is missing from imports
const Utensils = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
);

export default Profile;
