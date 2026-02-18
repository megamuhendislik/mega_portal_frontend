
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    User, Phone, MapPin, Shield, Briefcase, Mail,
    Calendar, Save, Lock, Building, AlertTriangle,
    CheckCircle, Hash
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
                const payload = {
                    email: formData.email,
                    phone_secondary: formData.phone_secondary,
                    address: formData.address,
                    emergency_contact_name: formData.emergency_contact_name,
                    emergency_contact_phone: formData.emergency_contact_phone,
                };
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
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="px-6 pt-6 pb-4">
                    <h2 className="text-lg font-bold text-slate-900">Hesap Ayarları</h2>
                    <p className="text-xs text-slate-500 mt-1">Profilinizi ve tercihlerinizi yönetin.</p>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 space-y-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-[13px] font-medium ${isActive
                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                            >
                                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-slate-900 truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user.job_position?.name || 'Çalışan'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-8 py-8">
                    {/* Password change banner */}
                    {mustChangePassword && activeTab !== 'security' && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-900">
                                    Şifrenizi değiştirmeniz gerekmektedir.
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveTab('security')}
                                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
                            >
                                Şifre Değiştir
                            </button>
                        </div>
                    )}

                    {/* Page Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {activeTab === 'general' && 'Kurumsal bilgilerinizi buradan görüntüleyebilirsiniz.'}
                            {activeTab === 'contact' && 'Kişisel iletişim bilgilerinizi düzenleyebilirsiniz.'}
                            {activeTab === 'security' && 'Hesap güvenlik ayarlarınızı yönetebilirsiniz.'}
                        </p>
                    </div>

                    {/* ========== GENERAL TAB ========== */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Profile Hero */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="h-28 bg-gradient-to-r from-slate-800 via-slate-700 to-blue-900 relative">
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                </div>
                                <div className="px-6 pb-6 -mt-12">
                                    <div className="flex items-end gap-5">
                                        <div className="w-24 h-24 rounded-xl bg-white p-1.5 shadow-lg border border-slate-100 shrink-0">
                                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </div>
                                        </div>
                                        <div className="pb-1 flex-1 min-w-0">
                                            <h2 className="text-xl font-bold text-slate-900 truncate">{user.first_name} {user.last_name}</h2>
                                            <p className="text-sm text-slate-500">{user.job_position?.name || 'Pozisyon belirtilmemiş'}</p>
                                        </div>
                                        <div className="flex gap-2 pb-1 shrink-0">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                                                <Building size={13} />
                                                {user.department?.name || '-'}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                                                <Hash size={13} />
                                                {user.employee_code}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <InfoField icon={Shield} label="TC Kimlik No" value={user.tc_number ? '***' + user.tc_number.slice(-4) : '-'} />
                                    <InfoField icon={Calendar} label="Doğum Tarihi" value={user.birth_date || '-'} />
                                    <InfoField icon={Mail} label="E-posta Adresi" value={user.email || '-'} />
                                    <InfoField icon={Calendar} label="İşe Başlama Tarihi" value={user.hired_date || '-'} />
                                    <InfoField icon={Phone} label="Kurumsal Telefon" value={user.phone || '-'} />
                                </div>
                            </div>

                            {/* Info Notice */}
                            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <Shield size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    <span className="font-semibold">Bilgilendirme:</span> Bu ekrandaki kurumsal bilgiler Sistem Yöneticisi tarafından yönetilmektedir.
                                    Hatalı bir bilgi varsa lütfen sistem yöneticisi ile iletişime geçiniz.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ========== CONTACT TAB ========== */}
                    {activeTab === 'contact' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">E-posta Adresi</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Mail size={16} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="ornek@mega.com.tr"
                                                className="pl-10 w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Kurumsal Telefon</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Phone size={16} className="text-slate-400" />
                                            </div>
                                            <input
                                                value={user.phone || ''}
                                                readOnly
                                                className="pl-10 w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 text-sm text-slate-400 cursor-not-allowed"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">İK</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Şahsi Telefon</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Phone size={16} className="text-slate-400" />
                                            </div>
                                            <input
                                                value={formData.phone_secondary}
                                                onChange={e => setFormData({ ...formData, phone_secondary: e.target.value })}
                                                placeholder="05..."
                                                className="pl-10 w-full border border-slate-200 rounded-lg py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Ev Adresi</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Adresinizi giriniz"
                                            rows={3}
                                            className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <div className="p-1 bg-red-50 rounded text-red-500"><Shield size={14} /></div>
                                    Acil Durum İletişim
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Ad Soyad</label>
                                        <input
                                            value={formData.emergency_contact_name}
                                            onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                            placeholder="Acil durum kişisi adı"
                                            className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Telefon</label>
                                        <input
                                            value={formData.emergency_contact_phone}
                                            onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                            placeholder="Acil durum telefonu"
                                            className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            İşleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Değişiklikleri Kaydet
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========== SECURITY TAB ========== */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {mustChangePassword && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-amber-900 text-sm">Şifre Değişikliği Gerekli</h4>
                                        <p className="text-amber-800/80 text-sm mt-0.5">
                                            Sistem yöneticiniz şifrenizi güncelledi. Lütfen yeni bir şifre belirleyiniz.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                                        <Lock size={20} className="text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">Şifre Değiştir</h3>
                                        <p className="text-xs text-slate-500">Güçlü bir şifre kullanmanızı öneririz.</p>
                                    </div>
                                </div>

                                <div className="max-w-md space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mevcut Şifre</label>
                                        <input
                                            type="password"
                                            value={formData.old_password}
                                            onChange={e => setFormData({ ...formData, old_password: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                                            placeholder="Mevcut şifreniz"
                                        />
                                    </div>

                                    <div className="h-px bg-slate-100" />

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Yeni Şifre</label>
                                        <input
                                            type="password"
                                            value={formData.new_password}
                                            onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                                            placeholder="En az 6 karakter"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Yeni Şifre (Tekrar)</label>
                                        <input
                                            type="password"
                                            value={formData.confirm_password}
                                            onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                                            placeholder="Yeni şifrenizi tekrar giriniz"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            İşleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={16} />
                                            Şifreyi Değiştir
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Success Toast */}
                {successMessage && (
                    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
                            <CheckCircle size={18} />
                            <span className="text-sm font-semibold">{successMessage}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoField = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Icon size={16} className="text-slate-500" />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
        </div>
    </div>
);

export default Profile;
