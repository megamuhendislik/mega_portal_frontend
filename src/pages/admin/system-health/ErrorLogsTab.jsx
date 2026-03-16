/**
 * ErrorLogsTab — Admin Hata Log Takip UI
 *
 * Backend error log kayitlarini listeler, filtreler, toplu gunceller.
 * Endpoints:
 *   GET  /system/error-logs/           — list (level, source, status, search, days)
 *   GET  /system/error-logs/stats/     — aggregate stats
 *   PATCH /system/error-logs/{id}/     — update status + admin_note
 *   POST /system/error-logs/bulk_update/ — batch {ids, status}
 *   POST /system/error-logs/cleanup/   — delete old resolved
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Tag, Select, Input, Button, Drawer, Space,
  Statistic, Row, Col, Badge, message, Typography,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  WarningOutlined,
  BugOutlined,
  FireOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../../services/api';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─── Constants ──────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: 'WARNING', label: 'WARNING' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

const SOURCE_OPTIONS = [
  { value: 'DJANGO', label: 'DJANGO' },
  { value: 'CELERY', label: 'CELERY' },
  { value: 'API', label: 'API' },
  { value: 'FRONTEND', label: 'FRONTEND' },
  { value: 'MIDDLEWARE', label: 'MIDDLEWARE' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Acik' },
  { value: 'INVESTIGATING', label: 'Inceleniyor' },
  { value: 'RESOLVED', label: 'Cozuldu' },
  { value: 'IGNORED', label: 'Yoksayildi' },
];

const DAYS_OPTIONS = [
  { value: 1, label: 'Son 1 gun' },
  { value: 7, label: 'Son 7 gun' },
  { value: 30, label: 'Son 30 gun' },
  { value: 0, label: 'Tumu' },
];

const LEVEL_COLORS = {
  WARNING: 'orange',
  ERROR: 'red',
  CRITICAL: 'purple',
};

const LEVEL_ICONS = {
  WARNING: <WarningOutlined />,
  ERROR: <BugOutlined />,
  CRITICAL: <FireOutlined />,
};

const SOURCE_COLORS = {
  DJANGO: 'blue',
  CELERY: 'green',
  API: 'cyan',
  FRONTEND: 'gold',
  MIDDLEWARE: 'magenta',
};

const STATUS_COLORS = {
  OPEN: 'red',
  INVESTIGATING: 'orange',
  RESOLVED: 'green',
  IGNORED: 'default',
};

const STATUS_ICONS = {
  OPEN: <CloseCircleOutlined />,
  INVESTIGATING: <ExclamationCircleOutlined />,
  RESOLVED: <CheckCircleOutlined />,
  IGNORED: null,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ErrorLogsTab() {
  // Data
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filterLevel, setFilterLevel] = useState(null);
  const [filterSource, setFilterSource] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterDays, setFilterDays] = useState(7);
  const [searchText, setSearchText] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Detail drawer
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerStatus, setDrawerStatus] = useState('');
  const [drawerNote, setDrawerNote] = useState('');
  const [drawerSaving, setDrawerSaving] = useState(false);

  // Bulk action
  const [bulkLoading, setBulkLoading] = useState(false);

  // Cleanup
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (filterLevel) params.level = filterLevel;
      if (filterSource) params.source = filterSource;
      if (filterStatus) params.status = filterStatus;
      if (filterDays && filterDays > 0) params.days = filterDays;
      if (searchText.trim()) params.search = searchText.trim();

      const res = await api.get('/system/error-logs/', { params });
      const data = res.data;
      setLogs(data.results || data || []);
      setTotalCount(data.count || (data.results ? data.results.length : 0));
    } catch (err) {
      message.error('Hata loglari yuklenemedi: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filterLevel, filterSource, filterStatus, filterDays, searchText]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/system/error-logs/stats/');
      setStats(res.data);
    } catch {
      // Stats failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    setSelectedRowKeys([]);
    fetchLogs();
    fetchStats();
  };

  const handleCleanup = async () => {
    setCleanupLoading(true);
    try {
      const res = await api.post('/system/error-logs/cleanup/');
      message.success(`Temizlendi: ${res.data?.deleted_count || 0} kayit silindi`);
      handleRefresh();
    } catch (err) {
      message.error('Temizleme basarisiz: ' + (err.response?.data?.error || err.message));
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleBulkUpdate = async (status) => {
    if (selectedRowKeys.length === 0) return;
    setBulkLoading(true);
    try {
      await api.post('/system/error-logs/bulk_update/', {
        ids: selectedRowKeys,
        status,
      });
      message.success(`${selectedRowKeys.length} kayit "${status}" olarak guncellendi`);
      setSelectedRowKeys([]);
      handleRefresh();
    } catch (err) {
      message.error('Toplu guncelleme basarisiz: ' + (err.response?.data?.error || err.message));
    } finally {
      setBulkLoading(false);
    }
  };

  const openDrawer = (record) => {
    setSelectedLog(record);
    setDrawerStatus(record.status || 'OPEN');
    setDrawerNote(record.admin_note || '');
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setSelectedLog(null);
  };

  const handleDrawerSave = async () => {
    if (!selectedLog) return;
    setDrawerSaving(true);
    try {
      await api.patch(`/system/error-logs/${selectedLog.id}/`, {
        status: drawerStatus,
        admin_note: drawerNote,
      });
      message.success('Log guncellendi');
      closeDrawer();
      handleRefresh();
    } catch (err) {
      message.error('Guncelleme basarisiz: ' + (err.response?.data?.error || err.message));
    } finally {
      setDrawerSaving(false);
    }
  };

  // ─── Table Columns ─────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Zaman',
      dataIndex: 'last_occurrence',
      key: 'last_occurrence',
      width: 150,
      sorter: (a, b) => new Date(a.last_occurrence) - new Date(b.last_occurrence),
      defaultSortOrder: 'descend',
      render: (val) => val ? dayjs(val).format('DD.MM.YYYY HH:mm') : '-',
    },
    {
      title: 'Seviye',
      dataIndex: 'level',
      key: 'level',
      width: 110,
      filters: LEVEL_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.level === value,
      render: (level) => (
        <Tag
          color={LEVEL_COLORS[level] || 'default'}
          icon={LEVEL_ICONS[level] || null}
        >
          {level}
        </Tag>
      ),
    },
    {
      title: 'Kaynak',
      dataIndex: 'source',
      key: 'source',
      width: 110,
      filters: SOURCE_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.source === value,
      render: (source) => (
        <Tag color={SOURCE_COLORS[source] || 'default'}>{source}</Tag>
      ),
    },
    {
      title: 'Mesaj',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg) => (
        <Text style={{ maxWidth: 400 }} ellipsis={{ tooltip: msg }}>
          {msg || '-'}
        </Text>
      ),
    },
    {
      title: 'Kullanici',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 140,
      render: (name) => name || <Text type="secondary">-</Text>,
    },
    {
      title: 'Tekrar',
      dataIndex: 'occurrence_count',
      key: 'occurrence_count',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.occurrence_count || 0) - (b.occurrence_count || 0),
      render: (count) =>
        count && count > 1 ? (
          <Badge count={count} style={{ backgroundColor: '#faad14' }} />
        ) : (
          <Text type="secondary">1</Text>
        ),
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      filters: STATUS_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag
          color={STATUS_COLORS[status] || 'default'}
          icon={STATUS_ICONS[status] || null}
        >
          {STATUS_OPTIONS.find(o => o.value === status)?.label || status}
        </Tag>
      ),
    },
    {
      title: 'Detay',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer(record);
          }}
        />
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" bordered>
            <Statistic
              title="Toplam"
              value={stats?.total ?? totalCount}
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" bordered>
            <Statistic
              title="Acik"
              value={stats?.open ?? 0}
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" bordered>
            <Statistic
              title="Inceleniyor"
              value={stats?.investigating ?? 0}
              valueStyle={{ color: '#d46b08', fontWeight: 700 }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" bordered>
            <Statistic
              title="Bugun"
              value={stats?.today ?? 0}
              valueStyle={{ color: '#389e0d', fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <Card size="small" bordered>
        <Space wrap size="middle" style={{ width: '100%' }}>
          <Select
            placeholder="Seviye"
            allowClear
            style={{ width: 140 }}
            value={filterLevel}
            onChange={(val) => { setFilterLevel(val); setCurrentPage(1); }}
            options={LEVEL_OPTIONS}
          />
          <Select
            placeholder="Kaynak"
            allowClear
            style={{ width: 140 }}
            value={filterSource}
            onChange={(val) => { setFilterSource(val); setCurrentPage(1); }}
            options={SOURCE_OPTIONS}
          />
          <Select
            placeholder="Durum"
            allowClear
            style={{ width: 150 }}
            value={filterStatus}
            onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
          >
            {STATUS_OPTIONS.map(o => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
          <Select
            style={{ width: 140 }}
            value={filterDays}
            onChange={(val) => { setFilterDays(val); setCurrentPage(1); }}
          >
            {DAYS_OPTIONS.map(o => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
          <Input
            placeholder="Mesaj ara..."
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => { setCurrentPage(1); fetchLogs(); }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Yenile
          </Button>
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={handleCleanup}
            loading={cleanupLoading}
          >
            Temizle
          </Button>
        </Space>
      </Card>

      {/* ── Bulk Action Bar ─────────────────────────────────────────── */}
      {selectedRowKeys.length > 0 && (
        <Card
          size="small"
          bordered
          style={{ background: '#fffbe6', borderColor: '#ffe58f' }}
        >
          <Space>
            <Text strong>{selectedRowKeys.length} kayit secildi</Text>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={bulkLoading}
              onClick={() => handleBulkUpdate('RESOLVED')}
            >
              Cozuldu Yap
            </Button>
            <Button
              size="small"
              loading={bulkLoading}
              onClick={() => handleBulkUpdate('IGNORED')}
            >
              Yoksay
            </Button>
            <Button
              size="small"
              type="text"
              onClick={() => setSelectedRowKeys([])}
            >
              Secimi Temizle
            </Button>
          </Space>
        </Card>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={logs}
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: (total) => `Toplam ${total} kayit`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
        onRow={(record) => ({
          onClick: () => openDrawer(record),
          style: { cursor: 'pointer' },
        })}
        scroll={{ x: 1000 }}
        size="small"
      />

      {/* ── Detail Drawer ───────────────────────────────────────────── */}
      <Drawer
        title="Hata Log Detayi"
        open={drawerVisible}
        onClose={closeDrawer}
        width={640}
        extra={
          <Button
            type="primary"
            onClick={handleDrawerSave}
            loading={drawerSaving}
          >
            Kaydet
          </Button>
        }
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Tags row */}
            <Space wrap>
              <Tag
                color={LEVEL_COLORS[selectedLog.level] || 'default'}
                icon={LEVEL_ICONS[selectedLog.level] || null}
              >
                {selectedLog.level}
              </Tag>
              <Tag color={SOURCE_COLORS[selectedLog.source] || 'default'}>
                {selectedLog.source}
              </Tag>
              {selectedLog.logger && (
                <Tag>{selectedLog.logger}</Tag>
              )}
            </Space>

            {/* Timestamps */}
            <Card size="small" title="Zaman Bilgisi" bordered>
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Ilk Olusma</Text>
                  <br />
                  <Text>
                    {selectedLog.first_occurrence
                      ? dayjs(selectedLog.first_occurrence).format('DD.MM.YYYY HH:mm:ss')
                      : '-'}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Son Olusma</Text>
                  <br />
                  <Text>
                    {selectedLog.last_occurrence
                      ? dayjs(selectedLog.last_occurrence).format('DD.MM.YYYY HH:mm:ss')
                      : '-'}
                  </Text>
                </Col>
              </Row>
              {selectedLog.occurrence_count > 1 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Tekrar Sayisi: </Text>
                  <Badge
                    count={selectedLog.occurrence_count}
                    style={{ backgroundColor: '#faad14' }}
                  />
                </div>
              )}
            </Card>

            {/* Full message */}
            <Card size="small" title="Mesaj" bordered>
              <Paragraph
                style={{ whiteSpace: 'pre-wrap', margin: 0 }}
              >
                {selectedLog.message || '-'}
              </Paragraph>
            </Card>

            {/* Traceback */}
            {selectedLog.traceback && (
              <Card size="small" title="Traceback" bordered>
                <pre
                  style={{
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: 16,
                    borderRadius: 8,
                    fontSize: 12,
                    lineHeight: 1.5,
                    maxHeight: 400,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  {selectedLog.traceback}
                </pre>
              </Card>
            )}

            {/* Request info */}
            {(selectedLog.request_method || selectedLog.request_path || selectedLog.employee_name) && (
              <Card size="small" title="Istek Bilgisi" bordered>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedLog.request_method && (
                    <div>
                      <Text type="secondary">Method: </Text>
                      <Tag>{selectedLog.request_method}</Tag>
                    </div>
                  )}
                  {selectedLog.request_path && (
                    <div>
                      <Text type="secondary">Path: </Text>
                      <Text code>{selectedLog.request_path}</Text>
                    </div>
                  )}
                  {selectedLog.request_body && (
                    <div>
                      <Text type="secondary">Body: </Text>
                      <pre
                        style={{
                          background: '#f5f5f5',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 12,
                          maxHeight: 200,
                          overflow: 'auto',
                          margin: '4px 0 0 0',
                        }}
                      >
                        {typeof selectedLog.request_body === 'string'
                          ? selectedLog.request_body
                          : JSON.stringify(selectedLog.request_body, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.employee_name && (
                    <div>
                      <Text type="secondary">Kullanici: </Text>
                      <Text>{selectedLog.employee_name}</Text>
                    </div>
                  )}
                  {selectedLog.ip_address && (
                    <div>
                      <Text type="secondary">IP: </Text>
                      <Text code>{selectedLog.ip_address}</Text>
                    </div>
                  )}
                  {selectedLog.user_agent && (
                    <div>
                      <Text type="secondary">User Agent: </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {selectedLog.user_agent}
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Extra data */}
            {selectedLog.extra_data && Object.keys(selectedLog.extra_data).length > 0 && (
              <Card size="small" title="Ek Veri (JSON)" bordered>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 12,
                    lineHeight: 1.5,
                    maxHeight: 300,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selectedLog.extra_data, null, 2)}
                </pre>
              </Card>
            )}

            {/* Status + Admin Note */}
            <Card size="small" title="Durum Guncelle" bordered>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    Durum
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    value={drawerStatus}
                    onChange={setDrawerStatus}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <Option key={o.value} value={o.value}>{o.label}</Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                    Admin Notu
                  </Text>
                  <TextArea
                    rows={3}
                    value={drawerNote}
                    onChange={(e) => setDrawerNote(e.target.value)}
                    placeholder="Inceleme notu ekleyin..."
                  />
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
