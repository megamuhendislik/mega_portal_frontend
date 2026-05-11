import React, { useState, useCallback, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const REQUEST_TYPES = [
    { value: '', label: 'Tümü' },
    { value: 'OT', label: 'Fazla Mesai' },
    { value: 'LEAVE', label: 'İzin' },
    { value: 'MEAL', label: 'Yemek' },
    { value: 'CARDLESS', label: 'Kartsız Giriş' },
    { value: 'HEALTH_REPORT', label: 'Sağlık Raporu' },
];

const VERDICT_META = {
    MANUAL_DECISION: {
        label: 'Manuel Karar',
        color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        chip: 'bg-emerald-600',
    },
    BULK_AUTO_CANCEL: {
        label: 'Toplu Otomatik İptal',
        color: 'bg-blue-50 text-blue-900 border-blue-300',
        chip: 'bg-blue-600',
    },
    BULK_AUTO_CANCEL_PARTIAL: {
        label: 'Toplu Otomatik (Eksik Log)',
        color: 'bg-sky-50 text-sky-900 border-sky-300',
        chip: 'bg-sky-600',
    },
    SYSTEM_DEDUP_CLEANUP: {
        label: 'Sistem Duplikat Temizleme',
        color: 'bg-violet-50 text-violet-900 border-violet-300',
        chip: 'bg-violet-600',
    },
    INTEGRITY_AUDITOR_FIX: {
        label: 'Veri Bütünlüğü Düzeltmesi',
        color: 'bg-violet-50 text-violet-900 border-violet-300',
        chip: 'bg-violet-600',
    },
    USER_SELF_CANCEL: {
        label: 'Kullanıcı Kendi İptal Etti',
        color: 'bg-amber-50 text-amber-900 border-amber-300',
        chip: 'bg-amber-600',
    },
};

const CONFIDENCE_COLORS = {
    CERTAIN: 'bg-emerald-600',
    HIGH: 'bg-blue-600',
    MEDIUM: 'bg-amber-600',
    LOW: 'bg-gray-500',
};

const BADGE_META = {
    NO_AUDIT_TRAIL: {
        label: 'Audit Yok',
        color: 'bg-red-100 text-red-700 border-red-200',
    },
    BULK_CRON_SIGNAL: {
        label: 'Cron Eşleşmesi',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    DUPLICATE_SEGMENTS: {
        label: 'Duplikat Segment',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    ZERO_DURATION_SEGMENT: {
        label: '0sn Segment',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    IMMEDIATE_CANCEL: {
        label: 'Hızlı İptal',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    ORPHAN_TARGET_APPROVER: {
        label: 'Sahipsiz Onaylayıcı',
        color: 'bg-rose-100 text-rose-700 border-rose-200',
    },
    SYSTEM_CREATED_CANCELLED: {
        label: 'Sistem Yaratıp İptal',
        color: 'bg-violet-100 text-violet-700 border-violet-200',
    },
};

const TYPE_COLORS = {
    OT: 'bg-orange-100 text-orange-700 border-orange-200',
    LEAVE: 'bg-sky-100 text-sky-700 border-sky-200',
    MEAL: 'bg-pink-100 text-pink-700 border-pink-200',
    CARDLESS: 'bg-teal-100 text-teal-700 border-teal-200',
    HEALTH_REPORT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

function shortTs(iso) {
    if (!iso) return '—';
    return iso.slice(0, 16).replace('T', ' ');
}

function fmtDuration(sec) {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h && m) return `${h}sa ${m}dk`;
    if (h) return `${h}sa`;
    return `${m}dk`;
}

export default function CancellationInvestigationTab() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [requestType, setRequestType] = useState('');
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [suspiciousOnly, setSuspiciousOnly] = useState(false);

    const [results, setResults] = useState([]);
    const [buckets, setBuckets] = useState({});
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [drawer, setDrawer] = useState(null);

    const [directType, setDirectType] = useState('OT');
    const [directId, setDirectId] = useState('');

    const handleScan = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post(
                '/system/health-check/cancellation-investigation/',
                {
                    date_from: dateFrom || null,
                    date_to: dateTo || null,
                    request_type: requestType || null,
                    employee_query: employeeQuery || null,
                    suspicious_only: suspiciousOnly,
                },
            );
            setResults(res.data.results || []);
            setCount(res.data.count || 0);
            setBuckets(res.data.suspicious_buckets || {});
        } catch (e) {
            setError(e?.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, requestType, employeeQuery, suspiciousOnly]);

    useEffect(() => {
        handleScan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openDetail = async (type, id) => {
        setDrawer({ loading: true, type, id });
        try {
            const res = await api.get(
                `/system/health-check/cancellation-investigation-detail/?request_type=${type}&request_id=${id}`,
            );
            setDrawer({ loading: false, data: res.data, type, id });
        } catch (e) {
            setDrawer({
                loading: false,
                error: e?.response?.data?.error || e.message,
                type, id,
            });
        }
    };

    const downloadTxt = async (type, id) => {
        try {
            const res = await api.get(
                `/system/health-check/cancellation-investigation-txt/?request_type=${type}&request_id=${id}`,
                { responseType: 'blob' },
            );
            const url = URL.createObjectURL(
                new Blob([res.data], { type: 'text/plain;charset=utf-8' }),
            );
            const a = document.createElement('a');
            a.href = url;
            a.download = `iptal-inceleme-${type}-${id}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e?.response?.data?.error || e.message));
        }
    };

    const handleDirectInspect = () => {
        const idNum = parseInt(directId, 10);
        if (!directType || !idNum) return;
        openDetail(directType, idNum);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    İptal İnceleme — Forensic CANCELLED Diagnostic
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    CANCELLED talepler için "kim/ne/neden" sorularına %95+ doğrulukla cevap.
                    Mevcut sinyallerden (RequestDecisionHistory, Notification, Celery beat cron, segments anomalies)
                    forensic teşhis. DB değişikliği yok, salt okuma.
                </p>

                {/* Filter toolbar */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                        <input type="date" value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                        <input type="date" value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Talep Türü</label>
                        <select value={requestType}
                            onChange={(e) => setRequestType(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm">
                            {REQUEST_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Çalışan Ara</label>
                        <input type="text" value={employeeQuery}
                            onChange={(e) => setEmployeeQuery(e.target.value)}
                            placeholder="ad/soyad"
                            className="border rounded px-3 py-1.5 text-sm w-40" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                        <input type="checkbox" checked={suspiciousOnly}
                            onChange={(e) => setSuspiciousOnly(e.target.checked)} />
                        Sadece şüpheli
                    </label>
                    <button onClick={handleScan} disabled={loading}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2">
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        {loading ? 'Taranıyor...' : 'Tara'}
                    </button>

                    <div className="ml-auto flex items-end gap-2 border-l pl-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Direkt Tür</label>
                            <select value={directType}
                                onChange={(e) => setDirectType(e.target.value)}
                                className="border rounded px-2 py-1.5 text-sm">
                                {REQUEST_TYPES.filter((t) => t.value).map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">ID</label>
                            <input type="number" value={directId}
                                onChange={(e) => setDirectId(e.target.value)}
                                className="border rounded px-3 py-1.5 text-sm w-28" />
                        </div>
                        <button onClick={handleDirectInspect}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-bold">
                            Direkt İncele
                        </button>
                    </div>
                </div>

                {/* Suspicious bucket cards */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(buckets).map(([k, v]) => (
                        <div key={k}
                            className={`border rounded-lg p-3 ${BADGE_META[k]?.color || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            <div className="text-xs font-medium">
                                {BADGE_META[k]?.label || k}
                            </div>
                            <div className="text-2xl font-bold mt-1">{v}</div>
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                    {error}
                </div>
            )}

            {/* Results table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600 flex items-center justify-between">
                    <div>
                        Toplam: <span className="font-bold">{count}</span> CANCELLED kayıt
                    </div>
                    {results.length > 0 && (
                        <div className="text-xs text-gray-500">
                            En son güncellenen üstte
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-3 py-2">Tür</th>
                                <th className="px-3 py-2">ID</th>
                                <th className="px-3 py-2">Çalışan</th>
                                <th className="px-3 py-2">Departman</th>
                                <th className="px-3 py-2">Talep Tarihi</th>
                                <th className="px-3 py-2">İptal Anı</th>
                                <th className="px-3 py-2">Süre</th>
                                <th className="px-3 py-2">Anomaliler</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r) => (
                                <tr key={`${r.type}-${r.id}`}
                                    className="border-b hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TYPE_COLORS[r.type] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                            {r.type}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">#{r.id}</td>
                                    <td className="px-3 py-2">{r.employee_name}</td>
                                    <td className="px-3 py-2 text-xs text-gray-600">{r.department || '—'}</td>
                                    <td className="px-3 py-2 text-xs">{r.request_date}</td>
                                    <td className="px-3 py-2 text-xs">{shortTs(r.updated_at)}</td>
                                    <td className="px-3 py-2 text-xs">{fmtDuration(r.duration_seconds)}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {(r.badges || []).map((b) => (
                                                <span key={b}
                                                    className={`text-[10px] px-1.5 py-0.5 rounded border ${BADGE_META[b]?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                    {BADGE_META[b]?.label || b}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 flex items-center gap-2">
                                        <button onClick={() => openDetail(r.type, r.id)}
                                            className="text-indigo-600 hover:underline text-xs font-bold">
                                            İncele
                                        </button>
                                        <button onClick={() => downloadTxt(r.type, r.id)}
                                            title="TXT İndir"
                                            className="text-emerald-600 hover:underline text-xs font-bold">
                                            TXT
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {results.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                                        Sonuç yok. Filtreleri değiştirin veya tarih aralığını genişletin.
                                    </td>
                                </tr>
                            )}
                            {loading && results.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                                        Taranıyor...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {drawer && (
                <DetailDrawer
                    drawer={drawer}
                    onClose={() => setDrawer(null)}
                    onDownload={downloadTxt}
                />
            )}
        </div>
    );
}

function DetailDrawer({ drawer, onClose, onDownload }) {
    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="ml-auto bg-white w-full max-w-4xl h-full overflow-y-auto shadow-2xl relative">
                <div className="sticky top-0 z-10 bg-white border-b px-5 py-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">
                        İptal İnceleme {drawer.type && drawer.id ? `— ${drawer.type} #${drawer.id}` : ''}
                    </h3>
                    <div className="flex items-center gap-2">
                        {drawer.data && (
                            <button onClick={() => onDownload(drawer.type, drawer.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1.5">
                                <ArrowDownTrayIcon className="w-4 h-4" /> TXT İndir
                            </button>
                        )}
                        <button onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 rounded">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    {drawer.loading && <div className="text-gray-500">Yükleniyor...</div>}
                    {drawer.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                            {drawer.error}
                        </div>
                    )}
                    {drawer.data && <DetailContent data={drawer.data} />}
                </div>
            </div>
        </div>
    );
}

function DetailContent({ data }) {
    const diag = data.forensic_diagnosis || {};
    const meta = VERDICT_META[diag.verdict] || {
        label: diag.verdict || 'BİLİNMİYOR',
        color: 'bg-gray-50 text-gray-900 border-gray-200',
        chip: 'bg-gray-500',
    };
    const confColor = CONFIDENCE_COLORS[diag.confidence] || 'bg-gray-400';

    return (
        <>
            <div className={`border-2 rounded-lg p-4 ${meta.color}`}>
                <div className="flex items-center gap-3">
                    <span className={`text-white text-xs font-bold px-2 py-0.5 rounded ${meta.chip}`}>
                        VERDICT
                    </span>
                    <span className="text-2xl font-bold">{meta.label}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                    <span>Güven:</span>
                    <span className={`text-white text-xs font-bold px-2 py-0.5 rounded ${confColor}`}>
                        {diag.confidence}
                    </span>
                    {diag.decision_maker && (
                        <span className="text-sm">
                            Karar Veren: <span className="font-bold">{diag.decision_maker}</span>
                        </span>
                    )}
                </div>
                <ul className="text-xs mt-3 list-disc list-inside space-y-0.5">
                    {(diag.reasoning || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>

            {(data.anomalies || []).length > 0 && (
                <div className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                    <div className="text-xs font-bold uppercase tracking-wide text-orange-700">
                        Anomaliler
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {data.anomalies.map((a) => (
                            <span key={a}
                                className="bg-orange-100 text-orange-800 border border-orange-300 text-xs px-2 py-0.5 rounded">
                                {a}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <Section title="Metadata">
                <KVTable data={data.metadata} />
            </Section>

            <Section title={`Audit Geçmişi (${data.audit_history?.entries?.length || 0})`}>
                {data.audit_history?.audit_gap ? (
                    <div className="text-sm text-red-700 font-bold">
                        KAYIT YOK — audit gap. Bu talebin iptali için sistemde kim/ne zaman bilgisi yok.
                    </div>
                ) : (
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(data.audit_history.entries, null, 2)}
                    </pre>
                )}
            </Section>

            <Section title={`Notifications (${data.notifications?.entries?.length || 0})`}>
                {data.notifications?.has_auto_cancel_notification && (
                    <div className="mb-2 text-sm bg-blue-50 border border-blue-200 text-blue-800 p-2 rounded">
                        ★ "Otomatik İptal" bildirimi VAR — bulk auto-cancel imzası
                    </div>
                )}
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(data.notifications, null, 2)}
                </pre>
            </Section>

            <Section title="Attendance Snapshot">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(data.attendance_snapshot, null, 2)}
                </pre>
            </Section>

            <Section title="Cross-Request Analizi">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(data.cross_requests, null, 2)}
                </pre>
            </Section>

            <Section title="POTENTIAL Ailesi">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(data.potential_family, null, 2)}
                </pre>
            </Section>

            <Section title="Sistem Olayları (Celery cron eşleşmesi)">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(data.system_events, null, 2)}
                </pre>
            </Section>

            <Section title="Tüm Alan Dump (model_to_dict)">
                <KVTable data={data.full_field_dump} />
            </Section>
        </>
    );
}

function Section({ title, children, defaultOpen = false }) {
    return (
        <details className="border rounded-lg" open={defaultOpen}>
            <summary className="cursor-pointer px-3 py-2 bg-gray-50 font-bold text-sm hover:bg-gray-100">
                {title}
            </summary>
            <div className="p-3">{children}</div>
        </details>
    );
}

function KVTable({ data }) {
    if (!data || typeof data !== 'object') return <span className="text-gray-400">(yok)</span>;
    const keys = Object.keys(data).sort();
    return (
        <table className="w-full text-xs">
            <tbody>
                {keys.map((k) => {
                    const v = data[k];
                    const display = (
                        v === null || v === undefined ? <span className="text-gray-400">null</span>
                        : typeof v === 'object'
                            ? <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(v, null, 2)}</pre>
                            : String(v)
                    );
                    return (
                        <tr key={k} className="border-b border-gray-100 last:border-0">
                            <td className="px-2 py-1 font-mono text-gray-600 whitespace-nowrap align-top">{k}</td>
                            <td className="px-2 py-1 break-all">{display}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
