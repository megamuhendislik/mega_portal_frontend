/**
 * MissedOutTestTab — 2026-04-23 Missed-OUT Self-Heal Doğrulama
 *
 * Mid-day OUT event kaybolduğunda live sistem sessiz birleşik kayıt
 * üretiyordu (04-22'de 4 çalışanda). Fix: iki katmanlı GateEventLog
 * self-heal (process_in self-heal + process_out FALLBACK 4 split).
 *
 * Endpoint: GET /api/system/health-check/missed-out-audit/
 */
import { useState, useCallback, useEffect } from 'react';
import {
  Card, Button, Tag, Space, Typography, Row, Col, Statistic, Alert,
  Table, Divider,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined,
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

export default function MissedOutTestTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastRun, setLastRun] = useState(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await api.get('/system/health-check/missed-out-audit/');
      setData(resp.data);
      setLastRun(new Date());
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Denetim başarısız');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runAudit(); }, [runAudit]);

  const renderSamples = (samples) => {
    if (!samples || samples.length === 0) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <Text strong style={{ fontSize: 13 }}>Şüpheli kayıtlar (ilk 10):</Text>
        <Table
          size="small" rowKey="id" pagination={false}
          style={{ marginTop: 8 }}
          dataSource={samples}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 80 },
            { title: 'Çalışan', dataIndex: 'employee' },
            { title: 'Tarih', dataIndex: 'date', width: 110 },
            { title: 'Giriş', dataIndex: 'check_in', width: 70 },
            { title: 'Çıkış', dataIndex: 'check_out', width: 70 },
            { title: 'Kayıp OUT', dataIndex: 'missed_out_time', width: 90,
              render: (v) => <Tag color="orange">{v}</Tag> },
            { title: 'Event Durumu', dataIndex: 'event_status', width: 200,
              render: (v) => <Tag color="volcano" style={{fontSize:11}}>{v}</Tag> },
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
      <Card key={r.key} size="small"
        style={{ marginBottom: 12, borderLeft: `4px solid ${borderColor}` }}>
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
      <div style={{
        background: 'linear-gradient(135deg, #fff7e6 0%, #fff1b8 100%)',
        padding: 20, borderRadius: 12, marginBottom: 20,
        border: '1px solid #ffd666',
      }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                <SafetyCertificateOutlined style={{ color: '#faad14', marginRight: 8 }} />
                Missed-OUT Self-Heal Doğrulama
              </Title>
              <Text type="secondary">
                Kayıp OUT event'lerine karşı iki katmanlı GateEventLog self-heal (process_in + process_out FALLBACK 4)
              </Text>
              <Text style={{ fontSize: 12, color: '#888' }}>
                Fix tarihi: 2026-04-23 • Sim 13'te 04-22 için 4 çalışanda tespit edilen birleşik kayıt pattern'i
              </Text>
            </Space>
          </Col>
          <Col>
            <Button type="primary"
              icon={loading ? <LoadingOutlined spin /> : <ReloadOutlined />}
              onClick={runAudit} disabled={loading} size="large">
              {loading ? 'Denetleniyor...' : 'Denetimi Tekrarla'}
            </Button>
          </Col>
        </Row>
      </div>

      {errorMsg && (
        <Alert message="Denetim Hatası" description={errorMsg}
          type="error" showIcon closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }} />
      )}

      {data && (
        <Card style={{
          marginBottom: 20,
          borderLeft: `6px solid ${data.overall === 'PASS' ? '#52c41a' : '#f5222d'}`,
        }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Statistic title="Genel Sonuç" value={data.overall}
                valueStyle={{
                  color: data.overall === 'PASS' ? '#52c41a' : '#f5222d',
                  fontSize: 28, fontWeight: 'bold',
                }}
                prefix={data.overall === 'PASS' ? <CheckCircleOutlined /> : <CloseCircleOutlined />} />
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

      {data?.results && (
        <div>
          <Divider style={{ margin: '16px 0' }}>
            <Text strong>Denetim Sonuçları ({data.results.length})</Text>
          </Divider>
          {data.results.map(renderResult)}
        </div>
      )}

      {loading && !data && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <LoadingOutlined style={{ fontSize: 48, color: '#faad14' }} />
          <div style={{ marginTop: 16, color: '#666' }}>Denetim çalışıyor…</div>
        </Card>
      )}
    </div>
  );
}
