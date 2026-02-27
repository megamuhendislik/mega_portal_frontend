import React, { useState, useMemo } from 'react';
import {
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    PlayIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }) => {
    const map = {
        HIGH: { bg: 'bg-red-100 text-red-800 border-red-200', label: 'Yuksek' },
        MEDIUM: { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Orta' },
        LOW: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Dusuk' },
    };
    const s = map[severity] || map.LOW;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg}`}>{s.label}</span>;
};

const FlagBadge = ({ flag }) => {
    const isHigh = flag.includes('GELECEK') || flag.includes('TEKRAR') || flag.includes('ASIRI');
    return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isHigh ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {flag}
        </span>
    );
};

const StatusPill = ({ status }) => {
    const map = {
        POTENTIAL: 'bg-slate-100 text-slate-600',
        PENDING: 'bg-amber-100 text-amber-800',
        APPROVED: 'bg-emerald-100 text-emerald-800',
        REJECTED: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-600',
        ASSIGNED: 'bg-blue-100 text-blue-800',
        CLAIMED: 'bg-indigo-100 text-indigo-800',
        EXPIRED: 'bg-gray-100 text-gray-500',
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
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[source] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {source === 'INTENDED' ? 'Planli' : source === 'MANUAL' ? 'Manuel' : 'Algilanan'}
        </span>
    );
};

const StatCard = ({ label, value, color, sub }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs font-medium mt-1">{label}</div>
        {sub && <div className="text-[10px] mt-0.5 opacity-70">{sub}</div>}
    </div>
);

// ─── Section Component ───────────────────────────────────────────────────────

const Section = ({ title, icon: Icon, count, expanded, onToggle, children, badge }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2.5">
                {Icon && <Icon className="w-5 h-5 text-indigo-500" />}
                <span className="text-sm font-bold text-gray-800">{title}</span>
                {count !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        {count}
                    </span>
                )}
                {badge}
            </div>
            {expanded ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
        </button>
        {expanded && <div className="px-5 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </div>
);

// ─── Data Table ──────────────────────────────────────────────────────────────

const DataTable = ({ columns, data, emptyText = 'Veri yok' }) => {
    if (!data || data.length === 0) {
        return <p className="text-sm text-gray-400 py-4 text-center">{emptyText}</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-200">
                        {columns.map((col, i) => (
                            <th key={i} className="text-left py-2 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={row.id || i} className={`border-b border-gray-50 hover:bg-gray-50/50 ${row.flags?.length > 0 ? 'bg-red-50/30' : ''}`}>
                            {columns.map((col, j) => (
                                <td key={j} className="py-2 px-2 text-gray-700 whitespace-nowrap">
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OvertimeAuditTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [purging, setPurging] = useState(null);

    // Section toggles
    const [showAnomalies, setShowAnomalies] = useState(true);
    const [showRequests, setShowRequests] = useState(false);
    const [showAssignments, setShowAssignments] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);

    // Filters
    const [reqFilter, setReqFilter] = useState({ status: 'ALL', source: 'ALL', flagsOnly: false, search: '' });
    const [assignFilter, setAssignFilter] = useState({ status: 'ALL', flagsOnly: false, search: '' });
    const [attFilter, setAttFilter] = useState({ flagsOnly: false, search: '' });

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/system/health-check/overtime-audit/');
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Denetim calistirilamadi');
        } finally {
            setLoading(false);
        }
    };

    const handlePurge = async (purgeType, pattern = null) => {
        if (!window.confirm(`Bu islemi geri alamazsiniz. ${purgeType} verilerini temizlemek istediginize emin misiniz?`)) return;
        setPurging(purgeType);
        try {
            const body = { purge_type: purgeType };
            if (pattern) body.pattern = pattern;
            const res = await api.post('/system/health-check/overtime-audit/purge/', body);
            alert(`${res.data.deleted_count} kayit temizlendi.`);
            runAudit(); // refresh
        } catch (err) {
            alert('Hata: ' + (err.response?.data?.error || err.message));
        } finally {
            setPurging(null);
        }
    };

    // Filtered data
    const filteredRequests = useMemo(() => {
        if (!data?.overtime_requests) return [];
        return data.overtime_requests.filter(r => {
            if (reqFilter.status !== 'ALL' && r.status !== reqFilter.status) return false;
            if (reqFilter.source !== 'ALL' && r.source !== reqFilter.source) return false;
            if (reqFilter.flagsOnly && (!r.flags || r.flags.length === 0)) return false;
            if (reqFilter.search) {
                const s = reqFilter.search.toLowerCase();
                if (!r.employee_name?.toLowerCase().includes(s) && !r.department?.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [data, reqFilter]);

    const filteredAssignments = useMemo(() => {
        if (!data?.overtime_assignments) return [];
        return data.overtime_assignments.filter(a => {
            if (assignFilter.status !== 'ALL' && a.status !== assignFilter.status) return false;
            if (assignFilter.flagsOnly && (!a.flags || a.flags.length === 0)) return false;
            if (assignFilter.search) {
                const s = assignFilter.search.toLowerCase();
                if (!a.employee_name?.toLowerCase().includes(s) && !a.department?.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [data, assignFilter]);

    const filteredAttendance = useMemo(() => {
        if (!data?.attendance_with_ot) return [];
        return data.attendance_with_ot.filter(a => {
            if (attFilter.flagsOnly && (!a.flags || a.flags.length === 0)) return false;
            if (attFilter.search) {
                const s = attFilter.search.toLowerCase();
                if (!a.employee_name?.toLowerCase().includes(s) && !a.department?.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [data, attFilter]);

    // Column definitions
    const reqColumns = [
        { header: 'Calisan', key: 'employee_name', render: r => <span className="font-bold text-gray-800">{r.employee_name}</span> },
        { header: 'Departman', key: 'department' },
        { header: 'Tarih', key: 'date', render: r => <span className="font-mono">{r.date}</span> },
        { header: 'Saat', render: r => r.start_time && r.end_time ? <span className="font-mono text-[10px]">{r.start_time?.slice(0,5)}—{r.end_time?.slice(0,5)}</span> : '—' },
        { header: 'Sure', render: r => <span className="font-bold">{r.hours}sa</span> },
        { header: 'Durum', render: r => <StatusPill status={r.status} /> },
        { header: 'Kaynak', render: r => <SourcePill source={r.source} /> },
        { header: 'Hedef Onay', key: 'target_approver', render: r => r.target_approver || '—' },
        { header: 'Olusturulma', key: 'created_at', render: r => <span className="font-mono text-[10px]">{r.created_at || '—'}</span> },
        { header: 'Flags', render: r => r.flags?.length > 0 ? <div className="flex flex-wrap gap-1">{r.flags.map((f,i) => <FlagBadge key={i} flag={f} />)}</div> : '—' },
    ];

    const assignColumns = [
        { header: 'Calisan', render: r => <span className="font-bold text-gray-800">{r.employee_name}</span> },
        { header: 'Departman', key: 'department' },
        { header: 'Tarih', render: r => <span className="font-mono">{r.date}</span> },
        { header: 'Maks Saat', render: r => <span className="font-bold">{r.max_hours}sa</span> },
        { header: 'Durum', render: r => <StatusPill status={r.status} /> },
        { header: 'Atayan', key: 'assigned_by' },
        { header: 'Talep Var', render: r => r.has_claim ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <XCircleIcon className="w-4 h-4 text-gray-300" /> },
        { header: 'Olusturulma', render: r => <span className="font-mono text-[10px]">{r.created_at || '—'}</span> },
        { header: 'Flags', render: r => r.flags?.length > 0 ? <div className="flex flex-wrap gap-1">{r.flags.map((f,i) => <FlagBadge key={i} flag={f} />)}</div> : '—' },
    ];

    const attColumns = [
        { header: 'Calisan', render: r => <span className="font-bold text-gray-800">{r.employee_name}</span> },
        { header: 'Departman', key: 'department' },
        { header: 'Tarih', render: r => <span className="font-mono">{r.date}</span> },
        { header: 'Giris', render: r => <span className="font-mono text-[10px]">{r.check_in?.slice(0,5) || '—'}</span> },
        { header: 'Cikis', render: r => <span className="font-mono text-[10px]">{r.check_out?.slice(0,5) || '—'}</span> },
        { header: 'Uzatma', render: r => <span className="font-bold">{r.ext_hours}sa</span> },
        { header: 'Ek Mesai', render: r => <span className="font-bold">{r.ot_hours}sa</span> },
        { header: 'Toplam OT', render: r => <span className="font-bold text-indigo-700">{r.total_ot_hours}sa</span> },
        { header: 'Durum', render: r => <StatusPill status={r.status} /> },
        { header: 'Flags', render: r => r.flags?.length > 0 ? <div className="flex flex-wrap gap-1">{r.flags.map((f,i) => <FlagBadge key={i} flag={f} />)}</div> : '—' },
    ];

    // Filter bar component
    const FilterBar = ({ filter, setFilter, statusOptions, sourceOptions }) => (
        <div className="flex flex-wrap gap-2 mb-3 items-center">
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Ara..."
                    value={filter.search}
                    onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 w-40"
                />
            </div>
            {statusOptions && (
                <select
                    value={filter.status}
                    onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                    <option value="ALL">Tum Durumlar</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            )}
            {sourceOptions && (
                <select
                    value={filter.source}
                    onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                    <option value="ALL">Tum Kaynaklar</option>
                    {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            )}
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 cursor-pointer">
                <input
                    type="checkbox"
                    checked={filter.flagsOnly}
                    onChange={e => setFilter(f => ({ ...f, flagsOnly: e.target.checked }))}
                    className="w-3.5 h-3.5 text-red-600 rounded"
                />
                Sadece Anormaliler
            </label>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-indigo-600" />
                            Mesai Veri Denetimi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Tum ek mesai talepleri, atamalari ve mesai kayitlarini tarar, anomalileri tespit eder.
                        </p>
                    </div>
                    <button
                        onClick={runAudit}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
                        {loading ? 'Taraniyor...' : 'Denetimi Baslat'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />{error}
                </div>
            )}

            {data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        <StatCard label="Ek Mesai Talepleri" value={data.summary.total_ot_requests} color="bg-blue-50 border-blue-100 text-blue-700" />
                        <StatCard label="Atamalar" value={data.summary.total_assignments} color="bg-indigo-50 border-indigo-100 text-indigo-700" />
                        <StatCard label="Mesai Kaydi (OT)" value={data.summary.total_attendance_ot} color="bg-purple-50 border-purple-100 text-purple-700" />
                        <StatCard
                            label="Gelecek Tarihli Talep"
                            value={data.summary.future_ot_requests}
                            color={data.summary.future_ot_requests > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}
                        />
                        <StatCard
                            label="Gelecek Tarihli Atama"
                            value={data.summary.future_assignments}
                            color={data.summary.future_assignments > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-100 text-green-700'}
                        />
                        <StatCard
                            label="Gelecek Mesai Kaydi"
                            value={data.summary.future_attendance_ot}
                            color={data.summary.future_attendance_ot > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}
                        />
                        <StatCard
                            label="Anomali Sayisi"
                            value={data.summary.anomaly_count}
                            color={data.summary.anomaly_count > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}
                        />
                    </div>

                    {/* Anomalies Section */}
                    <Section
                        title="Anomaliler"
                        icon={ExclamationTriangleIcon}
                        count={data.anomalies?.length || 0}
                        expanded={showAnomalies}
                        onToggle={() => setShowAnomalies(!showAnomalies)}
                        badge={data.anomalies?.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Dikkat</span>
                        ) : null}
                    >
                        {data.anomalies?.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-green-700 py-3">
                                <CheckCircleIcon className="w-5 h-5" /> Anomali bulunamadi — veriler temiz.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.anomalies.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <SeverityBadge severity={a.severity} />
                                            <span className="text-sm font-medium text-gray-800">{a.message}</span>
                                            <span className="text-xs text-gray-400">({a.count} kayit)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {a.type === 'FUTURE_OT_REQUESTS' && (
                                                <button
                                                    onClick={() => handlePurge('future_ot_requests')}
                                                    disabled={purging === 'future_ot_requests'}
                                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" /> Temizle
                                                </button>
                                            )}
                                            {a.type === 'FUTURE_ASSIGNMENTS' && (
                                                <button
                                                    onClick={() => handlePurge('future_assignments')}
                                                    disabled={purging === 'future_assignments'}
                                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" /> Temizle
                                                </button>
                                            )}
                                            {a.type === 'FUTURE_ATTENDANCE_OT' && (
                                                <button
                                                    onClick={() => handlePurge('future_attendance_ot')}
                                                    disabled={purging === 'future_attendance_ot'}
                                                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[11px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" /> Sifirla
                                                </button>
                                            )}
                                            {a.type === 'REPEATING_PATTERN' && (
                                                <button
                                                    onClick={() => handlePurge('pattern', a.pattern)}
                                                    disabled={purging === 'pattern'}
                                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" /> Pattern Temizle
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    {/* OT Requests Section */}
                    <Section
                        title="Ek Mesai Talepleri"
                        icon={ClockIcon}
                        count={filteredRequests.length}
                        expanded={showRequests}
                        onToggle={() => setShowRequests(!showRequests)}
                    >
                        <FilterBar
                            filter={reqFilter}
                            setFilter={setReqFilter}
                            statusOptions={['POTENTIAL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']}
                            sourceOptions={['INTENDED', 'MANUAL', 'POTENTIAL']}
                        />
                        <DataTable columns={reqColumns} data={filteredRequests} emptyText="Filtreye uyan talep yok" />
                        {filteredRequests.length > 100 && (
                            <p className="text-[10px] text-gray-400 mt-2 text-center">Ilk 100 kayit gosteriliyor (toplam: {filteredRequests.length})</p>
                        )}
                    </Section>

                    {/* Assignments Section */}
                    <Section
                        title="Ek Mesai Atamalari"
                        icon={ClockIcon}
                        count={filteredAssignments.length}
                        expanded={showAssignments}
                        onToggle={() => setShowAssignments(!showAssignments)}
                    >
                        <FilterBar
                            filter={assignFilter}
                            setFilter={setAssignFilter}
                            statusOptions={['ASSIGNED', 'CLAIMED', 'EXPIRED', 'CANCELLED']}
                        />
                        <DataTable columns={assignColumns} data={filteredAssignments} emptyText="Filtreye uyan atama yok" />
                    </Section>

                    {/* Attendance OT Section */}
                    <Section
                        title="Mesai Kayitlari (OT/Ext)"
                        icon={ClockIcon}
                        count={filteredAttendance.length}
                        expanded={showAttendance}
                        onToggle={() => setShowAttendance(!showAttendance)}
                    >
                        <FilterBar
                            filter={attFilter}
                            setFilter={setAttFilter}
                        />
                        <DataTable columns={attColumns} data={filteredAttendance} emptyText="Filtreye uyan mesai kaydi yok" />
                    </Section>

                    {/* Status Distribution */}
                    {data.summary.ot_by_status && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Durum Dagilimi</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Ek Mesai Talepleri</h4>
                                    <div className="space-y-1">
                                        {Object.entries(data.summary.ot_by_status).map(([k, v]) => (
                                            <div key={k} className="flex items-center justify-between text-xs">
                                                <StatusPill status={k} />
                                                <span className="font-bold text-gray-700">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Atamalar</h4>
                                    <div className="space-y-1">
                                        {Object.entries(data.summary.assign_by_status || {}).map(([k, v]) => (
                                            <div key={k} className="flex items-center justify-between text-xs">
                                                <StatusPill status={k} />
                                                <span className="font-bold text-gray-700">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {data.summary.suspicious_patterns && Object.keys(data.summary.suspicious_patterns).length > 0 && (
                                    <div className="col-span-2">
                                        <h4 className="text-[10px] font-bold text-red-500 uppercase mb-2">Suppheli Pattern'ler</h4>
                                        <div className="space-y-1">
                                            {Object.entries(data.summary.suspicious_patterns).map(([k, v]) => (
                                                <div key={k} className="flex items-center justify-between text-xs bg-red-50 rounded-lg px-3 py-1.5">
                                                    <span className="font-mono font-bold text-red-700">{k}</span>
                                                    <span className="font-bold text-red-600">{v}x tekrar</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {!data && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600">Denetim Baslatilmadi</h3>
                    <p className="text-xs text-gray-400 mt-1">"Denetimi Baslat" butonuna tiklayarak tum mesai verilerini tarayabilirsiniz.</p>
                </div>
            )}
        </div>
    );
}
