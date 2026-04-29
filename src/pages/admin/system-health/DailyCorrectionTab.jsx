/**
 * DailyCorrectionTab — Günlük Düzeltme: tek gün için recalc.
 *
 * Backend: POST /api/system/health-check/daily-correction/
 * Bugün → is_live=True (mid-day). Geçmiş gün → is_live=False + MonthlyWorkSummary cascade.
 */
import { useState } from 'react';
import {
  Card, Button, DatePicker, Input, Radio, Space, Typography,
  Alert, Tag, Statistic, Row, Col, Table, Modal, Divider,
} from 'antd';
import {
  PlayCircleOutlined, DownloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../../services/api';

const { Text, Title, Paragraph } = Typography;

function ResultPanel({ result }) {
  const { status, summary, changes, changes_total } = result;
  const isDryRun = summary.mode === 'DRY-RUN';

  const downloadTxt = () => {
    const lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('  GÜNLÜK DÜZELTME — RAPOR');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`  Tarih: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
    lines.push(`  Gün: ${summary.date}${summary.is_today ? ' (BUGÜN, mid-day)' : ''}`);
    lines.push(`  Mod: ${summary.mode}`);
    lines.push(`  Çalışan: ${summary.employees_scanned}`);
    lines.push(`  Süre: ${summary.duration_seconds}s`);
    lines.push('');

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('  ÖZET');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`  Durum: ${status}`);
    lines.push(`  Çalışan tarama: ${summary.employees_scanned}`);
    lines.push(`  Değişen çalışan: ${summary.employees_changed}`);
    lines.push(`  Recalc çağrısı: ${summary.recalc_count}`);
    lines.push(`  Cascade çağrısı: ${summary.cascade_count}${summary.is_today ? ' (bugün → cascade YAPILMAZ)' : ''}`);
    lines.push(`  Hata sayısı: ${(summary.errors || []).length}`);
    lines.push('');

    if (changes && changes.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push(`  DEĞİŞEN KAYITLAR (${changes_total} toplam, ilk ${changes.length} gösteriliyor)`);
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      changes.forEach((c) => {
        lines.push(`  ${c.employee_code} ${c.employee_name}`);
        lines.push(`    Önce: ${JSON.stringify(c.before)}`);
        lines.push(`    Sonra: ${JSON.stringify(c.after)}`);
        lines.push('');
      });
    }

    if (summary.errors && summary.errors.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push(`  HATALAR (${summary.errors.length})`);
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      summary.errors.forEach((e) => {
        lines.push(`  [${e.employee_id}] ${e.employee_name}: ${e.error}`);
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date()).replace(' ', 'T').replace(/:/g, '-');
    a.href = url;
    a.download = `gunluk-duzeltme-${summary.date}-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      style={{ marginTop: 16 }}
      type="inner"
      title={
        <Space>
          {status === 'OK' ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
            : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          <Text>Rapor — {summary.date}</Text>
          <Tag color={isDryRun ? 'blue' : 'green'}>{summary.mode}</Tag>
          {status === 'PARTIAL' && <Tag color="orange">PARTIAL</Tag>}
        </Space>
      }
      extra={<Button icon={<DownloadOutlined />} onClick={downloadTxt}>TXT İndir</Button>}
    >
      <Alert
        type={isDryRun ? 'info' : status === 'OK' ? 'success' : 'warning'}
        message={
          isDryRun
            ? 'ℹ Önizleme — DB değişmedi'
            : status === 'OK'
              ? `✓ ${summary.employees_changed} çalışan güncellendi`
              : `⚠ ${summary.employees_changed} güncellendi, ${(summary.errors || []).length} hata`
        }
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={6}><Statistic title="Tarama" value={summary.employees_scanned} /></Col>
        <Col span={6}><Statistic title="Değişen" value={summary.employees_changed}
          valueStyle={{ color: summary.employees_changed > 0 ? '#1890ff' : undefined }} /></Col>
        <Col span={6}><Statistic title="Cascade" value={summary.cascade_count}
          suffix={summary.is_today ? '(today=skip)' : ''} /></Col>
        <Col span={6}><Statistic title="Süre (s)" value={summary.duration_seconds} /></Col>
      </Row>

      {summary.errors && summary.errors.length > 0 && (
        <>
          <Divider />
          <Alert
            type="warning"
            message={`${summary.errors.length} hata`}
            description={summary.errors.slice(0, 5).map((e, i) => (
              <div key={`${e.employee_id}-${i}`}>[{e.employee_id}] {e.employee_name}: {e.error}</div>
            ))}
          />
        </>
      )}

      {changes && changes.length > 0 && (
        <>
          <Divider />
          <Title level={5}>Değişen Kayıtlar ({changes_total})</Title>
          <Table
            dataSource={changes}
            rowKey={(r, idx) => `${r.employee_code}-${idx}`}
            columns={[
              { title: 'Sicil', dataIndex: 'employee_code', width: 100 },
              { title: 'Ad', dataIndex: 'employee_name' },
              { title: 'Önce', dataIndex: 'before', render: (v) => <pre style={{ fontSize: 10 }}>{JSON.stringify(v, null, 1)}</pre> },
              { title: 'Sonra', dataIndex: 'after', render: (v) => <pre style={{ fontSize: 10 }}>{JSON.stringify(v, null, 1)}</pre> },
            ]}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </>
      )}
    </Card>
  );
}

export default function DailyCorrectionTab() {
  const [date, setDate] = useState(dayjs());
  const [employeeId, setEmployeeId] = useState('');
  const [mode, setMode] = useState('dry_run');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!date) {
      setError('Tarih seçilmeli');
      return;
    }
    if (date.isAfter(dayjs(), 'day')) {
      setError('Gelecek tarih seçilemez');
      return;
    }

    if (mode === 'apply') {
      const confirmed = await new Promise((resolve) => {
        Modal.confirm({
          title: 'Günlük Düzeltme — Onay',
          content: `${date.format('YYYY-MM-DD')} için ${employeeId ? `sicil ${employeeId}` : 'tüm aktif çalışanlar'} recalculate edilecek. Onaylıyor musun?`,
          okText: 'Uygula',
          cancelText: 'İptal',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const resp = await api.post('/system/health-check/daily-correction/', {
        date: date.format('YYYY-MM-DD'),
        employee_id: employeeId || undefined,
        mode,
      });
      setResult(resp.data);
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Bilinmeyen hata';
      setError(errMsg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card title="Günlük Düzeltme">
      <Paragraph>
        Tek gün için recalculation — bugün için <Text code>is_live=True</Text> (şu anki dakikaya kadar),
        geçmiş gün için tam gün + MonthlyWorkSummary cascade.
      </Paragraph>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Row gutter={16} align="bottom">
          <Col span={6}>
            <Text strong>Gün:</Text>
            <DatePicker
              value={date}
              onChange={setDate}
              disabledDate={(d) => d && d.isAfter(dayjs(), 'day')}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Text strong>Personel (opsiyonel):</Text>
            <Input
              placeholder="Sicil no (opsiyonel)"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Text strong>Mod:</Text>
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
              <Radio value="dry_run">Önizleme (Dry-Run)</Radio>
              <Radio value="apply">Uygula (Apply)</Radio>
            </Radio.Group>
          </Col>
          <Col span={4}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={running}
              onClick={handleSubmit}
              size="large"
            >
              Çalıştır
            </Button>
          </Col>
        </Row>

        {error && <Alert type="error" message={error} closable onClose={() => setError(null)} />}

        {result && <ResultPanel result={result} />}
      </Space>
    </Card>
  );
}
