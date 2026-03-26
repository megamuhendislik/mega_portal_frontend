import React, { useState } from 'react';
import api from '../../../services/api';
import { Users, UserX, UserCheck, Snowflake, RefreshCw, Search } from 'lucide-react';

export default function EmployeeDebugTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, active, inactive, frozen

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/employee-debug/');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredList = () => {
        if (!data) return [];
        let list = [];
        if (activeFilter === 'all') list = [...data.active, ...data.inactive, ...data.frozen];
        else if (activeFilter === 'active') list = data.active;
        else if (activeFilter === 'inactive') list = data.inactive;
        else if (activeFilter === 'frozen') list = data.frozen;

        if (search.trim()) {
            const s = search.toLowerCase();
            list = list.filter(e =>
                e.full_name.toLowerCase().includes(s) ||
                e.employee_code?.toLowerCase().includes(s) ||
                e.department?.toLowerCase().includes(s)
            );
        }
        return list;
    };

    const statusBadge = (emp) => {
        if (emp.is_frozen) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">FROZEN</span>;
        if (emp.is_active) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">AKTİF</span>;
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">PASİF</span>;
    };

    const list = getFilteredList();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users size={20} className="text-indigo-600" />
                    Çalışan Durum Debug
                </h2>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Yükleniyor...' : 'Verileri Yükle'}
                </button>
            </div>

            {data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-slate-800">{data.summary.total}</div>
                            <div className="text-xs font-medium text-slate-500">Toplam</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => setActiveFilter('active')}>
                            <div className="text-2xl font-black text-emerald-700 flex items-center justify-center gap-1"><UserCheck size={20} />{data.summary.active}</div>
                            <div className="text-xs font-medium text-emerald-600">Aktif</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setActiveFilter('inactive')}>
                            <div className="text-2xl font-black text-red-700 flex items-center justify-center gap-1"><UserX size={20} />{data.summary.inactive}</div>
                            <div className="text-xs font-medium text-red-600">Pasif</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setActiveFilter('frozen')}>
                            <div className="text-2xl font-black text-blue-700 flex items-center justify-center gap-1"><Snowflake size={20} />{data.summary.frozen}</div>
                            <div className="text-xs font-medium text-blue-600">Frozen</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="İsim, sicil no veya departman ara..."
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                            {[
                                { id: 'all', label: 'Tümü' },
                                { id: 'active', label: 'Aktif' },
                                { id: 'inactive', label: 'Pasif' },
                                { id: 'frozen', label: 'Frozen' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${activeFilter === f.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">ID</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">Sicil No</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">Ad Soyad</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">Departman</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">Pozisyon</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">Durum</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">User Active</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">Emp. Status</th>
                                        <th className="text-left px-4 py-3 font-bold text-slate-600">İşe Giriş</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((emp, i) => (
                                        <tr key={emp.id} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'} hover:bg-indigo-50/30`}>
                                            <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{emp.id}</td>
                                            <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{emp.employee_code || '-'}</td>
                                            <td className="px-4 py-2.5 font-medium text-slate-800">{emp.full_name}</td>
                                            <td className="px-4 py-2.5 text-slate-600">{emp.department}</td>
                                            <td className="px-4 py-2.5 text-slate-600">{emp.job_position}</td>
                                            <td className="px-4 py-2.5">{statusBadge(emp)}</td>
                                            <td className="px-4 py-2.5">
                                                {emp.user_is_active === true && <span className="text-emerald-600 font-bold text-xs">✓</span>}
                                                {emp.user_is_active === false && <span className="text-red-600 font-bold text-xs">✗</span>}
                                                {emp.user_is_active === null && <span className="text-slate-400 text-xs">-</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">{emp.employment_status}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">{emp.hire_date}</td>
                                        </tr>
                                    ))}
                                    {list.length === 0 && (
                                        <tr><td colSpan="9" className="text-center py-8 text-slate-400">Kayıt bulunamadı</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                            {list.length} kayıt gösteriliyor
                        </div>
                    </div>
                </>
            )}

            {!data && !loading && (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Verileri yüklemek için yukarıdaki butona tıklayın</p>
                </div>
            )}
        </div>
    );
}
