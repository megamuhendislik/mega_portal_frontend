import React, { useState, useCallback } from 'react';
import { Search, FileText, Loader2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../../services/api';

const STATUS_COLORS = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
    POTENTIAL: 'bg-purple-100 text-purple-700 border-purple-200',
    ESCALATED: 'bg-blue-100 text-blue-700 border-blue-200',
    ORDERED: 'bg-sky-100 text-sky-700 border-sky-200',
    DELIVERED: 'bg-teal-100 text-teal-700 border-teal-200',
};

const TYPE_COLORS = {
    OVERTIME: 'bg-orange-100 text-orange-700',
    LEAVE: 'bg-sky-100 text-sky-700',
    EXTERNAL_DUTY: 'bg-indigo-100 text-indigo-700',
    CARDLESS: 'bg-teal-100 text-teal-700',
    MEAL: 'bg-pink-100 text-pink-700',
};

export default function RequestInspectionTab() {
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [requestType, setRequestType] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    const handleSearch = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const payload = {};
            if (dateFrom) payload.date_from = dateFrom;
            if (dateTo) payload.date_to = dateTo;
            if (requestType) payload.request_type = requestType;
            if (statusFilter) payload.status = statusFilter;
            const res = await api.post('/system/health-check/request-inspection/', payload);
            let data = res.data.results || [];
            if (employeeSearch.trim()) {
                const q = employeeSearch.trim().toLowerCase();
                data = data.filter(r => r.employee_name?.toLowerCase().includes(q));
            }
            setResults(data);
            setTotal(res.data.total || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, requestType, statusFilter, employeeSearch]);

    const toggleExpand = (id, type) => {
        const key = `${type}-${id}`;
        setExpandedId(prev => prev === key ? null : key);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <FileText size={20} className="text-slate-600" />
                <h3 className="text-lg font-bold text-slate-800">Talep İnceleme</h3>
                <span className="text-sm text-slate-500">Tüm talepleri tek yerden inceleyin</span>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Başlangıç</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Bitiş</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Talep Tipi</label>
                        <select value={requestType} onChange={e => setRequestType(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                            <option value="">Tümü</option>
                            <option value="OVERTIME">Ek Mesai</option>
                            <option value="LEAVE">İzin</option>
                            <option value="EXTERNAL_DUTY">Dış Görev</option>
                            <option value="CARDLESS">Kartsız Giriş</option>
                            <option value="MEAL">Yemek</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                            <option value="">Tümü</option>
                            <option value="PENDING">Bekliyor</option>
                            <option value="APPROVED">Onaylandı</option>
                            <option value="REJECTED">Reddedildi</option>
                            <option value="CANCELLED">İptal</option>
                            <option value="POTENTIAL">Potansiyel</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Çalışan</label>
                        <input type="text" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)}
                            placeholder="İsim ara..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <button onClick={handleSearch} disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        Ara
                    </button>
                    {total > 0 && <span className="text-sm text-slate-500">{results.length} / {total} sonuç</span>}
                    {error && <span className="text-sm text-red-600">{error}</span>}
                </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 py-3 font-medium text-slate-600 w-8"></th>
                                <th className="text-left px-4 py-3 font-medium text-slate-600">Çalışan</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-600">Tip</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-600">Tarih</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-600">Durum</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-600">Onaya Gönderilen</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-600">Onaylayan</th>
                                <th className="text-left px-4 py-3 font-medium text-slate-600">Oluşturulma</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r) => {
                                const key = `${r.type}-${r.id}`;
                                const isExpanded = expandedId === key;
                                return (
                                    <React.Fragment key={key}>
                                        <tr className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : ''}`}
                                            onClick={() => toggleExpand(r.id, r.type)}>
                                            <td className="px-4 py-3 text-slate-400">
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800">{r.employee_name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[r.type] || 'bg-slate-100 text-slate-600'}`}>
                                                    {r.type_display}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {r.date}{r.end_date ? ` → ${r.end_date}` : ''}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {r.status_display || r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 text-xs">{r.target_approver || '-'}</td>
                                            <td className="px-4 py-3 text-slate-600 text-xs">{r.approved_by || '-'}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{r.created_at || '-'}</td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-4 bg-slate-50 border-b border-slate-200">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-slate-500 text-xs">ID</span>
                                                            <p className="font-mono text-slate-700">#{r.id}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500 text-xs">Çalışan ID</span>
                                                            <p className="font-mono text-slate-700">#{r.employee_id}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500 text-xs">Onay Tarihi</span>
                                                            <p className="text-slate-700">{r.approved_at || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500 text-xs">Son Güncelleme</span>
                                                            <p className="text-slate-700">{r.updated_at || '-'}</p>
                                                        </div>
                                                        {r.source_type && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Kaynak</span>
                                                                <p className="text-slate-700">{r.source_type}</p>
                                                            </div>
                                                        )}
                                                        {r.duration_seconds > 0 && (
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Süre</span>
                                                                <p className="text-slate-700">{Math.round(r.duration_seconds / 60)} dk</p>
                                                            </div>
                                                        )}
                                                        {r.notes && (
                                                            <div className="col-span-2">
                                                                <span className="text-slate-500 text-xs">Notlar</span>
                                                                <p className="text-slate-700">{r.notes}</p>
                                                            </div>
                                                        )}
                                                        {r.rejection_reason && (
                                                            <div className="col-span-2">
                                                                <span className="text-slate-500 text-xs">Red Sebebi</span>
                                                                <p className="text-red-600 font-medium">{r.rejection_reason}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && results.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Filtreleri ayarlayıp "Ara" butonuna tıklayın</p>
                </div>
            )}
        </div>
    );
}
