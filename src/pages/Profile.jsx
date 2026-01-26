
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
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Hesap Ayarları</h2>
                    <p className="text-sm text-slate-500 mt-1">Profilinizi ve tercihlerinizi yönetin.</p>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${isActive
                                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-600 text-xs">
                                {user.username?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-800 truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto p-8 lg:p-12">
                    {/* Header for Mobile/Context */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Bu bölümdeki bilgileri aşağıdan görüntüleyebilir veya düzenleyebilirsiniz.
                        </p>
                    </div>

                    {!isEditable && activeTab !== 'substitutes' && activeTab !== 'general' && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                            <Shield size={20} className="shrink-0" />
                            <div>
                                <h4 className="font-bold">Profiliniz Kilitli</h4>
                                <p>Kişisel bilgilerinizi ve şifrenizi güncellemek için Yöneticinizden veya İK departmanından <b>geçici düzenleme izni</b> talep etmeniz gerekmektedir.</p>
                                <p className="mt-1 text-xs opacity-70">Vekalet yönetimi her zaman açıktır.</p>
                            </div>
                        </div>
                    )}

                    {isEditable && activeTab !== 'substitutes' && activeTab !== 'general' && (
                        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3 text-green-800 text-sm animate-pulse-slow">
                            <Settings size={20} className="shrink-0" />
                            <div>
                                <h4 className="font-bold">Düzenleme Modu Aktif</h4>
                                <p>Şu anda bilgilerinizi güncelleyebilirsiniz. İşlem sonrası (veya şifre değişiminden sonra) mod otomatik olarak kapanacaktır.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="divide-y divide-slate-100">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Soyad</label>
                                            <div className="mt-1 font-medium text-slate-900">{user.first_name} {user.last_name}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Departman</label>
                                            <div className="mt-1 font-medium text-slate-900 flex items-center gap-2">
                                                <Building size={16} className="text-slate-400" />
                                                {user.department?.name || '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-posta</label>
                                            <div className="mt-1 font-medium text-slate-900">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unvan</label>
                                            <div className="mt-1 font-medium text-slate-900 flex items-center gap-2">
                                                <Briefcase size={16} className="text-slate-400" />
                                                {user.job_position?.name || '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Çalışan Kodu</label>
                                            <div className="mt-1 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded text-slate-700 text-sm">
                                                #{user.employee_code}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">İşe Başlama</label>
                                            <div className="mt-1 font-medium text-slate-900 flex items-center gap-2">
                                                <Calendar size={16} className="text-slate-400" />
                                                {user.hired_date || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 text-xs text-slate-500 flex items-center gap-2">
                                    <Shield size={14} /> Bu bilgiler İK tarafından yönetilmektedir. Değişiklik için lütfen İK ile iletişime geçiniz.
                                </div>
                            </div>
                        )}

                        {/* CONTACT TAB */}
                        {activeTab === 'contact' && (
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Cep Telefonu</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                            <Phone size={16} className="text-slate-400 mr-2" />
                                            <input
                                                value={formData.phone}
                                                // Phone is usually managed by Admin/HR in many systems, but let's allow basic edit or at least secondary
                                                disabled // Let's keep primary phone read-only based on general assumption, or enable if requested. Stick to secondary for now as per serializer.
                                                className="bg-transparent w-full text-slate-500 outline-none cursor-not-allowed"
                                                readOnly
                                            />
                                            <span className="text-xs text-amber-500 font-bold ml-2">İK</span>
                                        </div>
                                        <p className="text-xs text-slate-400">Kurumsal numara değişikliği için İK'ya başvurunuz.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">İkinci Telefon</label>
                                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                            <Phone size={16} className="text-slate-400 mr-2" />
                                            <input
                                                value={formData.phone_secondary}
                                                onChange={e => setFormData({ ...formData, phone_secondary: e.target.value })}
                                                className="bg-transparent w-full text-slate-700 outline-none font-medium"
                                                placeholder="05..."
                                                disabled={!isEditable}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Ev Adresi</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className={`w-full bg-white border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 resize-none h-24 ${!isEditable ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                                            placeholder="Açık adresiniz..."
                                            disabled={!isEditable}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Shield size={16} className="text-red-500" />
                                        Acil Durum Kişisi
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-600">Ad Soyad</label>
                                            <input
                                                value={formData.emergency_contact_name}
                                                onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                                className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 ${!isEditable ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                                                disabled={!isEditable}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-600">Yakınlık / Telefon</label>
                                            <input
                                                value={formData.emergency_contact_phone}
                                                onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                                className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 ${!isEditable ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                                                disabled={!isEditable}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SUBSTITUTES TAB */}
                        {activeTab === 'substitutes' && (
                            <div className="p-6">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex gap-4">
                                    <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-indigo-900 text-sm">Vekalet Sistemi</h4>
                                        <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
                                            Seçtiğiniz kişiler, siz izinli olduğunuzda veya müsait olmadığınızda onay süreçlerinde sizin yetkilerinizi kullanabilir.
                                            Bu işlem, iş sürekliliğini sağlamak adına önemlidir.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Tanımlı Vekiller</label>
                                    <div className="relative">
                                        <select
                                            multiple
                                            value={formData.substitutes}
                                            onChange={e => {
                                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                                setFormData({ ...formData, substitutes: selected });
                                            }}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none h-64 custom-scrollbar shadow-sm"
                                        >
                                            {allEmployees.map(emp => (
                                                <option key={emp.id} value={emp.id} className="py-2 px-2 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer rounded">
                                                    {emp.first_name} {emp.last_name} — {emp.job_position?.name || 'Pozisyonsuz'} ({emp.department?.name})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-400 mt-2 text-right">
                                            Birden fazla kişi seçmek için <kbd className="font-sans bg-slate-100 px-1 rounded border border-slate-200">CTRL</kbd> tuşuna basılı tutarak seçim yapınız.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PREFERENCES TAB */}
                        {activeTab === 'preferences' && (
                            <div className="p-6 space-y-8">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Mesai Bilgileri</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="block text-xs text-slate-400 mb-1">Mesai Başlangıç</span>
                                            <span className="block font-mono font-bold text-slate-700">{user.employee?.shift_start || '09:00'}</span>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="block text-xs text-slate-400 mb-1">Mesai Bitiş</span>
                                            <span className="block font-mono font-bold text-slate-700">{user.employee?.shift_end || '18:00'}</span>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <span className="block text-xs text-slate-400 mb-1">Mola Hakkı</span>
                                            <span className="block font-mono font-bold text-slate-700">{user.employee?.daily_break_allowance || '60'} dk</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400">Bu saatler vardiya planınıza göre otomatik belirlenmektedir.</p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Kişisel Tercihler</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Öğle Yemeği Çıkış</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_start}
                                                onChange={e => setFormData({ ...formData, lunch_start: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Öğle Yemeği Dönüş</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_end}
                                                onChange={e => setFormData({ ...formData, lunch_end: e.target.value })}
                                                className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 ${!isEditable ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                                                disabled={!isEditable}
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg border border-amber-100 flex items-start gap-2">
                                        <Bell size={14} className="mt-0.5 shrink-0" />
                                        Yemek saatleri tercihinizdir. Yoğunluk durumunda sistem veya yöneticiniz tarafından güncellenebilir.
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* SECURITY TAB */}
                        {activeTab === 'security' && (
                            <div className="p-6 space-y-8">
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex gap-4">
                                    <div className="bg-red-100 text-red-600 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                                        <Lock size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-red-900 text-sm">Şifre Değişikliği</h4>
                                        <p className="text-xs text-red-700/80 mt-1 leading-relaxed">
                                            Hesap güvenliğiniz için şifrenizi düzenli aralıklarla değiştirmeniz önerilir.
                                            Şifre değişikliği sonrası oturumunuz sonlanabilir.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6 max-w-md">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Mevcut Şifre</label>
                                        <input
                                            type="password"
                                            value={formData.old_password}
                                            onChange={e => setFormData({ ...formData, old_password: e.target.value })}
                                            className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium text-slate-700 ${!isEditable ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                                            placeholder="••••••••"
                                            disabled={!isEditable}
                                        />
                                        placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Yeni Şifre</label>
                                        <input
                                            type="password"
                                            value={formData.new_password}
                                            onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium text-slate-700"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Yeni Şifre (Tekrar)</label>
                                        <input
                                            type="password"
                                            value={formData.confirm_password}
                                            onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium text-slate-700"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Bar (Only for editable tabs) */}
                    {activeTab !== 'general' && ( // Proxy tab (substitutes) has its own state but share this save button? No, substitutes updates via handleSave too.
                        // We must ensure handleSave works for substitutes even if isEditable is false.
                        <div className="mt-6 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                {successMessage && <span className="text-emerald-600 font-bold flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> {successMessage}</span>}
                            </p>

                            {(isEditable || activeTab === 'substitutes') && (
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className={`px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2`}
                                >
                                    {loading ? 'Kaydediliyor...' : <><Save size={18} /> Değişiklikleri Kaydet</>}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
