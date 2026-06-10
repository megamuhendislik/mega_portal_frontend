import { useState } from 'react';
import { Upload, Button, Card, Table, Tag, Alert, Statistic, Row, Col, Popconfirm, message, Spin } from 'antd';
import { InboxOutlined, CloudUploadOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, DownloadOutlined, DeleteOutlined, LockOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';
import api from '../../../services/api';
// PDKS Mutabakat & Tam İçe Aktarma — dry-run mutabakat raporu + onayla→tam import.
// Backend RECALC YAPMAZ; import sonrası kullanıcı ayrı "Tam Yeniden Hesaplama" çalıştırır.

const { Dragger } = Upload;
const ENDPOINT = '/system/health-check/pdks-reconcile/';
const UNDO_ENDPOINT = '/system/health-check/pdks-reconcile-undo/';

export default function PdksReconcileTab() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState(null);
  const [deleteSpurious, setDeleteSpurious] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const buildFormData = (mode) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('delete_spurious', deleteSpurious ? 'true' : 'false');
    if (mode === 'apply') formData.append('confirmed', 'true');
    return formData;
  };

  const handlePreview = async () => {
    if (!file) return message.warning('Lütfen bir CSV dosyası seçin.');
    setLoading(true);
    setResults(null);
    try {
      const { data } = await api.post(ENDPOINT, buildFormData('dry_run'), {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResults(data);
      const s = data.summary || {};
      message.info(`Ön izleme: ${s.to_add || 0} eklenecek, ${s.spurious || 0} fazla cihaz-CARD, ${s.unmatched || 0} eşleşmeyen sicil.`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Ön izleme sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Sadece dry_run için kullanılır — apply ile ASLA yeni POST yapma (idempotent çift-apply önleme, FE-02).
  const downloadTxt = async (mode) => {
    const formData = buildFormData(mode);
    formData.append('format', 'txt');
    const response = await api.post(ENDPOINT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
      timeout: 120000,
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const disposition = response.headers['content-disposition'];
    const filename = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '')
      : `pdks_mutabakat_${new Date().toISOString().slice(0, 10)}.txt`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Backend'in döndürdüğü hazır TXT içeriğini (BOM+CRLF dahil) doğrudan indirir — yeni POST yapmaz.
  const downloadTxtFromString = (txt, filename) => {
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `pdks_mutabakat_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleApply = async () => {
    if (!file) return;
    setApplying(true);
    try {
      const { data } = await api.post(ENDPOINT, buildFormData('apply'), {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000,
      });
      setResults(data);
      const a = data.applied || {};
      const parts = [`${a.created || 0} event eklendi`];
      if (a.deleted) parts.push(`${a.deleted} fazla cihaz-CARD silindi`);
      message.success(parts.join(', '));
      // Apply sonucu TXT'yi backend hazır gönderdiyse doğrudan indir — İKİNCİ apply POST'u YAPMA (FE-02).
      if (data.txt_report) {
        try {
          downloadTxtFromString(data.txt_report, `pdks_mutabakat_${new Date().toISOString().slice(0, 10)}.txt`);
        } catch { /* TXT indirme opsiyonel */ }
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'İçe aktarma sırasında hata oluştu.');
    } finally {
      setApplying(false);
    }
  };

  const handleDownloadTxt = async () => {
    // Apply modunda backend hazır TXT döndürdüyse onu indir — ASLA mode='apply' ile yeni POST yapma (FE-02).
    if (results?.mode === 'apply' && results?.txt_report) {
      try {
        downloadTxtFromString(results.txt_report, `pdks_mutabakat_${new Date().toISOString().slice(0, 10)}.txt`);
        message.success('TXT raporu indiriliyor...');
      } catch {
        message.error('TXT indirme sırasında hata oluştu.');
      }
      return;
    }
    if (!file) return;
    try {
      // dry_run zararsız (yazma yok)
      await downloadTxt('dry_run');
      message.success('TXT raporu indiriliyor...');
    } catch {
      message.error('TXT indirme sırasında hata oluştu.');
    }
  };

  const handleUndo = async () => {
    if (!results?.snapshot_id) return;
    setUndoing(true);
    try {
      const { data } = await api.post(UNDO_ENDPOINT, { snapshot_id: results.snapshot_id }, {
        timeout: 120000,
      });
      message.success(`Geri alındı: ${data.restored ?? 0} event geri yüklendi, ${data.removed ?? 0} eklenen event kaldırıldı.`);
      setResults(null);
      setFile(null);
      message.info('Şimdi "Tam Yeniden Hesaplama" çalıştırın.');
    } catch (err) {
      message.error(err.response?.data?.error || 'Geri alma sırasında hata oluştu.');
    } finally {
      setUndoing(false);
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

  const summary = results?.summary || {};
  const truncated = results?.truncated || {};
  const isApplyMode = results?.mode === 'apply';
  const applied = results?.applied;
  const warnings = results?.warnings || [];
  const outOfScope = results?.out_of_scope || [];
  // Backend EventID yoksa silmeyi zorla false'a çeker (delete_spurious_effective).
  const deleteEffective = results?.delete_spurious_effective;
  const deleteDisabledByBackend = deleteSpurious && deleteEffective === false;

  const toAddColumns = [
    { title: 'Çalışan', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Sicil No', dataIndex: 'sicil_id', key: 'sicil', width: 100 },
    { title: 'Tarih/Saat', dataIndex: 'datetime', key: 'datetime', width: 180, render: v => <span className="font-mono text-xs">{v}</span> },
    { title: 'Saat', dataIndex: 'time', key: 'time', width: 90, render: v => <span className="font-mono">{v}</span> },
    {
      title: 'Yön', dataIndex: 'direction', key: 'direction', width: 100,
      render: v => {
        // to_add satırları 'GIRIS'/'CIKIS' (ASCII, noktasız) gelebilir — normalize et
        const isIn = v === 'GİRİŞ' || v === 'IN' || v === 'GIRIS';
        return <Tag color={isIn ? 'cyan' : 'orange'}>{isIn ? 'GİRİŞ' : 'ÇIKIŞ'}</Tag>;
      },
    },
    { title: 'Event ID', dataIndex: 'event_id', key: 'event_id', render: v => <span className="font-mono text-xs text-gray-400">{v}</span> },
  ];

  const spuriousColumns = [
    {
      title: 'Çalışan', key: 'employee', width: 210,
      render: (_, r) => r.employee_name
        ? <span>{r.employee_name}{r.employee_code ? <span className="text-gray-400 text-xs"> #{r.employee_code}</span> : null}</span>
        : <span className="text-gray-400 text-xs">— (DB id: {r.employee_id ?? '—'})</span>,
    },
    { title: 'Zaman', dataIndex: 'timestamp', key: 'timestamp', width: 190, render: v => <span className="font-mono text-xs">{v}</span> },
    {
      title: 'Yön', dataIndex: 'direction', key: 'direction', width: 80,
      render: v => <Tag color={v === 'GİRİŞ' || v === 'IN' ? 'cyan' : 'orange'}>{v}</Tag>,
    },
    { title: 'Durum', dataIndex: 'status', key: 'status', width: 120, render: v => <Tag color="red">{v}</Tag> },
    { title: 'Sebep', dataIndex: 'reason', key: 'reason', render: v => v ? <span className="text-xs">{v}</span> : <span className="text-gray-300">—</span> },
    { title: 'Event ID', dataIndex: 'event_id', key: 'event_id', render: v => <span className="font-mono text-xs text-gray-400">{v}</span> },
  ];

  const truncatedNote = (key) => truncated[key] ? (
    <Alert
      type="info"
      showIcon
      className="mb-2"
      message="Liste kesildi — tam sayı yukarıdaki özette gösterilmektedir."
    />
  ) : null;

  return (
    <div className="space-y-4">
      <Card size="small" title="PDKS Mutabakat & Tam İçe Aktarma" className="shadow-sm">
        <p className="text-gray-500 text-sm mb-3">
          PDKS cihazından export edilen log CSV&apos;sini yükleyin. Önce <strong>Ön İzleme</strong> ile mutabakat raporunu inceleyin
          (eklenecek eventler, cihazda fazla CARD kayıtları, eşleşmeyen siciller), ardından <strong>Tam İçe Aktar</strong> ile uygulayın.
          Eklenen event&apos;ler en geç ~15 dakika içinde otomatik işlenmeye başlar; <strong>silmeler dahil tüm çalışma saatlerini hemen ve eksiksiz güncellemek için &quot;Tam Yeniden Hesaplama&quot; çalıştırın.</strong>
        </p>

        <Dragger {...uploadProps} className="mb-3">
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">CSV dosyasını sürükle veya tıkla</p>
          <p className="ant-upload-hint">PDKS log CSV (.csv)</p>
        </Dragger>

        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deleteSpurious}
              onChange={(e) => setDeleteSpurious(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Fazla cihaz-CARD&apos;ı sil</span>
          </label>
          <span className="text-xs text-gray-400">
            CSV&apos;de olmayan ama sistemde duran cihaz kaynaklı (CARD) kayıtları siler. Varsayılan kapalı.
          </span>
        </div>

        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          className="mb-3"
          message="Korunan (flag-li) kayıtlar silinmez."
          description="Elle/admin eklenen veriler (manuel giriş, kartsız giriş onayı vb.) mutabakatta korunur — fazla CARD silme açık olsa dahi bunlara dokunulmaz."
        />

        <div className="flex flex-wrap gap-2">
          <Button
            icon={<CloudUploadOutlined />}
            onClick={handlePreview}
            loading={loading}
            disabled={!file || applying}
          >
            Ön İzleme
          </Button>
          <Popconfirm
            title="Tam içe aktarma yapılsın mı?"
            description={deleteSpurious
              ? `Eksik eventler eklenecek ve cihazda fazla ${summary.spurious || 0} CARD kaydı silinecek${truncated.spurious ? ' (önizlemede 500 gösterildi, tamamı silinecek)' : ''}. Korunan flag-li kayıtlara dokunulmaz.`
              : 'Eksik eventler eklenecek. Fazla CARD silme kapalı.'}
            onConfirm={handleApply}
            okText="Evet, İçe Aktar"
            cancelText="İptal"
            disabled={!file || loading}
          >
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={applying}
              disabled={!file || loading}
            >
              Tam İçe Aktar
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
          <Spin size="large" tip={loading ? 'CSV mutabakatı hazırlanıyor...' : 'İçe aktarılıyor...'} />
        </div>
      )}

      {results && !loading && (
        <>
          {/* Backend uyarıları (örn. EventID'siz CSV) — özet kartlarından önce göster */}
          {warnings.map((w, i) => (
            <Alert key={`warn-${i}`} type="warning" showIcon message={w} />
          ))}

          {/* Kullanıcı silmeyi işaretledi ama backend bu CSV için devre dışı bıraktı */}
          {deleteDisabledByBackend && (
            <Alert
              type="warning"
              showIcon
              message="Fazla CARD silme bu CSV için devre dışı bırakıldı (warnings'e bak)."
              description="CSV EventID içermediği için fazla CARD kayıtlarını güvenle silmek mümkün değil; kayıtlar yalnızca raporlanır."
            />
          )}

          {isApplyMode && applied && (
            <Alert
              type="success"
              showIcon
              message={`İçe aktarma tamamlandı: ${applied.created || 0} event eklendi${applied.deleted ? `, ${applied.deleted} fazla CARD silindi` : ''}.`}
            />
          )}

          {/* Kilitli mali döneme düşüp atlanan kayıtlar (apply) */}
          {applied?.skipped_locked > 0 && (
            <Alert
              type="info"
              showIcon
              icon={<LockOutlined />}
              message={`${applied.skipped_locked} kayıt kilitli mali döneme düştüğü için uygulanmadı (atlandı).`}
            />
          )}

          {/* Geri Al (Undo) — apply başarılı ve gerçek değişiklik olduysa snapshot_id dolu (DL-4) */}
          {isApplyMode && results?.snapshot_id && (
            <Alert
              type="info"
              showIcon
              icon={<UndoOutlined />}
              message="Bu içe aktarmayı geri alabilirsiniz."
              description="Geri alma; eklenen eventleri kaldırır ve silinen fazla CARD kayıtlarını geri yükler. Sonrasında 'Tam Yeniden Hesaplama' çalıştırın."
              action={
                <Popconfirm
                  title="İçe aktarma geri alınsın mı?"
                  description="Eklenen eventler kaldırılacak ve silinen fazla CARD kayıtları geri yüklenecek. Bu işlemden sonra Tam Yeniden Hesaplama çalıştırın."
                  onConfirm={handleUndo}
                  okText="Evet, Geri Al"
                  cancelText="İptal"
                  disabled={undoing}
                >
                  <Button
                    danger
                    icon={<UndoOutlined />}
                    loading={undoing}
                  >
                    Geri Al (Undo)
                  </Button>
                </Popconfirm>
              }
            />
          )}

          {isApplyMode && (
            <Alert
              type="warning"
              showIcon
              icon={<ReloadOutlined />}
              message="Veri güncellendi. Çalışma saatlerini güncellemek için şimdi 'Tam Yeniden Hesaplama' çalıştırın."
              description="Eklenen event'ler arka planda ~15 dk içinde otomatik işlenmeye başlar; silmeler ve eksiksiz/anlık güncelleme için 'Tam Yeniden Hesaplama' çalıştırın."
            />
          )}

          {/* Özet kartları */}
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title={isApplyMode ? 'Eklenen' : 'Eklenecek'}
                  value={isApplyMode ? (applied?.created ?? summary.to_add ?? 0) : (summary.to_add || 0)}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title={isApplyMode ? 'Silinen fazla CARD' : 'Fazla cihaz-CARD'}
                  value={isApplyMode ? (applied?.deleted ?? summary.spurious ?? 0) : (summary.spurious || 0)}
                  valueStyle={{ color: summary.spurious > 0 ? '#ff4d4f' : '#52c41a' }}
                  prefix={<DeleteOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title="Eşleşmeyen sicil"
                  value={summary.unmatched || 0}
                  valueStyle={{ color: summary.unmatched > 0 ? '#faad14' : '#52c41a' }}
                  prefix={<WarningOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title="Korunan (flag-li)"
                  value={summary.preserved || 0}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<LockOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* İkincil özet */}
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title="Mevcut (zaten var)"
                  value={summary.existing || 0}
                  valueStyle={{ color: '#8c8c8c' }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" className="shadow-sm">
                <Statistic
                  title="Parse hatası"
                  value={summary.parse_errors || 0}
                  valueStyle={{ color: summary.parse_errors > 0 ? '#ff4d4f' : '#52c41a' }}
                  prefix={summary.parse_errors > 0 ? <CloseCircleOutlined /> : null}
                />
              </Card>
            </Col>
            {(results.date_from || results.date_to) && (
              <Col xs={24} md={12}>
                <Card size="small" className="shadow-sm">
                  <div className="text-xs text-gray-500">Tarih Aralığı</div>
                  <div className="text-base font-semibold mt-1">
                    {results.date_from || '?'} &mdash; {results.date_to || '?'}
                  </div>
                </Card>
              </Col>
            )}
          </Row>

          {/* Parse hataları */}
          {results.parse_errors?.length > 0 && (
            <Alert
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
              message={`${summary.parse_errors || results.parse_errors.length} parse hatası`}
              description={
                <>
                  <ul className="list-disc pl-4 mt-1 text-xs max-h-32 overflow-y-auto">
                    {results.parse_errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                  {truncated.parse_errors && (
                    <div className="text-xs text-gray-500 mt-1">Liste kesildi — tam sayı özette.</div>
                  )}
                </>
              }
            />
          )}

          {/* Eşleşmeyen siciller */}
          {results.unmatched?.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${summary.unmatched || results.unmatched.length} sicil numarası eşleşmedi (atlandı)`}
              description={
                <>
                  <ul className="list-disc pl-4 mt-1 text-sm">
                    {results.unmatched.map((u, i) => (
                      <li key={i}>
                        <strong>Sicil {u.sicil_id}</strong>
                        {u.name ? ` — ${u.name}` : ''} — <Tag color="orange">{u.event_count} event atlandı</Tag>
                        {u.inactive === true && <Tag color="red">PASİF — event&apos;leri korundu</Tag>}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs text-gray-500 mt-2">
                    Pasif (ayrılan) personelin gerçek event&apos;leri SİLİNMEZ; &quot;CSV Kapsamı Dışında — Korundu&quot; bölümünde listelenir.
                  </div>
                </>
              }
            />
          )}

          {/* Kilitli mali döneme düşen eventler */}
          {summary?.locked > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<LockOutlined />}
              message={`${summary.locked} event kilitli mali döneme düşüyor`}
              description={
                <>
                  {results.locked_days?.length > 0 && (
                    <div className="text-sm mt-1">
                      <span className="font-medium">Kilitli günler:</span>{' '}
                      {results.locked_days.length <= 10
                        ? results.locked_days.join(', ')
                        : `${results.locked_days.slice(0, 10).join(', ')} ve ${results.locked_days.length - 10} gün daha`}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Bu günlere event eklemek kilitli dönemi etkiler; Tam Yeniden Hesaplama
                    sırasında kilit guard devreye girer.
                  </div>
                </>
              }
            />
          )}

          {/* Eklenecek eventler */}
          {results.to_add?.length > 0 && (
            <Card size="small" title={`Eklenecek Eventler (${summary.to_add || results.to_add.length})`} className="shadow-sm">
              {truncatedNote('to_add')}
              <Table
                dataSource={results.to_add}
                columns={toAddColumns}
                rowKey={(r) => r.event_id || `${r.sicil_id}-${r.datetime}`}
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} kayıt` }}
              />
            </Card>
          )}

          {/* Silinecek fazla CARD kayıtları */}
          {results.spurious?.length > 0 && (
            <Card
              size="small"
              title={`Fazla cihaz-CARD (${summary.spurious || results.spurious.length})${
                isApplyMode
                  ? (applied?.deleted > 0 ? ' — silindi' : '')
                  : (deleteSpurious ? ' — silinecek' : ' — silme kapalı')
              }`}
              className="shadow-sm"
            >
              {/* Apply modunda: kayıtlar zaten işlendi, "silinecek" uyarıları gösterme */}
              {isApplyMode ? (
                applied?.deleted > 0 && (
                  <Alert
                    type="info"
                    showIcon
                    className="mb-2"
                    message="Bu kayıtlar silindi (Geri Al ile geri yüklenebilir)."
                  />
                )
              ) : (
                <>
                  {!deleteSpurious && (
                    <Alert
                      type="info"
                      showIcon
                      className="mb-2"
                      message="Fazla CARD silme kapalı. Bu kayıtlar yalnızca raporlanır, silinmez. Silmek için yukarıdaki kutuyu işaretleyin."
                    />
                  )}
                  {/* FE-01: 500 truncation + silme açık → tamamının silineceğini belirgin uyar */}
                  {deleteSpurious && truncated.spurious ? (
                    <Alert
                      type="error"
                      showIcon
                      className="mb-2"
                      message={`Önizlemede yalnız ilk 500 kayıt gösteriliyor; onaylarsan TOPLAM ${summary.spurious || 0} fazla CARD'ın TAMAMI silinecek (geri alınabilir).`}
                    />
                  ) : (
                    truncatedNote('spurious')
                  )}
                </>
              )}
              <Table
                dataSource={results.spurious}
                columns={spuriousColumns}
                rowKey={(r) => r.event_id || `${r.employee_id}-${r.timestamp}`}
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} kayıt` }}
              />
            </Card>
          )}

          {/* Korunan flag-li kayıtlar */}
          {results.preserved?.length > 0 && (
            <Card size="small" title={`Korunan (flag-li) Kayıtlar (${summary.preserved || results.preserved.length})`} className="shadow-sm">
              <Alert
                type="info"
                showIcon
                icon={<LockOutlined />}
                className="mb-2"
                message="Korunan = cihazın işleyemediği (FAILED/IGNORED) event'ler + kartsız 'Mesai Başlat/Bitir' (CARDLESS_CLOCK) girişleri. Fiziksel karttan gelmedikleri için CSV'de yer almaz → mutabakatta silinmez."
              />
              {truncatedNote('preserved')}
              <Table
                dataSource={results.preserved}
                columns={spuriousColumns}
                rowKey={(r) => r.event_id || `${r.employee_id}-${r.timestamp}`}
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} kayıt` }}
              />
            </Card>
          )}

          {/* CSV kapsamı dışında kalıp korunan gerçek cihaz eventleri (DL-1/DL-2 şeffaflık) */}
          {(outOfScope.length > 0 || summary.out_of_scope > 0) && (
            <Card size="small" title={`CSV Kapsamı Dışında — Korundu (${summary.out_of_scope || outOfScope.length})`} className="shadow-sm">
              <Alert
                type="info"
                showIcon
                icon={<LockOutlined />}
                className="mb-2"
                message="Bu gerçek cihaz event'leri yüklenen CSV'nin kapsamadığı çalışan/gün'lere ait (ör. ayrılan personel veya kısmi CSV). Güvenlik için SİLİNMEDİ, yalnızca raporlanıyor."
              />
              {truncatedNote('out_of_scope')}
              {outOfScope.length > 0 && (
                <Table
                  dataSource={outOfScope}
                  columns={spuriousColumns}
                  rowKey={(r) => r.event_id || `${r.employee_id}-${r.timestamp}`}
                  size="small"
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} kayıt` }}
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
