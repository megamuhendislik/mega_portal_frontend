/**
 * QuickReentryTestTab — 2026-04-22 Quick Re-Entry Prevention Doğrulama
 *
 * gate_service._process_in QUICK RE-ENTRY bug'ı — kısa gap OUT+IN event
 * çiftlerinin (örn. 17:22 OUT + 17:23 IN) tek kayda birleştirilmesi —
 * canlıda çözülmüş mü? Sim 11'de 17 çalışanda aynı pattern tespit edildi.
 *
 * Read-only audit. DB'ye yazılmaz.
 * Endpoint: GET /api/system/health-check/quick-reentry-audit/
 */
import { useState, useCallback, useEffect } from 'react';
import {
  Card, Button, Tag, Space, Typography, Row, Col, Statistic, Alert,
  Table, Divider,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, LoadingOutlined, ReloadOutlined,
  WarningOutlined, SafetyCertificateOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const { Text, Title, Paragraph } = Typography;

const STATUS_MAP = {
  PASS: { color: 'success', icon: <CheckCircleOutlined />, label: 'GEÇTİ', tagColor: 'green' },
  FAIL: { color: 'error', icon: <CloseCircleOutlined />, label: 'BAŞARISIZ', tagColor: 'red' },
  WARN: { color: 'warning', icon: <WarningOutlined />, label: 'UYARI', tagColor: 'orange' },
  ERROR: { color: 'error', icon: <ExclamationCircleOutlined />, label: 'HATA', tagColor: 'volcano' },
};

export default function QuickReentryTestTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastRun, setLastRun] = useState(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await api.get('/system/health-check/quick-reentry-audit/');
      setData(resp.data);
      setLastRun(new Date());
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Denetim başarısız');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  const renderSamples = (samples) => {
    if (!samples || samples.length === 0) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <Text strong style={{ fontSize: 13 }}>Şüpheli kayıtlar (ilk 10):</Text>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          style={{ marginTop: 8 }}
          dataSource={samples}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 80 },
            { title: 'Çalışan', dataIndex: 'employee' },
            { title: 'Tarih', dataIndex: 'date', width: 110 },
            { title: 'Giriş', dataIndex: 'check_in', width: 70 },
            { title: 'Çıkış', dataIndex: 'check_out', width: 70 },
            { title: 'Durum', dataIndex: 'status', width: 140,
              render: (v) => <Tag>{v}</Tag> },
          ]}
        />
      </div>
    );
  };

  const renderResult = (r) => {
    const cfg = STATUS_MAP[r.status] || STATUS_MAP.ERROR;
    const borderColor = r.status === 'PASS' ? '#52c41a' :
                        r.status === 'FAIL' ? '#f5222d' :
                        r.status === 'WARN' ? '#faad14' : '#722ed1';
    return (
      <Card
        key={r.key}
        size="small"
        style={{
          marginBottom: 12,
          borderLeft: `4px solid ${borderColor}`,
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
              <div style={{ marginTop: 8, padding: 8, background: '#fafafa', borderRadius: 4 }}>
                <Text code style={{ fontSize: 12 }}>{r.detail}</Text>
              </div>
            )}
            {renderSamples(r.samples)}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
        padding: 20, borderRadius: 12, marginBottom: 20,
        border: '1px solid #91d5ff',
      }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                <SafetyCertificateOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                Quick Re-Entry Prevention Doğrulama
              </Title>
              <Text type="secondary">
                gate_service._process_in: kısa gap OUT+IN event çiftleri artık ayrı kayıt olarak tutulur
              </Text>
              <Text style={{ fontSize: 12, color: '#888' }}>
                Fix tarihi: 2026-04-22 • Sim 11'de 17 çalışanda tespit edilen merge pattern'i çözen fix
              </Text>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={loading ? <LoadingOutlined spin /> : <ReloadOutlined />}
              onClick={runAudit}
              disabled={loading}
              size="large"
            >
              {loading ? 'Denetleniyor...' : 'Denetimi Tekrarla'}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Error */}
      {errorMsg && (
        <Alert
          message="Denetim Hatası" description={errorMsg}
          type="error" showIcon closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Summary */}
      {data && (
        <Card
          style={{
            marginBottom: 20,
            borderLeft: `6px solid ${data.overall === 'PASS' ? '#52c41a' : '#f5222d'}`,
          }}
        >
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Statistic
                title="Genel Sonuç"
                value={data.overall}
                valueStyle={{
                  color: data.overall === 'PASS' ? '#52c41a' : '#f5222d',
                  fontSize: 28,
                  fontWeight: 'bold',
                }}
                prefix={data.overall === 'PASS'
                  ? <CheckCircleOutlined />
                  : <CloseCircleOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic title="Geçen" value={data.summary?.pass || 0}
                valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col span={4}>
              <Statistic title="Başarısız" value={data.summary?.fail || 0}
                valueStyle={{ color: '#f5222d' }} />
            </Col>
            <Col span={4}>
              <Statistic title="Uyarı" value={data.summary?.warn || 0}
                valueStyle={{ color: '#faad14' }} />
            </Col>
            <Col span={4}>
              <Statistic title="Hata" value={data.summary?.error || 0}
                valueStyle={{ color: '#722ed1' }} />
            </Col>
            <Col span={2}>
              <div style={{ textAlign: 'right' }}>
                <ClockCircleOutlined style={{ fontSize: 24, color: '#888' }} />
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  {lastRun ? lastRun.toLocaleTimeString('tr-TR') : '-'}
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Results */}
      {data?.results && (
        <div>
          <Divider style={{ margin: '16px 0' }}>
            <Text strong>Denetim Sonuçları ({data.results.length})</Text>
          </Divider>
          {data.results.map(renderResult)}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <div style={{ marginTop: 16, color: '#666' }}>
            Denetim çalışıyor…
          </div>
        </Card>
      )}
    </div>
  );
}
