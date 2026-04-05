import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Tag, Modal, Form, Input, Select, InputNumber,
  Space, Tabs, message, Popconfirm, Descriptions, Badge, Statistic,
  Row, Col, Tooltip, Empty, Drawer
} from 'antd';
import {
  ShoppingCart, Plus, Eye, Check, X, Trash2, AlertTriangle,
  Package, Edit3, Ban, Clock, CheckCircle2, XCircle, Send
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// =================== CONSTANTS ===================

const CATEGORIES = [
  { value: 'OFFICE_SUPPLIES', label: 'Ofis & Kırtasiye' },
  { value: 'IT_EQUIPMENT', label: 'Bilgi Teknolojileri' },
  { value: 'SOFTWARE_LICENSE', label: 'Yazılım & Lisans' },
  { value: 'SURVEY_EQUIPMENT', label: 'Ölçüm & Harita Ekipmanı' },
  { value: 'PRINTING', label: 'Baskı & Çoğaltma' },
  { value: 'SAFETY_PPE', label: 'İş Güvenliği / KKD' },
  { value: 'FURNITURE', label: 'Mobilya & Ofis Donanımı' },
  { value: 'KITCHEN_CLEANING', label: 'Mutfak & Temizlik' },
  { value: 'TECHNICAL_REFS', label: 'Teknik Yayın & Şartname' },
  { value: 'OTHER', label: 'Diğer' },
];

const UNITS = [
  { value: 'ADET', label: 'Adet' },
  { value: 'KG', label: 'Kg' },
  { value: 'KUTU', label: 'Kutu' },
  { value: 'PAKET', label: 'Paket' },
  { value: 'LITRE', label: 'Litre' },
  { value: 'TAKIM', label: 'Takım' },
  { value: 'METRE', label: 'Metre' },
  { value: 'RULO', label: 'Rulo' },
];

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal', color: 'default' },
  { value: 'URGENT', label: 'Acil', color: 'orange' },
  { value: 'CRITICAL', label: 'Çok Acil', color: 'red' },
];

const STATUS_COLORS = {
  PENDING: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'default',
};

const STATUS_LABELS = {
  PENDING: 'Onay Bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  CANCELLED: 'İptal Edildi',
};

const STATUS_ICONS = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));
const UNIT_MAP = Object.fromEntries(UNITS.map(u => [u.value, u.label]));
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.value, p.label]));

const formatCurrency = (val) => {
  if (val == null || val === '') return '-';
  return Number(val).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
};

const formatDate = (d) => {
  if (!d) return '-';
  return dayjs(d).format('DD.MM.YYYY');
};

const formatDateTime = (d) => {
  if (!d) return '-';
  return dayjs(d).format('DD.MM.YYYY HH:mm');
};

// =================== MAIN COMPONENT ===================

const Procurement = () => {
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission('SYSTEM_FULL_ACCESS');

  // State
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('my');
  const [statusFilter, setStatusFilter] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [createForm] = Form.useForm();

  // Data Fetching
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/procurement-requests/');
      setRequests(res.data.results || res.data);
    } catch {
      message.error('Talepler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Filtered data
  const myRequests = useMemo(() => {
    return requests.filter(r => r.employee === user?.id);
  }, [requests, user]);

  const allRequests = useMemo(() => requests, [requests]);

  const getFilteredData = useCallback((data) => {
    let filtered = [...data];
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (priorityFilter) {
      filtered = filtered.filter(r => r.priority === priorityFilter);
    }
    return filtered;
  }, [statusFilter, priorityFilter]);

  const currentData = useMemo(() => {
    const base = activeTab === 'all' ? allRequests : myRequests;
    return getFilteredData(base);
  }, [activeTab, allRequests, myRequests, getFilteredData]);

  // Summary stats
  const stats = useMemo(() => {
    const base = activeTab === 'all' ? allRequests : myRequests;
    return {
      total: base.length,
      pending: base.filter(r => r.status === 'PENDING').length,
      approved: base.filter(r => r.status === 'APPROVED').length,
      rejected: base.filter(r => r.status === 'REJECTED').length,
    };
  }, [activeTab, allRequests, myRequests]);

  // Actions
  const handleCreate = async (values) => {
    setSubmitLoading(true);
    try {
      const payload = {
        title: values.title,
        description: values.description || '',
        priority: values.priority || 'NORMAL',
        items: values.items.map(item => ({
          category: item.category,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          estimated_cost: item.estimated_cost || null,
          notes: item.notes || '',
        })),
      };
      await api.post('/procurement-requests/', payload);
      message.success('Tedarik talebi başarıyla oluşturuldu');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchRequests();
    } catch (err) {
      const titleErr = err?.response?.data?.title;
      const detail = err?.response?.data?.detail || (Array.isArray(titleErr) ? titleErr[0] : titleErr) || 'Talep oluşturulurken hata oluştu';
      message.error(typeof detail === 'string' ? detail : 'Talep oluşturulurken hata oluştu');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await api.post(`/procurement-requests/${id}/approve/`);
      message.success('Talep onaylandı');
      setDetailModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch {
      message.error('Onaylama sırasında hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      message.warning('Lütfen red gerekçesi giriniz');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/procurement-requests/${id}/reject/`, { rejection_reason: rejectReason });
      message.success('Talep reddedildi');
      setRejectModalOpen(false);
      setRejectReason('');
      setDetailModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch {
      message.error('Reddetme sırasında hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id) => {
    setActionLoading(true);
    try {
      await api.post(`/procurement-requests/${id}/cancel/`);
      message.success('Talep iptal edildi');
      fetchRequests();
    } catch {
      message.error('İptal sırasında hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await api.delete(`/procurement-requests/${id}/`);
      message.success('Talep silindi');
      fetchRequests();
    } catch {
      message.error('Silme sırasında hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (record) => {
    setSelectedRequest(record);
    setDetailModalOpen(true);
  };

  // Table columns
  const getColumns = (showEmployee) => {
    const cols = [
      {
        title: 'Başlık',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (text, record) => (
          <button
            onClick={() => openDetail(record)}
            className="text-left text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
          >
            {text}
          </button>
        ),
      },
    ];

    if (showEmployee) {
      cols.push({
        title: 'Talep Eden',
        dataIndex: 'employee_name',
        key: 'employee_name',
        width: 160,
        ellipsis: true,
      });
    }

    cols.push(
      {
        title: 'Kalem',
        key: 'item_count',
        width: 80,
        align: 'center',
        render: (_, record) => (
          <Badge count={record.items?.length || 0} showZero color="blue" />
        ),
      },
      {
        title: 'Toplam Maliyet',
        dataIndex: 'total_estimated_cost',
        key: 'total_estimated_cost',
        width: 150,
        align: 'right',
        render: (val) => (
          <span className="font-semibold text-slate-700">{formatCurrency(val)}</span>
        ),
        sorter: (a, b) => (Number(a.total_estimated_cost) || 0) - (Number(b.total_estimated_cost) || 0),
      },
      {
        title: 'Öncelik',
        dataIndex: 'priority',
        key: 'priority',
        width: 110,
        align: 'center',
        render: (val) => {
          const p = PRIORITIES.find(p2 => p2.value === val);
          return <Tag color={p?.color || 'default'}>{p?.label || val}</Tag>;
        },
        filters: PRIORITIES.map(p => ({ text: p.label, value: p.value })),
        onFilter: (value, record) => record.priority === value,
      },
      {
        title: 'Durum',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        align: 'center',
        render: (val) => (
          <Tag color={STATUS_COLORS[val] || 'default'}>
            {STATUS_LABELS[val] || val}
          </Tag>
        ),
        filters: Object.entries(STATUS_LABELS).map(([k, v]) => ({ text: v, value: k })),
        onFilter: (value, record) => record.status === value,
      },
      {
        title: 'Tarih',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 120,
        render: (val) => <span className="text-slate-500 text-sm">{formatDate(val)}</span>,
        sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
        defaultSortOrder: 'descend',
      },
      {
        title: 'İşlemler',
        key: 'actions',
        width: 140,
        align: 'center',
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Detay">
              <Button
                type="text"
                size="small"
                icon={<Eye size={16} />}
                onClick={() => openDetail(record)}
                className="text-blue-500 hover:text-blue-700"
              />
            </Tooltip>
            {record.status === 'PENDING' && record.employee === user?.id && (
              <>
                <Popconfirm
                  title="İptal Et"
                  description="Bu talebi iptal etmek istediğinizden emin misiniz?"
                  onConfirm={() => handleCancel(record.id)}
                  okText="Evet"
                  cancelText="Hayır"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="İptal Et">
                    <Button
                      type="text"
                      size="small"
                      icon={<Ban size={16} />}
                      className="text-orange-500 hover:text-orange-700"
                    />
                  </Tooltip>
                </Popconfirm>
                <Popconfirm
                  title="Sil"
                  description="Bu talep kalıcı olarak silinecek. Emin misiniz?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Evet"
                  cancelText="Hayır"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Sil">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<Trash2 size={16} />}
                    />
                  </Tooltip>
                </Popconfirm>
              </>
            )}
          </Space>
        ),
      },
    );

    return cols;
  };

  // Item table columns for detail modal
  const itemColumns = [
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      render: (val) => CATEGORY_MAP[val] || val,
    },
    {
      title: 'Ürün Adı',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Miktar',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center',
      render: (val) => Number(val),
    },
    {
      title: 'Birim',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center',
      render: (val) => UNIT_MAP[val] || val,
    },
    {
      title: 'Tahmini Maliyet',
      dataIndex: 'estimated_cost',
      key: 'estimated_cost',
      width: 130,
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    {
      title: 'Not',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val) => val || '-',
    },
  ];

  // Summary cards config
  const summaryCards = [
    { title: 'Toplam Talep', value: stats.total, color: 'from-blue-500 to-indigo-500', bgLight: 'bg-blue-50', icon: ShoppingCart },
    { title: 'Onay Bekleyen', value: stats.pending, color: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-50', icon: Clock },
    { title: 'Onaylanan', value: stats.approved, color: 'from-emerald-500 to-green-500', bgLight: 'bg-emerald-50', icon: CheckCircle2 },
    { title: 'Reddedilen', value: stats.rejected, color: 'from-rose-500 to-red-500', bgLight: 'bg-rose-50', icon: XCircle },
  ];

  // Tab items
  const tabItems = [
    {
      key: 'my',
      label: (
        <span className="flex items-center gap-2">
          <Package size={16} />
          Taleplerim
          <Badge count={myRequests.length} showZero size="small" />
        </span>
      ),
    },
  ];

  if (isAdmin) {
    tabItems.push({
      key: 'all',
      label: (
        <span className="flex items-center gap-2">
          <ShoppingCart size={16} />
          Tüm Talepler
          <Badge count={allRequests.length} showZero size="small" />
        </span>
      ),
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShoppingCart size={20} className="text-white" />
            </div>
            Tedarik Talepleri
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-[52px]">
            Tedarik taleplerini oluşturun, takip edin ve yönetin
          </p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<Plus size={18} />}
          onClick={() => {
            createForm.resetFields();
            createForm.setFieldsValue({ priority: 'NORMAL', items: [{}] });
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 border-none shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all h-11 rounded-xl font-semibold"
        >
          Yeni Talep
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg p-4 sm:p-5 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">{card.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={22} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setStatusFilter(null);
            setPriorityFilter(null);
          }}
          items={tabItems}
          className="px-4 pt-3"
          size="large"
        />

        {/* Filters */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-3">
          <Select
            placeholder="Durum Filtresi"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Select
            placeholder="Öncelik Filtresi"
            allowClear
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 160 }}
            options={PRIORITIES.map(p => ({ value: p.value, label: p.label }))}
          />
          {(statusFilter || priorityFilter) && (
            <Button
              type="link"
              size="small"
              onClick={() => { setStatusFilter(null); setPriorityFilter(null); }}
            >
              Filtreleri Temizle
            </Button>
          )}
        </div>

        {/* Table */}
        <Table
          dataSource={currentData}
          columns={getColumns(activeTab === 'all')}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} talep`,
          }}
          scroll={{ x: 800 }}
          locale={{ emptyText: <Empty description="Henüz talep bulunmuyor" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          className="px-4 pb-4"
          size="middle"
        />
      </div>

      {/* =================== CREATE MODAL =================== */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Plus size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold">Yeni Tedarik Talebi</span>
          </div>
        }
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        width={720}
        destroyOnClose
        footer={
          <div className="flex justify-end gap-3 py-2">
            <Button size="large" onClick={() => setCreateModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="primary"
              size="large"
              loading={submitLoading}
              icon={<Send size={16} />}
              onClick={() => createForm.submit()}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 border-none"
            >
              Talebi Oluştur
            </Button>
          </div>
        }
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ priority: 'NORMAL', items: [{}] }}
        >
          <div className="space-y-5">
            {/* Basic Info */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Edit3 size={14} />
                Talep Bilgileri
              </h3>
              <Form.Item
                name="title"
                label="Başlık"
                rules={[{ required: true, message: 'Başlık zorunludur' }]}
              >
                <Input placeholder="Örn: Mart Ayı Ofis İhtiyaçları" maxLength={200} />
              </Form.Item>

              <Form.Item name="description" label="Açıklama">
                <Input.TextArea
                  rows={3}
                  placeholder="Talep ile ilgili detaylar..."
                  maxLength={1000}
                  showCount
                />
              </Form.Item>

              <Form.Item name="priority" label="Öncelik">
                <Select options={PRIORITIES.map(p => ({ value: p.value, label: p.label }))} />
              </Form.Item>
            </div>

            {/* Items */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-4">
                <Package size={14} />
                Kalemler
              </h3>

              <Form.List
                name="items"
                rules={[
                  {
                    validator: async (_, items) => {
                      if (!items || items.length === 0) {
                        return Promise.reject(new Error('En az 1 kalem eklemelisiniz'));
                      }
                    },
                  },
                ]}
              >
                {(fields, { add, remove }, { errors }) => (
                  <div className="space-y-4">
                    {fields.map(({ key, name, ...restField }, index) => (
                      <div
                        key={key}
                        className="bg-white rounded-lg border border-slate-200 p-4 relative"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Kalem {index + 1}
                          </span>
                          {fields.length > 1 && (
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<Trash2 size={14} />}
                              onClick={() => remove(name)}
                            >
                              Sil
                            </Button>
                          )}
                        </div>

                        <Row gutter={[12, 0]}>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'category']}
                              label="Kategori"
                              rules={[{ required: true, message: 'Kategori seçiniz' }]}
                            >
                              <Select
                                placeholder="Kategori seçiniz"
                                options={CATEGORIES}
                                showSearch
                                optionFilterProp="label"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              {...restField}
                              name={[name, 'name']}
                              label="Ürün Adı"
                              rules={[{ required: true, message: 'Ürün adı zorunludur' }]}
                            >
                              <Input placeholder="Örn: A4 Kağıt" maxLength={200} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'quantity']}
                              label="Miktar"
                              rules={[{ required: true, message: 'Miktar zorunludur' }]}
                            >
                              <InputNumber
                                min={0.01}
                                step={1}
                                placeholder="0"
                                className="w-full"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'unit']}
                              label="Birim"
                              rules={[{ required: true, message: 'Birim seçiniz' }]}
                            >
                              <Select
                                placeholder="Birim"
                                options={UNITS}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'estimated_cost']}
                              label="Tah. Maliyet (₺)"
                            >
                              <InputNumber
                                min={0}
                                step={10}
                                placeholder="0.00"
                                className="w-full"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'notes']}
                              label="Not"
                            >
                              <Input placeholder="Opsiyonel" maxLength={500} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ))}

                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<Plus size={16} />}
                      className="flex items-center justify-center gap-2 h-10"
                    >
                      Kalem Ekle
                    </Button>

                    <Form.ErrorList errors={errors} />
                  </div>
                )}
              </Form.List>
            </div>
          </div>
        </Form>
      </Drawer>

      {/* =================== DETAIL MODAL =================== */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Eye size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold">Talep Detayı</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setSelectedRequest(null); }}
        footer={null}
        width={720}
        destroyOnClose
      >
        {selectedRequest && (
          <div className="space-y-5 mt-4">
            {/* Status Banner */}
            {selectedRequest.status === 'REJECTED' && selectedRequest.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-700">Red Gerekçesi</p>
                  <p className="text-sm text-red-600 mt-1">{selectedRequest.rejection_reason}</p>
                </div>
              </div>
            )}

            {/* Info */}
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              labelStyle={{ fontWeight: 600, backgroundColor: '#f8fafc' }}
            >
              <Descriptions.Item label="Başlık" span={2}>
                {selectedRequest.title}
              </Descriptions.Item>
              {selectedRequest.description && (
                <Descriptions.Item label="Açıklama" span={2}>
                  {selectedRequest.description}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Talep Eden">
                {selectedRequest.employee_name}
              </Descriptions.Item>
              <Descriptions.Item label="Öncelik">
                <Tag color={PRIORITIES.find(p => p.value === selectedRequest.priority)?.color || 'default'}>
                  {selectedRequest.priority_display || PRIORITY_MAP[selectedRequest.priority] || selectedRequest.priority}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Durum">
                <Tag color={STATUS_COLORS[selectedRequest.status] || 'default'}>
                  {selectedRequest.status_display || STATUS_LABELS[selectedRequest.status] || selectedRequest.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Toplam Maliyet">
                <span className="font-bold text-slate-800">{formatCurrency(selectedRequest.total_estimated_cost)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Oluşturma Tarihi">
                {formatDateTime(selectedRequest.created_at)}
              </Descriptions.Item>
              {selectedRequest.approved_by_name && (
                <Descriptions.Item label="Onaylayan">
                  {selectedRequest.approved_by_name}
                </Descriptions.Item>
              )}
              {selectedRequest.approval_date && (
                <Descriptions.Item label="Onay Tarihi">
                  {formatDateTime(selectedRequest.approval_date)}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Items Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Package size={14} />
                Kalemler ({selectedRequest.items?.length || 0})
              </h3>
              <Table
                dataSource={selectedRequest.items || []}
                columns={itemColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
                bordered
              />
            </div>

            {/* Admin Actions */}
            {isAdmin && selectedRequest.status === 'PENDING' && (
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  danger
                  size="large"
                  icon={<X size={16} />}
                  onClick={() => setRejectModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  Reddet
                </Button>
                <Popconfirm
                  title="Bu talebi onaylamak istediğinizden emin misiniz?"
                  onConfirm={() => handleApprove(selectedRequest.id)}
                  okText="Evet, Onayla"
                  cancelText="Hayır"
                >
                  <Button
                    type="primary"
                    size="large"
                    loading={actionLoading}
                    icon={<Check size={16} />}
                    className="flex items-center gap-2 bg-emerald-500 border-emerald-500 hover:bg-emerald-600"
                  >
                    Onayla
                  </Button>
                </Popconfirm>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* =================== REJECT MODAL =================== */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <X size={16} className="text-red-600" />
            </div>
            <span className="text-lg font-bold text-red-700">Talebi Reddet</span>
          </div>
        }
        open={rejectModalOpen}
        onCancel={() => { setRejectModalOpen(false); setRejectReason(''); }}
        onOk={() => handleReject(selectedRequest?.id)}
        okText="Reddet"
        cancelText="Vazgeç"
        okButtonProps={{ danger: true, loading: actionLoading }}
        destroyOnClose
      >
        <div className="py-3">
          <p className="text-sm text-slate-600 mb-3">
            Lütfen red gerekçesini belirtiniz. Bu bilgi talep sahibine iletilecektir.
          </p>
          <Input.TextArea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Red gerekçesi..."
            maxLength={500}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
};

export default Procurement;
