import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Clock, Calendar, FileText, AlertCircle, Shield, Lock, CheckCircle, XCircle } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen && request) {
      fetchTimeLockInfo();
    }
  }, [isOpen, request]);

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
        ? `/api/leave/requests/${request.id}/override_decision/`
        : requestType === 'OVERTIME'
          ? `/api/overtime-requests/${request.id}/override_decision/`
          : `/api/cardless-entry-requests/${request.id}/override_decision/`;

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

  if (!isOpen || !request) return null;

  const canOverride = hasPermission('SYSTEM_FULL_ACCESS') &&
    !timeLockInfo?.is_locked &&
    request.status !== 'PENDING';

  const getContentTypeId = () => {
    if (requestType === 'LEAVE') return 31; // LeaveRequest content type ID
    if (requestType === 'OVERTIME') return 32; // OvertimeRequest content type ID
    if (requestType === 'CARDLESS_ENTRY') return 33; // CardlessEntryRequest content type ID
    return null;
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
      'REJECTED': { bg: 'bg-red-100', text: 'text-red-700', label: 'Reddedildi' },
      'CANCELLED': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'İptal Edildi' }
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
              </>
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

            {/* Hedef Onaylayıcı */}
            {(request.target_approver_name || request.target_approver_detail?.full_name || request.approver_target?.name) && (
              <div className="pt-3 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-600 block mb-1">Onaya Gönderilen</span>
                <p className="text-sm text-blue-700 font-semibold">
                  {request.target_approver_name || request.target_approver_detail?.full_name || request.approver_target?.name}
                </p>
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
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
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
    </div>,
    document.body
  );
};

export default RequestDetailModal;
