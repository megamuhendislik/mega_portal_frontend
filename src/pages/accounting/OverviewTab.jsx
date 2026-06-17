import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Empty, message } from 'antd';
import { Users, CalendarDays, Clock, Building2 } from 'lucide-react';
import api from '../../services/api';
import { RosterStatusTag } from './accountingTags';
import { fmtHours } from './accountingFormat';

const StatCard = ({ icon: Icon, label, value, accent }) => (
    <div className="stat-card flex items-center justify-between p-4">
        <div>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon size={22} />
        </div>
    </div>
);

/**
 * Genel Bakış sekmesi — /accounting/roster/
 * Props:
 *   - params: dönem parametreleri
 *   - ready: parametreler hazır mı
 *   - search: global arama metni (server'a q olarak gider + client filtre)
 *   - active: sekme aktif mi (lazy fetch)
 *   - onSelectEmployee(employeeId): satır tıklaması -> kişi drawer'ı
 */
export default function OverviewTab({ params, ready, search, active, onSelectEmployee }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const fetchRoster = useCallback(async () => {
        if (!ready) return;
        setLoading(true);
        try {
            const res = await api.get('/accounting/roster/', {
                params: { ...params, q: search || undefined, include_inactive: true },
            });
            setRows(res.data.results || []);
            setLoaded(true);
        } catch (err) {
            console.error('Roster yüklenemedi:', err);
            message.error('Çalışan listesi yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [params, ready, search]);

    // Aktif olduğunda + parametre/arama değişiminde çek
    useEffect(() => {
        if (active && ready) fetchRoster();
    }, [active, ready, fetchRoster]);

    // Client-side arama (server q'ya ek hızlı süzme)
    const filtered = useMemo(() => {
        const q = (search || '').trim().toLocaleLowerCase('tr');
        if (!q) return rows;
        return rows.filter((r) =>
            `${r.name || ''} ${r.employee_code || ''} ${r.department || ''}`
                .toLocaleLowerCase('tr')
                .includes(q)
        );
    }, [rows, search]);

    const stats = useMemo(() => ({
        total: filtered.length,
        leaveDays: filtered.reduce((s, r) => s + (Number(r.leave_days) || 0), 0),
        otHours: filtered.reduce((s, r) => s + (Number(r.ot_hours) || 0), 0),
        inside: filtered.filter((r) => r.status === 'INSIDE').length,
    }), [filtered]);

    const columns = [
        {
            title: 'Çalışan',
            key: 'name',
            ellipsis: true,
            render: (_, r) => (
                <button
                    onClick={() => onSelectEmployee?.(r.employee_id)}
                    className="text-left text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                    {r.name}
                    {r.employee_code ? (
                        <span className="text-slate-400 font-normal"> · {r.employee_code}</span>
                    ) : null}
                </button>
            ),
            sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'tr'),
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            key: 'department',
            ellipsis: true,
            render: (v) => v || '—',
        },
        {
            title: 'Görev',
            dataIndex: 'job_title',
            key: 'job_title',
            ellipsis: true,
            responsive: ['lg'],
            render: (v) => v || '—',
        },
        {
            title: 'İzin (gün)',
            dataIndex: 'leave_days',
            key: 'leave_days',
            width: 110,
            align: 'right',
            render: (v) => (Number(v) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 }),
            sorter: (a, b) => (Number(a.leave_days) || 0) - (Number(b.leave_days) || 0),
        },
        {
            title: 'OT (saat)',
            dataIndex: 'ot_hours',
            key: 'ot_hours',
            width: 110,
            align: 'right',
            render: (v) => fmtHours(v),
            sorter: (a, b) => (Number(a.ot_hours) || 0) - (Number(b.ot_hours) || 0),
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center',
            render: (v) => <RosterStatusTag status={v} />,
            filters: [
                { text: 'Ofiste', value: 'INSIDE' },
                { text: 'Dışarıda', value: 'OUTSIDE' },
                { text: 'İzinde', value: 'ON_LEAVE' },
            ],
            onFilter: (value, record) => record.status === value,
        },
    ];

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Özet kartlar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Toplam Çalışan" value={stats.total} accent="bg-blue-50 text-blue-500" />
                <StatCard icon={CalendarDays} label="Dönem İzin Günü" value={stats.leaveDays.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} accent="bg-purple-50 text-purple-500" />
                <StatCard icon={Clock} label="Onaylı OT Saati" value={fmtHours(stats.otHours)} accent="bg-amber-50 text-amber-500" />
                <StatCard icon={Building2} label="Ofiste" value={stats.inside} accent="bg-emerald-50 text-emerald-500" />
            </div>

            <div className="glass-card p-0 overflow-hidden">
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="employee_id"
                    loading={loading}
                    size="middle"
                    scroll={{ x: 720 }}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        pageSizeOptions: ['20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} çalışan`,
                    }}
                    locale={{
                        emptyText: (
                            <Empty
                                description={loaded ? 'Kayıt bulunamadı' : 'Yükleniyor…'}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ),
                    }}
                />
            </div>
        </div>
    );
}
