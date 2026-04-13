import { useState } from 'react';
import { Upload, Button, Card, Table, Collapse, Tag, Alert, Statistic, Row, Col, Popconfirm, message, Spin, Empty } from 'antd';
import { InboxOutlined, CloudUploadOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, CopyOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../../services/api';
// PDKS Raw Import v2 — simplified clean import flow

const { Dragger } = Upload;

export default function PdksRawImportTab() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cleanImport, setCleanImport] = useState(false);

  const buildFormData = (mode) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('clean_import', cleanImport ? 'true' : 'false');
    if (dateFrom) formData.append('date_from', dateFrom);
    if (dateTo) formData.append('date_to', dateTo);
    return formData;
  };

  const handleAnalyze = async () => {
    if (!file) return message.warning('Lütfen bir CSV dosyası seçin.');
    setLoading(true);
    setResults(null);
    try {
      const { data } = await api.post('/system/health-check/pdks-raw-import/', buildFormData('dry_run'), {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResults(data);
      const s = data.summary || {};
      message.info(`Analiz: ${s.total_rows || 0} satır, ${s.new_events || 0} yeni event, ${s.cleaned || 0} eski kayıt silinecek.`);
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
      const { data } = await api.post('/system/health-check/pdks-raw-import/', buildFormData('apply'), {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000,
      });
      setResults(data);
      const s = data.summary || {};
      const parts = [`${s.created || 0} event eklendi`];
      if (s.cleaned) parts.push(`${s.cleaned} eski GateEventLog silindi`);
      message.success(parts.join(', '));
      // Otomatik TXT indir
      try {
        const txtForm = buildFormData('apply');
        txtForm.append('format', 'txt');
        const txtRes = await api.post('/system/health-check/pdks-raw-import/', txtForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob',
          timeout: 120000,
        });
        const url = window.URL.createObjectURL(new Blob([txtRes.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `pdks_import_result_${new Date().toISOString().slice(0,10)}.txt`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch { /* TXT indirme opsiyonel */ }
    } catch (err) {
      message.error(err.response?.data?.error || 'Yükleme sırasında hata oluştu.');
    } finally {
      setApplying(false);
    }
  };

  const handleDownloadTxt = async () => {
    if (!file) return;
    try {
      const formData = buildFormData(results?.mode || 'dry_run');
      formData.append('format', 'txt');
      const response = await api.post('/system/health-check/pdks-raw-import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        timeout: 120000,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers['content-disposition'];
      const filename = disposition ? disposition.split('filename=')[1]?.replace(/"/g, '') : 'pdks_raw_import.txt';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('TXT raporu indiriliyor...');
    } catch {
      message.error('TXT indirme sırasında hata oluştu.');
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
      render: v => v > 0 ? <Tag color="green">{v}</Tag> : <Tag color="default">0</Tag>,
      sorter: (a, b) => b.new_count - a.new_count,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Mevcut', dataIndex: 'duplicate_count', key: 'dup', width: 100,
      render: v => v > 0 ? <Tag color="blue">{v}</Tag> : <Tag>0</Tag>
    },
    {
      title: 'Durum', key: 'status', width: 120,
      render: (_, r) => r.new_count > 0
        ? <Tag color="orange">Değişecek</Tag>
        : <Tag color="green">Tam</Tag>
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
          PDKS cihazından export edilen CSV dosyasını yükleyin. Seçili tarih aralığındaki eski GateEventLog kayıtları silinip CSV&apos;den yeniden yüklenir.
          Attendance kayıtlarına dokunulmaz — yükleme sonrası &quot;Tam Yeniden Hesaplama&quot; çalıştırın.
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <p className="text-xs text-gray-400 mt-4">Boş bırakılırsa CSV&apos;deki tüm tarih aralığı işlenir</p>
        </div>
        <Dragger {...uploadProps} className="mb-3">
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">CSV dosyasını sürükle veya tıkla</p>
          <p className="ant-upload-hint">SicilID, EventTime, Direction, EventID sütunları beklenir</p>
        </Dragger>

        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cleanImport}
              onChange={(e) => setCleanImport(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Temiz Yükleme (eski kayıtları sil + yeniden yükle)</span>
          </label>
        </div>
        {cleanImport ? (
          <Alert
            type="warning"
            showIcon
            icon={<DeleteOutlined />}
            className="mb-3"
            message="Temiz Yükleme: Tarih aralığındaki eski GateEventLog kayıtları silinir, CSV'den yeniden yüklenir."
          />
        ) : (
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="Ekleme Modu: Sadece eksik eventler eklenir. Mevcut kayıtlara dokunulmaz. TXT raporu sadece yeni eklenen verileri gösterir."
          />
        )}

        <div className="flex gap-2">
          <Button
            icon={<CloudUploadOutlined />}
            onClick={handleAnalyze}
            loading={loading}
            disabled={!file || applying}
          >
            Ön İzleme
          </Button>
          <Popconfirm
            title="GateEventLog'a yüklensin mi?"
            description={cleanImport
              ? "Tarih aralığındaki eski kayıtlar silinip CSV'den yeniden yüklenecek."
              : "Sadece eksik eventler eklenecek. Mevcut kayıtlara dokunulmayacak."}
            onConfirm={handleApply}
            okText="Evet, Yükle"
            cancelText="İptal"
          >
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={applying}
              disabled={!file || loading}
            >
              Yükle
            </Button>
          </Popconfirm>
          {results && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTxt}
            >
              TXT İndir
            </Button>
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

          {summary?.cleaned > 0 && (
            <Alert
              type="info"
              showIcon
              message={`Temiz Yükleme: ${summary.cleaned} eski GateEventLog silindi`}
            />
          )}

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
