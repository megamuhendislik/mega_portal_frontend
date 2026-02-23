
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';

export default function DayEditModal({ isOpen, onClose, employee, date, onSaveSuccess }) {
    const [records, setRecords] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [otRequests, setOtRequests] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [dailyTarget, setDailyTarget] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteIds, setDeleteIds] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Smart Entry State
    const [workStart, setWorkStart] = useState('08:00');
    const [workDuration, setWorkDuration] = useState(9);
    const [otDuration, setOtDuration] = useState(2);

    // Leave Create Form
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveReason, setLeaveReason] = useState('');

    // Entitlement editing state
    const [editingEntitlement, setEditingEntitlement] = useState(null); // {year, days_entitled, days_used}
    const [editEntReason, setEditEntReason] = useState('');
    const [editEntSaving, setEditEntSaving] = useState(false);

    // New year addition
    const [showAddYear, setShowAddYear] = useState(false);
    const [newYear, setNewYear] = useState(new Date().getFullYear());
    const [newYearDays, setNewYearDays] = useState(14);
    const [newYearReason, setNewYearReason] = useState('');

    // Adjustment history
    const [adjustmentHistory, setAdjustmentHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    const dateStr = format(date, 'yyyy-MM-dd');

    const loadData = () => {
        setLoading(true);
        setDeleteIds([]);
        api.get('/system-data/daily_records/', {
            params: { employee_id: employee.id, date: dateStr }
        }).then(res => {
            setRecords(res.data.records || []);
            setLeaves(res.data.leaves || []);
            setOtRequests(res.data.overtime_requests || []);
            setLeaveBalance(res.data.leave_balance || []);
            setRequestTypes(res.data.request_types || []);
            setDailyTarget(res.data.daily_target_seconds || 0);
            if (res.data.request_types?.length > 0 && !leaveTypeId) {
                setLeaveTypeId(res.data.request_types[0].id);
            }
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
            setLeaveStart(dateStr);
            setLeaveEnd(dateStr);
            setLeaveReason('');
        }
    }, [isOpen, employee.id, dateStr]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/system-data/update_daily_records/', {
                employee_id: employee.id, date: dateStr,
                records: records, delete_ids: deleteIds
            });
            alert('Kaydedildi!');
            if (onSaveSuccess) onSaveSuccess();
            loadData();
        } catch (e) { alert('Hata: ' + e.message); }
        finally { setSaving(false); }
    };

    const addRecord = () => {
        setRecords([...records, {
            id: null, check_in: `${dateStr}T09:00`, check_out: `${dateStr}T18:00`,
            source: 'MANUAL', status: 'OPEN'
        }]);
    };

    const updateRec = (idx, field, val) => {
        const n = [...records]; n[idx][field] = val; setRecords(n);
    };

    const removeRec = (idx) => {
        const rec = records[idx];
        if (rec.id) setDeleteIds([...deleteIds, rec.id]);
        setRecords(records.filter((_, i) => i !== idx));
    };

    const applyDailyWork = () => {
        const idsToDelete = records.filter(r => r.id).map(r => r.id);
        setDeleteIds([...deleteIds, ...idsToDelete]);
        const [sh, sm] = workStart.split(':').map(Number);
        const startDate = new Date(date); startDate.setHours(sh, sm, 0, 0);
        const endDate = new Date(startDate.getTime() + workDuration * 60 * 60 * 1000);
        setRecords([{
            id: null, check_in: `${dateStr}T${workStart}`,
            check_out: format(endDate, "yyyy-MM-dd'T'HH:mm"), source: 'MANUAL', status: 'OPEN'
        }]);
        alert('G\u00fcnl\u00fck kay\u0131t olu\u015fturuldu. Kaydet butonuna basmay\u0131 unutmay\u0131n.');
    };

    const addOvertime = () => {
        let lastEnd = new Date(date); lastEnd.setHours(18, 0, 0, 0);
        if (records.length > 0) {
            const sorted = [...records].sort((a, b) => new Date(b.check_out) - new Date(a.check_out));
            if (sorted[0].check_out) lastEnd = new Date(sorted[0].check_out);
        }
        const end = new Date(lastEnd.getTime() + otDuration * 60 * 60 * 1000);
        setRecords([...records, {
            id: null, check_in: format(lastEnd, "yyyy-MM-dd'T'HH:mm"),
            check_out: format(end, "yyyy-MM-dd'T'HH:mm"), source: 'MANUAL', status: 'OPEN'
        }]);
    };

    const totalHours = () => {
        let t = 0;
        records.forEach(r => { if (r.check_in && r.check_out) { const d = new Date(r.check_out) - new Date(r.check_in); if (d > 0) t += d; } });
        return (t / (1000 * 60 * 60)).toFixed(1);
    };

    const handleCreateLeave = async () => {
        if (!leaveTypeId || !leaveStart || !leaveEnd) { alert('L\u00fctfen t\u00fcm alanlar\u0131 doldurun'); return; }
        setSaving(true);
        try {
            const res = await api.post('/system-data/admin_create_leave/', {
                employee_id: employee.id, request_type_id: leaveTypeId,
                start_date: leaveStart, end_date: leaveEnd, reason: leaveReason || 'Muhasebe taraf\u0131ndan olu\u015fturuldu'
            });
            alert(res.data.message);
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) { alert('Hata: ' + (e.response?.data?.error || e.message)); }
        finally { setSaving(false); }
    };

    const handleCancelLeave = async (leaveId) => {
        if (!confirm('Bu izni iptal etmek istedi\u011finize emin misiniz?')) return;
        try {
            const res = await api.post('/system-data/admin_cancel_leave/', { leave_id: leaveId });
            alert(res.data.message);
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) { alert('Hata: ' + (e.response?.data?.error || e.message)); }
    };

    const handleSaveEntitlement = async () => {
        if (!editingEntitlement || !editEntReason.trim()) {
            alert('Gerekçe zorunludur');
            return;
        }
        setEditEntSaving(true);
        try {
            const payload = {
                employee_id: employee.id,
                year: editingEntitlement.year,
                reason: editEntReason,
            };
            if (editingEntitlement.days_entitled !== undefined) {
                payload.days_entitled = editingEntitlement.days_entitled;
            }
            if (editingEntitlement.days_used !== undefined) {
                payload.days_used = editingEntitlement.days_used;
            }
            const res = await api.post('/system-data/adjust_entitlement/', payload);
            alert(res.data.message);
            setEditingEntitlement(null);
            setEditEntReason('');
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            alert('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setEditEntSaving(false);
        }
    };

    const handleAddYear = async () => {
        if (!newYearReason.trim()) {
            alert('Gerekçe zorunludur');
            return;
        }
        setEditEntSaving(true);
        try {
            const res = await api.post('/system-data/adjust_entitlement/', {
                employee_id: employee.id,
                year: newYear,
                days_entitled: newYearDays,
                days_used: 0,
                reason: newYearReason || 'Yeni yıl eklendi',
            });
            alert(res.data.message);
            setShowAddYear(false);
            setNewYearReason('');
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            alert('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setEditEntSaving(false);
        }
    };

    const fetchAdjustmentHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get(`/system-data/entitlement_history/?employee_id=${employee.id}`);
            setAdjustmentHistory(res.data || []);
        } catch (e) {
            console.error('Failed to fetch history', e);
            setAdjustmentHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleOtAction = async (otId, action) => {
        const reason = action === 'reject' ? prompt('Red sebebi:') : '';
        if (action === 'reject' && reason === null) return;
        try {
            const res = await api.post('/system-data/admin_manage_overtime/', {
                overtime_id: otId, action, reason
            });
            alert(res.data.message);
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) { alert('Hata: ' + (e.response?.data?.error || e.message)); }
    };

    const fmtSec = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}s ${m}dk`; };

    const statusBadge = (status) => {
        const map = {
            'APPROVED': 'bg-emerald-100 text-emerald-700',
            'PENDING': 'bg-yellow-100 text-yellow-700',
            'REJECTED': 'bg-red-100 text-red-700',
            'CANCELLED': 'bg-slate-100 text-slate-500',
            'POTENTIAL': 'bg-blue-100 text-blue-700',
        };
        return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
    };

    if (!isOpen) return null;

    const tabs = [
        { key: 'overview', icon: '\ud83d\udcca', label: '\u00d6zet' },
        { key: 'attendance', icon: '\ud83d\udcdd', label: 'Giri\u015f/\u00c7\u0131k\u0131\u015f' },
        { key: 'leave', icon: '\ud83c\udfd6\ufe0f', label: '\u0130zin' },
        { key: 'overtime', icon: '\u23f0', label: 'Fazla Mesai' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-3 md:p-5 border-b flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50/30">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {format(date, 'd MMMM yyyy, EEEE', { locale: tr })}
                            <span className="text-xs font-normal text-slate-500 bg-white border px-2 py-1 rounded-full">
                                {employee.first_name} {employee.last_name}
                            </span>
                        </h3>
                        <div className="text-sm text-slate-500 mt-1 flex gap-4 flex-wrap">
                            <span>Toplam: <b className="text-slate-800">{totalHours()} Saat</b></span>
                            {dailyTarget > 0 && <span>Hedef: <b className="text-blue-600">{fmtSec(dailyTarget)}</b></span>}
                            {leaves.length > 0 && <span className="text-emerald-600 font-bold">{'\ud83c\udfd6\ufe0f'} \u0130zinli</span>}
                            {otRequests.length > 0 && <span className="text-amber-600 font-bold">{'\u23f0'} {otRequests.length} FM Talebi</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-red-500">
                        <span className="font-bold text-xl">{'\u00d7'}</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5
                                ${activeTab === tab.key ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                            <span>{tab.icon}</span> {tab.label}
                            {tab.key === 'leave' && leaves.length > 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded-full">{leaves.length}</span>}
                            {tab.key === 'overtime' && otRequests.length > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full">{otRequests.length}</span>}
                        </button>
                    ))}
                </div>

                <div className="p-3 md:p-5 overflow-y-auto flex-1 bg-slate-50/30">
                    {loading ? (
                        <div className="text-center py-10">Y\u00fckleniyor...</div>
                    ) : (
                        <>
                            {/* ========== OVERVIEW TAB ========== */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Hedef', value: fmtSec(dailyTarget), color: 'blue', icon: '\ud83c\udfaf' },
                                            { label: 'Normal', value: fmtSec(records.reduce((s, r) => s + (r.normal_seconds || 0), 0)), color: 'green', icon: '\u2705' },
                                            { label: 'Fazla Mesai', value: fmtSec(records.reduce((s, r) => s + (r.overtime_seconds || 0), 0)), color: 'amber', icon: '\u23f0' },
                                            { label: 'Eksik', value: fmtSec(records.reduce((s, r) => s + (r.missing_seconds || 0), 0)), color: 'red', icon: '\u274c' },
                                        ].map((card, i) => (
                                            <div key={i} className={`bg-white rounded-xl border p-3 border-${card.color}-100`}>
                                                <div className="text-xs text-slate-500 mb-1">{card.icon} {card.label}</div>
                                                <div className={`text-lg font-bold text-${card.color}-600`}>{card.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Attendance Records Preview */}
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-blue-500 rounded-full"></div> Giri\u015f/\u00c7\u0131k\u0131\u015f Kay\u0131tlar\u0131
                                        </h4>
                                        {records.length > 0 ? (
                                            <div className="space-y-1">
                                                {records.map((rec, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                                        <span className="font-mono text-slate-600">
                                                            {rec.check_in ? format(new Date(rec.check_in), 'HH:mm') : '?'} \u2192 {rec.check_out ? format(new Date(rec.check_out), 'HH:mm') : '?'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded">{rec.source}</span>
                                                            {rec.normal_seconds > 0 && <span className="text-[10px] text-green-600">{fmtSec(rec.normal_seconds)}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-slate-400 italic">Kay\u0131t yok</p>}
                                    </div>

                                    {/* Leaves on this day */}
                                    {leaves.length > 0 && (
                                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                                            <h4 className="text-sm font-bold text-emerald-700 mb-2">{'\ud83c\udfd6\ufe0f'} \u0130zin Kay\u0131tlar\u0131</h4>
                                            {leaves.map((lr, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white rounded-lg p-2 mb-1 border border-emerald-100">
                                                    <div>
                                                        <span className="font-medium text-sm text-slate-700">{lr.type_name}</span>
                                                        <span className="text-xs text-slate-400 ml-2">{lr.start_date} \u2192 {lr.end_date} ({lr.total_days} g\u00fcn)</span>
                                                    </div>
                                                    {statusBadge(lr.status)}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* OT Requests on this day */}
                                    {otRequests.length > 0 && (
                                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                                            <h4 className="text-sm font-bold text-amber-700 mb-2">{'\u23f0'} Fazla Mesai Talepleri</h4>
                                            {otRequests.map((ot, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white rounded-lg p-2 mb-1 border border-amber-100">
                                                    <div>
                                                        <span className="font-mono text-sm text-slate-600">{ot.start_time} \u2192 {ot.end_time}</span>
                                                        {ot.reason && <span className="text-xs text-slate-400 ml-2">({ot.reason})</span>}
                                                    </div>
                                                    {statusBadge(ot.status)}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Leave Balance */}
                                    {leaveBalance.length > 0 && (
                                        <div className="bg-white rounded-xl border p-4">
                                            <h4 className="text-sm font-bold text-slate-700 mb-2">{'\ud83d\udccb'} Y\u0131ll\u0131k \u0130zin Bakiyesi</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {leaveBalance.map((bal, i) => (
                                                    <div key={i} className="bg-slate-50 rounded-lg p-3 text-center">
                                                        <div className="text-xs text-slate-400 mb-1">{bal.year}</div>
                                                        <div className="text-2xl font-bold text-blue-600">{bal.remaining_days}</div>
                                                        <div className="text-[10px] text-slate-400">Kalan / {bal.total_days} toplam ({bal.used_days} kullan\u0131ld\u0131)</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ========== ATTENDANCE TAB ========== */}
                            {activeTab === 'attendance' && (
                                <div className="space-y-5 animate-fade-in">
                                    {/* Smart Entry */}
                                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-5 bg-blue-500 rounded-full"></div> {'\u26a1'} H\u0131zl\u0131 \u0130\u015flem
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Ba\u015flang\u0131\u00e7</label>
                                                <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">S\u00fcre (Saat)</label>
                                                <input type="number" step="0.5" value={workDuration} onChange={e => setWorkDuration(Number(e.target.value))}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <button onClick={applyDailyWork}
                                                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-blue-200 shadow-lg text-sm">
                                                G\u00fcn\u00fc Olu\u015ftur
                                            </button>
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Mesai (Saat)</label>
                                                    <input type="number" step="0.5" value={otDuration} onChange={e => setOtDuration(Number(e.target.value))}
                                                        className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
                                                </div>
                                                <button onClick={addOvertime}
                                                    className="bg-amber-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-amber-700 transition-colors text-sm whitespace-nowrap">
                                                    +Mesai
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Raw Records Table */}
                                    <div className="bg-white rounded-xl border overflow-x-auto shadow-sm">
                                        <div className="flex justify-between p-3 items-center border-b bg-slate-50">
                                            <div className="text-sm text-slate-600 font-medium">Kay\u0131tlar ({records.length})</div>
                                            <button onClick={addRecord} className="flex items-center gap-1.5 text-blue-600 font-bold hover:bg-blue-50 px-3 py-1 rounded-lg text-sm border border-blue-100">
                                                <Plus size={14} /> Yeni
                                            </button>
                                        </div>
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                                                <tr>
                                                    <th className="p-3">Giri\u015f</th>
                                                    <th className="p-3">\u00c7\u0131k\u0131\u015f</th>
                                                    <th className="p-3 w-28">Kaynak</th>
                                                    <th className="p-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {records.map((rec, i) => (
                                                    <tr key={i} className="group hover:bg-blue-50/20 transition-colors">
                                                        <td className="p-2">
                                                            <input type="text" className="w-full border p-2 rounded bg-white font-mono text-sm focus:border-blue-400 outline-none"
                                                                value={rec.check_in || ''} onChange={e => updateRec(i, 'check_in', e.target.value)} placeholder="YYYY-MM-DDTHH:MM" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="text" className="w-full border p-2 rounded bg-white font-mono text-sm focus:border-blue-400 outline-none"
                                                                value={rec.check_out || ''} onChange={e => updateRec(i, 'check_out', e.target.value)} placeholder="YYYY-MM-DDTHH:MM" />
                                                        </td>
                                                        <td className="p-2">
                                                            <select value={rec.source} onChange={e => updateRec(i, 'source', e.target.value)}
                                                                className="w-full border p-2 rounded bg-white text-sm focus:border-blue-400 outline-none">
                                                                <option value="MANUAL">MANUAL</option>
                                                                <option value="CARD">CARD</option>
                                                                <option value="FACE">FACE</option>
                                                                <option value="QR">QR</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => removeRec(i)} className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors" title="Sil">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {records.length === 0 && (
                                                    <tr><td colSpan="4" className="p-6 text-center text-slate-400 italic">Kay\u0131t bulunamad\u0131.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ========== LEAVE TAB ========== */}
                            {activeTab === 'leave' && (
                                <div className="space-y-5 animate-fade-in">
                                    {/* Leave Balance Summary */}
                                    {leaveBalance.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {leaveBalance.map((bal, i) => (
                                                <div key={i} className="bg-white rounded-xl border p-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-bold text-slate-600">{bal.year}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{bal.remaining_days} kalan</span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingEntitlement({
                                                                        year: bal.year,
                                                                        days_entitled: bal.total_days,
                                                                        days_used: bal.used_days,
                                                                    });
                                                                    setEditEntReason('');
                                                                }}
                                                                className="text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors font-bold"
                                                                title="Düzenle"
                                                            >
                                                                Düzenle
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Inline Edit */}
                                                    {editingEntitlement?.year === bal.year ? (
                                                        <div className="space-y-2 mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Hak (Gün)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={editingEntitlement.days_entitled}
                                                                        onChange={e => setEditingEntitlement({...editingEntitlement, days_entitled: parseFloat(e.target.value) || 0})}
                                                                        className="w-full border p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                                                        step="0.5" min="0"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Kullanılan (Gün)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={editingEntitlement.days_used}
                                                                        onChange={e => setEditingEntitlement({...editingEntitlement, days_used: parseFloat(e.target.value) || 0})}
                                                                        className="w-full border p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                                                        step="0.5" min="0"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Gerekçe *</label>
                                                                <input
                                                                    type="text"
                                                                    value={editEntReason}
                                                                    onChange={e => setEditEntReason(e.target.value)}
                                                                    placeholder="Düzeltme gerekçesi"
                                                                    className="w-full border p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                                                />
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={handleSaveEntitlement}
                                                                    disabled={editEntSaving || !editEntReason.trim()}
                                                                    className="flex-1 text-xs bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 transition disabled:opacity-50 font-bold"
                                                                >
                                                                    {editEntSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingEntitlement(null)}
                                                                    className="text-xs bg-slate-200 text-slate-600 px-2 py-1.5 rounded hover:bg-slate-300 transition font-bold"
                                                                >
                                                                    İptal
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                                <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${bal.total_days > 0 ? Math.min((bal.used_days / bal.total_days) * 100, 100) : 0}%` }}></div>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-1">{bal.used_days} kullanıldı / {bal.total_days} toplam</div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Year + History Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAddYear(!showAddYear)}
                                            className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-lg border border-emerald-200 transition font-bold"
                                        >
                                            <Plus size={14} />
                                            Yıl Ekle
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowHistory(!showHistory);
                                                if (!showHistory && adjustmentHistory.length === 0) {
                                                    fetchAdjustmentHistory();
                                                }
                                            }}
                                            className="text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 transition font-bold"
                                        >
                                            Değişiklik Geçmişi
                                        </button>
                                    </div>

                                    {/* Add Year Form */}
                                    {showAddYear && (
                                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-3">
                                            <h4 className="text-sm font-bold text-emerald-700">Yeni Yıl Ekle</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Yıl</label>
                                                    <input
                                                        type="number"
                                                        value={newYear}
                                                        onChange={e => setNewYear(parseInt(e.target.value) || new Date().getFullYear())}
                                                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                                                        min="2000" max="2100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Hak (Gün)</label>
                                                    <input
                                                        type="number"
                                                        value={newYearDays}
                                                        onChange={e => setNewYearDays(parseFloat(e.target.value) || 0)}
                                                        className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                                                        step="0.5" min="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Gerekçe *</label>
                                                <input
                                                    type="text"
                                                    value={newYearReason}
                                                    onChange={e => setNewYearReason(e.target.value)}
                                                    placeholder="Ekleme gerekçesi"
                                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleAddYear}
                                                    disabled={editEntSaving || !newYearReason.trim()}
                                                    className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 font-bold"
                                                >
                                                    {editEntSaving ? 'Ekleniyor...' : 'Ekle'}
                                                </button>
                                                <button
                                                    onClick={() => setShowAddYear(false)}
                                                    className="text-xs bg-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-300 transition font-bold"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Adjustment History */}
                                    {showHistory && (
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                                Değişiklik Geçmişi
                                            </h4>
                                            {historyLoading ? (
                                                <p className="text-xs text-slate-400 italic">Yükleniyor...</p>
                                            ) : adjustmentHistory.length > 0 ? (
                                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                    {adjustmentHistory.map((log, i) => (
                                                        <div key={i} className="flex items-start justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-slate-700">
                                                                    {log.year} — {log.field_changed === 'days_entitled' ? 'Hak' : 'Kullanılan'}: {log.old_value} → {log.new_value}
                                                                </div>
                                                                <div className="text-slate-400 truncate" title={log.reason}>{log.reason}</div>
                                                            </div>
                                                            <div className="text-right shrink-0 ml-2">
                                                                <div className="text-slate-500 font-bold">{log.adjusted_by}</div>
                                                                <div className="text-slate-400">{new Date(log.created_at).toLocaleDateString('tr-TR')}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">Kayıt bulunamadı.</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Existing Leaves */}
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-emerald-500 rounded-full"></div> Bu G\u00fcne Ait \u0130zinler
                                        </h4>
                                        {leaves.length > 0 ? leaves.map((lr, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 rounded-lg p-3 mb-2">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-slate-700">{lr.type_name}</div>
                                                    <div className="text-xs text-slate-400">{lr.start_date} \u2192 {lr.end_date} ({lr.total_days} g\u00fcn) {lr.reason && `\u2022 ${lr.reason}`}</div>
                                                    {lr.approved_by && <div className="text-[10px] text-slate-400 mt-0.5">Onaylayan: {lr.approved_by}</div>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {statusBadge(lr.status)}
                                                    {lr.status !== 'CANCELLED' && (
                                                        <button onClick={() => handleCancelLeave(lr.id)}
                                                            className="text-xs text-red-500 hover:text-red-700 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                                            \u0130ptal
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )) : <p className="text-sm text-slate-400 italic">Bu tarihte izin kayd\u0131 yok.</p>}
                                    </div>

                                    {/* Create New Leave */}
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-blue-500 rounded-full"></div> Yeni \u0130zin Olu\u015ftur
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">\u0130zin T\u00fcr\u00fc</label>
                                                <select value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)}
                                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none">
                                                    {requestTypes.map(rt => (
                                                        <option key={rt.id} value={rt.id}>{rt.name} ({rt.category})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Sebep</label>
                                                <input type="text" value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                                                    placeholder="Opsiyonel" className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Ba\u015flang\u0131\u00e7</label>
                                                <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Biti\u015f</label>
                                                <input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                        </div>
                                        <button onClick={handleCreateLeave} disabled={saving}
                                            className="mt-3 w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200 text-sm">
                                            {saving ? 'Olu\u015fturuluyor...' : '\u2713 \u0130zin Olu\u015ftur ve Onayla'}
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-1">{'\u26a1'} Admin izni otomatik olarak onaylanacak ve bakiyeden d\u00fc\u015f\u00fclecektir.</p>
                                    </div>
                                </div>
                            )}

                            {/* ========== OVERTIME TAB ========== */}
                            {activeTab === 'overtime' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-amber-500 rounded-full"></div> Fazla Mesai Talepleri
                                        </h4>
                                        {otRequests.length > 0 ? otRequests.map((ot, i) => (
                                            <div key={i} className="bg-slate-50 rounded-lg p-4 mb-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-mono text-sm text-slate-700 font-bold">{ot.start_time} \u2192 {ot.end_time}</div>
                                                        <div className="text-xs text-slate-400 mt-1">
                                                            S\u00fcre: {fmtSec(ot.duration_seconds || 0)}
                                                            {ot.reason && ` \u2022 Sebep: ${ot.reason}`}
                                                        </div>
                                                        {ot.approval_manager && <div className="text-[10px] text-slate-400 mt-0.5">Y\u00f6netici: {ot.approval_manager}</div>}
                                                        {ot.rejection_reason && <div className="text-[10px] text-red-500 mt-0.5">Red sebebi: {ot.rejection_reason}</div>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {statusBadge(ot.status)}
                                                    </div>
                                                </div>
                                                {(ot.status === 'PENDING' || ot.status === 'POTENTIAL') && (
                                                    <div className="flex gap-2 mt-3 border-t pt-3">
                                                        <button onClick={() => handleOtAction(ot.id, 'approve')}
                                                            className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                                                            \u2713 Onayla
                                                        </button>
                                                        <button onClick={() => handleOtAction(ot.id, 'reject')}
                                                            className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-700 transition-colors">
                                                            \u2717 Reddet
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <p className="text-sm text-slate-400 italic py-4 text-center">Bu tarihte fazla mesai talebi bulunmuyor.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                        {activeTab === 'attendance' && deleteIds.length > 0 && (
                            <span className="text-red-500 font-bold">{deleteIds.length} kay\u0131t silinecek</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm">Kapat</button>
                        {activeTab === 'attendance' && (
                            <button onClick={handleSave} disabled={saving || loading}
                                className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-200 text-sm">
                                {saving ? 'Kaydediliyor...' : 'De\u011fi\u015fiklikleri Kaydet'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
