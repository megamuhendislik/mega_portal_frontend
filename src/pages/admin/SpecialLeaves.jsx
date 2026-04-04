import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ModalOverlay from '../../components/ui/ModalOverlay';
import {
    HeartHandshake, Search, Loader2, Check, X, Ban,
    ChevronLeft, ChevronRight, Eye, FileText, Trash2,
    Download, Calendar, Clock, User, Building,
    RefreshCw, AlertCircle, ExternalLink,
    Baby, Flower2, Wallet, Heart
} from 'lucide-react';
import { toast } from 'react-hot-toast';


const STATUS_CONFIG = {
    PENDING: { label: 'Onay Bekliyor', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
    APPROVED: { label: 'Onaylandı', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
    REJECTED: { label: 'Reddedildi', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400' },
    CANCELLED: { label: 'İptal Edildi', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-400' },
};

const LEAVE_TYPE_CONFIG = {
    PATERNITY: { label: 'Babalık İzni', bg: 'bg-blue-100', text: 'text-blue-700', icon: Baby },
    BEREAVEMENT: { label: 'Ölüm İzni', bg: 'bg-slate-100', text: 'text-slate-700', icon: Flower2 },
    UNPAID: { label: 'Ücretsiz İzin', bg: 'bg-amber-100', text: 'text-amber-700', icon: Wallet },
    MARRIAGE: { label: 'Evlilik İzni', bg: 'bg-pink-100', text: 'text-pink-700', icon: Heart },
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

const getLeaveTypeBadge = (leaveType) => {
    const cfg = LEAVE_TYPE_CONFIG[leaveType];
    if (!cfg) return <span className="text-xs text-slate-500">{leaveType}</span>;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            <Icon size={12} />
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

const SpecialLeaves = () => {
    // Tab
    const [activeTab, setActiveTab] = useState('ALL');

    // Data
    const [leaves, setLeaves] = useState([]);
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

    // Document download state
    const [downloadingDocId, setDownloadingDocId] = useState(null);

    const viewDocumentProxy = async (leaveId, docId) => {
        setDownloadingDocId(docId);
        try {
            const response = await api.get(`/special-leaves/${leaveId}/documents/${docId}/download/`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 120000);
        } catch {
            toast.error('Dosya görüntülenemedi.');
        } finally {
            setDownloadingDocId(null);
        }
    };

    const [actionLoading, setActionLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    // ===== DATA FETCHING =====
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeTab !== 'ALL') params.append('leave_type', activeTab);
            if (statusFilter) params.append('status', statusFilter);
            if (searchTerm) params.append('search', searchTerm);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            params.append('page', page);

            try {
                // Combined endpoint — single request
                const res = await api.get(`/special-leaves/list-with-summary/?${params.toString()}`);
                setLeaves(res.data.results || []);
                setTotalCount(res.data.count || 0);
                if (res.data.summary) setSummary(res.data.summary);
            } catch {
                // Legacy fallback — two separate requests
                const summaryParams = new URLSearchParams();
                if (activeTab !== 'ALL') summaryParams.append('leave_type', activeTab);

                const [listRes, summaryRes] = await Promise.allSettled([
                    api.get(`/special-leaves/?${params.toString()}`),
                    api.get(`/special-leaves/summary/?${summaryParams.toString()}`)
                ]);

                if (listRes.status === 'fulfilled') {
                    setLeaves(listRes.value.data.results || listRes.value.data);
                    setTotalCount(listRes.value.data.count || (listRes.value.data.results || listRes.value.data).length);
                }
                if (summaryRes.status === 'fulfilled') {
                    setSummary(summaryRes.value.data);
                }
            }
        } catch {
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
            const res = await api.post(`/special-leaves/${id}/approve/`);
            toast.success('Özel izin onaylandı.');
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
            const res = await api.post(`/special-leaves/${rejectModal.id}/reject/`, { reason: rejectReason });
            toast.success('Özel izin reddedildi.');
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

    const handleDeleteDocument = async (leaveId, docId) => {
        try {
            await api.delete(`/special-leaves/${leaveId}/documents/${docId}/`);
            toast.success('Dosya silindi.');
            // Refresh detail
            const res = await api.get(`/special-leaves/${leaveId}/`);
            setDetailModal(res.data);
            fetchData();
        } catch {
            toast.error('Dosya silinemedi.');
        }
    };

    const openDetail = async (leave) => {
        try {
            const res = await api.get(`/special-leaves/${leave.id}/`);
            setDetailModal(res.data);
        } catch {
            setDetailModal(leave);
        }
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl">
                        <HeartHandshake size={24} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Özel İzinler</h1>
                        <p className="text-sm text-slate-500">
                            Babalık, ölüm, evlilik ve ücretsiz izin taleplerini görüntüleyin ve yönetin
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
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
                <button
                    onClick={() => { setActiveTab('ALL'); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}>
                    <HeartHandshake size={16} />
                    Tümü
                </button>
                <button
                    onClick={() => { setActiveTab('PATERNITY'); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'PATERNITY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}>
                    <Baby size={16} />
                    Babalık
                </button>
                <button
                    onClick={() => { setActiveTab('BEREAVEMENT'); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'BEREAVEMENT' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}>
                    <Flower2 size={16} />
                    Ölüm
                </button>
                <button
                    onClick={() => { setActiveTab('UNPAID'); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'UNPAID' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}>
                    <Wallet size={16} />
                    Ücretsiz
                </button>
                <button
                    onClick={() => { setActiveTab('MARRIAGE'); setPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'MARRIAGE' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}>
                    <Heart size={16} />
                    Evlilik
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500">Toplam Talep</p>
                    <p className="text-xl sm:text-3xl font-bold text-slate-800 mt-1">{summary.total}</p>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-400">
                    <p className="text-sm text-slate-500">Onay Bekleyen</p>
                    <p className="text-xl sm:text-3xl font-bold text-amber-600 mt-1">{summary.pending}</p>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-500">
                    <p className="text-sm text-slate-500">Onaylanan</p>
                    <p className="text-xl sm:text-3xl font-bold text-green-600 mt-1">{summary.approved}</p>
                </div>
                <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-400">
                    <p className="text-sm text-slate-500">Reddedilen</p>
                    <p className="text-xl sm:text-3xl font-bold text-red-600 mt-1">{summary.rejected}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-2 sm:gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Çalışan adı veya açıklama ile ara..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300 bg-white"
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
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300"
                        title="Başlangıç tarihi"
                    />

                    {/* Date to */}
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300"
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
                ) : leaves.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <HeartHandshake size={40} className="mx-auto mb-2 opacity-30" />
                        <p>Özel izin talebi bulunamadı</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-5 py-3 text-left font-semibold">Çalışan</th>
                                        <th className="px-5 py-3 text-left font-semibold">İzin Türü</th>
                                        <th className="px-5 py-3 text-left font-semibold">Tarih Aralığı</th>
                                        <th className="px-5 py-3 text-center font-semibold">Gün</th>
                                        <th className="px-5 py-3 text-center font-semibold">Dosya</th>
                                        <th className="px-5 py-3 text-center font-semibold">Durum</th>
                                        <th className="px-5 py-3 text-left font-semibold">Oluşturma</th>
                                        <th className="px-5 py-3 text-center font-semibold">Aksiyonlar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {leaves.map(leave => (
                                        <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                                            {/* Employee */}
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-slate-800">
                                                    {leave.employee_detail?.full_name || `${leave.employee_detail?.first_name || ''} ${leave.employee_detail?.last_name || ''}`}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {leave.employee_detail?.department?.name || '-'}
                                                </div>
                                            </td>

                                            {/* Leave Type */}
                                            <td className="px-5 py-3">
                                                {getLeaveTypeBadge(leave.leave_type)}
                                            </td>

                                            {/* Date range */}
                                            <td className="px-5 py-3">
                                                <div className="text-slate-700">
                                                    {formatDate(leave.start_date)} — {formatDate(leave.end_date)}
                                                </div>
                                            </td>

                                            {/* Days */}
                                            <td className="px-5 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm">
                                                    {leave.total_days}
                                                </span>
                                            </td>

                                            {/* Files */}
                                            <td className="px-5 py-3 text-center">
                                                {leave.documents?.length > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                                                        <FileText size={14} /> {leave.documents.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3 text-center">
                                                {getStatusBadge(leave.status)}
                                            </td>

                                            {/* Created */}
                                            <td className="px-5 py-3">
                                                <div className="text-xs text-slate-500">
                                                    {formatDateTime(leave.created_at)}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openDetail(leave)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                        title="Detay"
                                                    >
                                                        <Eye size={13} /> Detay
                                                    </button>

                                                    {leave.status === 'PENDING' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(leave.id)}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                                                            >
                                                                <Check size={13} /> Onayla
                                                            </button>
                                                            <button
                                                                onClick={() => { setRejectModal(leave); setRejectReason(''); }}
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
                                    Toplam {totalCount} talep — Sayfa {page}/{totalPages}
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
            <ModalOverlay open={!!detailModal} onClose={() => setDetailModal(null)}>
                {detailModal && (
                    <div className="bg-white rounded-xl shadow-2xl w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <HeartHandshake size={20} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Özel İzin Detayı</h3>
                                    <p className="text-xs text-slate-500">#{detailModal.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailModal(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-3 sm:p-5 space-y-3 sm:space-y-5">
                            {/* Employee Info */}
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {(detailModal.employee_detail?.first_name || '?')[0]}
                                </div>
                                <div>
                                    <div className="font-medium text-slate-800">
                                        {detailModal.employee_detail?.full_name || `${detailModal.employee_detail?.first_name || ''} ${detailModal.employee_detail?.last_name || ''}`}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {detailModal.employee_detail?.department?.name || '-'} {detailModal.employee_detail?.job_position?.title ? `\u2022 ${detailModal.employee_detail.job_position.title}` : ''}
                                    </div>
                                </div>
                                <div className="ml-auto">{getStatusBadge(detailModal.status)}</div>
                            </div>

                            {/* Leave Type */}
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <div className="text-xs text-slate-500 mb-1">İzin Türü</div>
                                <div>{getLeaveTypeBadge(detailModal.leave_type)}</div>
                            </div>

                            {/* Date & Duration */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Calendar size={12} /> Başlangıç</div>
                                    <div className="font-medium text-slate-800">{formatDate(detailModal.start_date)}</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Calendar size={12} /> Bitiş</div>
                                    <div className="font-medium text-slate-800">{formatDate(detailModal.end_date)}</div>
                                </div>
                                <div className="col-span-2 bg-slate-50 p-3 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Toplam Gün</div>
                                    <div className="font-bold text-indigo-600 text-xl">{detailModal.total_days} gün</div>
                                </div>
                            </div>

                            {/* Description */}
                            {detailModal.description && (
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Açıklama</div>
                                    <div className="text-sm text-slate-700">{detailModal.description}</div>
                                </div>
                            )}

                            {/* Reason */}
                            {detailModal.reason && (
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Sebep</div>
                                    <div className="text-sm text-slate-700">{detailModal.reason}</div>
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
                                                        <button
                                                            onClick={() => viewDocumentProxy(detailModal.id, doc.id)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-blue-100 rounded-lg text-blue-500 text-xs font-medium transition-colors disabled:opacity-50"
                                                            title="Görüntüle"
                                                            disabled={downloadingDocId === doc.id}
                                                        >
                                                            {downloadingDocId === doc.id ? (
                                                                <><Loader2 size={14} className="animate-spin" /> Açılıyor...</>
                                                            ) : (
                                                                <><ExternalLink size={14} /> Belgeyi Aç</>
                                                            )}
                                                        </button>
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
                        </div>

                        {/* Footer */}
                        <div className="p-3 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end sticky bottom-0 bg-white">
                            <button
                                onClick={() => setDetailModal(null)}
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
                        </div>
                    </div>
                )}
            </ModalOverlay>

            {/* ===== REJECT MODAL ===== */}
            <ModalOverlay open={!!rejectModal} onClose={() => setRejectModal(null)} level="secondary">
                {rejectModal && (
                    <div className="bg-white rounded-xl shadow-2xl w-[calc(100%-1rem)] sm:w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Özel İzni Reddet</h3>
                            <button onClick={() => setRejectModal(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-3 sm:p-5">
                            <div className="bg-red-50 p-3 rounded-lg mb-4">
                                <p className="text-sm text-red-700">
                                    <strong>{rejectModal.employee_detail?.full_name || `${rejectModal.employee_detail?.first_name} ${rejectModal.employee_detail?.last_name}`}</strong> adlı çalışanın{' '}
                                    {formatDate(rejectModal.start_date)} - {formatDate(rejectModal.end_date)} tarihli özel iznini reddetmek üzeresiniz.
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
                        <div className="p-3 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
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
                )}
            </ModalOverlay>
        </div>
    );
};

export default SpecialLeaves;
