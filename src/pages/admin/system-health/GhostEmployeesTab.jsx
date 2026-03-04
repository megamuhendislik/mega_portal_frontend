import React, { useState } from 'react';
import { Table, Button, Modal, Tag, Alert, message, Space, Statistic, Card, Checkbox, Tooltip } from 'antd';
import {
    SearchOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    UserDeleteOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

const GHOST_REASON_MAP = {
    INACTIVE: { label: 'Pasif', color: 'red', desc: 'is_active=False' },
    TERMINATED: { label: 'İş Akdi Sonlandırılmış', color: 'volcano', desc: 'employment_status=TERMINATED' },
    FROZEN: { label: 'Dondurulmuş', color: 'blue', desc: 'is_frozen=True' },
    ABSENT_ONLY: { label: 'Sadece Devamsız', color: 'orange', desc: 'Aktif ama tüm mesai kayıtları ABSENT' },
    USER_DISABLED: { label: 'Hesap Kapatılmış', color: 'magenta', desc: 'Employee aktif ama User hesabı devre dışı (frontend\'ten silinmiş)' },
    ORPHAN_USER: { label: 'Yetim Kullanıcı', color: 'purple', desc: 'User var, Employee yok' },
};

export default function GhostEmployeesTab() {
    const [scanning, setScanning] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [data, setData] = useState(null);
    const [selectedKeys, setSelectedKeys] = useState([]);

    const handleScan = async () => {
        setScanning(true);
        setData(null);
        setSelectedKeys([]);
        try {
            const res = await api.get('/system/health-check/ghost-employees/');
            setData(res.data);
        } catch (e) {
            message.error('Tarama hatası: ' + (e.response?.data?.error || e.message));
        } finally {
            setScanning(false);
        }
    };

    const handleDelete = () => {
        if (!selectedKeys.length) {
            message.warning('Silinecek kayıt seçiniz.');
            return;
        }

        const ghosts = data?.ghosts || [];
        const selected = ghosts.filter((_, i) => selectedKeys.includes(i));
        const empIds = selected.filter(g => g.ghost_reason !== 'ORPHAN_USER').map(g => g.employee_id);
        const userIds = selected.filter(g => g.ghost_reason === 'ORPHAN_USER').map(g => g.user_id);

        Modal.confirm({
            title: 'Kalıntı Kayıtları Tamamen Sil',
            icon: <ExclamationCircleOutlined />,
            width: 520,
            content: (
                <div className="mt-2 text-sm">
                    <p>
                        <strong>{selected.length}</strong> kayıt ve TÜM ilişkili verileri kalıcı silinecek:
                    </p>
                    <ul className="list-disc pl-4 mt-2 text-gray-600 max-h-48 overflow-y-auto">
                        {selected.map((g, i) => (
                            <li key={i}>
                                {g.employee_name}
                                {g.sicil_no !== '-' && ` (Sicil: ${g.sicil_no})`}
                                {' — '}
                                <span className="text-red-500">
                                    {g.record_counts?.total || 0} kayıt silinecek
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-red-500 font-medium">
                        Bu işlem GERİ ALINAMAZ!
                    </p>
                </div>
            ),
            okText: 'Tamamen Sil',
            okButtonProps: { danger: true },
            cancelText: 'İptal',
            onOk: async () => {
                setDeleting(true);
                try {
                    const res = await api.post('/system/health-check/ghost-employees/', {
                        employee_ids: empIds,
                        user_ids: userIds,
                    });
                    const deleted = res.data.summary?.deleted || 0;
                    message.success(`${deleted} kayıt tamamen silindi.`);
                    // Remove deleted from list
                    const deletedEmpSet = new Set(
                        res.data.results?.filter(r => r.status === 'deleted' && r.type === 'employee').map(r => r.id) || []
                    );
                    const deletedUserSet = new Set(
                        res.data.results?.filter(r => r.status === 'deleted' && r.type === 'user').map(r => r.id) || []
                    );
                    setData(prev => ({
                        ...prev,
                        ghosts: prev.ghosts.filter(g => {
                            if (g.ghost_reason === 'ORPHAN_USER') return !deletedUserSet.has(g.user_id);
                            return !deletedEmpSet.has(g.employee_id);
                        }),
                    }));
                    setSelectedKeys([]);
                } catch (e) {
                    message.error('Silme hatası: ' + (e.response?.data?.error || e.message));
                } finally {
                    setDeleting(false);
                }
            },
        });
    };

    const ghosts = data?.ghosts || [];
    const summary = data?.summary || {};

    const columns = [
        {
            title: 'Ad Soyad',
            dataIndex: 'employee_name',
            key: 'name',
            render: (name, record) => (
                <div>
                    <span className="font-medium">{name}</span>
                    {record.sicil_no !== '-' && (
                        <span className="text-gray-400 ml-2 text-xs">Sicil: {record.sicil_no}</span>
                    )}
                </div>
            ),
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            key: 'department',
            responsive: ['md'],
        },
        {
            title: 'Durum',
            key: 'reason',
            render: (_, record) => {
                const info = GHOST_REASON_MAP[record.ghost_reason] || {};
                return (
                    <Tooltip title={info.desc}>
                        <Tag color={info.color}>{info.label}</Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Mesai',
            key: 'att',
            align: 'center',
            render: (_, r) => r.record_counts?.attendance || 0,
        },
        {
            title: 'Ek Mesai',
            key: 'ot',
            align: 'center',
            render: (_, r) => r.record_counts?.overtime || 0,
        },
        {
            title: 'İzin',
            key: 'leave',
            align: 'center',
            render: (_, r) => r.record_counts?.leave || 0,
        },
        {
            title: 'Yemek',
            key: 'meal',
            align: 'center',
            render: (_, r) => r.record_counts?.meal || 0,
        },
        {
            title: 'Toplam',
            key: 'total',
            align: 'center',
            render: (_, r) => {
                const total = r.record_counts?.total || 0;
                return <span className={total > 0 ? 'text-red-500 font-bold' : 'text-gray-400'}>{total}</span>;
            },
        },
    ];

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Kalıntı Çalışan Tarayıcı</h3>
                        <p className="text-sm text-gray-500">
                            Silinmiş/pasifleştirilmiş ama tam temizlenmemiş çalışanları bulur
                        </p>
                    </div>
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        loading={scanning}
                        onClick={handleScan}
                    >
                        Tara
                    </Button>
                </div>

                {data && (
                    <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                            <Card size="small" className="text-center">
                                <Statistic title="Toplam" value={summary.total || 0} valueStyle={{ color: summary.total > 0 ? '#ef4444' : '#22c55e' }} />
                            </Card>
                            <Card size="small" className="text-center">
                                <Statistic title="Pasif" value={summary.inactive || 0} valueStyle={{ fontSize: 20 }} />
                            </Card>
                            <Card size="small" className="text-center">
                                <Statistic title="Sonlandırılmış" value={summary.terminated || 0} valueStyle={{ fontSize: 20 }} />
                            </Card>
                            <Card size="small" className="text-center">
                                <Statistic title="Dondurulmuş" value={summary.frozen || 0} valueStyle={{ fontSize: 20 }} />
                            </Card>
                            <Card size="small" className="text-center">
                                <Statistic title="Sadece Devamsız" value={summary.absent_only || 0} valueStyle={{ fontSize: 20, color: '#f97316' }} />
                            </Card>
                            <Card size="small" className="text-center">
                                <Statistic title="Hesap Kapalı" value={summary.user_disabled || 0} valueStyle={{ fontSize: 20, color: '#eb2f96' }} />
                            </Card>
                            <Card size="small" className="text-center">
                                <Statistic title="Yetim User" value={summary.orphan_users || 0} valueStyle={{ fontSize: 20 }} />
                            </Card>
                        </div>

                        {ghosts.length === 0 ? (
                            <Alert
                                type="success"
                                icon={<CheckCircleOutlined />}
                                showIcon
                                message="Kalıntı kayıt bulunamadı"
                                description="Sistemde silinmemiş kalıntı çalışan yok."
                            />
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-3">
                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        loading={deleting}
                                        disabled={selectedKeys.length === 0}
                                        onClick={handleDelete}
                                    >
                                        Seçilenleri Tamamen Sil ({selectedKeys.length})
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={() => setSelectedKeys(ghosts.map((_, i) => i))}
                                    >
                                        Tümünü Seç
                                    </Button>
                                    {selectedKeys.length > 0 && (
                                        <Button size="small" onClick={() => setSelectedKeys([])}>
                                            Seçimi Kaldır
                                        </Button>
                                    )}
                                </div>
                                <Table
                                    dataSource={ghosts}
                                    columns={columns}
                                    rowKey={(_, i) => i}
                                    size="small"
                                    pagination={false}
                                    rowSelection={{
                                        selectedRowKeys: selectedKeys,
                                        onChange: setSelectedKeys,
                                    }}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
