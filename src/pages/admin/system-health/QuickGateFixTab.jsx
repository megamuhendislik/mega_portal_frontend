/**
 * QuickGateFixTab — Hızlı Kart Onarımı
 *
 * Belirli gün için GateEventLog'dan Attendance kayıtlarını yeniden oluşturur.
 * Tam yeniden hesaplamadan çok daha hızlı (~2-10sn).
 *
 * Endpoint: POST /api/system/health-check/quick-gate-fix/
 */
import { useState, useCallback } from 'react';
import {
  Card, Button, Tag, Space, Typography, Row, Col, Statistic, Alert,
  Table, DatePicker, InputNumber, Switch, Divider, Empty, Descriptions,
} from 'antd';
import {
  ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LoadingOutlined, SyncOutlined, InfoCircleOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../../services/api';

const { Text, Title } = Typography;

const ACTION_MAP = {
  CREATE: { color: 'green', icon: <PlusOutlined />, label: 'Yeni Kayıt' },
  UPDATE: { color: 'blue', icon: <EditOutlined />, label: 'Güncelleme' },
  DELETE: { color: 'red', icon: <DeleteOutlined />, label: 'Silme' },
};

const STATUS_TAG = {
  OK: { color: 'green', text: 'Uyumlu' },
  DRY_RUN: { color: 'orange', text: 'Onarım Gerekli' },
  FIXED: { color: 'blue', text: 'Onarıldı' },
};

export default function QuickGateFixTab() {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(dayjs());
  const [employeeId, setEmployeeId] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const runFix = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const body = {
        work_date: date.format('YYYY-MM-DD'),
        dry_run: dryRun,
      };
      if (employeeId) body.employee_id = employeeId;
      const resp = await api.post('/system/health-check/quick-gate-fix/', body);
      setData(resp.data);
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Hata');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, employeeId, dryRun]);

  const pairColumns = [
    { title: 'Giriş', dataIndex: 'check_in', width: 80,
      render: (v) => v ? dayjs(v).format('HH:mm:ss') : '—' },
    { title: 'Çıkış', dataIndex: 'check_out', width: 80,
      render: (v) => v ? dayjs(v).format('HH:mm:ss') : <Tag color="orange">Açık</Tag> },
  ];

  const changeColumns = [
    { title: 'İşlem', dataIndex: 'action', width: 120,
      render: (v) => {
        const cfg = ACTION_MAP[v] || {};
        return <Tag icon={cfg.icon} color={cfg.color}>{cfg.label || v}</Tag>;
      }},
    { title: 'Detay', key: 'detail',
      render: (_, r) => {
        if (r.action === 'CREATE') return `${r.check_in} → ${r.check_out}`;
        if (r.action === 'UPDATE') return `#${r.record_id}: ${r.old_check_out} → ${r.new_check_out}`;
        return '—';
      }},
  ];

  const empColumns = [
    { title: 'Çalışan', dataIndex: 'employee_name', width: 180 },
    { title: 'Gate', dataIndex: 'gate_events', width: 60, align: 'center' },
    { title: 'Pair', dataIndex: 'pairs_found', width: 60, align: 'center' },
    { title: 'Mevcut', dataIndex: 'existing_cards', width: 70, align: 'center' },
    { title: 'Yeni', dataIndex: 'new_records', width: 60, align: 'center',
      render: (v) => v > 0 ? <Tag color="green">{v}</Tag> : v },
    { title: 'Güncellenen', dataIndex: 'updated_records', width: 90, align: 'center',
      render: (v) => v > 0 ? <Tag color="blue">{v}</Tag> : v },
    { title: 'Durum', dataIndex: 'status', width: 120,
      render: (v) => {
        const cfg = STATUS_TAG[v] || { color: 'default', text: v };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      }},
  ];

  const summary = data ? {
    total: data.employees_processed || 0,
    ok: (data.employees || []).filter(e => e.status === 'OK').length,
    needsFix: (data.employees || []).filter(e => e.status === 'DRY_RUN').length,
    fixed: (data.employees || []).filter(e => e.status === 'FIXED').length,
  } : null;

  return (
    <div className="space-y-4">
      <Card>
        <Row justify="space-between" align="middle" wrap>
          <Col>
            <Space direction="vertical" size={2}>
              <Title level={4} style={{ margin: 0 }}>
                <ThunderboltOutlined /> Hızlı Kart Onarımı
              </Title>
              <Text type="secondary">
                GateEventLog'dan Attendance kayıtlarını yeniden eşleştirir.
                Eksik segment'leri oluşturur, yanlış check_out'ları düzeltir.
              </Text>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <Text strong>Tarih:</Text>
              <DatePicker
                value={date}
                onChange={setDate}
                format="YYYY-MM-DD"
                allowClear={false}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>Çalışan ID:</Text>
              <InputNumber
                value={employeeId}
                onChange={setEmployeeId}
                placeholder="Tümü"
                min={1}
                style={{ width: 120 }}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Text strong>Sadece Kontrol:</Text>
              <Switch checked={dryRun} onChange={setDryRun} />
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={loading ? <LoadingOutlined /> : (dryRun ? <SyncOutlined /> : <ThunderboltOutlined />)}
              onClick={runFix}
              loading={loading}
              danger={!dryRun}
            >
              {loading ? 'Çalışıyor...' : (dryRun ? 'Kontrol Et' : 'Onar ve Hesapla')}
            </Button>
          </Col>
        </Row>

        {!dryRun && (
          <Alert
            type="warning"
            showIcon
            message="Canlı mod aktif — kayıtlar değiştirilecek ve yeniden hesaplanacak."
            style={{ marginTop: 12 }}
          />
        )}
      </Card>

      {errorMsg && (
        <Alert type="error" showIcon message="Hata" description={errorMsg} closable />
      )}

      {summary && (
        <Card>
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Statistic title="Çalışan" value={summary.total} prefix={<InfoCircleOutlined />} />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Uyumlu"
                value={summary.ok}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title={data.dry_run ? 'Onarım Gerekli' : 'Onarıldı'}
                value={data.dry_run ? summary.needsFix : summary.fixed}
                valueStyle={{ color: data.dry_run ? '#faad14' : '#1890ff' }}
                prefix={data.dry_run ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic title="Yeni Kayıt" value={data.total_new_records} valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col xs={12} md={4}>
              <Statistic title="Güncellenen" value={data.total_updated_records} valueStyle={{ color: '#1890ff' }} />
            </Col>
            <Col xs={12} md={4}>
              <Statistic title="Süre" value={`${data.elapsed_seconds}s`} />
            </Col>
          </Row>
        </Card>
      )}

      {data?.employees?.length > 0 && (
        <Card title="Çalışan Detayları" size="small">
          <Table
            size="small"
            rowKey="employee_id"
            dataSource={data.employees}
            columns={empColumns}
            pagination={false}
            scroll={{ x: 700 }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: 8 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Text strong>GateEventLog Pair'leri:</Text>
                      <Table
                        size="small"
                        rowKey={(_, i) => i}
                        dataSource={record.pairs || []}
                        columns={pairColumns}
                        pagination={false}
                        style={{ marginTop: 8 }}
                      />
                    </Col>
                    {record.changes?.length > 0 && (
                      <Col xs={24} md={12}>
                        <Text strong>Yapılan/Yapılacak Değişiklikler:</Text>
                        <Table
                          size="small"
                          rowKey={(_, i) => i}
                          dataSource={record.changes}
                          columns={changeColumns}
                          pagination={false}
                          style={{ marginTop: 8 }}
                        />
                      </Col>
                    )}
                  </Row>
                  {record.recalculated && (
                    <Tag color="blue" style={{ marginTop: 8 }}>
                      <CheckCircleOutlined /> Yeniden hesaplandı
                    </Tag>
                  )}
                  {record.recalc_error && (
                    <Alert type="error" message={record.recalc_error} style={{ marginTop: 8 }} />
                  )}
                </div>
              ),
              rowExpandable: (record) =>
                (record.pairs?.length > 0) || (record.changes?.length > 0),
            }}
          />
        </Card>
      )}

      {data?.errors?.length > 0 && (
        <Card title="Hatalar" size="small">
          {data.errors.map((e, i) => (
            <Alert
              key={i}
              type="error"
              message={`${e.employee_name} (ID: ${e.employee_id})`}
              description={e.error}
              style={{ marginBottom: 8 }}
            />
          ))}
        </Card>
      )}

      {!data && !loading && !errorMsg && (
        <Card>
          <Empty description="Tarih seçip 'Kontrol Et' butonuna basın." />
        </Card>
      )}
    </div>
  );
}
