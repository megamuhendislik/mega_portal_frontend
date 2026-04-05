import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, FileText, AlertCircle, AlertTriangle, Shield, Lock, CheckCircle, XCircle, Briefcase, User, ChevronDown, ChevronRight, Utensils, BarChart3, LogIn, LogOut, ClipboardList, Edit3, Trash2, Download, Check } from 'lucide-react';
import { Modal, message } from 'antd';
// CardlessEntry fixes v2: dynamic ContentType ID, override_decision support
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DecisionHistoryTimeline from './DecisionHistoryTimeline';
import ModalOverlay from './ui/ModalOverlay';

const round = (v, d = 1) => { const m = 10 ** d; return Math.round(v * m) / m; };

const RequestDetailModal = ({ isOpen, onClose, request, requestType: rawRequestType, onUpdate, onApprove, onReject, mode = 'personal' }) => {
  // EXTERNAL_DUTY uses LEAVE endpoints/logic — normalize for all internal checks
  const requestType = rawRequestType === 'EXTERNAL_DUTY' ? 'LEAVE' : rawRequestType;
  const { user } = useAuth();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState('approve');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLockInfo, setTimeLockInfo] = useState(null);
  // downloadLoading removed — export-docx endpoint deleted, only petition remains
  const [petitionLoading, setPetitionLoading] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [dutyPreview, setDutyPreview] = useState(null);
  const [dutyPreviewLoading, setDutyPreviewLoading] = useState(false);
  const [showFullReason, setShowFullReason] = useState(false);
  const [weeklyOtStatus, setWeeklyOtStatus] = useState(null);
  const [weeklyOtLoading, setWeeklyOtLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Approve/Reject from modal (incoming mode)
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  // Reset reject mode when request changes
  useEffect(() => {
    setRejectMode(false);
    setRejectReason('');
  }, [request?.id]);

  const handleModalApprove = async () => {
    if (!onApprove) return;
    setApproveLoading(true);
    try {
      await onApprove(request, 'Onaylandı');
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setApproveLoading(false);
    }
  };

  const handleModalReject = async () => {
    if (!onReject || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      await onReject(request, rejectReason.trim());
      setRejectMode(false);
      setRejectReason('');
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setRejectLoading(false);
    }
  };

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (isOpen && request) {
      fetchTimeLockInfo();
      setShowFullReason(false);
      setExpandedSections({});
      setWeeklyOtStatus(null);
    }
  }, [isOpen, request]);

  // Fetch weekly OT status for overtime requests
  useEffect(() => {
    if (!isOpen || !request || requestType !== 'OVERTIME') return;
    const empId = request.employee || request.employee_detail?.id;
    if (!empId) return;
    setWeeklyOtLoading(true);
    api.get(`/overtime-requests/weekly-ot-status/`, { params: { employee_id: empId, reference_date: request.date } })
      .then(res => setWeeklyOtStatus(res.data))
      .catch(() => setWeeklyOtStatus(null))
      .finally(() => setWeeklyOtLoading(false));
  }, [isOpen, request?.id, requestType]);

  useEffect(() => {
    if (request?.request_type_detail?.category === 'EXTERNAL_DUTY' &&
        request?.start_date && request?.end_date) {
      const fetchPreview = async () => {
        setDutyPreviewLoading(true);
        try {
          const resp = await api.post('/leave/requests/preview-duty-hours/', {
            start_date: request.start_date,
            end_date: request.end_date,
            start_time: request.start_time || null,
            end_time: request.end_time || null,
            employee_id: request.employee || request.employee_detail?.id,
            date_segments: request.date_segments || null,
          });
          setDutyPreview(resp.data);
        } catch (err) {
          console.error('Duty preview error:', err);
          setDutyPreview(null);
        } finally {
          setDutyPreviewLoading(false);
        }
      };
      fetchPreview();
    } else {
      setDutyPreview(null);
      setDutyPreviewLoading(false);
    }
  }, [request?.id]);

  useEffect(() => {
    const empId = request?.employee || request?.employee_detail?.id;
    if (isOpen && request && empId && requestType === 'LEAVE' && request.request_type_detail?.category !== 'EXTERNAL_DUTY') {
      api.get(`/leave/requests/?employee_id=${empId}&status=APPROVED&ordering=-start_date&page_size=5`)
        .then(res => {
          const data = res.data?.results || res.data || [];
          setEmployeeHistory(data.slice(0, 5));
        })
        .catch(() => setEmployeeHistory([]));
    } else {
      setEmployeeHistory([]);
    }
  }, [isOpen, request, requestType]);

  // Reset edit state when modal closes/reopens
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setEditForm({});
    }
  }, [isOpen]);

  const fetchTimeLockInfo = async () => {
    if (!request) return;

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const today = new Date(todayStr + 'T23:59:59');
    // Use lock_date from backend (fiscal period based) if available
    const lockDateStr = request.lock_date || request.immutable_date;
    let lockDate;
    let isLocked = request.is_immutable || false;

    if (lockDateStr) {
      lockDate = new Date(lockDateStr + 'T23:59:59');
      if (todayStr >= lockDateStr) isLocked = true;
    } else {
      // Fallback: event_date + 60 days (eski mantik, backend lock_date yoksa)
      const eventDate = new Date(request.start_date || request.date);
      lockDate = new Date(eventDate);
      lockDate.setDate(lockDate.getDate() + 60);
      if (today >= lockDate) isLocked = true;
    }

    const daysUntilLock = Math.ceil((lockDate - today) / (1000 * 60 * 60 * 24));

    setTimeLockInfo({
      is_locked: isLocked,
      event_date: new Date(request.start_date || request.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
      lock_date: lockDate.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
      days_until_lock: daysUntilLock > 0 ? daysUntilLock : 0
    });
  };

  // --- Edit/Cancel logic ---
  const REQUEST_API_MAP = {
    LEAVE: '/leave/requests',
    OVERTIME: '/overtime-requests',
    CARDLESS_ENTRY: '/cardless-entry-requests',
    MEAL: '/meal-requests',
    HEALTH_REPORT: '/health-reports',
    HOSPITAL_VISIT: '/health-reports',
    SPECIAL_LEAVE: '/special-leaves',
  };

  const EDIT_FIELDS_MAP = {
    LEAVE: ['start_date', 'end_date', 'reason'],
    OVERTIME: ['start_time', 'end_time', 'reason'],
    CARDLESS_ENTRY: ['check_in_time', 'check_out_time', 'reason'],
    MEAL: ['date'],
    HEALTH_REPORT: ['start_date', 'end_date', 'report_type', 'description'],
    HOSPITAL_VISIT: ['start_date', 'end_date', 'report_type', 'description'],
    SPECIAL_LEAVE: ['start_time', 'end_time', 'description'],
  };

  const isOwner = (() => {
    if (!request || !user) return false;
    const empId = typeof request.employee === 'object' ? request.employee?.id : request.employee;
    return empId === user.id;
  })();

  const canEditOrCancel = request?.status === 'PENDING' && isOwner;

  const startEditing = () => {
    const fields = EDIT_FIELDS_MAP[requestType] || [];
    const form = {};
    fields.forEach(f => { form[f] = request[f] || ''; });
    setEditForm(form);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const endpoint = REQUEST_API_MAP[requestType];
    if (!endpoint) return;

    setEditLoading(true);
    try {
      await api.patch(`${endpoint}/${request.id}/`, editForm);
      message.success('Talep güncellendi.');
      setIsEditing(false);
      onUpdate?.();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || 'Güncelleme başarısız.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    const endpoint = REQUEST_API_MAP[requestType];
    if (!endpoint) return;

    setCancelLoading(true);
    try {
      await api.post(`${endpoint}/${request.id}/cancel/`);
      message.success('Talep iptal edildi.');
      onUpdate?.();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || 'İptal işlemi başarısız.');
    } finally {
      setCancelLoading(false);
    }
  };

  const confirmCancel = () => {
    Modal.confirm({
      title: 'Talebi İptal Et',
      content: 'Bu talebi iptal etmek istediğinize emin misiniz?',
      okText: 'Evet, İptal Et',
      cancelText: 'Vazgeç',
      okButtonProps: { danger: true },
      onOk: handleCancelRequest,
    });
  };

  const FIELD_LABELS = {
    start_date: 'Başlangıç Tarihi', end_date: 'Bitiş Tarihi',
    start_time: 'Başlangıç Saati', end_time: 'Bitiş Saati',
    check_in: 'Giriş Saati', check_out: 'Çıkış Saati',
    check_in_time: 'Giriş Saati', check_out_time: 'Çıkış Saati',
    description: 'Açıklama', reason: 'Sebep/Açıklama',
    date: 'Tarih', report_type: 'Rapor Türü',
  };

  const renderEditField = (field) => {
    const value = editForm[field] ?? '';
    const onChange = (val) => setEditForm(prev => ({ ...prev, [field]: val }));

    if (field.includes('date') || field === 'date') {
      return (
        <div key={field} className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{FIELD_LABELS[field]}</label>
          <input type="date" value={value} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      );
    }
    if (field.includes('time') || field === 'check_in' || field === 'check_out') {
      return (
        <div key={field} className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{FIELD_LABELS[field]}</label>
          <input type="time" value={typeof value === 'string' ? value.substring(0, 5) : value} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      );
    }
    if (field === 'report_type') {
      return (
        <div key={field} className="space-y-1">
          <label className="text-xs font-medium text-slate-500">{FIELD_LABELS[field]}</label>
          <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="HEALTH_REPORT">Sağlık Raporu</option>
            <option value="HOSPITAL_VISIT">Hastane Ziyareti</option>
          </select>
        </div>
      );
    }
    return (
      <div key={field} className="space-y-1">
        <label className="text-xs font-medium text-slate-500">{FIELD_LABELS[field]}</label>
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
      </div>
    );
  };

  const handleOverrideSubmit = async () => {
    if (!overrideReason.trim()) {
      setError('Gerekçe zorunludur');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpointMap = {
        'LEAVE': `/leave/requests/${request.id}/override_decision/`,
        'OVERTIME': `/overtime-requests/${request.id}/override_decision/`,
        'CARDLESS_ENTRY': `/cardless-entry-requests/${request.id}/override_decision/`,
        'HEALTH_REPORT': `/health-reports/${request.id}/override_decision/`,
        'HOSPITAL_VISIT': `/health-reports/${request.id}/override_decision/`,
      };
      const endpoint = endpointMap[requestType];
      if (!endpoint) {
        setError('Bu talep türü için karar değiştirme desteklenmiyor.');
        return;
      }

      await api.post(endpoint, {
        action: overrideAction,
        reason: overrideReason
      });

      setShowOverrideModal(false);
      setOverrideReason('');
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Override işlemi başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPetition = async (leaveRequestId) => {
    setPetitionLoading(true);
    try {
      const res = await api.post('/leave/requests/generate-petition/', { leave_request_id: leaveRequestId }, {
        responseType: 'blob'
      });

      const contentDisp = res.headers['content-disposition'] || '';
      const match = contentDisp.match(/filename="?(.+?)"?$/);
      const filename = match ? decodeURIComponent(match[1]) : 'Yillik_Izin_Dilekce.docx';

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Dilekçe indirme hatası:', err);
      message.error('Dilekçe oluşturulamadı.');
    } finally {
      setPetitionLoading(false);
    }
  };

  if (!isOpen || !request) return null;

  const canOverride = request?.can_override === true;

  const getContentTypeId = () => {
    return request?.content_type_id || null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Bekliyor' },
      'APPROVED': { bg: 'bg-green-100', text: 'text-green-700', label: 'Onaylandı' },
      'ORDERED': { bg: 'bg-green-100', text: 'text-green-700', label: 'Sipariş Edildi' },
      'REJECTED': { bg: 'bg-red-100', text: 'text-red-700', label: 'Reddedildi' },
      'CANCELLED': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'İptal Edildi' },
      'DELIVERED': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Teslim Edildi' }
    };
    const badge = badges[status] || badges['PENDING'];
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <>
    <ModalOverlay open={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Talep Detayları</h2>
            <p className="text-sm text-slate-600 mt-1">
              {requestType === 'LEAVE'
                ? (request.leave_type_name || request.request_type_detail?.name || 'İzin Talebi')
                : requestType === 'OVERTIME' ? 'Fazla Mesai Talebi'
                : requestType === 'CARDLESS_ENTRY' ? 'Kartsız Giriş Talebi'
                : requestType === 'MEAL' ? 'Yemek Talebi'
                : requestType === 'HEALTH_REPORT' ? 'Sağlık Raporu'
                : requestType === 'HOSPITAL_VISIT' ? 'Hastane Ziyareti'
                : 'Talep'}
              {request.id && <span className="text-slate-400 ml-2">#{request.id}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Time Lock Warning */}
          {timeLockInfo?.is_locked && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <Lock size={20} />
              <div>
                <div className="font-semibold">Bu talep kilitli</div>
                <div className="text-sm">Mali dönem kapandığı için değiştirilemez (Kilit: {timeLockInfo.lock_date})</div>
              </div>
            </div>
          )}

          {/* Time Lock Countdown */}
          {!timeLockInfo?.is_locked && timeLockInfo?.days_until_lock > 0 && timeLockInfo?.days_until_lock <= 30 && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
              <AlertCircle size={20} />
              <div className="text-sm">
                <span className="font-semibold">{timeLockInfo.days_until_lock} gün</span> sonra mali dönem kapanacak ve bu talep kilitlenecek ({timeLockInfo.lock_date})
              </div>
            </div>
          )}

          {/* Request Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            {/* Talep Eden Bilgisi — her zaman göster */}
            {(() => {
              const empName = request.employee_name || request.employee_detail?.full_name || request.employee?.name || request.employee?.full_name || '';
              const empDept = request.employee_department || request.employee_detail?.department_name || request.employee?.department || '';
              const empPosition = request.employee_position || request.employee_detail?.job_position_name || '';
              return (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Talep Eden</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold text-sm border border-blue-200">
                      <User size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800">{empName || 'Bilinmiyor'}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {empDept && <span>{empDept}</span>}
                        {empDept && empPosition && <span className="text-slate-300">|</span>}
                        {empPosition && <span>{empPosition}</span>}
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              );
            })()}

            {/* Talep Bilgisi Kartı */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Talep Bilgisi</div>
              <div className="space-y-2">
                {/* Talep Türü */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Talep Türü</span>
                  <span className="text-sm font-bold text-slate-800">
                    {requestType === 'LEAVE'
                      ? (request.leave_type_name || request.request_type_detail?.name || 'İzin')
                      : requestType === 'OVERTIME' ? 'Fazla Mesai'
                      : requestType === 'CARDLESS_ENTRY' ? 'Kartsız Giriş'
                      : requestType === 'MEAL' ? 'Yemek'
                      : requestType === 'HEALTH_REPORT' ? 'Sağlık Raporu'
                      : requestType === 'HOSPITAL_VISIT' ? 'Hastane Ziyareti'
                      : 'Diğer'}
                  </span>
                </div>

                {/* Oluşturulma Tarihi */}
                {request.created_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Oluşturulma</span>
                    <span className="text-sm text-slate-700">
                      {new Date(request.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })}
                      {' '}
                      <span className="text-slate-400">{new Date(request.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Hospital Visit / Health Report Details */}
            {(requestType === 'HOSPITAL_VISIT' || requestType === 'HEALTH_REPORT') && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Başlangıç Tarihi</span>
                  <span className="text-sm text-slate-800">{formatDate(request.start_date || request.date)}</span>
                </div>
                {request.end_date && request.end_date !== request.start_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Bitiş Tarihi</span>
                    <span className="text-sm text-slate-800">{formatDate(request.end_date)}</span>
                  </div>
                )}
                {request.start_time && request.end_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Saat Aralığı</span>
                    <span className="text-sm font-bold text-pink-600">
                      {request.start_time?.substring(0, 5)} - {request.end_time?.substring(0, 5)}
                    </span>
                  </div>
                )}
                {!request.start_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Süre</span>
                    <span className="text-sm font-bold text-red-600">Tam Gün</span>
                  </div>
                )}
              </>
            )}

            {requestType === 'LEAVE' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Başlangıç</span>
                  <span className="text-sm text-slate-800">{formatDate(request.start_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Bitiş</span>
                  <span className="text-sm text-slate-800">{formatDate(request.end_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Toplam Gün</span>
                  <span className="text-sm font-bold text-blue-600">{request.total_days}</span>
                </div>
                {/* Mazeret izni saat aralığı */}
                {request.start_time && request.end_time && request.request_type_detail?.category !== 'EXTERNAL_DUTY' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Saat Aralığı</span>
                    <span className="text-sm font-bold text-orange-600">
                      {request.start_time?.substring(0, 5)} - {request.end_time?.substring(0, 5)}
                    </span>
                  </div>
                )}
                {/* Dış Görev — gün bazlı çalışma saatleri */}
                {request.request_type_detail?.category === 'EXTERNAL_DUTY' && (() => {
                  const segs = request.date_segments || [];
                  if (segs.length === 0 && request.start_time && request.end_time) {
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Görev Saati</span>
                        <span className="text-sm font-bold text-purple-600">
                          {request.start_time?.substring(0, 5)} - {request.end_time?.substring(0, 5)}
                        </span>
                      </div>
                    );
                  }
                  if (segs.length > 0) {
                    return (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-purple-600 uppercase mb-1.5 block">Görev Saatleri</span>
                        <div className="space-y-1">
                          {segs.map((seg, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-purple-50/60 p-2 rounded-lg border border-purple-100">
                              <span className="text-slate-600 font-medium">
                                {new Date(seg.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Europe/Istanbul' })}
                              </span>
                              <span className="text-purple-700 font-bold">
                                {seg.start_time?.substring(0, 5)} - {seg.end_time?.substring(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {/* Yil Bazli Kesim */}
                {request.usage_breakdown && Object.keys(request.usage_breakdown).length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase mb-1 block">Yıl Bazlı Kesim</span>
                    <div className="space-y-1">
                      {Object.entries(request.usage_breakdown).sort(([a], [b]) => a.localeCompare(b)).map(([year, days]) => (
                        <div key={year} className="flex justify-between text-xs bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                          <span className="text-slate-600">{year} yılı</span>
                          <span className="font-bold text-indigo-700">{days} gün</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Calisan Izin Bakiye Bilgisi - Yonetici Gorunumu (EXTERNAL_DUTY hariç) */}
            {requestType === 'LEAVE' && request.employee_annual_leave_balance &&
             request.request_type_detail?.category !== 'EXTERNAL_DUTY' && (
              request.employee_annual_leave_balance.type === 'EXCUSE_LEAVE' ? (
              /* Mazeret İzni — saat bazlı bakiye */
              <div className="bg-orange-50/80 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-orange-600" />
                  <h4 className="text-sm font-bold text-orange-700">Mazeret İzni Bakiyesi ({request.employee_annual_leave_balance.year})</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Toplam Hak</span>
                    <span className="block font-black text-orange-700 text-lg">{request.employee_annual_leave_balance.hours_entitled} sa</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Kullanılan</span>
                    <span className="block font-black text-amber-600 text-lg">{request.employee_annual_leave_balance.hours_used} sa</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-orange-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Kalan</span>
                    <span className={`block font-black text-lg ${
                      request.employee_annual_leave_balance.hours_remaining <= 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>{request.employee_annual_leave_balance.hours_remaining} sa</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="bg-white/60 p-2 rounded-lg">
                  <div className="w-full bg-orange-100 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (request.employee_annual_leave_balance.hours_used / request.employee_annual_leave_balance.hours_entitled) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <span className="text-slate-500">Bu talep: <span className="font-bold text-orange-700">{request.employee_annual_leave_balance.request_hours} sa</span></span>
                    <span className="text-slate-500">Günlük max: <span className="font-bold text-slate-700">{request.employee_annual_leave_balance.max_daily_hours} sa</span></span>
                  </div>
                </div>
              </div>
              ) : (
              /* Yıllık İzin — gün bazlı bakiye */
              <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={16} className="text-blue-600" />
                  <h4 className="text-sm font-bold text-blue-700">Çalışan İzin Bilgisi</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Kalan Bakiye</span>
                    <span className="block font-black text-blue-700 text-lg">{request.employee_annual_leave_balance.remaining}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Kullanılan</span>
                    <span className="block font-black text-amber-600 text-lg">{request.employee_annual_leave_balance.used || 0}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Talep Sonrası</span>
                    <span className={`block font-black text-lg ${
                      (request.employee_annual_leave_balance.remaining - request.total_days) < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>{request.employee_annual_leave_balance.remaining - request.total_days}</span>
                  </div>
                </div>
                {/* Kidem ve Hakedis */}
                <div className="flex items-center justify-between text-xs bg-white/60 p-2 rounded-lg">
                  {request.employee_annual_leave_balance.years_of_service !== undefined && (
                    <span className="text-slate-600">
                      Kıdem: <span className="font-bold text-slate-800">{request.employee_annual_leave_balance.years_of_service} Yıl</span>
                    </span>
                  )}
                  {request.employee_annual_leave_balance.entitlement_tier !== undefined && (
                    <span className="text-slate-600">
                      Yıllık Hak: <span className="font-bold text-emerald-700">{request.employee_annual_leave_balance.entitlement_tier} Gün</span>
                    </span>
                  )}
                  {request.employee_annual_leave_balance.last_leave_date && (
                    <span className="text-slate-600">
                      Son İzin: <span className="font-bold text-slate-800">{new Date(request.employee_annual_leave_balance.last_leave_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}</span>
                    </span>
                  )}
                </div>
              </div>
              )
            )}

            {/* Görev Mesai Bilgisi — External Duty */}
            {requestType === 'LEAVE' && request.request_type_detail?.category === 'EXTERNAL_DUTY' && (
              <div className="bg-purple-50/80 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={16} className="text-purple-600" />
                  <h4 className="text-sm font-bold text-purple-700">Görev Mesai Bilgisi</h4>
                </div>

                {request.duty_work_info && (request.duty_work_info.attendance_records?.length > 0 || request.duty_work_info.overtime_records?.length > 0) ? (
                  <>
                    {/* Toplam Süre Özeti */}
                    <div className="grid grid-cols-2 gap-2 text-center mb-3">
                      <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Normal Mesai</span>
                        <span className="block font-black text-purple-700 text-lg">
                          {request.duty_work_info.total_work_minutes ? `${Math.floor(request.duty_work_info.total_work_minutes / 60)}s ${request.duty_work_info.total_work_minutes % 60}dk` : '0'}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Ek Mesai</span>
                        <span className="block font-black text-amber-600 text-lg">
                          {request.duty_work_info.total_ot_minutes ? `${Math.floor(request.duty_work_info.total_ot_minutes / 60)}s ${request.duty_work_info.total_ot_minutes % 60}dk` : '0'}
                        </span>
                      </div>
                    </div>

                    {/* Gün Bazlı Çalışma Detayı (date_segments) */}
                    {request.duty_work_info?.date_segments && request.duty_work_info.date_segments.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] font-bold text-purple-600 uppercase mb-1 block">Gün Bazlı Çalışma Detayı</span>
                        <div className="space-y-1">
                          {request.duty_work_info.date_segments.map((seg, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-purple-100">
                              <span className="text-slate-600 font-medium">
                                {new Date(seg.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Europe/Istanbul' })}
                              </span>
                              <span className="text-purple-700 font-bold">{seg.start_time} - {seg.end_time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attendance Kayıtları */}
                    {request.duty_work_info.attendance_records?.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        <span className="text-[10px] font-bold text-purple-600 uppercase">Mesai Kayıtları</span>
                        {request.duty_work_info.attendance_records.map((att, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-purple-100">
                            <span className="text-slate-600">{new Date(att.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}</span>
                            <span className="font-bold text-purple-700">{att.check_in} - {att.check_out}</span>
                            <span className="text-slate-500">{Math.floor(att.duration_minutes / 60)}s {att.duration_minutes % 60}dk</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* OT Kayıtları */}
                    {request.duty_work_info.overtime_records?.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-600 uppercase">Ek Mesai Kayıtları</span>
                        {request.duty_work_info.overtime_records.map((ot, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-amber-100">
                            <span className="text-slate-600">{new Date(ot.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}</span>
                            <span className="font-bold text-amber-700">{ot.start_time} - {ot.end_time}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{Math.floor(ot.duration_minutes / 60)}s {ot.duration_minutes % 60}dk</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                ot.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                ot.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {ot.status === 'APPROVED' ? 'Onaylı' : ot.status === 'REJECTED' ? 'Reddedildi' : 'Bekliyor'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    {request.status === 'PENDING' && dutyPreview ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">Tahmini Hesaplama</span>
                          <span className="text-[9px] text-slate-400">(onay sonrası kesinleşir)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-white p-2 rounded-lg border border-emerald-100 text-center">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Normal Mesai</span>
                            <span className="block font-black text-emerald-600 text-lg">
                              {Math.floor(dutyPreview.totals.total_normal_work_minutes / 60)}s {dutyPreview.totals.total_normal_work_minutes % 60}dk
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-amber-100 text-center">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Ek Mesai</span>
                            <span className="block font-black text-amber-600 text-lg">
                              {Math.floor(dutyPreview.totals.total_overtime_minutes / 60)}s {dutyPreview.totals.total_overtime_minutes % 60}dk
                            </span>
                          </div>
                        </div>

                        {/* Header row */}
                        <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase px-2.5 mb-1">
                          <span className="w-20">Tarih</span>
                          <span className="w-24 text-center">Çalışma</span>
                          <span className="w-24 text-center">Vardiya</span>
                          <span className="w-20 text-center">Normal</span>
                          <span className="w-20 text-right">Ek Mesai</span>
                        </div>

                        {/* Day rows */}
                        <div className="space-y-1">
                          {dutyPreview.days.map((day, i) => (
                            <div key={i} className={`flex items-center text-xs p-2.5 rounded-lg border ${
                              day.is_off_day ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'
                            }`}>
                              <div className="w-20">
                                <span className="font-bold text-slate-700">
                                  {new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}
                                </span>
                                <span className="block text-[10px] text-slate-400">{day.day_name}</span>
                              </div>
                              <span className="w-24 text-center text-slate-600 font-medium">
                                {day.duty_start} - {day.duty_end}
                              </span>
                              <span className="w-24 text-center text-[10px] text-slate-400">
                                {day.is_off_day ? 'Tatil/İzin' : `${day.shift_start}-${day.shift_end}`}
                              </span>
                              <div className="w-20 text-center">
                                {day.normal_work_minutes > 0 ? (
                                  <span className="text-emerald-600 font-bold">
                                    {Math.floor(day.normal_work_minutes / 60)}s {day.normal_work_minutes % 60}dk
                                  </span>
                                ) : <span className="text-slate-300">&mdash;</span>}
                              </div>
                              <div className="w-20 text-right">
                                {day.overtime_minutes > 0 ? (
                                  <span className="text-amber-600 font-bold">
                                    {Math.floor(day.overtime_minutes / 60)}s {day.overtime_minutes % 60}dk
                                  </span>
                                ) : <span className="text-slate-300">&mdash;</span>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Totals row */}
                        <div className="flex items-center text-xs p-2.5 mt-1 rounded-lg border border-slate-200 bg-slate-50 font-bold">
                          <span className="w-20 text-slate-600">TOPLAM</span>
                          <span className="w-24 text-center text-slate-500">
                            {dutyPreview.totals.total_days} gün
                          </span>
                          <span className="w-24 text-center text-[10px] text-slate-400">
                            {dutyPreview.totals.working_days} iş / {dutyPreview.totals.off_days} tatil
                          </span>
                          <div className="w-20 text-center">
                            <span className="text-emerald-700">
                              {Math.floor(dutyPreview.totals.total_normal_work_minutes / 60)}s {dutyPreview.totals.total_normal_work_minutes % 60}dk
                            </span>
                          </div>
                          <div className="w-20 text-right">
                            <span className="text-amber-700">
                              {Math.floor(dutyPreview.totals.total_overtime_minutes / 60)}s {dutyPreview.totals.total_overtime_minutes % 60}dk
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : dutyPreviewLoading ? (
                      <div className="text-center py-3">
                        <div className="animate-pulse text-sm text-purple-400">Hesaplanıyor...</div>
                      </div>
                    ) : (
                      <div className="text-center py-3 text-sm text-purple-400">
                        {request.status === 'PENDING' ? 'Talep onaylandığında mesai kayıtları oluşacaktır.' : 'Mesai kaydı bulunamadı.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Calisanin Son Onayli Izinleri (EXTERNAL_DUTY hariç) */}
            {requestType === 'LEAVE' && employeeHistory.length > 0 &&
             request.request_type_detail?.category !== 'EXTERNAL_DUTY' && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-600 mb-2.5 flex items-center gap-1.5">
                  <Calendar size={14} />
                  Çalışanın Son Onaylı İzinleri
                </h4>
                <div className="space-y-1.5">
                  {employeeHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="font-medium text-slate-700">{h.leave_type_name || h.request_type_detail?.name || 'İzin'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          {h.start_date ? new Date(h.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' }) : '-'}
                        </span>
                        <span className="font-bold text-slate-700">{h.total_days} gün</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requestType === 'OVERTIME' && (
              <>
                {/* Temel Bilgiler */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Tarih</span>
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      {formatDate(request.date || request.start_date)}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Saat Aralığı</span>
                    {Array.isArray(request.segments) && request.segments.length > 1 ? (
                      <div className="flex flex-col gap-1">
                        {request.segments.map((seg, i) => (
                          <span key={i} className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                            <Clock size={12} className="text-amber-500" />
                            {(seg.start || '').substring(0, 5)} → {(seg.end || '').substring(0, 5)}
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-400 mt-0.5">{request.segments.length} segment birleştirildi</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-500" />
                        {request.start_time?.substring(0, 5)} → {request.end_time?.substring(0, 5)}
                      </span>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Toplam Süre</span>
                    <span className="text-sm font-black text-amber-600">
                      {(() => {
                        const m = request.duration_minutes || (request.total_hours != null ? Math.round(request.total_hours * 60) : Math.round((request.duration_seconds || 0) / 60));
                        const h = Math.floor(m / 60);
                        const mins = m % 60;
                        if (h === 0) return `${mins} dakika`;
                        if (mins === 0) return `${h} saat`;
                        return `${h} saat ${mins} dakika`;
                      })()}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Kaynak</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      request.source_type === 'INTENDED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      request.source_type === 'POTENTIAL' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      'bg-violet-50 text-violet-700 border border-violet-200'
                    }`}>
                      {request.source_type === 'INTENDED' ? 'Planlı (Atanmış)' :
                       request.source_type === 'POTENTIAL' ? 'Algılanan (Otomatik)' : 'Manuel Giriş'}
                    </span>
                  </div>
                </div>

                {/* Haftalık OT Durumu */}
                <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} className="text-blue-600" />
                    <h4 className="text-sm font-bold text-blue-700">Haftalık Ek Mesai Durumu</h4>
                  </div>
                  {weeklyOtLoading ? (
                    <div className="h-8 bg-blue-100 rounded animate-pulse" />
                  ) : weeklyOtStatus ? (() => {
                    const used = parseFloat(weeklyOtStatus.used_hours || 0);
                    const limit = parseFloat(weeklyOtStatus.limit_hours || 30);
                    const thisReqHours = request.total_hours || (request.duration_seconds ? round(request.duration_seconds / 3600, 1) : 0);
                    const projected = used + (request.status === 'PENDING' ? thisReqHours : 0);
                    const pct = Math.min(100, Math.round((used / limit) * 100));
                    const projPct = Math.min(100, Math.round((projected / limit) * 100));
                    const barColor = projPct > 85 ? 'bg-red-500' : projPct > 60 ? 'bg-amber-500' : 'bg-emerald-500';
                    const projColor = projPct > 85 ? 'text-red-700' : projPct > 60 ? 'text-amber-700' : 'text-emerald-700';
                    return (
                      <>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-slate-600">Kullanılan: <span className="font-bold text-slate-800">{used} sa</span> / {limit} sa</span>
                          <span className="font-bold text-slate-500">{pct}%</span>
                        </div>
                        <div className="h-3 bg-blue-100 rounded-full overflow-hidden mb-2">
                          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        {request.status === 'PENDING' && (
                          <div className={`text-xs ${projColor} font-bold bg-white/60 rounded-lg p-2 border border-blue-100`}>
                            Bu talep dahil: {projected} sa ({projPct}%) — Kalan: {Math.max(0, round(limit - projected, 1))} sa
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <div className="text-xs text-slate-400">Haftalık bilgi yüklenemedi</div>
                  )}
                </div>
              </>
            )}

            {/* Aylık Çalışma Özeti — Fazla Mesai Talepleri */}
            {requestType === 'OVERTIME' && request.employee_monthly_stats && (() => {
              const s = request.employee_monthly_stats;
              const otApprovedHours = round((s.ot_total_approved_minutes || 0) / 60, 1);
              const thisReqHours = request.total_hours || (request.duration_seconds ? round(request.duration_seconds / 3600, 1) : 0);
              return (
              <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-amber-600" />
                  <h4 className="text-sm font-bold text-amber-700">Aylık Çalışma Özeti</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Hedef</span>
                    <span className="block font-black text-slate-700 text-lg">{s.target_hours}s</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Tamamlanan</span>
                    <span className="block font-black text-emerald-600 text-lg">{s.completed_hours}s</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Eksik</span>
                    <span className={`block font-black text-lg ${s.missing_hours > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {s.missing_hours}s
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white p-2 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Net Bakiye</span>
                    <span className={`block font-bold text-sm ${s.is_surplus ? 'text-emerald-600' : 'text-red-600'}`}>
                      {s.is_surplus ? '+' : ''}{s.net_balance_hours}s
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 bg-emerald-50">
                    <span className="block text-[10px] text-emerald-500 font-bold uppercase">Onaylı OT</span>
                    <span className="block font-bold text-sm text-emerald-700">{otApprovedHours} sa</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200 bg-amber-50">
                    <span className="block text-[10px] text-amber-500 font-bold uppercase">Bekleyen OT</span>
                    <span className="block font-bold text-sm text-amber-700">{s.ot_requests_pending} talep</span>
                  </div>
                </div>
                {request.status === 'PENDING' && (
                  <div className="text-xs text-amber-700 font-bold bg-white/60 rounded-lg p-2 border border-amber-100">
                    Bu talep onaylanırsa toplam onaylı OT: {round(otApprovedHours + thisReqHours, 1)} sa
                  </div>
                )}
              </div>
              );
            })()}

            {/* ── Collapsible: Giriş/Çıkış Logları ── */}
            {requestType === 'OVERTIME' && request.attendance_logs?.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleSection('logs')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <LogIn size={14} className="text-slate-500" />
                    Giriş/Çıkış Logları ({request.attendance_logs.length})
                  </span>
                  {expandedSections.logs ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>
                {expandedSections.logs && (
                  <div className="p-3 space-y-2">
                    {request.attendance_logs.map((log, i) => (
                      <div key={log.id || i} className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 min-w-[80px]">
                          <LogIn size={12} className="text-emerald-500" />
                          <span className="font-bold text-emerald-700">{log.check_in || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-[80px]">
                          <LogOut size={12} className="text-red-500" />
                          <span className="font-bold text-red-700">{log.check_out || '—'}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-3 text-slate-500">
                          <span>Normal: <span className="font-bold text-slate-700">{round(log.normal_seconds / 3600, 1)}s</span></span>
                          <span>OT: <span className="font-bold text-amber-700">{round(log.overtime_seconds / 3600, 1)}s</span></span>
                          <span>Mola: <span className="font-bold text-blue-700">{Math.round(log.break_seconds / 60)}dk</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Collapsible: İlişkili Yemek Talebi ── */}
            {requestType === 'OVERTIME' && request.employee_meal_info && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleSection('meal')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Utensils size={14} className="text-orange-500" />
                    İlişkili Yemek Talebi
                  </span>
                  {expandedSections.meal ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>
                {expandedSections.meal && (
                  <div className="p-3">
                    <div className="bg-white rounded-lg p-3 border border-slate-100 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Durum</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          request.employee_meal_info.status === 'APPROVED' || request.employee_meal_info.status === 'ORDERED' ? 'bg-emerald-50 text-emerald-700' :
                          request.employee_meal_info.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {request.employee_meal_info.status === 'APPROVED' ? 'Onaylı' :
                           request.employee_meal_info.status === 'ORDERED' ? 'Sipariş Edildi' :
                           request.employee_meal_info.status === 'PENDING' ? 'Beklemede' :
                           request.employee_meal_info.status === 'REJECTED' ? 'Reddedildi' : request.employee_meal_info.status}
                        </span>
                      </div>
                      {request.employee_meal_info.description && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Açıklama</span>
                          <span className="text-slate-800 font-medium">{request.employee_meal_info.description}</span>
                        </div>
                      )}
                      {request.employee_meal_info.order_note && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Sipariş Notu</span>
                          <span className="text-slate-800">{request.employee_meal_info.order_note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Collapsible: Atama Bilgisi (INTENDED) ── */}
            {requestType === 'OVERTIME' && request.source_type === 'INTENDED' && request.assignment && (
              <div className="border border-emerald-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleSection('assignment')} className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <ClipboardList size={14} className="text-emerald-500" />
                    Atama Bilgisi
                  </span>
                  {expandedSections.assignment ? <ChevronDown size={16} className="text-emerald-400" /> : <ChevronRight size={16} className="text-emerald-400" />}
                </button>
                {expandedSections.assignment && (
                  <div className="p-3">
                    <div className="bg-white rounded-lg p-3 border border-emerald-100 space-y-2 text-sm">
                      {request.assignment_details?.assigned_by_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Atayan Yönetici</span>
                          <span className="font-bold text-slate-800">{request.assignment_details.assigned_by_name}</span>
                        </div>
                      )}
                      {request.assignment_details?.max_duration_hours && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Max Süre</span>
                          <span className="font-bold text-amber-700">{request.assignment_details.max_duration_hours} saat</span>
                        </div>
                      )}
                      {request.assignment_details?.task_description && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Görev Açıklaması</span>
                          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2">{request.assignment_details.task_description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {requestType === 'CARDLESS_ENTRY' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Tarih</span>
                  <span className="text-sm text-slate-800">{formatDate(request.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Giriş Saati</span>
                  <span className="text-sm text-slate-800">{request.check_in_time?.substring(0, 5)}</span>
                </div>
                {request.check_out_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Çıkış Saati</span>
                    <span className="text-sm text-slate-800">{request.check_out_time?.substring(0, 5)}</span>
                  </div>
                )}
              </>
            )}

            {(request.reason || request.description) && (() => {
              const text = request.reason || request.description;
              const isLong = text.length > 200;
              return (
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-sm font-medium text-slate-600 block mb-1">Gerekçe</span>
                  <p className={`text-sm text-slate-700 whitespace-pre-wrap break-words ${isLong && !showFullReason ? 'line-clamp-3' : ''}`}>
                    {text}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => setShowFullReason(prev => !prev)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 mt-1"
                    >
                      {showFullReason ? 'Daha az göster' : 'Devamını oku...'}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Onay / Karar Bilgisi */}
            {(() => {
              const isHealthType = requestType === 'HEALTH_REPORT' || requestType === 'HOSPITAL_VISIT';
              const targetName = isHealthType ? 'Muhasebe' : (request.target_approver_name || request.target_approver_detail?.full_name || request.approver_target?.name);
              const approvedByName = request.approved_by_name || request.approved_by_detail?.full_name;
              const targetDept = isHealthType ? null : (request.target_approver_detail?.department_name || request.approver_target?.department);

              if (!targetName && !approvedByName) return null;
              return (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Onay Bilgisi</div>
                  <div className="space-y-2">
                    {/* Hedef Onaylayıcı */}
                    {targetName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Onaya Gönderilen</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-700 font-bold">{targetName}</span>
                          {targetDept && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{targetDept}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Onaylayan / Reddeden */}
                    {approvedByName && request.status !== 'PENDING' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">
                          {['APPROVED', 'ORDERED'].includes(request.status) ? 'Onaylayan' : 'Reddeden'}
                        </span>
                        <span className={`text-sm font-bold ${['APPROVED', 'ORDERED'].includes(request.status) ? 'text-emerald-700' : 'text-red-700'}`}>
                          {approvedByName}
                        </span>
                      </div>
                    )}
                    {/* Onay Tarihi */}
                    {request.approved_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Karar Tarihi</span>
                        <span className="text-sm text-slate-700">
                          {new Date(request.approved_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })}
                          {' '}
                          <span className="text-slate-400">{new Date(request.approved_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Rejection Reason */}
            {request.status === 'REJECTED' && request.rejection_reason && (
              <div className="pt-3 border-t border-red-200">
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                    <XCircle size={16} />
                    Red Sebebi
                  </div>
                  <p className="text-sm text-red-600 leading-relaxed">{request.rejection_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* OT Auto-Approval Warning for External Duty */}
          {request?.request_type_detail?.category === 'EXTERNAL_DUTY' &&
           request?.status === 'PENDING' &&
           dutyPreview?.totals?.total_overtime_minutes > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700 flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                Onay ile birlikte <strong>
                {Math.floor(dutyPreview.totals.total_overtime_minutes / 60)}s {dutyPreview.totals.total_overtime_minutes % 60}dk
                </strong> ek mesai otomatik onaylanacaktır.
              </span>
            </div>
          )}

          {/* Override Button */}
          {canOverride && (() => {
            const isOwnDecision = request?.approval_manager_name === user?.employee?.full_name
              || request?.approved_by_name === user?.employee?.full_name
              || request?.approved_by_detail?.full_name === user?.employee?.full_name;
            return (
              <button
                onClick={() => setShowOverrideModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                <Shield size={20} />
                {isOwnDecision ? 'Kararımı Değiştir' : 'Karar Değiştir'}
              </button>
            );
          })()}

          {/* Decision History */}
          {getContentTypeId() && (
            <DecisionHistoryTimeline
              contentType={getContentTypeId()}
              objectId={request.id}
            />
          )}
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="p-4 bg-blue-50 border-t border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Talebi Düzenle</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(EDIT_FIELDS_MAP[requestType] || []).map(field => renderEditField(field))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {mode !== 'incoming' && requestType === 'LEAVE' && request.request_type_detail?.code === 'ANNUAL_LEAVE' && !isEditing && (
              <button
                onClick={() => handleDownloadPetition(request.id)}
                disabled={petitionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                {petitionLoading ? 'Hazırlanıyor...' : 'Dilekçe İndir'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Incoming mode: Approve/Reject buttons */}
            {mode === 'incoming' && request?.status === 'PENDING' && request?.is_actionable !== false && onApprove && !rejectMode && !isEditing && (
              <>
                <button
                  onClick={handleModalApprove}
                  disabled={approveLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Check size={16} />
                  {approveLoading ? 'Onaylanıyor...' : 'Onayla'}
                </button>
                <button
                  onClick={() => setRejectMode(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-xl transition-colors"
                >
                  <X size={16} />
                  Reddet
                </button>
              </>
            )}
            {/* Reject reason input */}
            {mode === 'incoming' && rejectMode && !isEditing && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && rejectReason.trim()) handleModalReject();
                    if (e.key === 'Escape') { setRejectMode(false); setRejectReason(''); }
                  }}
                  placeholder="Reddetme sebebi..."
                  className="w-64 px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                />
                <button
                  onClick={handleModalReject}
                  disabled={!rejectReason.trim() || rejectLoading}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {rejectLoading ? 'Reddediliyor...' : 'Gönder'}
                </button>
                <button
                  onClick={() => { setRejectMode(false); setRejectReason(''); }}
                  className="px-3 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-bold rounded-xl transition-colors"
                >
                  Vazgeç
                </button>
              </div>
            )}
            {canEditOrCancel && !isEditing && (
              <>
                <button
                  onClick={startEditing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-sm flex items-center gap-1.5"
                >
                  <Edit3 size={14} />
                  Düzenle
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelLoading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {cancelLoading ? 'İptal ediliyor...' : 'İptal Et'}
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium text-sm"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSave}
                  disabled={editLoading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium text-sm disabled:opacity-50"
                >
                  {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>

      {/* Override Modal */}
      <ModalOverlay open={showOverrideModal} onClose={() => { setShowOverrideModal(false); setError(''); }} level="secondary">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Karar Değiştir</h3>
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-purple-700">
                <AlertCircle size={16} className="mt-0.5" />
                <p>
                  Bu işlem önceki yönetici kararını geçersiz kılacaktır.
                  Bu işlem geri alınamaz.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Karar <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setOverrideAction('approve')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${overrideAction === 'approve'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-green-300'
                    }`}
                >
                  <CheckCircle size={18} className="inline mr-2" />
                  Onayla
                </button>
                <button
                  onClick={() => setOverrideAction('reject')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${overrideAction === 'reject'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-red-300'
                    }`}
                >
                  <XCircle size={18} className="inline mr-2" />
                  Reddet
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Gerekçe <span className="text-red-500">*</span>
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Override gerekçesini yazınız..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setError('');
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                İptal
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${
                  overrideAction === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {loading ? 'İşleniyor...' : (overrideAction === 'reject' ? 'Reddet' : 'Onayla')}
              </button>
            </div>
          </div>
      </ModalOverlay>

    </>
  );
};

export default RequestDetailModal;
