import React, { useState } from 'react';
import api from '../../../services/api';

const FLAG_LABELS = {
    NO_ATTENDANCE: { label: 'Kart var → Attendance yok', color: 'bg-red-100 text-red-700 border-red-200' },
    NO_GATE_EVENT: { label: 'Attendance var → Kart yok', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    MANUAL_ENTRY: { label: 'Manuel giriş', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

function getFlagInfo(flag) {
    if (FLAG_LABELS[flag]) return FLAG_LABELS[flag];
    if (flag.startsWith('TIME_DIFF_')) {
        const sec = flag.replace('TIME_DIFF_', '').replace('s', '');
        return { label: `Saat farkı: ${sec}sn`, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }
    if (flag.startsWith('GATE_ISSUES_')) {
        const cnt = flag.replace('GATE_ISSUES_', '');
        return { label: `${cnt} sorunlu kart olayı`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: flag, color: 'bg-gray-100 text-gray-600 border-gray-200' };
}

const DIR_BADGE = {
    IN: 'bg-emerald-100 text-emerald-700',
    OUT: 'bg-rose-100 text-rose-700',
};

const STATUS_BADGE = {
    PROCESSED: 'bg-green-100 text-green-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    IGNORED: 'bg-gray-100 text-gray-500',
    FAILED: 'bg-red-100 text-red-700',
    DUPLICATE: 'bg-yellow-100 text-yellow-700',
};

const ATT_STATUS = {
    OPEN: 'bg-blue-100 text-blue-700',
    CALCULATED: 'bg-indigo-100 text-indigo-700',
    PENDING_MANAGER_APPROVAL: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    AUTO_APPROVED: 'bg-emerald-100 text-emerald-700',
    ABSENT: 'bg-gray-100 text-gray-500',
};

function fmtSec(s) {
    if (!s && s !== 0) return '-';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}sa ${m}dk`;
}

export default function CardDiagnosticsTab() {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all | mismatch | clean
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/system/health-check/card-diagnostics/?date=${date}`);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Veri yüklenirken hata oluştu');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const filtered = data?.results?.filter(r => {
        if (filter === 'mismatch' && r.flags.length === 0) return false;
        if (filter === 'clean' && r.flags.length > 0) return false;
        if (search) {
            const s = search.toLowerCase();
            return (
                r.employee.name.toLowerCase().includes(s) ||
                r.employee.employee_code.toLowerCase().includes(s) ||
                r.employee.department.toLowerCase().includes(s)
            );
        }
        return true;
    }) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Kart Hareket Diagnostiği</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Seçili gün için GateEventLog (kart hareketleri) ile Attendance (giriş/çıkış) kayıtlarını karşılaştırır.
                </p>

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tarih</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Yükleniyor...' : 'Getir'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
            )}

            {data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: 'Çalışan', value: data.summary.total_employees, color: 'text-gray-800' },
                            { label: 'Kart Olayı', value: data.summary.total_gate_events, color: 'text-blue-600' },
                            { label: 'Giriş (IN)', value: data.summary.gate_in_count, color: 'text-emerald-600' },
                            { label: 'Çıkış (OUT)', value: data.summary.gate_out_count, color: 'text-rose-600' },
                            { label: 'Attendance', value: data.summary.total_attendance_records, color: 'text-indigo-600' },
                            { label: 'Uyumsuzluk', value: data.summary.mismatch_count, color: data.summary.mismatch_count > 0 ? 'text-red-600' : 'text-green-600' },
                            { label: 'Tarih', value: data.summary.date, color: 'text-gray-500', isText: true },
                        ].map((c, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{c.label}</div>
                                <div className={`text-xl font-bold ${c.color}`}>{c.isText ? c.value : c.value.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            {[
                                { id: 'all', label: `Tümü (${data.results.length})` },
                                { id: 'mismatch', label: `Uyumsuz (${data.summary.mismatch_count})` },
                                { id: 'clean', label: `Temiz (${data.results.length - data.summary.mismatch_count})` },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                                        filter === f.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="İsim, sicil no veya departman ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        <span className="text-xs text-gray-400">{filtered.length} sonuç</span>
                    </div>

                    {/* Results */}
                    <div className="space-y-3">
                        {filtered.map((row, idx) => (
                            <div
                                key={idx}
                                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                                    row.flags.length > 0 ? 'border-amber-300' : 'border-gray-200'
                                }`}
                            >
                                {/* Employee Header */}
                                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {row.employee.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-800 text-sm">{row.employee.name}</span>
                                            <span className="text-gray-400 text-xs ml-2">{row.employee.employee_code}</span>
                                            {row.employee.department && (
                                                <span className="text-gray-400 text-xs ml-2">• {row.employee.department}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {row.flags.map((f, fi) => {
                                            const info = getFlagInfo(f);
                                            return (
                                                <span key={fi} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${info.color}`}>
                                                    {info.label}
                                                </span>
                                            );
                                        })}
                                        {row.flags.length === 0 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                                ✓ Uyumlu
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Two-panel comparison */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                    {/* Left: Gate Events */}
                                    <div className="p-4">
                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                            Kart Hareketleri ({row.gate_events.length})
                                        </div>
                                        {row.gate_events.length === 0 ? (
                                            <div className="text-xs text-gray-400 italic py-2">Bu gün kart kaydı yok</div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {row.gate_events.map((ge, gi) => (
                                                    <div key={gi} className="flex items-center gap-2 text-xs">
                                                        <span className="font-mono font-bold text-gray-700 w-16">{ge.timestamp}</span>
                                                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${DIR_BADGE[ge.direction] || 'bg-gray-100'}`}>
                                                            {ge.direction}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[ge.status] || 'bg-gray-100 text-gray-500'}`}>
                                                            {ge.status}
                                                        </span>
                                                        <span className="text-gray-300 font-mono text-[9px] truncate max-w-[120px]" title={ge.event_id}>
                                                            {ge.event_id}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Attendance Records */}
                                    <div className="p-4">
                                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                            Attendance Kayıtları ({row.attendance_records.length})
                                        </div>
                                        {row.attendance_records.length === 0 ? (
                                            <div className="text-xs text-gray-400 italic py-2">Bu gün attendance kaydı yok</div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {row.attendance_records.map((att, ai) => (
                                                    <div key={ai} className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="font-mono font-bold text-emerald-700 w-16">{att.check_in || '—'}</span>
                                                        <span className="text-gray-300">→</span>
                                                        <span className="font-mono font-bold text-rose-700 w-16">{att.check_out || '—'}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ATT_STATUS[att.status] || 'bg-gray-100 text-gray-500'}`}>
                                                            {att.status}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${att.source === 'CARD' ? 'bg-blue-50 text-blue-600' : att.source === 'MANUAL' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                                                            {att.source}
                                                        </span>
                                                        {att.total_seconds != null && (
                                                            <span className="text-gray-500">{fmtSec(att.total_seconds)}</span>
                                                        )}
                                                        {att.is_manual_override && (
                                                            <span className="px-1 py-0.5 rounded text-[9px] bg-orange-100 text-orange-600 font-bold">DÜZENLENMIŞ</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && data.results.length > 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">Filtreye uyan sonuç bulunamadı</div>
                        )}
                        {data.results.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">Bu tarih için kayıt bulunamadı</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
