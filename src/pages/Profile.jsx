
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    User, Phone, MapPin, Shield, Mail,
    Calendar, Save, Lock, Building, AlertTriangle,
    CheckCircle, Hash, Bell, Eye, EyeOff
} from 'lucide-react';

const DEFAULT_NOTIFICATION_PREFS = {
    leave_approved: true,
    leave_rejected: true,
    overtime_approved: true,
    overtime_rejected: true,
    substitute_requests: true,
    escalation_alerts: true,
    system_announcements: true,
};

const NOTIFICATION_LABELS = {
    leave_approved: { label: 'İzin Onaylandı', desc: 'İzin talebiniz onaylandığında bildirim alın.' },
    leave_rejected: { label: 'İzin Reddedildi', desc: 'İzin talebiniz reddedildiğinde bildirim alın.' },
    overtime_approved: { label: 'Mesai Onaylandı', desc: 'Mesai talebiniz onaylandığında bildirim alın.' },
    overtime_rejected: { label: 'Mesai Reddedildi', desc: 'Mesai talebiniz reddedildiğinde bildirim alın.' },
    substitute_requests: { label: 'Vekâlet Talepleri', desc: 'Vekâlet olarak atandığınızda veya talep geldiğinde bildirim alın.' },
    escalation_alerts: { label: 'Eskalasyon Uyarıları', desc: 'Bir talep size iletildiğinde bildirim alın.' },
    system_announcements: { label: 'Sistem Duyuruları', desc: 'Genel sistem duyurularını alın.' },
};

const Profile = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });

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

    const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);

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
            if (user.notification_preferences && Object.keys(user.notification_preferences).length > 0) {
                setNotifPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...user.notification_preferences });
            }
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
            } else if (activeTab === 'notifications') {
                await api.patch('/employees/me/', {
                    notification_preferences: notifPrefs
                });
                setSuccessMessage('Bildirim tercihleriniz güncellendi.');
                setTimeout(() => setSuccessMessage(''), 3000);
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
        { id: 'notifications', label: 'Bildirim Ayarları', icon: Bell },
        { id: 'security', label: 'Güvenlik', icon: Lock, badge: mustChangePassword },
    ];

    return (
        <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-80px)] bg-slate-50 overflow-hidden">
            {/* ── Sidebar ── */}
            <aside className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:shrink-0">
                {/* User card */}
                <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/25 shrink-0">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user.job_position?.name || 'Çalışan'}</p>
                        </div>
                    </div>
                </div>

                <div className="mx-5 h-px bg-slate-100" />

                {/* Navigation */}
                <nav className="flex-1 overflow-x-auto md:overflow-x-visible overflow-y-auto px-3 py-3 flex flex-row md:flex-col gap-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 text-[13px] font-medium whitespace-nowrap ${isActive
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isActive ? 'bg-white/15' : 'bg-transparent group-hover:bg-slate-100'}`}>
                                    <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'} />
                                </div>
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-5 md:px-8 md:py-8">
                    {/* Must change password banner */}
                    {mustChangePassword && activeTab !== 'security' && (
                        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                                <AlertTriangle size={18} className="text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-900">Şifre Değişikliği Gerekli</p>
                                <p className="text-xs text-amber-700/80 mt-0.5">Güvenliğiniz için lütfen şifrenizi güncelleyiniz.</p>
                            </div>
                            <button
                                onClick={() => setActiveTab('security')}
                                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0 shadow-sm"
                            >
                                Şifre Değiştir
                            </button>
                        </div>
                    )}

                    {/* Page header */}
                    <div className="mb-6">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {activeTab === 'general' && 'Kurumsal bilgilerinizi buradan görüntüleyebilirsiniz.'}
                            {activeTab === 'contact' && 'Kişisel iletişim bilgilerinizi düzenleyebilirsiniz.'}
                            {activeTab === 'notifications' && 'Hangi bildirimleri almak istediğinizi seçin.'}
                            {activeTab === 'security' && 'Hesap güvenlik ayarlarınızı yönetebilirsiniz.'}
                        </p>
                    </div>

                    {/* ═══════ GENERAL TAB ═══════ */}
                    {activeTab === 'general' && (
                        <div className="space-y-5">
                            {/* Profile hero */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="h-24 md:h-28 bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900 relative">
                                    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                                </div>
                                <div className="px-5 md:px-6 pb-5 -mt-10 md:-mt-12">
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white p-1.5 shadow-lg border border-slate-100 shrink-0">
                                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 pb-0.5">
                                            <h2 className="text-lg md:text-xl font-bold text-slate-900 truncate">{user.first_name} {user.last_name}</h2>
                                            <p className="text-sm text-slate-500 truncate">{user.job_position?.name || 'Pozisyon belirtilmemiş'}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pb-0.5 shrink-0">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                                                <Building size={12} />
                                                {user.department?.name || '—'}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                                                <Hash size={12} />
                                                {user.employee_code}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info grid */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-4">Kurumsal Bilgiler</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                    <InfoField icon={Shield} label="TC Kimlik No" value={user.tc_number ? '•••' + user.tc_number.slice(-4) : '—'} />
                                    <InfoField icon={Calendar} label="Doğum Tarihi" value={user.birth_date || '—'} />
                                    <InfoField icon={Mail} label="E-posta Adresi" value={user.email || '—'} />
                                    <InfoField icon={Calendar} label="İşe Başlama Tarihi" value={user.hired_date || '—'} />
                                    <InfoField icon={Phone} label="Kurumsal Telefon" value={user.phone || '—'} />
                                </div>
                            </div>

                            {/* Notice */}
                            <div className="flex items-start gap-3 p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                                <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[13px] text-blue-800 leading-relaxed">
                                    <span className="font-semibold">Bilgilendirme:</span> Bu ekrandaki kurumsal bilgiler Sistem Yöneticisi tarafından yönetilmektedir.
                                    Hatalı bir bilgi varsa lütfen sistem yöneticisi ile iletişime geçiniz.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ═══════ CONTACT TAB ═══════ */}
                    {activeTab === 'contact' && (
                        <div className="space-y-5">
                            {/* Contact form */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-5">İletişim Bilgileri</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Email - full width */}
                                    <div className="md:col-span-2">
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">E-posta Adresi</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail size={15} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="ornek@mega.com.tr"
                                                className="pl-9 w-full border border-slate-200 rounded-lg py-2.5 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Corporate phone - readonly */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Kurumsal Telefon</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone size={15} className="text-slate-400" />
                                            </div>
                                            <input
                                                value={user.phone || ''}
                                                readOnly
                                                className="pl-9 w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pr-14 text-sm text-slate-400 cursor-not-allowed"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wide">İK</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal phone */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Şahsi Telefon</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone size={15} className="text-slate-400" />
                                            </div>
                                            <input
                                                value={formData.phone_secondary}
                                                onChange={e => setFormData({ ...formData, phone_secondary: e.target.value })}
                                                placeholder="05XX XXX XX XX"
                                                className="pl-9 w-full border border-slate-200 rounded-lg py-2.5 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Address - full width */}
                                    <div className="md:col-span-2">
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Ev Adresi</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Adresinizi giriniz"
                                            rows={3}
                                            className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Emergency contact */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2.5">
                                    <div className="w-7 h-7 bg-red-50 rounded-md flex items-center justify-center">
                                        <AlertTriangle size={14} className="text-red-500" />
                                    </div>
                                    Acil Durum İletişimi
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Ad Soyad</label>
                                        <input
                                            value={formData.emergency_contact_name}
                                            onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                            placeholder="Acil durum kişisi adı"
                                            className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Telefon</label>
                                        <input
                                            value={formData.emergency_contact_phone}
                                            onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                            placeholder="Acil durum telefonu"
                                            className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end">
                                <SaveButton onClick={handleSave} loading={loading} label="Değişiklikleri Kaydet" />
                            </div>
                        </div>
                    )}

                    {/* ═══════ NOTIFICATIONS TAB ═══════ */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-5">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-3 px-5 md:px-6 pt-5 md:pt-6 pb-4">
                                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                                        <Bell size={18} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Bildirim Tercihleri</h3>
                                        <p className="text-xs text-slate-500">Hangi durumlarda bildirim almak istediğinizi seçin.</p>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {Object.entries(NOTIFICATION_LABELS).map(([key, { label, desc }]) => (
                                        <label
                                            key={key}
                                            className="flex items-center justify-between px-5 md:px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex-1 min-w-0 mr-4">
                                                <p className="text-sm font-semibold text-slate-800">{label}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                            </div>
                                            <div className="relative shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={notifPrefs[key] ?? true}
                                                    onChange={e => setNotifPrefs(prev => ({ ...prev, [key]: e.target.checked }))}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:bg-blue-600 transition-colors" />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Notice */}
                            <div className="flex items-start gap-3 p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                                <Bell size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[13px] text-blue-800 leading-relaxed">
                                    <span className="font-semibold">Not:</span> Bildirim tercihleriniz anlık olarak kaydedilir.
                                    Kapattığınız bildirim türlerini artık almayacaksınız.
                                </p>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end">
                                <SaveButton onClick={handleSave} loading={loading} label="Tercihleri Kaydet" />
                            </div>
                        </div>
                    )}

                    {/* ═══════ SECURITY TAB ═══════ */}
                    {activeTab === 'security' && (
                        <div className="space-y-5">
                            {mustChangePassword && (
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
                                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                                        <AlertTriangle size={16} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-amber-900 text-sm">Şifre Değişikliği Gerekli</h4>
                                        <p className="text-amber-800/80 text-[13px] mt-0.5">
                                            Sistem yöneticiniz şifrenizi güncelledi. Lütfen yeni bir şifre belirleyiniz.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                                        <Lock size={18} className="text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Şifre Değiştir</h3>
                                        <p className="text-xs text-slate-500">Güçlü bir şifre kullanmanızı öneririz.</p>
                                    </div>
                                </div>

                                <div className="max-w-md space-y-4">
                                    {/* Current password */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Mevcut Şifre</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.old ? 'text' : 'password'}
                                                value={formData.old_password}
                                                onChange={e => setFormData({ ...formData, old_password: e.target.value })}
                                                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                                placeholder="Mevcut şifreniz"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(p => ({ ...p, old: !p.old }))}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword.old ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100" />

                                    {/* New password */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Yeni Şifre</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.new ? 'text' : 'password'}
                                                value={formData.new_password}
                                                onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                                                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                                placeholder="En az 6 karakter"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm password */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Yeni Şifre (Tekrar)</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.confirm ? 'text' : 'password'}
                                                value={formData.confirm_password}
                                                onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                                placeholder="Yeni şifrenizi tekrar giriniz"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password hints */}
                                    {formData.new_password && (
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                                            <PasswordHint ok={formData.new_password.length >= 6} text="En az 6 karakter" />
                                            <PasswordHint ok={formData.new_password === formData.confirm_password && formData.confirm_password.length > 0} text="Şifreler eşleşiyor" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            İşleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={15} />
                                            Şifreyi Değiştir
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Success toast */}
                {successMessage && (
                    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-emerald-600 text-white pl-4 pr-5 py-3 rounded-xl shadow-xl shadow-emerald-600/20 flex items-center gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle size={14} />
                            </div>
                            <span className="text-sm font-semibold">{successMessage}</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

/* ── Helper Components ── */

const InfoField = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Icon size={15} className="text-slate-500" />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
        </div>
    </div>
);

const SaveButton = ({ onClick, loading, label }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
    >
        {loading ? (
            <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                İşleniyor...
            </>
        ) : (
            <>
                <Save size={15} />
                {label}
            </>
        )}
    </button>
);

const PasswordHint = ({ ok, text }) => (
    <div className="flex items-center gap-2 text-[12px]">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'} transition-colors`}>
            {ok ? <CheckCircle size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
        </div>
        <span className={ok ? 'text-emerald-700 font-medium' : 'text-slate-500'}>{text}</span>
    </div>
);

export default Profile;
