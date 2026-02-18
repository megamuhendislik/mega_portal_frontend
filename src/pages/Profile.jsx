
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    User, Phone, MapPin, Shield, Briefcase,
    Calendar, Save, Lock, Building, AlertTriangle,
    CheckCircle
} from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        phone_secondary: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    const mustChangePassword = user?.must_change_password || false;

    // Auto-switch to security tab if password change is required
    useEffect(() => {
        if (mustChangePassword && activeTab === 'general') {
            setActiveTab('security');
        }
    }, [mustChangePassword]);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                email: user.email || '',
                phone_secondary: user.phone_secondary || '',
                address: user.address || '',
                emergency_contact_name: user.emergency_contact_name || '',
                emergency_contact_phone: user.emergency_contact_phone || '',
            }));
        }
    }, [user]);


    const handleSave = async () => {
        setLoading(true);
        setSuccessMessage('');
        try {
            if (activeTab === 'security') {
                if (!formData.old_password || !formData.new_password) {
                    alert('Eski ve yeni şifre gereklidir.');
                    setLoading(false);
                    return;
                }
                if (formData.new_password.length < 6) {
                    alert('Yeni şifre en az 6 karakter olmalıdır.');
                    setLoading(false);
                    return;
                }
                if (formData.new_password !== formData.confirm_password) {
                    alert('Yeni şifreler eşleşmiyor!');
                    setLoading(false);
                    return;
                }
                await api.post('/employees/change_password/', {
                    old_password: formData.old_password,
                    new_password: formData.new_password
                });
                setSuccessMessage('Şifreniz başarıyla değiştirildi.');
                setFormData(prev => ({ ...prev, old_password: '', new_password: '', confirm_password: '' }));
                setTimeout(() => window.location.reload(), 1500);
            } else {
                // Contact save
                const payload = {};
                if (activeTab === 'contact') {
                    payload.email = formData.email;
                    payload.phone_secondary = formData.phone_secondary;
                    payload.address = formData.address;
                    payload.emergency_contact_name = formData.emergency_contact_name;
                    payload.emergency_contact_phone = formData.emergency_contact_phone;
                }
                await api.patch('/employees/me/', payload);
                setSuccessMessage('Bilgileriniz başarıyla güncellendi.');
                setTimeout(() => {
                    setSuccessMessage('');
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error('Update failed:', error);
            const msg = error.response?.data?.error
                || error.response?.data?.detail
                || (typeof error.response?.data === 'object' ? JSON.stringify(error.response.data) : null)
                || 'Güncelleme sırasında bir hata oluştu.';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const tabs = [
        { id: 'general', label: 'Genel Bilgiler', icon: User },
        { id: 'contact', label: 'Kişisel Bilgiler', icon: MapPin },
        ...(mustChangePassword ? [{ id: 'security', label: 'Güvenlik', icon: Lock, badge: true }] : []),
    ];

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-inter">
            {/* Sidebar */}
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
                                <div className="relative z-10 flex items-center gap-4 flex-1">
                                    <Icon size={20} className={`transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    <span className="tracking-wide">{tab.label}</span>
                                    {tab.badge && (
                                        <span className="ml-auto w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    )}
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
                    {/* Password change banner — always visible at top when flag is set */}
                    {mustChangePassword && activeTab !== 'security' && (
                        <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-5 shadow-sm">
                            <div className="p-3 bg-amber-100 rounded-full shrink-0">
                                <AlertTriangle size={24} className="text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-amber-900 text-lg">Şifrenizi Değiştirmeniz Gerekiyor</h4>
                                <p className="text-amber-800/80 mt-1 leading-relaxed">
                                    Hesap güvenliğiniz için şifrenizi değiştirmeniz gerekmektedir.
                                    Lütfen <b>Güvenlik</b> sekmesine giderek yeni bir şifre belirleyiniz.
                                </p>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors"
                                >
                                    Şifre Değiştir
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h1>
                        <p className="text-slate-500 mt-2 text-lg">
                            {activeTab === 'general' && 'Kurumsal bilgilerinizi buradan görüntüleyebilirsiniz.'}
                            {activeTab === 'contact' && 'Kişisel iletişim bilgilerinizi düzenleyebilirsiniz.'}
                            {activeTab === 'security' && 'Hesap güvenlik ayarlarınızı yönetebilirsiniz.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12">
                            {/* ========== GENERAL TAB (read-only) ========== */}
                            {activeTab === 'general' && (
                                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                                    <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 relative">
                                        <div className="absolute inset-0 bg-grid-slate-700/[0.1] bg-[size:20px_20px]"></div>
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
                                                <InfoRow icon={<Shield size={16} />} label="TC Kimlik No" value={user.tc_number ? '***' + user.tc_number.slice(-4) : '-'} />
                                                <InfoRow icon={<Calendar size={16} />} label="Doğum Tarihi" value={user.birth_date || '-'} />
                                                <InfoRow icon="@" label="E-posta Adresi" value={user.email} />
                                                <InfoRow icon={<Calendar size={16} />} label="İşe Başlama Tarihi" value={user.hired_date || '-'} />
                                                <InfoRow icon={<Phone size={16} />} label="Kurumsal Telefon" value={user.phone || '-'} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm leading-relaxed flex gap-3">
                                                    <Shield size={20} className="shrink-0 mt-0.5 text-amber-600" />
                                                    <div>
                                                        <span className="font-bold block mb-1">Bilgilendirme</span>
                                                        Bu ekrandaki kurumsal bilgiler Sistem Yöneticisi tarafından yönetilmektedir.
                                                        Hatalı bir bilgi olduğunu düşünüyorsanız lütfen sistem yöneticisi ile iletişime geçiniz.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== CONTACT TAB (always editable) ========== */}
                            {activeTab === 'contact' && (
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2 space-y-3">
                                            <label className="block text-sm font-bold text-slate-900">E-posta Adresi</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-slate-400 group-focus-within:text-blue-500 transition-colors font-bold">@</span>
                                                </div>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="ornek@mega.com.tr"
                                                    className="pl-10 w-full bg-white border border-slate-200 rounded-xl py-3.5 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="block text-sm font-bold text-slate-900">Kurumsal Telefon</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Phone size={18} className="text-slate-400" />
                                                </div>
                                                <input
                                                    value={user.phone || ''}
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
                                                    placeholder="05..."
                                                    className="pl-10 w-full bg-white border border-slate-200 rounded-xl py-3.5 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-3">
                                            <label className="block text-sm font-bold text-slate-900">Ev Adresi</label>
                                            <textarea
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Adresinizi giriniz"
                                                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none h-32"
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
                                                    placeholder="Acil durum kişisi adı"
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-sm font-bold text-slate-900">Telefon</label>
                                                <input
                                                    value={formData.emergency_contact_phone}
                                                    onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                                    placeholder="Acil durum telefonu"
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ========== SECURITY TAB ========== */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    {mustChangePassword && (
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-5">
                                            <div className="p-3 bg-amber-100 rounded-full shrink-0">
                                                <AlertTriangle size={24} className="text-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-amber-900 text-lg">Şifre Değişikliği Gerekli</h4>
                                                <p className="text-amber-800/80 mt-1 leading-relaxed">
                                                    Sistem yöneticiniz şifrenizi güncelledi. Hesap güvenliğiniz için lütfen aşağıdan
                                                    yeni bir şifre belirleyiniz.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                                        <div className="flex gap-6 items-start mb-10">
                                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                                                <Lock size={24} className="text-red-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">Şifre Değiştir</h3>
                                                <p className="text-slate-500 mt-1 max-w-xl">
                                                    Hesabınızın güvenliği için güçlü bir şifre kullanmanızı öneririz.
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
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                                                    placeholder="Mevcut şifreniz"
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
                                                    placeholder="En az 6 karakter"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-slate-700">Yeni Şifre (Tekrar)</label>
                                                <input
                                                    type="password"
                                                    value={formData.confirm_password}
                                                    onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                                                    placeholder="Yeni şifrenizi tekrar giriniz"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Save Button — visible on contact, security tabs */}
                {activeTab !== 'general' && (
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
                                    {activeTab === 'security' ? 'Şifreyi Değiştir' : 'Değişiklikleri Kaydet'}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Success Toast */}
                {successMessage && (
                    <div className="fixed bottom-8 right-8 animate-in fade-in slide-in-from-bottom-6 duration-300 z-50">
                        <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-4">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <CheckCircle size={18} />
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

// Simple read-only info row component
const InfoRow = ({ icon, label, value }) => (
    <div className="group">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block group-hover:text-blue-600 transition-colors">{label}</label>
        <div className="text-lg font-medium text-slate-900 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                {typeof icon === 'string' ? icon : icon}
            </div>
            {value}
        </div>
    </div>
);

export default Profile;
