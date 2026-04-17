/**
 * BugFixVerificationTab — Canlı Bug Fix Doğrulama
 *
 * 2026-04-17 bug fix paketinin (6 fix) prod/Railway'de aktif olduğunu
 * read-only olarak doğrular. Hiçbir kayıt yazılmaz, log eklenmez.
 *
 * Endpoint: GET /api/system/health-check/live-bugfix-audit/
 */
import { useState, useCallback } from 'react';
import {
  Card, Button, Tag, Space, Typography, Row, Col, Statistic, Alert,
  Table, Collapse, Empty, Divider,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, LoadingOutlined, ReloadOutlined,
  WarningOutlined, InfoCircleOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

const STATUS_MAP = {
  PASS: { color: 'success', icon: <CheckCircleOutlined />, label: 'GEÇTİ', tagColor: 'green' },
  FAIL: { color: 'error', icon: <CloseCircleOutlined />, label: 'BAŞARISIZ', tagColor: 'red' },
  WARN: { color: 'warning', icon: <WarningOutlined />, label: 'UYARI', tagColor: 'orange' },
  ERROR: { color: 'error', icon: <ExclamationCircleOutlined />, label: 'HATA', tagColor: 'volcano' },
};

export default function BugFixVerificationTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastRun, setLastRun] = useState(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await api.get('/system/health-check/live-bugfix-audit/');
      setData(resp.data);
      setLastRun(new Date());
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Denetim başarısız');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderSamples = (samples) => {
    if (!samples || samples.length === 0) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <Text strong>Örnek kayıtlar:</Text>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          style={{ marginTop: 8 }}
          dataSource={samples}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 70 },
            { title: 'Çalışan', dataIndex: 'employee' },
            { title: 'Tarih', dataIndex: 'date', width: 110 },
            { title: 'Giriş', dataIndex: 'check_in', render: (v) => v?.slice(11, 16) || '—', width: 70 },
            { title: 'Çıkış', dataIndex: 'check_out', render: (v) => v?.slice(11, 16) || '—', width: 70 },
            { title: 'Status', dataIndex: 'status', width: 120,
              render: (v) => <Tag>{v}</Tag> },
          ]}
        />
      </div>
    );
  };

  const renderResult = (r) => {
    const cfg = STATUS_MAP[r.status] || STATUS_MAP.ERROR;
    return (
      <Card
        key={r.key}
        size="small"
        style={{
          marginBottom: 12,
          borderLeft: `4px solid ${r.status === 'PASS' ? '#52c41a' :
                                     r.status === 'FAIL' ? '#f5222d' :
                                     r.status === 'WARN' ? '#faad14' : '#722ed1'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Space>
              <Tag icon={cfg.icon} color={cfg.tagColor}>{cfg.label}</Tag>
              <Text strong style={{ fontSize: 15 }}>{r.title}</Text>
            </Space>
            {r.description && (
              <Paragraph style={{ marginTop: 6, marginBottom: 0, color: '#666' }}>
                {r.description}
              </Paragraph>
            )}
            {r.detail && (
              <Text code style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                {r.detail}
              </Text>
            )}
            {r.note && (
              <Alert
                type="info"
                showIcon
                message={r.note}
                style={{ marginTop: 8 }}
              />
            )}
            {r.remediation && (
              <Alert
                type="warning"
                showIcon
                message="Düzeltme komutu"
                description={<Text code>{r.remediation}</Text>}
                style={{ marginTop: 8 }}
              />
            )}
            {renderSamples(r.samples)}
          </div>
        </div>
      </Card>
    );
  };

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={2}>
              <Title level={4} style={{ margin: 0 }}>
                <SafetyCertificateOutlined /> Canlı Bug Fix Doğrulama
              </Title>
              <Text type="secondary">
                2026-04-17 fix paketi prod/Railway'de aktif mi kontrol eder.
                Tamamen read-only — DB'ye yazılmaz, log emit edilmez.
              </Text>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={loading ? <LoadingOutlined /> : <PlayCircleOutlined />}
              onClick={runAudit}
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Çalışıyor...' : (data ? 'Tekrar Çalıştır' : 'Testi Başlat')}
            </Button>
          </Col>
        </Row>
        {lastRun && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Son çalışma: {lastRun.toLocaleString('tr-TR')}
          </Text>
        )}
      </Card>

      {errorMsg && (
        <Alert type="error" showIcon message="Doğrulama Hatası" description={errorMsg} closable />
      )}

      {summary && (
        <Card>
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Statistic title="Toplam Test" value={summary.total} prefix={<InfoCircleOutlined />} />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Geçen"
                value={summary.passed}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Başarısız"
                value={summary.failed}
                valueStyle={{ color: '#f5222d' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Uyarı"
                value={summary.warnings || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Hata"
                value={summary.errors}
                valueStyle={{ color: '#722ed1' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <div>
                <Text type="secondary">Genel</Text>
                <div style={{ marginTop: 6 }}>
                  <Tag
                    icon={STATUS_MAP[summary.overall]?.icon}
                    color={STATUS_MAP[summary.overall]?.tagColor || 'default'}
                    style={{ fontSize: 14, padding: '4px 12px' }}
                  >
                    {STATUS_MAP[summary.overall]?.label || summary.overall}
                  </Tag>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {data?.results?.length > 0 && (
        <div>{data.results.map(renderResult)}</div>
      )}

      {!data && !loading && !errorMsg && (
        <Card>
          <Empty description="Henüz test çalıştırılmadı. 'Testi Başlat' düğmesine basın." />
        </Card>
      )}

      {data && (
        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
          <Space direction="vertical" size={4}>
            <Text strong>Test Edilen Fix'ler:</Text>
            <Text style={{ fontSize: 12 }}>
              <Text strong>Fix #1:</Text> views_requests.py — Kartsız giriş onay get_or_create MultipleObjectsReturned
            </Text>
            <Text style={{ fontSize: 12 }}>
              <Text strong>Fix #2/#3:</Text> daily_service retro-split + gate_service overlap_guard — Zombie parent
            </Text>
            <Text style={{ fontSize: 12 }}>
              <Text strong>Fix #4:</Text> retry_unprocessed_gate_events — Timestamp-based duplicate check
            </Text>
            <Text style={{ fontSize: 12 }}>
              <Text strong>Fix #5:</Text> Celery task time_limit (check_absenteeism / update_periodic / midnight_reset)
            </Text>
            <Text style={{ fontSize: 12 }}>
              <Text strong>Fix #7:</Text> fix_zombie_split_parents management command
            </Text>
          </Space>
        </Card>
      )}
    </div>
  );
}
