import { useState } from 'react';
import {
  Clock, CheckCircle, XCircle, Send, X,
  AlertTriangle, User, Shield, Briefcase
} from 'lucide-react';
import { fmtH, fmtSec } from '../../utils/dateUtils';
import { Tag, Button, Popconfirm, Input, message } from 'antd';
import api from '../../services/api';

const STATUS_CONFIG = {
  APPROVED: { label: 'Onaylı', color: 'green' },
  PENDING: { label: 'Bekliyor', color: 'orange' },
  REJECTED: { label: 'Reddedildi', color: 'red' },
  CANCELLED: { label: 'İptal', color: 'default' },
  POTENTIAL: { label: 'Algılanan', color: 'blue' },
};

const SOURCE_CONFIG = {
  INTENDED: { label: 'Planlı', color: 'cyan' },
  POTENTIAL: { label: 'Algılanan', color: 'purple' },
  MANUAL: { label: 'Manuel', color: 'blue' },
};

const RELATIONSHIP_LABELS = {
  PRIMARY: 'Birincil',
  SECONDARY: 'İkincil',
};

const OT_TYPE_LABELS = {
  PRE_SHIFT: 'Vardiya Öncesi',
  POST_SHIFT: 'Vardiya Sonrası',
  OFF_DAY: 'Tatil Mesaisi',
  MIXED: 'Karışık',
};

const ASSIGNMENT_STATUS = {
  ASSIGNED: { label: 'Atandı', color: 'blue' },
  CLAIMED: { label: 'Talep Edildi', color: 'green' },
  EXPIRED: { label: 'Süresi Doldu', color: 'default' },
  CANCELLED: { label: 'İptal', color: 'red' },
};

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 dk';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} sa ${m} dk`;
  if (h > 0) return `${h} sa`;
  return `${m} dk`;
}

export default function OTDayDetailPanel({
  dayData,
  onClose,
  onClaim,
  onClaimAll,
  onOverride,
  onRefresh,
  isManager = false,
  isOwnData = true,
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  if (!dayData) return null;

  const { date, requests = [], assignments = [], potentials = [] } = dayData;

  const handleApprove = async (requestId) => {
    setActionLoading(`approve-${requestId}`);
    try {
      await api.post(`/overtime-requests/${requestId}/approve_reject/`, { action: 'approve' });
      message.success('Talep onaylandı');
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'Onaylama hatası');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId, reason) => {
    setActionLoading(`reject-${requestId}`);
    try {
      await api.post(`/overtime-requests/${requestId}/approve_reject/`, {
        action: 'reject',
        reason: reason || 'Reddedildi'
      });
      message.success('Talep reddedildi');
      setRejectReason('');
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'Reddetme hatası');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelAssignment = async (assignmentId) => {
    setActionLoading(`cancel-asgn-${assignmentId}`);
    try {
      await api.post(`/overtime-assignments/${assignmentId}/cancel/`);
      message.success('Atama iptal edildi');
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'Atama iptal hatası');
    } finally {
      setActionLoading(null);
    }
  };

  const hasContent = requests.length > 0 || assignments.length > 0 || potentials.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          {date} - Gün Detayı
        </h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {!hasContent && (
        <div className="text-center py-6 text-slate-400 text-sm">
          Bu gün için kayıt bulunmuyor.
        </div>
      )}

      {/* Requests Section */}
      {requests.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Briefcase size={12} />
            Talepler ({requests.length})
          </h5>
          <div className="space-y-2">
            {requests.map((req) => {
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              const sourceCfg = SOURCE_CONFIG[req.source_type] || SOURCE_CONFIG.MANUAL;

              return (
                <div
                  key={req.id}
                  className="border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <Tag color={statusCfg.color} className="!text-[10px] !font-bold !m-0">
                          {statusCfg.label}
                        </Tag>
                        <Tag color={sourceCfg.color} className="!text-[10px] !font-bold !m-0">
                          {sourceCfg.label}
                        </Tag>
                        {req.ot_type && (
                          <Tag className="!text-[10px] !font-bold !m-0">
                            {OT_TYPE_LABELS[req.ot_type] || req.ot_type}
                          </Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        {req.start_time && req.end_time && (
                          <span className="font-medium">
                            {req.start_time.slice(0, 5)} - {req.end_time.slice(0, 5)}
                          </span>
                        )}
                        {req.duration_seconds > 0 && (
                          <span className="text-slate-500">
                            {formatDuration(req.duration_seconds)}
                          </span>
                        )}
                        {req.actual_overtime_hours > 0 && (
                          <span className="font-bold text-purple-700">
                            {req.actual_overtime_hours} sa
                          </span>
                        )}
                      </div>
                      {req.assigned_by && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <User size={10} />
                          <span>{req.assigned_by.name}</span>
                          {req.assigned_by.relationship_type && (
                            <Tag className="!text-[9px] !m-0 !px-1">
                              {RELATIONSHIP_LABELS[req.assigned_by.relationship_type] || req.assigned_by.relationship_type}
                            </Tag>
                          )}
                        </div>
                      )}
                      {req.reason && (
                        <p className="text-[11px] text-slate-400 truncate">{req.reason}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Manager approve/reject */}
                      {isManager && req.status === 'PENDING' && (
                        <>
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckCircle size={12} />}
                            loading={actionLoading === `approve-${req.id}`}
                            onClick={() => handleApprove(req.id)}
                            className="!text-[10px] !font-bold !flex !items-center !gap-1"
                          >
                            Onayla
                          </Button>
                          <Popconfirm
                            title="Talebi Reddet"
                            description={
                              <Input.TextArea
                                placeholder="Ret sebebi..."
                                rows={2}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="!mt-2"
                              />
                            }
                            onConfirm={() => handleReject(req.id, rejectReason)}
                            okText="Reddet"
                            cancelText="Vazgeç"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              danger
                              size="small"
                              icon={<XCircle size={12} />}
                              loading={actionLoading === `reject-${req.id}`}
                              className="!text-[10px] !font-bold !flex !items-center !gap-1"
                            >
                              Reddet
                            </Button>
                          </Popconfirm>
                        </>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assignments Section */}
      {assignments.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield size={12} />
            Atamalar ({assignments.length})
          </h5>
          <div className="space-y-2">
            {assignments.map((asgn) => {
              const statusCfg = ASSIGNMENT_STATUS[asgn.status] || ASSIGNMENT_STATUS.ASSIGNED;

              return (
                <div
                  key={asgn.id}
                  className="border border-purple-100 bg-purple-50/30 rounded-lg p-3 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <Tag color={statusCfg.color} className="!text-[10px] !font-bold !m-0">
                          {statusCfg.label}
                        </Tag>
                        <span className="text-xs font-bold text-purple-700">
                          Maks: {asgn.max_duration_hours} sa
                        </span>
                      </div>
                      {asgn.assigned_by && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <User size={10} />
                          <span>Atayan: {asgn.assigned_by.name || asgn.assigned_by_name || 'Bilinmeyen'}</span>
                          {asgn.assigned_by.relationship_type && (
                            <Tag className="!text-[9px] !m-0 !px-1">
                              {RELATIONSHIP_LABELS[asgn.assigned_by.relationship_type] || asgn.assigned_by.relationship_type}
                            </Tag>
                          )}
                        </div>
                      )}
                      {asgn.task_description && (
                        <p className="text-[11px] text-slate-400 truncate">{asgn.task_description}</p>
                      )}
                      {asgn.employee_name && (
                        <div className="text-[11px] text-slate-500">
                          <span className="font-medium">{asgn.employee_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Cancel own assignment (manager) */}
                      {isManager && asgn.status === 'ASSIGNED' && !asgn.is_override_target && (
                        <Popconfirm
                          title="Atamayı iptal etmek istiyor musunuz?"
                          onConfirm={() => handleCancelAssignment(asgn.id)}
                          okText="İptal Et"
                          cancelText="Vazgeç"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            danger
                            size="small"
                            icon={<XCircle size={12} />}
                            loading={actionLoading === `cancel-asgn-${asgn.id}`}
                            className="!text-[10px] !font-bold !flex !items-center !gap-1"
                          >
                            İptal
                          </Button>
                        </Popconfirm>
                      )}

                      {/* Override (PRIMARY manager on SECONDARY's assignment) */}
                      {isManager && asgn.status === 'ASSIGNED' && asgn.is_override_target && (
                        <Button
                          size="small"
                          icon={<Shield size={12} />}
                          onClick={() => onOverride?.(asgn)}
                          className="!text-[10px] !font-bold !flex !items-center !gap-1 !bg-orange-50 !text-orange-600 !border-orange-200 hover:!bg-orange-100"
                        >
                          Override
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Potentials Section — Bundle görünüm */}
      {potentials.length > 0 && (() => {
        const claimable = potentials.filter(p => p.can_claim || (p.actual_overtime_seconds > 0 && !p.already_claimed && !['PENDING', 'APPROVED'].includes(p.claim_status)));
        const nonClaimable = potentials.filter(p => !claimable.includes(p));
        const totalSec = claimable.reduce((s, p) => s + (p.actual_overtime_seconds || p.duration_seconds || 0), 0);
        const minTime = claimable.length > 0 ? claimable.reduce((m, p) => (!m || (p.start_time && p.start_time < m)) ? p.start_time : m, null) : null;
        const maxTime = claimable.length > 0 ? claimable.reduce((m, p) => (!m || (p.end_time && p.end_time > m)) ? p.end_time : m, null) : null;

        return (
          <div>
            <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Algilanan Mesailer
            </h5>

            {/* Bundle kart — claimable olanlar */}
            {claimable.length > 0 && (
              <div className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-blue-800">
                      {claimable.length} segment {minTime && maxTime ? `(${minTime.slice(0, 5)} - ${maxTime.slice(0, 5)})` : ''}
                    </div>
                    <div className="text-lg font-black text-blue-700 mt-0.5">
                      {totalSec >= 3600 ? `${Math.floor(totalSec / 3600)} sa ${Math.round((totalSec % 3600) / 60)} dk` : `${Math.round(totalSec / 60)} dk`}
                    </div>
                  </div>
                  <Button
                    type="primary"
                    icon={<Send size={14} />}
                    onClick={() => onClaimAll?.(claimable)}
                    className="!font-bold !flex !items-center !gap-1.5 !bg-blue-600 hover:!bg-blue-700 !h-9"
                  >
                    Talep Et
                  </Button>
                </div>
                <div className="space-y-1">
                  {claimable.map((pot) => (
                    <div key={pot.id} className="flex items-center justify-between text-xs text-blue-700 bg-white/60 rounded px-2 py-1">
                      <div className="flex items-center gap-2">
                        <Tag color="blue" className="!text-[9px] !font-bold !m-0 !px-1">
                          {OT_TYPE_LABELS[pot.ot_type] || 'Algilanan'}
                        </Tag>
                        <span className="font-medium">
                          {pot.start_time?.slice(0, 5)} - {pot.end_time?.slice(0, 5)}
                        </span>
                      </div>
                      <span className="font-bold">
                        {pot.duration_hours ? fmtH(pot.duration_hours) : pot.actual_overtime_seconds ? fmtSec(pot.actual_overtime_seconds) : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Claimable olmayan potansiyeller (onaylı, bekleyen, reddedilen) */}
            {nonClaimable.length > 0 && (
              <div className="space-y-1.5">
                {nonClaimable.map((pot) => (
                  <div key={pot.id} className="flex items-center justify-between text-xs border border-slate-100 rounded-lg px-3 py-2">
                    <span className="text-slate-600">
                      {pot.start_time?.slice(0, 5)} - {pot.end_time?.slice(0, 5)}
                    </span>
                    {pot.claim_status === 'APPROVED' && <Tag color="green" className="!text-[10px] !font-bold !m-0">Onayli</Tag>}
                    {pot.claim_status === 'PENDING' && <Tag color="orange" className="!text-[10px] !font-bold !m-0">Bekliyor</Tag>}
                    {pot.is_rejected && <Tag color="red" className="!text-[10px] !font-bold !m-0">Reddedildi</Tag>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
