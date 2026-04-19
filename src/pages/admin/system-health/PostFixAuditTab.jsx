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
  Table, Empty, Badge, Modal, message, Divider,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, LoadingOutlined,
  WarningOutlined, InfoCircleOutlined, SafetyCertificateOutlined,
  ToolOutlined, ThunderboltOutlined, DownloadOutlined,
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
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

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

  const runCleanup = useCallback(async (mode) => {
    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const resp = await api.post('/system/health-check/cleanup-post-fix-residue/', {
        mode,
        categories: ['C5', 'H1', 'H3', 'M2', 'M4'],
      });
      setCleanupResult(resp.data);
      message.success(
        mode === 'apply'
          ? 'Temizlik uygulandı. Denetimi tekrar çalıştırın.'
          : 'Tarama tamamlandı — "Temizliği Uygula" butonuyla gerçekleştirebilirsiniz.'
      );
      if (mode === 'apply') {
        // Otomatik olarak denetimi tekrar çalıştır
        setTimeout(() => runAudit(), 1000);
      }
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Temizlik başarısız');
    } finally {
      setCleanupLoading(false);
    }
  }, [runAudit]);

  const downloadTxt = useCallback(async () => {
    try {
      const resp = await api.get('/system/health-check/post-fix-audit/?format=txt', {
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `post_fix_audit_${stamp}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success('Rapor indirildi');
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'TXT indirme başarısız');
    }
  }, []);

  const confirmApply = () => {
    Modal.confirm({
      title: 'Temizliği Uygulamak İstiyor Musunuz?',
      content: (
        <div>
          <p>Bu işlem aşağıdaki eski veri kalıntılarını onaracak:</p>
          <ul>
            <li><b>C5:</b> Sabah CARD kayıtlarındaki OT için recalc</li>
            <li><b>H1:</b> Orphan APPROVED MANUAL_OT için recalc</li>
            <li><b>H3:</b> Sema Melek pattern (onaylı OT, Mesai=0) için recalc + cascade</li>
            <li><b>M2:</b> Yarım HOSPITAL_VISIT günleri için recalc</li>
            <li><b>M4:</b> Stuck RECEIVED event'ler için gate_retry tetikle</li>
          </ul>
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message="Attendance kayıtları yeniden hesaplanır ve MonthlyWorkSummary cascade edilir. İşlem yoğun, biraz sürebilir."
          />
        </div>
      ),
      okText: 'Uygula',
      cancelText: 'İptal',
      onOk: () => runCleanup('apply'),
      width: 600,
    });
  };

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
            <Space>
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
              <Button
                size="large"
                icon={<DownloadOutlined />}
                onClick={downloadTxt}
                title="Audit raporunu TXT olarak indir"
              >
                TXT İndir
              </Button>
            </Space>
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

      {/* Cleanup Control Card */}
      <Card
        style={{ backgroundColor: '#fff7e6', borderColor: '#ffd591' }}
        title={<Space><ToolOutlined /> Kalıntı Veri Temizliği</Space>}
      >
        <Paragraph style={{ marginBottom: 12 }}>
          Audit'te UYARI gösteren <b>eski veri kalıntılarını</b> otomatik olarak temizler.
          Fix'ler yeni oluşumları zaten engelliyor — bu buton sadece geçmişten kalan
          kayıtları recalc ile senkronize eder.
        </Paragraph>
        <Space wrap>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={() => runCleanup('scan')}
            loading={cleanupLoading}
          >
            Kuru Tara (scan)
          </Button>
          <Button
            type="primary"
            danger
            icon={<ThunderboltOutlined />}
            onClick={confirmApply}
            loading={cleanupLoading}
          >
            Temizliği Uygula (apply)
          </Button>
        </Space>
        {cleanupResult && (
          <div style={{ marginTop: 16 }}>
            <Divider style={{ margin: '8px 0' }} />
            <Text strong>
              {cleanupResult.mode === 'apply' ? 'Temizlik sonucu:' : 'Tarama sonucu:'}
            </Text>
            <div style={{ marginTop: 8 }}>
              {Object.entries(cleanupResult.results || {}).map(([cat, r]) => (
                <Card size="small" key={cat} style={{ marginBottom: 6 }}>
                  <Space>
                    <Tag color="gold">{cat}</Tag>
                    <Text>{r.message}</Text>
                    {r.errors?.length > 0 && (
                      <Tag color="red">⚠ {r.errors.length} hata</Tag>
                    )}
                  </Space>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>

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
