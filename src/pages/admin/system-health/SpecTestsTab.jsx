/**
 * SpecTestsTab — Domain-bazlı Spec Test UI
 *
 * 8 domain kartı ile gerçek davranış testlerini çalıştırır ve sonuçlarını gösterir.
 * Tüm domain loglarını detaylı gösterir (eski stage sistemi gibi).
 */
import { useState, useRef, useCallback } from 'react';
import {
  Card, Button, Tag, Space, Typography, Progress, Collapse,
  Table, Tooltip, Row, Col, Statistic, Alert, Badge,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, LoadingOutlined,
  FieldTimeOutlined, CalendarOutlined, FileTextOutlined,
  LockOutlined, ScheduleOutlined, TeamOutlined,
  SafetyCertificateOutlined, ExclamationCircleOutlined,
  CodeOutlined, DownOutlined, RightOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const { Text, Title } = Typography;

const DOMAINS = [
  {
    key: 'attendance',
    label: 'Devamsızlık & Giriş/Çıkış',
    icon: <ClockCircleOutlined />,
    color: '#1890ff',
    description: 'Kart okuyucu, vardiya hesaplama, tolerans, mola, OT algılama',
  },
  {
    key: 'overtime',
    label: 'Ek Mesai',
    icon: <FieldTimeOutlined />,
    color: '#722ed1',
    description: '3 yol (INTENDED/POTENTIAL/MANUAL), haftalık limit, onay akışı',
  },
  {
    key: 'leave',
    label: 'İzin Sistemi',
    icon: <CalendarOutlined />,
    color: '#13c2c2',
    description: 'FIFO, mazeret izni, sağlık raporu, bakiye hesaplama',
  },
  {
    key: 'requests',
    label: 'Talep Yaşam Döngüsü',
    icon: <FileTextOutlined />,
    color: '#fa8c16',
    description: 'Kartsız giriş, yemek, dış görev, onay/red/iptal akışı',
  },
  {
    key: 'rbac',
    label: 'Yetki & Güvenlik',
    icon: <LockOutlined />,
    color: '#f5222d',
    description: 'Permission gate, IDOR, self-approval engeli, rol mirası',
  },
  {
    key: 'calendar',
    label: 'Takvim & Vardiya',
    icon: <ScheduleOutlined />,
    color: '#52c41a',
    description: 'FiscalCalendar, ScheduleTemplate, tatil, fiscal period kilitleme',
  },
  {
    key: 'managers',
    label: 'Yönetici & Organizasyon',
    icon: <TeamOutlined />,
    color: '#eb2f96',
    description: 'PRIMARY/SECONDARY yetki, yönetici değişim devri, onay zinciri',
  },
  {
    key: 'integrity',
    label: 'Veri Bütünlüğü',
    icon: <SafetyCertificateOutlined />,
    color: '#faad14',
    description: 'MonthlyWorkSummary, overlap tespiti, data integrity audit',
  },
];

const STATUS_CONFIG = {
  PASS: { color: '#52c41a', icon: <CheckCircleOutlined />, text: 'Geçti' },
  FAIL: { color: '#f5222d', icon: <CloseCircleOutlined />, text: 'Başarısız' },
  TIMEOUT: { color: '#fa8c16', icon: <ExclamationCircleOutlined />, text: 'Zaman Aşımı' },
  ERROR: { color: '#f5222d', icon: <ExclamationCircleOutlined />, text: 'Hata' },
  RUNNING: { color: '#1890ff', icon: <LoadingOutlined spin />, text: 'Çalışıyor' },
  IDLE: { color: '#d9d9d9', icon: <ClockCircleOutlined />, text: 'Bekliyor' },
};

export default function SpecTestsTab() {
  const [results, setResults] = useState({});
  const [runningDomains, setRunningDomains] = useState(new Set());
  const [globalRunning, setGlobalRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expandedDomains, setExpandedDomains] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showLogs, setShowLogs] = useState(true);
  const pollingRef = useRef(null);

  const pollStatus = useCallback((taskId, targetDomains) => {
    const poll = async () => {
      try {
        const resp = await api.get(`/system/health-check/get-spec-test-status/?task_id=${taskId}`);
        const data = resp.data;

        if (data.status === 'PROGRESS') {
          // Update current domain info
          if (data.current_domain) setCurrentDomain(data.current_domain);
          if (data.progress != null) setProgressPercent(data.progress);
          // Update completed domain results
          if (data.results) {
            const newResults = {};
            data.results.forEach(r => { newResults[r.domain] = r; });
            setResults(prev => ({ ...prev, ...newResults }));
            // Mark completed domains as no longer running
            const completedKeys = data.results.map(r => r.domain);
            setRunningDomains(prev => {
              const next = new Set(prev);
              completedKeys.forEach(k => next.delete(k));
              return next;
            });
          }
          pollingRef.current = setTimeout(poll, 2000);
        } else if (data.status === 'SUCCESS') {
          const newResults = {};
          (data.results || []).forEach(r => { newResults[r.domain] = r; });
          setResults(prev => ({ ...prev, ...newResults }));
          setSummary(data.summary);
          setRunningDomains(new Set());
          setGlobalRunning(false);
          setCurrentDomain(null);
          setProgressPercent(100);
          // Auto-expand ALL domains with results
          const allKeys = (data.results || []).map(r => r.domain);
          setExpandedDomains(allKeys);
        } else if (data.status === 'FAILURE') {
          // Show the error message!
          setErrorMessage(data.error || 'Celery task başarısız oldu. Detaylar için Railway loglarını kontrol edin.');
          setRunningDomains(new Set());
          setGlobalRunning(false);
          setCurrentDomain(null);
          // Auto-expand any domains that have results (from PROGRESS updates)
          setExpandedDomains(prev => {
            const existingKeys = Object.keys(results);
            return [...new Set([...prev, ...existingKeys])];
          });
        } else {
          pollingRef.current = setTimeout(poll, 2000);
        }
      } catch (err) {
        setErrorMessage(`Polling hatası: ${err?.message || 'Bilinmeyen hata'}`);
        setRunningDomains(new Set());
        setGlobalRunning(false);
        setCurrentDomain(null);
      }
    };
    poll();
  }, [results]);

  const runTests = async (domain = 'all') => {
    try {
      setErrorMessage(null);
      if (domain === 'all') {
        setGlobalRunning(true);
        setRunningDomains(new Set(DOMAINS.map(d => d.key)));
        setResults({});
        setSummary(null);
        setExpandedDomains([]);
        setProgressPercent(0);
        setCurrentDomain(null);
      } else {
        setRunningDomains(prev => new Set([...prev, domain]));
        setResults(prev => {
          const next = { ...prev };
          delete next[domain];
          return next;
        });
      }

      const resp = await api.post('/system/health-check/run-spec-tests/', { domain });
      if (resp.data.task_id) {
        pollStatus(resp.data.task_id, domain === 'all' ? DOMAINS.map(d => d.key) : [domain]);
      }
    } catch (err) {
      setErrorMessage(`Test başlatma hatası: ${err?.response?.data?.error || err?.message || 'Bilinmeyen hata'}`);
      setRunningDomains(new Set());
      setGlobalRunning(false);
    }
  };

  const getDomainStatus = (domainKey) => {
    if (runningDomains.has(domainKey)) return 'RUNNING';
    const r = results[domainKey];
    if (!r) return 'IDLE';
    return r.status;
  };

  const toggleDomain = (domainKey) => {
    setExpandedDomains(prev =>
      prev.includes(domainKey)
        ? prev.filter(k => k !== domainKey)
        : [...prev, domainKey]
    );
  };

  const detailColumns = [
    {
      title: 'Test',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Text code style={{ fontSize: 12 }}>{name}</Text>,
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => (
        <Tag color={s === 'PASS' ? 'success' : 'error'}>
          {s === 'PASS' ? 'Geçti' : 'Başarısız'}
        </Tag>
      ),
    },
    {
      title: 'Mesaj',
      dataIndex: 'message',
      key: 'message',
      render: (m) => m ? <Text type="danger" style={{ fontSize: 12 }}>{m}</Text> : '-',
    },
  ];

  const totalPassed = Object.values(results).reduce((s, r) => s + (r.passed || 0), 0);
  const totalFailed = Object.values(results).reduce((s, r) => s + (r.failed || 0) + (r.errors || 0), 0);
  const totalTests = Object.values(results).reduce((s, r) => s + (r.tests_ran || 0), 0);
  const totalDuration = Object.values(results).reduce((s, r) => s + (r.duration || 0), 0);
  const completedDomains = Object.keys(results).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>Spec Testleri</Title>
          <Text type="secondary">8 domain, gerçek davranış testleri</Text>
        </div>
        <Space>
          <Button
            type={showLogs ? 'primary' : 'default'}
            ghost={showLogs}
            icon={<CodeOutlined />}
            onClick={() => setShowLogs(v => !v)}
            size="small"
          >
            {showLogs ? 'Logları Gizle' : 'Logları Göster'}
          </Button>
          <Button
            type="primary"
            icon={globalRunning ? <LoadingOutlined spin /> : <PlayCircleOutlined />}
            onClick={() => runTests('all')}
            disabled={globalRunning}
            size="large"
          >
            {globalRunning ? 'Çalışıyor...' : 'Tümünü Çalıştır'}
          </Button>
        </Space>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert
          message="Test Hatası"
          description={errorMessage}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMessage(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Running Progress */}
      {globalRunning && (
        <Card size="small" style={{ marginBottom: 16, borderLeft: '4px solid #1890ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LoadingOutlined spin style={{ fontSize: 18, color: '#1890ff' }} />
            <div style={{ flex: 1 }}>
              <Text strong>
                {currentDomain
                  ? `Çalışıyor: ${DOMAINS.find(d => d.key === currentDomain)?.label || currentDomain}`
                  : 'Testler başlatılıyor...'
                }
              </Text>
              <Progress
                percent={progressPercent}
                size="small"
                style={{ marginBottom: 0, marginTop: 4 }}
                format={() => `${completedDomains}/8 domain`}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      {totalTests > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Toplam Test" value={totalTests} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Geçen" value={totalPassed} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Başarısız" value={totalFailed} valueStyle={{ color: totalFailed > 0 ? '#f5222d' : '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Süre" value={`${totalDuration.toFixed(1)}s`} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Domain Cards */}
      <Row gutter={[16, 16]}>
        {DOMAINS.map(domain => {
          const domainStatus = getDomainStatus(domain.key);
          const r = results[domain.key];
          const cfg = STATUS_CONFIG[domainStatus];
          const isExpanded = expandedDomains.includes(domain.key);

          return (
            <Col xs={24} sm={12} lg={6} key={domain.key}>
              <Card
                size="small"
                style={{
                  borderLeft: `4px solid ${cfg.color}`,
                  cursor: r ? 'pointer' : 'default',
                }}
                onClick={() => r && toggleDomain(domain.key)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Space size={4}>
                      <span style={{ color: domain.color, fontSize: 18 }}>{domain.icon}</span>
                      <Text strong style={{ fontSize: 13 }}>{domain.label}</Text>
                    </Space>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{domain.description}</Text>
                    </div>
                  </div>
                  <Space size={4}>
                    {r && (
                      <span style={{ fontSize: 10, color: '#999' }}>
                        {isExpanded ? <DownOutlined /> : <RightOutlined />}
                      </span>
                    )}
                    {!globalRunning && (
                      <Tooltip title="Çalıştır">
                        <Button
                          type="text"
                          size="small"
                          icon={domainStatus === 'RUNNING' ? <LoadingOutlined spin /> : <PlayCircleOutlined />}
                          onClick={(e) => { e.stopPropagation(); runTests(domain.key); }}
                          disabled={runningDomains.size > 0}
                        />
                      </Tooltip>
                    )}
                  </Space>
                </div>

                {/* Status Bar */}
                <div style={{ marginTop: 8 }}>
                  {domainStatus === 'RUNNING' ? (
                    <Progress percent={50} showInfo={false} status="active" size="small" />
                  ) : r ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tag color={cfg.color} icon={cfg.icon}>
                        {r.passed}/{r.tests_ran} {cfg.text}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 11 }}>{r.duration?.toFixed(1)}s</Text>
                    </div>
                  ) : (
                    <Tag color={cfg.color}>{cfg.text}</Tag>
                  )}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Expanded Domain Details + Logs */}
      {expandedDomains.map(domainKey => {
        const r = results[domainKey];
        if (!r) return null;
        const domain = DOMAINS.find(d => d.key === domainKey);

        return (
          <Card
            key={domainKey}
            size="small"
            title={
              <Space>
                <span style={{ color: domain.color }}>{domain.icon}</span>
                {domain.label}
                <Tag color={r.status === 'PASS' ? 'success' : 'error'}>
                  {r.passed}/{r.tests_ran}
                </Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>{r.duration?.toFixed(1)}s</Text>
              </Space>
            }
            extra={
              <Button
                type="text"
                size="small"
                onClick={() => setExpandedDomains(prev => prev.filter(k => k !== domainKey))}
              >
                Kapat
              </Button>
            }
            style={{ marginTop: 16 }}
          >
            {/* Test Detail Table */}
            {r.details?.length > 0 && (
              <Table
                dataSource={r.details.map((d, i) => ({ ...d, key: i }))}
                columns={detailColumns}
                pagination={false}
                size="small"
              />
            )}

            {/* Raw Output — always shown when showLogs is true */}
            {showLogs && r.raw_output && (
              <Collapse
                defaultActiveKey={r.status !== 'PASS' ? ['log'] : []}
                items={[{
                  key: 'log',
                  label: (
                    <Space>
                      <CodeOutlined />
                      <span>Ham Çıktı</span>
                      <Badge
                        count={r.status === 'PASS' ? 'OK' : 'HATA'}
                        style={{
                          backgroundColor: r.status === 'PASS' ? '#52c41a' : '#f5222d',
                          fontSize: 10,
                        }}
                      />
                    </Space>
                  ),
                  children: (
                    <pre style={{
                      fontSize: 11,
                      maxHeight: 400,
                      overflow: 'auto',
                      background: '#1a1a2e',
                      color: '#e0e0e0',
                      padding: 12,
                      borderRadius: 4,
                      fontFamily: 'Consolas, Monaco, monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {r.raw_output}
                    </pre>
                  ),
                }]}
                size="small"
                style={{ marginTop: 8 }}
              />
            )}

            {/* Error message for failed domains */}
            {r.status !== 'PASS' && !r.raw_output && (
              <Alert
                message={`${domain.label} testi başarısız oldu`}
                description={`Durum: ${r.status}, Hata sayısı: ${r.errors || 0}, Başarısız: ${r.failed || 0}`}
                type="error"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
