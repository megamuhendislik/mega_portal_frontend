import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import ModalOverlay from '../../components/ui/ModalOverlay';
import {
    Megaphone, RefreshCw, Plus, Edit3, Trash2,
    Loader2, X, Users, Check, Power, PowerOff,
    Info, AlertTriangle, AlertOctagon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ===== CONSTANTS =====

const LEVEL_OPTIONS = [
    { value: 'INFO',     label: 'Bilgi',  color: 'bg-blue-100 text-blue-700' },
    { value: 'WARNING',  label: 'Uyarı',  color: 'bg-amber-100 text-amber-700' },
    { value: 'CRITICAL', label: 'Kritik', color: 'bg-red-100 text-red-700' },
];

const STATUS_CONFIG = {
    PASSIVE:   { label: 'Pasif',         bg: 'bg-slate-100',  text: 'text-slate-600' },
    SCHEDULED: { label: 'Zamanlanmış',   bg: 'bg-indigo-100', text: 'text-indigo-700' },
    ACTIVE:    { label: 'Aktif',         bg: 'bg-green-100',  text: 'text-green-700' },
    EXPIRED:   { label: 'Süresi Doldu',  bg: 'bg-red-100',    text: 'text-red-600' },
};

const LEVEL_ICON = { INFO: Info, WARNING: AlertTriangle, CRITICAL: AlertOctagon };

const EMPTY_FORM = {
    title: '',
    body: '',
    level: 'INFO',
    target_type: 'ALL',
    target_employees: [],
    start_at: '',
    end_at: '',
};

// ===== HELPERS =====

const formatDT = (dtStr) => {
    if (!dtStr) return '-';
    const d = new Date(dtStr);
    return d.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Istanbul',
    });
};

// datetime-local input value from ISO string
const toLocalInputValue = (isoStr) => {
    if (!isoStr) return '';
    // Trim seconds/ms for datetime-local
    return new Date(isoStr).toISOString().slice(0, 16);
};

// ISO string from datetime-local input (treat as Istanbul = UTC+3)
const localInputToISO = (localStr) => {
    if (!localStr) return '';
    // datetime-local has no tz info — treat as Istanbul (UTC+3)
    return new Date(localStr + ':00+03:00').toISOString();
};

const getLevelBadge = (level) => {
    const cfg = LEVEL_OPTIONS.find(o => o.value === level);
    const LvIcon = LEVEL_ICON[level] || Info;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg?.color || ''}`}>
            <LvIcon size={12} />
            {cfg?.label || level}
        </span>
    );
};

const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PASSIVE;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            {status === 'ACTIVE' && <Check size={12} />}
            {cfg.label}
        </span>
    );
};

// ===== COMPONENT =====

const SystemMessages = () => {
    // Data
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    // Employees for multi-select
    const [employees, setEmployees] = useState([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [empSearch, setEmpSearch] = useState('');

    // Modal
    const [formModal, setFormModal] = useState(null); // null | 'create' | message-object (edit)
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deleteModal, setDeleteModal] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Toggle loading map
    const [togglingId, setTogglingId] = useState(null);

    // ===== FETCH MESSAGES =====
    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page });
            const res = await api.get(`/system-messages/?${params}`);
            const data = res.data;
            setMessages(Array.isArray(data) ? data : (data.results || []));
            setTotalCount(typeof data.count === 'number' ? data.count : (data.results || data).length);
        } catch {
            toast.error('Mesajlar yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    // ===== FETCH EMPLOYEES =====
    const fetchEmployees = useCallback(async () => {
        setEmpLoading(true);
        try {
            // Fetch all employees (handle pagination)
            let results = [];
            let url = '/employees/?page_size=500';
            if (empSearch) url += `&search=${encodeURIComponent(empSearch)}`;
            const res = await api.get(url);
            const data = res.data;
            results = Array.isArray(data) ? data : (data.results || []);
            setEmployees(results);
        } catch {
            // Silently ignore — employee list is optional
        } finally {
            setEmpLoading(false);
        }
    }, [empSearch]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    // ===== OPEN CREATE MODAL =====
    const openCreate = () => {
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setFormModal('create');
    };

    // ===== OPEN EDIT MODAL =====
    const openEdit = (msg) => {
        setFormData({
            title: msg.title || '',
            body: msg.body || '',
            level: msg.level || 'INFO',
            target_type: msg.target_type || 'ALL',
            target_employees: (msg.target_employees || []).map(e => (typeof e === 'object' ? e.id : e)),
            start_at: toLocalInputValue(msg.start_at),
            end_at: toLocalInputValue(msg.end_at),
        });
        setFormErrors({});
        setFormModal(msg);
    };

    // ===== FORM FIELD CHANGE =====
    const handleField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
    };

    // ===== SAVE (CREATE / UPDATE) =====
    const handleSave = async () => {
        // Client-side validation
        const errs = {};
        if (!formData.title.trim()) errs.title = 'Başlık zorunludur.';
        if (!formData.body.trim()) errs.body = 'İçerik zorunludur.';
        if (!formData.start_at) errs.start_at = 'Başlangıç tarihi zorunludur.';
        if (!formData.end_at) errs.end_at = 'Bitiş tarihi zorunludur.';
        if (formData.target_type === 'SPECIFIC' && formData.target_employees.length === 0) {
            errs.target_employees = 'En az bir çalışan seçiniz.';
        }
        if (Object.keys(errs).length) { setFormErrors(errs); return; }

        setSaving(true);
        try {
            const payload = {
                title: formData.title.trim(),
                body: formData.body.trim(),
                level: formData.level,
                target_type: formData.target_type,
                target_employees: formData.target_type === 'SPECIFIC' ? formData.target_employees : [],
                start_at: localInputToISO(formData.start_at),
                end_at: localInputToISO(formData.end_at),
            };

            if (formModal === 'create') {
                await api.post('/system-messages/', payload);
                toast.success('Sistem mesajı oluşturuldu.');
            } else {
                await api.patch(`/system-messages/${formModal.id}/`, payload);
                toast.success('Sistem mesajı güncellendi.');
            }
            setFormModal(null);
            fetchMessages();
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                // Map backend field errors
                const mapped = {};
                for (const [k, v] of Object.entries(data)) {
                    mapped[k] = Array.isArray(v) ? v.join(' ') : String(v);
                }
                setFormErrors(mapped);
                if (mapped.non_field_errors || mapped.detail) {
                    toast.error(mapped.non_field_errors || mapped.detail);
                }
            } else {
                toast.error('Kaydetme başarısız.');
            }
        } finally {
            setSaving(false);
        }
    };

    // ===== DELETE =====
    const handleDelete = async () => {
        if (!deleteModal) return;
        setDeleting(true);
        try {
            await api.delete(`/system-messages/${deleteModal.id}/`);
            toast.success('Mesaj silindi.');
            setDeleteModal(null);
            fetchMessages();
        } catch {
            toast.error('Silme başarısız.');
        } finally {
            setDeleting(false);
        }
    };

    // ===== TOGGLE ACTIVE =====
    const handleToggleActive = async (msg) => {
        setTogglingId(msg.id);
        try {
            await api.post(`/system-messages/${msg.id}/toggle-active/`);
            toast.success(msg.is_active ? 'Mesaj pasife alındı.' : 'Mesaj aktife alındı.');
            fetchMessages();
        } catch {
            toast.error('İşlem başarısız.');
        } finally {
            setTogglingId(null);
        }
    };

    // ===== EMPLOYEE MULTI-SELECT toggle =====
    const toggleEmployee = (empId) => {
        setFormData(prev => {
            const has = prev.target_employees.includes(empId);
            const next = has
                ? prev.target_employees.filter(id => id !== empId)
                : [...prev.target_employees, empId];
            return { ...prev, target_employees: next };
        });
        if (formErrors.target_employees) setFormErrors(prev => ({ ...prev, target_employees: undefined }));
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const getEmployeeLabel = (emp) => {
        const name = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
        const dept = emp.department?.name || '';
        return dept ? `${name} — ${dept}` : name;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl">
                        <Megaphone size={24} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Sistem Mesajları</h1>
                        <p className="text-sm text-slate-500">
                            Kullanıcılara pop-up olarak gösterilen duyuru ve uyarı mesajlarını yönetin
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchMessages}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <RefreshCw size={16} /> Yenile
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Yeni Mesaj
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Megaphone size={40} className="mx-auto mb-2 opacity-30" />
                        <p>Henüz sistem mesajı yok</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-5 py-3 text-left font-semibold">Başlık</th>
                                        <th className="px-5 py-3 text-left font-semibold">Seviye</th>
                                        <th className="px-5 py-3 text-left font-semibold">Durum</th>
                                        <th className="px-5 py-3 text-left font-semibold">Pencere</th>
                                        <th className="px-5 py-3 text-left font-semibold">Hedef</th>
                                        <th className="px-5 py-3 text-center font-semibold">Kapatan</th>
                                        <th className="px-5 py-3 text-center font-semibold">Aksiyonlar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {messages.map(msg => (
                                        <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                                            {/* Title */}
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-slate-800 max-w-xs truncate" title={msg.title}>
                                                    {msg.title}
                                                </div>
                                                {msg.created_by_name && (
                                                    <div className="text-xs text-slate-400">{msg.created_by_name}</div>
                                                )}
                                            </td>

                                            {/* Level */}
                                            <td className="px-5 py-3">
                                                {getLevelBadge(msg.level)}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3">
                                                {getStatusBadge(msg.status)}
                                            </td>

                                            {/* Window */}
                                            <td className="px-5 py-3">
                                                <div className="text-xs text-slate-600 whitespace-nowrap">
                                                    {formatDT(msg.start_at)}
                                                </div>
                                                <div className="text-xs text-slate-400 whitespace-nowrap">
                                                    → {formatDT(msg.end_at)}
                                                </div>
                                            </td>

                                            {/* Target */}
                                            <td className="px-5 py-3">
                                                {msg.target_type === 'ALL' ? (
                                                    <span className="text-xs text-slate-600">Tümü</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                                                        <Users size={12} /> {msg.target_employee_count ?? '?'} kişi
                                                    </span>
                                                )}
                                            </td>

                                            {/* Dismissed count */}
                                            <td className="px-5 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-600 font-medium text-xs">
                                                    {msg.dismissed_count ?? 0}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openEdit(msg)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                        title="Düzenle"
                                                    >
                                                        <Edit3 size={13} /> Düzenle
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(msg)}
                                                        disabled={togglingId === msg.id}
                                                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                            msg.is_active
                                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                                                        }`}
                                                        title={msg.is_active ? 'Pasife Al' : 'Aktife Al'}
                                                    >
                                                        {togglingId === msg.id
                                                            ? <Loader2 size={13} className="animate-spin" />
                                                            : msg.is_active
                                                                ? <><PowerOff size={13} /> Pasif</>
                                                                : <><Power size={13} /> Aktif</>
                                                        }
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal(msg)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={13} /> Sil
                                                    </button>
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
                                    Toplam {totalCount} mesaj — Sayfa {page}/{totalPages}
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

            {/* ===== CREATE / EDIT MODAL ===== */}
            <ModalOverlay open={!!formModal} onClose={() => !saving && setFormModal(null)} level="secondary">
                {formModal && (
                    <div className="bg-white rounded-xl shadow-2xl w-[calc(100%-1rem)] sm:w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Megaphone size={20} className="text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {formModal === 'create' ? 'Yeni Sistem Mesajı' : 'Mesajı Düzenle'}
                                </h3>
                            </div>
                            <button
                                onClick={() => !saving && setFormModal(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Başlık <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => handleField('title', e.target.value)}
                                    placeholder="Mesaj başlığı..."
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors ${
                                        formErrors.title ? 'border-red-400' : 'border-slate-300'
                                    }`}
                                />
                                {formErrors.title && (
                                    <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
                                )}
                            </div>

                            {/* Body */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    İçerik <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.body}
                                    onChange={e => handleField('body', e.target.value)}
                                    placeholder="Kullanıcılara gösterilecek mesaj içeriği..."
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none transition-colors ${
                                        formErrors.body ? 'border-red-400' : 'border-slate-300'
                                    }`}
                                />
                                {formErrors.body && (
                                    <p className="text-xs text-red-500 mt-1">{formErrors.body}</p>
                                )}
                            </div>

                            {/* Level */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Seviye</label>
                                <div className="flex gap-2 flex-wrap">
                                    {LEVEL_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleField('level', opt.value)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                                formData.level === opt.value
                                                    ? `${opt.color} border-current shadow-sm`
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Hedef</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleField('target_type', 'ALL')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                                            formData.target_type === 'ALL'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Tüm Kullanıcılar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleField('target_type', 'SPECIFIC')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                                            formData.target_type === 'SPECIFIC'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Belirli Kişiler
                                    </button>
                                </div>
                            </div>

                            {/* Target Employees (only when SPECIFIC) */}
                            {formData.target_type === 'SPECIFIC' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Çalışanlar <span className="text-red-500">*</span>
                                        {formData.target_employees.length > 0 && (
                                            <span className="ml-2 text-indigo-600 font-normal">
                                                {formData.target_employees.length} seçili
                                            </span>
                                        )}
                                    </label>
                                    {/* Search */}
                                    <input
                                        type="text"
                                        placeholder="Çalışan ara..."
                                        value={empSearch}
                                        onChange={e => setEmpSearch(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 mb-2"
                                    />
                                    <div className={`border rounded-lg overflow-y-auto max-h-48 ${
                                        formErrors.target_employees ? 'border-red-400' : 'border-slate-200'
                                    }`}>
                                        {empLoading ? (
                                            <div className="flex items-center justify-center py-6 text-slate-400 text-xs">
                                                <Loader2 size={14} className="animate-spin mr-1" /> Yükleniyor...
                                            </div>
                                        ) : employees.length === 0 ? (
                                            <div className="text-center py-6 text-slate-400 text-xs">Çalışan bulunamadı</div>
                                        ) : (
                                            employees.map(emp => {
                                                const selected = formData.target_employees.includes(emp.id);
                                                return (
                                                    <button
                                                        key={emp.id}
                                                        type="button"
                                                        onClick={() => toggleEmployee(emp.id)}
                                                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                                                            selected ? 'bg-indigo-50' : ''
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                            selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                                                        }`}>
                                                            {selected && <Check size={10} className="text-white" />}
                                                        </div>
                                                        <span className={selected ? 'text-indigo-700 font-medium' : 'text-slate-700'}>
                                                            {getEmployeeLabel(emp)}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                    {formErrors.target_employees && (
                                        <p className="text-xs text-red-500 mt-1">{formErrors.target_employees}</p>
                                    )}
                                </div>
                            )}

                            {/* Date range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Başlangıç <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.start_at}
                                        onChange={e => handleField('start_at', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors ${
                                            formErrors.start_at ? 'border-red-400' : 'border-slate-300'
                                        }`}
                                    />
                                    {formErrors.start_at && (
                                        <p className="text-xs text-red-500 mt-1">{formErrors.start_at}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Bitiş <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_at}
                                        onChange={e => handleField('end_at', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors ${
                                            formErrors.end_at ? 'border-red-400' : 'border-slate-300'
                                        }`}
                                    />
                                    {formErrors.end_at && (
                                        <p className="text-xs text-red-500 mt-1">{formErrors.end_at}</p>
                                    )}
                                </div>
                            </div>

                            {/* Backend non-field errors */}
                            {(formErrors.non_field_errors || formErrors.detail) && (
                                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                                    {formErrors.non_field_errors || formErrors.detail}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end sticky bottom-0 bg-white">
                            <button
                                onClick={() => !saving && setFormModal(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold flex items-center gap-1.5"
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {formModal === 'create' ? 'Oluştur' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                )}
            </ModalOverlay>

            {/* ===== DELETE CONFIRM MODAL ===== */}
            <ModalOverlay open={!!deleteModal} onClose={() => !deleting && setDeleteModal(null)} level="tertiary">
                {deleteModal && (
                    <div className="bg-white rounded-xl shadow-2xl w-[calc(100%-1rem)] sm:w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Mesajı Sil</h3>
                            <button onClick={() => !deleting && setDeleteModal(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-red-700">
                                    <strong>"{deleteModal.title}"</strong> mesajını silmek istediğinizden emin misiniz?
                                    Bu işlem geri alınamaz.
                                </p>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteModal(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center gap-1.5"
                            >
                                {deleting && <Loader2 size={14} className="animate-spin" />}
                                <Trash2 size={14} /> Sil
                            </button>
                        </div>
                    </div>
                )}
            </ModalOverlay>
        </div>
    );
};

export default SystemMessages;
