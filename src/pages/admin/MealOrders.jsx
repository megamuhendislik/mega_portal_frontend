import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Input, DatePicker, message, Modal } from 'antd';
import { CheckOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const MealOrders = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({ total: 0, ordered: 0, pending: 0 });
    const [date, setDate] = useState(dayjs());
    const [editingNote, setEditingNote] = useState(null);
    const [noteText, setNoteText] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const dateStr = date.format('YYYY-MM-DD');
            // Parallel Fetch
            const [listRes, summaryRes] = await Promise.all([
                api.get(`/meal-orders/?date=${dateStr}`),
                api.get(`/meal-orders/summary/?date=${dateStr}`)
            ]);

            setData(listRes.data);
            setSummary(summaryRes.data); // Adjust if summary endpoint structure differs
        } catch (error) {
            message.error("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [date]);

    const handleMarkOrdered = async (id, currentStatus) => {
        try {
            await api.post(`/meal-orders/${id}/mark_ordered/`, {
                is_ordered: !currentStatus
            });
            message.success("Durum güncellendi.");
            fetchData();
        } catch (error) {
            message.error("İşlem başarısız.");
        }
    };

    const handleSaveNote = async () => {
        if (!editingNote) return;
        try {
            await api.post(`/meal-orders/${editingNote.id}/mark_ordered/`, {
                is_ordered: editingNote.is_ordered, // Keep status same
                note: noteText
            });
            message.success("Not kaydedildi.");
            setEditingNote(null);
            fetchData();
        } catch (error) {
            message.error("Not kaydedilemedi.");
        }
    };

    const columns = [
        {
            title: 'Personel',
            dataIndex: 'employee',
            key: 'employee.full_name',
            render: (emp) => (
                <div>
                    <div className="font-medium">{emp?.full_name}</div>
                    <div className="text-xs text-gray-500">{emp?.department?.name}</div>
                </div>
            )
        },
        {
            title: 'Tercih / Açıklama',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Not',
            dataIndex: 'order_note',
            key: 'order_note',
            render: (text, record) => (
                <div className="flex items-center gap-2 group">
                    <span className="text-sm text-gray-600">{text || '-'}</span>
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => {
                            setEditingNote(record);
                            setNoteText(record.order_note || '');
                        }}
                    />
                </div>
            )
        },
        {
            title: 'Durum',
            dataIndex: 'is_ordered',
            key: 'is_ordered',
            render: (val) => val ? <Tag color="green">Sipariş Verildi</Tag> : <Tag color="default">Bekliyor</Tag>
        },
        {
            title: 'İşlem',
            key: 'action',
            render: (_, record) => (
                <Button
                    type={record.is_ordered ? "default" : "primary"}
                    icon={<CheckOutlined />}
                    onClick={() => handleMarkOrdered(record.id, record.is_ordered)}
                    className={record.is_ordered ? "text-green-600 border-green-600" : ""}
                >
                    {record.is_ordered ? "Geri Al" : "Sipariş Verildi"}
                </Button>
            )
        }
    ];

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Yemek Sipariş Yönetimi</h1>
                    <p className="text-gray-500">Günlük yemek talepleri ve sipariş durumu</p>
                </div>
                <div className="flex gap-4">
                    <DatePicker value={date} onChange={setDate} allowClear={false} />
                    {/* Add Export Button later */}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="shadow-sm">
                    <div className="text-gray-500">Toplam Talep</div>
                    <div className="text-2xl font-bold">{summary.total_requests || 0}</div>
                </Card>
                <Card className="shadow-sm border-l-4 border-green-500">
                    <div className="text-gray-500">Sipariş Verilen</div>
                    <div className="text-2xl font-bold text-green-600">{summary.ordered_count || 0}</div>
                </Card>
                <Card className="shadow-sm border-l-4 border-gray-300">
                    <div className="text-gray-500">Bekleyen</div>
                    <div className="text-2xl font-bold text-gray-600">{summary.pending_count || 0}</div>
                </Card>
            </div>

            <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
                <Table
                    loading={loading}
                    dataSource={data}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 50 }}
                />
            </Card>

            <Modal
                title="Sipariş Notu Ekle"
                open={!!editingNote}
                onOk={handleSaveNote}
                onCancel={() => setEditingNote(null)}
            >
                <Input.TextArea
                    rows={4}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Örn: Özel diyet menüsü istendi..."
                />
            </Modal>
        </div>
    );
};

export default MealOrders;
