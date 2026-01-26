
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    User, Phone, MapPin, Shield, Users, Briefcase,
    Calendar, Save, Lock, LayoutDashboard, Building,
    Clock, Bell
} from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [allEmployees, setAllEmployees] = useState([]);

    const [formData, setFormData] = useState({
        phone: '',
        phone_secondary: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        lunch_start: '',
        lunch_end: '',
        substitutes: [],
        // Security Form (Local State)
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    // Check edit permission
    const isEditable = user?.employee?.is_profile_editable || false;
    // Proxy (Substitutes) is ALWAYS editable.

    useEffect(() => {
        if (user && user.employee) {
            const subs = user.employee.substitutes?.map(s => (typeof s === 'object' ? s.id : s)) || [];
            setFormData({
                phone: user.phone || '',
                phone_secondary: user.employee.phone_secondary || '',
                address: user.employee.address || '',
                emergency_contact_name: user.employee.emergency_contact_name || '',
                emergency_contact_phone: user.employee.emergency_contact_phone || '',
                lunch_start: user.employee.lunch_start || '',
                lunch_end: user.employee.lunch_end || '',
                substitutes: subs
            });
        }
    }, [user]);

    // Fetch employees for substitute selection only when that tab is active
    useEffect(() => {
        if (activeTab === 'substitutes' && allEmployees.length === 0) {
            api.get('/employees/')
                .then(res => setAllEmployees(res.data.filter(e => e.id !== user.employee.id)))
                .catch(err => console.error(err));
        }
    }, [activeTab]);

    const handleSave = async () => {
        setLoading(true);
        setSuccessMessage('');
        try {
            // General Update
            if (activeTab !== 'security') {
                await api.patch('/employees/me/', formData);
                setSuccessMessage('Bilgileriniz başarıyla güncellendi.');
                setTimeout(() => {
                    setSuccessMessage('');
                    window.location.reload();
                }, 1000);
            } else {
                // Password Change
                if (formData.new_password !== formData.confirm_password) {
                    alert('Yeni şifreler eşleşmiyor!');
                    setLoading(false);
                    return;
                }
                await api.post('/employees/change_password/', {
                    old_password: formData.old_password,
                    new_password: formData.new_password
                });
                setSuccessMessage('Şifreniz başarıyla değiştirildi. Güvenlik nedeniyle profil düzenleme izniniz kapatılmıştır.');
                setFormData({ ...formData, old_password: '', new_password: '', confirm_password: '' });
                // Force reload or re-auth might be needed if user object needs refresh, but for now reload is safe
                setTimeout(() => window.location.reload(), 2000);
                setSuccessMessage('Şifreniz başarıyla değiştirildi.');
                setFormData({ ...formData, old_password: '', new_password: '', confirm_password: '' });
                setTimeout(() => setSuccessMessage(''), 2000);
            }

        } catch (error) {
            console.error('Update failed:', error);
            const msg = error.response?.data?.error || 'Güncelleme sırasında bir hata oluştu.';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const tabs = [
        { id: 'general', label: 'Genel Bilgiler', icon: User },
        { id: 'contact', label: 'İletişim & Adres', icon: MapPin },
        { id: 'substitutes', label: 'Vekalet Yönetimi', icon: Users },
        { id: 'substitutes', label: 'Vekalet Yönetimi', icon: Users },
        { id: 'preferences', label: 'Çalışma Tercihleri', icon: Clock },
        { id: 'security', label: 'Güvenlik', icon: Lock }
    ];

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-inter">
            {/* Sidebar with Premium Glass/Card look */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
                <div className="p-8 pb-6">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hesap Ayarları</h2>
                    <p className="text-sm text-slate-500 mt-2 font-medium">Profilinizi ve tercihlerinizi yönetin.</p>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 space-y-2 py-4">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`group w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 font-medium text-sm relative overflow-hidden ${isActive
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 scale-[1.02]'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <div className={`relative z-10 flex items-center gap-4`}>
                                    <Icon size={20} className={`transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    <span className="tracking-wide">{tab.label}</span>
                                </div>
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></div>}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white transition-colors cursor-default border border-transparent hover:border-slate-200 hover:shadow-sm">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-slate-500 truncate font-medium">{user.job_position?.name || 'Çalışan'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                <div className="max-w-5xl mx-auto p-12">
                    {/* Header */}
                    <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h1>
                        <p className="text-slate-500 mt-2 text-lg">
                            Bu bölümdeki bilgileri aşağıdan görüntüleyebilir veya düzenleyebilirsiniz.
                        </p>
                    </div>

                    {/* Permissions & Alerts */}
                    <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75">
                        {!isEditable && activeTab !== 'substitutes' && activeTab !== 'general' && (
                            <div className="bg-white border-l-4 border-blue-500 shadow-sm rounded-r-xl p-6 flex items-start gap-5">
                                <div className="p-3 bg-blue-50 rounded-full shrink-0">
                                    <Shield size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">Profiliniz Koruma Altında</h4>
                                    <p className="text-slate-600 mt-1 leading-relaxed">
                                        Kişisel veri güvenliği politikamız gereği, bilgileriniz salt okunur moddadır.
                                        Değişiklik yapmanız gerekiyorsa lütfen Yöneticinizden veya İK departmanından
                                        <b className="text-blue-700"> geçici düzenleme izni</b> talep ediniz.
                                    </p>
                                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        Vekalet yönetimi bu kısıtlamadan muaftır.
                                    </div>
                                </div>
                            </div>
                        )}

                        {isEditable && activeTab !== 'substitutes' && activeTab !== 'general' && (
                            <div className="bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 shadow-sm rounded-xl p-6 flex items-start gap-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>
                                <div className="p-3 bg-emerald-100 rounded-full shrink-0 z-10">
                                    <Settings size={24} className="text-emerald-700" />
                                </div>
                                <div className="z-10">
                                    <h4 className="font-bold text-emerald-900 text-lg">Düzenleme Modu Aktif</h4>
                                    <p className="text-emerald-800/80 mt-1 leading-relaxed">
                                        Şu anda profiliniz üzerinde değişiklik yapabilirsiniz. İşlemlerinizi tamamladıktan sonra
                                        veya sayfadan ayrıldığınızda koruma modu otomatik olarak tekrar devreye girecektir.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        <div className="col-span-12">
                            {/* GENERAL TAB */}
                            {activeTab === 'general' && (
                                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                    <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 relative">
                                        <div className="absolute inset-0 bg-grid-slate-700/[0.1] bg-[size:20px_20px]"></div>
                                        {/* Avatar Overflowing */}
                                        <div className="absolute -bottom-16 left-8">
                                            <div className="w-32 h-32 rounded-2xl bg-white p-2 shadow-lg">
                                                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-5xl font-bold">
                                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-20 px-8 pb-8">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <h2 className="text-3xl font-bold text-slate-900">{user.first_name} {user.last_name}</h2>
                                                <p className="text-lg text-slate-500 font-medium">{user.job_position?.name || 'Pozisyonsuz'}</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                    <Building size={16} />
                                                    {user.department?.name || '-'}
                                                </div>
                                                <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2">
                                                    <Briefcase size={16} />
                                                    #{user.employee_code}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 border-t border-slate-100 pt-8">
                                            <div className="space-y-6">
                                                <div className="group">
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block group-hover:text-blue-600 transition-colors">E-posta Adresi</label>
                                                    <div className="text-lg font-medium text-slate-900 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">@</div>
                                                        {user.email}
                                                    </div>
                                                </div>
                                                <div className="group">
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block group-hover:text-blue-600 transition-colors">İşe Başlama Tarihi</label>
                                                    <div className="text-lg font-medium text-slate-900 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                            <Calendar size={16} />
                                                        </div>
                                                        {user.hired_date || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm leading-relaxed flex gap-3">
                                                    <Shield size={20} className="shrink-0 mt-0.5 text-amber-600" />
                                                    <div>
                                                        <span className="font-bold block mb-1">Bilgilendirme</span>
                                                        Bu ekrandaki kurumsal bilgiler Sistem Yöneticisi tarafından yönetilmektedir. Hatalı bir bilgi olduğunu düşünüyorsanız lütfen sistem yöneticisi ile iletişime geçiniz.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CONTACT TAB - Re-styled */}
                            {activeTab === 'contact' && (
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="block text-sm font-bold text-slate-900">Kurumsal Telefon</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Phone size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                </div>
                                                <input
                                                    value={formData.phone}
                                                    readOnly
                                                    className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 text-slate-500 font-medium cursor-not-allowed"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <span className="text-xs font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded">İK YÖNETİMİNDE</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="block text-sm font-bold text-slate-900">Şahsi Telefon</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Phone size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                </div>
                                                <input
                                                    value={formData.phone_secondary}
                                                    onChange={e => setFormData({ ...formData, phone_secondary: e.target.value })}
                                                    disabled={!isEditable}
                                                    placeholder="05..."
                                                    className={`pl-10 w-full bg-white border border-slate-200 rounded-xl py-3.5 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none ${!isEditable ? 'bg-slate-50 text-slate-400' : ''}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-3">
                                            <label className="block text-sm font-bold text-slate-900">Ev Adresi</label>
                                            <textarea
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                disabled={!isEditable}
                                                className={`w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none h-32 ${!isEditable ? 'bg-slate-50 text-slate-400' : ''}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-8 border-t border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-red-50 rounded-lg text-red-500"><Shield size={18} /></div>
                                            Acil Durum İletişim
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="block text-sm font-bold text-slate-900">Ad Soyad</label>
                                                <input
                                                    value={formData.emergency_contact_name}
                                                    onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                                    disabled={!isEditable}
                                                    className={`w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none ${!isEditable ? 'bg-slate-50 text-slate-400' : ''}`}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-sm font-bold text-slate-900">Yakınlık / Telefon</label>
                                                <input
                                                    value={formData.emergency_contact_phone}
                                                    onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                                    disabled={!isEditable}
                                                    className={`w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none ${!isEditable ? 'bg-slate-50 text-slate-400' : ''}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SUBSTITUTES TAB - PREMIUM FEATURE CARD */}
                            {activeTab === 'substitutes' && (
                                <div className="space-y-8">
                                    <div className="bg-gradient-to-br from-indigo-50 via-white to-white border border-indigo-100 rounded-2xl p-8 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>

                                        <div className="flex gap-6 items-start relative z-10">
                                            <div className="w-14 h-14 bg-white rounded-2xl shadow-lg shadow-indigo-200/50 flex items-center justify-center shrink-0 border border-indigo-50">
                                                <Users size={28} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">Vekalet Sistemi</h3>
                                                <p className="text-slate-600 mt-2 max-w-2xl leading-relaxed">
                                                    Seçtiğiniz kişiler, siz izinli olduğunuzda veya müsait olmadığınızda onay süreçlerinde
                                                    sizin yetkilerinizi kullanabilir. Bu işlem, iş sürekliliğini sağlamak adına önemlidir.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-indigo-50/50">
                                            <h4 className="text-sm font-bold text-slate-900 mb-3">Tanımlı Vekiller</h4>
                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                                                <select
                                                    multiple
                                                    value={formData.substitutes}
                                                    onChange={e => {
                                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                                        setFormData({ ...formData, substitutes: selected });
                                                    }}
                                                    className="w-full p-4 bg-transparent border-none outline-none h-64 custom-scrollbar text-slate-700 font-medium text-sm focus:ring-0"
                                                >
                                                    {allEmployees.map(emp => (
                                                        <option key={emp.id} value={emp.id} className="py-3 px-4 rounded-lg my-1 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors flex items-center justify-between">
                                                            {emp.first_name} {emp.last_name}  —  {emp.job_position?.name || 'Pozisyonsuz'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex justify-end items-center mt-3 gap-2 text-xs font-medium text-slate-400">
                                                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-sans">CTRL</span>
                                                tuşuna basılı tutarak çoklu seçim yapabilirsiniz.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PREFERENCES - Re-styled */}
                            {activeTab === 'preferences' && (
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 space-y-10">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500"><Clock size={18} /></div>
                                            Mesai Bilgileri
                                        </h3>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center hover:bg-white hover:shadow-md transition-all duration-300">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Başlangıç</div>
                                                <div className="text-2xl font-mono font-bold text-slate-800">{user.employee?.shift_start || '09:00'}</div>
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center hover:bg-white hover:shadow-md transition-all duration-300">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bitiş</div>
                                                <div className="text-2xl font-mono font-bold text-slate-800">{user.employee?.shift_end || '18:00'}</div>
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-center hover:bg-white hover:shadow-md transition-all duration-300">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mola</div>
                                                <div className="text-2xl font-mono font-bold text-slate-800">{user.employee?.daily_break_allowance || '60'} <span className="text-sm font-sans font-medium text-slate-500">dk</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500"><LayoutDashboard size={18} /></div>
                                            Yemek Molası Tercihleri
                                        </h3>
                                        <div className="flex gap-6 items-start p-6 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                            <div className="grid grid-cols-2 gap-6 flex-1">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Mola Çıkış</label>
                                                    <input
                                                        type="time"
                                                        value={formData.lunch_start}
                                                        onChange={e => setFormData({ ...formData, lunch_start: e.target.value })}
                                                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Mola Dönüş</label>
                                                    <input
                                                        type="time"
                                                        value={formData.lunch_end}
                                                        onChange={e => setFormData({ ...formData, lunch_end: e.target.value })}
                                                        disabled={!isEditable}
                                                        className={`w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none ${!isEditable ? 'bg-slate-50/50 text-slate-400' : ''}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-1/3 text-xs text-amber-800/80 leading-relaxed font-medium bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                                                <strong className="block mb-1 text-amber-900">Not:</strong>
                                                Belirttiğiniz saatler tercih niteliğindedir. İş yoğunluğuna göre sistem veya yöneticiniz tarafından güncellenebilir.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECURITY - Re-styled */}
                            {activeTab === 'security' && (
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                                    <div className="flex gap-6 items-start mb-10">
                                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                                            <Lock size={24} className="text-red-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">Güvenlik Ayarları</h3>
                                            <p className="text-slate-500 mt-1 max-w-xl">
                                                Hesabınızın güvenliği için güçlü bir şifre kullanmanızı öneririz.
                                                Şifrenizi değiştirdikten sonra tüm oturumlarınız kapatılabilir.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="max-w-lg space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700">Mevcut Şifre</label>
                                            <input
                                                type="password"
                                                value={formData.old_password}
                                                onChange={e => setFormData({ ...formData, old_password: e.target.value })}
                                                disabled={!isEditable}
                                                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none ${!isEditable ? 'opacity-60 cursor-not-allowed' : 'bg-white'}`}
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        <div className="h-px bg-slate-100 my-2"></div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700">Yeni Şifre</label>
                                            <input
                                                type="password"
                                                value={formData.new_password}
                                                onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-slate-700">Yeni Şifre (Tekrar)</label>
                                            <input
                                                type="password"
                                                value={formData.confirm_password}
                                                onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Floating Action Bar (Bottom Right) inside content area if needed, or stick to layout */}
                {(isEditable || activeTab === 'substitutes') && activeTab !== 'general' && (
                    <div className="max-w-5xl mx-auto px-12 pb-12 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 font-inter rounded-2xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    İşleniyor...
                                </span>
                            ) : (
                                <span className="flex items-center gap-3">
                                    <Save size={20} className="group-hover:scale-110 transition-transform" />
                                    Değişiklikleri Kaydet
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Success Message Toast */}
                {successMessage && (
                    <div className="fixed bottom-8 right-8 animate-in fade-in slide-in-from-bottom-6 duration-300 z-50">
                        <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-4">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <Shield size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold">Başarılı</h4>
                                <p className="text-sm text-emerald-100">{successMessage}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
