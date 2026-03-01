import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Phone, Mail, RefreshCw, Building2, Users,
    Circle, LayoutGrid, List, MapPin, WifiOff
} from 'lucide-react';
import api from '../services/api';

const PRESENCE_CONFIG = {
    INSIDE:         { label: 'Ofiste',     color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', ring: 'ring-green-500/20' },
    REMOTE_WORKING: { label: 'Ofiste',     color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', ring: 'ring-green-500/20' },
    ON_LEAVE:       { label: 'Izinde',     color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-500/20' },
    LEFT:           { label: 'Disarida',   color: 'bg-slate-400',  text: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200', ring: 'ring-slate-500/20' },
    OUTSIDE:        { label: 'Disarida',   color: 'bg-slate-400',  text: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200', ring: 'ring-slate-500/20' },
};

const getInitials = (firstName, lastName) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
};

const AVATAR_COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500',
    'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-pink-500', 'bg-violet-500'
];

const getAvatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const CompanyDirectory = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [summary, setSummary] = useState({ total: 0, inside: 0, remote: 0, on_leave: 0, outside: 0, left: 0 });
    const [lastRefresh, setLastRefresh] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const searchTimerRef = useRef(null);
    const isInitialMount = useRef(true);

    const fetchDirectory = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            else setRefreshing(true);

            const params = {};
            if (searchText.trim()) params.search = searchText.trim();
            if (selectedDepartment) params.department = selectedDepartment;
            if (selectedStatus) params.status = selectedStatus;

            const res = await api.get('/employees/company-directory/', { params });
            setEmployees(res.data.results || []);
            setSummary(res.data.summary || { total: 0, inside: 0, remote: 0, on_leave: 0, outside: 0 });
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Directory fetch failed:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchText, selectedDepartment, selectedStatus]);

    // Initial load + department list
    useEffect(() => {
        fetchDirectory();
        const fetchDepts = async () => {
            try {
                const res = await api.get('/departments/');
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setDepartments(data.filter(d => d.is_active !== false));
            } catch { /* ignore */ }
        };
        fetchDepts();
    }, []);

    // Debounced search (skip initial mount to avoid double fetch)
    useEffect(() => {
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => fetchDirectory(), 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchText, selectedDepartment, selectedStatus]);

    // Auto-refresh every 60s
    useEffect(() => {
        const interval = setInterval(() => fetchDirectory(true), 60000);
        return () => clearInterval(interval);
    }, [fetchDirectory]);

    const handleManualRefresh = () => fetchDirectory(true);

    const statCards = [
        { key: 'inside', label: 'Ofiste', value: (summary.inside || 0) + (summary.remote || 0), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: <Building2 size={18} className="text-green-500" />, filterStatus: 'INSIDE' },
        { key: 'on_leave', label: 'İzinde', value: summary.on_leave, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: <MapPin size={18} className="text-orange-500" />, filterStatus: 'ON_LEAVE' },
        { key: 'outside', label: 'Dışarıda', value: (summary.outside || 0) + (summary.left || 0), color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: <WifiOff size={18} className="text-slate-400" />, filterStatus: 'OUTSIDE' },
    ];

    const statusFilterPills = [
        { key: '', label: `Tümü (${summary.total})` },
        { key: 'INSIDE', label: `Ofiste (${(summary.inside || 0) + (summary.remote || 0)})`, dot: 'bg-green-500' },
        { key: 'ON_LEAVE', label: `İzinde (${summary.on_leave})`, dot: 'bg-orange-500' },
        { key: 'OUTSIDE', label: `Dışarıda (${(summary.outside || 0) + (summary.left || 0)})`, dot: 'bg-slate-400' },
    ];

    const renderEmployeeCard = (emp) => {
        const cfg = PRESENCE_CONFIG[emp.presence] || PRESENCE_CONFIG.OUTSIDE;
        return (
            <div
                key={emp.id}
                className={`bg-white rounded-2xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-200 overflow-hidden group`}
            >
                <div className="p-4">
                    {/* Top: Avatar + Name + Status */}
                    <div className="flex items-start gap-3">
                        {/* Avatar with status dot */}
                        <div className="relative shrink-0">
                            <div className={`w-12 h-12 ${getAvatarColor(emp.id)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                                {getInitials(emp.first_name, emp.last_name)}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${cfg.color} rounded-full border-2 border-white`}></div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 text-sm truncate">{emp.full_name}</h3>
                        </div>

                        {/* Status badge */}
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                            {cfg.label}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 mt-3 pt-3">
                        <div className="flex items-center gap-4 text-xs">
                            {emp.phone && (
                                <a href={`tel:${emp.phone}`} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors truncate">
                                    <Phone size={12} />
                                    <span className="truncate">{emp.phone}</span>
                                </a>
                            )}
                            {emp.email && (
                                <a href={`mailto:${emp.email}`} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors truncate">
                                    <Mail size={12} />
                                    <span className="truncate">{emp.email}</span>
                                </a>
                            )}
                        </div>

                        {emp.is_reachable && (
                            <div className="flex items-center justify-end mt-2">
                                <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5">
                                    <Circle size={6} fill="currentColor" />
                                    Ulasılabilir
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderEmployeeRow = (emp) => {
        const cfg = PRESENCE_CONFIG[emp.presence] || PRESENCE_CONFIG.OUTSIDE;
        return (
            <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div className={`w-9 h-9 ${getAvatarColor(emp.id)} rounded-full flex items-center justify-center text-white font-bold text-xs`}>
                                {getInitials(emp.first_name, emp.last_name)}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${cfg.color} rounded-full border-2 border-white`}></div>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-800 truncate">{emp.full_name}</p>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                        {cfg.label}
                    </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                    {emp.phone && (
                        <a href={`tel:${emp.phone}`} className="hover:text-blue-600 transition-colors">{emp.phone}</a>
                    )}
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                    {emp.is_reachable ? (
                        <Circle size={10} fill="#22c55e" className="text-green-500 inline" />
                    ) : (
                        <Circle size={10} fill="#cbd5e1" className="text-slate-300 inline" />
                    )}
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Sirket Rehberi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Tum calisanların guncel durum bilgisi
                        {lastRefresh && (
                            <span className="text-slate-400 ml-2">
                                Son guncelleme: {lastRefresh.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Yenile
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
                {statCards.map(s => (
                    <button
                        key={s.key}
                        onClick={() => {
                            setSelectedStatus(prev => prev === s.filterStatus ? '' : s.filterStatus);
                        }}
                        className={`${s.bg} ${s.border} border rounded-xl p-3 flex items-center gap-3 transition-all hover:shadow-md ${
                            selectedStatus === s.filterStatus
                                ? 'ring-2 ring-offset-1 ' + (s.key === 'inside' ? 'ring-green-500/40' : s.key === 'on_leave' ? 'ring-orange-500/40' : 'ring-slate-500/40')
                                : ''
                        }`}
                    >
                        {s.icon}
                        <div className="text-left">
                            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                            <p className="text-xs font-medium text-slate-500">{s.label}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            placeholder="Calisan ara (ad soyad)..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700"
                        />
                    </div>


                    {/* View Toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {statusFilterPills.map(pill => (
                        <button
                            key={pill.key}
                            onClick={() => setSelectedStatus(pill.key)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                selectedStatus === pill.key
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                        >
                            {pill.dot && <span className={`w-2 h-2 rounded-full ${selectedStatus === pill.key ? 'bg-white' : pill.dot}`}></span>}
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 mt-3 pt-3">
                                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Users size={48} className="mb-3 text-slate-300" />
                    <p className="text-lg font-bold text-slate-500">Sonuc bulunamadi</p>
                    <p className="text-sm mt-1">Arama kriterlerini degistirmeyi deneyin.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {employees.map(renderEmployeeCard)}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Calisan</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase hidden lg:table-cell">Durum</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase hidden lg:table-cell">Telefon</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase hidden md:table-cell">Ulasılabilir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(renderEmployeeRow)}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer count */}
            {!loading && employees.length > 0 && (
                <div className="text-center text-xs text-slate-400 pb-4">
                    Toplam {employees.length} calisan gosteriliyor
                </div>
            )}
        </div>
    );
};

export default CompanyDirectory;
