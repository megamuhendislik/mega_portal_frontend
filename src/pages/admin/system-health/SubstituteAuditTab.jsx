import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheckIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
    WrenchScrewdriverIcon,
    ClockIcon,
    UserGroupIcon,
    TrashIcon,
    ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { Select, message, Modal, Tooltip } from 'antd';
import api from '../../../services/api';

const { Option } = Select;

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
    orphan_delegation: 'Sahipsiz Vekalet',
    empty_scope: 'Kapsamsiz Vekalet',
    expired_active: 'Suresi Dolmus Aktif',
    overlapping: 'Cakisan Vekaletler',
    non_team_employee: 'Ekip Disi Calisan',
    missing_manager_relation: 'Eksik Yonetici Iliskisi',
    circular_delegation: 'Dongusel Vekalet',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

const SEVERITY_COLORS = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-green-100 text-green-800 border-green-200',
};

const SEVERITY_LABELS = {
    HIGH: 'Yuksek',
    MEDIUM: 'Orta',
    LOW: 'Dusuk',
};

const STATUS_CONFIG = {
    active: { label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-200' },
    inactive: { label: 'Pasif', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    expired: { label: 'Suresi Dolmus', color: 'bg-red-100 text-red-700 border-red-200' },
    upcoming: { label: 'Gelecek', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }) => {
    const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
    const label = SEVERITY_LABELS[severity] || severity;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors}`}>
            {label}
        </span>
    );
};

const StatCard = ({ label, value, color, icon: Icon }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
        <div className="flex items-center justify-between">
            <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs font-medium mt-1">{label}</div>
            </div>
            {Icon && <Icon className="w-8 h-8 opacity-30" />}
        </div>
    </div>
);

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}>
            {config.label}
        </span>
    );
};

const ActionBadge = ({ fixAction, fixable, mode }) => {
    if (mode === 'fix' && fixable) {
        return (
            <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                    Duzeltildi
                </span>
                {fixAction && (
                    <div className="text-[10px] text-green-600 mt-0.5">{fixAction}</div>
                )}
            </div>
        );
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            fixable
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
            {fixable ? 'Duzelt. (fix mod)' : 'Manuel Inceleme'}
        </span>
    );
};

// ─── Category Card ──────────────────────────────────────────────────────────

const CategoryCard = ({ categoryKey, categoryData, auditMode, onFixCategory, fixLoading }) => {
    const [expanded, setExpanded] = useState(false);
    const label = CATEGORY_LABELS[categoryKey] || categoryKey;
    const { severity, count, fixed, issues } = categoryData;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <SeverityBadge severity={severity} />
                    <span className="text-sm font-bold text-gray-800">{label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        {count} sorun
                    </span>
                    {fixed > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                            {fixed} duzeltildi
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                )}
            </button>
            {expanded && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                    {categoryData?.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-700">
                            <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                            Hata: {categoryData.error}
                        </div>
                    )}
                    {issues && issues.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-8">
                                            #
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                            Ilgili
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{ minWidth: '320px' }}>
                                            Sorun Detayi
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{ minWidth: '140px' }}>
                                            Duzeltme
                                        </th>
                                        <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-16">
                                            Kayit ID
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issues.map((issue, idx) => (
                                        <tr
                                            key={idx}
                                            className={`border-b border-gray-100 hover:bg-blue-50/30 ${
                                                issue.fixable === false ? 'bg-amber-50/20' : ''
                                            }`}
                                        >
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">
                                                {idx + 1}
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">
                                                <div className="font-bold text-gray-800 text-xs">
                                                    {issue.principal_name || issue.employee_name || '-'}
                                                </div>
                                                {issue.substitute_name && (
                                                    <div className="text-[10px] text-gray-400">
                                                        Vekil: {issue.substitute_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700">
                                                <div className="text-xs leading-relaxed">
                                                    {issue.description || issue.detail || '-'}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <ActionBadge
                                                    fixAction={issue.fix_action}
                                                    fixable={issue.fixable}
                                                    mode={auditMode}
                                                />
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-400 font-mono text-[10px]">
                                                {issue.id || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 py-4 text-center">Bu kategoride sorun yok.</p>
                    )}
                    {auditMode !== 'fix' && categoryData.issues?.some(i => i.fixable) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => onFixCategory?.(categoryKey)}
                                disabled={fixLoading}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                            >
                                {fixLoading ? (
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                                )}
                                Bu Kategoriyi Duzelt
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SubstituteAuditTab() {
    // Delegation list state
    const [delegations, setDelegations] = useState([]);
    const [stats, setStats] = useState({ active: 0, expiring_soon: 0, expired: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchText, setSearchText] = useState('');

    // Audit state
    const [auditResults, setAuditResults] = useState(null);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditMode, setAuditMode] = useState('scan');
    const [fixLoading, setFixLoading] = useState(false);

    // ─── Fetch Delegations ──────────────────────────────────────────────────

    const fetchDelegations = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (searchText) params.search = searchText;
            const res = await api.get('/system/health-check/substitute-delegations/', { params });
            setDelegations(res.data.delegations || []);
            setStats(res.data.stats || { active: 0, expiring_soon: 0, expired: 0, total: 0 });
        } catch {
            message.error('Vekaletler yuklenemedi');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchText]);

    useEffect(() => {
        fetchDelegations();
    }, [fetchDelegations]);

    // ─── Audit Actions ──────────────────────────────────────────────────────

    const runAudit = useCallback(async (mode = 'scan', categories = null) => {
        setAuditLoading(true);
        try {
            const body = { mode };
            if (categories) body.categories = categories;
            const res = await api.post('/system/health-check/substitute-audit/', body);
            setAuditResults(res.data);
            setAuditMode(mode);
            if (mode === 'fix') {
                message.success(`${res.data.summary?.total_fixed || 0} sorun duzeltildi`);
                fetchDelegations();
            }
        } catch {
            message.error('Denetim basarisiz');
        } finally {
            setAuditLoading(false);
        }
    }, [fetchDelegations]);

    const fixCategory = useCallback((catKey) => {
        Modal.confirm({
            title: 'Duzeltme Onayi',
            content: `"${CATEGORY_LABELS[catKey]}" kategorisindeki sorunlar otomatik duzeltilecek. Devam?`,
            okText: 'Duzelt',
            cancelText: 'Iptal',
            onOk: async () => {
                setFixLoading(true);
                try {
                    await runAudit('fix', [catKey]);
                    await runAudit('scan'); // re-scan
                } finally {
                    setFixLoading(false);
                }
            },
        });
    }, [runAudit]);

    // ─── Delegation Actions ─────────────────────────────────────────────────

    const toggleDelegation = useCallback(async (id, currentActive) => {
        try {
            await api.patch(`/substitute-authority/${id}/`, { is_active: !currentActive });
            message.success(currentActive ? 'Vekalet pasif edildi' : 'Vekalet aktif edildi');
            fetchDelegations();
        } catch {
            message.error('Islem basarisiz');
        }
    }, [fetchDelegations]);

    const deleteDelegation = useCallback((id) => {
        Modal.confirm({
            title: 'Silme Onayi',
            content: 'Bu vekalet kaydi kalici olarak silinecek. Devam?',
            okText: 'Sil',
            okType: 'danger',
            cancelText: 'Iptal',
            onOk: async () => {
                try {
                    await api.delete(`/substitute-authority/${id}/`);
                    message.success('Vekalet silindi');
                    fetchDelegations();
                } catch {
                    message.error('Silme basarisiz');
                }
            },
        });
    }, [fetchDelegations]);

    // ─── Derived Data ───────────────────────────────────────────────────────

    const categoriesWithIssues = auditResults
        ? Object.entries(auditResults.categories || {}).filter(([, cat]) => cat.count > 0)
        : [];

    const categoriesClean = auditResults
        ? Object.entries(auditResults.categories || {}).filter(([, cat]) => cat.count === 0)
        : [];

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* ── Section 1: Header + Stat Cards ─────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ArrowsRightLeftIcon className="w-5 h-5 text-indigo-600" />
                            Vekalet Denetimi
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Vekalet kayitlarini yonetin, anomalileri tespit edin ve otomatik duzeltme yapin.
                        </p>
                    </div>
                    <button
                        onClick={fetchDelegations}
                        disabled={loading}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                        label="Aktif Vekaletler"
                        value={stats.active}
                        color="bg-green-50 border-green-200 text-green-800"
                        icon={UserGroupIcon}
                    />
                    <StatCard
                        label="Yakinda Dolacak"
                        value={stats.expiring_soon}
                        color="bg-amber-50 border-amber-200 text-amber-800"
                        icon={ClockIcon}
                    />
                    <StatCard
                        label="Suresi Dolmus"
                        value={stats.expired}
                        color="bg-gray-50 border-gray-200 text-gray-600"
                        icon={ExclamationTriangleIcon}
                    />
                    <StatCard
                        label="Toplam"
                        value={stats.total}
                        color="bg-blue-50 border-blue-200 text-blue-800"
                        icon={ShieldCheckIcon}
                    />
                </div>
            </div>

            {/* ── Section 2: Delegation List + Filters ───────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-indigo-600" />
                    Vekalet Listesi
                </h3>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3 mb-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Durum</label>
                        <Select
                            value={statusFilter || undefined}
                            onChange={(val) => setStatusFilter(val || '')}
                            allowClear
                            placeholder="Tumu"
                            className="w-40"
                            size="small"
                        >
                            <Option value="active">Aktif</Option>
                            <Option value="inactive">Pasif</Option>
                            <Option value="expired">Suresi Dolmus</Option>
                            <Option value="upcoming">Gelecek</Option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Arama</label>
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Isim ile ara..."
                                className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm w-48"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <ArrowPathIcon className="w-6 h-6 text-indigo-400 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Yukleniyor...</span>
                    </div>
                ) : delegations.length === 0 ? (
                    <div className="text-center py-8">
                        <UserGroupIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Vekalet kaydi bulunamadi.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50">
                                    <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                        Durum
                                    </th>
                                    <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                        Asil (Principal)
                                    </th>
                                    <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                        Vekil
                                    </th>
                                    <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px]" style={{ minWidth: '180px' }}>
                                        Kapsam
                                    </th>
                                    <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                                        Tarih Araligi
                                    </th>
                                    <th className="text-left py-2.5 px-2 font-bold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap w-24">
                                        Islemler
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {delegations.map((d) => {
                                    const scopeNames = d.delegated_employee_names || [];
                                    const showMax = 3;
                                    const overflow = scopeNames.length - showMax;

                                    return (
                                        <tr key={d.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                                            <td className="py-2.5 px-2">
                                                <StatusBadge status={d.status || (d.is_active ? 'active' : 'inactive')} />
                                            </td>
                                            <td className="py-2.5 px-2 whitespace-nowrap">
                                                <div className="font-bold text-gray-800 text-xs">{d.principal_name}</div>
                                                {d.principal_position && (
                                                    <div className="text-[10px] text-gray-400">{d.principal_position}</div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2 whitespace-nowrap">
                                                <div className="font-bold text-gray-800 text-xs">{d.substitute_name}</div>
                                                {d.substitute_position && (
                                                    <div className="text-[10px] text-gray-400">{d.substitute_position}</div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {scopeNames.slice(0, showMax).map((name, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100"
                                                        >
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {overflow > 0 && (
                                                        <Tooltip title={scopeNames.slice(showMax).join(', ')}>
                                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium border border-gray-200 cursor-help">
                                                                +{overflow}
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    {scopeNames.length === 0 && (
                                                        <span className="text-[10px] text-gray-400 italic">Kapsam yok</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-2 whitespace-nowrap">
                                                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {d.start_date || '-'} ~ {d.end_date || '-'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Tooltip title={d.is_active ? 'Pasif Yap' : 'Aktif Yap'}>
                                                        <button
                                                            onClick={() => toggleDelegation(d.id, d.is_active)}
                                                            className={`p-1.5 rounded-lg transition-colors ${
                                                                d.is_active
                                                                    ? 'hover:bg-amber-100 text-amber-600'
                                                                    : 'hover:bg-green-100 text-green-600'
                                                            }`}
                                                        >
                                                            <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip title="Sil">
                                                        <button
                                                            onClick={() => deleteDelegation(d.id)}
                                                            className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Section 3: Anomaly Audit ───────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheckIcon className="w-4 h-4 text-indigo-600" />
                            Anomali Taramasi
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            7 kategori: sahipsiz, kapsamsiz, suresi dolmus, cakisan, ekip disi, eksik iliski, dongusel.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => runAudit('scan')}
                            disabled={auditLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {auditLoading ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            )}
                            {auditLoading ? 'Taraniyor...' : 'Tarama Baslat'}
                        </button>
                    </div>
                </div>

                {/* Audit Summary */}
                {auditResults?.summary && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <div className="text-lg font-bold text-red-800">{auditResults.summary.total_issues}</div>
                            <div className="text-[10px] font-medium text-red-600">Toplam Sorun</div>
                        </div>
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                            <div className="text-lg font-bold text-green-800">{auditResults.summary.total_fixed}</div>
                            <div className="text-[10px] font-medium text-green-600">Duzeltilen</div>
                        </div>
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <div className="text-lg font-bold text-blue-800">
                                {auditResults.summary.duration_seconds != null
                                    ? `${auditResults.summary.duration_seconds.toFixed(1)}s`
                                    : '-'}
                            </div>
                            <div className="text-[10px] font-medium text-blue-600">Sure</div>
                        </div>
                    </div>
                )}

                {/* Category Accordions */}
                {auditResults && (
                    <div className="space-y-2">
                        {/* Categories with issues */}
                        {categoriesWithIssues.length > 0 && (
                            <div className="space-y-2">
                                {categoriesWithIssues.map(([key, data]) => (
                                    <CategoryCard
                                        key={key}
                                        categoryKey={key}
                                        categoryData={data}
                                        auditMode={auditMode}
                                        onFixCategory={fixCategory}
                                        fixLoading={fixLoading}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Clean categories */}
                        {categoriesClean.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs text-gray-500 mb-2 font-medium">
                                    Sorun Bulunmayan Kategoriler ({categoriesClean.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {categoriesClean.map(([key]) => (
                                        <span
                                            key={key}
                                            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1"
                                        >
                                            <CheckCircleIcon className="w-3 h-3" />
                                            {CATEGORY_LABELS[key] || key}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All clean */}
                        {categoriesWithIssues.length === 0 && categoriesClean.length > 0 && (
                            <div className="text-center py-6">
                                <CheckCircleIcon className="w-10 h-10 text-green-400 mx-auto mb-2" />
                                <p className="text-sm font-bold text-green-700">Tum kategoriler temiz!</p>
                                <p className="text-xs text-gray-500 mt-1">Hicbir anomali tespit edilmedi.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* No results yet */}
                {!auditResults && !auditLoading && (
                    <div className="text-center py-8">
                        <ShieldCheckIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Tarama baslatmak icin butona tiklayin.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
