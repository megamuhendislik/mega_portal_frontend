import React, { useState, useEffect, useMemo } from 'react';
import { Table, DatePicker, Select, Input, Switch, Button, Tag, Spin, Empty, message } from 'antd';
import {
    ArrowPathIcon,
    ExclamationTriangleIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import dayjs from 'dayjs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ISSUE_CATEGORY_LABELS = {
    approval_mismatch: 'Onay Uyuşmazlığı',
    duration_mismatch: 'Süre Uyuşmazlığı',
    overlapping_ot: 'Çakışan Mesai',
    orphan_potential: 'Sahipsiz Potansiyel',
    source_mismatch: 'Kaynak Uyuşmazlığı',
};

const SEVERITY_COLORS = {
    HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800 border-red-200' },
    MEDIUM: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
    LOW: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

const SeverityBadge = ({ severity }) => {
    const labels = { HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük' };
    const s = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.badge}`}>{labels[severity] || severity}</span>;
};

const StatusPill = ({ status }) => {
    const map = {
        POTENTIAL: 'bg-slate-100 text-slate-600',
        PENDING: 'bg-amber-100 text-amber-800',
        APPROVED: 'bg-emerald-100 text-emerald-800',
        REJECTED: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-600',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
};

const SourcePill = ({ source }) => {
    const map = {
        INTENDED: 'bg-blue-50 text-blue-700 border-blue-200',
        MANUAL: 'bg-purple-50 text-purple-700 border-purple-200',
        POTENTIAL: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    const labels = { INTENDED: 'Planlı', MANUAL: 'Manuel', POTENTIAL: 'Algılanan' };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[source] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {labels[source] || source}
        </span>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OTEmployeeAnalysisTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);

    // Filters
    const [search, setSearch] = useState('');
    const [departmentId, setDepartmentId] = useState(null);
    const [issuesOnly, setIssuesOnly] = useState(false);
    const [dateRange, setDateRange] = useState(null);

    // Fetch departments on mount
    useEffect(() => {
        api.get('/departments/')
            .then(res => {
                const depts = res.data?.results || res.data || [];
                setDepartments(depts);
            })
            .catch(() => { /* silent */ });
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.start_date = dateRange[0].format('YYYY-MM-DD');
                params.end_date = dateRange[1].format('YYYY-MM-DD');
            }
            if (departmentId) {
                params.department_id = departmentId;
            }
            const res = await api.get('/system/health-check/ot-employee-analysis/', { params });
            setData(res.data);
        } catch (err) {
            message.error(err.response?.data?.error || 'Analiz verileri alınamadı');
        } finally {
            setLoading(false);
        }
    };

    // Filtered employees
    const filteredEmployees = useMemo(() => {
        if (!data?.employees) return [];
        return data.employees.filter(emp => {
            if (issuesOnly && emp.issue_count === 0) return false;
            if (search) {
                const s = search.toLowerCase();
                if (!emp.employee_name?.toLowerCase().includes(s) && !emp.employee_code?.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [data, search, issuesOnly]);

    // JSON export
    const handleExport = () => {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ot-analysis-${data.period?.start_date || 'unknown'}-${data.period?.end_date || 'unknown'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Request mini-table columns
    const requestColumns = [
        {
            title: 'Tarih',
            dataIndex: 'date',
            key: 'date',
            width: 100,
            render: v => <span className="font-mono text-xs">{v}</span>,
        },
        {
            title: 'Saat Aralığı',
            key: 'time_range',
            width: 120,
            render: (_, r) => (
                <span className="font-mono text-[10px]">
                    {r.start_time?.slice(0, 5) || '--:--'} - {r.end_time?.slice(0, 5) || '--:--'}
                </span>
            ),
        },
        {
            title: 'Süre',
            dataIndex: 'hours',
            key: 'hours',
            width: 70,
            render: v => <span className="font-bold text-xs">{v}sa</span>,
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: v => <StatusPill status={v} />,
        },
        {
            title: 'Kaynak',
            dataIndex: 'source',
            key: 'source',
            width: 100,
            render: v => <SourcePill source={v} />,
        },
        {
            title: 'Onaylayan',
            dataIndex: 'approval_manager',
            key: 'approval_manager',
            width: 120,
            render: v => v || '—',
        },
    ];

    // Main table columns
    const mainColumns = [
        {
            title: '#',
            key: 'index',
            width: 40,
            render: (_, __, idx) => <span className="text-xs text-gray-400">{idx + 1}</span>,
        },
        {
            title: 'Çalışan',
            key: 'employee',
            width: 180,
            render: (_, r) => (
                <div>
                    <div className="text-xs font-bold text-gray-800">{r.employee_name}</div>
                    <div className="text-[10px] text-gray-400">{r.employee_code}</div>
                </div>
            ),
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            key: 'department',
            width: 130,
            render: v => <span className="text-xs">{v || '—'}</span>,
        },
        {
            title: 'Potansiyel',
            key: 'potential',
            width: 100,
            render: (_, r) => (
                <span className="text-xs">
                    {r.ot_summary?.potential?.count || 0} / {(r.ot_summary?.potential?.hours || 0).toFixed(1)}sa
                </span>
            ),
        },
        {
            title: 'Bekleyen',
            key: 'pending',
            width: 100,
            render: (_, r) => (
                <span className="text-xs">
                    {r.ot_summary?.pending?.count || 0} / {(r.ot_summary?.pending?.hours || 0).toFixed(1)}sa
                </span>
            ),
        },
        {
            title: 'Onaylı',
            key: 'approved',
            width: 100,
            render: (_, r) => (
                <span className="text-xs font-bold text-emerald-700">
                    {r.ot_summary?.approved?.count || 0} / {(r.ot_summary?.approved?.hours || 0).toFixed(1)}sa
                </span>
            ),
        },
        {
            title: 'Reddedilen',
            key: 'rejected',
            width: 100,
            render: (_, r) => (
                <span className="text-xs text-red-600">
                    {r.ot_summary?.rejected?.count || 0} / {(r.ot_summary?.rejected?.hours || 0).toFixed(1)}sa
                </span>
            ),
        },
        {
            title: 'Att. OT',
            key: 'attendance_ot',
            width: 80,
            render: (_, r) => <span className="text-xs font-bold text-indigo-700">{(r.attendance_ot_hours || 0).toFixed(1)}sa</span>,
        },
        {
            title: 'Sorun',
            key: 'issues',
            width: 70,
            render: (_, r) => (
                r.issue_count > 0
                    ? <Tag color="red" className="text-[10px] font-bold">{r.issue_count}</Tag>
                    : <span className="text-xs text-gray-300">0</span>
            ),
        },
    ];

    // Expanded row renderer
    const expandedRowRender = (record) => (
        <div className="px-2 py-3 space-y-4">
            {/* Issues */}
            {record.issues && record.issues.length > 0 && (
                <div className="space-y-2 mb-4">
                    <h4 className="font-semibold text-sm text-red-700">Tutarsızlıklar ({record.issues.length})</h4>
                    {record.issues.map((issue, i) => {
                        const sev = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.LOW;
                        return (
                            <div key={i} className={`flex items-center gap-2 p-2 rounded ${sev.bg} border ${sev.border}`}>
                                <SeverityBadge severity={issue.severity} />
                                <span className="text-xs font-medium">{issue.date}</span>
                                <span className="text-xs text-gray-600">{issue.message}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* OT Requests mini table */}
            {record.requests && record.requests.length > 0 ? (
                <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">OT Talepleri ({record.requests.length})</h4>
                    <Table
                        size="small"
                        columns={requestColumns}
                        dataSource={record.requests.map((r, i) => ({ ...r, key: r.id || i }))}
                        pagination={false}
                        className="border border-gray-100 rounded-lg"
                    />
                </div>
            ) : (
                <p className="text-xs text-gray-400">Bu çalışan için OT talebi bulunamadı.</p>
            )}
        </div>
    );

    const summary = data?.summary;
    const period = data?.period;
    const issuesByCategory = summary?.issues_by_category || {};
    const hasIssues = summary?.employees_with_issues > 0;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-indigo-600" />
                            OT Çalışan Analizi
                        </h2>
                        {period && (
                            <p className="text-xs text-gray-500 mt-1">
                                Donem: {period.label || `${period.start_date} — ${period.end_date}`}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {loading && <Spin size="small" />}
                        <Button
                            type="primary"
                            onClick={fetchData}
                            disabled={loading}
                            icon={<ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                            className="flex items-center gap-1"
                        >
                            {loading ? 'Taranıyor...' : 'Yenile'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-xl border p-4 bg-slate-50 border-slate-200">
                        <div className="text-2xl font-bold text-slate-700">{summary.totals?.potential?.count || 0}</div>
                        <div className="text-xs font-medium text-slate-600">Potansiyel</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{(summary.totals?.potential?.hours || 0).toFixed(1)} saat</div>
                    </div>
                    <div className="rounded-xl border p-4 bg-amber-50 border-amber-200">
                        <div className="text-2xl font-bold text-amber-700">{summary.totals?.pending?.count || 0}</div>
                        <div className="text-xs font-medium text-amber-600">Bekleyen</div>
                        <div className="text-[10px] text-amber-500 mt-0.5">{(summary.totals?.pending?.hours || 0).toFixed(1)} saat</div>
                    </div>
                    <div className="rounded-xl border p-4 bg-emerald-50 border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-700">{summary.totals?.approved?.count || 0}</div>
                        <div className="text-xs font-medium text-emerald-600">Onaylı</div>
                        <div className="text-[10px] text-emerald-500 mt-0.5">{(summary.totals?.approved?.hours || 0).toFixed(1)} saat</div>
                    </div>
                    <div className="rounded-xl border p-4 bg-red-50 border-red-200">
                        <div className="text-2xl font-bold text-red-700">{summary.totals?.rejected?.count || 0}</div>
                        <div className="text-xs font-medium text-red-600">Reddedilen</div>
                        <div className="text-[10px] text-red-500 mt-0.5">{(summary.totals?.rejected?.hours || 0).toFixed(1)} saat</div>
                    </div>
                    <div className="rounded-xl border p-4 bg-gray-50 border-gray-200">
                        <div className="text-2xl font-bold text-gray-700">{summary.totals?.cancelled?.count || 0}</div>
                        <div className="text-xs font-medium text-gray-600">İptal</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{(summary.totals?.cancelled?.hours || 0).toFixed(1)} saat</div>
                    </div>
                    <div className={`rounded-xl border p-4 ${hasIssues ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div className={`text-2xl font-bold ${hasIssues ? 'text-red-700' : 'text-green-700'}`}>
                            {summary.employees_with_issues || 0}
                        </div>
                        <div className={`text-xs font-medium ${hasIssues ? 'text-red-600' : 'text-green-600'}`}>Tutarsızlık</div>
                        <div className={`text-[10px] mt-0.5 ${hasIssues ? 'text-red-500' : 'text-green-500'}`}>
                            / {summary.total_employees_scanned || 0} çalışan
                        </div>
                    </div>
                </div>
            )}

            {/* Issue Category Cards */}
            {hasIssues && Object.keys(issuesByCategory).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(ISSUE_CATEGORY_LABELS).map(([key, label]) => {
                        const count = issuesByCategory[key] || 0;
                        return (
                            <div key={key} className={`rounded-lg border p-3 text-center ${count > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                <div className={`text-lg font-bold ${count > 0 ? 'text-red-700' : 'text-gray-400'}`}>{count}</div>
                                <div className={`text-[10px] font-medium ${count > 0 ? 'text-red-600' : 'text-gray-400'}`}>{label}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Filter Bar */}
            {data && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <DatePicker.RangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            format="DD.MM.YYYY"
                            placeholder={['Başlangıç', 'Bitiş']}
                            size="small"
                            allowClear
                            className="min-w-[220px]"
                        />
                        <Select
                            value={departmentId}
                            onChange={setDepartmentId}
                            placeholder="Departman"
                            allowClear
                            size="small"
                            className="min-w-[160px]"
                            options={departments.map(d => ({ value: d.id, label: d.name }))}
                        />
                        <Button size="small" type="primary" onClick={fetchData} icon={<ArrowPathIcon className="w-3 h-3" />}>
                            Filtrele
                        </Button>
                        <div className="h-5 border-l border-gray-200" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Çalışan ara..."
                            prefix={<MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400" />}
                            size="small"
                            className="max-w-[180px]"
                            allowClear
                        />
                        <div className="flex items-center gap-1.5">
                            <Switch
                                checked={issuesOnly}
                                onChange={setIssuesOnly}
                                size="small"
                            />
                            <span className="text-xs font-medium text-gray-600">Sadece Hatalılar</span>
                        </div>
                        <div className="ml-auto">
                            <Button
                                size="small"
                                onClick={handleExport}
                                icon={<ArrowDownTrayIcon className="w-3.5 h-3.5" />}
                                className="flex items-center gap-1"
                            >
                                JSON İndir
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Table */}
            {data && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <Table
                        columns={mainColumns}
                        dataSource={filteredEmployees.map(e => ({ ...e, key: e.employee_id }))}
                        expandable={{
                            expandedRowRender,
                            rowExpandable: (record) => (record.issue_count > 0 || (record.requests && record.requests.length > 0)),
                        }}
                        pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50', '100'],
                            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} çalışan`,
                            size: 'small',
                        }}
                        size="small"
                        scroll={{ x: 900 }}
                        locale={{ emptyText: <Empty description="Çalışan bulunamadı" /> }}
                    />
                </div>
            )}

            {/* Empty state */}
            {!data && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <ExclamationTriangleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600">Analiz Yükleniyor</h3>
                    <p className="text-xs text-gray-400 mt-1">"Yenile" butonuyla analizi tekrar başlatabilirsiniz.</p>
                </div>
            )}
        </div>
    );
}
