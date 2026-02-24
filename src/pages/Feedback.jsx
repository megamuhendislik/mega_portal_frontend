import React, { useState, useEffect, useMemo } from 'react';
import {
    MessageSquare, Plus, Send, Search, Filter, Clock, CheckCircle2, AlertCircle,
    ThumbsUp, AlertTriangle, Lightbulb, Paperclip, X, ChevronDown, ChevronRight,
    Eye, FileText, Image, File, Download, Loader2, MessageCircle, XCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// =================== CONSTANTS ===================

const CATEGORIES = {
    COMPLAINT: { label: 'Şikayet', color: 'rose', icon: AlertTriangle, bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' },
    SUGGESTION: { label: 'Öneri', color: 'amber', icon: Lightbulb, bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
    APPRECIATION: { label: 'Teşekkür', color: 'emerald', icon: ThumbsUp, bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
};

const STATUSES = {
    PENDING: { label: 'Beklemede', color: 'slate', icon: Clock },
    IN_REVIEW: { label: 'İnceleniyor', color: 'blue', icon: Eye },
    RESOLVED: { label: 'Cevaplandı', color: 'emerald', icon: CheckCircle2 },
    CLOSED: { label: 'Kapatıldı', color: 'slate', icon: XCircle },
};

// =================== SMALL COMPONENTS ===================

const CategoryBadge = ({ category }) => {
    const cat = CATEGORIES[category] || CATEGORIES.COMPLAINT;
    const Icon = cat.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cat.bg} ${cat.text} ring-1 ${cat.ring}`}>
            <Icon size={12} />
            {cat.label}
        </span>
    );
};

const StatusBadge = ({ status }) => {
    const st = STATUSES[status] || STATUSES.PENDING;
    const Icon = st.icon;
    const colors = {
        slate: 'bg-slate-50 text-slate-600 ring-slate-200',
        blue: 'bg-blue-50 text-blue-700 ring-blue-200',
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${colors[st.color] || colors.slate}`}>
            <Icon size={12} />
            {st.label}
        </span>
    );
};

const FileIcon = ({ name }) => {
    const ext = name?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <Image size={14} className="text-violet-500" />;
    if (ext === 'pdf') return <FileText size={14} className="text-rose-500" />;
    return <File size={14} className="text-slate-400" />;
};

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// =================== CREATE MODAL ===================

const CreateFeedbackModal = ({ open, onClose, onSuccess }) => {
    const [category, setCategory] = useState('COMPLAINT');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setCategory('COMPLAINT');
        setTitle('');
        setDescription('');
        setFiles([]);
        setError('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFiles = (e) => {
        const newFiles = Array.from(e.target.files);
        if (files.length + newFiles.length > 3) {
            setError('En fazla 3 dosya eklenebilir.');
            return;
        }
        const oversized = newFiles.find(f => f.size > 5 * 1024 * 1024);
        if (oversized) {
            setError(`Dosya boyutu 5MB'ı aşıyor: ${oversized.name}`);
            return;
        }
        setError('');
        setFiles([...files, ...newFiles]);
    };

    const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            setError('Başlık ve açıklama zorunludur.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('category', category);
            formData.append('title', title.trim());
            formData.append('description', description.trim());
            files.forEach(f => formData.append('files', f));

            await api.post('/feedback/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            handleClose();
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200/80">
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-slate-800">Yeni Geri Bildirim</h2>
                    <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(CATEGORIES).map(([key, cat]) => {
                                const Icon = cat.icon;
                                const active = category === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setCategory(key)}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200
                                            ${active
                                                ? `${cat.bg} border-current ${cat.text} shadow-sm`
                                                : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span className="text-xs font-bold">{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Başlık</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Geri bildiriminizin konusu..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
                            maxLength={200}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Açıklama</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Detaylı açıklamanızı yazın..."
                            rows={5}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Dosya Ekle <span className="text-slate-300 font-normal normal-case">(opsiyonel, max 3 dosya, 5MB)</span>
                        </label>
                        {files.length < 3 && (
                            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 text-sm text-slate-500 hover:text-blue-600 cursor-pointer transition-all">
                                <Paperclip size={16} />
                                <span>Dosya Seç</span>
                                <input
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                    className="hidden"
                                    onChange={handleFiles}
                                />
                            </label>
                        )}
                        {files.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-sm">
                                        <FileIcon name={f.name} />
                                        <span className="flex-1 truncate text-slate-700">{f.name}</span>
                                        <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                                        <button onClick={() => removeFile(i)} className="p-0.5 text-slate-400 hover:text-rose-500">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 text-sm font-medium">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
                    <button onClick={handleClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !title.trim() || !description.trim()}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Gönder
                    </button>
                </div>
            </div>
        </div>
    );
};

// =================== DETAIL MODAL ===================

const FeedbackDetailModal = ({ feedback, open, onClose, isAdmin, onRespond, onStatusChange }) => {
    const [responseText, setResponseText] = useState('');
    const [responding, setResponding] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        if (feedback) {
            setResponseText(feedback.admin_response || '');
            setNewStatus(feedback.status);
        }
    }, [feedback]);

    if (!open || !feedback) return null;

    const cat = CATEGORIES[feedback.category] || CATEGORIES.COMPLAINT;
    const CatIcon = cat.icon;

    const handleRespond = async () => {
        if (!responseText.trim()) return;
        setResponding(true);
        try {
            await onRespond(feedback.id, responseText.trim());
            onClose();
        } catch {
            // error handled in parent
        } finally {
            setResponding(false);
        }
    };

    const handleStatusChange = async (st) => {
        setNewStatus(st);
        await onStatusChange(feedback.id, st);
    };

    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200/80">
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-slate-100 flex items-start justify-between rounded-t-2xl z-10">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CategoryBadge category={feedback.category} />
                            <StatusBadge status={feedback.status} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 truncate">{feedback.title}</h2>
                        {isAdmin && feedback.employee_name && (
                            <p className="text-xs text-slate-400 mt-1">Gönderen: <span className="font-semibold text-slate-600">{feedback.employee_name}</span></p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Description */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Açıklama</p>
                        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {feedback.description}
                        </div>
                    </div>

                    {/* Attachments */}
                    {feedback.attachments?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ekler</p>
                            <div className="space-y-1.5">
                                {feedback.attachments.map(att => (
                                    <a
                                        key={att.id}
                                        href={att.file?.startsWith('http') ? att.file : `${apiBase}${att.file}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-sm transition-colors group"
                                    >
                                        <FileIcon name={att.file_name} />
                                        <span className="flex-1 truncate text-slate-700 group-hover:text-blue-700">{att.file_name}</span>
                                        <span className="text-xs text-slate-400">{att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : ''}</span>
                                        <Download size={14} className="text-slate-300 group-hover:text-blue-500" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Response (visible to employee too) */}
                    {feedback.admin_response && !isAdmin && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Cevabı</p>
                            <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2 text-xs text-emerald-600">
                                    <MessageCircle size={12} />
                                    <span className="font-semibold">{feedback.responded_by_name || 'Admin'}</span>
                                    <span>&middot;</span>
                                    <span>{formatDateTime(feedback.responded_at)}</span>
                                </div>
                                {feedback.admin_response}
                            </div>
                        </div>
                    )}

                    {/* Admin: Status Change */}
                    {isAdmin && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Durum</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(STATUSES).map(([key, st]) => {
                                    const Icon = st.icon;
                                    const active = (newStatus || feedback.status) === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleStatusChange(key)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                                                ${active
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <Icon size={12} />
                                            {st.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Admin: Response Form */}
                    {isAdmin && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                {feedback.admin_response ? 'Cevabı Düzenle' : 'Cevap Yaz'}
                            </p>
                            <textarea
                                value={responseText}
                                onChange={e => setResponseText(e.target.value)}
                                placeholder="Geri bildirime cevabınızı yazın..."
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all resize-none"
                            />
                            <div className="flex justify-end mt-3">
                                <button
                                    onClick={handleRespond}
                                    disabled={responding || !responseText.trim()}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                                >
                                    {responding ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Cevabı Kaydet
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-4">
                        <span>Oluşturulma: {formatDateTime(feedback.created_at)}</span>
                        {feedback.responded_at && <span>Cevaplanma: {formatDateTime(feedback.responded_at)}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// =================== MAIN PAGE ===================

const Feedback = () => {
    const { user } = useAuth();
    const isAdmin = user?.user?.is_superuser || user?.role_name === 'SYSTEM_ADMIN';

    // State
    const [activeTab, setActiveTab] = useState('my'); // 'my' | 'admin'
    const [feedbacks, setFeedbacks] = useState([]);
    const [adminFeedbacks, setAdminFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    // Fetch
    const fetchMyFeedbacks = async () => {
        try {
            const res = await api.get('/feedback/');
            setFeedbacks(res.data);
        } catch (err) {
            console.error('Feedback fetch error:', err);
        }
    };

    const fetchAdminFeedbacks = async () => {
        if (!isAdmin) return;
        try {
            const params = {};
            if (categoryFilter) params.category = categoryFilter;
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/feedback/admin_list/', { params });
            setAdminFeedbacks(res.data);
        } catch (err) {
            console.error('Admin feedback fetch error:', err);
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.allSettled([fetchMyFeedbacks(), fetchAdminFeedbacks()]);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (activeTab === 'admin') {
            fetchAdminFeedbacks();
        }
    }, [categoryFilter, statusFilter]);

    const handleRespond = async (id, text) => {
        await api.post(`/feedback/${id}/respond/`, { response: text });
        fetchAdminFeedbacks();
        fetchMyFeedbacks();
    };

    const handleStatusChange = async (id, st) => {
        await api.post(`/feedback/${id}/update_status/`, { status: st });
        fetchAdminFeedbacks();
    };

    const openDetail = (fb) => {
        setSelectedFeedback(fb);
        setShowDetail(true);
        // Mark response as read for employee
        if (!isAdmin && fb.admin_response && !fb.is_response_read) {
            api.post(`/feedback/${fb.id}/mark_response_read/`).catch(() => {});
        }
    };

    // Filter for search
    const currentList = activeTab === 'admin' ? adminFeedbacks : feedbacks;
    const filtered = useMemo(() => {
        if (!search.trim()) return currentList;
        const q = search.toLowerCase();
        return currentList.filter(fb =>
            fb.title?.toLowerCase().includes(q) ||
            fb.description?.toLowerCase().includes(q) ||
            fb.employee_name?.toLowerCase().includes(q)
        );
    }, [currentList, search]);

    // Stats
    const myStats = useMemo(() => ({
        total: feedbacks.length,
        pending: feedbacks.filter(f => f.status === 'PENDING').length,
        resolved: feedbacks.filter(f => f.status === 'RESOLVED').length,
        unread: feedbacks.filter(f => f.admin_response && !f.is_response_read).length,
    }), [feedbacks]);

    const adminStats = useMemo(() => ({
        total: adminFeedbacks.length,
        pending: adminFeedbacks.filter(f => f.status === 'PENDING').length,
        inReview: adminFeedbacks.filter(f => f.status === 'IN_REVIEW').length,
        resolved: adminFeedbacks.filter(f => f.status === 'RESOLVED').length,
    }), [adminFeedbacks]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dilek ve Şikayetler</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Geri bildirimlerinizi gönderin, takip edin</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                    <Plus size={18} />
                    Yeni Geri Bildirim
                </button>
            </div>

            {/* Stats Cards */}
            {activeTab === 'my' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatMini label="Toplam" value={myStats.total} icon={<MessageSquare size={16} />} color="blue" />
                    <StatMini label="Beklemede" value={myStats.pending} icon={<Clock size={16} />} color="amber" />
                    <StatMini label="Cevaplanan" value={myStats.resolved} icon={<CheckCircle2 size={16} />} color="emerald" />
                    <StatMini label="Okunmamış Cevap" value={myStats.unread} icon={<MessageCircle size={16} />} color="rose" />
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatMini label="Toplam" value={adminStats.total} icon={<MessageSquare size={16} />} color="blue" />
                    <StatMini label="Beklemede" value={adminStats.pending} icon={<Clock size={16} />} color="amber" />
                    <StatMini label="İnceleniyor" value={adminStats.inReview} icon={<Eye size={16} />} color="violet" />
                    <StatMini label="Cevaplanan" value={adminStats.resolved} icon={<CheckCircle2 size={16} />} color="emerald" />
                </div>
            )}

            {/* Tabs + Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                {/* Tabs */}
                <div className="px-4 pt-3 flex items-center gap-1 border-b border-slate-100">
                    <TabBtn active={activeTab === 'my'} onClick={() => setActiveTab('my')} badge={myStats.unread}>
                        Geri Bildirimlerim
                    </TabBtn>
                    {isAdmin && (
                        <TabBtn active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} badge={adminStats.pending}>
                            Tüm Geri Bildirimler
                        </TabBtn>
                    )}
                </div>

                {/* Toolbar */}
                <div className="px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-slate-50">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Ara..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all"
                        />
                    </div>

                    {/* Filters (admin tab only) */}
                    {activeTab === 'admin' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 bg-white"
                            >
                                <option value="">Tüm Kategoriler</option>
                                {Object.entries(CATEGORIES).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 bg-white"
                            >
                                <option value="">Tüm Durumlar</option>
                                {Object.entries(STATUSES).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="divide-y divide-slate-50">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 size={24} className="animate-spin mr-3" />
                            <span className="text-sm font-medium">Yükleniyor...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <MessageSquare size={40} className="mb-3 text-slate-200" />
                            <p className="text-sm font-semibold text-slate-500">Henüz geri bildirim yok</p>
                            <p className="text-xs text-slate-400 mt-1">İlk geri bildiriminizi gönderin</p>
                        </div>
                    ) : (
                        filtered.map(fb => (
                            <FeedbackRow
                                key={fb.id}
                                feedback={fb}
                                isAdmin={activeTab === 'admin'}
                                onClick={() => openDetail(fb)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreateFeedbackModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onSuccess={() => { fetchMyFeedbacks(); fetchAdminFeedbacks(); }}
            />
            <FeedbackDetailModal
                feedback={selectedFeedback}
                open={showDetail}
                onClose={() => { setShowDetail(false); setSelectedFeedback(null); fetchMyFeedbacks(); }}
                isAdmin={activeTab === 'admin'}
                onRespond={handleRespond}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
};

// =================== ROW COMPONENT ===================

const FeedbackRow = ({ feedback, isAdmin, onClick }) => {
    const hasUnreadResponse = !isAdmin && feedback.admin_response && !feedback.is_response_read;

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-5 py-4 hover:bg-slate-50/80 transition-colors flex items-start gap-4 group
                ${hasUnreadResponse ? 'bg-blue-50/30' : ''}`}
        >
            {/* Category icon */}
            <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5
                ${CATEGORIES[feedback.category]?.bg || 'bg-slate-100'}`}>
                {React.createElement(CATEGORIES[feedback.category]?.icon || MessageSquare, {
                    size: 16,
                    className: CATEGORIES[feedback.category]?.text || 'text-slate-500'
                })}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800 truncate">{feedback.title}</span>
                    {hasUnreadResponse && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">YENİ CEVAP</span>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{feedback.description}</p>
                <div className="flex items-center gap-3 mt-1.5">
                    <StatusBadge status={feedback.status} />
                    {isAdmin && feedback.employee_name && (
                        <span className="text-xs text-slate-400">{feedback.employee_name}</span>
                    )}
                    <span className="text-xs text-slate-300">{formatDate(feedback.created_at)}</span>
                    {feedback.attachments?.length > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-slate-400">
                            <Paperclip size={10} />
                            {feedback.attachments.length}
                        </span>
                    )}
                </div>
            </div>

            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 mt-2.5 shrink-0 transition-colors" />
        </button>
    );
};

// =================== SMALL HELPERS ===================

const StatMini = ({ label, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
        violet: 'bg-violet-50 text-violet-600',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-[0_1px_4px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

const TabBtn = ({ active, onClick, children, badge }) => (
    <button
        onClick={onClick}
        className={`relative px-4 py-3 text-sm font-bold transition-all
            ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
        <span className="flex items-center gap-2">
            {children}
            {badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold
                    ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {badge}
                </span>
            )}
        </span>
        {active && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />}
    </button>
);

export default Feedback;
