/**
 * Bakiye Sağlığı (Balance Health) — Sistem Sağlığı alt sekmesi.
 *
 * İzin bakiye sayaçlarının (mazeret saati / yıllık gün / avans) GERÇEK onaylı
 * taleplerden türetilen değerlerle uyumunu denetler:
 *   - Mazeret: depolanan hours_used vs Σ gerçek onaylı mazeret saati (Burak vakası
 *     gibi hayalet fazla-düşümleri yakalar) + bakiyenin nasıl harcandığı dökümü
 *   - Yıllık: entitlement days_used vs usage_breakdown gerçeği
 *   - Avans: limit/kullanılan/tanımlama tarihi + NET bakiye (negatif görünür)
 * "Düzelt" sayaçları gerçeğe eşitler (kök-neden-bağımsız). Ayrıca muhasebe
 * (admin) avans izin limiti tanımlayabilir (1 yıl geçerli).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Select, Button, Table, Tag, InputNumber, message, Popconfirm,
  Spin, Empty, Statistic, Row, Col, Space, Typography, Alert, Divider,
} from 'antd';
import {
  WalletOutlined, ReloadOutlined, ToolOutlined, SearchOutlined,
  CheckCircleOutlined, WarningOutlined, PlusOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const { Text, Title } = Typography;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]
  .map((y) => ({ value: y, label: String(y) }));

function fmtH(v) { return `${Number(v || 0).toFixed(2)} sa`; }
function fmtD(v) { return `${Number(v || 0).toFixed(1)} gün`; }

export default function BalanceHealthTab() {
  const [employees, setEmployees] = useState([]);
  const [empId, setEmpId] = useState(null);
  const [year, setYear] = useState(CURRENT_YEAR);

  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [scan, setScan] = useState(null);          // {results, mismatch_count, total_checked}
  const [loadingScan, setLoadingScan] = useState(false);

  const [fixing, setFixing] = useState(false);
  const [grantLimit, setGrantLimit] = useState(0);
  const [granting, setGranting] = useState(false);

  // --- Çalışan listesi ---
  useEffect(() => {
    api.get('/employees/', { params: { page_size: 500 } })
      .then((res) => {
        const list = (res.data?.results || res.data || [])
          .filter((e) => e.is_active !== false)
          .map((e) => ({
            value: e.id,
            label: `${e.full_name || `${e.first_name} ${e.last_name}`}${e.employee_code ? ` (${e.employee_code})` : ''}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
        setEmployees(list);
      })
      .catch(() => {});
  }, []);

  // --- Tek çalışan denetimi ---
  const loadDetail = useCallback(async (id, yr) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await api.get('/system/health-check/balance-health/', {
        params: { employee_id: id, year: yr },
      });
      setDetail(res.data?.detail || null);
      setGrantLimit(res.data?.detail?.annual?.advance?.limit || 0);
    } catch (err) {
      message.error(err.response?.data?.error || 'Denetim yüklenemedi');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const onSelectEmployee = (id) => {
    setEmpId(id);
    setScan(null);
    loadDetail(id, year);
  };

  const onYearChange = (yr) => {
    setYear(yr);
    if (empId) loadDetail(empId, yr);
  };

  // --- Tüm çalışanları tara (yalnız sapmalılar) ---
  const runScan = useCallback(async () => {
    setLoadingScan(true);
    setDetail(null);
    setEmpId(null);
    try {
      const res = await api.get('/system/health-check/balance-health/', {
        params: { year, only_mismatch: true },
      });
      setScan(res.data || null);
    } catch (err) {
      message.error(err.response?.data?.error || 'Tarama başarısız');
    } finally {
      setLoadingScan(false);
    }
  }, [year]);

  // --- Düzelt (sayaçları eşitle) ---
  const runFix = useCallback(async () => {
    if (!empId) return;
    setFixing(true);
    try {
      const res = await api.post('/system/health-check/balance-health-fix/', {
        employee_id: empId, year,
      });
      if (res.data?.changed) {
        message.success('Bakiye sayaçları gerçeğe eşitlendi.');
      } else {
        message.info('Düzeltilecek sapma bulunamadı (zaten tutarlı).');
      }
      setDetail(res.data?.after || null);
    } catch (err) {
      message.error(err.response?.data?.error || 'Düzeltme başarısız');
    } finally {
      setFixing(false);
    }
  }, [empId, year]);

  // --- Avans izin tanımla (muhasebe grant) ---
  const grantAdvance = useCallback(async () => {
    if (!empId) return;
    setGranting(true);
    try {
      await api.post('/system/health-check/balance-advance-grant/', {
        employee_id: empId, limit: grantLimit,
      });
      message.success(grantLimit > 0
        ? `Avans izin limiti tanımlandı: ${grantLimit} gün (1 yıl geçerli).`
        : 'Avans izin limiti kaldırıldı.');
      loadDetail(empId, year);
    } catch (err) {
      message.error(err.response?.data?.error || 'Avans tanımlama başarısız');
    } finally {
      setGranting(false);
    }
  }, [empId, grantLimit, year, loadDetail]);

  // ============================ RENDER ============================
  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="flex items-center gap-2 mb-3">
          <WalletOutlined style={{ fontSize: 20, color: '#13c2c2' }} />
          <Title level={5} style={{ margin: 0 }}>Bakiye Sağlığı</Title>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          İzin bakiye sayaçlarının (mazeret/yıllık/avans) gerçek onaylı taleplerle
          uyumunu denetler, sapmaları gösterir ve "Düzelt" ile eşitler. Avans izni
          (eksi bakiye hakkı) buradan tanımlanır.
        </Text>
        <Divider style={{ margin: '12px 0' }} />
        <Space wrap>
          <Select
            showSearch
            allowClear
            placeholder="Çalışan seç..."
            style={{ width: 320 }}
            options={employees}
            value={empId}
            onChange={onSelectEmployee}
            optionFilterProp="label"
            suffixIcon={<SearchOutlined />}
          />
          <Select
            style={{ width: 110 }}
            options={YEAR_OPTIONS}
            value={year}
            onChange={onYearChange}
          />
          <Button
            icon={<WarningOutlined />}
            onClick={runScan}
            loading={loadingScan}
          >
            Tüm Çalışanları Tara (Sapmalılar)
          </Button>
        </Space>
      </Card>

      {/* ---------------- TARAMA SONUÇLARI ---------------- */}
      {scan && (
        <Card size="small" title={
          <Space>
            <span>Sapma Taraması — {scan.year}</span>
            <Tag color={scan.mismatch_count > 0 ? 'red' : 'green'}>
              {scan.mismatch_count} / {scan.total_checked} çalışanda sapma
            </Tag>
          </Space>
        }>
          {scan.results?.length ? (
            <Table
              size="small"
              rowKey="employee_id"
              dataSource={scan.results}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
              onRow={(rec) => ({
                onClick: () => onSelectEmployee(rec.employee_id),
                style: { cursor: 'pointer' },
              })}
              columns={[
                { title: 'Çalışan', dataIndex: 'employee_name', key: 'name' },
                { title: 'Departman', dataIndex: 'department', key: 'dept', render: (d) => d || '-' },
                {
                  title: 'Mazeret Sapması', key: 'exc',
                  render: (_, r) => r.excuse?.has_mismatch
                    ? <Tag color="red">Sapma</Tag> : <Tag color="green">OK</Tag>,
                },
                {
                  title: 'Net Yıllık Bakiye', key: 'net',
                  render: (_, r) => {
                    const nb = r.annual?.net_balance ?? 0;
                    return <Text style={{ color: nb < 0 ? '#cf1322' : undefined }}>{fmtD(nb)}</Text>;
                  },
                },
              ]}
            />
          ) : (
            <Empty description="Sapma bulunamadı — tüm bakiyeler tutarlı." />
          )}
        </Card>
      )}

      {/* ---------------- TEK ÇALIŞAN DETAYI ---------------- */}
      {loadingDetail && <div className="text-center py-8"><Spin /></div>}

      {!loadingDetail && detail && (
        <DetailPanel
          detail={detail}
          fixing={fixing}
          onFix={runFix}
          grantLimit={grantLimit}
          setGrantLimit={setGrantLimit}
          granting={granting}
          onGrant={grantAdvance}
        />
      )}

      {!loadingDetail && !detail && !scan && (
        <Card size="small">
          <Empty description="Denetlemek için bir çalışan seçin veya tüm çalışanları tarayın." />
        </Card>
      )}
    </div>
  );
}

// ============================ DETAY PANELİ ============================
function DetailPanel({ detail, fixing, onFix, grantLimit, setGrantLimit, granting, onGrant }) {
  const { excuse, annual } = detail;
  const adv = annual?.advance || {};
  const netNeg = (annual?.net_balance ?? 0) < 0;

  return (
    <Card
      size="small"
      title={
        <Space>
          <Text strong>{detail.employee_name}</Text>
          {detail.employee_code && <Tag>{detail.employee_code}</Tag>}
          {detail.has_mismatch
            ? <Tag color="red" icon={<WarningOutlined />}>Sapma var</Tag>
            : <Tag color="green" icon={<CheckCircleOutlined />}>Tutarlı</Tag>}
        </Space>
      }
      extra={
        <Popconfirm
          title="Sayaçları gerçeğe eşitle"
          description="Depolanan bakiye sayaçları, onaylı taleplerden türetilen gerçek değerlere eşitlenecek. Onaylıyor musunuz?"
          okText="Düzelt"
          cancelText="Vazgeç"
          onConfirm={onFix}
          disabled={!detail.has_mismatch}
        >
          <Button
            type="primary"
            danger
            icon={<ToolOutlined />}
            loading={fixing}
            disabled={!detail.has_mismatch}
          >
            Düzelt (Sayaçları Eşitle)
          </Button>
        </Popconfirm>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message='"Düzelt" yalnız MAZERET sayacını gerçeğe eşitler. Yıllık izin & avans salt görüntülenir (yıldönümü borç-aktarımı nedeniyle otomatik düzeltilmez).'
      />

      {/* ---- MAZERET ---- */}
      <Divider orientation="left" style={{ margin: '4px 0 12px' }}>
        <Space><WalletOutlined /> Mazeret İzni ({excuse?.focus_year})</Space>
      </Divider>
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={5}><Statistic title="Hak Edilen" value={excuse?.focus?.entitled} suffix="sa" precision={2} /></Col>
        <Col span={5}><Statistic title="Depolanan Kullanım" value={excuse?.focus?.stored_used} suffix="sa" precision={2} /></Col>
        <Col span={5}><Statistic title="Gerçek Kullanım" value={excuse?.focus?.real_used} suffix="sa" precision={2} /></Col>
        <Col span={4}>
          <Statistic
            title="Fark"
            value={excuse?.focus?.diff}
            suffix="sa"
            precision={2}
            valueStyle={{ color: Math.abs(excuse?.focus?.diff || 0) > 0.01 ? '#cf1322' : '#3f8600' }}
          />
        </Col>
        <Col span={5}>
          <Statistic title="Kalan (gerçek)" value={excuse?.focus?.remaining_real} suffix="sa" precision={2} />
        </Col>
      </Row>

      {excuse?.years?.length > 1 && (
        <Table
          size="small"
          rowKey="year"
          style={{ marginBottom: 12 }}
          title={() => <Text type="secondary">Yıl bazlı özet</Text>}
          dataSource={excuse.years}
          pagination={false}
          columns={[
            { title: 'Yıl', dataIndex: 'year', key: 'y' },
            { title: 'Hak Edilen', dataIndex: 'entitled', key: 'e', render: fmtH },
            { title: 'Depolanan', dataIndex: 'stored_used', key: 's', render: fmtH },
            { title: 'Gerçek', dataIndex: 'real_used', key: 'r', render: fmtH },
            {
              title: 'Fark', dataIndex: 'diff', key: 'd',
              render: (v) => <Text style={{ color: Math.abs(v) > 0.01 ? '#cf1322' : undefined }}>{fmtH(v)}</Text>,
            },
            {
              title: 'Durum', key: 'st',
              render: (_, r) => r.mismatch ? <Tag color="red">Sapma</Tag> : <Tag color="green">OK</Tag>,
            },
          ]}
        />
      )}

      <Table
        size="small"
        rowKey="request_id"
        title={() => <Text type="secondary">Mazeret bakiyesi nasıl harcandı ({excuse?.focus_year})</Text>}
        dataSource={excuse?.breakdown || []}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: 'Bu yıl onaylı mazeret kaydı yok.' }}
        columns={[
          { title: 'Tarih', dataIndex: 'date', key: 'date' },
          {
            title: 'Saat', key: 'time',
            render: (_, r) => (r.start_time && r.end_time) ? `${r.start_time}–${r.end_time}` : '-',
          },
          { title: 'Süre', dataIndex: 'hours', key: 'h', render: fmtH },
          { title: 'Sebep', dataIndex: 'reason', key: 'reason', ellipsis: true },
        ]}
      />

      {/* ---- YILLIK + AVANS ---- */}
      <Divider orientation="left" style={{ margin: '20px 0 12px' }}>
        <Space><WalletOutlined /> Yıllık İzin & Avans</Space>
      </Divider>
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={6}><Statistic title="Hesaplanan Bakiye" value={annual?.calculated_balance} suffix="gün" precision={1} /></Col>
        <Col span={6}>
          <Statistic
            title="NET Bakiye (avans sonrası)"
            value={annual?.net_balance}
            suffix="gün"
            precision={1}
            valueStyle={{ color: netNeg ? '#cf1322' : '#3f8600' }}
          />
        </Col>
        <Col span={6}><Statistic title="Avans Limiti" value={adv.limit} suffix="gün" /></Col>
        <Col span={6}>
          <Statistic
            title="Kullanılan Avans (borç)"
            value={adv.stored_used}
            suffix="gün"
            precision={1}
            valueStyle={{ color: (adv.stored_used || 0) > 0 ? '#fa8c16' : undefined }}
          />
        </Col>
      </Row>

      {adv.granted_at && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Avans tanımlama tarihi: <b>{adv.granted_at}</b> (1 yıl geçerli; iş-yılı yıldönümünde otomatik sıfırlanır)
        </Text>
      )}

      <Table
        size="small"
        rowKey="year"
        style={{ marginTop: 12, marginBottom: 12 }}
        title={() => <Text type="secondary">Yıllık hak ediş bazlı (salt görüntüleme)</Text>}
        dataSource={annual?.entitlements || []}
        pagination={false}
        locale={{ emptyText: 'Yıllık izin hak edişi kaydı yok.' }}
        columns={[
          { title: 'Yıl', dataIndex: 'year', key: 'y' },
          { title: 'Hak Edilen', dataIndex: 'days_entitled', key: 'e', render: fmtD },
          { title: 'Kullanılan (otorite)', dataIndex: 'stored_used', key: 's', render: fmtD },
          { title: 'Kalan', dataIndex: 'remaining', key: 'rem', render: fmtD },
          {
            title: 'Talep-türevli (bilgi)', dataIndex: 'derived_used', key: 'r',
            render: (v) => <Text type="secondary">{fmtD(v)}</Text>,
          },
          { title: 'Son Kullanma', dataIndex: 'expiry_date', key: 'exp', render: (v) => v || '-' },
        ]}
      />

      {/* ---- AVANS TANIMLA (muhasebe grant) ---- */}
      <Card size="small" type="inner" title={<Space><PlusOutlined /> Avans İzin Tanımla (Muhasebe)</Space>}>
        <Space wrap align="center">
          <Text type="secondary">
            Eksi bakiyeye düşme limiti (gün). 1 yıl geçerli; yıl dolunca otomatik
            sıfırlanır, kullanılan avans borç olarak sonraki hak edişe aktarılır.
          </Text>
          <InputNumber
            min={0}
            max={365}
            value={grantLimit}
            onChange={(v) => setGrantLimit(v ?? 0)}
            addonAfter="gün"
            style={{ width: 130 }}
          />
          <Popconfirm
            title={grantLimit > 0
              ? `${grantLimit} gün avans izin tanımlansın mı? (1 yıl geçerli)`
              : 'Avans izin limiti kaldırılsın mı?'}
            okText="Onayla"
            cancelText="Vazgeç"
            onConfirm={onGrant}
          >
            <Button type="primary" loading={granting} icon={<CheckCircleOutlined />}>
              {grantLimit > 0 ? 'Tanımla' : 'Kaldır'}
            </Button>
          </Popconfirm>
        </Space>
      </Card>
    </Card>
  );
}
