import React, { useState, useCallback } from 'react';
import { Drawer, Progress, Table, Tag, Spin, Empty } from 'antd';
import { Clock, AlertCircle, XCircle, Lightbulb } from 'lucide-react';
import api from '../services/api';

const STATUS_CONFIG = {
  APPROVED:  { label: 'Onayl\u0131',     color: 'green' },
  PENDING:   { label: 'Bekleyen',   color: 'orange' },
  REJECTED:  { label: 'Reddedilen', color: 'red' },
  POTENTIAL: { label: 'Potansiyel', color: 'blue' },
};

const SOURCE_LABELS = {
  INTENDED:  'Planl\u0131',
  POTENTIAL: 'Alg\u0131lanan',
  MANUAL:    'Manuel',
  AUTO:      'Otomatik',
};

const DAY_NAMES = ['Paz', 'Pzt', 'Sal', '\u00c7ar', 'Per', 'Cum', 'Cmt'];
const MONTH_NAMES = ['Oca', '\u015eub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'A\u011fu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function formatDate(dateStr) {
  const dt = new Date(dateStr + 'T00:00:00');
  return `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} ${DAY_NAMES[dt.getDay()]}`;
}

function formatWindowDate(dateStr) {
  const dt = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES[dt.getDay()]} ${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]}`;
}

export default function WeeklyOtDetailDrawer({ open, onClose, employeeId, employeeName, referenceDate }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = { include_all: true };
    if (employeeId) params.employee_id = employeeId;
    if (referenceDate) params.reference_date = referenceDate;

    api.get('/overtime-requests/weekly-ot-status/', { params })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [employeeId, referenceDate]);

  const ratio = data ? (data.used_hours / (data.limit_hours || 1)) : 0;
  const progressColor = ratio >= 0.9 ? '#ef4444' : ratio >= 0.7 ? '#f59e0b' : '#22c55e';

  const columns = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (d) => <span className="text-xs">{formatDate(d)}</span>,
    },
    {
      title: 'Saat',
      key: 'time',
      width: 110,
      render: (_, r) => {
        if (!r.start_time || !r.end_time) return <span className="text-gray-400">-</span>;
        const st = r.start_time.length > 5 ? r.start_time.slice(0, 5) : r.start_time;
        const et = r.end_time.length > 5 ? r.end_time.slice(0, 5) : r.end_time;
        return <span className="text-xs font-mono">{st}\u2013{et}</span>;
      },
    },
    {
      title: 'S\u00fcre',
      dataIndex: 'hours',
      key: 'hours',
      width: 70,
      render: (h) => <span className="text-xs font-semibold">{h} sa</span>,
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      width: 95,
      render: (s) => {
        const cfg = STATUS_CONFIG[s] || { label: s, color: 'default' };
        return <Tag color={cfg.color} className="text-[10px]">{cfg.label}</Tag>;
      },
    },
    {
      title: 'Kaynak',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 85,
      render: (s) => <span className="text-xs text-gray-500">{SOURCE_LABELS[s] || s || '-'}</span>,
    },
  ];

  const summaryItems = data ? [
    { key: 'APPROVED', hours: data.approved_hours || 0, count: data.approved_count || 0 },
    { key: 'PENDING', hours: data.pending_hours || 0, count: data.pending_count || 0 },
    { key: 'REJECTED', hours: data.rejected_hours || 0, count: data.rejected_count || 0 },
    { key: 'POTENTIAL', hours: data.potential_hours || 0, count: data.potential_count || 0 },
  ].filter(item => item.count > 0) : [];

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-500" />
          <span className="text-sm font-semibold">Haftal\u0131k Ek Mesai Detay\u0131</span>
          {employeeName && <Tag color="blue" className="text-[10px] ml-1">{employeeName}</Tag>}
        </div>
      }
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
      afterOpenChange={(visible) => { if (visible) fetchData(); }}
    >
      {loading ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : !data ? (
        <Empty description="Veri y\u00fcklenemedi" />
      ) : (
        <div className="space-y-4">
          {/* Hafta bilgisi */}
          <div className="text-xs text-gray-400 text-center">
            {formatWindowDate(data.window_start)} \u2014 {formatWindowDate(data.window_end)}
          </div>

          {/* Progress */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">
                {data.is_unlimited ? 'S\u0131n\u0131rs\u0131z' : `${data.used_hours} / ${data.limit_hours} saat`}
              </span>
              {!data.is_unlimited && (
                <span className="text-xs text-gray-500">
                  Kalan: <span className="font-semibold">{data.remaining_hours}</span> saat
                </span>
              )}
            </div>
            {!data.is_unlimited && (
              <Progress
                percent={Math.min(100, Math.round(ratio * 100))}
                strokeColor={progressColor}
                showInfo={false}
                size="small"
              />
            )}
            {data.is_over_limit && (
              <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle size={12} />
                Haftal\u0131k limit a\u015f\u0131ld\u0131!
              </div>
            )}
          </div>

          {/* Durum \u00f6zeti */}
          {summaryItems.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {summaryItems.map(item => {
                const cfg = STATUS_CONFIG[item.key];
                return (
                  <div key={item.key} className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 p-2.5">
                    <Tag color={cfg.color} className="m-0 text-[10px]">{cfg.label}</Tag>
                    <span className="text-sm font-semibold">{item.hours} sa</span>
                    <span className="text-[10px] text-gray-400">({item.count})</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detay tablosu */}
          <Table
            columns={columns}
            dataSource={(data.breakdown || []).map((b, i) => ({ ...b, key: i }))}
            pagination={false}
            size="small"
            scroll={{ y: 340 }}
            locale={{ emptyText: 'Bu hafta OT kayd\u0131 yok' }}
            className="mt-2"
          />
        </div>
      )}
    </Drawer>
  );
}
