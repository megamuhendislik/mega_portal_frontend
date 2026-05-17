import React, { useState, Suspense, useCallback } from 'react';
import { message } from 'antd';
import { BarChart3, User, GitCompare, Clock, FileText, HelpCircle, Sparkles, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import { lazyRetry } from '../../../utils/lazyRetry';
import { AnalyticsProvider, useAnalytics } from './AnalyticsContext';
import AnalyticsFilterBar from './AnalyticsFilterBar';
import './analytics-print.css';
import ErrorBoundary from './shared/ErrorBoundary';
import ExportMenu from './shared/ExportMenu';
import SkeletonLoader from './shared/SkeletonLoader';
import HelpOverlay from './shared/HelpOverlay';
import FavoriteViews from './shared/FavoriteViews';
import useKeyboardShortcuts from './shared/useKeyboardShortcuts';
import DensityToggle from './shared/DensityToggle';

// lazyRetry: deploy sonrasi stale chunk hash 404 -> auto reload (kullanici hatali ekran gormez)
const YearlyTrendStrip = lazyRetry(() => import('./shared/YearlyTrendStrip'));
const OverviewTab = lazyRetry(() => import('./tabs/OverviewTab'));
const PerformanceTab = lazyRetry(() => import('./tabs/PerformanceTab'));
const ComparisonTab = lazyRetry(() => import('./tabs/ComparisonTab'));
const OvertimeMealTab = lazyRetry(() => import('./tabs/OvertimeMealTab'));
const RequestAnalyticsTab = lazyRetry(() => import('./tabs/RequestAnalyticsTab'));
const InsightsTab = lazyRetry(() => import('./tabs/InsightsTab'));
const AnomaliesTab = lazyRetry(() => import('./tabs/AnomaliesTab'));

const TABS = [
    { key: 'insights', label: 'Öngörüler', icon: Sparkles, desc: 'Aksiyon-odaklı otomatik bulgular' },
    { key: 'overview', label: 'Genel Bakış', icon: BarChart3, desc: 'KPI ve özet metrikler' },
    { key: 'performance', label: 'Mesai Analizi', icon: User, desc: 'Doluluk, fazla mesai ve eksik dağılımı' },
    { key: 'comparison', label: 'Karşılaştırma', icon: GitCompare, desc: 'Kişi & ekip kıyaslama' },
    { key: 'overtime_meal', label: 'Fazla Mesai & Yemek', icon: Clock, desc: 'Mesai ve mola analizi' },
    { key: 'requests', label: 'Talep Analizi', icon: FileText, desc: 'Çalışan talepleri + Yönetici onayları (SLA)' },
    { key: 'anomalies', label: 'Anomaliler', icon: AlertTriangle, desc: 'Z-score sapma tespiti' },
];

const TAB_LABEL = Object.fromEntries(TABS.map((t) => [t.key, t.label]));

/**
 * TeamAnalyticsInner — AnalyticsProvider context'ine erişimi gereken ana içerik.
 * Keyboard shortcuts, favori görünümler, ve ay navigasyonu context'i kullanır.
 */
function TeamAnalyticsInner() {
    const ctx = useAnalytics();
    const [activeTab, setActiveTab] = useState('insights');
    const [helpOpen, setHelpOpen] = useState(false);

    // Export — backend /api/attendance-analytics/export/ endpoint'ini cagir, dosyayi indir
    const handleExport = useCallback(async (format) => {
        if (format === 'png') {
            message.info('PNG export yakinda aktif olacak (chart snapshot)');
            return;
        }
        // pdf, excel, csv hepsi backend'ten — sadece format stringi degisir
        if (format !== 'excel' && format !== 'csv' && format !== 'pdf') {
            message.warning(`Bilinmeyen format: ${format}`);
            return;
        }
        try {
            const response = await api.get('/attendance-analytics/export/', {
                params: { ...ctx.queryParams, format },
                responseType: 'blob',
                timeout: 120000,
            });
            // Content-Disposition'dan dosya adını çöz
            const contentDisposition = response.headers['content-disposition'] || '';
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            const extMap = { excel: 'xlsx', csv: 'csv', pdf: 'pdf' };
            const filename = match ? match[1] : `analiz.${extMap[format] || format}`;

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success(`${format.toUpperCase()} indirildi: ${filename}`);
        } catch (err) {
            const msg = err?.response?.data?.error || err?.message || 'Indirme hatasi';
            message.error(`Disa aktarim basarisiz: ${msg}`);
        }
    }, [ctx.queryParams]);

    // URL query state getter — FavoriteViews için
    const getCurrentQueryString = useCallback(() => {
        if (typeof window === 'undefined') return '';
        return window.location.search || '';
    }, []);

    // Favori uygulama — URL'i değiştir, context URL'den hydrate edecek (sayfa yenileme ile)
    const applyFavorite = useCallback((queryString) => {
        if (typeof window === 'undefined') return;
        const newUrl = `${window.location.pathname}${queryString}`;
        // History'yi kirletmeden değiştir
        window.history.replaceState(null, '', newUrl);
        // Reload sayfayı — basit ve güvenilir (URL'i Context hydrate eder)
        window.location.reload();
    }, []);

    // Klavye kısayolları
    useKeyboardShortcuts({
        '?': () => setHelpOpen((v) => !v),
        'Escape': () => setHelpOpen(false),
        'r': () => ctx?.refetch && ctx.refetch(),
        'ArrowLeft': () => ctx?.navigateMonth && ctx.navigateMonth((ctx.monthOffset ?? 0) - 1),
        'ArrowRight': () => ctx?.navigateMonth && ctx.navigateMonth((ctx.monthOffset ?? 0) + 1),
        't': () => ctx?.navigateMonth && ctx.navigateMonth(0),
    });

    return (
        <div className="space-y-4">
            {/* ═══ Filter Bar (Mali Yıl + filtre + tab detayları birleşik) ═══ */}
            <AnalyticsFilterBar />

            {/* ═══ Yıllık Trend Strip — global üst (her tab'ın üstünde) ═══ */}
            <Suspense fallback={null}>
                <YearlyTrendStrip />
            </Suspense>

            {/* Tab navigation + actions */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-sm overflow-x-auto no-scrollbar flex-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-max">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap group ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-transparent text-slate-400 group-hover:text-slate-500'}`}>
                                        <Icon size={14} />
                                    </div>
                                    <div className="text-left">
                                        <div>{tab.label}</div>
                                        <div className={`text-[9px] font-medium mt-0.5 ${isActive ? 'text-indigo-400' : 'text-slate-300 group-hover:text-slate-400'}`}>{tab.desc}</div>
                                    </div>
                                    {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    <DensityToggle />
                    <FavoriteViews
                        getCurrentState={getCurrentQueryString}
                        onApply={applyFavorite}
                        activeQueryString={getCurrentQueryString()}
                    />
                    <button
                        onClick={() => setHelpOpen(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-200/80 hover:border-indigo-200 transition-colors"
                        title="Yardım (?)"
                    >
                        <HelpCircle size={11} />
                        Yardım
                    </button>
                    <ExportMenu size="middle" onExport={handleExport} />
                </div>
            </div>

            {/* Tab content — ErrorBoundary ile sarılı */}
            <ErrorBoundary
                resetKey={activeTab}
                label={`${TAB_LABEL[activeTab] || 'Bu sekme'} yüklenemedi`}
            >
                <Suspense fallback={<SkeletonLoader variant="section" />}>
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'performance' && <PerformanceTab />}
                    {activeTab === 'comparison' && <ComparisonTab />}
                    {activeTab === 'overtime_meal' && <OvertimeMealTab />}
                    {activeTab === 'insights' && <InsightsTab />}
                    {activeTab === 'requests' && <RequestAnalyticsTab />}
                    {activeTab === 'anomalies' && <AnomaliesTab />}
                </Suspense>
            </ErrorBoundary>

            {/* Help overlay (? ile açılır, Escape ile kapanır) */}
            <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
    );
}

export default function TeamAnalytics() {
    return (
        <AnalyticsProvider>
            <TeamAnalyticsInner />
        </AnalyticsProvider>
    );
}
