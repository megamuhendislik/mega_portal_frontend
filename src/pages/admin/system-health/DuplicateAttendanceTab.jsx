import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import {
    ArrowPathIcon,
    ExclamationTriangleIcon,
    DocumentDuplicateIcon,
    TrashIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    BoltIcon,
    ClipboardDocumentIcon,
    ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLORS = {
    OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
    CALCULATED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    PENDING_MANAGER_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
    AUTO_APPROVED: 'bg-teal-100 text-teal-800 border-teal-200',
    ABSENT: 'bg-red-100 text-red-800 border-red-200',
    HEALTH_REPORT: 'bg-purple-100 text-purple-800 border-purple-200',
    HOSPITAL_VISIT: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    SPECIAL_LEAVE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const SOURCE_LABELS = {
    CARD: 'Kart',
    MANUAL: 'Manuel',
    ADMIN_ENTRY: 'Admin',
    DUTY: 'Görev',
    HEALTH_REPORT: 'Sağlık Rap.',
    HOSPITAL_VISIT: 'Hastane',
    SPLIT: 'Split',
    AUTO_SPLIT: 'AutoSplit',
    SYSTEM: 'Sistem',
    MANUAL_OT: 'Manuel Fazla Mesai',
    SPECIAL_LEAVE: 'Özel İzin',
};

function fmtSec(s) {
    if (s == null) return '-';
    if (s === 0) return '0';
    const sign = s < 0 ? '-' : '';
    s = Math.abs(s);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${sign}${h}s ${m}dk`;
    if (m > 0) return `${sign}${m}dk ${r}sn`;
    return `${sign}${r}sn`;
}

function fmtDt(iso) {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    } catch {
        return iso;
    }
}

function fmtTime(iso) {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleTimeString('tr-TR', {
            timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch {
        return iso;
    }
}

function deltaBadge(s) {
    if (s == null) return null;
    const cls = s < 5
        ? 'bg-red-50 text-red-700 border-red-200'
        : s < 60
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-gray-50 text-gray-600 border-gray-200';
    const label = s < 60 ? `+${s.toFixed(2)}sn` : s < 3600 ? `+${(s / 60).toFixed(1)}dk` : `+${(s / 3600).toFixed(1)}sa`;
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${cls}`}>{label}</span>;
}

export default function DuplicateAttendanceTab() {
    const [startDate, setStartDate] = useState(getIstanbulDateOffset(-30));
    const [endDate, setEndDate] = useState(getIstanbulToday());
    const [employeeId, setEmployeeId] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('phantom');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(new Set());
    const [deleting, setDeleting] = useState(null);
    const [deleteResult, setDeleteResult] = useState(null);

    const scan = async () => {
        setLoading(true);
        setError(null);
        setDeleteResult(null);
        try {
            const params = {
                start_date: startDate,
                end_date: endDate,
                status: statusFilter,
                category: categoryFilter,
            };
            if (employeeId) params.employee_id = employeeId;
            const res = await api.get('/system/health-check/duplicate-attendance-scan/', { params });
            setData(res.data);
            setExpanded(new Set());
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { scan(); }, []);

    const toggle = (key) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const expandAll = () => {
        if (!data?.groups) return;
        setExpanded(new Set(data.groups.map(g => `${g.employee_id}_${g.work_date}`)));
    };
    const collapseAll = () => setExpanded(new Set());

    const deleteRecord = async (rec, group) => {
        const msg = `Sil onayı:\n\n#${rec.id}\n${group.employee_name} — ${group.work_date}\nStatus: ${rec.status}\nSource: ${rec.source}\nCreated: ${fmtDt(rec.created_at)}\n\nDevam edilsin mi?`;
        if (!window.confirm(msg)) return;
        setDeleting(rec.id);
        setDeleteResult(null);
        try {
            const res = await api.post('/system/health-check/duplicate-attendance-delete/', {
                id: rec.id,
                trigger_recalc: true,
            });
            setDeleteResult({ ok: true, ...res.data });
            await scan();
        } catch (e) {
            setDeleteResult({ ok: false, error: e.response?.data?.error || e.message });
        } finally {
            setDeleting(null);
        }
    };

    const downloadTxt = async () => {
        try {
            const params = {
                start_date: startDate,
                end_date: endDate,
                status: statusFilter,
                category: categoryFilter,
            };
            if (employeeId) params.employee_id = employeeId;
            const res = await api.get('/system/health-check/duplicate-attendance-export/', {
                params, responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mukerrer_mesai_${startDate}_${endDate}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e.response?.data?.error || e.message));
        }
    };

    const copyJson = (obj) => {
        try {
            navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
            alert('JSON panoya kopyalandı.');
        } catch {
            alert('Kopyalama başarısız.');
        }
    };

    const summary = useMemo(() => {
        if (!data) return null;
        return {
            groups: data.group_count,
            records: data.total_records,
            statuses: data.status_breakdown,
            sources: data.source_breakdown,
            categories: data.category_breakdown,
        };
    }, [data]);

    const CAT_COLORS = {
        phantom: 'bg-rose-100 text-rose-800 border-rose-300',
        overlap: 'bg-amber-100 text-amber-800 border-amber-300',
        identical: 'bg-violet-100 text-violet-800 border-violet-300',
    };
    const CAT_LABELS = {
        phantom: 'phantom',
        overlap: 'overlap',
        identical: 'identical',
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-6 h-6 text-rose-600" />
                        Mükerrer Mesai Kayıtları (Duplicate Audit)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Sadece <strong>gerçek</strong> duplicate kayıtları gösterir.
                        Split shift'ler (aynı gün birden fazla giriş/çıkış) <em>duplicate sayılmaz</em>.
                        Kategoriler: <strong>phantom</strong> (NULL check_in × 2 — race condition),
                        {' '}<strong>overlap</strong> (zaman aralığı çakışması),
                        {' '}<strong>identical</strong> (aynı source+saat).
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Çalışan ID (opsiyonel)</label>
                    <input type="number" value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                        placeholder="Tümü"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
                        <option value="all">Tümü</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="OPEN">OPEN</option>
                        <option value="CALCULATED">CALCULATED</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="PENDING_MANAGER_APPROVAL">PENDING</option>
                        <option value="HEALTH_REPORT">HEALTH_REPORT</option>
                        <option value="HOSPITAL_VISIT">HOSPITAL_VISIT</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
                        <option value="phantom">Phantom (race condition)</option>
                        <option value="overlap">Overlap (zaman çakışma)</option>
                        <option value="identical">Identical (aynı saat)</option>
                        <option value="all">Tümü</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button onClick={scan} disabled={loading}
                        className={`w-full py-1.5 px-3 rounded font-bold text-sm flex items-center justify-center gap-2 ${
                            loading ? 'bg-gray-200 text-gray-400' : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}>
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <BoltIcon className="w-4 h-4" />}
                        {loading ? 'Taranıyor...' : 'Tara'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <div><strong>Hata:</strong> {error}</div>
                </div>
            )}

            {deleteResult && (
                <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 border ${
                    deleteResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                    {deleteResult.ok ? (
                        <div>
                            <strong>Silindi:</strong> #{deleteResult.deleted?.id} —
                            {' '}{deleteResult.deleted?.employee_name} ({deleteResult.deleted?.work_date}).
                            Recalc: <strong>{deleteResult.recalc}</strong>
                            {deleteResult.recalc_error && <span> — {deleteResult.recalc_error}</span>}
                        </div>
                    ) : (
                        <div><strong>Hata:</strong> {deleteResult.error}</div>
                    )}
                </div>
            )}

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                        <div className="text-2xl font-bold text-rose-700">{summary.groups}</div>
                        <div className="text-xs font-medium text-rose-700">Mükerrer Grup</div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <div className="text-2xl font-bold text-amber-700">{summary.records}</div>
                        <div className="text-xs font-medium text-amber-700">Toplam Kayıt</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 col-span-3">
                        <div className="text-[11px] font-medium text-gray-500 mb-1">Kategori Dağılımı</div>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {Object.keys(summary.categories || {}).length === 0 && (
                                <span className="text-[10px] text-gray-400 italic">yok</span>
                            )}
                            {Object.entries(summary.categories || {}).map(([k, v]) => (
                                <span key={k} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${CAT_COLORS[k] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                    {CAT_LABELS[k] || k}: {v}
                                </span>
                            ))}
                        </div>
                        <div className="text-[11px] font-medium text-gray-500 mb-1">Statü</div>
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(summary.statuses || {}).map(([k, v]) => (
                                <span key={k} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${STATUS_COLORS[k] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                    {k}: {v}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            {data?.groups?.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={expandAll} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">Hepsini Aç</button>
                    <button onClick={collapseAll} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">Hepsini Kapat</button>
                    <button onClick={() => copyJson(data)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
                        <ClipboardDocumentIcon className="w-3.5 h-3.5" /> JSON Kopyala
                    </button>
                    <button onClick={downloadTxt} className="text-xs px-2 py-1 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1">
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" /> TXT İndir
                    </button>
                </div>
            )}

            {/* Groups */}
            {data && (data.groups?.length === 0 ? (
                <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg">
                    Bu kriterlere uygun mükerrer kayıt yok.
                </div>
            ) : (
                <div className="space-y-2">
                    {data.groups.map(g => {
                        const key = `${g.employee_id}_${g.work_date}`;
                        const isOpen = expanded.has(key);
                        return (
                            <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button onClick={() => toggle(key)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {isOpen ? <ChevronDownIcon className="w-4 h-4 text-gray-500" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                                        <div className="text-left min-w-0">
                                            <div className="font-bold text-gray-800 truncate">
                                                {g.employee_name}
                                                <span className="ml-2 text-xs font-mono text-gray-400">#{g.employee_code || g.employee_id}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{g.department} — {g.work_date}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        {(g.categories || []).map(c => (
                                            <span key={c} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${CAT_COLORS[c] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                {CAT_LABELS[c] || c}
                                            </span>
                                        ))}
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                                            {g.count} kayıt
                                        </span>
                                        {g.distinct_statuses.map(s => (
                                            <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                {s}
                                            </span>
                                        ))}
                                        {g.min_created_delta_s != null && deltaBadge(g.min_created_delta_s)}
                                    </div>
                                </button>
                                {isOpen && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-white border-b border-gray-200 text-gray-600">
                                                <tr>
                                                    <th className="px-2 py-2 text-left">ID</th>
                                                    <th className="px-2 py-2 text-left">Status</th>
                                                    <th className="px-2 py-2 text-left">Source</th>
                                                    <th className="px-2 py-2 text-left">Check-in</th>
                                                    <th className="px-2 py-2 text-left">Check-out</th>
                                                    <th className="px-2 py-2 text-right">Normal</th>
                                                    <th className="px-2 py-2 text-right">FM</th>
                                                    <th className="px-2 py-2 text-right">Eksik</th>
                                                    <th className="px-2 py-2 text-left">Created</th>
                                                    <th className="px-2 py-2 text-left">Δ</th>
                                                    <th className="px-2 py-2 text-left">İlişkili</th>
                                                    <th className="px-2 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {g.records.map((r, idx) => (
                                                    <tr key={r.id} className={idx === 0 ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                                                        <td className="px-2 py-1.5 font-mono text-gray-700">#{r.id}</td>
                                                        <td className="px-2 py-1.5">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                                {r.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-1.5 text-gray-700">{SOURCE_LABELS[r.source] || r.source}</td>
                                                        <td className="px-2 py-1.5 font-mono text-gray-700">{fmtTime(r.check_in)}</td>
                                                        <td className="px-2 py-1.5 font-mono text-gray-700">{fmtTime(r.check_out)}</td>
                                                        <td className="px-2 py-1.5 text-right font-mono text-gray-700">{fmtSec(r.normal_seconds)}</td>
                                                        <td className="px-2 py-1.5 text-right font-mono text-gray-700">{fmtSec(r.overtime_seconds)}</td>
                                                        <td className="px-2 py-1.5 text-right font-mono text-gray-700">{fmtSec(r.missing_seconds)}</td>
                                                        <td className="px-2 py-1.5 font-mono text-gray-500" title={r.updated_at ? `updated: ${fmtDt(r.updated_at)}` : ''}>
                                                            {fmtDt(r.created_at)}
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            {idx === 0 ? (
                                                                <span className="text-[10px] text-gray-400 italic">baseline</span>
                                                            ) : (
                                                                deltaBadge(r.created_at_delta_s)
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-[10px] text-gray-500 space-y-0.5">
                                                            {r.parent_attendance_id && <div>parent: #{r.parent_attendance_id}</div>}
                                                            {r.related_request_id && <div>req: #{r.related_request_id}</div>}
                                                            {r.related_health_report_id && <div>hr: #{r.related_health_report_id}</div>}
                                                            {r.is_manual_override && <div className="text-amber-600">manual override</div>}
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <button onClick={() => deleteRecord(r, g)} disabled={deleting === r.id}
                                                                className={`p-1 rounded hover:bg-red-100 text-red-600 ${
                                                                    deleting === r.id ? 'opacity-40 cursor-wait' : ''
                                                                }`}
                                                                title="Bu kaydı sil + recalc tetikle">
                                                                {deleting === r.id ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {g.records.some(r => r.note) && (
                                                    <tr>
                                                        <td colSpan="12" className="px-2 py-1 bg-gray-50/60 text-[10px] text-gray-500">
                                                            <strong>Notlar:</strong>{' '}
                                                            {g.records.filter(r => r.note).map(r => (
                                                                <span key={r.id} className="mr-3">
                                                                    #{r.id}: <span className="font-mono">{r.note.replace(/\n/g, ' | ')}</span>
                                                                </span>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}

            {data && (
                <div className="mt-4 text-[10px] text-gray-400 text-right font-mono">
                    Aralık: {data.start_date} → {data.end_date} • {data.group_count} grup • {data.total_records} kayıt
                    {' '}• Üretildi: {fmtDt(data.generated_at)}
                </div>
            )}
        </div>
    );
}
