import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Alert, Button, Popconfirm, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../../services/api';
import {
  transferStatusLabel,
  runStatusLabel,
  countsText,
  mismatchText,
  formatDuration,
} from './gateNightReport';
// Gece kart aktarımı raporu — her gece için aktarım, hesaplama ve uyuşmazlık özeti.

const LIST_ENDPOINT = '/system/health-check/gate-daily-transfers/';
const UNDO_ENDPOINT = '/system/health-check/pdks-reconcile-undo/';

const STATUS_COLORS = {
  MISSING: 'red',
  FAILED: 'orange',
  INVALID: 'orange',
  ACCEPTED: 'green',
};

const fmtNight = (night) => {
  if (!night) return '-';
  const [y, m, d] = String(night).split('-');
  return `${d}.${m}.${y}`;
};

const fmtTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtDay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return `${d}.${m}.${y}`;
};

export default function GateNightReportPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [undoingId, setUndoingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(LIST_ENDPOINT);
      setRows(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Gece aktarım listesi alınamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUndo = async (row) => {
    setUndoingId(row.snapshot_id);
    try {
      await api.post(UNDO_ENDPOINT, { snapshot_id: row.snapshot_id }, { timeout: 120000 });
      message.success('Geri alındı. Ardından Tam Yeniden Hesaplama çalıştırın.');
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Geri alma sırasında hata oluştu.');
    } finally {
      setUndoingId(null);
    }
  };

  const columns = [
    { title: 'Gece', dataIndex: 'night', key: 'night', render: fmtNight },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={STATUS_COLORS[s]}>{transferStatusLabel(s)}</Tag>,
    },
    { title: 'Saat', dataIndex: 'received_at', key: 'received_at', render: fmtTime },
    { title: 'Okutma', key: 'counts', render: (_, r) => countsText(r) },
    {
      title: 'Fren',
      key: 'brake',
      render: (_, r) => (r.counts?.delete_brake ? <Tag color="orange">Fren</Tag> : null),
    },
    {
      title: 'Hesaplama',
      key: 'run',
      render: (_, r) => {
        const dur = formatDuration(r.night_report?.elapsed_seconds);
        return dur === '-' ? runStatusLabel(r) : `${runStatusLabel(r)}, ${dur}`;
      },
    },
    {
      title: 'Hard',
      key: 'hard',
      render: (_, r) => {
        const nr = r.night_report;
        if (!nr || nr.hard_person_count == null) return '-';
        return `${nr.hard_person_count} kişi, ${nr.hard_applied_count ?? 0} değişen`;
      },
    },
    {
      title: 'Uyuşmazlık',
      key: 'mismatch',
      render: (_, r) => r.night_report?.mismatch_count ?? 0,
    },
    {
      title: 'İşlenen',
      key: 'processed',
      render: (_, r) => r.night_report?.processed_events ?? '-',
    },
    {
      title: 'Hata',
      key: 'error',
      render: (_, r) => r.error || r.night_report?.dispatch_error || '',
    },
  ];

  const expandedRowRender = (row) => {
    const nr = row.night_report || {};
    const mismatches = nr.mismatches || [];
    const findings = nr.findings || [];
    return (
      <div className="space-y-3 text-sm">
        <div>
          <div className="font-medium mb-1">Uyuşmazlık ({nr.mismatch_count ?? 0})</div>
          {mismatches.length === 0 ? (
            <span className="text-gray-500">Yok</span>
          ) : (
            <ul className="list-disc pl-5">
              {mismatches.map((m, i) => (
                <li key={`${m.request_id}-${i}`}>{mismatchText(m)}</li>
              ))}
            </ul>
          )}
          {(nr.mismatch_count || 0) > mismatches.length && (
            <div className="text-gray-500 mt-1">
              ... ve {nr.mismatch_count - mismatches.length} talep daha
            </div>
          )}
        </div>
        <div>
          <div className="font-medium mb-1">Bulgular ({nr.finding_count ?? 0})</div>
          {findings.length === 0 ? (
            <span className="text-gray-500">Yok</span>
          ) : (
            <ul className="list-disc pl-5">
              {findings.map((f, i) => (
                <li key={i}>
                  {f.employee_name}, {fmtDay(f.date)}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-gray-600">
          Devreden okutma: {(nr.deferred_events || []).length}. Geç okutma: {nr.late_event_count ?? 0}.
        </div>
        {row.snapshot_id && (
          <Popconfirm
            title="Okutma değişiklikleri geri alınsın mı?"
            description="Bu aktarımın eklediği ve düzelttiği okutmalar geri alınır. Sonra Tam Yeniden Hesaplama çalıştırın."
            onConfirm={() => handleUndo(row)}
            okText="Evet, geri al"
            cancelText="Vazgeç"
          >
            <Button danger size="small" loading={undoingId === row.snapshot_id}>
              Okutma değişikliklerini geri al
            </Button>
          </Popconfirm>
        )}
      </div>
    );
  };

  return (
    <Card
      size="small"
      title="Gece Kart Aktarımı"
      className="shadow-sm"
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Yenile
        </Button>
      }
    >
      {error && <Alert type="error" showIcon message={error} className="mb-3" />}
      <Table
        size="small"
        rowKey="transfer_id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        expandable={{ expandedRowRender }}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
}
