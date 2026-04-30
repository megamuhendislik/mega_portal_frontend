/**
 * AnomalyFixTestsTab — Yakın anomali fix'leri spec testleri tek tab.
 *
 * "Tam Yeniden Hesaplama" raporlarinda tespit edilen ve fix edilen anomalileri
 * canli kodda tekrarlamadigini garanti eden 32 spec testi tek tikla calistirir.
 *
 * Backend domain: 'recent_fixes' → core.spec_tests.test_recent_fixes
 *
 * Test sınıfları:
 * 1. SpecManualOtIntegrityTest (4) — Sema Melek 2026-03-10
 * 2. SpecApplyApprovedDoubleCountTest (3) — Türkay Kuzey 2026-04-09
 * 3. SpecWorkedBasedEfficiencyTest (9) — verimlilik formülü
 * 4. SpecDataIntegrityAuditTest (4) — manual_ot_integrity audit
 * 5. SpecAnalyticsDeepDiveTest (10) — 6 yeni endpoint smoke
 * 6. SpecAnomalyE2ETest (2) — full recovery flow
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card, Button, Tag, Space, Typography, Progress, Collapse,
  Table, Row, Col, Statistic, Alert, Empty, Divider,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, LoadingOutlined,
  ExclamationCircleOutlined, BugOutlined, CodeOutlined,
  DownloadOutlined, StopOutlined, WarningOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const { Text, Title, Paragraph } = Typography;

const TEST_CLASSES = [
  {
    key: 'SpecApplyApprovedDoubleCountTest',
    label: 'Çift Sayım Engeli',
    count: 1,
    color: '#fa541c',
    description: 'Türkay Kuzey: DUTY+MANUAL_OT+onaylı Fazla Mesai → toplam Fazla Mesai 3.5h (çift sayım yok).',
    references: ['Türkay Kuzey 2026-04-09'],
  },
  {
    key: 'SpecAnomalyE2ETest',
    label: 'End-to-End Recovery',
    count: 2,
    color: '#52c41a',
    description: 'Bozuk veri → recalc → auditor → 0 issue (Sema + Türkay full senaryo).',
    references: ['Full recovery flow'],
  },
  {
    key: 'SpecLiveFlowIntegrationTest',
    label: 'Live Flow (Production Akışı)',
    count: 1,
    color: '#eb2f96',
    description: 'Manager API approve_reject → recalc → çift sayım yok (gerçek API yolu).',
    references: ['POST /api/overtime-requests/<id>/approve_reject/'],
  },
  {
    key: 'SpecDailyCorrectionTest',
    label: 'Günlük Düzeltme',
    count: 1,
    color: '#fa8c16',
    description: 'daily-correction endpoint mid-day modu: cascade=0, açık vardiya korunur.',
    references: ['POST /api/system/health-check/daily-correction/'],
  },
];

const TOTAL_TESTS = TEST_CLASSES.reduce((s, c) => s + c.count, 0);

export default function AnomalyFixTestsTab() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [result, setResult] = useState(null);
  const [runningOutput, setRunningOutput] = useState('');
  const [runningDetails, setRunningDetails] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  const [taskId, setTaskId] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const pollingRef = useRef(null);
  const liveLogRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  const pollStatus = useCallback((taskId) => {
    const poll = async () => {
      try {
        const resp = await api.get(`/system/health-check/get-spec-test-status/?task_id=${taskId}`);
        const data = resp.data;

        if (data.status === 'PROGRESS') {
          if (data.progress != null) setProgress(data.progress);
          setRunningDetails(data.running_details || []);
          setRunningOutput(data.running_output || '');
          if (data.results && data.results.length > 0) {
            const r = data.results.find(x => x.domain === 'recent_fixes');
            if (r) setResult(r);
          }
          pollingRef.current = setTimeout(poll, 2000);
        } else if (data.status === 'SUCCESS') {
          const r = (data.results || []).find(x => x.domain === 'recent_fixes');
          setResult(r || null);
          setRunning(false);
          setProgress(100);
          setRunningDetails([]);
          setRunningOutput('');
          if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        } else if (data.status === 'FAILURE') {
          setErrorMessage(data.error || 'Celery task başarısız oldu.');
          setRunning(false);
          if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        } else {
          pollingRef.current = setTimeout(poll, 2000);
        }
      } catch (err) {
        setErrorMessage(`Polling hatası: ${err?.message || 'Bilinmeyen hata'}`);
        setRunning(false);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      }
    };
    poll();
  }, []);

  const runTests = async () => {
    try {
      setErrorMessage(null);
      setResult(null);
      setRunning(true);
      setProgress(0);
      setRunningDetails([]);
      setRunningOutput('');
      setTaskId(null);
      setElapsedSec(0);
      startTimeRef.current = Date.now();
      // Elapsed timer
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);

      const resp = await api.post('/system/health-check/run-spec-tests/', { domain: 'recent_fixes' });
      if (resp.data.task_id) {
        setTaskId(resp.data.task_id);
        pollStatus(resp.data.task_id);
      }
    } catch (err) {
      setErrorMessage(`Test başlatma hatası: ${err?.response?.data?.error || err?.message || 'Bilinmeyen hata'}`);
      setRunning(false);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    }
  };

  const cancelTests = async () => {
    if (!taskId) return;
    setCancelling(true);
    try {
      await api.post('/system/health-check/cancel-spec-tests/', { task_id: taskId });
      // Stop polling
      if (pollingRef.current) clearTimeout(pollingRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      setRunning(false);
      setErrorMessage(`Test iptal edildi (${elapsedSec}s sonra). Detay log aşağıda.`);
    } catch (err) {
      setErrorMessage(`İptal hatası: ${err?.response?.data?.error || err?.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const downloadLogs = () => {
    const lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('  ANOMALİ FİX TESTLERİ — LOG DOSYASI');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`  Tarih: ${new Date().toLocaleString('tr-TR')}`);
    if (taskId) lines.push(`  Task ID: ${taskId}`);
    lines.push(`  Süre: ${elapsedSec}s`);
    if (result) {
      lines.push(`  Durum: ${result.status}`);
      lines.push(`  Toplam Test: ${result.tests_ran || 0}`);
      lines.push(`  Geçen: ${result.passed || 0}`);
      lines.push(`  Başarısız: ${(result.failed || 0) + (result.errors || 0)}`);
    }
    lines.push('');

    // Test details
    if (result?.test_details?.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('  TEST DETAYLARI');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      result.test_details.forEach((d) => {
        const icon = d.status === 'PASS' ? '✓' : d.status === 'FAIL' ? '✗' : '?';
        lines.push(`  ${icon} ${d.name}${d.message ? ' — ' + d.message : ''}`);
      });
      lines.push('');
    }

    // Running details (during run)
    if (runningDetails.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('  CANLI ÇALIŞMA İZİ');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      runningDetails.forEach((d) => {
        const icon = d.status === 'PASS' ? '✓' : d.status === 'FAIL' ? '✗' : d.status === 'RUNNING' ? '⟳' : '·';
        lines.push(`  ${icon} ${d.name}`);
      });
      lines.push('');
    }

    // Raw output
    if (result?.raw_output) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('  HAM ÇIKTI (Django test runner)');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push(result.raw_output);
    } else if (runningOutput) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('  KISMI ÇIKTI (henüz tamamlanmamış)');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push(runningOutput);
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `anomali-fix-testleri-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (liveLogRef.current) liveLogRef.current.scrollTop = liveLogRef.current.scrollHeight;
  }, [runningOutput, runningDetails]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

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

  const overallStatus = !result ? 'IDLE' : result.status;

  return (
    <div>
      {/* Hero Header */}
      <Card
        style={{
          marginBottom: 16,
          borderLeft: '4px solid #a0522d',
          background: 'linear-gradient(135deg, #fff7e6 0%, #ffffff 50%)',
        }}
      >
        <Row align="middle" gutter={16}>
          <Col flex="60px">
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: 'linear-gradient(135deg, #a0522d, #d4671d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BugOutlined style={{ fontSize: 28, color: '#fff' }} />
            </div>
          </Col>
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>Anomali Fix Testleri</Title>
            <Text type="secondary">
              Tam Yeniden Hesaplama raporlarında tespit edilen anomalilerin canlı kodda
              tekrarlanmadığını garanti eden {TOTAL_TESTS} regresyon testi.
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Button
                type={showLogs ? 'primary' : 'default'}
                ghost={showLogs}
                icon={<CodeOutlined />}
                onClick={() => setShowLogs(v => !v)}
                size="middle"
              >
                {showLogs ? 'Logları Gizle' : 'Logları Göster'}
              </Button>
              {(result || runningDetails.length > 0 || runningOutput) && (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadLogs}
                  size="middle"
                >
                  Logları İndir (TXT)
                </Button>
              )}
              {running && taskId && (
                <Button
                  danger
                  icon={cancelling ? <LoadingOutlined spin /> : <StopOutlined />}
                  onClick={cancelTests}
                  disabled={cancelling}
                  size="middle"
                >
                  {cancelling ? 'İptal ediliyor...' : 'İptal Et'}
                </Button>
              )}
              <Button
                type="primary"
                icon={running ? <LoadingOutlined spin /> : <PlayCircleOutlined />}
                onClick={runTests}
                disabled={running}
                size="large"
              >
                {running ? 'Çalışıyor...' : `${TOTAL_TESTS} Test Çalıştır`}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

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
      {running && (() => {
        // Per-test progress (backend coarse domain progress 1-domain modda hep 0%)
        const testsDone = runningDetails.filter(d => d.status === 'PASS' || d.status === 'FAIL' || d.status === 'ERROR').length;
        const livePercent = TOTAL_TESTS > 0
          ? Math.min(99, Math.round((testsDone / TOTAL_TESTS) * 100))
          : progress;
        const displayPercent = Math.max(progress, livePercent);
        return (
        <Card size="small" style={{ marginBottom: 16, borderLeft: `4px solid ${elapsedSec > 120 ? '#fa541c' : '#1890ff'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <LoadingOutlined spin style={{ fontSize: 18, color: elapsedSec > 120 ? '#fa541c' : '#1890ff' }} />
            <Text strong>Spec testleri çalışıyor (Celery worker)</Text>
            <Tag color="purple">
              {testsDone} / {TOTAL_TESTS} test
            </Tag>
            <Tag color={elapsedSec > 120 ? 'orange' : elapsedSec > 60 ? 'gold' : 'blue'} style={{ marginLeft: 'auto' }}>
              <ClockCircleOutlined /> {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
            </Tag>
          </div>
          {elapsedSec > 180 && testsDone < TOTAL_TESTS && (
            <Alert
              message={`Test ${elapsedSec}s sürüyor — beklenenden uzun`}
              description={`${testsDone}/${TOTAL_TESTS} test tamamlandı. Subprocess yavaş çalışıyor olabilir veya hung olmuş olabilir. İptal edebilir veya beklemeye devam edebilirsiniz. Backend hard timeout: 300s.`}
              type="warning"
              icon={<WarningOutlined />}
              showIcon
              style={{ marginBottom: 8 }}
            />
          )}
          <Progress
            percent={displayPercent}
            status={elapsedSec > 240 ? 'exception' : 'active'}
            format={(p) => `${p}% (${testsDone}/${TOTAL_TESTS})`}
          />
          {showLogs && (runningDetails.length > 0 || runningOutput) && (
            <div
              ref={liveLogRef}
              style={{
                marginTop: 12,
                background: '#0f172a', color: '#e2e8f0',
                padding: 12, borderRadius: 6,
                fontFamily: 'monospace', fontSize: 11,
                maxHeight: 240, overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {runningDetails.map((d, i) => {
                let icon = '·';
                let color = '#94a3b8';
                if (d.status === 'PASS') { icon = '✓'; color = '#86efac'; }
                else if (d.status === 'FAIL') { icon = '✗'; color = '#fca5a5'; }
                else if (d.status === 'ERROR') { icon = '⚠'; color = '#fcd34d'; }
                else if (d.status === 'RUNNING') { icon = '⟳'; color = '#93c5fd'; }
                return (
                  <div key={i} style={{ color }}>
                    {icon} {d.name}
                  </div>
                );
              })}
              {runningOutput && <div style={{ color: '#94a3b8', marginTop: 8 }}>{runningOutput}</div>}
            </div>
          )}
        </Card>
        );
      })()}

      {/* Result Summary */}
      {result && (
        <Card style={{ marginBottom: 16, borderLeft: `4px solid ${result.status === 'PASS' ? '#52c41a' : '#f5222d'}` }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Toplam Test"
                value={result.tests_ran || 0}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Geçen"
                value={result.passed || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Başarısız"
                value={(result.failed || 0) + (result.errors || 0)}
                valueStyle={{ color: (result.failed || 0) + (result.errors || 0) > 0 ? '#f5222d' : '#999' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Süre"
                value={`${(result.duration || 0).toFixed(1)}s`}
              />
            </Col>
          </Row>
          {result.status === 'PASS' && (
            <Alert
              message="Tüm anomali fix'leri canlı kodda korunuyor"
              description="Sema Melek + Türkay Kuzey anomali pattern'leri tekrarlamıyor. Bir sonraki Tam Yeniden Hesaplama raporunda bu kategoride 0 FAIL beklenir."
              type="success"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
          {result.status !== 'PASS' && (
            <Alert
              message={`${result.failed || 0} fail + ${result.errors || 0} error tespit edildi`}
              description="Bir veya daha fazla anomali fix'i regresyona uğramış olabilir. Aşağıdaki test detaylarına bakın."
              type="error"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </Card>
      )}

      {/* Test Class Cards */}
      <Row gutter={[16, 16]}>
        {TEST_CLASSES.map((cls) => (
          <Col xs={24} md={12} lg={8} key={cls.key}>
            <Card
              size="small"
              style={{
                borderLeft: `4px solid ${cls.color}`,
                height: '100%',
              }}
              title={
                <Space>
                  <Tag color={cls.color} style={{ margin: 0 }}>{cls.count} test</Tag>
                  <Text strong>{cls.label}</Text>
                </Space>
              }
            >
              <Paragraph style={{ fontSize: 12, marginBottom: 8 }} type="secondary">
                {cls.description}
              </Paragraph>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {cls.references.map((r) => (
                  <div key={r}>📌 {r}</div>
                ))}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Test Details Table (after run) */}
      {result && Array.isArray(result.test_details) && result.test_details.length > 0 && (
        <>
          <Divider />
          <Title level={5}>Test Detayları</Title>
          <Table
            columns={detailColumns}
            dataSource={result.test_details}
            rowKey="name"
            size="small"
            pagination={{ pageSize: 25, showSizeChanger: true }}
          />
        </>
      )}

      {/* Raw Output (collapsible) */}
      {result && result.raw_output && (
        <>
          <Divider />
          <Collapse
            items={[{
              key: 'raw',
              label: <Text type="secondary">Ham Çıktı (Django test runner)</Text>,
              children: (
                <pre style={{
                  background: '#0f172a', color: '#e2e8f0',
                  padding: 12, borderRadius: 6,
                  fontSize: 11, maxHeight: 480, overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}>
                  {result.raw_output}
                </pre>
              ),
            }]}
          />
        </>
      )}

      {!result && !running && (
        <Card style={{ marginTop: 16 }}>
          <Empty
            description={
              <span>
                Henüz test çalıştırılmadı. Yukarıdaki <strong>{TOTAL_TESTS} Test Çalıştır</strong> butonuna basın.
              </span>
            }
          />
        </Card>
      )}
    </div>
  );
}
