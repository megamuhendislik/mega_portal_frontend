/**
 * NightlyAuditTab — Gece Denetim Loglari
 *
 * Nightly unified audit task sonuclarini gosterir.
 * Tarih bazli gruplama, renk kodlu eylem gosterimi,
 * ozet istatistikler ve tarih aralik filtresi.
 *
 * Endpoint:
 *   GET /system/health-check/nightly-audit-logs/?date_from=...&date_to=...
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Tag, Button, DatePicker, Statistic, Row, Col,
  Collapse, Badge, Typography, Empty, Spin, Tooltip,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../../services/api';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

// ---- Constants ----

const ACTION_CONFIG = {
  FIXED: { color: 'green', icon: <CheckCircleOutlined />, label: 'Duzeltildi' },
  FIX_FAILED: { color: 'red', icon: <CloseCircleOutlined />, label: 'Basarisiz' },
  FOUND: { color: 'orange', icon: <ExclamationCircleOutlined />, label: 'Bulundu' },
  ERROR: { color: 'red', icon: <CloseCircleOutlined />, label: 'Hata' },
  SUMMARY: { color: 'blue', icon: <ThunderboltOutlined />, label: 'Ozet' },
};

const AUDIT_TYPE_LABELS = {
  REQUEST_LIFECYCLE: 'Talep Yasam Dongusu',
  SPLIT_CHECK: 'Split Dogrulama',
  PDKS_VALIDATION: 'PDKS Dogrulama',
  MONTHLY_CASCADE: 'Aylik Ozet',
  NIGHTLY_SUMMARY: 'Gece Ozet',
};

const LEVEL_COLORS = {
  WARNING: 'orange',
  ERROR: 'red',
  CRITICAL: 'purple',
};

// ---- Component ----

export default function NightlyAuditTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange[0]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
      }
      if (dateRange && dateRange[1]) {
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/system/health-check/nightly-audit-logs/', { params });
      setData(res.data);
    } catch (err) {
      console.error('Nightly audit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const stats = data?.stats || {};
  const groups = data?.groups || [];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Title level={4} className="!mb-1 flex items-center gap-2">
            <span className="text-lg">Gece Denetim Loglari</span>
          </Title>
          <Text type="secondary" className="text-sm">
            Gece otomatik denetim gorevinin sonuclarini goruntuleyin.
            Sorunlar otomatik tespit edilir ve mumkun oldugunca duzeltilir.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker
            value={dateRange}
            onChange={(val) => setDateRange(val)}
            format="DD.MM.YYYY"
            allowClear={false}
            size="small"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
            loading={loading}
            size="small"
          >
            Yenile
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center border-blue-200 bg-blue-50">
            <Statistic
              title={<span className="text-xs text-blue-600">Toplam Calistirma</span>}
              value={stats.total_runs || 0}
              valueStyle={{ color: '#1d4ed8', fontSize: 24 }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center border-orange-200 bg-orange-50">
            <Statistic
              title={<span className="text-xs text-orange-600">Bulunan Sorun</span>}
              value={stats.total_found || 0}
              valueStyle={{ color: '#c2410c', fontSize: 24 }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center border-green-200 bg-green-50">
            <Statistic
              title={<span className="text-xs text-green-600">Duzeltilen</span>}
              value={stats.total_fixed || 0}
              valueStyle={{ color: '#15803d', fontSize: 24 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center border-red-200 bg-red-50">
            <Statistic
              title={<span className="text-xs text-red-600">Hata</span>}
              value={stats.total_errors || 0}
              valueStyle={{ color: '#b91c1c', fontSize: 24 }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Log Groups by Date */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" tip="Loglar yukleniyor..." />
        </div>
      ) : groups.length === 0 ? (
        <Empty description="Bu tarih araliginda gece denetim logu bulunamadi." />
      ) : (
        <Collapse
          accordion
          defaultActiveKey={groups.length > 0 ? [groups[0].date] : []}
          className="border-0"
        >
          {groups.map((group) => {
            const summary = group.summary || {};
            const foundCount = group.entries.filter(e => e.action === 'FOUND').length;
            const fixedCount = group.entries.filter(e => e.action === 'FIXED').length;
            const errorCount = group.entries.filter(e => e.action === 'ERROR' || e.action === 'FIX_FAILED').length;

            return (
              <Panel
                key={group.date}
                header={
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Text strong>{dayjs(group.date).format('DD.MM.YYYY dddd')}</Text>
                      <Badge count={group.entry_count} style={{ backgroundColor: '#6366f1' }} />
                    </div>
                    <div className="flex items-center gap-2">
                      {foundCount > 0 && (
                        <Tag color="orange" className="m-0">
                          <ExclamationCircleOutlined /> {foundCount} bulundu
                        </Tag>
                      )}
                      {fixedCount > 0 && (
                        <Tag color="green" className="m-0">
                          <CheckCircleOutlined /> {fixedCount} duzeltildi
                        </Tag>
                      )}
                      {errorCount > 0 && (
                        <Tag color="red" className="m-0">
                          <CloseCircleOutlined /> {errorCount} hata
                        </Tag>
                      )}
                    </div>
                  </div>
                }
              >
                {/* Day Summary Card */}
                {summary && Object.keys(summary).length > 0 && (
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <Text strong className="text-indigo-700 text-sm">Gece Ozet</Text>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                      <div>
                        <Text type="secondary">Talep Sorun:</Text>{' '}
                        <Text strong>{summary.phase1_found || 0}</Text>
                        {' / '}
                        <Text className="text-green-600">{summary.phase1_fixed || 0} fix</Text>
                      </div>
                      <div>
                        <Text type="secondary">Split Sorun:</Text>{' '}
                        <Text strong>{summary.split_found || 0}</Text>
                        {' / '}
                        <Text className="text-green-600">{summary.split_fixed || 0} fix</Text>
                      </div>
                      <div>
                        <Text type="secondary">PDKS:</Text>{' '}
                        <Text strong>{summary.pdks_issues || 0}</Text>
                      </div>
                      <div>
                        <Text type="secondary">Cascade:</Text>{' '}
                        <Text strong>{summary.cascade_count || 0}</Text>
                        {(summary.cascade_errors || 0) > 0 && (
                          <Text className="text-red-500"> ({summary.cascade_errors} hata)</Text>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Log Entries */}
                <div className="space-y-1.5">
                  {group.entries
                    .filter(e => e.action !== 'SUMMARY')
                    .map((entry, idx) => {
                      const actionCfg = ACTION_CONFIG[entry.action] || {
                        color: 'default',
                        icon: <EyeOutlined />,
                        label: entry.action || '-',
                      };
                      const auditLabel = AUDIT_TYPE_LABELS[entry.audit_type] || entry.audit_type;

                      return (
                        <div
                          key={`${entry.id}-${idx}`}
                          className={`
                            flex items-start gap-3 px-3 py-2 rounded-lg border text-xs
                            ${entry.action === 'FIXED' ? 'bg-green-50 border-green-200' : ''}
                            ${entry.action === 'FOUND' ? 'bg-amber-50 border-amber-200' : ''}
                            ${entry.action === 'ERROR' || entry.action === 'FIX_FAILED' ? 'bg-red-50 border-red-200' : ''}
                            ${!['FIXED', 'FOUND', 'ERROR', 'FIX_FAILED'].includes(entry.action) ? 'bg-gray-50 border-gray-200' : ''}
                          `}
                        >
                          {/* Time */}
                          <Text className="text-gray-400 font-mono whitespace-nowrap min-w-[50px]">
                            {entry.time}
                          </Text>

                          {/* Action Tag */}
                          <Tag color={actionCfg.color} className="m-0 min-w-[80px] text-center">
                            {actionCfg.icon} {actionCfg.label}
                          </Tag>

                          {/* Audit Type */}
                          <Tag color="default" className="m-0">
                            {auditLabel}
                          </Tag>

                          {/* Level */}
                          <Tag color={LEVEL_COLORS[entry.level] || 'default'} className="m-0">
                            {entry.level}
                          </Tag>

                          {/* Message */}
                          <Tooltip title={entry.message}>
                            <Text className="truncate flex-1" style={{ maxWidth: 500 }}>
                              {entry.employee_name && (
                                <Text strong className="mr-1">{entry.employee_name}</Text>
                              )}
                              {entry.issue_code && (
                                <Tag color="purple" className="m-0 mr-1 text-[10px]">{entry.issue_code}</Tag>
                              )}
                              {entry.date && (
                                <Text type="secondary" className="mr-1">[{entry.date}]</Text>
                              )}
                              {entry.message.replace(/\[Gece Denetim\]\s*/, '').substring(0, 120)}
                            </Text>
                          </Tooltip>
                        </div>
                      );
                    })}
                </div>
              </Panel>
            );
          })}
        </Collapse>
      )}
    </div>
  );
}
