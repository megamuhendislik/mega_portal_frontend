import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import dayjs from 'dayjs';
import {
    Collapse, TimePicker, DatePicker, Select, InputNumber, Input, Button,
    Statistic, Tag, Popconfirm, Modal, message, Spin, Empty, Divider, Space, Card
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, SaveOutlined, ClockCircleOutlined,
    CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined,
    CalendarOutlined, EditOutlined, ThunderboltOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Panel } = Collapse;

/* ───── helpers ───── */
const fmtSec = (s) => {
    if (!s || s <= 0) return '-';
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    if (h === 0) return `${m} dk`;
    if (m === 0) return `${h} saat`;
    return `${h}s ${m}dk`;
};

const statusColor = {
    'APPROVED': 'green',
    'PENDING': 'gold',
    'REJECTED': 'red',
    'CANCELLED': 'default',
    'OPEN': 'blue',
    'CALCULATED': 'cyan',
    'ABSENT': 'red',
    'POTENTIAL': 'purple',
    'PENDING_MANAGER_APPROVAL': 'orange',
    'AUTO_APPROVED': 'lime',
};

const statusLabel = {
    'APPROVED': 'Onaylandı',
    'PENDING': 'Bekliyor',
    'REJECTED': 'Reddedildi',
    'CANCELLED': 'İptal',
    'OPEN': 'Açık',
    'CALCULATED': 'Hesaplandı',
    'ABSENT': 'Devamsız',
    'POTENTIAL': 'Potansiyel',
    'PENDING_MANAGER_APPROVAL': 'Yönetici Onayı',
    'AUTO_APPROVED': 'Oto-Onay',
};

const sourceOptions = [
    { value: 'MANUAL', label: 'MANUAL' },
    { value: 'CARD', label: 'CARD' },
    { value: 'FACE', label: 'FACE' },
    { value: 'QR', label: 'QR' },
];

/* ───── component ───── */
export default function DayEditPanel({ employee, date, onSaveSuccess }) {
    // Data states
    const [records, setRecords] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [otRequests, setOtRequests] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [dailyTarget, setDailyTarget] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteIds, setDeleteIds] = useState([]);

    // Smart Entry State
    const [workStart, setWorkStart] = useState(dayjs('08:00', 'HH:mm'));
    const [workDuration, setWorkDuration] = useState(9);
    const [otDuration, setOtDuration] = useState(2);

    // Override note
    const [overrideNote, setOverrideNote] = useState('');

    // Leave Create Form
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [leaveStart, setLeaveStart] = useState(null);
    const [leaveEnd, setLeaveEnd] = useState(null);
    const [leaveReason, setLeaveReason] = useState('');

    // Entitlement editing state
    const [editingEntitlement, setEditingEntitlement] = useState(null);
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

    // Reject reason modal
    const [rejectModal, setRejectModal] = useState({ open: false, otId: null, reason: '' });

    const dateStr = format(date, 'yyyy-MM-dd');

    /* ───── data loading ───── */
    const loadData = useCallback(() => {
        setLoading(true);
        setDeleteIds([]);
        setOverrideNote('');
        api.get('/system-data/daily_records/', {
            params: { employee_id: employee.id, date: dateStr }
        }).then(res => {
            setRecords(res.data.records || []);
            setLeaves(res.data.leaves || []);
            setOtRequests(res.data.overtime_requests || []);
            setLeaveBalance(res.data.leave_balance || []);
            setRequestTypes(res.data.request_types || []);
            setDailyTarget(res.data.daily_target_seconds || 0);
            if (res.data.request_types?.length > 0) {
                setLeaveTypeId(prev => prev || res.data.request_types[0].id);
            }
        }).catch(() => {
            message.error('Veri yüklenirken hata oluştu');
        }).finally(() => setLoading(false));
    }, [employee.id, dateStr]);

    useEffect(() => {
        loadData();
        setLeaveStart(dayjs(dateStr));
        setLeaveEnd(dayjs(dateStr));
        setLeaveReason('');
        setEditingEntitlement(null);
        setShowAddYear(false);
        setShowHistory(false);
    }, [employee.id, dateStr, loadData]);

    /* ───── attendance handlers ───── */
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/system-data/update_daily_records/', {
                employee_id: employee.id,
                date: dateStr,
                records: records,
                delete_ids: deleteIds,
                override_note: overrideNote,
            });
            message.success('Kaydedildi!');
            if (onSaveSuccess) onSaveSuccess();
            loadData();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    const addRecord = () => {
        setRecords([...records, {
            id: null,
            check_in: `${dateStr}T09:00`,
            check_out: `${dateStr}T18:00`,
            source: 'MANUAL',
            status: 'OPEN'
        }]);
    };

    const updateRec = (idx, field, val) => {
        const n = [...records];
        n[idx] = { ...n[idx], [field]: val };
        setRecords(n);
    };

    const removeRec = (idx) => {
        const rec = records[idx];
        if (rec.id) setDeleteIds(prev => [...prev, rec.id]);
        setRecords(records.filter((_, i) => i !== idx));
    };

    const applyDailyWork = () => {
        Modal.confirm({
            title: 'Günü Oluştur',
            content: 'Tüm mevcut kayıtlar silinip tek bir normal kayıt oluşturulacak. Devam etmek istiyor musunuz?',
            okText: 'Evet, Oluştur',
            cancelText: 'Vazgeç',
            onOk: () => {
                const idsToDelete = records.filter(r => r.id).map(r => r.id);
                setDeleteIds(prev => [...prev, ...idsToDelete]);
                const startStr = workStart ? workStart.format('HH:mm') : '08:00';
                const [sh, sm] = startStr.split(':').map(Number);
                const startDate = new Date(date);
                startDate.setHours(sh, sm, 0, 0);
                const endDate = new Date(startDate.getTime() + workDuration * 60 * 60 * 1000);
                setRecords([{
                    id: null,
                    check_in: `${dateStr}T${startStr}`,
                    check_out: format(endDate, "yyyy-MM-dd'T'HH:mm"),
                    source: 'MANUAL',
                    status: 'OPEN'
                }]);
                message.success('Günlük kayıt oluşturuldu. Kaydet butonuna basmayı unutmayın.');
            },
        });
    };

    const addOvertime = () => {
        let lastEnd = new Date(date);
        lastEnd.setHours(18, 0, 0, 0);
        if (records.length > 0) {
            const sorted = [...records].sort((a, b) => new Date(b.check_out) - new Date(a.check_out));
            if (sorted[0].check_out) lastEnd = new Date(sorted[0].check_out);
        }
        const end = new Date(lastEnd.getTime() + otDuration * 60 * 60 * 1000);
        setRecords([...records, {
            id: null,
            check_in: format(lastEnd, "yyyy-MM-dd'T'HH:mm"),
            check_out: format(end, "yyyy-MM-dd'T'HH:mm"),
            source: 'MANUAL',
            status: 'OPEN'
        }]);
        message.info(`+${otDuration} saat mesai kaydı eklendi.`);
    };

    const totalHours = () => {
        let t = 0;
        records.forEach(r => {
            if (r.check_in && r.check_out) {
                const d = new Date(r.check_out) - new Date(r.check_in);
                if (d > 0) t += d;
            }
        });
        return (t / (1000 * 60 * 60)).toFixed(1);
    };

    /* ───── leave handlers ───── */
    const handleCreateLeave = async () => {
        if (!leaveTypeId || !leaveStart || !leaveEnd) {
            message.warning('Lütfen tüm alanları doldurun');
            return;
        }
        setSaving(true);
        try {
            const res = await api.post('/system-data/admin_create_leave/', {
                employee_id: employee.id,
                request_type_id: leaveTypeId,
                start_date: leaveStart.format('YYYY-MM-DD'),
                end_date: leaveEnd.format('YYYY-MM-DD'),
                reason: leaveReason || 'Muhasebe tarafından oluşturuldu'
            });
            message.success(res.data.message || 'İzin oluşturuldu');
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    const handleCancelLeave = async (leaveId) => {
        try {
            const res = await api.post('/system-data/admin_cancel_leave/', { leave_id: leaveId });
            message.success(res.data.message || 'İzin iptal edildi');
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        }
    };

    /* ───── entitlement handlers ───── */
    const handleSaveEntitlement = async () => {
        if (!editingEntitlement || !editEntReason.trim()) {
            message.warning('Gerekçe zorunludur');
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
            message.success(res.data.message || 'Hak ediş güncellendi');
            setEditingEntitlement(null);
            setEditEntReason('');
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setEditEntSaving(false);
        }
    };

    const handleAddYear = async () => {
        if (!newYearReason.trim()) {
            message.warning('Gerekçe zorunludur');
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
            message.success(res.data.message || 'Yıl eklendi');
            setShowAddYear(false);
            setNewYearReason('');
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
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

    /* ───── overtime handlers ───── */
    const handleOtAction = async (otId, action, reason = '') => {
        try {
            const res = await api.post('/system-data/admin_manage_overtime/', {
                overtime_id: otId, action, reason
            });
            message.success(res.data.message || (action === 'approve' ? 'Onaylandı' : 'Reddedildi'));
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) {
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        }
    };

    const openRejectModal = (otId) => {
        setRejectModal({ open: true, otId, reason: '' });
    };

    const confirmReject = () => {
        if (!rejectModal.reason.trim()) {
            message.warning('Red sebebi zorunludur');
            return;
        }
        handleOtAction(rejectModal.otId, 'reject', rejectModal.reason);
        setRejectModal({ open: false, otId: null, reason: '' });
    };

    /* ───── time helpers for records ───── */
    const getTimeDayjs = (dtStr) => {
        if (!dtStr) return null;
        try {
            // Backend'den gelen saatler UTC olabilir — Date ile parse edip
            // yerel saat (İstanbul UTC+3) olarak dayjs'e çeviriyoruz
            const d = new Date(dtStr);
            if (isNaN(d.getTime())) return null;
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return dayjs(`${h}:${m}`, 'HH:mm');
        } catch { return null; }
    };

    const setRecordTime = (idx, field, timeValue) => {
        if (!timeValue) {
            updateRec(idx, field, null);
            return;
        }
        const hhmm = timeValue.format('HH:mm');
        updateRec(idx, field, `${dateStr}T${hhmm}`);
    };

    // Özet görüntüleme için de yerel saat formatı
    const formatLocalTime = (dtStr) => {
        if (!dtStr) return '?';
        try {
            const d = new Date(dtStr);
            if (isNaN(d.getTime())) return '?';
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } catch { return '?'; }
    };

    /* ───── computed ───── */
    const normalSeconds = records.reduce((s, r) => s + (r.normal_seconds || 0), 0);
    const overtimeSeconds = records.reduce((s, r) => s + (r.overtime_seconds || 0), 0);
    const missingSeconds = records.reduce((s, r) => s + (r.missing_seconds || 0), 0);

    /* ───── render ───── */
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Spin size="large" tip="Yükleniyor..." />
            </div>
        );
    }

    /* ====== Section 1: Özet ====== */
    const renderOverview = () => (
        <div className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 gap-3">
                <Card size="small" className="!border-blue-200">
                    <Statistic
                        title={<span className="text-xs text-slate-500">Hedef</span>}
                        value={fmtSec(dailyTarget)}
                        prefix={<ClockCircleOutlined className="text-blue-500" />}
                        valueStyle={{ fontSize: 16, color: '#2563eb' }}
                    />
                </Card>
                <Card size="small" className="!border-green-200">
                    <Statistic
                        title={<span className="text-xs text-slate-500">Normal</span>}
                        value={fmtSec(normalSeconds)}
                        prefix={<CheckCircleOutlined className="text-green-500" />}
                        valueStyle={{ fontSize: 16, color: '#16a34a' }}
                    />
                </Card>
                <Card size="small" className="!border-amber-200">
                    <Statistic
                        title={<span className="text-xs text-slate-500">Fazla Mesai</span>}
                        value={fmtSec(overtimeSeconds)}
                        prefix={<ClockCircleOutlined className="text-amber-500" />}
                        valueStyle={{ fontSize: 16, color: '#d97706' }}
                    />
                </Card>
                <Card size="small" className="!border-red-200">
                    <Statistic
                        title={<span className="text-xs text-slate-500">Eksik</span>}
                        value={fmtSec(missingSeconds)}
                        prefix={<CloseCircleOutlined className="text-red-500" />}
                        valueStyle={{ fontSize: 16, color: '#dc2626' }}
                    />
                </Card>
            </div>

            {/* Attendance Records Preview */}
            <div>
                <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <ClockCircleOutlined /> Giriş/Çıkış Kayıtları
                </div>
                {records.length > 0 ? (
                    <div className="space-y-1">
                        {records.map((rec, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                <span className="font-mono text-slate-600">
                                    {formatLocalTime(rec.check_in)} → {formatLocalTime(rec.check_out)}
                                </span>
                                <Space size={4}>
                                    <Tag className="!text-[10px] !m-0">{rec.source}</Tag>
                                    {rec.is_manual_override && (
                                        <Tag color="purple" className="!text-[10px] !m-0">Elle Düzenlendi</Tag>
                                    )}
                                    <Tag color={statusColor[rec.status] || 'default'} className="!text-[10px] !m-0">
                                        {statusLabel[rec.status] || rec.status}
                                    </Tag>
                                    {rec.normal_seconds > 0 && (
                                        <span className="text-[10px] text-green-600">{fmtSec(rec.normal_seconds)}</span>
                                    )}
                                </Space>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty description="Kayıt yok" image={Empty.PRESENTED_IMAGE_SIMPLE} className="!my-2" />
                )}
            </div>

            {/* Leaves on this day */}
            {leaves.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1.5">
                        <CalendarOutlined /> İzin Kayıtları
                    </div>
                    {leaves.map((lr, i) => (
                        <div key={i} className="flex justify-between items-center bg-emerald-50 rounded-lg p-2 mb-1 border border-emerald-100">
                            <div>
                                <span className="font-medium text-sm text-slate-700">{lr.type_name}</span>
                                <span className="text-xs text-slate-400 ml-2">{lr.start_date} → {lr.end_date} ({lr.total_days} gün)</span>
                            </div>
                            <Tag color={statusColor[lr.status] || 'default'}>{statusLabel[lr.status] || lr.status}</Tag>
                        </div>
                    ))}
                </div>
            )}

            {/* OT Requests */}
            {otRequests.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
                        <ClockCircleOutlined /> Fazla Mesai Talepleri
                    </div>
                    {otRequests.map((ot, i) => (
                        <div key={i} className="flex justify-between items-center bg-amber-50 rounded-lg p-2 mb-1 border border-amber-100">
                            <div>
                                <span className="font-mono text-sm text-slate-600">{ot.start_time} → {ot.end_time}</span>
                                {ot.reason && <span className="text-xs text-slate-400 ml-2">({ot.reason})</span>}
                            </div>
                            <Tag color={statusColor[ot.status] || 'default'}>{statusLabel[ot.status] || ot.status}</Tag>
                        </div>
                    ))}
                </div>
            )}

            {/* Leave Balance */}
            {leaveBalance.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                        <CalendarOutlined /> Yıllık İzin Bakiyesi
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {leaveBalance.map((bal, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">{bal.year}</div>
                                <div className="text-xl font-bold text-blue-600">{bal.remaining_days}</div>
                                <div className="text-[10px] text-slate-400">
                                    Kalan / {bal.total_days} toplam ({bal.used_days} kullanıldı)
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    /* ====== Section 2: Giriş/Çıkış ====== */
    const renderAttendance = () => (
        <div className="space-y-4">
            {/* ── Mevcut Kayıtlar ── */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">
                        Mevcut Kayıtlar ({records.length})
                    </span>
                    <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={addRecord}
                    >
                        Elle Giriş Ekle
                    </Button>
                </div>

                {records.length > 0 ? (
                    <div className="space-y-2">
                        {records.map((rec, i) => (
                            <div key={i} className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 transition-colors">
                                {/* Üst satır: Badge'ler + Sil butonu */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Tag color={statusColor[rec.status] || 'default'} className="!text-[10px] !m-0">
                                            {statusLabel[rec.status] || rec.status}
                                        </Tag>
                                        <Tag className="!text-[10px] !m-0">{rec.source}</Tag>
                                        {rec.is_manual_override && (
                                            <Tag color="purple" className="!text-[10px] !m-0">Elle Düzenlendi</Tag>
                                        )}
                                        {rec.id && (
                                            <span className="text-[10px] text-slate-300">#{rec.id}</span>
                                        )}
                                    </div>
                                    <Popconfirm
                                        title="Bu kaydı silmek istediğinize emin misiniz?"
                                        onConfirm={() => removeRec(i)}
                                        okText="Sil"
                                        cancelText="Vazgeç"
                                    >
                                        <Button
                                            danger
                                            type="text"
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            title="Kaydı Sil"
                                        />
                                    </Popconfirm>
                                </div>

                                {/* Giriş / Çıkış satırı */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Giriş Saati</label>
                                        <TimePicker
                                            value={getTimeDayjs(rec.check_in)}
                                            onChange={(val) => setRecordTime(i, 'check_in', val)}
                                            format="HH:mm"
                                            minuteStep={5}
                                            className="w-full"
                                            size="middle"
                                            placeholder="Saat seçin"
                                            needConfirm={false}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Çıkış Saati</label>
                                        <TimePicker
                                            value={getTimeDayjs(rec.check_out)}
                                            onChange={(val) => setRecordTime(i, 'check_out', val)}
                                            format="HH:mm"
                                            minuteStep={5}
                                            className="w-full"
                                            size="middle"
                                            placeholder="Saat seçin"
                                            needConfirm={false}
                                        />
                                    </div>
                                </div>

                                {/* Kaynak seçimi */}
                                <div className="mt-2">
                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Kaynak</label>
                                    <Select
                                        value={rec.source}
                                        onChange={(val) => updateRec(i, 'source', val)}
                                        options={sourceOptions}
                                        size="small"
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-lg p-6 text-center border border-dashed border-slate-200">
                        <ClockCircleOutlined className="text-3xl text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">Bu gün için kayıt bulunamadı</p>
                        <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={addRecord}
                            className="mt-3"
                        >
                            İlk Kaydı Ekle
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Toplam Saat ── */}
            {records.length > 0 && (
                <div className="flex justify-between items-center text-sm bg-slate-50 rounded-lg p-3 border">
                    <span className="text-slate-500 font-medium">Toplam Çalışma:</span>
                    <span className="font-bold text-slate-800 text-base">{totalHours()} saat</span>
                </div>
            )}

            {/* ── Override Notu ── */}
            <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Düzenleme Notu (Opsiyonel)
                </label>
                <TextArea
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                    placeholder="Düzenleme gerekçesini yazın..."
                    rows={2}
                    size="small"
                />
            </div>

            {/* ── Silinecek kayıt bilgisi ── */}
            {deleteIds.length > 0 && (
                <div className="text-xs text-red-500 font-semibold bg-red-50 p-2 rounded-lg border border-red-100">
                    {deleteIds.length} kayıt silinecek
                </div>
            )}

            {/* ── Kaydet Butonu ── */}
            <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                disabled={loading}
                block
                size="large"
                className="!bg-green-600 !border-green-600 hover:!bg-green-700"
            >
                Değişiklikleri Kaydet
            </Button>

            <Divider className="!my-3">
                <span className="text-[10px] text-slate-400">Hızlı İşlemler</span>
            </Divider>

            {/* ── Hızlı İşlemler (altta, collapsible) ── */}
            <Collapse
                ghost
                size="small"
                items={[{
                    key: 'quick',
                    label: <span className="text-xs text-blue-600 font-medium">Tüm Günü Tek Seferde Oluştur</span>,
                    children: (
                        <div className="space-y-3 bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                            <p className="text-[11px] text-slate-500">
                                Mevcut tüm kayıtları silip tek bir giriş/çıkış kaydı oluşturur.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Başlangıç Saati</label>
                                    <TimePicker
                                        value={workStart}
                                        onChange={setWorkStart}
                                        format="HH:mm"
                                        minuteStep={15}
                                        className="w-full"
                                        size="small"
                                        placeholder="08:00"
                                        needConfirm={false}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Çalışma Süresi (Saat)</label>
                                    <InputNumber
                                        value={workDuration}
                                        onChange={setWorkDuration}
                                        step={0.5}
                                        min={0.5}
                                        max={24}
                                        className="w-full"
                                        size="small"
                                    />
                                </div>
                            </div>
                            <Button
                                type="primary"
                                icon={<ThunderboltOutlined />}
                                onClick={applyDailyWork}
                                block
                                size="small"
                            >
                                Günü Oluştur
                            </Button>

                            <Divider className="!my-2" />

                            <div className="grid grid-cols-2 gap-2 items-end">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Mesai Süresi (Saat)</label>
                                    <InputNumber
                                        value={otDuration}
                                        onChange={setOtDuration}
                                        step={0.5}
                                        min={0.5}
                                        max={12}
                                        className="w-full"
                                        size="small"
                                    />
                                </div>
                                <Button
                                    onClick={addOvertime}
                                    size="small"
                                    className="!bg-amber-500 !text-white !border-amber-500 hover:!bg-amber-600"
                                >
                                    +Mesai Ekle
                                </Button>
                            </div>
                        </div>
                    ),
                }]}
            />
        </div>
    );

    /* ====== Section 3: İzin Yönetimi ====== */
    const renderLeave = () => (
        <div className="space-y-4">
            {/* Entitlement Table */}
            {leaveBalance.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">Hak Ediş Bakiyesi</div>
                    <div className="space-y-2">
                        {leaveBalance.map((bal, i) => (
                            <div key={i} className="bg-white rounded-lg border p-3">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-bold text-slate-600">{bal.year}</span>
                                    <Space size={4}>
                                        <Tag color="blue" className="!text-[10px] !m-0">{bal.remaining_days} kalan</Tag>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined />}
                                            className="!text-[10px]"
                                            onClick={() => {
                                                setEditingEntitlement({
                                                    year: bal.year,
                                                    days_entitled: bal.total_days,
                                                    days_used: bal.used_days,
                                                });
                                                setEditEntReason('');
                                            }}
                                        >
                                            Düzenle
                                        </Button>
                                    </Space>
                                </div>

                                {/* Inline Edit */}
                                {editingEntitlement?.year === bal.year ? (
                                    <div className="space-y-2 mt-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Hak (Gün)</label>
                                                <InputNumber
                                                    value={editingEntitlement.days_entitled}
                                                    onChange={(val) => setEditingEntitlement({ ...editingEntitlement, days_entitled: val || 0 })}
                                                    step={0.5}
                                                    min={0}
                                                    className="w-full"
                                                    size="small"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Kullanılan (Gün)</label>
                                                <InputNumber
                                                    value={editingEntitlement.days_used}
                                                    onChange={(val) => setEditingEntitlement({ ...editingEntitlement, days_used: val || 0 })}
                                                    step={0.5}
                                                    min={0}
                                                    className="w-full"
                                                    size="small"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Gerekçe *</label>
                                            <Input
                                                value={editEntReason}
                                                onChange={(e) => setEditEntReason(e.target.value)}
                                                placeholder="Düzeltme gerekçesi"
                                                size="small"
                                            />
                                        </div>
                                        <Space size={4}>
                                            <Button
                                                type="primary"
                                                size="small"
                                                onClick={handleSaveEntitlement}
                                                loading={editEntSaving}
                                                disabled={!editEntReason.trim()}
                                            >
                                                Kaydet
                                            </Button>
                                            <Button
                                                size="small"
                                                onClick={() => setEditingEntitlement(null)}
                                            >
                                                İptal
                                            </Button>
                                        </Space>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all"
                                                style={{ width: `${bal.total_days > 0 ? Math.min((bal.used_days / bal.total_days) * 100, 100) : 0}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            {bal.used_days} kullanıldı / {bal.total_days} toplam
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Year + History Buttons */}
            <Space size={8}>
                <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setShowAddYear(!showAddYear)}
                    className="!text-emerald-700 !border-emerald-300 !bg-emerald-50"
                >
                    Yıl Ekle
                </Button>
                <Button
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => {
                        setShowHistory(!showHistory);
                        if (!showHistory && adjustmentHistory.length === 0) {
                            fetchAdjustmentHistory();
                        }
                    }}
                >
                    Değişiklik Geçmişi
                </Button>
            </Space>

            {/* Add Year Form */}
            {showAddYear && (
                <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3 space-y-2.5">
                    <div className="text-xs font-semibold text-emerald-700">Yeni Yıl Ekle</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Yıl</label>
                            <InputNumber
                                value={newYear}
                                onChange={(val) => setNewYear(val || new Date().getFullYear())}
                                min={2000}
                                max={2100}
                                className="w-full"
                                size="small"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Hak (Gün)</label>
                            <InputNumber
                                value={newYearDays}
                                onChange={setNewYearDays}
                                step={0.5}
                                min={0}
                                className="w-full"
                                size="small"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Gerekçe *</label>
                        <Input
                            value={newYearReason}
                            onChange={(e) => setNewYearReason(e.target.value)}
                            placeholder="Ekleme gerekçesi"
                            size="small"
                        />
                    </div>
                    <Space size={4}>
                        <Button
                            type="primary"
                            size="small"
                            onClick={handleAddYear}
                            loading={editEntSaving}
                            disabled={!newYearReason.trim()}
                            className="!bg-emerald-600 !border-emerald-600"
                        >
                            Ekle
                        </Button>
                        <Button size="small" onClick={() => setShowAddYear(false)}>İptal</Button>
                    </Space>
                </div>
            )}

            {/* Adjustment History */}
            {showHistory && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                        <HistoryOutlined /> Değişiklik Geçmişi
                    </div>
                    {historyLoading ? (
                        <div className="text-center py-3"><Spin size="small" /></div>
                    ) : adjustmentHistory.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {adjustmentHistory.map((log, i) => (
                                <div key={i} className="flex items-start justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-700">
                                            {log.year} — {log.field_changed === 'days_entitled' ? 'Hak' : 'Kullanılan'}: {log.old_value} → {log.new_value}
                                        </div>
                                        <div className="text-slate-400 truncate" title={log.reason}>{log.reason}</div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <div className="text-slate-500 font-semibold">{log.adjusted_by}</div>
                                        <div className="text-slate-400">{new Date(log.created_at).toLocaleDateString('tr-TR')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty description="Kayıt bulunamadı" image={Empty.PRESENTED_IMAGE_SIMPLE} className="!my-1" />
                    )}
                </div>
            )}

            {/* Existing Leaves */}
            <div>
                <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <CalendarOutlined /> Bu Güne Ait İzinler
                </div>
                {leaves.length > 0 ? leaves.map((lr, i) => (
                    <div key={i} className="flex justify-between items-center bg-white rounded-lg p-2.5 mb-1.5 border">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-700">{lr.type_name}</div>
                            <div className="text-xs text-slate-400">
                                {lr.start_date} → {lr.end_date} ({lr.total_days} gün)
                                {lr.reason && ` - ${lr.reason}`}
                            </div>
                            {lr.approved_by && (
                                <div className="text-[10px] text-slate-400 mt-0.5">Onaylayan: {lr.approved_by}</div>
                            )}
                        </div>
                        <Space size={4}>
                            <Tag color={statusColor[lr.status] || 'default'} className="!m-0">
                                {statusLabel[lr.status] || lr.status}
                            </Tag>
                            {lr.status !== 'CANCELLED' && (
                                <Popconfirm
                                    title="Bu izni iptal etmek istediğinize emin misiniz?"
                                    onConfirm={() => handleCancelLeave(lr.id)}
                                    okText="İptal Et"
                                    cancelText="Vazgeç"
                                >
                                    <Button danger type="text" size="small" className="!text-xs">
                                        İptal
                                    </Button>
                                </Popconfirm>
                            )}
                        </Space>
                    </div>
                )) : (
                    <Empty description="Bu tarihte izin kaydı yok" image={Empty.PRESENTED_IMAGE_SIMPLE} className="!my-2" />
                )}
            </div>

            {/* Create New Leave */}
            <div className="bg-white rounded-lg border p-3">
                <div className="text-xs font-semibold text-slate-600 mb-2.5 flex items-center gap-1.5">
                    <PlusOutlined /> Yeni İzin Oluştur
                </div>
                <div className="space-y-2.5">
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">İzin Türü</label>
                        <Select
                            value={leaveTypeId || undefined}
                            onChange={setLeaveTypeId}
                            className="w-full"
                            size="small"
                            placeholder="Seçiniz"
                            options={requestTypes.map(rt => ({
                                value: rt.id,
                                label: `${rt.name} (${rt.category})`
                            }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Başlangıç</label>
                            <DatePicker
                                value={leaveStart}
                                onChange={setLeaveStart}
                                className="w-full"
                                size="small"
                                format="YYYY-MM-DD"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Bitiş</label>
                            <DatePicker
                                value={leaveEnd}
                                onChange={setLeaveEnd}
                                className="w-full"
                                size="small"
                                format="YYYY-MM-DD"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Sebep</label>
                        <TextArea
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            placeholder="Opsiyonel"
                            rows={2}
                            size="small"
                        />
                    </div>
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleCreateLeave}
                        loading={saving}
                        block
                        size="small"
                        className="!bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700"
                    >
                        İzin Oluştur ve Onayla
                    </Button>
                    <div className="text-[10px] text-slate-400">
                        Admin izni otomatik olarak onaylanacak ve bakiyeden düşülecektir.
                    </div>
                </div>
            </div>
        </div>
    );

    /* ====== Section 4: Fazla Mesai ====== */
    const renderOvertime = () => (
        <div className="space-y-3">
            {otRequests.length > 0 ? otRequests.map((ot, i) => (
                <div key={i} className="bg-white rounded-lg border p-3">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm text-slate-700 font-bold">
                                {ot.start_time} → {ot.end_time}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                Süre: {fmtSec(ot.duration_seconds || 0)}
                                {ot.reason && ` - Sebep: ${ot.reason}`}
                            </div>
                            {ot.approval_manager && (
                                <div className="text-[10px] text-slate-400 mt-0.5">Yönetici: {ot.approval_manager}</div>
                            )}
                            {ot.rejection_reason && (
                                <div className="text-[10px] text-red-500 mt-0.5">Red sebebi: {ot.rejection_reason}</div>
                            )}
                        </div>
                        <Tag color={statusColor[ot.status] || 'default'}>
                            {statusLabel[ot.status] || ot.status}
                        </Tag>
                    </div>
                    {(ot.status === 'PENDING' || ot.status === 'POTENTIAL') && (
                        <div className="flex gap-2 mt-3 pt-2.5 border-t">
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleOtAction(ot.id, 'approve')}
                                className="flex-1 !bg-emerald-600 !border-emerald-600"
                            >
                                Onayla
                            </Button>
                            <Button
                                danger
                                size="small"
                                icon={<CloseCircleOutlined />}
                                onClick={() => openRejectModal(ot.id)}
                                className="flex-1"
                            >
                                Reddet
                            </Button>
                        </div>
                    )}
                </div>
            )) : (
                <Empty
                    description="Bu tarihte fazla mesai talebi bulunmuyor"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    className="!my-4"
                />
            )}
        </div>
    );

    /* ────── Collapse items ────── */
    const collapseItems = [
        {
            key: 'overview',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <ClockCircleOutlined className="text-blue-500" />
                    Özet
                </span>
            ),
            children: renderOverview(),
        },
        {
            key: 'attendance',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <EditOutlined className="text-slate-500" />
                    Giriş/Çıkış
                    {records.length > 0 && (
                        <Tag className="!text-[10px] !m-0 !ml-1" color="blue">{records.length}</Tag>
                    )}
                </span>
            ),
            children: renderAttendance(),
        },
        {
            key: 'leave',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <CalendarOutlined className="text-emerald-500" />
                    İzin
                    {leaves.length > 0 && (
                        <Tag className="!text-[10px] !m-0 !ml-1" color="green">{leaves.length}</Tag>
                    )}
                </span>
            ),
            children: renderLeave(),
        },
        {
            key: 'overtime',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <ClockCircleOutlined className="text-amber-500" />
                    Fazla Mesai
                    {otRequests.length > 0 && (
                        <Tag className="!text-[10px] !m-0 !ml-1" color="orange">{otRequests.length}</Tag>
                    )}
                </span>
            ),
            children: renderOvertime(),
        },
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="p-3 border-b bg-gradient-to-r from-slate-50 to-blue-50/30">
                <h3 className="text-base font-bold text-slate-800">
                    {format(date, 'd MMMM yyyy, EEEE', { locale: tr })}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex gap-3 flex-wrap">
                    <span>Toplam: <b className="text-slate-800">{totalHours()} saat</b></span>
                    {dailyTarget > 0 && <span>Hedef: <b className="text-blue-600">{fmtSec(dailyTarget)}</b></span>}
                    {leaves.length > 0 && <span className="text-emerald-600 font-bold">İzinli</span>}
                    {otRequests.length > 0 && <span className="text-amber-600 font-bold">{otRequests.length} FM</span>}
                </div>
            </div>

            {/* Collapse Accordion */}
            <div className="flex-1 overflow-y-auto p-2">
                <Collapse
                    defaultActiveKey={['overview']}
                    accordion={false}
                    size="small"
                    items={collapseItems}
                    className="!bg-transparent [&_.ant-collapse-content-box]:!p-3"
                />
            </div>

            {/* Reject Reason Modal */}
            <Modal
                title="Red Sebebi"
                open={rejectModal.open}
                onOk={confirmReject}
                onCancel={() => setRejectModal({ open: false, otId: null, reason: '' })}
                okText="Reddet"
                cancelText="Vazgeç"
                okButtonProps={{ danger: true }}
            >
                <div className="py-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        Lütfen red sebebini belirtin:
                    </label>
                    <TextArea
                        value={rejectModal.reason}
                        onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Red sebebi..."
                        rows={3}
                        autoFocus
                    />
                </div>
            </Modal>
        </div>
    );
}
