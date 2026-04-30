import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tag, Tooltip, Slider, Button, Segmented } from 'antd';
import {
    AlertTriangle, TrendingUp, TrendingDown, User, Info, Filter,
    RotateCw, Sparkles, Activity, ChevronRight, Building2,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import { LoadingSkeleton } from '../shared/EmptyState';
import ScopeBanner from '../shared/ScopeBanner';
import PersonViewToggle from '../shared/PersonViewToggle';
import EmployeeAnomalyDrawer from '../shared/EmployeeAnomalyDrawer';

/**
 * AnomaliesTab — Anomali Tespit tam-ekran sekmesi.
 *
 * v2 Yenilikler:
 *  - "Anomali Bazlı / Kişi Bazlı" görünüm toggle'ı
 *  - Anomali kartı tıklayınca EmployeeAnomalyDrawer açılır (kişinin tüm metrikleri,
 *    son 6 ay trend, ekip ortalaması karşılaştırması)
 *  - Kişi Bazlı modda: aynı kişinin tüm metrik anomalileri tek kart altında
 *
 * Backend:
 *  - GET /api/attendance-analytics/anomalies/?threshold=...
 *  - GET /api/attendance-analytics/anomalies/employee-detail/?employee_id=N
 */

const SEVERITY_CFG = {
    critical: {
        bg: 'bg-red-50', border: 'border-red-200',
        icon: 'text-red-600', title: 'text-red-800', text: 'text-red-700',
        tag: 'red', label: 'Kritik',
    },
    high: {
        bg: 'bg-orange-50', border: 'border-orange-200',
        icon: 'text-orange-600', title: 'text-orange-800', text: 'text-orange-700',
        tag: 'orange', label: 'Yüksek',
    },
    medium: {
        bg: 'bg-amber-50', border: 'border-amber-200',
        icon: 'text-amber-600', title: 'text-amber-800', text: 'text-amber-700',
        tag: 'gold', label: 'Orta',
    },
    low: {
        bg: 'bg-slate-50', border: 'border-slate-200',
        icon: 'text-slate-500', title: 'text-slate-700', text: 'text-slate-600',
        tag: 'default', label: 'Düşük',
    },
};

const METRIC_LABELS = {
    overtime_hours: 'Fazla Mesai',
    worked_hours: 'Çalışma Saati',
    absence_days: 'Devamsızlık',
    meal_count: 'Yemek Siparişi',
};

const METRIC_UNITS = {
    overtime_hours: 'sa',
    worked_hours: 'sa',
    absence_days: 'gün',
    meal_count: '',
};

const SEVERITY_ORDER = { critical: 3, high: 2, medium: 1, low: 0 };

const SEV_FILTERS = [
    { value: 'all', label: 'Tümü' },
    { value: 'critical', label: 'Kritik' },
    { value: 'high', label: 'Yüksek' },
    { value: 'medium', label: 'Orta' },
];

const METRIC_FILTERS = [
    { value: 'all', label: 'Tümü' },
    { value: 'overtime_hours', label: 'Fazla Mesai' },
    { value: 'worked_hours', label: 'Çalışma' },
    { value: 'absence_days', label: 'Devam' },
    { value: 'meal_count', label: 'Yemek' },
];

const DIR_FILTERS = [
    { value: 'all', label: 'Hepsi' },
    { value: 'above', label: '↑ Üstü' },
    { value: 'below', label: '↓ Altı' },
];

function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AnomaliesTab() {
    const { queryParams, startDate, endDate } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [threshold, setThreshold] = useState(2.0);
    const [refreshKey, setRefreshKey] = useState(0);

    // Filtreler
    const [sevFilter, setSevFilter] = useState('all');
    const [metricFilter, setMetricFilter] = useState('all');
    const [dirFilter, setDirFilter] = useState('all');

    // Görünüm modu: anomaly | person
    const [viewMode, setViewMode] = useState('anomaly');

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);

    const openDrawer = useCallback((empId, empName) => {
        setSelectedEmp({ id: empId, name: empName });
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);

    const fetchAnomalies = useCallback(async () => {
        if (!queryParams?.start_date) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/anomalies/', {
                params: { ...queryParams, threshold }, timeout: 30000,
            });
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Yüklenemedi');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [queryParams, threshold]);

    useEffect(() => { fetchAnomalies(); }, [fetchAnomalies, refreshKey]);

    // Tüm anomalileri tek listede topla
    const allAnomalies = useMemo(() => {
        if (!data?.metrics) return [];
        const list = [];
        Object.entries(data.metrics).forEach(([metricKey, m]) => {
            (m.anomalies || []).forEach((a) => {
                list.push({
                    ...a,
                    metric_key: metricKey,
                    metric_label: m.label || METRIC_LABELS[metricKey] || metricKey,
                });
            });
        });
        return list.sort((a, b) => {
            const sd = (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0);
            if (sd !== 0) return sd;
            return Math.abs(b.z_score) - Math.abs(a.z_score);
        });
    }, [data]);

    // Filtreli liste
    const filtered = useMemo(() => {
        return allAnomalies.filter((a) => {
            if (sevFilter !== 'all' && a.severity !== sevFilter) return false;
            if (metricFilter !== 'all' && a.metric_key !== metricFilter) return false;
            if (dirFilter !== 'all' && a.direction !== dirFilter) return false;
            return true;
        });
    }, [allAnomalies, sevFilter, metricFilter, dirFilter]);

    // Kişi bazlı gruplama
    const personGroups = useMemo(() => {
        const map = new Map();
        filtered.forEach((a) => {
            const id = a.employee_id;
            if (!map.has(id)) {
                map.set(id, {
                    employee_id: id,
                    employee_name: a.employee_name,
                    department: a.department,
                    anomalies: [],
                    max_severity: 'low',
                    max_severity_order: 0,
                });
            }
            const g = map.get(id);
            g.anomalies.push(a);
            const ord = SEVERITY_ORDER[a.severity] || 0;
            if (ord > g.max_severity_order) {
                g.max_severity_order = ord;
                g.max_severity = a.severity;
            }
        });
        // Sort: max severity desc, then anomaly count desc
        return Array.from(map.values()).sort((a, b) => {
            if (b.max_severity_order !== a.max_severity_order) {
                return b.max_severity_order - a.max_severity_order;
            }
            return b.anomalies.length - a.anomalies.length;
        });
    }, [filtered]);

    const severityCounts = data?.summary?.by_severity || {};
    const total = data?.summary?.total_anomalies || 0;

    if (loading) {
        return <LoadingSkeleton rows={5} />;
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
                <h3 className="font-bold text-red-800 mb-1">Anomaliler yüklenemedi</h3>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <Button icon={<RotateCw size={14} />} onClick={() => setRefreshKey((k) => k + 1)} danger>
                    Tekrar Dene
                </Button>
            </div>
        );
    }

    if (!data || data.warning) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                <Info size={32} className="mx-auto mb-3 text-slate-400" />
                <h3 className="font-semibold text-slate-700 mb-1">Anomali analizi yapılamadı</h3>
                <p className="text-sm text-slate-500">
                    {data?.warning || 'Yeterli veri yok. En az 5 çalışan ve geçerli bir dönem gerekli.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Kapsam göstergesi (Ekibim vs Tüm Şirket) ═══ */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* Header */}
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/60 to-orange-50/60 p-5 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <AlertTriangle size={20} className="text-amber-700" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Anomali Tespiti</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Z-score tabanlı istatistiksel sapma analizi
                                {data?.sample_size && (
                                    <> · <span className="font-semibold">{data.sample_size}</span> çalışan analiz edildi</>
                                )}
                            </p>
                        </div>
                    </div>
                    <Button
                        icon={<RotateCw size={14} />}
                        onClick={() => setRefreshKey((k) => k + 1)}
                        size="middle"
                    >
                        Yenile
                    </Button>
                </div>

                {/* Severity counts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {['critical', 'high', 'medium', 'low'].map((sev) => {
                        const cfg = SEVERITY_CFG[sev];
                        const count = severityCounts[sev] || 0;
                        const isActive = sevFilter === sev;
                        return (
                            <div
                                key={sev}
                                className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 cursor-pointer hover:shadow-sm transition-all ${isActive ? 'ring-2 ring-amber-300' : ''}`}
                                onClick={() => setSevFilter(isActive ? 'all' : sev)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${cfg.title}`}>
                                        {cfg.label}
                                    </span>
                                    <Tag color={cfg.tag} className="text-xs font-bold">{count}</Tag>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Threshold + Filters + ViewToggle */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                {/* Threshold slider + view toggle */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                        <Activity size={12} /> Eşik (Z-score):
                    </div>
                    <div className="flex-1 max-w-xs">
                        <Slider
                            value={threshold}
                            onChange={setThreshold}
                            min={1.5}
                            max={3.0}
                            step={0.1}
                            marks={{ 1.5: '1.5σ', 2.0: '2.0σ', 2.5: '2.5σ', 3.0: '3.0σ' }}
                        />
                    </div>
                    <Tooltip title="|z-score| eşiğin üzerinde olan değerler anomali sayılır. Düşük = daha hassas, yüksek = sadece çok belirgin sapmalar.">
                        <Tag color="blue">Mevcut: <span className="font-bold">{threshold.toFixed(1)}σ</span></Tag>
                    </Tooltip>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Görünüm:</span>
                        <PersonViewToggle value={viewMode} onChange={setViewMode} />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                        <Filter size={12} /> Filtre:
                    </div>
                    <Segmented
                        value={sevFilter}
                        onChange={setSevFilter}
                        options={SEV_FILTERS.map((f) => ({
                            value: f.value,
                            label: <span className="text-xs px-1">{f.label}</span>,
                        }))}
                        size="small"
                    />
                    <span className="text-[10px] font-bold text-slate-400 ml-2">METRİK:</span>
                    <Segmented
                        value={metricFilter}
                        onChange={setMetricFilter}
                        options={METRIC_FILTERS.map((f) => ({
                            value: f.value,
                            label: <span className="text-xs px-1">{f.label}</span>,
                        }))}
                        size="small"
                    />
                    <span className="text-[10px] font-bold text-slate-400 ml-2">YÖN:</span>
                    <Segmented
                        value={dirFilter}
                        onChange={setDirFilter}
                        options={DIR_FILTERS.map((f) => ({
                            value: f.value,
                            label: <span className="text-xs px-1">{f.label}</span>,
                        }))}
                        size="small"
                    />
                    <span className="ml-auto text-[11px] text-slate-400">
                        {viewMode === 'anomaly' ? (
                            <>Toplam: <span className="font-bold text-slate-700">{filtered.length}</span> anomali</>
                        ) : (
                            <>Toplam: <span className="font-bold text-slate-700">{personGroups.length}</span> kişi · {filtered.length} anomali</>
                        )}
                    </span>
                </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-12 text-center">
                    <Sparkles size={32} className="mx-auto mb-3 text-emerald-500" />
                    <h3 className="font-semibold text-emerald-800 mb-1">
                        {total === 0
                            ? 'Anomali tespit edilmedi'
                            : 'Bu filtreyle eşleşen anomali yok'}
                    </h3>
                    <p className="text-sm text-emerald-600">
                        {total === 0
                            ? `Ekip içi varyasyon ${threshold.toFixed(1)}σ eşiğinin altında — sürdürülebilir tempoda.`
                            : 'Filtre kriterlerini gevşetmeyi deneyin.'}
                    </p>
                </div>
            ) : viewMode === 'anomaly' ? (
                /* ═══ ANOMALY MODE — her satır 1 metrik anomalisi ═══ */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filtered.map((a, idx) => {
                        const cfg = SEVERITY_CFG[a.severity] || SEVERITY_CFG.low;
                        const TrendIcon = a.direction === 'above' ? TrendingUp : TrendingDown;
                        const unit = METRIC_UNITS[a.metric_key] || '';
                        return (
                            <button
                                key={`${a.employee_id}_${a.metric_key}_${idx}`}
                                type="button"
                                onClick={() => openDrawer(a.employee_id, a.employee_name)}
                                className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-left group cursor-pointer`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-lg bg-white ${cfg.icon} flex-shrink-0`}>
                                        <TrendIcon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User size={13} className="text-slate-400 flex-shrink-0" />
                                            <span className="font-bold text-slate-800 truncate">{a.employee_name}</span>
                                            <Tag color={cfg.tag} className="ml-auto flex-shrink-0 text-[10px]">
                                                {cfg.label}
                                            </Tag>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2">{a.department}</div>
                                        <div className="flex items-baseline gap-2 text-sm">
                                            <span className="font-semibold text-slate-700">{a.metric_label}:</span>
                                            <span className="font-bold tabular-nums text-slate-900">
                                                {typeof a.value === 'number' ? a.value.toFixed(1) : a.value}
                                                {unit && <span className="ml-0.5 text-slate-500 font-normal">{unit}</span>}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                                            <span>Ortalamadan</span>
                                            <span className={`font-bold ${cfg.text}`}>
                                                {Math.abs(a.z_score).toFixed(2)}σ {a.direction === 'above' ? 'yüksek' : 'düşük'}
                                            </span>
                                            <span>({a.z_score > 0 ? '+' : ''}{a.z_score.toFixed(2)})</span>
                                            <ChevronRight size={12} className="ml-auto text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* ═══ PERSON MODE — her satır 1 kişi, içinde tüm metrikler ═══ */
                <div className="grid grid-cols-1 gap-3">
                    {personGroups.map((g) => {
                        const cfg = SEVERITY_CFG[g.max_severity] || SEVERITY_CFG.low;
                        return (
                            <button
                                key={g.employee_id}
                                type="button"
                                onClick={() => openDrawer(g.employee_id, g.employee_name)}
                                className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 shadow-sm hover:shadow-md hover:scale-[1.005] active:scale-[0.995] transition-all text-left group cursor-pointer`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm flex-shrink-0">
                                        <span className="text-xs font-bold">{initials(g.employee_name)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-800">{g.employee_name}</span>
                                            <Tag color={cfg.tag} className="!m-0 text-[10px]">
                                                Maks: {cfg.label}
                                            </Tag>
                                            <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                                {g.anomalies.length} anomali
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                            <Building2 size={11} className="text-slate-400" />
                                            {g.department}
                                        </div>

                                        {/* Anomalies pills */}
                                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                                            {g.anomalies.map((a, idx) => {
                                                const sev = SEVERITY_CFG[a.severity] || SEVERITY_CFG.low;
                                                const TrendIcon = a.direction === 'above' ? TrendingUp : TrendingDown;
                                                const unit = METRIC_UNITS[a.metric_key] || '';
                                                return (
                                                    <span
                                                        key={`${a.metric_key}_${idx}`}
                                                        className={`inline-flex items-center gap-1.5 rounded-lg border ${sev.border} bg-white px-2 py-1 text-[11px]`}
                                                    >
                                                        <TrendIcon size={10} className={sev.icon} />
                                                        <span className="font-semibold text-slate-700">
                                                            {a.metric_label}:
                                                        </span>
                                                        <span className="tabular-nums font-bold text-slate-900">
                                                            {typeof a.value === 'number' ? a.value.toFixed(1) : a.value}
                                                            {unit && <span className="ml-0.5 text-slate-400 font-normal">{unit}</span>}
                                                        </span>
                                                        <span className={`tabular-nums font-bold ${sev.text}`}>
                                                            ({a.z_score > 0 ? '+' : ''}{a.z_score.toFixed(2)}σ)
                                                        </span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="flex-shrink-0 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="text-center text-xs text-slate-400">
                Z-score = (değer − ortalama) / standart sapma. |z| ≥ {threshold.toFixed(1)} = anomali.
                Min örneklem: 5 çalışan. · Karta tıklayarak kişinin tüm metriklerini ve trendini görüntüleyin.
            </div>

            {/* Drawer */}
            <EmployeeAnomalyDrawer
                open={drawerOpen}
                onClose={closeDrawer}
                employeeId={selectedEmp?.id}
                employeeName={selectedEmp?.name}
            />
        </div>
    );
}
