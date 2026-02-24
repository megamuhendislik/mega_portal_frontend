
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    User, Phone, MapPin, Shield, Mail,
    Calendar, Save, Lock, Building, AlertTriangle,
    CheckCircle, Hash, Bell, Eye, EyeOff,
    Pencil, Briefcase, Heart, Fingerprint
} from 'lucide-react';

/* ══════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════ */

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
    leave_approved: { label: 'İzin Onaylandı', desc: 'İzin talebiniz onaylandığında bildirim alın.', color: 'emerald' },
    leave_rejected: { label: 'İzin Reddedildi', desc: 'İzin talebiniz reddedildiğinde bildirim alın.', color: 'rose' },
    overtime_approved: { label: 'Mesai Onaylandı', desc: 'Mesai talebiniz onaylandığında bildirim alın.', color: 'emerald' },
    overtime_rejected: { label: 'Mesai Reddedildi', desc: 'Mesai talebiniz reddedildiğinde bildirim alın.', color: 'rose' },
    substitute_requests: { label: 'Vekâlet Talepleri', desc: 'Vekâlet olarak atandığınızda veya talep geldiğinde bildirim alın.', color: 'amber' },
    escalation_alerts: { label: 'Eskalasyon Uyarıları', desc: 'Bir talep size iletildiğinde bildirim alın.', color: 'orange' },
    system_announcements: { label: 'Sistem Duyuruları', desc: 'Genel sistem duyurularını alın.', color: 'blue' },
};

const NOTIFICATION_ICONS = {
    leave_approved: CheckCircle,
    leave_rejected: AlertTriangle,
    overtime_approved: CheckCircle,
    overtime_rejected: AlertTriangle,
    substitute_requests: User,
    escalation_alerts: Bell,
    system_announcements: Bell,
};

/* ══════════════════════════════════════════════
   Profile Component
   ══════════════════════════════════════════════ */

const Profile = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });

    const [formData, setFormData] = useState({
        email: '',
        tc_number: '',
        birth_date: '',
        phone: '',
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
                tc_number: user.tc_number || '',
                birth_date: user.birth_date || '',
                phone: user.phone || '',
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
            } else if (activeTab === 'general') {
                const payload = {
                    email: formData.email,
                    tc_number: formData.tc_number,
                    birth_date: formData.birth_date || null,
                    phone: formData.phone,
                };
                await api.patch('/employees/me/', payload);
                setSuccessMessage('Kişisel bilgileriniz güncellendi.');
                setTimeout(() => {
                    setSuccessMessage('');
                    window.location.reload();
                }, 1500);
            } else {
                const payload = {
                    email: formData.email,
                    phone_secondary: formData.phone_secondary,
                    address: formData.address,
                    emergency_contact_name: formData.emergency_contact_name,
                    emergency_contact_phone: formData.emergency_contact_phone,
                };
                await api.patch('/employees/me/', payload);
                setSuccessMessage('İletişim bilgileriniz güncellendi.');
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
        { id: 'general', label: 'Profilim', icon: User, desc: 'Kişisel bilgiler' },
        { id: 'contact', label: 'İletişim', icon: Phone, desc: 'Adres & acil durum' },
        { id: 'notifications', label: 'Bildirimler', icon: Bell, desc: 'Tercihler' },
        { id: 'security', label: 'Güvenlik', icon: Lock, badge: mustChangePassword, desc: 'Şifre yönetimi' },
    ];

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-[#f8f9fb]">

            {/* ── Sidebar ── */}
            <aside className="w-full lg:w-[280px] bg-white/80 backdrop-blur-sm border-b lg:border-b-0 lg:border-r border-slate-200/60 flex flex-col lg:shrink-0">

                {/* Avatar + name block */}
                <div className="p-6 pb-5">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg"
                                style={{
                                    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d9488 100%)',
                                    boxShadow: '0 8px 32px -8px rgba(13,148,136,0.4)',
                                }}
                            >
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[2.5px] border-white flex items-center justify-center">
                                <CheckCircle size={10} className="text-white" />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold text-slate-900 truncate leading-tight">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{user.job_position?.name || 'Çalışan'}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    <Hash size={9} />
                                    {user.employee_code}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                {/* Tab navigation */}
                <nav className="flex-1 overflow-x-auto lg:overflow-x-visible overflow-y-auto p-3 flex flex-row lg:flex-col gap-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    group w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                    transition-all duration-300 ease-out text-[13px] font-medium whitespace-nowrap relative
                                    ${isActive
                                        ? 'text-slate-900 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/80'
                                    }
                                `}
                                style={isActive ? {
                                    background: 'linear-gradient(135deg, rgba(15,23,42,0.04) 0%, rgba(13,148,136,0.06) 100%)',
                                    border: '1px solid rgba(13,148,136,0.12)',
                                } : { border: '1px solid transparent' }}
                            >
                                <div className={`
                                    w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                                    ${isActive
                                        ? 'bg-gradient-to-br from-slate-800 to-teal-700 shadow-md'
                                        : 'bg-transparent group-hover:bg-slate-100'
                                    }
                                `}
                                    style={isActive ? { boxShadow: '0 4px 12px -2px rgba(13,148,136,0.3)' } : {}}
                                >
                                    <Icon size={14} className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'}`} />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className={`leading-tight ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
                                    <span className={`text-[10px] mt-0.5 hidden lg:block ${isActive ? 'text-teal-600/70' : 'text-slate-300'}`}>{tab.desc}</span>
                                </div>
                                {tab.badge && (
                                    <span className="ml-auto w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Sidebar footer */}
                <div className="hidden lg:block p-4 mx-3 mb-3 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50/50 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <Building size={14} className="text-teal-600 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Departman</p>
                            <p className="text-xs font-semibold text-slate-700 truncate">{user.department?.name || '—'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">

                    {/* Password change banner */}
                    {mustChangePassword && activeTab !== 'security' && (
                        <div
                            className="mb-6 rounded-2xl p-4 flex items-center gap-4 border border-amber-200/60 animate-fade-in"
                            style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)' }}
                        >
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                                <AlertTriangle size={18} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-900">Şifre Değişikliği Gerekli</p>
                                <p className="text-xs text-amber-700/70 mt-0.5">Güvenliğiniz için lütfen şifrenizi güncelleyiniz.</p>
                            </div>
                            <button
                                onClick={() => setActiveTab('security')}
                                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shrink-0 shadow-lg shadow-amber-500/20"
                            >
                                Şifre Değiştir
                            </button>
                        </div>
                    )}

                    {/* ═══════ GENERAL TAB ═══════ */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">

                            {/* Hero profile card */}
                            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200/60">
                                <div
                                    className="h-32 md:h-36 relative overflow-hidden"
                                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0d9488 80%, #14b8a6 100%)' }}
                                >
                                    {/* Mesh pattern */}
                                    <div className="absolute inset-0 opacity-[0.08]" style={{
                                        backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                                            radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                                            radial-gradient(circle at 60% 80%, white 1px, transparent 1px)`,
                                        backgroundSize: '60px 60px, 40px 40px, 50px 50px'
                                    }} />
                                    {/* Floating orb decorations */}
                                    <div className="absolute top-4 right-12 w-20 h-20 rounded-full bg-teal-400/20 blur-2xl" />
                                    <div className="absolute bottom-0 left-1/4 w-32 h-16 rounded-full bg-blue-400/15 blur-2xl" />
                                </div>
                                <div className="bg-white px-6 md:px-8 pb-6 -mt-12 md:-mt-14 relative">
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-100 shrink-0">
                                            <div
                                                className="w-full h-full rounded-xl flex items-center justify-center text-white text-3xl md:text-4xl font-bold"
                                                style={{
                                                    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d9488 100%)',
                                                    fontFamily: 'Outfit, sans-serif',
                                                    letterSpacing: '0.05em',
                                                }}
                                            >
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 pb-1">
                                            <h2 className="text-xl md:text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                                {user.first_name} {user.last_name}
                                            </h2>
                                            <p className="text-sm text-slate-500 mt-0.5">{user.job_position?.name || 'Pozisyon belirtilmemiş'}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pb-1 shrink-0">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-teal-50/50 border border-teal-200/40 rounded-lg text-xs font-semibold text-slate-600">
                                                <Building size={12} className="text-teal-600" />
                                                {user.department?.name || '—'}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-lg text-xs font-semibold text-slate-500">
                                                <Hash size={12} />
                                                {user.employee_code}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Editable personal info */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="px-6 md:px-8 pt-6 pb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #0f172a, #0d9488)', boxShadow: '0 4px 12px -2px rgba(13,148,136,0.3)' }}
                                        >
                                            <Pencil size={14} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Kişisel Bilgiler</h3>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Bu alanları doğrudan düzenleyebilirsiniz</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 md:px-8 pb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* TC Kimlik No */}
                                        <ProfileField
                                            icon={Fingerprint}
                                            label="TC Kimlik No"
                                            value={formData.tc_number}
                                            onChange={v => setFormData({ ...formData, tc_number: v })}
                                            placeholder="11 haneli TC Kimlik No"
                                            maxLength={11}
                                        />

                                        {/* Doğum Tarihi */}
                                        <ProfileField
                                            icon={Calendar}
                                            label="Doğum Tarihi"
                                            value={formData.birth_date}
                                            onChange={v => setFormData({ ...formData, birth_date: v })}
                                            type="date"
                                        />

                                        {/* E-posta */}
                                        <ProfileField
                                            icon={Mail}
                                            label="E-posta Adresi"
                                            value={formData.email}
                                            onChange={v => setFormData({ ...formData, email: v })}
                                            placeholder="ornek@mega.com.tr"
                                            type="email"
                                        />

                                        {/* Telefon */}
                                        <ProfileField
                                            icon={Phone}
                                            label="Telefon"
                                            value={formData.phone}
                                            onChange={v => setFormData({ ...formData, phone: v })}
                                            placeholder="05XX XXX XX XX"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Read-only corporate info */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="px-6 md:px-8 pt-6 pb-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                                        <Briefcase size={14} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Kurumsal Bilgiler</h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Sistem yöneticisi tarafından yönetilir</p>
                                    </div>
                                </div>
                                <div className="px-6 md:px-8 pb-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        <ReadOnlyField icon={Calendar} label="İşe Başlama Tarihi" value={user.hired_date || '—'} />
                                        <ReadOnlyField icon={Building} label="Departman" value={user.department?.name || '—'} />
                                        <ReadOnlyField icon={Briefcase} label="Pozisyon" value={user.job_position?.name || '—'} />
                                        <ReadOnlyField icon={Hash} label="Sicil No" value={user.employee_code || '—'} />
                                    </div>
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end pt-1">
                                <PrimaryButton onClick={handleSave} loading={loading} label="Değişiklikleri Kaydet" icon={Save} />
                            </div>
                        </div>
                    )}

                    {/* ═══════ CONTACT TAB ═══════ */}
                    {activeTab === 'contact' && (
                        <div className="space-y-6 animate-fade-in">

                            {/* Contact form */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="px-6 md:px-8 pt-6 pb-4 flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', boxShadow: '0 4px 12px -2px rgba(59,130,246,0.3)' }}
                                    >
                                        <MapPin size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>İletişim Bilgileri</h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Adres ve telefon bilgileriniz</p>
                                    </div>
                                </div>

                                <div className="px-6 md:px-8 pb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Personal phone */}
                                        <ProfileField
                                            icon={Phone}
                                            label="Şahsi Telefon"
                                            value={formData.phone_secondary}
                                            onChange={v => setFormData({ ...formData, phone_secondary: v })}
                                            placeholder="05XX XXX XX XX"
                                        />

                                        {/* spacer for grid alignment */}
                                        <div className="hidden md:block" />

                                        {/* Address - full width */}
                                        <div className="md:col-span-2">
                                            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                <MapPin size={12} className="text-slate-400" />
                                                Ev Adresi
                                            </label>
                                            <textarea
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Adresinizi giriniz"
                                                rows={3}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all duration-300 outline-none resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency contact */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="px-6 md:px-8 pt-6 pb-4 flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)', boxShadow: '0 4px 12px -2px rgba(220,38,38,0.25)' }}
                                    >
                                        <Heart size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Acil Durum İletişimi</h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Acil durumda ulaşılacak kişi bilgileri</p>
                                    </div>
                                </div>

                                <div className="px-6 md:px-8 pb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <ProfileField
                                            icon={User}
                                            label="Ad Soyad"
                                            value={formData.emergency_contact_name}
                                            onChange={v => setFormData({ ...formData, emergency_contact_name: v })}
                                            placeholder="Acil durum kişisi"
                                        />
                                        <ProfileField
                                            icon={Phone}
                                            label="Telefon"
                                            value={formData.emergency_contact_phone}
                                            onChange={v => setFormData({ ...formData, emergency_contact_phone: v })}
                                            placeholder="Acil durum telefonu"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end pt-1">
                                <PrimaryButton onClick={handleSave} loading={loading} label="Değişiklikleri Kaydet" icon={Save} />
                            </div>
                        </div>
                    )}

                    {/* ═══════ NOTIFICATIONS TAB ═══════ */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="px-6 md:px-8 pt-6 pb-4 flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', boxShadow: '0 4px 12px -2px rgba(124,58,237,0.3)' }}
                                    >
                                        <Bell size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Bildirim Tercihleri</h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Hangi durumlarda bildirim almak istediğinizi seçin</p>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100/80">
                                    {Object.entries(NOTIFICATION_LABELS).map(([key, { label, desc }]) => {
                                        const NIcon = NOTIFICATION_ICONS[key] || Bell;
                                        const isOn = notifPrefs[key] ?? true;
                                        return (
                                            <label
                                                key={key}
                                                className="flex items-center justify-between px-6 md:px-8 py-4 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3.5 flex-1 min-w-0 mr-4">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${isOn ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-300'}`}>
                                                        <NIcon size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                                                    </div>
                                                </div>
                                                <div className="relative shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isOn}
                                                        onChange={e => setNotifPrefs(prev => ({ ...prev, [key]: e.target.checked }))}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-12 h-[26px] bg-slate-200 rounded-full peer peer-checked:bg-teal-500 transition-colors duration-300 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all after:duration-300 peer-checked:after:translate-x-[22px] peer-focus:ring-4 peer-focus:ring-teal-500/15" />
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notice */}
                            <div className="flex items-start gap-3 p-4 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-purple-50/50">
                                <Bell size={15} className="text-violet-500 shrink-0 mt-0.5" />
                                <p className="text-[12px] text-violet-700 leading-relaxed">
                                    <span className="font-semibold">Not:</span> Bildirim tercihleriniz anlık olarak kaydedilir.
                                    Kapattığınız bildirim türlerini artık almayacaksınız.
                                </p>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end pt-1">
                                <PrimaryButton onClick={handleSave} loading={loading} label="Tercihleri Kaydet" icon={Save} />
                            </div>
                        </div>
                    )}

                    {/* ═══════ SECURITY TAB ═══════ */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-fade-in">

                            {mustChangePassword && (
                                <div
                                    className="rounded-2xl p-5 flex items-start gap-4 border border-amber-200/60"
                                    style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)' }}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                        <AlertTriangle size={16} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-amber-900 text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Şifre Değişikliği Gerekli</h4>
                                        <p className="text-amber-800/70 text-[12px] mt-1 leading-relaxed">
                                            Sistem yöneticiniz şifrenizi güncelledi. Lütfen yeni bir şifre belirleyiniz.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="px-6 md:px-8 pt-6 pb-4 flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 12px -2px rgba(220,38,38,0.3)' }}
                                    >
                                        <Lock size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Şifre Değiştir</h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Güçlü bir şifre kullanmanızı öneririz</p>
                                    </div>
                                </div>

                                <div className="px-6 md:px-8 pb-6">
                                    <div className="max-w-md space-y-5">
                                        {/* Current password */}
                                        <div>
                                            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                <Lock size={12} className="text-slate-400" />
                                                Mevcut Şifre
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword.old ? 'text' : 'password'}
                                                    value={formData.old_password}
                                                    onChange={e => setFormData({ ...formData, old_password: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all duration-300 outline-none"
                                                    placeholder="Mevcut şifreniz"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(p => ({ ...p, old: !p.old }))}
                                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                                                >
                                                    {showPassword.old ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                                        {/* New password */}
                                        <div>
                                            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                <Shield size={12} className="text-slate-400" />
                                                Yeni Şifre
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword.new ? 'text' : 'password'}
                                                    value={formData.new_password}
                                                    onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all duration-300 outline-none"
                                                    placeholder="En az 6 karakter"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                                                >
                                                    {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Confirm password */}
                                        <div>
                                            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                <CheckCircle size={12} className="text-slate-400" />
                                                Yeni Şifre (Tekrar)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword.confirm ? 'text' : 'password'}
                                                    value={formData.confirm_password}
                                                    onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all duration-300 outline-none"
                                                    placeholder="Yeni şifrenizi tekrar giriniz"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                                                >
                                                    {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Password strength hints */}
                                        {formData.new_password && (
                                            <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-4 space-y-2.5">
                                                <PasswordHint ok={formData.new_password.length >= 6} text="En az 6 karakter" />
                                                <PasswordHint ok={formData.new_password === formData.confirm_password && formData.confirm_password.length > 0} text="Şifreler eşleşiyor" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Save */}
                            <div className="flex justify-end pt-1">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2.5 px-7 py-3 text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                        boxShadow: '0 8px 24px -6px rgba(220,38,38,0.35)',
                                    }}
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
                    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
                        <div
                            className="pl-4 pr-6 py-3.5 rounded-2xl flex items-center gap-3 text-white shadow-2xl"
                            style={{
                                background: 'linear-gradient(135deg, #059669, #0d9488)',
                                boxShadow: '0 20px 40px -8px rgba(5,150,105,0.4)',
                            }}
                        >
                            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0">
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

/* ══════════════════════════════════════════════
   Sub-Components
   ══════════════════════════════════════════════ */

const ProfileField = ({ icon: Icon, label, value, onChange, placeholder, type = 'text', maxLength }) => (
    <div>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <Icon size={12} className="text-slate-400" />
            {label}
        </label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all duration-300 outline-none"
        />
    </div>
);

const ReadOnlyField = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50/80 transition-colors duration-200">
        <div className="w-9 h-9 rounded-lg bg-slate-100/80 flex items-center justify-center shrink-0">
            <Icon size={14} className="text-slate-400" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-slate-700 truncate mt-0.5">{value}</p>
        </div>
    </div>
);

const PrimaryButton = ({ onClick, loading, label, icon: Icon }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2.5 px-7 py-3 text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0d9488 100%)',
            boxShadow: '0 8px 24px -6px rgba(13,148,136,0.35)',
        }}
    >
        {loading ? (
            <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                İşleniyor...
            </>
        ) : (
            <>
                <Icon size={15} />
                {label}
            </>
        )}
    </button>
);

const PasswordHint = ({ ok, text }) => (
    <div className="flex items-center gap-2.5 text-[12px]">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${ok ? 'bg-emerald-100 text-emerald-600 scale-100' : 'bg-slate-200 text-slate-400 scale-90'}`}>
            {ok ? <CheckCircle size={11} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
        </div>
        <span className={`transition-colors duration-300 ${ok ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>{text}</span>
    </div>
);

export default Profile;
