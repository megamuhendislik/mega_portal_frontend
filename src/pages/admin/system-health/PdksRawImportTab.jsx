import { useState } from 'react';
import { Upload, Button, Card, Table, Collapse, Tag, Alert, Statistic, Row, Col, Popconfirm, message, Spin, Empty } from 'antd';
import { InboxOutlined, CloudUploadOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, CopyOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const { Dragger } = Upload;

export default function PdksRawImportTab() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState(null);

  const handleAnalyze = async () => {
    if (!file) return message.warning('Lütfen bir CSV dosyası seçin.');
    setLoading(true);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'dry_run');
      const { data } = await api.post('/system/health-check/pdks-raw-import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResults(data);
      if (data.summary?.new_events > 0) {
        message.success(`Analiz tamamlandı: ${data.summary.new_events} yeni event bulundu.`);
      } else {
        message.info('Tüm event\'ler zaten mevcut (duplicate).');
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Analiz sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'apply');
      const { data } = await api.post('/system/health-check/pdks-raw-import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      setResults(data);
      message.success(`${data.summary?.created || 0} event GateEventLog'a eklendi.`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Yükleme sırasında hata oluştu.');
    } finally {
      setApplying(false);
    }
  };

  const uploadProps = {
    beforeUpload: (f) => {
      setFile(f);
      setResults(null);
      return false;
    },
    maxCount: 1,
    accept: '.csv',
    onRemove: () => {
      setFile(null);
      setResults(null);
    },
  };

  const summary = results?.summary;
  const isApplyMode = results?.mode === 'apply';

  const empColumns = [
    { title: 'Çalışan', dataIndex: 'employee_name', key: 'name', width: 200 },
    { title: 'Sicil No', dataIndex: 'employee_code', key: 'code', width: 100 },
    {
      title: 'Yeni', dataIndex: 'new_count', key: 'new', width: 80,
      render: v => v > 0 ? <Tag color="green">{v}</Tag> : <Tag>{v}</Tag>
    },
    {
      title: 'Duplicate', dataIndex: 'duplicate_count', key: 'dup', width: 100,
      render: v => v > 0 ? <Tag color="blue">{v}</Tag> : <Tag>{v}</Tag>
    },
    {
      title: 'Tarih Sayısı', key: 'dates', width: 100,
      render: (_, r) => r.dates?.length || 0
    },
  ];

  const expandedRowRender = (record) => {
    if (!record.dates?.length) return <Empty description="Veri yok" />;
    return (
      <Collapse ghost size="small">
        {record.dates.map(d => (
          <Collapse.Panel
            key={d.date}
            header={
              <span>
                <strong>{d.date}</strong>
                <Tag color="green" className="ml-2">{d.events.filter(e => e.status === 'new').length} yeni</Tag>
                {d.events.filter(e => e.status === 'duplicate').length > 0 && (
                  <Tag color="blue">{d.events.filter(e => e.status === 'duplicate').length} dup</Tag>
                )}
              </span>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 px-2">Saat</th>
                  <th className="py-1 px-2">Yön</th>
                  <th className="py-1 px-2">Durum</th>
                  <th className="py-1 px-2">Event ID</th>
                </tr>
              </thead>
              <tbody>
                {d.events.map((ev, idx) => (
                  <tr key={idx} className={ev.status === 'duplicate' ? 'text-gray-400' : ''}>
                    <td className="py-1 px-2 font-mono">{ev.time}</td>
                    <td className="py-1 px-2">
                      <Tag color={ev.direction === 'GİRİŞ' ? 'cyan' : 'orange'} className="text-xs">
                        {ev.direction}
                      </Tag>
                    </td>
                    <td className="py-1 px-2">
                      <Tag color={ev.status === 'new' ? 'green' : 'default'} className="text-xs">
                        {ev.status === 'new' ? 'Yeni' : 'Mevcut'}
                      </Tag>
                    </td>
                    <td className="py-1 px-2 font-mono text-xs text-gray-400">{ev.event_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Collapse.Panel>
        ))}
      </Collapse>
    );
  };

  return (
    <div className="space-y-4">
      <Card size="small" title="PDKS Raw Import" className="shadow-sm">
        <p className="text-gray-500 text-sm mb-3">
          PDKS cihazından export edilen CSV dosyasını yükleyin. Event&apos;ler GateEventLog tablosuna raw olarak eklenir, Attendance kayıtlarına dokunulmaz.
        </p>
        <Dragger {...uploadProps} className="mb-3">
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">CSV dosyasını sürükle veya tıkla</p>
          <p className="ant-upload-hint">SicilID, EventTime, Direction, EventID sütunları beklenir</p>
        </Dragger>
        <div className="flex gap-2">
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleAnalyze}
            loading={loading}
            disabled={!file || applying}
          >
            Analiz Et (Dry Run)
          </Button>
          {results && summary?.new_events > 0 && !isApplyMode && (
            <Popconfirm
              title="GateEventLog'a yükle?"
              description={`${summary.new_events} yeni event eklenecek. Devam edilsin mi?`}
              onConfirm={handleApply}
              okText="Yükle"
              cancelText="İptal"
            >
              <Button
                type="primary"
                danger
                icon={<CheckCircleOutlined />}
                loading={applying}
              >
                DB&apos;ye Yükle ({summary.new_events} event)
              </Button>
            </Popconfirm>
          )}
        </div>
      </Card>

      {(loading || applying) && (
        <div className="text-center py-8">
          <Spin size="large" tip={loading ? 'CSV analiz ediliyor...' : 'GateEventLog\'a yazılıyor...'} />
        </div>
      )}

      {results && !loading && (
        <>
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title="Toplam Satır"
                  value={summary?.total_rows || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title={isApplyMode ? 'Eklenen Event' : 'Yeni Event'}
                  value={isApplyMode ? (summary?.created || 0) : (summary?.new_events || 0)}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title="Duplicate (Atlandı)"
                  value={summary?.duplicates || 0}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<CopyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title="Eşleşmeyen Sicil"
                  value={summary?.unmatched_employees || 0}
                  valueStyle={{ color: summary?.unmatched_employees > 0 ? '#faad14' : '#52c41a' }}
                  prefix={<WarningOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {isApplyMode && (
            <Alert
              type="success"
              showIcon
              message={`${summary?.created || 0} event başarıyla GateEventLog'a eklendi.`}
              description="Şimdi 'Tam Yeniden Hesaplama' çalıştırarak Attendance kayıtlarını güncelleyebilirsiniz."
            />
          )}

          {results.parse_errors?.length > 0 && (
            <Alert
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
              message={`${results.parse_errors.length} parse hatası`}
              description={
                <ul className="list-disc pl-4 mt-1 text-xs max-h-32 overflow-y-auto">
                  {results.parse_errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              }
            />
          )}

          {results.unmatched_employees?.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${results.unmatched_employees.length} sicil numarası eşleşmedi`}
              description={
                <ul className="list-disc pl-4 mt-1 text-sm">
                  {results.unmatched_employees.map((u, i) => (
                    <li key={i}>
                      <strong>Sicil {u.sicil_id}</strong> — {u.name} — <Tag color="orange">{u.event_count} event atlandı</Tag>
                    </li>
                  ))}
                </ul>
              }
            />
          )}

          {results.employee_details?.length > 0 && (
            <Card size="small" title={`Çalışan Detayları (${results.employee_details.length} kişi)`} className="shadow-sm">
              <Table
                dataSource={results.employee_details}
                columns={empColumns}
                rowKey="employee_id"
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} çalışan` }}
                expandable={{ expandedRowRender }}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
