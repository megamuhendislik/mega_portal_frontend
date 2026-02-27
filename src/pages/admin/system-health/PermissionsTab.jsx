import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

import {
    ArrowPathIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';

export default function PermissionsTab() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('health'); // 'health' or 'matrix'

    useEffect(() => {
        if (viewMode === 'health') runScan();
    }, [viewMode]);

    const runScan = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/check-permissions/');
            setReport(res.data);
        } catch (e) {
            console.error("Scan error", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-center bg-gray-100 p-1 rounded-lg w-fit mx-auto">
                <button
                    onClick={() => setViewMode('health')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'health' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Sağlık Kontrolü
                </button>
                <button
                    onClick={() => setViewMode('matrix')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'matrix' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Detaylı Yetki Matrisi
                </button>
            </div>

            {viewMode === 'health' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                    {/* LEFT: STATUS CARD - Existing Logic */}
                    {loading && !report ? (
                        <div className="col-span-2 p-12 text-center text-gray-500 animate-pulse">Yetki taraması yapılıyor...</div>
                    ) : (
                        <PermissionHealthView report={report} loading={loading} runScan={runScan} />
                    )}
                </div>
            ) : (
                <PermissionMatrixView />
            )}
        </div>
    );
}

function PermissionHealthView({ report, loading, runScan }) {
    if (!report) return null;
    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${report?.status === 'healthy' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <KeyIcon className={`w-8 h-8 ${report?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Yetki Sistemi Sağlığı</h3>
                            <p className={`text-sm font-bold ${report?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                                {report?.status === 'healthy' ? 'VERİTABANI KATEGORİLERİ DOĞRU' : 'KATEGORİ HATASI MEVCUT'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={runScan}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
                        title="Taramayı Yenile"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-gray-50 rounded text-sm items-center">
                        <span className="text-gray-600">Toplam Tanımlı Yetki</span>
                        <span className="text-gray-900 font-bold text-lg">{report?.total || 0}</span>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Kategori Dağılımı</h4>
                        <div className="space-y-2">
                            {report?.breakdown?.map((item, idx) => {
                                let colorClass = 'bg-gray-300';
                                if (item.category === 'MENU' || item.category === 'PAGE') colorClass = 'bg-blue-500';
                                else if (item.category === 'ACTION') colorClass = 'bg-orange-400';
                                else if (item.category === 'APPROVAL') colorClass = 'bg-purple-500';
                                else if (item.category === 'SYSTEM') colorClass = 'bg-slate-700';
                                else if (item.category === 'OTHER') colorClass = 'bg-red-500';

                                return (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-600 flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
                                            {item.category || 'TANIMSIZ'}
                                        </span>
                                        <span className="font-mono font-bold text-gray-700">{item.count}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ISSUES ALERT */}
                    {report?.issues?.length > 0 && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-lg mt-4">
                            <h4 className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-4 h-4" /> Tespit Edilen Sorunlar
                            </h4>
                            <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                {report.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: DETAILS */}
            <div className="space-y-6">
                {/* 1. Menu Permission Check */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-2">Menü Erişim Yetkileri (Frontend)</h3>
                    <p className="text-xs text-gray-500 mb-4">
                        "Yetkilendirme ve Roller" sayfasında "Menü Erişimi" sekmesinde görünecek yetkiler.
                    </p>

                    {report?.page_count > 0 ? (
                        <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-100">
                            <CheckCircleIcon className="w-6 h-6" />
                            <div>
                                <div className="font-bold">Doğrulanmış {report.page_count} Adet Yetki Mevcut</div>
                                <div className="text-xs opacity-80">"PAGE" ve diğer kategorilerde kayıtlı.</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-lg border border-red-100">
                            <XCircleIcon className="w-6 h-6" />
                            <div>
                                <div className="font-bold">Kategori Hatası!</div>
                                <div className="text-xs opacity-80">Menü yetkileri veritabanında "MENU" olarak etiketlenmemiş.</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Uncategorized */}
                {report?.uncategorized_count > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-md font-bold text-gray-800">Kategorisiz Yetkiler (OTHER)</h3>
                                <p className="text-xs text-gray-500">
                                    Bu yetkiler "Diğer" kategorisinde kalmış olabilir.
                                </p>
                            </div>
                            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">
                                {report.uncategorized_count} Adet
                            </span>
                        </div>

                        <div className="bg-gray-50 p-0 rounded-lg border border-gray-200 overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-100 text-gray-500 font-semibold sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 border-b">Kod (Code)</th>
                                            <th className="px-4 py-2 border-b">İsim (Name)</th>
                                            <th className="px-4 py-2 border-b">Açıklama</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {(report.uncategorized_list || report.uncategorized_samples || []).map((u, i) => (
                                            <tr key={i} className="hover:bg-white transition-colors">
                                                <td className="px-4 py-2 font-mono text-indigo-600">{u.code}</td>
                                                <td className="px-4 py-2 font-medium text-gray-700">{u.name}</td>
                                                <td className="px-4 py-2 text-gray-500 italic">{u.description || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-gray-100 px-4 py-2 text-[10px] text-gray-400 text-center border-t border-gray-200">
                                Tüm liste gösteriliyor.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function PermissionMatrixView() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState('users'); // users, roles, perms
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('ALL');
    const [filterRole, setFilterRole] = useState('ALL');
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [expandedUser, setExpandedUser] = useState(null);

    useEffect(() => {
        fetchMatrix();
    }, []);

    const fetchMatrix = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/permission-matrix/');
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return <div className="p-12 text-center text-gray-500 animate-pulse">Matris verisi yükleniyor...</div>;
    if (!data) return null;

    // Derive unique departments and roles for filters
    const departments = [...new Set(data.users.map(u => u.department))].filter(Boolean).sort();
    const allRoleKeys = [...new Set(data.users.flatMap(u => u.role_keys || []))].sort();

    // Frontend permission codes that are actually checked in routes/sidebar
    const frontendPagePerms = [
        'PAGE_EMPLOYEES', 'PAGE_ORG_CHART', 'PAGE_WORK_SCHEDULES', 'PAGE_REPORTS',
        'PAGE_SYSTEM_HEALTH', 'PAGE_MEAL_ORDERS', 'PAGE_DATA_MANAGEMENT', 'PAGE_DEBUG', 'PAGE_PROGRAM_MANAGEMENT'
    ];
    const frontendFeaturePerms = [
        'ACTION_ORG_CHART_EDIT', 'FEATURE_BREAK_ANALYSIS', 'SYSTEM_FULL_ACCESS',
        'APPROVAL_LEAVE', 'APPROVAL_OVERTIME', 'APPROVAL_CARDLESS_ENTRY', 'APPROVAL_EXTERNAL_TASK'
    ];
    const allCriticalPerms = [...frontendPagePerms, ...frontendFeaturePerms];

    // Detect issues per user
    const getUserIssues = (user) => {
        const issues = [];
        if (user.is_superuser) return issues; // superuser has everything

        // Check: user has no roles at all
        if (!user.roles || user.roles.length === 0) {
            issues.push({ type: 'warning', msg: 'Hiç rolü yok' });
        }

        // Check: user has no page permissions (can't see anything in sidebar)
        const userPagePerms = frontendPagePerms.filter(p => user.permissions?.includes(p));
        if (userPagePerms.length === 0 && !user.permissions?.includes('SYSTEM_FULL_ACCESS')) {
            issues.push({ type: 'error', msg: 'Hiçbir sayfa yetkisi yok (menü tamamen boş)' });
        }

        // Check: excluded permissions exist
        if (user.excluded_permissions && user.excluded_permissions.length > 0) {
            issues.push({ type: 'info', msg: `${user.excluded_permissions.length} hariç tutulan yetki` });
        }

        // Check: direct permissions exist (unusual)
        if (user.direct_permissions && user.direct_permissions.length > 0) {
            issues.push({ type: 'info', msg: `${user.direct_permissions.length} direkt atanmış yetki` });
        }

        return issues;
    };

    // Filter users
    const filteredUsers = data.users.filter(u => {
        if (searchTerm && !u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) && !u.username.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterDept !== 'ALL' && u.department !== filterDept) return false;
        if (filterRole !== 'ALL' && !(u.role_keys || []).includes(filterRole)) return false;
        if (showOnlyIssues) {
            const issues = getUserIssues(u);
            if (issues.length === 0) return false;
        }
        return true;
    });

    // Category color mapping
    const catColor = (cat) => {
        const colors = {
            'PAGE': 'bg-blue-500', 'MENU': 'bg-blue-400', 'ACTION': 'bg-orange-400',
            'REQUEST': 'bg-amber-500', 'APPROVAL': 'bg-purple-500', 'SYSTEM': 'bg-slate-700',
            'FEATURE': 'bg-teal-500', 'ADMIN': 'bg-red-500', 'ACCOUNTING': 'bg-emerald-500',
            'OTHER': 'bg-gray-400'
        };
        return colors[cat] || 'bg-gray-300';
    };

    const catBadgeColor = (cat) => {
        const colors = {
            'PAGE': 'bg-blue-50 text-blue-700 border-blue-200',
            'MENU': 'bg-blue-50 text-blue-600 border-blue-100',
            'ACTION': 'bg-orange-50 text-orange-700 border-orange-200',
            'REQUEST': 'bg-amber-50 text-amber-700 border-amber-200',
            'APPROVAL': 'bg-purple-50 text-purple-700 border-purple-200',
            'SYSTEM': 'bg-slate-100 text-slate-700 border-slate-300',
            'FEATURE': 'bg-teal-50 text-teal-700 border-teal-200',
            'ADMIN': 'bg-red-50 text-red-700 border-red-200',
            'ACCOUNTING': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
        return colors[cat] || 'bg-gray-100 text-gray-600 border-gray-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* View Selector */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <button
                    onClick={() => setActiveSection('users')}
                    className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all ${activeSection === 'users' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent hover:bg-gray-50 text-gray-500'}`}
                >
                    Kullanıcı Bazlı Yetki Matrisi
                </button>
                <button
                    onClick={() => setActiveSection('roles')}
                    className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all ${activeSection === 'roles' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-transparent hover:bg-gray-50 text-gray-500'}`}
                >
                    Rol Tanımları
                </button>
                <button
                    onClick={() => setActiveSection('perms')}
                    className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all ${activeSection === 'perms' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-transparent hover:bg-gray-50 text-gray-500'}`}
                >
                    Tüm Yetki Havuzu
                </button>
            </div>

            {/* USERS SECTION */}
            {activeSection === 'users' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
                        <input
                            type="text"
                            placeholder="Personel ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 min-w-[200px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                            <option value="ALL">Tüm Departmanlar</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                            <option value="ALL">Tüm Roller</option>
                            {allRoleKeys.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={showOnlyIssues} onChange={e => setShowOnlyIssues(e.target.checked)} className="rounded border-gray-300" />
                            Sadece Sorunlu
                        </label>
                        <span className="text-xs text-gray-400 ml-auto">{filteredUsers.length} / {data.users.length} kişi</span>
                    </div>

                    {/* User Cards */}
                    <div className="space-y-3">
                        {filteredUsers.map(u => {
                            const issues = getUserIssues(u);
                            const isExpanded = expandedUser === u.id;
                            const userPagePerms = frontendPagePerms.filter(p => u.is_superuser || u.permissions?.includes(p));
                            const userFeaturePerms = frontendFeaturePerms.filter(p => u.is_superuser || u.permissions?.includes(p));
                            const totalPerms = u.is_superuser ? data.permissions.length : (u.permissions?.length || 0);

                            return (
                                <div key={u.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${issues.some(i => i.type === 'error') ? 'border-red-200' : issues.some(i => i.type === 'warning') ? 'border-amber-200' : 'border-gray-100'}`}>
                                    {/* Header Row */}
                                    <div
                                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors flex-wrap"
                                        onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${u.is_superuser ? 'bg-gradient-to-br from-red-500 to-pink-600' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}>
                                            {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>

                                        {/* Name & Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800">{u.full_name}</span>
                                                {u.is_superuser && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200">SUPERUSER</span>}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                                                <span>@{u.username}</span>
                                                <span className="text-slate-300 hidden md:inline">|</span>
                                                <span>{u.department}</span>
                                            </div>
                                        </div>

                                        {/* Roles */}
                                        <div className="flex flex-wrap gap-1 max-w-full md:max-w-[300px]">
                                            {u.roles.map(r => (
                                                <span key={r} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-bold">{r}</span>
                                            ))}
                                            {u.roles.length === 0 && <span className="text-xs text-slate-300 italic">Rol yok</span>}
                                        </div>

                                        {/* Perm Count */}
                                        <div className="text-center flex-shrink-0 w-16">
                                            <div className="text-2xl font-black text-slate-700">{u.is_superuser ? '∞' : totalPerms}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Yetki</div>
                                        </div>

                                        {/* Issues */}
                                        <div className="flex-shrink-0 w-8">
                                            {issues.length > 0 ? (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${issues.some(i => i.type === 'error') ? 'bg-red-100' : issues.some(i => i.type === 'warning') ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                                    <ExclamationTriangleIcon className={`w-4 h-4 ${issues.some(i => i.type === 'error') ? 'text-red-600' : issues.some(i => i.type === 'warning') ? 'text-amber-600' : 'text-blue-600'}`} />
                                                </div>
                                            ) : (
                                                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                                            )}
                                        </div>

                                        {/* Expand Arrow */}
                                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                                            {/* Issues List */}
                                            {issues.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {issues.map((issue, i) => (
                                                        <span key={i} className={`px-2 py-1 rounded text-xs font-bold border ${issue.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : issue.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                            {issue.msg}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Page Permissions Grid */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sayfa Erişimleri</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {frontendPagePerms.map(p => {
                                                        const has = u.is_superuser || u.permissions?.includes(p);
                                                        return (
                                                            <span key={p} className={`px-2 py-1 rounded text-[11px] font-mono border ${has ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>
                                                                {p.replace('PAGE_', '')}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Feature Permissions */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Özellik / Aksiyon Yetkileri</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {frontendFeaturePerms.map(p => {
                                                        const has = u.is_superuser || u.permissions?.includes(p);
                                                        return (
                                                            <span key={p} className={`px-2 py-1 rounded text-[11px] font-mono border ${has ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>
                                                                {p}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Direct Permissions */}
                                            {u.direct_permissions && u.direct_permissions.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Direkt Atanmış Yetkiler (Role dışı)</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {u.direct_permissions.map(p => (
                                                            <span key={p} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-mono">{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Excluded Permissions */}
                                            {u.excluded_permissions && u.excluded_permissions.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Hariç Tutulan Yetkiler (Kara Liste)</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {u.excluded_permissions.map(p => (
                                                            <span key={p} className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[11px] font-mono line-through">{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Full Permission List */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                    Tüm Efektif Yetkiler ({u.is_superuser ? 'SINIRSIZ' : u.permissions?.length || 0})
                                                </h4>
                                                <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                                                    {u.is_superuser ? (
                                                        <span className="text-xs text-red-600 font-bold">Superuser — tüm yetkiler bypass edilir</span>
                                                    ) : (u.permissions || []).sort().map(p => (
                                                        <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono border border-gray-200">{p}</span>
                                                    ))}
                                                    {!u.is_superuser && (!u.permissions || u.permissions.length === 0) && (
                                                        <span className="text-xs text-red-500 font-bold">HİÇ YETKİ YOK!</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ROLES SECTION */}
            {activeSection === 'roles' && (
                <div className="grid grid-cols-1 gap-6">
                    {data.roles.map(role => {
                        const usersWithRole = data.users.filter(u => (u.role_keys || []).includes(role.code));
                        return (
                            <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-purple-900 text-lg">{role.name}</h3>
                                        <div className="text-xs text-purple-600 font-mono flex items-center gap-2">
                                            {role.code}
                                            {role.inherits_from && role.inherits_from.length > 0 && (
                                                <span className="text-purple-400">← miras: {role.inherits_from.join(', ')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-purple-700 shadow-sm border border-purple-100">
                                            {role.permissions.length} Yetki
                                        </span>
                                        <span className="bg-purple-100 px-3 py-1 rounded-full text-xs font-bold text-purple-800">
                                            {usersWithRole.length} Kullanıcı
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {role.permissions.sort().map(p => (
                                            <span key={p} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200 font-mono">{p}</span>
                                        ))}
                                        {role.permissions.length === 0 && <span className="text-gray-400 italic text-sm">Bu role tanımlı yetki yok.</span>}
                                    </div>
                                    {usersWithRole.length > 0 && (
                                        <div className="border-t border-gray-100 pt-3">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Bu role sahip kullanıcılar</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {usersWithRole.map(u => (
                                                    <span key={u.id} className="px-2 py-1 bg-slate-50 text-slate-700 rounded text-xs border border-slate-200">
                                                        {u.full_name} <span className="text-slate-400">({u.department})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* PERMISSIONS POOL SECTION */}
            {activeSection === 'perms' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-emerald-50 flex justify-between items-center">
                        <h3 className="font-bold text-emerald-900">Tüm Yetki Tanımları (Veritabanı)</h3>
                        <span className="text-xs text-emerald-700 font-bold">{data.permissions.length} Adet</span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 bg-gray-50">Kategori</th>
                                    <th className="px-4 py-3 bg-gray-50">Kod (Code)</th>
                                    <th className="px-4 py-3 bg-gray-50">İsim</th>
                                    <th className="px-4 py-3 bg-gray-50">Açıklama</th>
                                    <th className="px-4 py-3 bg-gray-50 text-center">Kullanan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.permissions.map(p => {
                                    const usersWithPerm = data.users.filter(u => u.is_superuser || (u.permissions && u.permissions.includes(p.code)));
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catBadgeColor(p.category)}`}>
                                                    {p.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 font-mono text-indigo-600 text-xs">{p.code}</td>
                                            <td className="px-4 py-2 font-medium text-gray-700">{p.name}</td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{p.description}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${usersWithPerm.length === 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {usersWithPerm.length}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
