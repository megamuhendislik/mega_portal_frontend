import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { message } from 'antd';
import api from '../../services/api';
import WeeklyOTLimitBar from './WeeklyOTLimitBar';
import OTCategoryCards from './OTCategoryCards';
import IntendedClaimList from './IntendedClaimList';
import PotentialClaimList from './PotentialClaimList';
import ManualEntryForm from './ManualEntryForm';
import ClaimConfirmPanel from './ClaimConfirmPanel';

function getIstanbulToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

export default function OvertimeClaimModal({ open, onClose, onSuccess }) {
  const [claimableData, setClaimableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Navigasyon: 'categories' | 'intended' | 'potential' | 'manual' | 'confirm'
  const [view, setView] = useState('categories');
  const [confirmData, setConfirmData] = useState(null);

  // Manuel form state
  const [manualForm, setManualForm] = useState({
    date: getIstanbulToday(),
    start_time: '',
    end_time: '',
    reason: '',
    send_to_substitute: false,
  });
  const [selectedApproverId, setSelectedApproverId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [claimRes, mgrRes] = await Promise.allSettled([
        api.get('/overtime-requests/claimable/'),
        api.get('/overtime-requests/my-managers/'),
      ]);
      if (claimRes.status === 'fulfilled') setClaimableData(claimRes.value.data);
      if (mgrRes.status === 'fulfilled') {
        const mgrs = mgrRes.value.data;
        setApprovers(mgrs);
        if (mgrs.length === 1) setSelectedApproverId(mgrs[0].id);
      }
    } catch (err) {
      console.error('Claimable fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setView('categories');
      setConfirmData(null);
      fetchData();
    }
  }, [open, fetchData]);

  const intended = claimableData?.intended || [];
  const potential = claimableData?.potential || [];
  const weeklyStatus = claimableData?.weekly_ot_status || null;

  const intendedClaimable = intended.filter(i => i.can_claim || i.is_rejected);
  const intendedRejCount = intended.filter(i => i.is_rejected).length;
  const potentialClaimable = potential.filter(p => p.can_claim || p.is_rejected);
  const potentialRejCount = potential.filter(p => p.is_rejected).length;

  const goBack = () => {
    if (view === 'confirm') {
      setView(confirmData?.type === 'intended' ? 'intended' : 'potential');
      setConfirmData(null);
    } else {
      setView('categories');
    }
  };

  const handleIntendedClaim = (item) => {
    setConfirmData({ type: 'intended', claimTarget: item });
    setView('confirm');
  };

  const handlePotentialClaim = (dayGroup) => {
    setConfirmData({ type: 'potential', claimTarget: dayGroup });
    setView('confirm');
  };

  const handleConfirm = async (payload) => {
    setSubmitting(true);
    try {
      if (payload.type === 'intended') {
        await api.post(`/overtime-requests/${payload.claimTarget.assignment_id}/claim/`, {
          reason: payload.reason,
          target_approver_id: payload.target_approver_id,
        });
      } else {
        const ids = payload.selected_ids;
        await api.post('/overtime-requests/claim-potential/', {
          overtime_request_ids: ids,
          reason: payload.reason,
          target_approver_id: payload.target_approver_id,
          excluded_ids: payload.excluded_ids,
        });
      }
      message.success('Ek mesai talebi gönderildi');
      await fetchData();
      setView('categories');
      setConfirmData(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Talep gönderilemedi';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/overtime-requests/manual-entry/', {
        date: manualForm.date,
        start_time: manualForm.start_time,
        end_time: manualForm.end_time,
        reason: manualForm.reason,
        target_approver_id: selectedApproverId,
        send_to_substitute: manualForm.send_to_substitute,
      });
      message.success('Manuel ek mesai talebi oluşturuldu');
      setManualForm({ date: getIstanbulToday(), start_time: '', end_time: '', reason: '', send_to_substitute: false });
      await fetchData();
      setView('categories');
      if (onSuccess) onSuccess();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Talep gönderilemedi';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">Fazla Mesai Talebi</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {view === 'categories' && (
                  <div className="animate-fadeIn">
                    <WeeklyOTLimitBar weeklyStatus={weeklyStatus} />
                    <div className="mt-4">
                      <OTCategoryCards
                        intendedCount={intendedClaimable.length - intendedRejCount}
                        intendedRejCount={intendedRejCount}
                        potentialCount={potentialClaimable.length - potentialRejCount}
                        potentialRejCount={potentialRejCount}
                        onSelect={(cat) => setView(cat)}
                      />
                    </div>
                  </div>
                )}

                {view === 'intended' && (
                  <div className="animate-slideInRight">
                    <IntendedClaimList
                      items={intended}
                      weeklyStatus={weeklyStatus}
                      onBack={goBack}
                      onClaim={handleIntendedClaim}
                      claimingId={claimingId}
                    />
                  </div>
                )}

                {view === 'potential' && (
                  <div className="animate-slideInRight">
                    <PotentialClaimList
                      items={potential}
                      weeklyStatus={weeklyStatus}
                      onBack={goBack}
                      onClaim={handlePotentialClaim}
                      claimingId={claimingId}
                    />
                  </div>
                )}

                {view === 'manual' && (
                  <div className="animate-slideInRight">
                    <ManualEntryForm
                      weeklyStatus={weeklyStatus}
                      form={manualForm}
                      setForm={setManualForm}
                      approvers={approvers}
                      selectedApproverId={selectedApproverId}
                      onApproverSelect={setSelectedApproverId}
                      onBack={goBack}
                      onSubmit={handleManualSubmit}
                      submitting={submitting}
                    />
                  </div>
                )}

                {view === 'confirm' && confirmData && (
                  <div className="animate-slideInRight">
                    <ClaimConfirmPanel
                      type={confirmData.type}
                      claimTarget={confirmData.claimTarget}
                      weeklyStatus={weeklyStatus}
                      approvers={approvers}
                      onBack={goBack}
                      onConfirm={handleConfirm}
                      submitting={submitting}
                    />
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}
