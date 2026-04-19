/**
 * PostFixAuditTab — 2026-04-19 Bug Fix Paketi Doğrulama
 *
 * 15 fix için canlı durum kontrolü yapar. Her fix için bir kart gösterir:
 *   - Yeşil: beklenen davranış aktif, sorun yok
 *   - Sarı : küçük uyarı (eski kalıntı, manual cleanup gerekebilir)
 *   - Kırmızı: fix çalışmıyor (migration fail, regresyon vb.)
 *   - Mavi (info): bilgilendirme
 *
 * Endpoint: GET /api/system/health-check/post-fix-audit/
 * Tamamen read-only.
 */
import { useState, useCallback } from 'react';
import {
  Card, Button, Tag, Space, Typography, Row, Col, Statistic, Alert,
  Table, Empty, Badge,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, LoadingOutlined,
  WarningOutlined, InfoCircleOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const { Text, Title, Paragraph } = Typography;

const STATUS_MAP = {
  ok:      { color: 'success', icon: <CheckCircleOutlined />, label: 'OK',       tagColor: 'green',   border: '#52c41a' },
  warning: { color: 'warning', icon: <WarningOutlined />,     label: 'UYARI',   tagColor: 'orange',  border: '#faad14' },
  fail:    { color: 'error',   icon: <CloseCircleOutlined />, label: 'BAŞARISIZ',tagColor: 'red',    border: '#f5222d' },
  info:    { color: 'default', icon: <InfoCircleOutlined />,  label: 'BİLGİ',    tagColor: 'blue',    border: '#1890ff' },
  error:   { color: 'error',   icon: <ExclamationCircleOutlined />, label: 'HATA', tagColor: 'volcano', border: '#722ed1' },
};

const SEVERITY_MAP = {
  CRITICAL: { color: 'red',    label: 'KRİTİK' },
  HIGH:     { color: 'orange', label: 'YÜKSEK' },
  MEDIUM:   { color: 'gold',   label: 'ORTA' },
};

export default function PostFixAuditTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastRun, setLastRun] = useState(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await api.get('/system/health-check/post-fix-audit/');
      setData(resp.data);
      setLastRun(new Date());
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Denetim başarısız');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderExamples = (examples) => {
    if (!examples || examples.length === 0) return null;
    const keys = Object.keys(examples[0] || {});
    return (
      <div style={{ marginTop: 12 }}>
        <Text strong style={{ fontSize: 12 }}>Örnek kayıtlar (ilk {examples.length}):</Text>
        <Table
          size="small"
          rowKey={(r, i) => i}
          pagination={false}
          style={{ marginTop: 6 }}
          dataSource={examples}
          columns={keys.map((k) => ({
            title: k,
            dataIndex: k,
            ellipsis: true,
            render: (v) => {
              if (v === null || v === undefined) return <Text type="secondary">—</Text>;
              if (typeof v === 'object') return <Text code style={{ fontSize: 11 }}>{JSON.stringify(v)}</Text>;
              return <Text style={{ fontSize: 12 }}>{String(v)}</Text>;
            },
          }))}
        />
      </div>
    );
  };

  const renderCheck = (c) => {
    const cfg = STATUS_MAP[c.status] || STATUS_MAP.error;
    const sev = SEVERITY_MAP[c.severity] || { color: 'default', label: c.severity };
    return (
      <Card
        key={c.id}
        size="small"
        style={{ marginBottom: 12, borderLeft: `4px solid ${cfg.border}` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Space wrap>
              <Tag color={sev.color} style={{ fontWeight: 'bold' }}>{c.id}</Tag>
              <Tag color={sev.color}>{sev.label}</Tag>
              <Tag icon={cfg.icon} color={cfg.tagColor}>{cfg.label}</Tag>
              <Text strong style={{ fontSize: 15 }}>{c.title}</Text>
              {typeof c.count === 'number' && c.count > 0 && (
                <Badge count={c.count} style={{ backgroundColor: cfg.border }} />
              )}
            </Space>
            {c.detail && (
              <Paragraph style={{ marginTop: 6, marginBottom: 0, color: '#444', fontSize: 13 }}>
                {c.detail}
              </Paragraph>
            )}
            {renderExamples(c.examples)}
          </div>
        </div>
      </Card>
    );
  };

  const summary = data?.summary;
  const checks = data?.checks || [];

  // Kritik/yüksek/orta gruplarına ayır
  const critical = checks.filter((c) => c.severity === 'CRITICAL');
  const high = checks.filter((c) => c.severity === 'HIGH');
  const medium = checks.filter((c) => c.severity === 'MEDIUM');

  return (
    <div className="space-y-4">
      <Card>
        <Row justify="space-between" align="middle" gutter={[16, 8]}>
          <Col flex="auto">
            <Space direction="vertical" size={2}>
              <Title level={4} style={{ margin: 0 }}>
                <SafetyCertificateOutlined /> 2026-04-19 Fix Doğrulama (15 Bug)
              </Title>
              <Text type="secondary">
                Son fix paketinin (C1-C5, H1-H5, M2/M4-M7) Railway prod'da beklenen davranışta olduğunu doğrular.
                Salt okunur — hiçbir yazım yapılmaz.
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
          <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
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
              <Statistic title="Toplam" value={summary.total} prefix={<InfoCircleOutlined />} />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="OK"
                value={summary.ok}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Uyarı"
                value={summary.warning || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Başarısız"
                value={summary.fail || 0}
                valueStyle={{ color: '#f5222d' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Bilgi"
                value={summary.info || 0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<InfoCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Hata"
                value={summary.error || 0}
                valueStyle={{ color: '#722ed1' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      {critical.length > 0 && (
        <div>
          <Title level={5} style={{ color: '#f5222d', marginBottom: 8 }}>
            🔴 CRITICAL ({critical.length})
          </Title>
          {critical.map(renderCheck)}
        </div>
      )}

      {high.length > 0 && (
        <div>
          <Title level={5} style={{ color: '#fa8c16', marginBottom: 8, marginTop: 16 }}>
            🟠 HIGH ({high.length})
          </Title>
          {high.map(renderCheck)}
        </div>
      )}

      {medium.length > 0 && (
        <div>
          <Title level={5} style={{ color: '#faad14', marginBottom: 8, marginTop: 16 }}>
            🟡 MEDIUM ({medium.length})
          </Title>
          {medium.map(renderCheck)}
        </div>
      )}

      {!data && !loading && !errorMsg && (
        <Card>
          <Empty description="Henüz test çalıştırılmadı. 'Testi Başlat' düğmesine basın." />
        </Card>
      )}

      {data && (
        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
          <Space direction="vertical" size={4}>
            <Text strong>Kontrol Edilen Fix'ler:</Text>
            <Text style={{ fontSize: 12 }}><Text strong>C1-C5:</Text> CLOSED status, SPLIT CASCADE, CARD unique, GateEventLog TOCTOU, FALLBACK OT zone</Text>
            <Text style={{ fontSize: 12 }}><Text strong>H1-H5:</Text> Atomic approve, HR fiscal lock, Deficit+OT çakışması, DUTY/CARD priority, Weekly OT MANUAL_OT</Text>
            <Text style={{ fontSize: 12 }}><Text strong>M2, M4-M7:</Text> HOSPITAL_VISIT isolation, PDKS immediate retry, Batch 1000, FiscalPeriod range, FAILED log timestamp</Text>
          </Space>
        </Card>
      )}
    </div>
  );
}
