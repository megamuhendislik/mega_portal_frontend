import React, { useState } from 'react';
import { Card, Button, Upload, Checkbox, Modal, message, Spin, Tag, Descriptions, Typography, Alert } from 'antd';
import {
    DownloadOutlined,
    UploadOutlined,
    FileTextOutlined,
    FileExcelOutlined,
    DatabaseOutlined,
    CloudDownloadOutlined,
    CloudUploadOutlined,
    CheckCircleOutlined,
    InboxOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const { Dragger } = Upload;
const { Title, Text } = Typography;

export default function BackupTab() {
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState(null);
    const [importing, setImporting] = useState(false);
    const [dryRun, setDryRun] = useState(false);
    const [simulationReport, setSimulationReport] = useState(null);
    const [simulationModalOpen, setSimulationModalOpen] = useState(false);

    // ── Export ────────────────────────────────────────────────────
    const handleExport = async (fmt) => {
        setExporting(true);
        setExportFormat(fmt);
        const hideLoading = message.loading('Yedek hazırlanıyor, lütfen bekleyin...', 0);

        try {
            const response = await api.get(`/system-data/export_backup/?format=${fmt}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            let filename = `backup_${fmt}_${new Date().toISOString().slice(0, 10)}.json`;
            if (fmt === 'csv') filename = filename.replace('.json', '.zip');

            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match.length === 2) filename = match[1];
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            message.success('Yedek başarıyla indirildi.');
        } catch (err) {
            console.error(err);
            const errorText = err.response?.data?.error || err.message || 'Bilinmeyen hata';
            message.error(`İndirme başarısız: ${errorText}`);
        } finally {
            hideLoading();
            setExporting(false);
            setExportFormat(null);
        }
    };

    // ── Import ───────────────────────────────────────────────────
    const handleImport = (file) => {
        const confirmTitle = dryRun
            ? 'Simülasyon Modu'
            : 'Geri Yükleme Onayı';
        const confirmContent = dryRun
            ? 'Veriler taranacak fakat veritabanı DEĞİŞTİRİLMEYECEKTİR. Devam etmek istiyor musunuz?'
            : 'DİKKAT: Veritabanındaki veriler güncellenecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?';

        Modal.confirm({
            title: confirmTitle,
            content: confirmContent,
            okText: dryRun ? 'Simülasyonu Başlat' : 'Evet, Geri Yükle',
            cancelText: 'Vazgeç',
            okType: dryRun ? 'primary' : 'danger',
            icon: dryRun
                ? <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                : <DatabaseOutlined style={{ color: '#ff4d4f' }} />,
            onOk: () => executeImport(file),
        });

        // Prevent default upload behavior
        return false;
    };

    const executeImport = async (file) => {
        setImporting(true);
        const hideLoading = message.loading(
            dryRun ? 'Simülasyon çalıştırılıyor...' : 'Geri yükleme yapılıyor...',
            0
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('dry_run', dryRun);

        try {
            const res = await api.post('/system-data/import_backup/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.summary) {
                setSimulationReport(res.data.summary);
                setSimulationModalOpen(true);
                message.success('Simülasyon tamamlandı. Raporu inceleyin.');
            } else {
                message.success(res.data.message || 'Geri yükleme başarılı.');
            }
        } catch (err) {
            const errorText = err.response?.data?.error || err.message || 'Bilinmeyen hata';
            message.error(`Hata: ${errorText}`);
        } finally {
            hideLoading();
            setImporting(false);
        }
    };

    // ── Simulation Report Modal ──────────────────────────────────
    const renderSimulationModal = () => {
        const entries = simulationReport ? Object.entries(simulationReport) : [];
        const totalRecords = entries.reduce((sum, [, count]) => sum + count, 0);

        return (
            <Modal
                title={
                    <span className="flex items-center gap-2">
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        Simülasyon Raporu
                    </span>
                }
                open={simulationModalOpen}
                onCancel={() => setSimulationModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setSimulationModalOpen(false)}>
                        Kapat
                    </Button>,
                ]}
                width={560}
                centered
            >
                <Alert
                    type="info"
                    showIcon
                    icon={<SafetyCertificateOutlined />}
                    message="Doğrulama Başarılı"
                    description="Aşağıdaki veriler veritabanına aktarılmak üzere başarıyla tarandı. Şu an hiçbir değişiklik yapılmadı."
                    className="mb-4"
                />

                {entries.length > 0 ? (
                    <>
                        <Descriptions
                            bordered
                            size="small"
                            column={1}
                            className="mb-4"
                            title={
                                <span className="text-sm text-slate-600">
                                    Bulunan Kayıtlar
                                </span>
                            }
                        >
                            {entries.map(([model, count]) => (
                                <Descriptions.Item
                                    key={model}
                                    label={
                                        <span className="font-mono text-xs">
                                            {model}
                                        </span>
                                    }
                                >
                                    <Tag color="blue" className="font-bold">
                                        {count}
                                    </Tag>
                                </Descriptions.Item>
                            ))}
                        </Descriptions>

                        <div className="flex justify-end">
                            <Tag
                                icon={<DatabaseOutlined />}
                                color="geekblue"
                                className="text-sm px-3 py-1"
                            >
                                Toplam: {totalRecords} kayıt
                            </Tag>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        <DatabaseOutlined style={{ fontSize: 32 }} className="mb-2 block" />
                        <Text type="secondary">
                            Özet oluşturulamadı veya dosya boş.
                        </Text>
                    </div>
                )}
            </Modal>
        );
    };

    // ── Render ───────────────────────────────────────────────────
    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* ── Export Card ─────────────────────────────── */}
                <Card
                    className="shadow-sm hover:shadow-md transition-shadow"
                    styles={{
                        header: {
                            borderBottom: '1px solid #f0f0f0',
                            background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)',
                        },
                    }}
                    title={
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <CloudDownloadOutlined className="text-blue-600 text-xl" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Veri Dışa Aktar</div>
                                <div className="text-xs font-normal text-slate-500">
                                    Sistem yedeğini indir
                                </div>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-3">
                        {/* JSON Export */}
                        <Button
                            block
                            size="large"
                            icon={<FileTextOutlined />}
                            loading={exporting && exportFormat === 'json'}
                            disabled={exporting && exportFormat !== 'json'}
                            onClick={() => handleExport('json')}
                            className="h-auto py-3 flex items-center"
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="font-medium">JSON (Tam Yedek)</span>
                                <Tag color="blue" className="ml-2 mr-0">
                                    Restore İçin
                                </Tag>
                            </div>
                        </Button>

                        {/* CSV Export */}
                        <Button
                            block
                            size="large"
                            icon={<FileExcelOutlined />}
                            loading={exporting && exportFormat === 'csv'}
                            disabled={exporting && exportFormat !== 'csv'}
                            onClick={() => handleExport('csv')}
                            className="h-auto py-3 flex items-center"
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="font-medium">CSV (Excel)</span>
                                <Tag color="green" className="ml-2 mr-0">
                                    Raporlama İçin
                                </Tag>
                            </div>
                        </Button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <Text type="secondary" className="text-xs">
                            <DownloadOutlined className="mr-1" />
                            JSON formatı tam veri yedekleme ve geri yükleme için uygundur.
                            CSV formatı Excel ile raporlama ve analiz için idealdir.
                        </Text>
                    </div>
                </Card>

                {/* ── Import Card ─────────────────────────────── */}
                <Card
                    className="shadow-sm hover:shadow-md transition-shadow"
                    styles={{
                        header: {
                            borderBottom: '1px solid #f0f0f0',
                            background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
                        },
                    }}
                    title={
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <CloudUploadOutlined className="text-orange-600 text-xl" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Geri Yükle</div>
                                <div className="text-xs font-normal text-slate-500">
                                    JSON yedeğinden geri dön
                                </div>
                            </div>
                        </div>
                    }
                >
                    <Spin spinning={importing} tip="Yükleniyor...">
                        <Dragger
                            accept=".json"
                            maxCount={1}
                            showUploadList={false}
                            beforeUpload={handleImport}
                            disabled={importing}
                            className="mb-4"
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined style={{ color: '#d97706', fontSize: 48 }} />
                            </p>
                            <p className="ant-upload-text font-medium text-slate-700">
                                Dosya Seç veya Sürükle
                            </p>
                            <p className="ant-upload-hint text-slate-400">
                                Sadece .json dosyaları
                            </p>
                        </Dragger>
                    </Spin>

                    <div className="pt-3 border-t border-slate-100">
                        <Checkbox
                            checked={dryRun}
                            onChange={(e) => setDryRun(e.target.checked)}
                        >
                            <div>
                                <span className="font-bold text-slate-700">
                                    Sadece Doğrula (Simülasyon Modu)
                                </span>
                                <br />
                                <Text type="secondary" className="text-xs">
                                    Veritabanında değişiklik yapılmaz
                                </Text>
                            </div>
                        </Checkbox>
                    </div>
                </Card>
            </div>

            {renderSimulationModal()}
        </div>
    );
}
