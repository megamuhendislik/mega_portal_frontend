import React, { useState, useCallback } from 'react';
import api from '../../../services/api';
import {
    MagnifyingGlassIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    TagIcon,
    CalendarDaysIcon,
    ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

// ─── Constants ──────────────────────────────────────────────────────────────

const MODEL_COLORS = {
    attendance: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    overtime_request: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    leave_request: 'bg-blue-100 text-blue-800 border-blue-200',
    meal_request: 'bg-amber-100 text-amber-800 border-amber-200',
    cardless_entry: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    employee: 'bg-slate-100 text-slate-800 border-slate-200',
    department: 'bg-violet-100 text-violet-800 border-violet-200',
    job_position: 'bg-pink-100 text-pink-800 border-pink-200',
    work_schedule: 'bg-teal-100 text-teal-800 border-teal-200',
    monthly_summary: 'bg-gray-100 text-gray-800 border-gray-200',
    work_target: 'bg-gray-100 text-gray-700 border-gray-200',
    fiscal_calendar: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    gate_event: 'bg-orange-100 text-orange-800 border-orange-200',
    user: 'bg-red-100 text-red-800 border-red-200',
};

const MODEL_DOT_COLORS = {
    attendance: 'bg-indigo-500',
    overtime_request: 'bg-emerald-500',
    leave_request: 'bg-blue-500',
    meal_request: 'bg-amber-500',
    cardless_entry: 'bg-cyan-500',
    employee: 'bg-slate-500',
    department: 'bg-violet-500',
    job_position: 'bg-pink-500',
    work_schedule: 'bg-teal-500',
    monthly_summary: 'bg-gray-500',
    work_target: 'bg-gray-400',
    fiscal_calendar: 'bg-fuchsia-500',
    gate_event: 'bg-orange-500',
    user: 'bg-red-500',
};

const CATEGORY_CONFIG = {
    prefix_match: {
        label: 'Prefix',
        icon: TagIcon,
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        summaryBg: 'bg-purple-50 border-purple-200',
        summaryText: 'text-purple-700',
        summaryValue: 'text-purple-900',
    },
    future_dated: {
        label: 'Gelecek Tarih',
        icon: CalendarDaysIcon,
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        summaryBg: 'bg-orange-50 border-orange-200',
        summaryText: 'text-orange-700',
        summaryValue: 'text-orange-900',
    },
    suspicious_content: {
        label: 'Supheli Icerik',
        icon: ShieldExclamationIcon,
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        summaryBg: 'bg-yellow-50 border-yellow-200',
        summaryText: 'text-yellow-700',
        summaryValue: 'text-yellow-900',
    },
};

// ─── Spinner ────────────────────────────────────────────────────────────────

const Spinner = ({ className = 'h-5 w-5 text-white' }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

// ─── Model Badge ────────────────────────────────────────────────────────────

const ModelBadge = ({ model, label }) => {
    const colors = MODEL_COLORS[model] || 'bg-gray-100 text-gray-700 border-gray-200';
    const dotColor = MODEL_DOT_COLORS[model] || 'bg-gray-400';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${colors}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {label || model}
        </span>
    );
};

// ─── Category Badge ─────────────────────────────────────────────────────────

const CategoryBadge = ({ category }) => {
    const config = CATEGORY_CONFIG[category];
    if (!config) return <span className="text-gray-400 text-xs">{category}</span>;
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.badgeClass}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
};

// ─── Summary Card ───────────────────────────────────────────────────────────

const SummaryCard = ({ value, label, bgClass, textClass, valueClass }) => (
    <div className={`rounded-xl border p-4 flex flex-col items-center justify-center min-w-[120px] ${bgClass}`}>
        <span className={`text-2xl font-bold ${valueClass}`}>{value}</span>
        <span className={`text-xs font-medium mt-1 ${textClass}`}>{label}</span>
    </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DataBrowserTab() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Map());
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState(null);
    const [filterModel, setFilterModel] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [expandedRows, setExpandedRows] = useState(new Set());

    // ── Scan ────────────────────────────────────────────────────────────────

    const handleScan = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        setSelectedIds(new Map());
        setExpandedRows(new Set());
        try {
            const response = await api.get('/system/health-check/scan-test-data-detailed/');
            setData(response.data);
            if (response.data.summary?.total === 0) {
                setMessage({ type: 'success', text: 'Sistemde test verisi bulunamadi. Her sey temiz!' });
            }
        } catch (err) {
            const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
            setMessage({ type: 'error', text: `Tarama hatasi: ${detail}` });
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Filtered records ────────────────────────────────────────────────────

    const filteredRecords = data?.records?.filter((r) => {
        if (filterModel !== 'all' && r.model !== filterModel) return false;
        if (filterCategory !== 'all' && r.category !== filterCategory) return false;
        return true;
    }) || [];

    // ── Unique model/category options from data ─────────────────────────────

    const modelOptions = data?.records
        ? [...new Map(data.records.map((r) => [r.model, r.model_label])).entries()]
            .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
        : [];

    const categoryOptions = data?.records
        ? [...new Set(data.records.map((r) => r.category))].sort()
        : [];

    // ── Selection handlers ──────────────────────────────────────────────────

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
            setSelectedIds(new Map());
        } else {
            const next = new Map();
            filteredRecords.forEach((r) => {
                next.set(`${r.model}:${r.id}`, { model: r.model, id: r.id });
            });
            setSelectedIds(next);
        }
    };

    const toggleSelectRow = (record) => {
        const key = `${record.model}:${record.id}`;
        setSelectedIds((prev) => {
            const next = new Map(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.set(key, { model: record.model, id: record.id });
            }
            return next;
        });
    };

    // ── Row expand toggle ───────────────────────────────────────────────────

    const toggleExpand = (record) => {
        const key = `${record.model}:${record.id}`;
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // ── Bulk delete ─────────────────────────────────────────────────────────

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmed = window.confirm(
            `${selectedIds.size} kayit kalici olarak silinecek. Bu islem geri alinamaz!\n\nDevam etmek istiyor musunuz?`
        );
        if (!confirmed) return;

        setDeleting(true);
        setMessage(null);

        try {
            // Group by model
            const grouped = {};
            selectedIds.forEach(({ model, id }) => {
                if (!grouped[model]) grouped[model] = [];
                grouped[model].push(id);
            });

            let totalDeleted = 0;
            const allWarnings = [];

            for (const [model, ids] of Object.entries(grouped)) {
                const response = await api.post('/system/health-check/delete-records/', { model, ids });
                totalDeleted += response.data?.deleted || ids.length;
                if (response.data?.warnings?.length) {
                    allWarnings.push(...response.data.warnings);
                }
            }

            const warningsText = allWarnings.length > 0 ? ` Uyarilar: ${allWarnings.join(', ')}` : '';
            setMessage({
                type: 'success',
                text: `${totalDeleted} kayit basariyla silindi.${warningsText}`,
            });
            setSelectedIds(new Map());

            // Re-scan to refresh
            await handleScan();
        } catch (err) {
            const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
            setMessage({ type: 'error', text: `Silme hatasi: ${detail}` });
        } finally {
            setDeleting(false);
        }
    };

    // ── Derived ─────────────────────────────────────────────────────────────

    const allSelected = filteredRecords.length > 0 && selectedIds.size === filteredRecords.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < filteredRecords.length;
    const summary = data?.summary;

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Message Banner ─────────────────────────────────────────── */}
            {message && (
                <div
                    className={`rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200 ${
                        message.type === 'success'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                    }`}
                >
                    {message.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <p className={`text-sm font-medium ${
                        message.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                        {message.text}
                    </p>
                    <button
                        onClick={() => setMessage(null)}
                        className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* ── Header + Scan Button ───────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <MagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Test Verisi Tarayici</h3>
                        </div>
                        <p className="text-sm text-gray-500 ml-[52px]">
                            Sistemdeki tum test ve supheli verileri otomatik tarar. Prefix eslesmesi, gelecek tarihli kayitlar ve supheli icerikler tespit edilir.
                        </p>
                    </div>
                    <button
                        onClick={handleScan}
                        disabled={loading}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm
                            transition-all duration-200 flex-shrink-0
                            ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm hover:shadow-md'
                            }
                        `}
                    >
                        {loading ? <Spinner /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                        {loading ? 'Taraniyor...' : 'Sistemi Tara'}
                    </button>
                </div>
            </div>

            {/* ── Loading State ───────────────────────────────────────────── */}
            {loading && !data && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center">
                    <Spinner className="h-8 w-8 text-indigo-500" />
                    <p className="text-sm text-gray-500 mt-4">Sistem taraniyor, lutfen bekleyin...</p>
                </div>
            )}

            {/* ── No data yet (initial state) ────────────────────────────── */}
            {!data && !loading && (
                <div className="bg-white p-16 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                    <MagnifyingGlassIcon className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-500">Tarama Baslatilmadi</p>
                    <p className="text-sm mt-1">
                        Test verilerini bulmak icin <span className="font-semibold text-indigo-600">&quot;Sistemi Tara&quot;</span> butonuna basin.
                    </p>
                </div>
            )}

            {/* ── Results (after scan) ────────────────────────────────────── */}
            {data && (
                <>
                    {/* ── Summary Cards ───────────────────────────────────── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Ozet</h4>
                        <div className="flex flex-wrap gap-4">
                            <SummaryCard
                                value={summary?.total || 0}
                                label="Toplam Kayit"
                                bgClass="bg-gray-50 border-gray-200"
                                textClass="text-gray-600"
                                valueClass="text-gray-900"
                            />
                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                <SummaryCard
                                    key={key}
                                    value={summary?.by_category?.[key] || 0}
                                    label={config.label}
                                    bgClass={config.summaryBg}
                                    textClass={config.summaryText}
                                    valueClass={config.summaryValue}
                                />
                            ))}
                        </div>

                        {/* Model breakdown */}
                        {summary?.by_model && Object.keys(summary.by_model).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-500 mb-2">Model Dagilimi:</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(summary.by_model)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([model, count]) => (
                                            <span
                                                key={model}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${MODEL_COLORS[model] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${MODEL_DOT_COLORS[model] || 'bg-gray-400'}`} />
                                                {model}: {count}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        )}

                        {summary?.truncated && (
                            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs text-amber-700 font-medium">
                                    Sonuclar kisaltildi. Gosterilenden daha fazla kayit bulunabilir.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Filters + Actions ───────────────────────────────── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Model filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600">Model:</label>
                                <select
                                    value={filterModel}
                                    onChange={(e) => {
                                        setFilterModel(e.target.value);
                                        setSelectedIds(new Map());
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                >
                                    <option value="all">Tumu</option>
                                    {modelOptions.map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category filter */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600">Kategori:</label>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => {
                                        setFilterCategory(e.target.value);
                                        setSelectedIds(new Map());
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                >
                                    <option value="all">Tum Kategoriler</option>
                                    {categoryOptions.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {CATEGORY_CONFIG[cat]?.label || cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Select all checkbox */}
                            {filteredRecords.length > 0 && (
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none ml-auto">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = someSelected;
                                        }}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    Tumunu Sec
                                </label>
                            )}
                        </div>

                        {/* Delete button */}
                        {selectedIds.size > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={deleting}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white text-sm
                                        transition-all duration-200
                                        ${deleting
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow'
                                        }
                                    `}
                                >
                                    {deleting ? <Spinner /> : <TrashIcon className="w-4 h-4" />}
                                    Secili {selectedIds.size} kaydi sil
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Records Table ───────────────────────────────────── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {filteredRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <MagnifyingGlassIcon className="w-12 h-12 mb-3" />
                                <p className="text-sm font-medium">
                                    {data.summary?.total === 0
                                        ? 'Test verisi bulunamadi'
                                        : 'Secili filtrelere uygun kayit yok'}
                                </p>
                                <p className="text-xs mt-1 text-gray-400">
                                    {data.summary?.total === 0
                                        ? 'Sistem temiz gorunuyor.'
                                        : 'Filtreleri degistirip tekrar deneyin.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    ref={(el) => {
                                                        if (el) el.indeterminate = someSelected;
                                                    }}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Model</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Calisan</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tarih</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Sebep</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Detay</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Durum</th>
                                            <th className="px-4 py-3 w-10" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRecords.map((record, idx) => {
                                            const rowKey = `${record.model}:${record.id}`;
                                            const isSelected = selectedIds.has(rowKey);
                                            const isExpanded = expandedRows.has(rowKey);

                                            return (
                                                <React.Fragment key={rowKey}>
                                                    <tr
                                                        className={`
                                                            transition-colors duration-100 cursor-pointer
                                                            ${isSelected ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-200' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}
                                                            hover:bg-indigo-50/30
                                                        `}
                                                        onClick={() => toggleExpand(record)}
                                                    >
                                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectRow(record)}
                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <ModelBadge model={record.model} label={record.model_label} />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm text-gray-900 font-medium">
                                                                {record.employee_name || '-'}
                                                            </div>
                                                            {record.employee_code && (
                                                                <div className="text-xs text-gray-400 font-mono">
                                                                    #{record.employee_code}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                            {record.date || '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <CategoryBadge category={record.category} />
                                                            <div className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] truncate" title={record.reason}>
                                                                {record.reason}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={record.detail}>
                                                            {record.detail || '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {record.status ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-100 text-gray-700 border-gray-200">
                                                                    {record.status}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400">
                                                            {isExpanded
                                                                ? <ChevronDownIcon className="w-4 h-4" />
                                                                : <ChevronRightIcon className="w-4 h-4" />
                                                            }
                                                        </td>
                                                    </tr>

                                                    {/* ── Expanded Raw Data ──────────── */}
                                                    {isExpanded && record.raw && (
                                                        <tr className="bg-gray-50/80">
                                                            <td colSpan={8} className="px-4 py-3">
                                                                <div className="bg-gray-100 rounded-lg p-4 font-mono text-xs text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold font-sans">
                                                                            Ham Veri (ID: {record.id})
                                                                        </span>
                                                                    </div>
                                                                    <pre className="whitespace-pre-wrap break-words">
                                                                        {JSON.stringify(record.raw, null, 2)}
                                                                    </pre>
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

                        {/* ── Record count footer ────────────────────────── */}
                        {filteredRecords.length > 0 && (
                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                                <span>
                                    {filteredRecords.length} kayit gosteriliyor
                                    {(filterModel !== 'all' || filterCategory !== 'all') && (
                                        <span className="text-gray-400"> (toplam {data.summary?.total || 0})</span>
                                    )}
                                </span>
                                {selectedIds.size > 0 && (
                                    <span className="font-medium text-indigo-600">
                                        {selectedIds.size} kayit secili
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
