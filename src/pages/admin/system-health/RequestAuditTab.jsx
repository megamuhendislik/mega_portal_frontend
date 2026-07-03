import React, { useState, useCallback } from 'react';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import {
    ClipboardDocumentCheckIcon,
    MagnifyingGlassIcon,
    WrenchScrewdriverIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import StalePotentialCleanup from './StalePotentialCleanup';

// ─── Constants ──────────────────────────────────────────────────────────────

const AUDIT_ENDPOINT = '/system/health-check/data-integrity-audit/';

// Talep (request) odaklı denetim kategorileri. Backend bu kategorileri destekler
// (deploy edildi). Sıralama = rapor/kart görünüm sırası.
const REQUEST_CATEGORIES = [
    'multiday_duty_single_segment',
    'duty_no_attendance',
    'duty_ot_stuck',
    'halfday_duty_overrun',
    'external_duty_consistency',
    'orphan_requests',
    'leave_ot_conflict',
    'leave_duty_conflict',
    'duration_mismatch',
    'status_anomaly',
];

const CATEGORY_LABELS = {
    multiday_duty_single_segment: 'Çok-günlü Görev Tek-Gün İşlenmiş',
    duty_no_attendance: 'Dış Görev Kaydı Yok',
    duty_ot_stuck: 'Görev Fazla Mesaisi Takılı',
    halfday_duty_overrun: 'Yarım-Gün Kesimini Aşan Görev Saati',
    external_duty_consistency: 'Dış Görev Tutarlılığı',
    orphan_requests: 'Sahipsiz Talep',
    leave_ot_conflict: 'İzin + Fazla Mesai Çakışması',
    leave_duty_conflict: 'İzin + Dış Görev Çakışması',
    duration_mismatch: 'Süre Uyuşmazlığı',
    status_anomaly: 'Durum Anomalisi',
};

// SEVERITY renk haritası — DataIntegrityAuditTab ile birebir tutarlı.
const SEVERITY_COLORS = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
};

const SEVERITY_LABELS = {
    HIGH: 'Yüksek',
    MEDIUM: 'Orta',
    LOW: 'Düşük',
};

const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDateFrom() {
    return getIstanbulDateOffset(-90);
}

function getDefaultDateTo() {
    return getIstanbulToday();
}

// Fix mode yanıtından toplam onarılan sayısını topla.
function sumFixed(data) {
    return Object.values(data?.categories || {}).reduce((s, c) => s + (c.fixed || 0), 0);
}

// Tüm kategorilerdeki sorun sayısını topla.
function sumIssues(data) {
    return Object.values(data?.categories || {}).reduce((s, c) => s + (c.count || 0), 0);
}

// Fixable (otomatik düzeltilebilir) sorun sayısı.
function sumFixable(data) {
    return Object.values(data?.categories || {}).reduce(
        (s, c) => s + (c.issues || []).filter((i) => i.fixable).length, 0
    );
}

// Backend elapsed_ms (ms) veya elapsed_seconds (sn) döndürebilir — ikisini de destekle.
function elapsedSeconds(data) {
    if (data?.elapsed_ms != null) return Number(data.elapsed_ms) / 1000;
    if (data?.elapsed_seconds != null) return Number(data.elapsed_seconds);
    return 0;
}

const SeverityBadge = ({ severity }) => {
    const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
    const label = SEVERITY_LABELS[severity] || severity || '-';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors}`}>
            {label}
        </span>
    );
};

const StatCard = ({ label, value, color, sub }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs font-medium mt-1">{label}</div>
        {sub && <div className="text-[10px] mt-0.5 opacity-70">{sub}</div>}
    </div>
);

// ─── Category Card ──────────────────────────────────────────────────────────

const CategoryCard = ({ categoryKey, categoryData, onFixIssue, onFixCategory, fixingKey, busy }) => {
    const [expanded, setExpanded] = useState(false);
    const label = CATEGORY_LABELS[categoryKey] || categoryKey;
    const { severity, count, fixed, issues, error } = categoryData;
    const fixableCount = (issues || []).filter((i) => i.fixable).length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <SeverityBadge severity={severity} />
                    <span className="text-sm font-bold text-gray-800">{label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        {count} sorun
                    </span>
                    {fixed > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                            {fixed} düzeltildi
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                )}
            </button>
            {expanded && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-700">
                            <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                            Hata: {error}
                        </div>
                    )}
                    {issues && issues.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] w-8">#</th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">Çalışan</th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">Tarih</th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{ minWidth: '320px' }}>Sorun Detayı</th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-16">Talep ID</th>
                                        <th className="text-right py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-24">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issues.map((issue, idx) => (
                                        <tr
                                            key={issue.id ?? idx}
                                            className={`border-b border-gray-100 hover:bg-blue-50/30 ${
                                                issue.fixable === false ? 'bg-amber-50/20' : ''
                                            }`}
                                        >
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">{idx + 1}</td>
                                            <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">
                                                <div className="font-bold text-gray-800 text-xs">{issue.employee_name || '-'}</div>
                                                <div className="text-[10px] text-gray-400">ID: {issue.employee_id ?? '-'}</div>
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">
                                                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {issue.date || '-'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700">
                                                <div className="text-xs leading-relaxed">
                                                    {issue.description || issue.detail || '-'}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">
                                                {issue.request_id ?? issue.id ?? '-'}
                                            </td>
                                            <td className="py-2.5 px-2 text-right">
                                                {issue.fixable ? (
                                                    <button
                                                        onClick={() => onFixIssue(categoryKey, issue)}
                                                        disabled={busy}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg inline-flex items-center gap-1 disabled:opacity-50 transition-colors"
                                                    >
                                                        {fixingKey === `issue:${issue.id}` ? (
                                                            <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <WrenchScrewdriverIcon className="w-3 h-3" />
                                                        )}
                                                        Onar
                                                    </button>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                        elle
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 py-4 text-center">Bu kategoride sorun yok.</p>
                    )}
                    {fixableCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => onFixCategory(categoryKey)}
                                disabled={busy}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                            >
                                {fixingKey === `cat:${categoryKey}` ? (
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                                )}
                                Hepsini Onar ({fixableCount})
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RequestAuditTab() {
    const [startDate, setStartDate] = useState(getDefaultDateFrom);
    const [endDate, setEndDate] = useState(getDefaultDateTo);
    const [employeeId, setEmployeeId] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([...REQUEST_CATEGORIES]);

    const [loading, setLoading] = useState(false);       // tarama
    const [fixingKey, setFixingKey] = useState(null);    // 'issue:<id>' | 'cat:<key>' | 'all'
    const [results, setResults] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState(null);
    const [fixNotice, setFixNotice] = useState(null);

    const busy = loading || fixingKey !== null;

    // ─── Kategori seçimi ─────────────────────────────────────────────────────
    const toggleCategory = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };
    const selectAllCategories = () => setSelectedCategories([...REQUEST_CATEGORIES]);
    const clearAllCategories = () => setSelectedCategories([]);

    // Ortak body kurucu — tarih aralığı + opsiyonel çalışan.
    const buildBody = useCallback((extra) => {
        const body = { date_from: startDate, date_to: endDate, ...extra };
        if (employeeId) body.employee_id = Number(employeeId);
        return body;
    }, [startDate, endDate, employeeId]);

    // Tarama (dry-run) — hem "Dry-run Tara" hem fix sonrası re-scan kullanır.
    const performScan = useCallback(async (categories) => {
        const res = await api.post(
            AUDIT_ENDPOINT,
            buildBody({ mode: 'scan', categories }),
            { timeout: 1800000 }
        );
        return res.data;
    }, [buildBody]);

    const runScan = async () => {
        if (selectedCategories.length === 0) {
            setError('En az bir kategori seçmelisiniz.');
            return;
        }
        setLoading(true);
        setError(null);
        setFixNotice(null);
        try {
            const data = await performScan(selectedCategories);
            setResults(data);
            setScanned(true);
        } catch (err) {
            const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
            setError(
                err.response?.data?.error
                || err.response?.data?.detail
                || (isTimeout
                    ? 'Denetim çok uzun sürdü (timeout). Daha kısa tarih aralığı veya tek çalışan deneyin.'
                    : 'Denetim çalıştırılamadı')
            );
        } finally {
            setLoading(false);
        }
    };

    // Ortak fix akışı — fix çağır → onarılan sayısını al → otomatik re-scan → bildir.
    const runFix = useCallback(async ({ categories, issueIds, confirmMsg, busyKey }) => {
        if (!scanned) return;
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setFixingKey(busyKey);
        setError(null);
        setFixNotice(null);
        try {
            const extra = { mode: 'fix', categories };
            if (issueIds) extra.issue_ids = issueIds;
            const fixRes = await api.post(AUDIT_ENDPOINT, buildBody(extra), { timeout: 1800000 });
            const fixed = sumFixed(fixRes.data);
            // Otomatik re-scan: güncel durumu göster.
            const scanData = await performScan(selectedCategories);
            setResults(scanData);
            setFixNotice(
                fixed > 0
                    ? `${fixed} kayıt onarıldı.`
                    : 'Onarım tamamlandı — otomatik düzeltilen kayıt bulunmadı (manuel inceleme gerekebilir).'
            );
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Düzeltme başarısız');
        } finally {
            setFixingKey(null);
        }
    }, [scanned, buildBody, performScan, selectedCategories]);

    // Tekli onar
    const fixIssue = useCallback((categoryKey, issue) => {
        if (!issue?.id) return;
        runFix({
            categories: [categoryKey],
            issueIds: [issue.id],
            busyKey: `issue:${issue.id}`,
            confirmMsg:
                `"${CATEGORY_LABELS[categoryKey] || categoryKey}" kategorisinde ` +
                `${issue.employee_name || 'kayıt'} (#${issue.id}) onarılacak.\n\nDevam?`,
        });
    }, [runFix]);

    // Kategori bazında hepsini onar
    const fixCategory = useCallback((categoryKey) => {
        const catData = results?.categories?.[categoryKey];
        const fixableCount = (catData?.issues || []).filter((i) => i.fixable).length;
        runFix({
            categories: [categoryKey],
            busyKey: `cat:${categoryKey}`,
            confirmMsg:
                `"${CATEGORY_LABELS[categoryKey] || categoryKey}" kategorisindeki ` +
                `${fixableCount} sorun onarılacak.\n\nDevam?`,
        });
    }, [results, runFix]);

    // Tümünü onar
    const fixAll = useCallback(() => {
        const total = sumFixable(results);
        runFix({
            categories: REQUEST_CATEGORIES,
            busyKey: 'all',
            confirmMsg:
                `DİKKAT: Bu işlem veritabanındaki talep verilerini değiştirecektir.\n\n` +
                `${total} otomatik düzeltilebilir sorun onarılacak.\n\nDevam etmek istiyor musunuz?`,
        });
    }, [results, runFix]);

    // ─── TXT indir — mevcut tarama sonucundan kompakt metin üret + Blob indir ──
    const downloadTxt = () => {
        if (!results) {
            alert('Önce "Dry-run Tara" çalıştırın.');
            return;
        }
        const lines = [];
        lines.push('TALEP DENETİMİ RAPORU');
        lines.push('='.repeat(60));
        lines.push(`Tarih Aralığı : ${startDate} ~ ${endDate}`);
        if (employeeId) lines.push(`Çalışan ID    : ${employeeId}`);
        lines.push(`Oluşturulma   : ${new Date().toLocaleString('tr-TR')}`);
        lines.push(`Toplam Sorun  : ${sumIssues(results)}`);
        lines.push(`Oto. Düzelt.  : ${sumFixable(results)}`);
        lines.push('='.repeat(60));

        for (const cat of REQUEST_CATEGORIES) {
            const data = results.categories?.[cat];
            if (!data) continue;
            const label = CATEGORY_LABELS[cat] || cat;
            lines.push('');
            lines.push(`### ${label}  [${data.severity || '-'}]  — ${data.count || 0} kayıt`);
            if (data.error) {
                lines.push(`  ! HATA: ${data.error}`);
                continue;
            }
            const issues = data.issues || [];
            if (issues.length === 0) {
                lines.push('  (temiz)');
                continue;
            }
            for (const issue of issues) {
                const who = `${issue.employee_name || '?'} (ID ${issue.employee_id ?? '-'})`;
                const flag = issue.fixable ? 'oto' : 'elle';
                lines.push(
                    `  - ${who} | ${issue.date || '-'} | talep#${issue.request_id ?? issue.id ?? '-'} ` +
                    `| ${flag} | ${issue.description || issue.detail || ''}`
                );
            }
        }

        const text = lines.join('\n');
        try {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `talep_denetimi_${startDate}_${endDate}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert('TXT indirme hatası: ' + (e.message || 'Bilinmeyen'));
        }
    };

    // ─── Türetilmiş listeler ─────────────────────────────────────────────────
    const categoryEntries = results ? Object.entries(results.categories || {}) : [];
    const categoriesWithIssues = categoryEntries.filter(([, c]) => (c.count || 0) > 0);
    const categoriesClean = categoryEntries.filter(([, c]) => (c.count || 0) === 0 && !c.error);
    const categoriesErrored = categoryEntries.filter(([, c]) => (c.count || 0) === 0 && c.error);

    const totalIssues = sumIssues(results);
    const totalFixable = sumFixable(results);

    const sortBySeverity = (a, b) =>
        (SEVERITY_ORDER[a[1].severity] ?? 3) - (SEVERITY_ORDER[b[1].severity] ?? 3);

    return (
        <div className="space-y-6">
            <StalePotentialCleanup />

            {/* Header + Filtreler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardDocumentCheckIcon className="w-5 h-5 text-indigo-600" />
                            Talep Denetimi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Dış görev, izin ve fazla mesai taleplerindeki veri bozukluklarını dry-run ile tespit eder.
                            Sorunlar tekli veya toplu onarılabilir; düzeltme sonrası otomatik yeniden taranır.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Çalışan ID (opsiyonel)</label>
                        <input
                            type="number"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Boş = Tümü"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={runScan}
                            disabled={busy}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            )}
                            {loading ? 'Taranıyor...' : 'Dry-run Tara'}
                        </button>
                        <button
                            onClick={fixAll}
                            disabled={busy || !scanned || totalFixable === 0}
                            title={!scanned ? 'Önce dry-run tarama yapın' : (totalFixable === 0 ? 'Otomatik düzeltilebilir sorun yok' : 'Tüm kategorilerdeki otomatik düzeltilebilir sorunları onar')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {fixingKey === 'all' ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <WrenchScrewdriverIcon className="w-4 h-4" />
                            )}
                            Tümünü Onar
                        </button>
                        <button
                            onClick={downloadTxt}
                            disabled={busy || !results}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            TXT İndir
                        </button>
                    </div>
                </div>

                {/* Kategori Seçimi */}
                <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500">Kategoriler:</span>
                        <button onClick={selectAllCategories} className="text-[10px] text-indigo-600 hover:underline font-medium">
                            Tümünü Seç
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={clearAllCategories} className="text-[10px] text-indigo-600 hover:underline font-medium">
                            Temizle
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {REQUEST_CATEGORIES.map((cat) => (
                            <label
                                key={cat}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                                    selectedCategories.includes(cat)
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-500'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(cat)}
                                    onChange={() => toggleCategory(cat)}
                                    className="w-3 h-3 text-indigo-600 rounded"
                                />
                                {CATEGORY_LABELS[cat]}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hata */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Onarım bildirimi */}
            {fixNotice && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    {fixNotice}
                </div>
            )}

            {/* Sonuçlar */}
            {results && (
                <>
                    {/* Özet Kartlar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                            label="Toplam Sorun"
                            value={totalIssues}
                            color={totalIssues > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}
                            sub={totalIssues > 0 ? `${categoriesWithIssues.length} kategoride` : 'Temiz'}
                        />
                        <StatCard
                            label="Oto. Düzeltilebilir"
                            value={totalFixable}
                            color="bg-amber-50 border-amber-100 text-amber-700"
                            sub="Onar ile düzeltilir"
                        />
                        <StatCard
                            label="Manuel İnceleme"
                            value={Math.max(0, totalIssues - totalFixable)}
                            color="bg-slate-50 border-slate-100 text-slate-700"
                            sub="elle kontrol gerekir"
                        />
                        <StatCard
                            label="Geçen Süre"
                            value={`${elapsedSeconds(results).toFixed(2)}s`}
                            color="bg-blue-50 border-blue-100 text-blue-700"
                            sub={`${categoryEntries.length} kategori tarandı`}
                        />
                    </div>

                    {/* Sorun Bulunan Kategoriler */}
                    {categoriesWithIssues.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                                Sorun Bulunan Kategoriler ({categoriesWithIssues.length})
                            </h3>
                            {categoriesWithIssues.sort(sortBySeverity).map(([key, data]) => (
                                <CategoryCard
                                    key={key}
                                    categoryKey={key}
                                    categoryData={data}
                                    onFixIssue={fixIssue}
                                    onFixCategory={fixCategory}
                                    fixingKey={fixingKey}
                                    busy={busy}
                                />
                            ))}
                        </div>
                    )}

                    {/* Taranamayan Kategoriler (count 0 ama hata var) */}
                    {categoriesErrored.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
                            <h3 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                                Taranamayan Kategoriler ({categoriesErrored.length})
                            </h3>
                            <div className="space-y-2">
                                {categoriesErrored.map(([key, cat]) => (
                                    <div key={key} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 shrink-0">
                                            TARANAMADI
                                        </span>
                                        <div className="text-xs">
                                            <span className="font-bold text-red-800">{CATEGORY_LABELS[key] || key}</span>
                                            {cat.error ? <span className="text-red-600"> — {cat.error}</span> : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Temiz Kategoriler */}
                    {categoriesClean.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                Temiz Kategoriler ({categoriesClean.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {categoriesClean.map(([key]) => (
                                    <span key={key} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                        {CATEGORY_LABELS[key] || key}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hepsi temiz */}
                    {totalIssues === 0 && categoriesErrored.length === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                            <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-green-700">Bozukluk Bulunamadı</h3>
                            <p className="text-xs text-green-600 mt-1">
                                Taranan tüm talep kategorilerinde veri bütünlüğü sağlanmış.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Boş durum */}
            {!results && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600">Denetim Başlatılmadı</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        "Dry-run Tara" ile talep verilerindeki bozuklukları tespit edin. Sorunları tekli veya toplu onarabilirsiniz.
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2 flex items-center justify-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Onar butonları yalnızca tarama sonrası aktifleşir.
                    </p>
                </div>
            )}
        </div>
    );
}
