import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    HeartPulse, Search, Loader2, Check, X, Ban,
    ChevronLeft, ChevronRight, Eye, FileText, Trash2,
    Download, Upload, Calendar, Clock, User, Building,
    Filter, RefreshCw, Pencil, AlertCircle, ExternalLink, Stethoscope
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_CONFIG = {
    PENDING: { label: 'Onay Bekliyor', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
    APPROVED: { label: 'Onaylandı', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
    REJECTED: { label: 'Reddedildi', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400' },
    CANCELLED: { label: 'İptal Edildi', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-400' },
};

const getStatusBadge = (statusKey) => {
    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            {statusKey === 'APPROVED' && <Check size={12} />}
            {statusKey === 'REJECTED' && <Ban size={12} />}
            {statusKey === 'CANCELLED' && <Ban size={12} />}
            {statusKey === 'PENDING' && <Clock size={12} />}
            {cfg.label}
        </span>
    );
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' });
};

const formatDateTime = (dtStr) => {
    if (!dtStr) return '-';
    const d = new Date(dtStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
};

const HealthReports = () => {
    // Tab
    const [activeTab, setActiveTab] = useState('HEALTH_REPORT');

    // Data
    const [reports, setReports] = useState([]);
    const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modals
    const [detailModal, setDetailModal] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Edit mode
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({ start_date: '', end_date: '', description: '' });
    const [editFiles, setEditFiles] = useState([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    // ===== DATA FETCHING =====
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('report_type', activeTab);
            if (statusFilter) params.append('status', statusFilter);
            if (searchTerm) params.append('search', searchTerm);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            params.append('page', page);

            const [listRes, summaryRes] = await Promise.allSettled([
                api.get(`/health-reports/?${params.toString()}`),
                api.get(`/health-reports/summary/?report_type=${activeTab}`)
            ]);

            if (listRes.status === 'fulfilled') {
                setReports(listRes.value.data.results || listRes.value.data);
                setTotalCount(listRes.value.data.count || (listRes.value.data.results || listRes.value.data).length);
            }
            if (summaryRes.status === 'fulfilled') {
                setSummary(summaryRes.value.data);
            }
        } catch (error) {
            toast.error('Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchTerm, dateFrom, dateTo, page, activeTab]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // ===== ACTIONS =====
    const handleApprove = async (id) => {
        setActionLoading(true);
        try {
            const res = await api.post(`/health-reports/${id}/approve/`);
            toast.success('Sağlık raporu onaylandı.');
            setDetailModal(res.data);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Onaylama başarısız.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Red sebebi zorunludur.');
            return;
        }
        setActionLoading(true);
        try {
            const res = await api.post(`/health-reports/${rejectModal.id}/reject/`, { reason: rejectReason });
            toast.success('Sağlık raporu reddedildi.');
            setRejectModal(null);
            setRejectReason('');
            setDetailModal(res.data);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Reddetme başarısız.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDocument = async (reportId, docId) => {
        try {
            await api.delete(`/health-reports/${reportId}/documents/${docId}/`);
            toast.success('Dosya silindi.');
            // Refresh detail
            const res = await api.get(`/health-reports/${reportId}/`);
            setDetailModal(res.data);
            fetchData();
        } catch (error) {
            toast.error('Dosya silinemedi.');
        }
    };

    const handleSaveEdit = async () => {
        if (!detailModal) return;
        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('start_date', editData.start_date);
            formData.append('end_date', editData.end_date);
            formData.append('description', editData.description);

            for (const f of editFiles) {
                formData.append('files', f);
            }

            const res = await api.put(`/health-reports/${detailModal.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Rapor güncellendi.');
            setDetailModal(res.data);
            setEditMode(false);
            setEditFiles([]);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Güncelleme başarısız.');
        } finally {
            setActionLoading(false);
        }
    };

    const openDetail = async (report) => {
        try {
            const res = await api.get(`/health-reports/${report.id}/`);
            setDetailModal(res.data);
            setEditMode(false);
            setEditFiles([]);
        } catch {
            setDetailModal(report);
        }
    };

    const startEdit = () => {
        if (!detailModal) return;
        setEditData({
            start_date: detailModal.start_date,
            end_date: detailModal.end_date,
            description: detailModal.description || '',
        });
        setEditFiles([]);
        setEditMode(true);
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-xl">
                        <HeartPulse size={24} className="text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Sağlık Raporları</h1>
                        <p className="text-sm text-slate-500">
                            {activeTab === 'HOSPITAL_VISIT'
                                ? 'Çalışan hastane ziyaretlerini görüntüleyin, düzenleyin ve onaylayın'
                                : 'Çalışan sağlık raporlarını görüntüleyin, düzenleyin ve onaylayın'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={16} /> Yenile
                </button>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => { setActiveTab('HEALTH_REPORT'); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'HEALTH_REPORT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}>
                    <HeartPulse size={16} />
                    Sağlık Raporları
                </button>
                <button
                    onClick={() => { setActiveTab('HOSPITAL_VISIT'); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'HOSPITAL_VISIT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}>
                    <Stethoscope size={16} />
                    Hastane Ziyaretleri
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500">Toplam Rapor</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{summary.total}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-400">
                    <p className="text-sm text-slate-500">Onay Bekleyen</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{summary.pending}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-500">
                    <p className="text-sm text-slate-500">Onaylanan</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{summary.approved}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-400">
                    <p className="text-sm text-slate-500">Reddedilen</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{summary.rejected}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Çalışan adı veya açıklama ile ara..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-colors"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300 bg-white"
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="PENDING">Onay Bekleyen</option>
                        <option value="APPROVED">Onaylanan</option>
                        <option value="REJECTED">Reddedilen</option>
                        <option value="CANCELLED">İptal Edilen</option>
                    </select>

                    {/* Date from */}
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300"
                        title="Başlangıç tarihi"
                    />

                    {/* Date to */}
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300"
                        title="Bitiş tarihi"
                    />

                    {/* Clear filters */}
                    {(statusFilter || dateFrom || dateTo || searchInput) && (
                        <button
                            onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo(''); setSearchInput(''); setPage(1); }}
                            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Temizle
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
                    </div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <HeartPulse size={40} className="mx-auto mb-2 opacity-30" />
                        <p>Sağlık raporu bulunamadı</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-5 py-3 text-left font-semibold">Çalışan</th>
                                        <th className="px-5 py-3 text-left font-semibold">Tarih Aralığı</th>
                                        <th className="px-5 py-3 text-center font-semibold">Gün</th>
                                        <th className="px-5 py-3 text-center font-semibold">Dosya</th>
                                        <th className="px-5 py-3 text-center font-semibold">Durum</th>
                                        <th className="px-5 py-3 text-left font-semibold">Oluşturma</th>
                                        <th className="px-5 py-3 text-center font-semibold">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reports.map(report => (
                                        <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                                            {/* Employee */}
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-slate-800">
                                                    {report.employee_detail?.full_name || `${report.employee_detail?.first_name || ''} ${report.employee_detail?.last_name || ''}`}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {report.employee_detail?.department?.name || '-'}
                                                </div>
                                            </td>

                                            {/* Date range */}
                                            <td className="px-5 py-3">
                                                <div className="text-slate-700">
                                                    {formatDate(report.start_date)} — {formatDate(report.end_date)}
                                                </div>
                                                {report.report_type === 'HOSPITAL_VISIT' && report.start_time && (
                                                    <div className="text-xs text-rose-500 mt-0.5">
                                                        {report.start_time?.substring(0, 5)} — {report.end_time?.substring(0, 5)}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Days */}
                                            <td className="px-5 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-700 font-bold text-sm">
                                                    {report.total_days}
                                                </span>
                                            </td>

                                            {/* Files */}
                                            <td className="px-5 py-3 text-center">
                                                {report.documents?.length > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                                                        <FileText size={14} /> {report.documents.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3 text-center">
                                                {getStatusBadge(report.status)}
                                            </td>

                                            {/* Created */}
                                            <td className="px-5 py-3">
                                                <div className="text-xs text-slate-500">
                                                    {formatDateTime(report.created_at)}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openDetail(report)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                        title="Detay"
                                                    >
                                                        <Eye size={13} /> Detay
                                                    </button>

                                                    {report.status === 'PENDING' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(report.id)}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                                                            >
                                                                <Check size={13} /> Onayla
                                                            </button>
                                                            <button
                                                                onClick={() => { setRejectModal(report); setRejectReason(''); }}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                            >
                                                                <Ban size={13} /> Reddet
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                                <span className="text-xs text-slate-500">
                                    Toplam {totalCount} rapor — Sayfa {page}/{totalPages}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ===== DETAIL MODAL ===== */}
            {detailModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <HeartPulse size={20} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Sağlık Raporu Detayı</h3>
                                    <p className="text-xs text-slate-500">#{detailModal.id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!editMode && detailModal.status !== 'CANCELLED' && (
                                    <button
                                        onClick={startEdit}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <Pencil size={16} className="text-slate-500" />
                                    </button>
                                )}
                                <button
                                    onClick={() => { setDetailModal(null); setEditMode(false); }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-5">
                            {/* Employee Info */}
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                                    {(detailModal.employee_detail?.first_name || '?')[0]}
                                </div>
                                <div>
                                    <div className="font-medium text-slate-800">
                                        {detailModal.employee_detail?.full_name || `${detailModal.employee_detail?.first_name || ''} ${detailModal.employee_detail?.last_name || ''}`}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {detailModal.employee_detail?.department?.name || '-'} • {detailModal.employee_detail?.job_position?.title || '-'}
                                    </div>
                                </div>
                                <div className="ml-auto">{getStatusBadge(detailModal.status)}</div>
                            </div>

                            {/* Date & Description */}
                            {editMode ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Başlangıç Tarihi</label>
                                            <input
                                                type="date"
                                                value={editData.start_date}
                                                onChange={(e) => setEditData(d => ({ ...d, start_date: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Bitiş Tarihi</label>
                                            <input
                                                type="date"
                                                value={editData.end_date}
                                                onChange={(e) => setEditData(d => ({ ...d, end_date: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">Açıklama</label>
                                        <textarea
                                            rows={3}
                                            value={editData.description}
                                            onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300 resize-none"
                                            placeholder="Açıklama..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">Yeni Dosya Ekle</label>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            multiple
                                            onChange={(e) => setEditFiles(Array.from(e.target.files))}
                                            className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Calendar size={12} /> Başlangıç</div>
                                        <div className="font-medium text-slate-800">{formatDate(detailModal.start_date)}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Calendar size={12} /> Bitiş</div>
                                        <div className="font-medium text-slate-800">{formatDate(detailModal.end_date)}</div>
                                    </div>
                                    {detailModal.report_type === 'HOSPITAL_VISIT' && detailModal.start_time && (
                                        <>
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock size={12} /> Başlangıç Saati</div>
                                                <div className="font-medium text-slate-800">{detailModal.start_time?.substring(0, 5)}</div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg">
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock size={12} /> Bitiş Saati</div>
                                                <div className="font-medium text-slate-800">{detailModal.end_time?.substring(0, 5)}</div>
                                            </div>
                                        </>
                                    )}
                                    <div className="col-span-2 bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">Toplam Gün</div>
                                        <div className="font-bold text-red-600 text-xl">{detailModal.total_days} gün</div>
                                    </div>
                                    {detailModal.description && (
                                        <div className="col-span-2 bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Açıklama</div>
                                            <div className="text-sm text-slate-700">{detailModal.description}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Documents */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                    <FileText size={14} /> Dosyalar
                                </h4>
                                {(detailModal.documents || []).length === 0 ? (
                                    <p className="text-sm text-slate-400">Dosya yüklenmemiş.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {detailModal.documents.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileText size={16} className="text-blue-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium text-slate-700 truncate">{doc.file_name}</div>
                                                        <div className="text-xs text-slate-400">{(doc.file_size / 1024).toFixed(0)} KB</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {doc.file && (
                                                        <a
                                                            href={doc.file}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 transition-colors"
                                                            title="Görüntüle"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteDocument(detailModal.id, doc.id)}
                                                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Approval Info */}
                            {detailModal.approved_by_detail && (
                                <div className="bg-green-50 p-3 rounded-lg">
                                    <div className="text-xs text-green-600 mb-1">Onaylayan</div>
                                    <div className="text-sm font-medium text-green-800">
                                        {detailModal.approved_by_detail.full_name || `${detailModal.approved_by_detail.first_name} ${detailModal.approved_by_detail.last_name}`}
                                    </div>
                                    {detailModal.approved_at && (
                                        <div className="text-xs text-green-500 mt-0.5">{formatDateTime(detailModal.approved_at)}</div>
                                    )}
                                </div>
                            )}

                            {detailModal.rejection_reason && (
                                <div className="bg-red-50 p-3 rounded-lg">
                                    <div className="text-xs text-red-600 mb-1">Red Sebebi</div>
                                    <div className="text-sm text-red-800">{detailModal.rejection_reason}</div>
                                </div>
                            )}

                            {/* Target approver info */}
                            {detailModal.target_approver_detail && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="text-xs text-blue-600 mb-1">Bilgilendirilen Yönetici</div>
                                    <div className="text-sm font-medium text-blue-800">
                                        {detailModal.target_approver_detail.full_name || `${detailModal.target_approver_detail.first_name} ${detailModal.target_approver_detail.last_name}`}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end sticky bottom-0 bg-white">
                            {editMode ? (
                                <>
                                    <button
                                        onClick={() => { setEditMode(false); setEditFiles([]); }}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center gap-1.5"
                                    >
                                        {actionLoading && <Loader2 size={14} className="animate-spin" />}
                                        Kaydet
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setDetailModal(null); setEditMode(false); }}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                                    >
                                        Kapat
                                    </button>
                                    {detailModal.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => { setRejectModal(detailModal); setRejectReason(''); }}
                                                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm flex items-center gap-1.5"
                                            >
                                                <Ban size={14} /> Reddet
                                            </button>
                                            <button
                                                onClick={() => handleApprove(detailModal.id)}
                                                disabled={actionLoading}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-1.5"
                                            >
                                                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                                                <Check size={14} /> Onayla
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== REJECT MODAL ===== */}
            {rejectModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Sağlık Raporu Reddet</h3>
                            <button onClick={() => setRejectModal(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="bg-red-50 p-3 rounded-lg mb-4">
                                <p className="text-sm text-red-700">
                                    <strong>{rejectModal.employee_detail?.full_name || `${rejectModal.employee_detail?.first_name} ${rejectModal.employee_detail?.last_name}`}</strong> adlı çalışanın{' '}
                                    {formatDate(rejectModal.start_date)} - {formatDate(rejectModal.end_date)} tarihli sağlık raporunu reddetmek üzeresiniz.
                                </p>
                            </div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Red Sebebi *</label>
                            <textarea
                                rows={3}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Red sebebini yazınız..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none text-sm"
                            />
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end">
                            <button
                                onClick={() => setRejectModal(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={actionLoading || !rejectReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center gap-1.5"
                            >
                                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                                <Ban size={14} /> Reddet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthReports;
