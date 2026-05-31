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
    CalendarOutlined, EditOutlined, ThunderboltOutlined,
    MedicineBoxOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { getIstanbulYear } from '../../../utils/dateUtils';

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
    { value: 'ADMIN_ENTRY', label: 'ADMIN_ENTRY' },
];

/* ───── component ───── */
export default function DayEditPanel({ employee, date, onSaveSuccess, onStageOp }) {
    // Data states
    const [records, setRecords] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [otRequests, setOtRequests] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [dailyTarget, setDailyTarget] = useState(0);
    const [scheduleInfo, setScheduleInfo] = useState(null);
    const [loading, setLoading] = useState(true);
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
    const [deductFromBalance, setDeductFromBalance] = useState(true);
    const [noDeductReason, setNoDeductReason] = useState('');

    // Entitlement editing state
    const [editingEntitlement, setEditingEntitlement] = useState(null);
    const [editEntReason, setEditEntReason] = useState('');

    // New year addition
    const [showAddYear, setShowAddYear] = useState(false);
    const [newYear, setNewYear] = useState(() => {
        const parts = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }).split('-');
        return Number(parts[0]);
    });
    const [newYearDays, setNewYearDays] = useState(14);
    const [newYearReason, setNewYearReason] = useState('');

    // Adjustment history
    const [adjustmentHistory, setAdjustmentHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Reject reason modal
    const [rejectModal, setRejectModal] = useState({ open: false, otId: null, reason: '' });

    // New request type data
    const [cardlessRequests, setCardlessRequests] = useState([]);
    const [mealRequests, setMealRequests] = useState([]);
    const [externalDutyRequests, setExternalDutyRequests] = useState([]);


    // OT creation form
    const [newOtStart, setNewOtStart] = useState(null);
    const [newOtEnd, setNewOtEnd] = useState(null);
    const [newOtStatus, setNewOtStatus] = useState('APPROVED');
    const [newOtReason, setNewOtReason] = useState('');

    // Cardless creation form
    const [newCardlessIn, setNewCardlessIn] = useState(null);
    const [newCardlessOut, setNewCardlessOut] = useState(null);
    const [newCardlessStatus, setNewCardlessStatus] = useState('APPROVED');
    const [newCardlessReason, setNewCardlessReason] = useState('');

    // Meal creation form
    const [newMealStatus, setNewMealStatus] = useState('PENDING');
    const [newMealDesc, setNewMealDesc] = useState('');

    // External duty creation form
    const [newDutyStart, setNewDutyStart] = useState(null);
    const [newDutyEnd, setNewDutyEnd] = useState(null);
    const [newDutyCity, setNewDutyCity] = useState('');
    const [newDutyDesc, setNewDutyDesc] = useState('');
    const [newDutyStatus, setNewDutyStatus] = useState('APPROVED');

    // Health report creation form
    const [newHealthType, setNewHealthType] = useState('HEALTH_REPORT');
    const [newHealthStart, setNewHealthStart] = useState(null);
    const [newHealthEnd, setNewHealthEnd] = useState(null);
    const [newHealthTimeStart, setNewHealthTimeStart] = useState(null);
    const [newHealthTimeEnd, setNewHealthTimeEnd] = useState(null);

    // Special leave creation form
    const [newSpecialType, setNewSpecialType] = useState('PATERNITY');
    const [newSpecialStart, setNewSpecialStart] = useState(null);
    const [newSpecialEnd, setNewSpecialEnd] = useState(null);
    const [newSpecialReason, setNewSpecialReason] = useState('');

    const dateStr = format(date, 'yyyy-MM-dd');

    /* Sağlık raporu / Özel izin tür etiketleri (backend choices ile birebir) */
    const HEALTH_TYPE_OPTIONS = [
        { value: 'HEALTH_REPORT', label: 'Tam Gün Rapor' },
        { value: 'HOSPITAL_VISIT', label: 'Hastane Ziyareti' },
    ];
    const SPECIAL_TYPE_OPTIONS = [
        { value: 'PATERNITY', label: 'Babalık İzni' },
        { value: 'BEREAVEMENT', label: 'Ölüm İzni' },
        { value: 'MARRIAGE', label: 'Evlilik İzni' },
        { value: 'UNPAID', label: 'Ücretsiz İzin' },
    ];

    /* ───── staged-op helper ─────
     * Bir op'u kuyruğa ekler (anında API çağrısı YOK). _label kısa,
     * insan-okur açıklama; alt aksiyon barında gösterilir. */
    const stage = (op, label) => {
        if (!onStageOp) {
            message.error('Değişiklik kuyruğu kullanılamıyor');
            return false;
        }
        onStageOp({ ...op, _label: label });
        message.success('Değişiklik kuyruğa eklendi');
        return true;
    };

    // HH:mm parçası — İstanbul saatine sabitli.
    // KRİTİK (tz bug): tarayıcı-yerel getHours() İstanbul DIŞI makinelerde backend'in
    // tz-aware ISO saatini kaydırıyordu. İki vaka var:
    //  - naive string ("YYYY-MM-DDTHH:mm", tz YOK): setRecordTime'ın yazdığı, kullanıcının
    //    girdiği İstanbul duvar-saati → literal HH:mm al (çevirme yok).
    //  - tz-aware ISO (backend "...+00:00"/"Z"): İstanbul'a çevirip HH:mm çıkar.
    const _istHHmm = (dtStr) => {
        if (!dtStr) return null;
        const s = String(dtStr);
        const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
        if (!hasTz) {
            const m = s.match(/T(\d{2}):(\d{2})/) || s.match(/^(\d{2}):(\d{2})/);
            if (m) return `${m[1]}:${m[2]}`;
        }
        const d = new Date(s);
        if (isNaN(d.getTime())) return null;
        try {
            const parts = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Istanbul',
            }).formatToParts(d);
            const hh = (parts.find(p => p.type === 'hour') || {}).value || '00';
            const mm = (parts.find(p => p.type === 'minute') || {}).value || '00';
            return `${hh}:${mm}`;
        } catch {
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
    };

    const toHHmm = (dtStr) => _istHHmm(dtStr);

    // Balance-tracked leave type detection
    const BALANCE_TRACKED_CODES = ['ANNUAL_LEAVE', 'EXCUSE_LEAVE', 'BIRTHDAY_LEAVE'];
    const selectedLeaveType = requestTypes?.find(t => String(t.id) === String(leaveTypeId));
    const isBalanceTracked = selectedLeaveType && BALANCE_TRACKED_CODES.includes(selectedLeaveType.code);

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
            setScheduleInfo(res.data.schedule_info || null);
            setCardlessRequests(res.data.cardless_requests || []);
            setMealRequests(res.data.meal_requests || []);
            setExternalDutyRequests(res.data.external_duty_requests || []);
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
        setDeductFromBalance(true);
        setNoDeductReason('');
        setEditingEntitlement(null);
        setShowAddYear(false);
        setShowHistory(false);
        setNewHealthStart(dayjs(dateStr));
        setNewHealthEnd(dayjs(dateStr));
        setNewHealthTimeStart(null);
        setNewHealthTimeEnd(null);
        setNewHealthType('HEALTH_REPORT');
        setNewSpecialStart(dayjs(dateStr));
        setNewSpecialEnd(dayjs(dateStr));
        setNewSpecialReason('');
        setNewSpecialType('PATERNITY');
    }, [employee.id, dateStr, loadData]);

    /* ───── attendance handlers ─────
     * Staged model: her giriş/çıkış kaydı bir ATTENDANCE op'una dönüşür.
     * Yeni kayıt → CREATE, mevcut kayıt → UPDATE, silinen id'ler → DELETE. */
    const handleSave = () => {
        if (records.length === 0 && deleteIds.length === 0) {
            message.warning('Kuyruğa eklenecek değişiklik yok');
            return;
        }
        let staged = 0;
        // Silinecekler (mevcut kayıtlar)
        deleteIds.forEach((id) => {
            stage(
                { record_type: 'ATTENDANCE', op_type: 'DELETE', target_pk: id, payload: { date: dateStr } },
                `− Kayıt sil #${id} ${dateStr}`
            );
            staged++;
        });
        // Mevcut/yeni kayıtlar
        records.forEach((r) => {
            const checkIn = toHHmm(r.check_in);
            const checkOut = toHHmm(r.check_out);
            const payload = {
                date: dateStr,
                check_in: checkIn,
                check_out: checkOut,
                source: r.source || 'ADMIN_ENTRY',
                status: r.status || 'CALCULATED',
            };
            if (overrideNote) payload.note = overrideNote;
            const opType = r.id ? 'UPDATE' : 'CREATE';
            const sign = r.id ? '~' : '+';
            stage(
                { record_type: 'ATTENDANCE', op_type: opType, target_pk: r.id || null, payload },
                `${sign} Kart ${dateStr} ${checkIn || '?'}→${checkOut || '?'}`
            );
            staged++;
        });
        // İşlendi olarak işaretle (UI temizliği)
        setDeleteIds([]);
        setOverrideNote('');
        // ÇİFT CREATE FIX: id'siz (yeni) kayıtlar kuyruğa eklendi → grid'den kaldır,
        // aksi halde tekrar 'Kuyruğa Ekle'de aynı kayıt 2. kez CREATE olarak eklenip
        // backend'de aynı gün için MÜKERRER Attendance satırı (çift sayım) yaratıyordu.
        // (Mevcut kayıtların tekrar UPDATE'i idempotent — yalnızca id=null sorun.)
        setRecords((prev) => prev.filter((r) => r.id));
        if (staged > 0 && onSaveSuccess) {
            // Sadece kuyruğa eklendi — kalıcı kayıt değil; reload Kaydet'te olur.
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
    const handleCreateLeave = () => {
        if (!leaveTypeId || !leaveStart || !leaveEnd) {
            message.warning('Lütfen tüm alanları doldurun');
            return;
        }
        // FIX (2026-04-27): dayjs object truthy ama isValid() false olabilir
        // (örn. parse hatasıyla yaratılmış). Bu durumda format() "Invalid Date"
        // string döner ve backend reddeder.
        if (!leaveStart.isValid() || !leaveEnd.isValid()) {
            message.warning('Tarih geçersiz, lütfen tekrar seçin');
            return;
        }
        if (isBalanceTracked && !deductFromBalance && !noDeductReason.trim()) {
            message.warning('Bakiyeden düşürülmeme nedenini yazınız');
            return;
        }
        const reasonParts = [leaveReason || 'Muhasebe tarafından oluşturuldu'];
        if (isBalanceTracked && !deductFromBalance && noDeductReason.trim()) {
            reasonParts.push(`[Bakiyeden düşürülmedi: ${noDeductReason.trim()}]`);
        }
        const startStr = leaveStart.format('YYYY-MM-DD');
        const endStr = leaveEnd.format('YYYY-MM-DD');
        const typeName = selectedLeaveType?.name || 'İzin';
        const ok = stage(
            {
                record_type: 'LEAVE',
                op_type: 'CREATE',
                target_pk: null,
                payload: {
                    request_type_id: leaveTypeId,
                    start_date: startStr,
                    end_date: endStr,
                    reason: reasonParts.join(' '),
                    deduct_from_balance: deductFromBalance,
                },
            },
            `+ İzin ${typeName} ${startStr}→${endStr}`
        );
        if (ok) {
            setDeductFromBalance(true);
            setNoDeductReason('');
        }
    };

    /* Mevcut izni staged LEAVE DELETE op'a çevirir (anında iptal API'si YOK).
     * Backend target_pk ile siler; payload start_date/end_date recalc penceresi
     * için kullanılır (izin tüm aralığında günler yeniden hesaplanır). */
    const handleCancelLeave = (leave) => {
        const startStr = leave.start_date || dateStr;
        const endStr = leave.end_date || leave.start_date || dateStr;
        stage(
            {
                record_type: 'LEAVE', op_type: 'DELETE', target_pk: leave.id,
                payload: { start_date: startStr, end_date: endStr },
            },
            `− İzin ${startStr}..${endStr} sil`
        );
    };

    /* ───── entitlement handlers (staged) ───── */
    const handleSaveEntitlement = () => {
        if (!editingEntitlement || !editEntReason.trim()) {
            message.warning('Gerekçe zorunludur');
            return;
        }
        const payload = {
            year: editingEntitlement.year,
            reason: editEntReason,
        };
        if (editingEntitlement.days_entitled !== undefined) {
            payload.days_entitled = editingEntitlement.days_entitled;
        }
        if (editingEntitlement.days_used !== undefined) {
            payload.days_used = editingEntitlement.days_used;
        }
        const ok = stage(
            { record_type: 'ENTITLEMENT', op_type: 'UPDATE', target_pk: null, payload },
            `~ Hak Ediş ${editingEntitlement.year} (${editingEntitlement.days_entitled ?? '?'} gün)`
        );
        if (ok) {
            setEditingEntitlement(null);
            setEditEntReason('');
        }
    };

    const handleAddYear = () => {
        if (!newYearReason.trim()) {
            message.warning('Gerekçe zorunludur');
            return;
        }
        const ok = stage(
            {
                record_type: 'ENTITLEMENT', op_type: 'CREATE', target_pk: null,
                payload: {
                    year: newYear,
                    days_entitled: newYearDays,
                    days_used: 0,
                    reason: newYearReason || 'Yeni yıl eklendi',
                },
            },
            `+ Yıl ${newYear} (${newYearDays} gün)`
        );
        if (ok) {
            setShowAddYear(false);
            setNewYearReason('');
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

    /* ───── admin override handlers (staged) ───── */
    const handleCreateOt = () => {
        if (!newOtStart || !newOtEnd) { message.warning('Başlangıç ve bitiş saati gerekli'); return; }
        const startT = newOtStart.format('HH:mm');
        const endT = newOtEnd.format('HH:mm');
        const ok = stage(
            {
                record_type: 'OT', op_type: 'CREATE', target_pk: null,
                payload: { date: dateStr, start_time: startT, end_time: endT, status: newOtStatus, reason: newOtReason || '' },
            },
            `+ FM ${dateStr} ${startT}→${endT}`
        );
        if (ok) { setNewOtStart(null); setNewOtEnd(null); setNewOtReason(''); }
    };

    const handleCreateCardless = () => {
        if (!newCardlessIn || !newCardlessOut) { message.warning('Giriş ve çıkış saati gerekli'); return; }
        const inT = newCardlessIn.format('HH:mm');
        const outT = newCardlessOut.format('HH:mm');
        const ok = stage(
            {
                record_type: 'CARDLESS', op_type: 'CREATE', target_pk: null,
                payload: { date: dateStr, check_in: inT, check_out: outT, status: newCardlessStatus, reason: newCardlessReason || '' },
            },
            `+ Kartsız ${dateStr} ${inT}→${outT}`
        );
        if (ok) { setNewCardlessIn(null); setNewCardlessOut(null); setNewCardlessReason(''); }
    };

    const handleCreateMeal = () => {
        const ok = stage(
            {
                record_type: 'MEAL', op_type: 'CREATE', target_pk: null,
                payload: { date: dateStr, status: newMealStatus, description: newMealDesc || '' },
            },
            `+ Yemek ${dateStr} (${newMealStatus})`
        );
        if (ok) { setNewMealDesc(''); }
    };

    const handleCreateDuty = () => {
        if (!newDutyStart || !newDutyEnd) { message.warning('Başlangıç ve bitiş tarihi gerekli'); return; }
        // FIX (2026-04-27): isValid kontrolü — invalid dayjs format() "Invalid Date" döner
        if (!newDutyStart.isValid() || !newDutyEnd.isValid()) {
            message.warning('Tarih geçersiz, lütfen tekrar seçin');
            return;
        }
        const startStr = newDutyStart.format('YYYY-MM-DD');
        const endStr = newDutyEnd.format('YYYY-MM-DD');
        // Dış görev = LEAVE op + EXTERNAL_DUTY request type id. request_types
        // içinden EXTERNAL_DUTY kodlu türü bulup id'sini kullanırız.
        const dutyType = requestTypes?.find(t => t.code === 'EXTERNAL_DUTY');
        if (!dutyType) {
            message.error('Dış görev izin türü bulunamadı (EXTERNAL_DUTY)');
            return;
        }
        const reasonParts = [];
        if (newDutyCity) reasonParts.push(newDutyCity);
        if (newDutyDesc) reasonParts.push(newDutyDesc);
        const ok = stage(
            {
                record_type: 'LEAVE', op_type: 'CREATE', target_pk: null,
                payload: {
                    request_type_id: dutyType.id,
                    start_date: startStr,
                    end_date: endStr,
                    reason: reasonParts.join(' - ') || 'Dış görev',
                },
            },
            `+ Dış Görev ${startStr}→${endStr}${newDutyCity ? ` (${newDutyCity})` : ''}`
        );
        if (ok) { setNewDutyStart(null); setNewDutyEnd(null); setNewDutyCity(''); setNewDutyDesc(''); }
    };

    /* ───── health report (staged HEALTH CREATE) ─────
     * HEALTH_REPORT: tam gün rapor (is_full_day=true, saat yok).
     * HOSPITAL_VISIT: saatli hastane ziyareti (is_full_day=false, start/end_time zorunlu).
     * Backend save() HOSPITAL_VISIT'i tek güne sabitler ama yine de start_date'i gönderiyoruz. */
    const handleCreateHealth = () => {
        if (!newHealthStart || !newHealthEnd) {
            message.warning('Başlangıç ve bitiş tarihi gerekli');
            return;
        }
        if (!newHealthStart.isValid() || !newHealthEnd.isValid()) {
            message.warning('Tarih geçersiz, lütfen tekrar seçin');
            return;
        }
        const isHospital = newHealthType === 'HOSPITAL_VISIT';
        if (isHospital && (!newHealthTimeStart || !newHealthTimeEnd)) {
            message.warning('Hastane ziyareti için başlangıç ve bitiş saati gerekli');
            return;
        }
        const startStr = newHealthStart.format('YYYY-MM-DD');
        // HOSPITAL_VISIT tek gün — bitiş = başlangıç
        const endStr = isHospital ? startStr : newHealthEnd.format('YYYY-MM-DD');
        const payload = {
            report_type: newHealthType,
            start_date: startStr,
            end_date: endStr,
            is_full_day: !isHospital,
        };
        if (isHospital) {
            payload.start_time = newHealthTimeStart.format('HH:mm');
            payload.end_time = newHealthTimeEnd.format('HH:mm');
        }
        const typeLabel = isHospital ? 'Hastane' : 'Rapor';
        const ok = stage(
            { record_type: 'HEALTH', op_type: 'CREATE', target_pk: null, payload },
            `+ Sağlık ${typeLabel} ${startStr}..${endStr}`
        );
        if (ok) {
            setNewHealthTimeStart(null);
            setNewHealthTimeEnd(null);
        }
    };

    /* ───── special leave (staged SPECIAL CREATE) ─────
     * PATERNITY (5g) / BEREAVEMENT (3g) / MARRIAGE (3g): sabit süre — backend
     * end_date'i otomatik hesaplar (start_date yeterli). UNPAID: custom aralık. */
    const handleCreateSpecial = () => {
        if (!newSpecialStart || !newSpecialEnd) {
            message.warning('Başlangıç ve bitiş tarihi gerekli');
            return;
        }
        if (!newSpecialStart.isValid() || !newSpecialEnd.isValid()) {
            message.warning('Tarih geçersiz, lütfen tekrar seçin');
            return;
        }
        const startStr = newSpecialStart.format('YYYY-MM-DD');
        const endStr = newSpecialEnd.format('YYYY-MM-DD');
        const payload = {
            leave_type: newSpecialType,
            start_date: startStr,
            end_date: endStr,
        };
        const reason = newSpecialReason.trim();
        if (reason) payload.reason = reason;
        const typeLabel = SPECIAL_TYPE_OPTIONS.find(o => o.value === newSpecialType)?.label || newSpecialType;
        const ok = stage(
            { record_type: 'SPECIAL', op_type: 'CREATE', target_pk: null, payload },
            `+ Özel İzin ${typeLabel} ${startStr}..${endStr}`
        );
        if (ok) {
            setNewSpecialReason('');
        }
    };

    const handleUpdateRequestStatus = async (requestType, requestId, newStatus) => {
        try {
            await api.post('/system-data/admin_update_request_status/', {
                request_type: requestType, request_id: requestId,
                new_status: newStatus, override_note: overrideNote,
            });
            message.success('Statü güncellendi');
            loadData();
        } catch (err) { message.error(err.response?.data?.error || 'Hata'); }
    };

    /* Mevcut talepleri (OT / Kartsız / Yemek / Dış görev) staged DELETE op'a
     * çevirir. Anında API çağrısı YOK — Kaydet'te (preview→apply) atomik işlenir
     * ve geri alınabilir. DELETE op'unda backend target_pk ile siler; payload
     * tarihleri sadece hangi günleri recalc edeceğini belirlemek için kullanılır.
     *
     * Panel request type → backend record_type eşlemesi:
     *   'overtime' → 'OT'        (tek gün; date row'da yok → seçili gün dateStr)
     *   'cardless' → 'CARDLESS'  (tek gün; date row'da yok → seçili gün dateStr)
     *   'meal'     → 'MEAL'      (recalc yok; date row'da yok → seçili gün dateStr)
     *   'leave'    → 'LEAVE'     (dış görev dahil; start_date/end_date row'da var) */
    const handleDeleteRequest = (requestType, requestId, row = {}) => {
        let op;
        let label;
        switch (requestType) {
            case 'overtime':
                op = {
                    record_type: 'OT', op_type: 'DELETE', target_pk: requestId,
                    payload: { date: row.date || dateStr },
                };
                label = `− Mesai ${row.date || dateStr} sil`;
                break;
            case 'cardless':
                op = {
                    record_type: 'CARDLESS', op_type: 'DELETE', target_pk: requestId,
                    payload: { date: row.date || dateStr },
                };
                label = `− Kartsız ${row.date || dateStr} sil`;
                break;
            case 'meal':
                op = {
                    record_type: 'MEAL', op_type: 'DELETE', target_pk: requestId,
                    payload: { date: row.date || dateStr },
                };
                label = `− Yemek ${row.date || dateStr} sil`;
                break;
            case 'leave': {
                // Dış görev de bir LeaveRequest — start_date/end_date row'da gelir;
                // yoksa seçili güne düş.
                const startStr = row.start_date || dateStr;
                const endStr = row.end_date || row.start_date || dateStr;
                op = {
                    record_type: 'LEAVE', op_type: 'DELETE', target_pk: requestId,
                    payload: { start_date: startStr, end_date: endStr },
                };
                label = `− İzin ${startStr}..${endStr} sil`;
                break;
            }
            default:
                message.error('Bilinmeyen talep tipi: ' + requestType);
                return;
        }
        stage(op, label);
    };

    /* ───── time helpers for records ───── */
    const getTimeDayjs = (dtStr) => {
        // İstanbul saatine sabitli HH:mm (tz bug fix — _istHHmm vakaları doğru ayırır).
        const hhmm = _istHHmm(dtStr);
        return hhmm ? dayjs(hhmm, 'HH:mm') : null;
    };

    const setRecordTime = (idx, field, timeValue) => {
        if (!timeValue) {
            updateRec(idx, field, null);
            return;
        }
        const hhmm = timeValue.format('HH:mm');
        updateRec(idx, field, `${dateStr}T${hhmm}`);
    };

    // Özet görüntüleme için de İstanbul saatine sabitli format
    const formatLocalTime = (dtStr) => _istHHmm(dtStr) || '?';

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
            {/* Schedule Info Banner */}
            {scheduleInfo && !scheduleInfo.is_off_day && scheduleInfo.shift_start && (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                    <ClockCircleOutlined />
                    <span className="font-medium">Vardiya:</span>
                    <span>{scheduleInfo.shift_start} - {scheduleInfo.shift_end}</span>
                    {scheduleInfo.lunch_start && (
                        <>
                            <span className="text-blue-300">|</span>
                            <span className="font-medium">Öğle:</span>
                            <span>{scheduleInfo.lunch_start} - {scheduleInfo.lunch_end}</span>
                        </>
                    )}
                    {scheduleInfo.daily_break_allowance > 0 && (
                        <>
                            <span className="text-blue-300">|</span>
                            <span className="font-medium">Mola:</span>
                            <span>{scheduleInfo.daily_break_allowance} dk</span>
                        </>
                    )}
                </div>
            )}
            {scheduleInfo?.is_off_day && (
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                    <CloseCircleOutlined />
                    <span className="font-medium">Bu gün tatil / izin günü olarak tanımlı</span>
                </div>
            )}
            {scheduleInfo?.is_holiday && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                    <CloseCircleOutlined />
                    <span className="font-medium">Resmi tatil</span>
                </div>
            )}

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
                                            minuteStep={1}
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
                                            minuteStep={1}
                                            className="w-full"
                                            size="middle"
                                            placeholder="Saat seçin"
                                            needConfirm={false}
                                        />
                                    </div>
                                </div>

                                {/* Kaynak + Durum seçimi */}
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Kaynak</label>
                                        <Select
                                            value={rec.source}
                                            onChange={(val) => updateRec(i, 'source', val)}
                                            options={sourceOptions}
                                            size="small"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Durum</label>
                                        <Select
                                            size="small"
                                            value={rec.status || 'OPEN'}
                                            onChange={v => updateRec(i, 'status', v)}
                                            className="w-full"
                                            options={[
                                                { value: 'OPEN', label: 'Açık' },
                                                { value: 'CALCULATED', label: 'Hesaplandı' },
                                                { value: 'APPROVED', label: 'Onaylandı' },
                                                { value: 'AUTO_APPROVED', label: 'Oto Onay' },
                                                { value: 'PENDING_MANAGER_APPROVAL', label: 'Onay Bekliyor' },
                                                { value: 'ABSENT', label: 'Devamsız' },
                                            ]}
                                        />
                                    </div>
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
                disabled={loading}
                block
                size="large"
                className="!bg-green-600 !border-green-600 hover:!bg-green-700"
            >
                Değişiklikleri Kuyruğa Ekle
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
                                        minuteStep={1}
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
                                onChange={(val) => setNewYear(val || getIstanbulYear())}
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
                                        <div className="text-slate-400">{new Date(log.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}</div>
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
                            <Select size="small" value={lr.status} style={{ width: 120 }}
                                onChange={val => handleUpdateRequestStatus('leave', lr.id, val)}
                                options={[
                                    { value: 'PENDING', label: 'Beklemede' },
                                    { value: 'APPROVED', label: 'Onaylandı' },
                                    { value: 'REJECTED', label: 'Reddedildi' },
                                    { value: 'CANCELLED', label: 'İptal' },
                                ]}
                            />
                            {lr.is_admin_override && <Tag color="purple">Admin</Tag>}
                            {lr.status !== 'CANCELLED' && (
                                <Popconfirm
                                    title="Bu izni iptal etmek istediğinize emin misiniz?"
                                    onConfirm={() => handleCancelLeave(lr)}
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
                    {isBalanceTracked && (
                        <div className="mt-3 space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deductFromBalance}
                                    onChange={e => setDeductFromBalance(e.target.checked)}
                                    className="rounded border-slate-300"
                                />
                                <span className="font-medium text-slate-700">Bakiyeden düşür</span>
                            </label>
                            {!deductFromBalance && (
                                <input
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                    placeholder="Neden bakiyeden düşürülmüyor? (zorunlu)"
                                    value={noDeductReason}
                                    onChange={e => setNoDeductReason(e.target.value)}
                                />
                            )}
                        </div>
                    )}
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleCreateLeave}
                        block
                        size="small"
                        className="!bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700"
                    >
                        İzin Oluştur ve Onayla
                    </Button>
                    <div className="text-[10px] text-slate-400">
                        {isBalanceTracked && !deductFromBalance
                            ? 'Admin izni otomatik olarak onaylanacak, bakiyeden düşürülmeyecektir.'
                            : 'Admin izni otomatik olarak onaylanacak ve bakiyeden düşülecektir.'}
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
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            <Select size="small" value={ot.status} style={{ width: 120 }}
                                onChange={val => handleUpdateRequestStatus('overtime', ot.id, val)}
                                options={[
                                    { value: 'POTENTIAL', label: 'Potansiyel' },
                                    { value: 'PENDING', label: 'Beklemede' },
                                    { value: 'APPROVED', label: 'Onaylandı' },
                                    { value: 'REJECTED', label: 'Reddedildi' },
                                    { value: 'CANCELLED', label: 'İptal' },
                                ]}
                            />
                            {ot.is_admin_override && <Tag color="purple">Admin</Tag>}
                            <Popconfirm title="Bu talebi silme kuyruğuna eklemek istediğinize emin misiniz?" onConfirm={() => handleDeleteRequest('overtime', ot.id, ot)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </div>
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

            {/* Yeni Ek Mesai Talebi */}
            <Divider orientation="left" style={{ fontSize: 13 }}>Yeni Fazla Mesai Talebi</Divider>
            <div className="space-y-2">
                <div className="flex gap-2 items-center flex-wrap">
                    <TimePicker value={newOtStart} onChange={setNewOtStart} format="HH:mm" placeholder="Başlangıç" size="small" needConfirm={false} />
                    <span>—</span>
                    <TimePicker value={newOtEnd} onChange={setNewOtEnd} format="HH:mm" placeholder="Bitiş" size="small" needConfirm={false} />
                    <Select size="small" value={newOtStatus} onChange={setNewOtStatus} style={{ width: 130 }}
                        options={[
                            { value: 'POTENTIAL', label: 'Potansiyel' },
                            { value: 'PENDING', label: 'Beklemede' },
                            { value: 'APPROVED', label: 'Onaylandı' },
                        ]}
                    />
                </div>
                <Input.TextArea rows={1} value={newOtReason} onChange={e => setNewOtReason(e.target.value)}
                    placeholder="Görev açıklaması (opsiyonel)" size="small" />
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateOt}>
                    Fazla Mesai Talebi Oluştur
                </Button>
            </div>
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
        {
            key: 'cardless',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <ClockCircleOutlined className="text-cyan-500" />
                    Kartsız Giriş
                    {cardlessRequests.length > 0 && (
                        <Tag className="!text-[10px] !m-0 !ml-1" color="cyan">{cardlessRequests.length}</Tag>
                    )}
                </span>
            ),
            children: (
                <div className="space-y-3">
                    {cardlessRequests.map(cr => (
                        <div key={cr.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded flex-wrap">
                            <Tag color="blue">{cr.check_in_time} - {cr.check_out_time}</Tag>
                            <Select size="small" value={cr.status} style={{ width: 120 }}
                                onChange={val => handleUpdateRequestStatus('cardless', cr.id, val)}
                                options={[
                                    { value: 'PENDING', label: 'Beklemede' },
                                    { value: 'APPROVED', label: 'Onaylandı' },
                                    { value: 'REJECTED', label: 'Reddedildi' },
                                    { value: 'CANCELLED', label: 'İptal' },
                                ]}
                            />
                            {cr.is_admin_override && <Tag color="purple">Admin</Tag>}
                            <span className="text-xs text-gray-500 flex-1">{cr.reason}</span>
                            <Popconfirm title="Silme kuyruğuna eklemek istediğinize emin misiniz?" onConfirm={() => handleDeleteRequest('cardless', cr.id, cr)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </div>
                    ))}
                    {cardlessRequests.length === 0 && <Empty description="Kartsız giriş talebi yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    <Divider orientation="left" style={{ fontSize: 13 }}>Yeni Kartsız Giriş</Divider>
                    <div className="flex gap-2 items-center flex-wrap">
                        <TimePicker value={newCardlessIn} onChange={setNewCardlessIn} format="HH:mm" placeholder="Giriş" size="small" needConfirm={false} />
                        <span>—</span>
                        <TimePicker value={newCardlessOut} onChange={setNewCardlessOut} format="HH:mm" placeholder="Çıkış" size="small" needConfirm={false} />
                        <Select size="small" value={newCardlessStatus} onChange={setNewCardlessStatus} style={{ width: 120 }}
                            options={[{ value: 'PENDING', label: 'Beklemede' }, { value: 'APPROVED', label: 'Onaylandı' }]}
                        />
                    </div>
                    <Input.TextArea rows={1} value={newCardlessReason} onChange={e => setNewCardlessReason(e.target.value)}
                        placeholder="Sebep (opsiyonel)" size="small" />
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateCardless}>
                        Kartsız Giriş Oluştur
                    </Button>
                </div>
            ),
        },
        {
            key: 'meal',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <CalendarOutlined className="text-orange-500" />
                    Yemek Talebi
                    {mealRequests.length > 0 && (
                        <Tag className="!text-[10px] !m-0 !ml-1" color="volcano">{mealRequests.length}</Tag>
                    )}
                </span>
            ),
            children: (
                <div className="space-y-3">
                    {mealRequests.map(mr => (
                        <div key={mr.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded flex-wrap">
                            <span className="text-sm">{mr.description || 'Yemek talebi'}</span>
                            <Select size="small" value={mr.status} style={{ width: 130 }}
                                onChange={val => handleUpdateRequestStatus('meal', mr.id, val)}
                                options={[
                                    { value: 'PENDING', label: 'Beklemede' },
                                    { value: 'ORDERED', label: 'Sipariş Verildi' },
                                    { value: 'DELIVERED', label: 'Teslim Edildi' },
                                    { value: 'CANCELLED', label: 'İptal' },
                                ]}
                            />
                            {mr.is_admin_override && <Tag color="purple">Admin</Tag>}
                            <Popconfirm title="Silme kuyruğuna eklemek istediğinize emin misiniz?" onConfirm={() => handleDeleteRequest('meal', mr.id, mr)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </div>
                    ))}
                    {mealRequests.length === 0 && <Empty description="Yemek talebi yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    <Divider orientation="left" style={{ fontSize: 13 }}>Yeni Yemek Talebi</Divider>
                    <div className="flex gap-2 items-center flex-wrap">
                        <Select size="small" value={newMealStatus} onChange={setNewMealStatus} style={{ width: 140 }}
                            options={[{ value: 'PENDING', label: 'Beklemede' }, { value: 'ORDERED', label: 'Sipariş Verildi' }]}
                        />
                        <Input value={newMealDesc} onChange={e => setNewMealDesc(e.target.value)}
                            placeholder="Açıklama (opsiyonel)" size="small" style={{ width: 200 }} />
                        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateMeal}>
                            Yemek Talebi Oluştur
                        </Button>
                    </div>
                </div>
            ),
        },
        {
            key: 'external_duty',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <CalendarOutlined className="text-indigo-500" />
                    Dış Görev
                    {externalDutyRequests.length > 0 && (
                        <Tag className="!text-[10px] !m-0 !ml-1" color="purple">{externalDutyRequests.length}</Tag>
                    )}
                </span>
            ),
            children: (
                <div className="space-y-3">
                    {externalDutyRequests.map(ed => (
                        <div key={ed.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded flex-wrap">
                            <Tag>{ed.start_date} — {ed.end_date}</Tag>
                            <span className="text-sm">{ed.duty_city}</span>
                            <Select size="small" value={ed.status} style={{ width: 120 }}
                                onChange={val => handleUpdateRequestStatus('leave', ed.id, val)}
                                options={[
                                    { value: 'PENDING', label: 'Beklemede' },
                                    { value: 'APPROVED', label: 'Onaylandı' },
                                    { value: 'REJECTED', label: 'Reddedildi' },
                                    { value: 'CANCELLED', label: 'İptal' },
                                ]}
                            />
                            {ed.is_admin_override && <Tag color="purple">Admin</Tag>}
                            <Popconfirm title="Silme kuyruğuna eklemek istediğinize emin misiniz?" onConfirm={() => handleDeleteRequest('leave', ed.id, ed)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </div>
                    ))}
                    {externalDutyRequests.length === 0 && <Empty description="Dış görev talebi yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    <Divider orientation="left" style={{ fontSize: 13 }}>Yeni Dış Görev</Divider>
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center flex-wrap">
                            <DatePicker value={newDutyStart} onChange={setNewDutyStart} placeholder="Başlangıç" size="small" />
                            <span>—</span>
                            <DatePicker value={newDutyEnd} onChange={setNewDutyEnd} placeholder="Bitiş" size="small" />
                            <Select size="small" value={newDutyStatus} onChange={setNewDutyStatus} style={{ width: 120 }}
                                options={[{ value: 'PENDING', label: 'Beklemede' }, { value: 'APPROVED', label: 'Onaylandı' }]}
                            />
                        </div>
                        <Input value={newDutyCity} onChange={e => setNewDutyCity(e.target.value)}
                            placeholder="Şehir" size="small" style={{ width: 200 }} />
                        <Input.TextArea rows={1} value={newDutyDesc} onChange={e => setNewDutyDesc(e.target.value)}
                            placeholder="Görev açıklaması" size="small" />
                        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateDuty}>
                            Dış Görev Oluştur
                        </Button>
                    </div>
                </div>
            ),
        },
        {
            key: 'health',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <MedicineBoxOutlined className="text-rose-500" />
                    Sağlık Raporu
                </span>
            ),
            children: (
                <div className="space-y-3">
                    <div className="bg-white rounded-lg border p-3">
                        <div className="text-xs font-semibold text-slate-600 mb-2.5 flex items-center gap-1.5">
                            <PlusOutlined /> Yeni Sağlık Raporu
                        </div>
                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rapor Türü</label>
                                <Select
                                    value={newHealthType}
                                    onChange={setNewHealthType}
                                    className="w-full"
                                    size="small"
                                    options={HEALTH_TYPE_OPTIONS}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Başlangıç</label>
                                    <DatePicker
                                        value={newHealthStart}
                                        onChange={setNewHealthStart}
                                        className="w-full"
                                        size="small"
                                        format="YYYY-MM-DD"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Bitiş</label>
                                    <DatePicker
                                        value={newHealthEnd}
                                        onChange={setNewHealthEnd}
                                        disabled={newHealthType === 'HOSPITAL_VISIT'}
                                        className="w-full"
                                        size="small"
                                        format="YYYY-MM-DD"
                                    />
                                </div>
                            </div>
                            {newHealthType === 'HOSPITAL_VISIT' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Başlangıç Saati</label>
                                        <TimePicker
                                            value={newHealthTimeStart}
                                            onChange={setNewHealthTimeStart}
                                            format="HH:mm"
                                            minuteStep={1}
                                            className="w-full"
                                            size="small"
                                            placeholder="Saat"
                                            needConfirm={false}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Bitiş Saati</label>
                                        <TimePicker
                                            value={newHealthTimeEnd}
                                            onChange={setNewHealthTimeEnd}
                                            format="HH:mm"
                                            minuteStep={1}
                                            className="w-full"
                                            size="small"
                                            placeholder="Saat"
                                            needConfirm={false}
                                        />
                                    </div>
                                </div>
                            )}
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleCreateHealth}
                                block
                                size="small"
                                className="!bg-rose-600 !border-rose-600 hover:!bg-rose-700"
                            >
                                Kuyruğa Ekle
                            </Button>
                            <div className="text-[10px] text-slate-400">
                                {newHealthType === 'HOSPITAL_VISIT'
                                    ? 'Hastane ziyareti tek gün olarak işlenir; başlangıç/bitiş saati zorunludur.'
                                    : 'Tam gün rapor — seçilen tarih aralığı tüm gün olarak işlenir.'}
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'special',
            label: (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                    <SafetyCertificateOutlined className="text-teal-500" />
                    Özel İzin
                </span>
            ),
            children: (
                <div className="space-y-3">
                    <div className="bg-white rounded-lg border p-3">
                        <div className="text-xs font-semibold text-slate-600 mb-2.5 flex items-center gap-1.5">
                            <PlusOutlined /> Yeni Özel İzin
                        </div>
                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">İzin Türü</label>
                                <Select
                                    value={newSpecialType}
                                    onChange={setNewSpecialType}
                                    className="w-full"
                                    size="small"
                                    options={SPECIAL_TYPE_OPTIONS}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Başlangıç</label>
                                    <DatePicker
                                        value={newSpecialStart}
                                        onChange={setNewSpecialStart}
                                        className="w-full"
                                        size="small"
                                        format="YYYY-MM-DD"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Bitiş</label>
                                    <DatePicker
                                        value={newSpecialEnd}
                                        onChange={setNewSpecialEnd}
                                        disabled={newSpecialType !== 'UNPAID'}
                                        className="w-full"
                                        size="small"
                                        format="YYYY-MM-DD"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Sebep</label>
                                <Input
                                    value={newSpecialReason}
                                    onChange={(e) => setNewSpecialReason(e.target.value)}
                                    placeholder="Opsiyonel"
                                    size="small"
                                />
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleCreateSpecial}
                                block
                                size="small"
                                className="!bg-teal-600 !border-teal-600 hover:!bg-teal-700"
                            >
                                Kuyruğa Ekle
                            </Button>
                            <div className="text-[10px] text-slate-400">
                                {newSpecialType === 'UNPAID'
                                    ? 'Ücretsiz izin — seçilen tarih aralığı kullanılır.'
                                    : 'Sabit süreli izin — bitiş tarihi türe göre otomatik hesaplanır (başlangıç yeterli).'}
                            </div>
                        </div>
                    </div>
                </div>
            ),
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
                    {scheduleInfo?.shift_start && !scheduleInfo?.is_off_day && (
                        <span>Vardiya: <b className="text-slate-700">{scheduleInfo.shift_start}-{scheduleInfo.shift_end}</b></span>
                    )}
                    {scheduleInfo?.is_off_day && <span className="text-slate-400 font-bold">Tatil Günü</span>}
                    {leaves.length > 0 && <span className="text-emerald-600 font-bold">İzinli</span>}
                    {otRequests.length > 0 && <span className="text-amber-600 font-bold">{otRequests.length} FM</span>}
                </div>
            </div>

            {/* Fiscal Lock Bilgi Banner'ı — kilit bypass'ı önizleme/kaydet ekranındaki
                ONAYLA + gerekçe ile yönetilir (PreviewModal). Buradaki eski checkbox
                hiçbir yere bağlı değildi (ölü UI), yanıltıcıydı; kaldırıldı. */}
            {scheduleInfo?.is_locked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-2 mt-2 flex items-center gap-3">
                    <span className="text-amber-600 font-medium text-sm">
                        Bu tarih kilitli mali dönemde — kaydederken onay (ONAYLA + gerekçe) istenecek.
                    </span>
                </div>
            )}

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
