import { useState } from 'react';
import { Modal, Input, message } from 'antd';
import { Shield, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export default function OverrideConfirmModal({ visible, assignment, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOverride = async () => {
    if (!reason.trim()) {
      message.warning('Lütfen bir sebep giriniz');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/overtime-assignments/${assignment.id}/override/`, {
        action: 'cancel',
        reason: reason.trim()
      });
      message.success('Atama başarıyla override edildi');
      setReason('');
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || 'Override hatası');
    } finally {
      setLoading(false);
    }
  };

  if (!assignment) return null;

  const relationLabel = assignment.assigned_by?.relationship_type === 'SECONDARY'
    ? 'İkincil Yönetici' : 'Yönetici';

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      onOk={handleOverride}
      confirmLoading={loading}
      title={
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-orange-500" />
          <span>Ek Mesai Ataması Override</span>
        </div>
      }
      okText="Override Et"
      cancelText="Vazgeç"
      okButtonProps={{ danger: true }}
    >
      <div className="space-y-3">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
            <div className="text-sm text-orange-800">
              <p className="font-medium">
                {assignment.assigned_by?.name || 'Bilinmeyen'} ({relationLabel})
                tarafından atanmış ek mesaiyi iptal etmek üzeresiniz.
              </p>
              <p className="mt-1">
                Bu işlem sonrasında hem ikincil yöneticiye hem de çalışana bildirim gönderilecektir.
                İlişkili bekleyen talepler de iptal edilecektir.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
          <div><span className="font-medium">Maks Süre:</span> {assignment.max_duration_hours}sa</div>
          {assignment.task_description && (
            <div><span className="font-medium">Görev:</span> {assignment.task_description}</div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Override Sebebi *</label>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Override sebebini giriniz..."
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}
