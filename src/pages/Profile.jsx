import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Briefcase, Building, Calendar, MapPin, Shield } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();

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
                {/* Cover Image - Road Construction Theme */}
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
                            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm">
                                Profili Düzenle
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                    {user.user?.username || user.username}
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

                {/* Right Column - Status & Meta */}
                <div className="space-y-6">
                    <div className="card bg-slate-900 text-white border-none">
                        <h3 className="text-lg font-bold mb-4 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-400" />
                            Hesap Durumu
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                <span className="text-slate-400">Durum</span>
                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-sm font-medium border border-emerald-500/30">Aktif</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                <span className="text-slate-400">Çalışan Kodu</span>
                                <span className="font-mono text-slate-200">{user.employee_code}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                                <span className="text-slate-400">İşe Giriş</span>
                                <span className="text-slate-200">{user.hired_date || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Hızlı İşlemler</h3>
                        <div className="space-y-2">
                            <button className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-100">
                                Şifre Değiştir
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-100">
                                İzin Talebi Oluştur
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border border-transparent hover:border-slate-100">
                                Bordro Görüntüle
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
