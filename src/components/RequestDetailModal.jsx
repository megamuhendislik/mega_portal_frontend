import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Clock, Calendar, FileText, AlertCircle, Shield, Lock, CheckCircle, XCircle, Briefcase } from 'lucide-react';
// CardlessEntry fixes: dynamic ContentType ID, override_decision support
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DecisionHistoryTimeline from './DecisionHistoryTimeline';

const RequestDetailModal = ({ isOpen, onClose, request, requestType, onUpdate }) => {
  const { hasPermission } = useAuth();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState('approve');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLockInfo, setTimeLockInfo] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (isOpen && request) {
      fetchTimeLockInfo();
    }
  }, [isOpen, request]);

  useEffect(() => {
    if (isOpen && request && requestType === 'LEAVE') {
      api.get(`/leave/requests/?employee_id=${request.employee}&status=APPROVED&ordering=-start_date&page_size=5`)
        .then(res => {
          const data = res.data?.results || res.data || [];
          setEmployeeHistory(data.slice(0, 5));
        })
        .catch(() => setEmployeeHistory([]));
    } else {
      setEmployeeHistory([]);
    }
  }, [isOpen, request, requestType]);

  const fetchTimeLockInfo = async () => {
    if (!request) return;

    const today = new Date();
    // Use lock_date from backend (fiscal period based) if available
    const lockDateStr = request.lock_date || request.immutable_date;
    let lockDate;
    let isLocked = request.is_immutable || false;

    if (lockDateStr) {
      lockDate = new Date(lockDateStr + 'T23:59:59');
      if (today > lockDate) isLocked = true;
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
      event_date: new Date(request.start_date || request.date).toLocaleDateString('tr-TR'),
      lock_date: lockDate.toLocaleDateString('tr-TR'),
      days_until_lock: daysUntilLock > 0 ? daysUntilLock : 0
    });
  };

  const handleOverrideSubmit = async () => {
    if (!overrideReason.trim()) {
      setError('Gerekçe zorunludur');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = requestType === 'LEAVE'
        ? `/leave/requests/${request.id}/override_decision/`
        : requestType === 'OVERTIME'
          ? `/overtime-requests/${request.id}/override_decision/`
          : `/cardless-entry-requests/${request.id}/override_decision/`;

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

  const handleManagerCancel = async () => {
    if (!cancelReason.trim()) {
      setError('İptal gerekçesi zorunludur');
      return;
    }
    setCancelLoading(true);
    setError('');
    try {
      await api.post(`/leave/requests/${request.id}/manager-cancel/`, {
        reason: cancelReason
      });
      setShowCancelModal(false);
      setCancelReason('');
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'İptal işlemi başarısız oldu');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadDocx = async (requestId) => {
    setDownloadLoading(true);
    try {
      const response = await api.get(`/leave/requests/${requestId}/export-docx/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `izin_talebi_${requestId}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX indirme hatasi:', err);
      setError('DOCX dosyası indirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setDownloadLoading(false);
    }
  };

  if (!isOpen || !request) return null;

  const canOverride = hasPermission('SYSTEM_FULL_ACCESS') &&
    !timeLockInfo?.is_locked &&
    request.status !== 'PENDING';

  const getContentTypeId = () => {
    return request?.content_type_id || null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Talep Detayları</h2>
            <p className="text-sm text-slate-600 mt-1">
              {requestType === 'LEAVE' ? 'İzin Talebi' :
                requestType === 'OVERTIME' ? 'Fazla Mesai Talebi' :
                  requestType === 'CARDLESS_ENTRY' ? 'Kartsız Giriş Talebi' : 'Talep'}
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Durum</span>
              {getStatusBadge(request.status)}
            </div>

            {request.employee_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Talep Eden</span>
                <span className="text-sm font-semibold text-slate-800">{request.employee_name}</span>
              </div>
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
                {/* Yil Bazli Kesim */}
                {request.usage_breakdown && Object.keys(request.usage_breakdown).length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase mb-1 block">Yil Bazli Kesim</span>
                    <div className="space-y-1">
                      {Object.entries(request.usage_breakdown).sort(([a], [b]) => a.localeCompare(b)).map(([year, days]) => (
                        <div key={year} className="flex justify-between text-xs bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                          <span className="text-slate-600">{year} yili</span>
                          <span className="font-bold text-indigo-700">{days} gun</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Calisan Izin Bakiye Bilgisi - Yonetici Gorunumu */}
            {requestType === 'LEAVE' && request.employee_annual_leave_balance && (
              <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={16} className="text-blue-600" />
                  <h4 className="text-sm font-bold text-blue-700">Calisan Izin Bilgisi</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Kalan Bakiye</span>
                    <span className="block font-black text-blue-700 text-lg">{request.employee_annual_leave_balance.remaining}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Kullanilan</span>
                    <span className="block font-black text-amber-600 text-lg">{request.employee_annual_leave_balance.used || 0}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Talep Sonrasi</span>
                    <span className={`block font-black text-lg ${
                      (request.employee_annual_leave_balance.remaining - request.total_days) < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>{request.employee_annual_leave_balance.remaining - request.total_days}</span>
                  </div>
                </div>
                {/* Kidem ve Hakedis */}
                <div className="flex items-center justify-between text-xs bg-white/60 p-2 rounded-lg">
                  {request.employee_annual_leave_balance.years_of_service !== undefined && (
                    <span className="text-slate-600">
                      Kidem: <span className="font-bold text-slate-800">{request.employee_annual_leave_balance.years_of_service} Yil</span>
                    </span>
                  )}
                  {request.employee_annual_leave_balance.entitlement_tier !== undefined && (
                    <span className="text-slate-600">
                      Yillik Hak: <span className="font-bold text-emerald-700">{request.employee_annual_leave_balance.entitlement_tier} Gun</span>
                    </span>
                  )}
                  {request.employee_annual_leave_balance.last_leave_date && (
                    <span className="text-slate-600">
                      Son Izin: <span className="font-bold text-slate-800">{new Date(request.employee_annual_leave_balance.last_leave_date).toLocaleDateString('tr-TR')}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Calisanin Son Onayli Izinleri */}
            {requestType === 'LEAVE' && employeeHistory.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-600 mb-2.5 flex items-center gap-1.5">
                  <Calendar size={14} />
                  Calisanin Son Onayli Izinleri
                </h4>
                <div className="space-y-1.5">
                  {employeeHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="font-medium text-slate-700">{h.leave_type_name || h.request_type_detail?.name || 'Izin'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          {h.start_date ? new Date(h.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                        <span className="font-bold text-slate-700">{h.total_days} gun</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requestType === 'OVERTIME' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Tarih</span>
                  <span className="text-sm text-slate-800">{formatDate(request.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Saat Aralığı</span>
                  <span className="text-sm text-slate-800">
                    {request.start_time?.substring(0, 5)} - {request.end_time?.substring(0, 5)}
                  </span>
                </div>
              </>
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

            {request.reason && (
              <div className="pt-3 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-600 block mb-1">Gerekçe</span>
                <p className="text-sm text-slate-700">{request.reason}</p>
              </div>
            )}

            {/* Hedef Onaylayici */}
            {(request.target_approver_name || request.target_approver_detail?.full_name || request.approver_target?.name) && (
              <div className="pt-3 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-600 block mb-1">Onaya Gonderilen</span>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-blue-700 font-semibold">
                    {request.target_approver_name || request.target_approver_detail?.full_name || request.approver_target?.name}
                  </p>
                  {request.target_approver_detail?.department_name && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {request.target_approver_detail.department_name}
                    </span>
                  )}
                  {request.target_approver_detail?.relationship && (
                    <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                      {request.target_approver_detail.relationship === 'PRIMARY' ? 'Birincil Yonetici' :
                       request.target_approver_detail.relationship === 'SECONDARY' ? 'Ikincil Yonetici' :
                       request.target_approver_detail.relationship === 'DEPT_MANAGER' ? 'Departman Yoneticisi' :
                       'Yonetici'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {request.approved_by_name && (
              <div className="pt-3 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-600 block mb-1">Onaylayan</span>
                <p className="text-sm text-slate-700">{request.approved_by_name}</p>
              </div>
            )}

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

          {/* Manager Cancel Button */}
          {requestType === 'LEAVE' && request.status === 'APPROVED' && !timeLockInfo?.is_locked && (hasPermission('APPROVAL_LEAVE') || hasPermission('SYSTEM_FULL_ACCESS')) && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
            >
              <XCircle size={20} />
              Izni Iptal Et
            </button>
          )}

          {/* Override Button */}
          {canOverride && (
            <button
              onClick={() => setShowOverrideModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              <Shield size={20} />
              Üst Yönetici Müdahalesi
            </button>
          )}

          {/* Decision History */}
          {getContentTypeId() && (
            <DecisionHistoryTimeline
              contentType={getContentTypeId()}
              objectId={request.id}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            {(requestType === 'LEAVE' || request.leave_type_name || request.request_type_detail) && (
              <button
                onClick={() => handleDownloadDocx(request.id)}
                disabled={downloadLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={16} />
                {downloadLoading ? 'Indiriliyor...' : 'Resmi Form Indir (DOCX)'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
          >
            Kapat
          </button>
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Üst Yönetici Müdahalesi</h3>
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
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Izin Iptali</h3>
              <button onClick={() => { setShowCancelModal(false); setError(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5" />
                <p>Bu islem onayli izni iptal edecek ve kullanilan izin gunleri iade edilecektir.</p>
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Iptal Gerekcesi <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Iptal gerekcesini yaziniz..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowCancelModal(false); setError(''); }} className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition">
                Vazgec
              </button>
              <button onClick={handleManagerCancel} disabled={cancelLoading} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                {cancelLoading ? 'Isleniyor...' : 'Iptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default RequestDetailModal;
