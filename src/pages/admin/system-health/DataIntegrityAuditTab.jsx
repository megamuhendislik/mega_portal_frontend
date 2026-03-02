import React, { useState } from 'react';
import {
    ShieldCheckIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
    WrenchScrewdriverIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
    ot_overlap: 'OT Cakismasi',
    attendance_recalc: 'Mesai Yeniden Hesaplama',
    orphan_requests: 'Sahipsiz Talepler',
    duration_mismatch: 'Sure Uyumsuzlugu',
    status_anomaly: 'Durum Anomalisi',
    missing_attendance: 'Eksik Mesai Kaydi',
    fiscal_integrity: 'Mali Donem Butunlugu',
    timezone_diagnostics: 'Saat Dilimi Tanilama',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

const SEVERITY_COLORS = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
};

const SEVERITY_LABELS = {
    HIGH: 'Yuksek',
    MEDIUM: 'Orta',
    LOW: 'Dusuk',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDateFrom() {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
}

function getDefaultDateTo() {
    return new Date().toISOString().split('T')[0];
}

const SeverityBadge = ({ severity }) => {
    const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
    const label = SEVERITY_LABELS[severity] || severity;
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

const ActionBadge = ({ fixAction, fixable, mode }) => {
    if (mode === 'fix' && fixable) {
        return (
            <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                    Duzeltildi
                </span>
                {fixAction && (
                    <div className="text-[10px] text-green-600 mt-0.5">{fixAction}</div>
                )}
            </div>
        );
    }
    return (
        <div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                fixable
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
                {fixable ? 'Duzelt. (fix mod)' : 'Manuel Inceleme'}
            </span>
            {fixAction && (
                <div className="text-[10px] text-gray-400 mt-0.5">{fixAction}</div>
            )}
        </div>
    );
};

// ─── Category Card ──────────────────────────────────────────────────────────

const CategoryCard = ({ categoryKey, categoryData, auditMode }) => {
    const [expanded, setExpanded] = useState(false);
    const label = CATEGORY_LABELS[categoryKey] || categoryKey;
    const { severity, count, fixed, issues } = categoryData;

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
                            {fixed} duzeltildi
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
                    {categoryData.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-700">
                            <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                            Hata: {categoryData.error}
                        </div>
                    )}
                    {issues && issues.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-8">
                                            #
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                            Calisan
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                            Tarih
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{minWidth: '320px'}}>
                                            Sorun Detayi
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{minWidth: '180px'}}>
                                            Duzeltme Islemi
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-16">
                                            Kayit ID
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issues.map((issue, idx) => (
                                        <tr
                                            key={idx}
                                            className={`border-b border-gray-100 hover:bg-blue-50/30 ${
                                                issue.fixable === false ? 'bg-amber-50/20' : ''
                                            }`}
                                        >
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">
                                                <div className="font-bold text-gray-800 text-xs">
                                                    {issue.employee_name}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    ID: {issue.employee_id}
                                                </div>
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
                                            <td className="py-2.5 px-2">
                                                <ActionBadge
                                                    fixAction={issue.fix_action}
                                                    fixable={issue.fixable}
                                                    mode={auditMode}
                                                />
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">
                                                {issue.id || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 py-4 text-center">Bu kategoride sorun yok.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DataIntegrityAuditTab() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);

    // Filters
    const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
    const [dateTo, setDateTo] = useState(getDefaultDateTo);
    const [employeeId, setEmployeeId] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([...ALL_CATEGORIES]);

    const toggleCategory = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const selectAllCategories = () => setSelectedCategories([...ALL_CATEGORIES]);
    const clearAllCategories = () => setSelectedCategories([]);

    const runAudit = async (mode) => {
        if (mode === 'fix') {
            if (
                !window.confirm(
                    'DIKKAT: Bu islem veritabanindaki verileri degistirecektir.\n\nDuzeltme modunu calistirmak istediginize emin misiniz?'
                )
            ) {
                return;
            }
        }

        if (selectedCategories.length === 0) {
            setError('En az bir kategori secmelisiniz.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const body = {
                mode,
                categories: selectedCategories,
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (employeeId) {
                body.employee_id = Number(employeeId);
            }
            const res = await api.post('/system/health-check/data-integrity-audit/', body);
            setResults(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Denetim calistirilamadi');
        } finally {
            setLoading(false);
        }
    };

    const totalFixed = results
        ? Object.values(results.categories || {}).reduce((sum, cat) => sum + (cat.fixed || 0), 0)
        : 0;

    const categoriesWithIssues = results
        ? Object.entries(results.categories || {}).filter(([, cat]) => cat.count > 0)
        : [];

    const categoriesClean = results
        ? Object.entries(results.categories || {}).filter(([, cat]) => cat.count === 0)
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                            Veri Butunlugu Denetimi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Veritabanindaki tutarsizliklari, cakismalari ve anomalileri tespit eder. Duzeltme modu ile otomatik onarim yapilabilir.
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Baslangic</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Bitis</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Calisan ID (opsiyonel)</label>
                        <input
                            type="number"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Bos = Tumu"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => runAudit('scan')}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            )}
                            {loading ? 'Taraniyor...' : 'Tara'}
                        </button>
                        <button
                            onClick={() => runAudit('fix')}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <WrenchScrewdriverIcon className="w-4 h-4" />
                            )}
                            Duzelt
                        </button>
                    </div>
                </div>

                {/* Category Selection */}
                <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500">Kategoriler:</span>
                        <button
                            onClick={selectAllCategories}
                            className="text-[10px] text-indigo-600 hover:underline font-medium"
                        >
                            Tumunu Sec
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            onClick={clearAllCategories}
                            className="text-[10px] text-indigo-600 hover:underline font-medium"
                        >
                            Temizle
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ALL_CATEGORIES.map((cat) => (
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

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Results */}
            {results && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <StatCard
                            label="Toplam Sorun"
                            value={results.total_issues || 0}
                            color={
                                results.total_issues > 0
                                    ? 'bg-red-50 border-red-100 text-red-700'
                                    : 'bg-green-50 border-green-100 text-green-700'
                            }
                            sub={results.total_issues > 0 ? `${categoriesWithIssues.length} kategoride` : 'Temiz'}
                        />
                        <StatCard
                            label="Otomatik Duzelt."
                            value={results.summary?.fixable || 0}
                            color="bg-amber-50 border-amber-100 text-amber-700"
                            sub="fix modu ile duzeltilir"
                        />
                        <StatCard
                            label="Manuel Inceleme"
                            value={results.summary?.manual_review || 0}
                            color="bg-slate-50 border-slate-100 text-slate-700"
                            sub="elle kontrol gerekir"
                        />
                        <StatCard
                            label="Duzeltilen"
                            value={totalFixed}
                            color={totalFixed > 0 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}
                            sub={results.mode === 'fix' ? 'bu calistirmada' : 'tarama modu'}
                        />
                        <StatCard
                            label="Gecen Sure"
                            value={`${(results.elapsed_seconds || 0).toFixed(2)}s`}
                            color="bg-blue-50 border-blue-100 text-blue-700"
                            sub={results.summary?.date_range ? `${results.summary.date_range.start} ~ ${results.summary.date_range.end}` : ''}
                        />
                        <StatCard
                            label="Mod"
                            value={results.mode === 'fix' ? 'Duzeltme' : 'Tarama'}
                            color={
                                results.mode === 'fix'
                                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            }
                            sub={`${Object.keys(results.categories || {}).length} kategori tarandi`}
                        />
                    </div>

                    {/* Categories with Issues */}
                    {categoriesWithIssues.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                                Sorun Bulunan Kategoriler ({categoriesWithIssues.length})
                            </h3>
                            {categoriesWithIssues
                                .sort(
                                    (a, b) =>
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a[1].severity] || 3) -
                                        ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b[1].severity] || 3)
                                )
                                .map(([key, data]) => (
                                    <CategoryCard key={key} categoryKey={key} categoryData={data} auditMode={results.mode} />
                                ))}
                        </div>
                    )}

                    {/* Clean Categories */}
                    {categoriesClean.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                Temiz Kategoriler ({categoriesClean.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {categoriesClean.map(([key]) => (
                                    <span
                                        key={key}
                                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                                    >
                                        {CATEGORY_LABELS[key] || key}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All clean */}
                    {results.total_issues === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                            <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-green-700">Sorun Bulunamadi</h3>
                            <p className="text-xs text-green-600 mt-1">
                                Taranan tum kategorilerde veri butunlugu saglanmis.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Empty state */}
            {!results && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <ShieldCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600">Denetim Baslatilmadi</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        "Tara" butonuna tiklayarak veri butunlugu denetimini baslatin. Sorunlari otomatik onarmak icin "Duzelt" kullanin.
                    </p>
                </div>
            )}
        </div>
    );
}
