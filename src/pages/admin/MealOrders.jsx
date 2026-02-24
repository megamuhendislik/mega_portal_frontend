import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Utensils, Check, Undo2, Pencil, X, ChevronLeft, ChevronRight, Loader2, Ban, Plus, Search, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_CONFIG = {
    PENDING: { label: 'Bekliyor', bg: 'bg-amber-100', text: 'text-amber-700' },
    ORDERED: { label: 'Sipariş Verildi', bg: 'bg-green-100', text: 'text-green-700', icon: Check },
    DELIVERED: { label: 'Teslim Edildi', bg: 'bg-blue-100', text: 'text-blue-700', icon: Package },
    CANCELLED: { label: 'İptal Edildi', bg: 'bg-red-100', text: 'text-red-700', icon: Ban },
};

const MealOrders = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({ total_requests: 0, ordered_count: 0, pending_count: 0, rejected_count: 0 });
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [editingNote, setEditingNote] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Cancel modal
    const [cancellingRecord, setCancellingRecord] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    // Create on behalf modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [employeeResults, setEmployeeResults] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [newMealDesc, setNewMealDesc] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [listRes, summaryRes] = await Promise.all([
                api.get(`/meal-orders/?date=${date}`),
                api.get(`/meal-orders/summary/?date=${date}`)
            ]);
            setData(listRes.data.results || listRes.data);
            setSummary(summaryRes.data);
        } catch (error) {
            toast.error("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [date]);

    // Employee search for create-on-behalf
    useEffect(() => {
        if (!employeeSearch || employeeSearch.length < 2) {
            setEmployeeResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/employees/?search=${encodeURIComponent(employeeSearch)}&page_size=10`);
                setEmployeeResults(res.data.results || res.data);
            } catch { setEmployeeResults([]); }
        }, 300);
        return () => clearTimeout(timer);
    }, [employeeSearch]);

    const handleMarkOrdered = async (id, currentStatus) => {
        try {
            await api.post(`/meal-orders/${id}/mark_ordered/`, { is_ordered: !currentStatus });
            toast.success("Durum güncellendi.");
            fetchData();
        } catch (error) {
            toast.error("İşlem başarısız.");
        }
    };

    const handleCancel = async () => {
        if (!cancellingRecord) return;
        try {
            await api.post(`/meal-orders/${cancellingRecord.id}/cancel/`, { reason: cancelReason });
            toast.success("Yemek talebi iptal edildi.");
            setCancellingRecord(null);
            setCancelReason('');
            fetchData();
        } catch (error) {
            toast.error("İptal işlemi başarısız.");
        }
    };

    const handleCreateForEmployee = async () => {
        if (!selectedEmployee) return;
        setCreating(true);
        try {
            await api.post('/meal-orders/create-for-employee/', {
                employee_id: selectedEmployee.id,
                date: date,
                description: newMealDesc
            });
            toast.success(`${selectedEmployee.first_name} ${selectedEmployee.last_name} adına yemek talebi oluşturuldu.`);
            setShowCreateModal(false);
            setSelectedEmployee(null);
            setNewMealDesc('');
            setEmployeeSearch('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Talep oluşturulamadı.");
        } finally {
            setCreating(false);
        }
    };

    const handleSaveNote = async () => {
        if (!editingNote) return;
        try {
            await api.post(`/meal-orders/${editingNote.id}/mark_ordered/`, {
                is_ordered: editingNote.is_ordered,
                note: noteText
            });
            toast.success("Not kaydedildi.");
            setEditingNote(null);
            fetchData();
        } catch (error) {
            toast.error("Not kaydedilemedi.");
        }
    };

    const changeDate = (days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        setDate(d.toISOString().split('T')[0]);
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const filteredData = data.filter(item => {
        if (!searchTerm) return true;
        const name = item.employee?.full_name?.toLowerCase() || '';
        const dept = item.employee?.department?.name?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase()) || dept.includes(searchTerm.toLowerCase());
    });

    const getStatusBadge = (record) => {
        const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                {Icon && <Icon size={12} />} {cfg.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 rounded-xl">
                        <Utensils size={24} className="text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Yemek Sipariş Yönetimi</h1>
                        <p className="text-sm text-slate-500">Günlük yemek talepleri ve sipariş durumu</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Create On Behalf Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Personel Adına Talep Oluştur
                    </button>

                    {/* Date Navigator */}
                    <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronLeft size={18} className="text-slate-600" />
                        </button>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none"
                        />
                        <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronRight size={18} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-sm text-slate-500 -mt-3">{formatDate(date)}</p>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500">Toplam Talep</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{summary.total_requests || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500 border border-slate-200">
                    <p className="text-sm text-slate-500">Sipariş Verilen</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{summary.ordered_count || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-amber-400 border border-slate-200">
                    <p className="text-sm text-slate-500">Bekleyen</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{summary.pending_count || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-400 border border-slate-200">
                    <p className="text-sm text-slate-500">İptal Edilen</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{summary.rejected_count || 0}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <input
                        type="text"
                        placeholder="Personel veya departman ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={24} className="animate-spin mr-2" /> Yükleniyor...
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Utensils size={40} className="mx-auto mb-2 opacity-30" />
                        <p>Bu tarih için yemek talebi bulunamadı</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="px-5 py-3 text-left font-semibold">Personel</th>
                                    <th className="px-5 py-3 text-left font-semibold">Tercih / Açıklama</th>
                                    <th className="px-5 py-3 text-left font-semibold">Not</th>
                                    <th className="px-5 py-3 text-center font-semibold">Durum</th>
                                    <th className="px-5 py-3 text-center font-semibold">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map(record => {
                                    const isCancelled = record.status === 'CANCELLED';
                                    const isDelivered = record.status === 'DELIVERED';
                                    const isFinalized = isCancelled || isDelivered;

                                    return (
                                        <tr key={record.id} className={`hover:bg-slate-50/50 transition-colors ${isCancelled ? 'opacity-60' : ''}`}>
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-slate-800">{record.employee?.full_name}</div>
                                                <div className="text-xs text-slate-500">{record.employee?.department?.name}</div>
                                            </td>
                                            <td className="px-5 py-3 text-slate-600">{record.description || '-'}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2 group">
                                                    <span className="text-sm text-slate-600">{record.order_note || '-'}</span>
                                                    {!isFinalized && (
                                                        <button
                                                            onClick={() => { setEditingNote(record); setNoteText(record.order_note || ''); }}
                                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-all"
                                                        >
                                                            <Pencil size={14} className="text-slate-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center">{getStatusBadge(record)}</td>
                                            <td className="px-5 py-3 text-center">
                                                {isFinalized ? (
                                                    <span className="text-xs text-slate-400">-</span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => handleMarkOrdered(record.id, record.is_ordered)}
                                                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                                record.is_ordered
                                                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                            }`}
                                                        >
                                                            {record.is_ordered ? <><Undo2 size={13} /> Geri Al</> : <><Check size={13} /> Sipariş</>}
                                                        </button>
                                                        <button
                                                            onClick={() => { setCancellingRecord(record); setCancelReason(''); }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                            title="Talebi iptal et"
                                                        >
                                                            <Ban size={13} /> İptal
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Cancel Modal */}
            {cancellingRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Yemek Talebi İptal</h3>
                            <button onClick={() => setCancellingRecord(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-slate-600 mb-3">
                                <strong>{cancellingRecord.employee?.full_name}</strong> adlı personelin yemek talebini iptal etmek istediğinize emin misiniz?
                            </p>
                            <textarea
                                rows={3}
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="İptal sebebi (opsiyonel)..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none text-sm"
                            />
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end">
                            <button onClick={() => setCancellingRecord(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">
                                Vazgeç
                            </button>
                            <button onClick={handleCancel} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                                Talebi İptal Et
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Note Edit Modal */}
            {editingNote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Sipariş Notu</h3>
                            <button onClick={() => setEditingNote(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-slate-500 mb-2">{editingNote.employee?.full_name} için sipariş notu</p>
                            <textarea
                                rows={4}
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Örn: Özel diyet menüsü istendi..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                            />
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end">
                            <button onClick={() => setEditingNote(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">
                                Vazgeç
                            </button>
                            <button onClick={handleSaveNote} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create On Behalf Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Personel Adına Yemek Talebi</h3>
                            <button onClick={() => { setShowCreateModal(false); setSelectedEmployee(null); setEmployeeSearch(''); setNewMealDesc(''); }} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                                <strong>{formatDate(date)}</strong> için yemek talebi oluşturulacak.
                            </div>

                            {/* Employee Search */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Personel</label>
                                {selectedEmployee ? (
                                    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                                        <div>
                                            <div className="font-medium text-indigo-800 text-sm">{selectedEmployee.first_name} {selectedEmployee.last_name}</div>
                                            <div className="text-xs text-indigo-500">{selectedEmployee.department_name || selectedEmployee.department?.name || ''}</div>
                                        </div>
                                        <button onClick={() => { setSelectedEmployee(null); setEmployeeSearch(''); }} className="text-indigo-400 hover:text-indigo-600">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></div>
                                        <input
                                            type="text"
                                            value={employeeSearch}
                                            onChange={e => setEmployeeSearch(e.target.value)}
                                            placeholder="Personel adı yazın..."
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        />
                                        {employeeResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {employeeResults.map(emp => (
                                                    <button
                                                        key={emp.id}
                                                        onClick={() => { setSelectedEmployee(emp); setEmployeeSearch(''); setEmployeeResults([]); }}
                                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="font-medium text-slate-800">{emp.first_name} {emp.last_name}</div>
                                                        <div className="text-xs text-slate-500">{emp.department_name || emp.department?.name || ''}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">Yemek Tercihi / Açıklama</label>
                                <textarea
                                    rows={3}
                                    value={newMealDesc}
                                    onChange={e => setNewMealDesc(e.target.value)}
                                    placeholder="Örn: Vejetaryen menü, Diyet kola vb."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end">
                            <button onClick={() => { setShowCreateModal(false); setSelectedEmployee(null); setEmployeeSearch(''); setNewMealDesc(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">
                                Vazgeç
                            </button>
                            <button
                                onClick={handleCreateForEmployee}
                                disabled={!selectedEmployee || creating}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                            >
                                {creating ? <Loader2 size={14} className="animate-spin inline mr-1" /> : <Plus size={14} className="inline mr-1" />}
                                Talep Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealOrders;
