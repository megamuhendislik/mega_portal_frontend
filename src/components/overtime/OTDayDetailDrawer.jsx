import { useState, useCallback } from 'react';
import {
  Clock, CheckCircle, XCircle, X,
  AlertTriangle, User, Shield, Briefcase, Pencil,
} from 'lucide-react';
import { Drawer, Tag, Button, Popconfirm, Input, InputNumber, message, Spin, Collapse } from 'antd';
import api from '../../services/api';
import { getIstanbulToday } from '../../utils/dateUtils';

// --- Config maps ---

const STATUS_CONFIG = {
  APPROVED: { label: 'Onaylı', color: 'green', bg: '#059669' },
  PENDING: { label: 'Bekliyor', color: 'orange', bg: '#d97706' },
  REJECTED: { label: 'Reddedildi', color: 'red', bg: '#dc2626' },
  CANCELLED: { label: 'İptal', color: 'default', bg: '#6b7280' },
  POTENTIAL: { label: 'Algılanan', color: 'blue', bg: '#3b82f6' },
};

const SOURCE_CONFIG = {
  INTENDED: { label: 'Planlı', dotColor: '#06b6d4' },
  POTENTIAL: { label: 'Algılanan', dotColor: '#8b5cf6' },
  MANUAL: { label: 'Manuel', dotColor: '#3b82f6' },
};

const ASSIGNMENT_STATUS = {
  ASSIGNED: { label: 'Atandı', color: 'blue' },
  CLAIMED: { label: 'Talep Edildi', color: 'green' },
  EXPIRED: { label: 'Süresi Doldu', color: 'default' },
  CANCELLED: { label: 'İptal', color: 'red' },
};

const OT_TYPE_LABELS = {
  PRE_SHIFT: 'Vardiya Öncesi',
  POST_SHIFT: 'Vardiya Sonrası',
  OFF_DAY: 'Tatil Mesaisi',
  MIXED: 'Karışık',
};

// --- Helpers ---

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 dk';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} sa ${m} dk`;
  if (h > 0) return `${h} sa`;
  return `${m} dk`;
}

function formatDateTurkish(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  } catch {
    return dateStr;
  }
}

// Status pill component
function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// Source badge
function SourceBadge({ sourceType }) {
  const cfg = SOURCE_CONFIG[sourceType] || SOURCE_CONFIG.MANUAL;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/10 text-gray-300"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
      {cfg.label}
    </span>
  );
}

// --- Request Card ---
function RequestCard({ req, isManager, isOwnData, actionLoading, onApprove, onReject, onCancel, onEditTimes }) {
  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState(req.start_time?.slice(0, 5) || '');
  const [editEnd, setEditEnd] = useState(req.end_time?.slice(0, 5) || '');
  const [rejectReason, setRejectReason] = useState('');

  const isPending = req.status === 'PENDING';
  const isReadOnly = !isPending;

  const handleSaveEdit = () => {
    if (!editStart || !editEnd) {
      message.warning('Başlangıç ve bitiş saatlerini giriniz');
      return;
    }
    onEditTimes(req.id, editStart, editEnd);
    setEditing(false);
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 space-y-2 hover:border-white/20 transition-all duration-200 hover:bg-white/[0.06]">
      {/* Top row: status + source + type */}
      <div className="flex items-center flex-wrap gap-1.5">
        <StatusPill status={req.status} />
        <SourceBadge sourceType={req.source_type} />
        {req.ot_type && (
          <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            {OT_TYPE_LABELS[req.ot_type] || req.ot_type}
          </span>
        )}
      </div>

      {/* Time range + duration */}
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-violet-400 w-24"
          />
          <span className="text-gray-500">-</span>
          <input
            type="time"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-violet-400 w-24"
          />
          <Button size="small" type="primary" onClick={handleSaveEdit} className="!text-[10px]">
            Kaydet
          </Button>
          <Button size="small" onClick={() => setEditing(false)} className="!text-[10px]">
            Vazgeç
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          {req.start_time && req.end_time && (
            <span className="font-medium text-white">
              {req.start_time.slice(0, 5)} - {req.end_time.slice(0, 5)}
            </span>
          )}
          {req.duration_seconds > 0 && (
            <span className="text-gray-400">{formatDuration(req.duration_seconds)}</span>
          )}
          {req.actual_overtime_hours > 0 && (
            <span className="font-bold text-violet-400">{req.actual_overtime_hours} sa</span>
          )}
        </div>
      )}

      {/* Assigned by info */}
      {req.assigned_by && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <User size={10} />
          <span>{req.assigned_by.name}</span>
        </div>
      )}

      {/* Reason */}
      {req.reason && (
        <p className="text-[11px] text-gray-500 truncate">{req.reason}</p>
      )}

      {/* Employee name (team mode) */}
      {req.employee_name && (
        <div className="text-[11px] text-gray-400 font-medium">{req.employee_name}</div>
      )}

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
          {/* Manager: approve/reject */}
          {isManager && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircle size={12} />}
                loading={actionLoading === `approve-${req.id}`}
                onClick={() => onApprove(req.id)}
                className="!text-[10px] !font-bold !flex !items-center !gap-1 !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700"
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
                onConfirm={() => {
                  onReject(req.id, rejectReason);
                  setRejectReason('');
                }}
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

          {/* Edit hours (manager) */}
          {isManager && !editing && (
            <Button
              size="small"
              icon={<Pencil size={11} />}
              onClick={() => setEditing(true)}
              className="!text-[10px] !font-bold !flex !items-center !gap-1 !ml-auto"
            >
              Düzenle
            </Button>
          )}

          {/* Cancel (own) */}
          {isOwnData && (
            <Popconfirm
              title="Talebi iptal etmek istiyor musunuz?"
              onConfirm={() => onCancel(req.id)}
              okText="İptal Et"
              cancelText="Vazgeç"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                size="small"
                icon={<X size={12} />}
                loading={actionLoading === `cancel-req-${req.id}`}
                className="!text-[10px] !font-bold !flex !items-center !gap-1"
              >
                İptal
              </Button>
            </Popconfirm>
          )}
        </div>
      )}
    </div>
  );
}

// --- Assignment Card ---
function AssignmentCard({ asgn, isManager, actionLoading, onCancelAssignment, onEditMaxHours }) {
  const [editing, setEditing] = useState(false);
  const [editHours, setEditHours] = useState(asgn.max_duration_hours || 6);
  const statusCfg = ASSIGNMENT_STATUS[asgn.status] || ASSIGNMENT_STATUS.ASSIGNED;

  const today = getIstanbulToday();
  const isPast = asgn.date < today;
  const isAssigned = asgn.status === 'ASSIGNED';
  const canEdit = isManager && isAssigned && !isPast;
  const canCancel = isManager && isAssigned && !isPast;

  const handleSaveHours = () => {
    onEditMaxHours(asgn.id, editHours);
    setEditing(false);
  };

  return (
    <div className="bg-white/[0.04] border border-purple-500/15 rounded-xl p-3 space-y-2 hover:border-purple-500/30 transition-all duration-200 hover:bg-purple-500/[0.04]">
      {/* Top row */}
      <div className="flex items-center flex-wrap gap-1.5">
        <Tag color={statusCfg.color} className="!text-[10px] !font-bold !m-0">{statusCfg.label}</Tag>
        {editing ? (
          <div className="flex items-center gap-1.5 ml-auto">
            <InputNumber
              size="small"
              min={0.5}
              max={12}
              step={0.5}
              value={editHours}
              onChange={(v) => setEditHours(v)}
              className="!w-20"
            />
            <span className="text-[10px] text-gray-400">sa</span>
            <Button size="small" type="primary" onClick={handleSaveHours} className="!text-[10px]">
              Kaydet
            </Button>
            <Button size="small" onClick={() => setEditing(false)} className="!text-[10px]">
              Vazgeç
            </Button>
          </div>
        ) : (
          <span className="text-xs font-bold text-purple-400">
            Maks: {asgn.max_duration_hours} sa
          </span>
        )}
      </div>

      {/* Assigned by */}
      {asgn.assigned_by && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <User size={10} />
          <span>Atayan: {asgn.assigned_by.name || asgn.assigned_by_name || 'Bilinmeyen'}</span>
        </div>
      )}

      {/* Task description */}
      {asgn.task_description && (
        <p className="text-[11px] text-gray-400 truncate">{asgn.task_description}</p>
      )}

      {/* Employee name (team mode) */}
      {asgn.employee_name && (
        <div className="text-[11px] text-gray-400 font-medium">{asgn.employee_name}</div>
      )}

      {/* Actions */}
      {(canEdit || canCancel) && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
          {canEdit && !editing && (
            <Button
              size="small"
              icon={<Pencil size={11} />}
              onClick={() => setEditing(true)}
              className="!text-[10px] !font-bold !flex !items-center !gap-1"
            >
              Düzenle
            </Button>
          )}
          {canCancel && (
            <Popconfirm
              title="Atamayı iptal etmek istiyor musunuz?"
              onConfirm={() => onCancelAssignment(asgn.id)}
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
        </div>
      )}
    </div>
  );
}

// --- Potential Card ---
function PotentialCard({ pot }) {
  return (
    <div className="bg-white/[0.04] border border-blue-500/15 rounded-xl p-3 space-y-2 hover:border-blue-500/30 transition-all duration-200 hover:bg-blue-500/[0.04]">
      <div className="flex items-center flex-wrap gap-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: '#3b82f6' }}>
          Algılanan
        </span>
        {pot.ot_type && (
          <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            {OT_TYPE_LABELS[pot.ot_type] || pot.ot_type}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        {pot.start_time && pot.end_time && (
          <span className="font-medium text-white">
            {pot.start_time.slice(0, 5)} - {pot.end_time.slice(0, 5)}
          </span>
        )}
        <span className="font-bold text-blue-400">
          {pot.actual_overtime_hours || (pot.actual_overtime_seconds ? (pot.actual_overtime_seconds / 3600).toFixed(1) : '0')} sa
        </span>
      </div>

      {/* Employee name (team mode) */}
      {pot.employee_name && (
        <div className="text-[11px] text-gray-400 font-medium">{pot.employee_name}</div>
      )}

      {/* Claim status if available */}
      {pot.claim_status && (
        <div className="pt-1 border-t border-white/5">
          <StatusPill status={pot.claim_status} />
        </div>
      )}
    </div>
  );
}

// ========= MAIN DRAWER =========
export default function OTDayDetailDrawer({
  open,
  date,
  dayDataByMember,
  loading: externalLoading,
  onClose,
  onRefresh,
  isManager = false,
  isTeamMode = false,
}) {
  const [actionLoading, setActionLoading] = useState(null);

  // --- Action handlers ---
  const handleApprove = useCallback(async (requestId) => {
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
  }, [onRefresh]);

  const handleReject = useCallback(async (requestId, reason) => {
    setActionLoading(`reject-${requestId}`);
    try {
      await api.post(`/overtime-requests/${requestId}/approve_reject/`, {
        action: 'reject',
        reason: reason || 'Reddedildi',
      });
      message.success('Talep reddedildi');
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'Reddetme hatası');
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

  const handleCancelRequest = useCallback(async (requestId) => {
    setActionLoading(`cancel-req-${requestId}`);
    try {
      await api.post(`/overtime-requests/${requestId}/cancel/`, {});
      message.success('Talep iptal edildi');
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'İptal hatası');
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

  const handleCancelAssignment = useCallback(async (assignmentId) => {
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
  }, [onRefresh]);

  const handleEditTimes = useCallback(async (requestId, startTime, endTime) => {
    setActionLoading(`edit-${requestId}`);
    try {
      await api.patch(`/overtime-requests/${requestId}/`, {
        start_time: startTime,
        end_time: endTime,
      });
      message.success('Saatler güncellendi');
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'Güncelleme hatası');
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

  const handleEditMaxHours = useCallback(async (assignmentId, maxHours) => {
    setActionLoading(`edit-asgn-${assignmentId}`);
    try {
      await api.patch(`/overtime-assignments/${assignmentId}/update/`, {
        max_duration_hours: parseFloat(maxHours),
      });
      message.success('Atama güncellendi');
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.error || 'Güncelleme hatası');
    } finally {
      setActionLoading(null);
    }
  }, [onRefresh]);

  // --- Build member sections from dayDataByMember ---
  // dayDataByMember: { [employeeName]: { requests, assignments, potentials, employeeId } }
  // OR for personal mode: single entry
  const members = dayDataByMember ? Object.entries(dayDataByMember) : [];

  const hasAnyContent = members.some(([, data]) =>
    (data.requests?.length > 0) || (data.assignments?.length > 0) || (data.potentials?.length > 0)
  );

  const renderMemberContent = (memberName, memberData) => {
    const { requests = [], assignments = [], potentials = [] } = memberData;
    const hasContent = requests.length > 0 || assignments.length > 0 || potentials.length > 0;

    if (!hasContent) {
      return (
        <div className="text-center py-4 text-gray-500 text-sm">
          Bu gün için kayıt bulunmuyor.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Requests */}
        {requests.length > 0 && (
          <div>
            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Briefcase size={12} className="text-amber-500" />
              Talepler ({requests.length})
            </h5>
            <div className="space-y-2">
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  isManager={isManager}
                  isOwnData={!isTeamMode}
                  actionLoading={actionLoading}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onCancel={handleCancelRequest}
                  onEditTimes={handleEditTimes}
                />
              ))}
            </div>
          </div>
        )}

        {/* Assignments */}
        {assignments.length > 0 && (
          <div>
            <h5 className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield size={12} />
              Atamalar ({assignments.length})
            </h5>
            <div className="space-y-2">
              {assignments.map((asgn) => (
                <AssignmentCard
                  key={asgn.id}
                  asgn={asgn}
                  isManager={isManager}
                  actionLoading={actionLoading}
                  onCancelAssignment={handleCancelAssignment}
                  onEditMaxHours={handleEditMaxHours}
                />
              ))}
            </div>
          </div>
        )}

        {/* Potentials */}
        {potentials.length > 0 && (
          <div>
            <h5 className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Algılanan Mesailer ({potentials.length})
            </h5>
            <div className="space-y-2">
              {potentials.map((pot) => (
                <PotentialCard key={pot.id} pot={pot} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Drawer
      title={null}
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      closable={false}
      styles={{
        header: { display: 'none' },
        body: { padding: 0, backgroundColor: '#0f172a' },
        wrapper: {},
      }}
      rootClassName="ot-day-detail-drawer"
    >
      <div className="h-full flex flex-col bg-slate-900 text-white">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-white/10 overflow-hidden">
          {/* Gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet-500/40 via-purple-500/20 to-transparent" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Clock size={15} className="text-violet-400" />
                </div>
                Gün Detayı
              </h3>
              <p className="text-[12px] text-gray-400 mt-1 ml-9">
                {formatDateTurkish(date)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 hover:rotate-90"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {externalLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spin tip={<span className="text-gray-400">Yükleniyor...</span>} />
            </div>
          ) : !hasAnyContent ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              Bu gün için kayıt bulunmuyor.
            </div>
          ) : isTeamMode && members.length > 1 ? (
            // Team mode: collapsible sections per member
            <div className="space-y-3">
              {members.map(([memberName, memberData]) => {
                const reqCount = (memberData.requests?.length || 0) + (memberData.assignments?.length || 0) + (memberData.potentials?.length || 0);
                if (reqCount === 0) return null;
                return (
                  <Collapse
                    key={memberName}
                    defaultActiveKey={['1']}
                    ghost
                    className="ot-drawer-collapse"
                    items={[{
                      key: '1',
                      label: (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
                            {memberName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-white">{memberName}</span>
                          <span className="text-[10px] text-gray-500 ml-auto">{reqCount} kayıt</span>
                        </div>
                      ),
                      children: renderMemberContent(memberName, memberData),
                    }]}
                  />
                );
              })}
            </div>
          ) : (
            // Personal mode or single member
            members.map(([memberName, memberData]) => (
              <div key={memberName}>
                {isTeamMode && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
                      {memberName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-white">{memberName}</span>
                  </div>
                )}
                {renderMemberContent(memberName, memberData)}
              </div>
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
}
