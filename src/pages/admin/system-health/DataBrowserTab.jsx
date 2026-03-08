import React, { useState, useCallback } from 'react';
import api from '../../../services/api';
import {
    MagnifyingGlassIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FunnelIcon,
    TableCellsIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// ─── Constants ──────────────────────────────────────────────────────────────

const MODEL_OPTIONS = [
    { value: 'attendance', label: 'Mesai Kayitlari' },
    { value: 'overtime_request', label: 'Fazla Mesai Talepleri' },
    { value: 'leave_request', label: 'Izin Talepleri' },
    { value: 'meal_request', label: 'Yemek Talepleri' },
    { value: 'cardless_entry', label: 'Kartsiz Giris' },
    { value: 'employee', label: 'Calisanlar' },
    { value: 'department', label: 'Departmanlar' },
    { value: 'job_position', label: 'Pozisyonlar' },
    { value: 'fiscal_calendar', label: 'Calisma Takvimleri' },
    { value: 'work_schedule', label: 'Vardiya Sablonlari' },
    { value: 'monthly_summary', label: 'Aylik Ozetler' },
    { value: 'work_target', label: 'Hedefler' },
    { value: 'gate_event', label: 'Gate Loglari' },
];

const STATUS_COLORS = {
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    AUTO_APPROVED: 'bg-green-100 text-green-800 border-green-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    PENDING_MANAGER_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
    POTENTIAL: 'bg-gray-100 text-gray-700 border-gray-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
    CALCULATED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    ABSENT: 'bg-red-100 text-red-800 border-red-200',
    ON_LEAVE: 'bg-purple-100 text-purple-800 border-purple-200',
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PAGE_SIZE = 50;

// ─── Spinner ────────────────────────────────────────────────────────────────

const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

// ─── Status Badge ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
    if (!status) return <span className="text-gray-400 text-xs">-</span>;
    const colors = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors}`}>
            {status}
        </span>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DataBrowserTab() {
    // ── Filter state
    const [modelType, setModelType] = useState('attendance');
    const [employeeId, setEmployeeId] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [testOnly, setTestOnly] = useState(false);
    const [page, setPage] = useState(1);

    // ── Result state
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [testCount, setTestCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [availableStatuses, setAvailableStatuses] = useState([]);

    // ── UI state
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState(null); // {type: 'success'|'error', text: '...'}
    const [hasSearched, setHasSearched] = useState(false);

    // ── Fetch data ──────────────────────────────────────────────────────────

    const fetchData = useCallback(async (targetPage = 1) => {
        setLoading(true);
        setMessage(null);
        try {
            const params = {
                model: modelType,
                page: targetPage,
                page_size: PAGE_SIZE,
            };
            if (employeeId.trim()) params.employee_id = employeeId.trim();
            if (dateStart) params.date_start = dateStart;
            if (dateEnd) params.date_end = dateEnd;
            if (statusFilter) params.status = statusFilter;
            if (testOnly) params.test_only = 'true';

            const response = await api.get('/system/health-check/browse-data/', { params });
            const data = response.data;

            setResults(data.results || []);
            setTotal(data.total || 0);
            setTestCount(data.test_count || 0);
            setTotalPages(data.total_pages || 0);
            setAvailableStatuses(data.available_statuses || []);
            setPage(data.page || targetPage);
            setHasSearched(true);
        } catch (err) {
            const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
            setMessage({ type: 'error', text: `Veri yuklenirken hata: ${detail}` });
            setResults([]);
            setTotal(0);
            setTestCount(0);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [modelType, employeeId, dateStart, dateEnd, statusFilter, testOnly]);

    // ── Handle search ───────────────────────────────────────────────────────

    const handleSearch = () => {
        setSelectedIds(new Set());
        fetchData(1);
    };

    // ── Handle page change ──────────────────────────────────────────────────

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setSelectedIds(new Set());
        fetchData(newPage);
    };

    // ── Handle model type change ────────────────────────────────────────────

    const handleModelChange = (e) => {
        setModelType(e.target.value);
        setPage(1);
        setStatusFilter('');
        setSelectedIds(new Set());
        setResults([]);
        setTotal(0);
        setTestCount(0);
        setTotalPages(0);
        setAvailableStatuses([]);
        setHasSearched(false);
    };

    // ── Selection handlers ──────────────────────────────────────────────────

    const toggleSelectAll = () => {
        if (selectedIds.size === results.length && results.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(results.map((r) => r.id)));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // ── Bulk delete ─────────────────────────────────────────────────────────

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmed = window.confirm(
            `${selectedIds.size} kayit kalici olarak silinecek. Bu islem geri alinamaz! Devam etmek istiyor musunuz?`
        );
        if (!confirmed) return;

        setDeleting(true);
        setMessage(null);
        try {
            const response = await api.post('/system/health-check/delete-records/', {
                model: modelType,
                ids: Array.from(selectedIds),
            });
            const data = response.data;
            const warnings = data.warnings?.length > 0 ? ` Uyarilar: ${data.warnings.join(', ')}` : '';
            setMessage({
                type: 'success',
                text: `${data.deleted || selectedIds.size} kayit basariyla silindi.${warnings}`,
            });
            setSelectedIds(new Set());
            // Re-fetch current page
            fetchData(page);
        } catch (err) {
            const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
            setMessage({ type: 'error', text: `Silme hatasi: ${detail}` });
        } finally {
            setDeleting(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    const allSelected = results.length > 0 && selectedIds.size === results.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < results.length;

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
                        className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* ── Filter Bar ────────────────────────────────────────────── */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <FunnelIcon className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Veri Tarayici</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Model Type */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Veri Tipi</label>
                        <select
                            value={modelType}
                            onChange={handleModelChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            {MODEL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Employee ID */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Calisan (ID)</label>
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Calisan ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Date Start */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Baslangic Tarihi</label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Date End */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bitis Tarihi</label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            disabled={availableStatuses.length === 0 && !hasSearched}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                        >
                            <option value="">Tumunu Goster</option>
                            {availableStatuses.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Test Only + Search Button */}
                    <div className="flex flex-col justify-end gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={testOnly}
                                onChange={(e) => setTestOnly(e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            Test Verisi
                        </label>
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className={`
                                flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-white text-sm
                                transition-all duration-200
                                ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm hover:shadow'
                                }
                            `}
                        >
                            {loading ? <Spinner /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                            Tara
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Summary Bar ───────────────────────────────────────────── */}
            {hasSearched && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <TableCellsIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-600">Toplam:</span>
                        <span className="font-bold text-gray-900">{total.toLocaleString('tr-TR')}</span>
                        <span className="text-gray-400">kayit</span>
                    </div>

                    {testCount > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                                Test: {testCount.toLocaleString('tr-TR')}
                            </span>
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-2 text-gray-500">
                        <span>
                            Sayfa <span className="font-semibold text-gray-700">{page}</span> / {totalPages}
                        </span>
                    </div>

                    {selectedIds.size > 0 && (
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
                    )}
                </div>
            )}

            {/* ── Results Table ──────────────────────────────────────────── */}
            {hasSearched && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-20 text-gray-500">
                            <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-sm">Yukleniyor...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <TableCellsIcon className="w-12 h-12 mb-3" />
                            <p className="text-sm font-medium">Kayit bulunamadi</p>
                            <p className="text-xs mt-1">Filtrelerinizi degistirip tekrar deneyin.</p>
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
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tip</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Calisan</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tarih</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Detay</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.map((row, idx) => {
                                        const isTest = row.extra?.is_test;
                                        const isSelected = selectedIds.has(row.id);
                                        return (
                                            <tr
                                                key={row.id}
                                                className={`
                                                    transition-colors duration-100
                                                    ${isTest ? 'bg-amber-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                                                    ${isSelected ? 'ring-1 ring-inset ring-indigo-300 bg-indigo-50/40' : ''}
                                                    hover:bg-indigo-50/30
                                                `}
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectRow(row.id)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                                                    {row.id}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                                                    {row.type || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-900 font-medium">
                                                        {row.employee_name || '-'}
                                                    </div>
                                                    {row.employee_code && (
                                                        <div className="text-xs text-gray-400">
                                                            #{row.employee_code}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                    {row.date || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={row.detail}>
                                                    {row.detail || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={row.status} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Pagination ─────────────────────────────────────────── */}
                    {totalPages > 1 && !loading && results.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page <= 1}
                                className={`
                                    flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                    ${page <= 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                    }
                                `}
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                                Onceki
                            </button>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Sayfa</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={page}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                            handlePageChange(val);
                                        }
                                    }}
                                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <span>/ {totalPages}</span>
                            </div>

                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= totalPages}
                                className={`
                                    flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                    ${page >= totalPages
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                    }
                                `}
                            >
                                Sonraki
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Initial state (before first search) ────────────────────── */}
            {!hasSearched && !loading && (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-400">
                    <MagnifyingGlassIcon className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-500">Veri Tarayici</p>
                    <p className="text-sm mt-1">Filtreleri ayarlayin ve <span className="font-semibold text-indigo-600">"Tara"</span> butonuna basin.</p>
                </div>
            )}
        </div>
    );
}
