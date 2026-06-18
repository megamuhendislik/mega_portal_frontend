/**
 * Avans İzin Yönetimi — Sistem Sağlığı > Bakım Hub'ı alt sekmesi.
 *
 * Son 12 ayda işe başlamış çalışanlara TOPLU avans izin (eksi bakiye hakkı)
 * tanımlama aracı. Önizleme (uygun çalışanlar) → seç → uygula → son işlemi geri al.
 *
 * - Varsayılan seçim: limiti HENÜZ TANIMLI OLMAYAN çalışanlar (has_limit === false).
 * - Uygula sonrası "Son Tanımlamayı Geri Al" ile en son toplu işlem önceki
 *   limit/granted_at değerlerine döndürülebilir.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, InputNumber, Modal, message, Tag, Card, Statistic,
  Space, Spin, Tooltip,
} from 'antd';
import {
  GiftOutlined, ReloadOutlined, UndoOutlined, TeamOutlined,
  CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('tr-TR');
}

export default function AdvanceLeaveManagementTab() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({
    eligible_total: 0, with_limit_count: 0, without_limit_count: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [limit, setLimit] = useState(10);
  const [applying, setApplying] = useState(false);
  const [lastDetails, setLastDetails] = useState(null);

  // --- Uygun çalışanları yükle ---
  const fetchEligible = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/health-check/balance-advance-eligible/');
      const data = res.data || {};
      const list = data.employees || [];
      setRows(list);
      setCounts({
        eligible_total: data.eligible_total || 0,
        with_limit_count: data.with_limit_count || 0,
        without_limit_count: data.without_limit_count || 0,
      });
      // Varsayılan seçim: limiti olmayanlar seçili
      setSelectedRowKeys(list.filter((r) => !r.has_limit).map((r) => r.id));
    } catch (err) {
      message.error(err.response?.data?.error || 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEligible(); }, [fetchEligible]);

  // --- Toplu avans tanımla ---
  const onBulkGrant = useCallback(() => {
    if (!selectedRowKeys.length || !limit || limit < 1) return;
    Modal.confirm({
      title: 'Toplu Avans Tanımla',
      content: `${selectedRowKeys.length} kişiye ${limit} gün avans izin tanımlanacak. Onaylıyor musunuz?`,
      okText: 'Onayla',
      cancelText: 'Vazgeç',
      onOk: async () => {
        setApplying(true);
        try {
          const res = await api.post('/system/health-check/balance-advance-bulk-grant/', {
            limit, employee_ids: selectedRowKeys,
          });
          const data = res.data || {};
          message.success(`${data.granted_count || 0} kişiye avans tanımlandı`);
          if (data.skipped_ineligible?.length > 0) {
            message.warning(`${data.skipped_ineligible.length} kişi uygunsuz (atlandı)`);
          }
          if (data.errors?.length > 0) {
            message.error(`${data.errors.length} hata`);
          }
          setLastDetails(data.details || null);
          await fetchEligible();
        } catch (err) {
          message.error(err.response?.data?.error || 'İşlem başarısız');
        } finally {
          setApplying(false);
        }
      },
    });
  }, [selectedRowKeys, limit, fetchEligible]);

  // --- Son tanımlamayı geri al ---
  const onBulkRevert = useCallback(() => {
    if (!lastDetails?.length) return;
    Modal.confirm({
      title: 'Son Tanımlamayı Geri Al',
      content: `${lastDetails.length} kişinin son avans tanımlaması önceki değerlerine döndürülecek. Onaylıyor musunuz?`,
      okText: 'Geri Al',
      cancelText: 'Vazgeç',
      onOk: async () => {
        setApplying(true);
        try {
          const res = await api.post('/system/health-check/balance-advance-bulk-revert/', {
            items: lastDetails.map((d) => ({
              employee_id: d.id,
              limit: d.previous_limit,
              granted_at: d.previous_granted_at,
            })),
          });
          const data = res.data || {};
          message.success(`${data.reverted_count || 0} tanımlama geri alındı`);
          if (data.errors?.length > 0) {
            message.error(`${data.errors.length} hata`);
          }
          setLastDetails(null);
          await fetchEligible();
        } catch (err) {
          message.error(err.response?.data?.error || 'İşlem başarısız');
        } finally {
          setApplying(false);
        }
      },
    });
  }, [lastDetails, fetchEligible]);

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const columns = [
    { title: 'Sicil', dataIndex: 'employee_code', key: 'employee_code', width: 110 },
    { title: 'Ad', dataIndex: 'full_name', key: 'full_name' },
    {
      title: 'İşe Giriş', dataIndex: 'hired_date', key: 'hired_date',
      render: (v) => fmtDate(v),
    },
    {
      title: 'Kıdem', dataIndex: 'tenure_months', key: 'tenure_months',
      render: (v) => `${v ?? 0} ay`,
    },
    {
      title: 'Mevcut Limit', dataIndex: 'current_limit', key: 'current_limit',
      render: (v) => `${v ?? 0} gün`,
    },
    {
      title: 'Durum', dataIndex: 'has_limit', key: 'has_limit',
      render: (v) => (v
        ? <Tag color="orange">Zaten tanımlı</Tag>
        : <Tag color="default">Yok</Tag>),
    },
  ];

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="flex items-center gap-2 mb-2">
          <GiftOutlined style={{ fontSize: 20, color: '#722ed1' }} />
          <span className="text-base font-semibold">Avans İzin Yönetimi</span>
        </div>
        <div className="text-xs text-gray-500 mb-3">
          Son 12 ayda işe başlamış çalışanlar listelenir. Limiti zaten tanımlı olanlar
          varsayılan seçili değildir.
        </div>

        {/* ---- Sayım kartları ---- */}
        <div className="flex flex-wrap gap-4 mb-3">
          <Card size="small" style={{ minWidth: 150 }}>
            <Statistic
              title="Uygun"
              value={counts.eligible_total}
              prefix={<TeamOutlined />}
            />
          </Card>
          <Card size="small" style={{ minWidth: 150 }}>
            <Statistic
              title="Limiti Var"
              value={counts.with_limit_count}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
          <Card size="small" style={{ minWidth: 150 }}>
            <Statistic
              title="Limiti Yok"
              value={counts.without_limit_count}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </div>

        {/* ---- Kontrol satırı ---- */}
        <Space wrap align="center">
          <Tooltip title="Eksi bakiyeye düşme limiti (gün)">
            <span className="text-sm text-gray-600">Limit (gün)</span>
          </Tooltip>
          <InputNumber
            min={1}
            max={365}
            value={limit}
            onChange={(v) => setLimit(v)}
            style={{ width: 110 }}
          />
          <Button
            type="primary"
            icon={<GiftOutlined />}
            onClick={onBulkGrant}
            loading={applying}
            disabled={selectedRowKeys.length === 0 || !limit || limit < 1 || applying}
          >
            {`Toplu Avans Tanımla (${selectedRowKeys.length} kişi)`}
          </Button>
          {lastDetails?.length > 0 && (
            <Button
              icon={<UndoOutlined />}
              onClick={onBulkRevert}
              loading={applying}
            >
              {`Son Tanımlamayı Geri Al (${lastDetails.length} kişi)`}
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchEligible}
            loading={loading}
          >
            Yenile
          </Button>
        </Space>
      </Card>

      {/* ---- Çalışan tablosu ---- */}
      {loading ? (
        <div className="text-center py-8"><Spin /></div>
      ) : (
        <Card size="small">
          <Table
            size="small"
            rowKey="id"
            dataSource={rows}
            columns={columns}
            rowSelection={rowSelection}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            locale={{ emptyText: 'Son 12 ayda işe başlamış uygun çalışan bulunamadı.' }}
          />
        </Card>
      )}
    </div>
  );
}
