import React, { useState, useMemo, useCallback } from 'react';
import {
    Table,
    Upload,
    Button,
    Modal,
    Tag,
    Alert,
    Badge,
    Checkbox,
    Tooltip,
    message,
    Card,
    Statistic,
    Space,
    Spin,
} from 'antd';
import {
    InboxOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    SyncOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    ToolOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a date string (YYYY-MM-DD) to Turkish locale display */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    } catch {
        return dateStr;
    }
}

/** Format time string for display - handles both HH:MM:SS and ISO datetime */
function formatTime(timeStr) {
    if (!timeStr) return '-';
    // If ISO datetime, extract time part
    if (timeStr.includes('T')) {
        try {
            const d = new Date(timeStr);
            return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
            return timeStr;
        }
    }
    return timeStr;
}

/** Format seconds to human-readable Turkish duration */
function formatSeconds(s) {
    if (s === null || s === undefined) return '-';
    const abs = Math.abs(s);
    const sign = s < 0 ? '-' : '';
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    if (h > 0) return `${sign}${h}sa ${m}dk`;
    return `${sign}${m}dk`;
}

/** Format hours (decimal) to human-readable */
function formatHours(h) {
    if (h === null || h === undefined) return '-';
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    if (hours > 0) return `${hours}sa ${mins}dk`;
    return `${mins}dk`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Summary stat card */
const SummaryCard = ({ title, value, color, icon, suffix }) => (
    <Card size="small" className={`${color} border`}>
        <Statistic
            title={<span className="text-xs font-medium">{title}</span>}
            value={value}
            suffix={suffix}
            prefix={icon}
            valueStyle={{ fontSize: 28, fontWeight: 700 }}
        />
    </Card>
);

/** Expanded row: CSV events mini-table + system attendance details */
const ExpandedRowContent = ({ record }) => {
    const csvEvents = record.csv_events || [];
    // Backend returns these fields directly on the record, not nested
    const sysDetails = {
        total_hours: record.sys_total_hours,
        overtime_hours: record.sys_overtime_hours,
        status: record.attendance_status,
        attendance_id: record.attendance_id,
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 p-2">
            {/* CSV Events */}
            <div className="flex-1">
                <h4 className="text-sm font-semibold mb-2 text-gray-700">
                    <FileTextOutlined className="mr-1" />
                    CSV Kart Okuyucu Olayları
                </h4>
                {csvEvents.length === 0 ? (
                    <p className="text-xs text-gray-400">Olay bulunamadı.</p>
                ) : (
                    <Table
                        dataSource={csvEvents}
                        rowKey={(e, i) => `${e.event_id || i}`}
                        size="small"
                        pagination={false}
                        bordered
                        columns={[
                            {
                                title: 'Saat',
                                dataIndex: 'time',
                                key: 'time',
                                width: 120,
                                render: (v) => (
                                    <span className="font-mono text-xs">{formatTime(v)}</span>
                                ),
                            },
                            {
                                title: 'Yön',
                                dataIndex: 'direction',
                                key: 'direction',
                                width: 100,
                                render: (v) => (
                                    <Tag color={v === 'GIRIS' || v === 'GİRİŞ' || v === 'IN' ? 'green' : 'red'}>
                                        {v === 'GIRIS' || v === 'IN' ? 'GİRİŞ' : v === 'CIKIS' || v === 'OUT' ? 'ÇIKIŞ' : v}
                                    </Tag>
                                ),
                            },
                            {
                                title: 'Event ID',
                                dataIndex: 'event_id',
                                key: 'event_id',
                                width: 120,
                                render: (v) => (
                                    <span className="font-mono text-xs text-gray-500">{v || '-'}</span>
                                ),
                            },
                        ]}
                    />
                )}
            </div>

            {/* System attendance details */}
            <div className="flex-1">
                <h4 className="text-sm font-semibold mb-2 text-gray-700">
                    <ToolOutlined className="mr-1" />
                    Sistem Mesai Detayı
                </h4>
                {!record.has_attendance ? (
                    <Alert
                        type="warning"
                        showIcon
                        message="Bu tarih için sistemde mesai kaydı bulunamadı."
                        className="text-xs"
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 rounded p-2">
                            <span className="text-gray-500">Toplam Süre:</span>
                            <span className="ml-2 font-semibold">
                                {sysDetails.total_hours != null
                                    ? formatHours(sysDetails.total_hours)
                                    : formatSeconds(sysDetails.total_seconds)}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                            <span className="text-gray-500">Ek Mesai:</span>
                            <span className="ml-2 font-semibold">
                                {sysDetails.overtime_hours != null
                                    ? formatHours(sysDetails.overtime_hours)
                                    : formatSeconds(sysDetails.overtime_seconds)}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                            <span className="text-gray-500">Durum:</span>
                            <span className="ml-2 font-semibold">{sysDetails.status || '-'}</span>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                            <span className="text-gray-500">Kayıt ID:</span>
                            <span className="ml-2 font-mono">{sysDetails.attendance_id || '-'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PdksCompareTab() {
    // State
    const [file, setFile] = useState(null);
    const [comparing, setComparing] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [results, setResults] = useState(null);
    const [fixResults, setFixResults] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [showOnlyDiff, setShowOnlyDiff] = useState(true);

    // -----------------------------------------------------------------------
    // Derived data
    // -----------------------------------------------------------------------

    const summary = useMemo(() => {
        if (!results?.matches) return null;
        const matches = results.matches;
        const total = matches.length;
        const withDiff = matches.filter((m) => m.has_difference).length;
        const matching = matches.filter((m) => m.has_attendance && !m.has_difference).length;
        const noAttendance = matches.filter((m) => !m.has_attendance).length;
        return { total, withDiff, matching, noAttendance };
    }, [results]);

    const filteredData = useMemo(() => {
        if (!results?.matches) return [];
        let data = [...results.matches];
        if (showOnlyDiff) {
            data = data.filter((m) => m.has_difference || !m.has_attendance);
        }
        // Default sort: work_date asc, then employee_name asc
        data.sort((a, b) => {
            const dateComp = (a.work_date || '').localeCompare(b.work_date || '');
            if (dateComp !== 0) return dateComp;
            return (a.employee_name || '').localeCompare(b.employee_name || '', 'tr');
        });
        return data;
    }, [results, showOnlyDiff]);

    const rowKey = useCallback((record) => `${record.employee_id}_${record.work_date}`, []);

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    const handleCompare = async () => {
        if (!file) {
            message.warning('Lütfen önce bir CSV dosyası seçin.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        setComparing(true);
        setResults(null);
        setFixResults(null);
        setSelectedRows([]);
        try {
            const res = await api.post('/system/health-check/pdks-compare/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResults(res.data);
            message.success(
                `Karşılaştırma tamamlandı: ${res.data.matches?.length || 0} gün işlendi.`
            );
        } catch (e) {
            const errMsg =
                e.response?.data?.error ||
                e.response?.data?.detail ||
                e.message;
            message.error('Karşılaştırma hatası: ' + errMsg);
        } finally {
            setComparing(false);
        }
    };

    const handleFix = () => {
        if (selectedRows.length === 0) {
            message.warning('Lütfen düzeltilecek kayıtları seçin.');
            return;
        }

        Modal.confirm({
            title: 'PDKS Verisi ile Düzeltme Onayı',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div className="mt-2 text-sm">
                    <p>
                        <strong>{selectedRows.length}</strong> gün için kart giriş/çıkış
                        verileri güncellenecek ve mesai yeniden hesaplanacak.
                    </p>
                    <p className="mt-2 text-gray-500">
                        Mevcut ek mesai talepleri silinmeyecek, sadece süreleri ayarlanacaktır.
                    </p>
                </div>
            ),
            okText: 'Düzelt',
            okButtonProps: { danger: true },
            cancelText: 'İptal',
            onOk: executeFixing,
            width: 480,
        });
    };

    const executeFixing = async () => {
        const corrections = selectedRows.map((key) => {
            const match = results.matches.find((m) => `${m.employee_id}_${m.work_date}` === key);
            if (!match) return null;
            return {
                employee_id: match.employee_id,
                work_date: match.work_date,
                csv_check_in: match.csv_check_in,
                csv_check_out: match.csv_check_out,
            };
        }).filter(Boolean);

        if (corrections.length === 0) {
            message.error('Düzeltilecek geçerli kayıt bulunamadı.');
            return;
        }

        setFixing(true);
        try {
            const res = await api.post('/system/health-check/pdks-fix/', { corrections });
            setFixResults(res.data);
            const fixed = res.data.summary?.fixed || 0;
            const failed = res.data.summary?.failed || 0;
            if (failed === 0) {
                message.success(`${fixed} kayıt başarıyla düzeltildi.`);
            } else {
                message.warning(`${fixed} düzeltildi, ${failed} hata oluştu.`);
            }
            setSelectedRows([]);
        } catch (e) {
            const errMsg =
                e.response?.data?.error ||
                e.response?.data?.detail ||
                e.message;
            message.error('Düzeltme hatası: ' + errMsg);
        } finally {
            setFixing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResults(null);
        setFixResults(null);
        setSelectedRows([]);
        setShowOnlyDiff(true);
    };

    // -----------------------------------------------------------------------
    // Upload props
    // -----------------------------------------------------------------------

    const uploadProps = {
        accept: '.csv',
        maxCount: 1,
        beforeUpload: (f) => {
            setFile(f);
            setResults(null);
            setFixResults(null);
            setSelectedRows([]);
            return false; // prevent auto-upload
        },
        onRemove: () => {
            setFile(null);
            setResults(null);
            setFixResults(null);
            setSelectedRows([]);
        },
        fileList: file ? [file] : [],
    };

    // -----------------------------------------------------------------------
    // Row selection config
    // -----------------------------------------------------------------------

    const rowSelection = {
        selectedRowKeys: selectedRows,
        onChange: (keys) => setSelectedRows(keys),
        getCheckboxProps: (record) => ({
            disabled: record.has_attendance && !record.has_difference,
        }),
    };

    // -----------------------------------------------------------------------
    // Table columns
    // -----------------------------------------------------------------------

    const columns = useMemo(
        () => [
            {
                title: 'Sicil No',
                dataIndex: 'employee_code',
                key: 'employee_code',
                width: 100,
                sorter: (a, b) => (a.employee_code || '').localeCompare(b.employee_code || ''),
                render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
            },
            {
                title: 'Ad Soyad',
                dataIndex: 'employee_name',
                key: 'employee_name',
                width: 160,
                sorter: (a, b) =>
                    (a.employee_name || '').localeCompare(b.employee_name || '', 'tr'),
                ellipsis: true,
            },
            {
                title: 'Tarih',
                dataIndex: 'work_date',
                key: 'work_date',
                width: 110,
                defaultSortOrder: 'ascend',
                sorter: (a, b) => (a.work_date || '').localeCompare(b.work_date || ''),
                render: (v) => formatDate(v),
            },
            {
                title: 'CSV Giriş',
                dataIndex: 'csv_check_in',
                key: 'csv_check_in',
                width: 100,
                render: (v) => (
                    <span className="font-mono text-xs text-green-700 font-semibold">
                        {formatTime(v)}
                    </span>
                ),
            },
            {
                title: 'CSV Çıkış',
                dataIndex: 'csv_check_out',
                key: 'csv_check_out',
                width: 100,
                render: (v) => (
                    <span className="font-mono text-xs text-green-700 font-semibold">
                        {formatTime(v)}
                    </span>
                ),
            },
            {
                title: 'Sistem Giriş',
                dataIndex: 'sys_check_in',
                key: 'sys_check_in',
                width: 100,
                render: (v, record) => {
                    const isDiff =
                        record.has_difference &&
                        record.has_attendance &&
                        v !== record.csv_check_in;
                    return (
                        <span
                            className={`font-mono text-xs ${
                                isDiff ? 'text-red-600 font-bold' : 'text-gray-700'
                            }`}
                        >
                            {formatTime(v)}
                        </span>
                    );
                },
            },
            {
                title: 'Sistem Çıkış',
                dataIndex: 'sys_check_out',
                key: 'sys_check_out',
                width: 100,
                render: (v, record) => {
                    const isDiff =
                        record.has_difference &&
                        record.has_attendance &&
                        v !== record.csv_check_out;
                    return (
                        <span
                            className={`font-mono text-xs ${
                                isDiff ? 'text-red-600 font-bold' : 'text-gray-700'
                            }`}
                        >
                            {formatTime(v)}
                        </span>
                    );
                },
            },
            {
                title: 'Durum',
                key: 'status',
                width: 120,
                filters: [
                    { text: 'Eşleşiyor', value: 'match' },
                    { text: 'Fark Var', value: 'diff' },
                    { text: 'Kayıt Yok', value: 'missing' },
                ],
                onFilter: (value, record) => {
                    if (value === 'match') return record.has_attendance && !record.has_difference;
                    if (value === 'diff') return record.has_attendance && record.has_difference;
                    if (value === 'missing') return !record.has_attendance;
                    return true;
                },
                render: (_, record) => {
                    if (!record.has_attendance) {
                        return (
                            <Tag icon={<WarningOutlined />} color="orange">
                                Kayıt Yok
                            </Tag>
                        );
                    }
                    if (record.has_difference) {
                        return (
                            <Tag icon={<CloseCircleOutlined />} color="red">
                                Fark Var
                            </Tag>
                        );
                    }
                    return (
                        <Tag icon={<CheckCircleOutlined />} color="green">
                            Eşleşiyor
                        </Tag>
                    );
                },
            },
            {
                title: 'OT',
                dataIndex: 'overtime_request_count',
                key: 'ot',
                width: 70,
                align: 'center',
                render: (count, record) => {
                    if (!count || count === 0) return <span className="text-gray-300">-</span>;
                    const details = record.overtime_details || '';
                    return (
                        <Tooltip title={details || `${count} ek mesai talebi`}>
                            <Badge
                                count={count}
                                style={{ backgroundColor: '#6366f1' }}
                                overflowCount={99}
                            />
                        </Tooltip>
                    );
                },
            },
        ],
        []
    );

    // -----------------------------------------------------------------------
    // Fix results columns
    // -----------------------------------------------------------------------

    const fixColumns = useMemo(
        () => [
            {
                title: 'Ad Soyad',
                dataIndex: 'employee_name',
                key: 'employee_name',
                width: 160,
                ellipsis: true,
            },
            {
                title: 'Tarih',
                dataIndex: 'work_date',
                key: 'work_date',
                width: 110,
                render: (v) => formatDate(v),
            },
            {
                title: 'Eski Giriş → Yeni Giriş',
                key: 'check_in_change',
                width: 180,
                render: (_, record) => (
                    <span className="font-mono text-xs">
                        <span className="text-red-500 line-through">
                            {formatTime(record.old_check_in)}
                        </span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="text-green-600 font-semibold">
                            {formatTime(record.new_check_in)}
                        </span>
                    </span>
                ),
            },
            {
                title: 'Eski Çıkış → Yeni Çıkış',
                key: 'check_out_change',
                width: 180,
                render: (_, record) => (
                    <span className="font-mono text-xs">
                        <span className="text-red-500 line-through">
                            {formatTime(record.old_check_out)}
                        </span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="text-green-600 font-semibold">
                            {formatTime(record.new_check_out)}
                        </span>
                    </span>
                ),
            },
            {
                title: 'Eski Süre → Yeni Süre',
                key: 'duration_change',
                width: 180,
                render: (_, record) => {
                    const oldDur = record.old_total_hours ?? record.old_total_seconds;
                    const newDur = record.new_total_hours ?? record.new_total_seconds;
                    const isSeconds = record.old_total_seconds != null;
                    const fmt = isSeconds ? formatSeconds : formatHours;
                    return (
                        <span className="font-mono text-xs">
                            <span className="text-gray-500">{fmt(oldDur)}</span>
                            <span className="mx-1 text-gray-400">→</span>
                            <span className="font-semibold">{fmt(newDur)}</span>
                        </span>
                    );
                },
            },
            {
                title: 'OT Değişim',
                key: 'ot_change',
                width: 160,
                render: (_, record) => {
                    const adjustments = record.overtime_adjustments;
                    if (!adjustments || adjustments.length === 0) {
                        return <span className="text-gray-300">-</span>;
                    }
                    return (
                        <div className="text-xs">
                            {adjustments.map((adj, i) => (
                                <div key={i}>
                                    {adj.skipped ? (
                                        <Tag color="orange" className="text-[10px]">Kilitli</Tag>
                                    ) : (
                                        <span>
                                            <span className="text-gray-400">{formatSeconds(adj.old_duration)}</span>
                                            <span className="mx-1">→</span>
                                            <span className={adj.new_duration === 0 ? 'text-red-500 font-semibold' : 'font-semibold'}>
                                                {formatSeconds(adj.new_duration)}
                                            </span>
                                            {adj.warning && <Tag color="red" className="ml-1 text-[10px]">!</Tag>}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                },
            },
            {
                title: 'Sonuç',
                dataIndex: 'status',
                key: 'fix_status',
                width: 100,
                render: (v) => {
                    if (v === 'fixed' || v === 'success') {
                        return <Tag color="green">Düzeltildi</Tag>;
                    }
                    if (v === 'skipped') {
                        return <Tag color="default">Atlandı</Tag>;
                    }
                    if (v === 'error' || v === 'failed') {
                        return (
                            <Tag color="red">Hata</Tag>
                        );
                    }
                    return <Tag>{v || '-'}</Tag>;
                },
            },
        ],
        []
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="space-y-6">
            {/* --- Step 1: Upload Section --- */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">
                    <SyncOutlined className="mr-2 text-blue-500" />
                    PDKS Kart Okuyucu Karşılaştırma
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Kart okuyucu (PDKS) cihazından alınan CSV dosyasını yükleyerek
                    sistemdeki mesai kayıtları ile karşılaştırabilirsiniz. Farklılıklar
                    tespit edildiğinde seçip düzeltebilirsiniz.
                </p>

                <Upload.Dragger {...uploadProps} className="mb-4">
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                        CSV dosyasını buraya sürükleyin veya tıklayın
                    </p>
                    <p className="ant-upload-hint">
                        Sadece .csv dosyaları kabul edilir. Dosya PDKS kart okuyucu formatında olmalıdır.
                    </p>
                </Upload.Dragger>

                <Space>
                    <Button
                        type="primary"
                        icon={<SyncOutlined spin={comparing} />}
                        onClick={handleCompare}
                        loading={comparing}
                        disabled={!file || comparing}
                        size="large"
                    >
                        {comparing ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
                    </Button>
                    {results && (
                        <Button onClick={handleReset} size="large">
                            Sıfırla
                        </Button>
                    )}
                </Space>
            </div>

            {/* --- Loading overlay --- */}
            {comparing && (
                <div className="flex items-center justify-center py-12">
                    <Spin size="large" tip="CSV dosyası işleniyor ve karşılaştırılıyor..." />
                </div>
            )}

            {/* --- Step 2: Summary Cards --- */}
            {results && summary && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard
                            title="Toplam Gün"
                            value={summary.total}
                            color="bg-blue-50 border-blue-200"
                            icon={<FileTextOutlined className="text-blue-500" />}
                        />
                        <SummaryCard
                            title="Fark Var"
                            value={summary.withDiff}
                            color="bg-red-50 border-red-200"
                            icon={<CloseCircleOutlined className="text-red-500" />}
                        />
                        <SummaryCard
                            title="Eşleşme"
                            value={summary.matching}
                            color="bg-green-50 border-green-200"
                            icon={<CheckCircleOutlined className="text-green-500" />}
                        />
                        <SummaryCard
                            title="Sistemde Kayıt Yok"
                            value={summary.noAttendance}
                            color="bg-orange-50 border-orange-200"
                            icon={<WarningOutlined className="text-orange-500" />}
                        />
                    </div>

                    {/* Unmatched SicilIDs warning */}
                    {results.unmatched_sicil_ids && results.unmatched_sicil_ids.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            icon={<ExclamationCircleOutlined />}
                            message="Eşleştirilemeyen Sicil Numaraları"
                            description={
                                <div className="mt-1">
                                    <p className="text-sm mb-2">
                                        Aşağıdaki sicil numaraları sistemde bulunamadı:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {results.unmatched_sicil_ids.map((id) => (
                                            <Tag key={id} color="orange" className="font-mono">
                                                {id}
                                            </Tag>
                                        ))}
                                    </div>
                                </div>
                            }
                        />
                    )}

                    {/* Parse errors warning */}
                    {results.parse_errors && results.parse_errors.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            className="mt-3"
                            message={`${results.parse_errors.length} satır CSV'den ayrıştırılamadı`}
                            description={
                                <div className="mt-1 max-h-32 overflow-y-auto">
                                    <ul className="list-disc pl-4 text-xs">
                                        {results.parse_errors.slice(0, 20).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {results.parse_errors.length > 20 && (
                                            <li>...ve {results.parse_errors.length - 20} daha</li>
                                        )}
                                    </ul>
                                </div>
                            }
                        />
                    )}
                </div>
            )}

            {/* --- Step 3: Results Table --- */}
            {results && results.matches && results.matches.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    {/* Table toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={showOnlyDiff}
                                onChange={(e) => setShowOnlyDiff(e.target.checked)}
                            >
                                <span className="text-sm">Sadece Farkları Göster</span>
                            </Checkbox>
                            <span className="text-xs text-gray-400">
                                {filteredData.length} / {results.matches.length} kayıt
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedRows.length > 0 && (
                                <Button
                                    type="primary"
                                    danger
                                    icon={<ToolOutlined />}
                                    onClick={handleFix}
                                    loading={fixing}
                                    disabled={fixing}
                                >
                                    Seçilenleri Düzelt ({selectedRows.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Main comparison table */}
                    <Table
                        dataSource={filteredData}
                        columns={columns}
                        rowKey={rowKey}
                        rowSelection={rowSelection}
                        expandable={{
                            expandedRowRender: (record) => <ExpandedRowContent record={record} />,
                            rowExpandable: () => true,
                        }}
                        rowClassName={(record) => {
                            if (!record.has_attendance) return 'pdks-row-missing';
                            if (record.has_difference) return 'pdks-row-diff';
                            return 'pdks-row-match';
                        }}
                        pagination={{
                            pageSize: 50,
                            showSizeChanger: true,
                            pageSizeOptions: ['25', '50', '100', '200'],
                            showTotal: (total, range) =>
                                `${range[0]}-${range[1]} / ${total} kayıt`,
                        }}
                        size="small"
                        bordered
                        scroll={{ x: 1100 }}
                        loading={comparing}
                        locale={{
                            emptyText: 'Karşılaştırma sonucu bulunamadı.',
                            filterConfirm: 'Filtrele',
                            filterReset: 'Sıfırla',
                        }}
                    />

                    {/* Row color legend */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
                            Eşleşiyor
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
                            Fark Var
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300" />
                            Kayıt Yok
                        </span>
                    </div>
                </div>
            )}

            {/* --- No differences message --- */}
            {results && results.matches && results.matches.length > 0 && summary && summary.withDiff === 0 && summary.noAttendance === 0 && (
                <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    message="Tüm Kayıtlar Eşleşiyor"
                    description="CSV dosyasındaki tüm kart okuyucu verileri sistemdeki mesai kayıtları ile eşleşmektedir. Düzeltme yapılmasına gerek yoktur."
                />
            )}

            {/* --- Step 5: Fix Results --- */}
            {fixResults && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">
                        <ToolOutlined className="mr-2 text-green-500" />
                        Düzeltme Sonuçları
                    </h3>

                    {/* Fix summary */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-700">
                                {fixResults.summary?.fixed || 0}
                            </div>
                            <div className="text-xs text-green-600 font-medium">Düzeltildi</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-700">
                                {fixResults.summary?.failed || 0}
                            </div>
                            <div className="text-xs text-red-600 font-medium">Hata</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-gray-700">
                                {fixResults.summary?.skipped || 0}
                            </div>
                            <div className="text-xs text-gray-600 font-medium">Atlandı</div>
                        </div>
                    </div>

                    {/* Fix details table */}
                    {fixResults.results && fixResults.results.length > 0 && (
                        <Table
                            dataSource={fixResults.results}
                            columns={fixColumns}
                            rowKey={(r) => `fix_${r.employee_id}_${r.work_date}`}
                            pagination={false}
                            size="small"
                            bordered
                            scroll={{ x: 1000 }}
                            rowClassName={(record) => {
                                if (record.status === 'fixed' || record.status === 'created')
                                    return 'pdks-row-match';
                                if (record.status === 'failed')
                                    return 'pdks-row-diff';
                                if (record.status === 'skipped')
                                    return 'pdks-row-missing';
                                return '';
                            }}
                        />
                    )}

                    {/* Errors list — filter failed results */}
                    {fixResults.results?.filter(r => r.status === 'failed').length > 0 && (
                        <Alert
                            type="error"
                            showIcon
                            className="mt-4"
                            message="Düzeltme Hataları"
                            description={
                                <ul className="list-disc pl-4 text-xs mt-1">
                                    {fixResults.results.filter(r => r.status === 'failed').map((err, i) => (
                                        <li key={i}>
                                            <strong>{err.employee_name || `#${err.employee_id}`}</strong> ({err.work_date}): {err.error}
                                        </li>
                                    ))}
                                </ul>
                            }
                        />
                    )}
                </div>
            )}

            {/* --- Inline styles for row coloring --- */}
            <style>{`
                .pdks-row-match td {
                    background-color: #f0fdf4 !important;
                }
                .pdks-row-match:hover td {
                    background-color: #dcfce7 !important;
                }
                .pdks-row-diff td {
                    background-color: #fef2f2 !important;
                }
                .pdks-row-diff:hover td {
                    background-color: #fee2e2 !important;
                }
                .pdks-row-missing td {
                    background-color: #fff7ed !important;
                }
                .pdks-row-missing:hover td {
                    background-color: #ffedd5 !important;
                }
            `}</style>
        </div>
    );
}
