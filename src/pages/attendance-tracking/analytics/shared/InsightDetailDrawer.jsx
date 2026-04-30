import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, Tag, Table, Empty, Button } from 'antd';
import {
    Sparkles, TrendingUp, TrendingDown, AlertTriangle, AlertCircle,
    CheckCircle2, Calendar, Hourglass, Lightbulb, ArrowRight, ArrowUpRight,
    Users, FileText, Loader2, Building2, ListChecks, Brain, Trophy,
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import ChartTooltip from './ChartTooltip';

/**
 * InsightDetailDrawer — Otomatik İçgörü detay paneli.
 *
 * Backend: GET /api/attendance-analytics/insight-detail/?code=<INSIGHT_CODE>
 * Drawer içeriği insight code'a göre dinamik render edilir.
 */

const ICON_MAP = {
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    'alert-triangle': AlertTriangle,
    'alert-circle': AlertCircle,
    'check-circle': CheckCircle2,
    'calendar': Calendar,
    'hourglass': Hourglass,
    'lightbulb': Lightbulb,
};

const SEVERITY_CFG = {
    alert: {
        bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-200',
        icon: 'text-red-600', title: 'text-red-800', text: 'text-red-700',
        tag: 'red', label: 'Aksiyon Gerekli',
        accent: 'bg-red-100', accentText: 'text-red-700',
        gradFrom: 'from-red-50/60', gradTo: 'to-rose-50/30',
    },
    warning: {
        bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-200',
        icon: 'text-amber-600', title: 'text-amber-800', text: 'text-amber-700',
        tag: 'gold', label: 'Uyarı',
        accent: 'bg-amber-100', accentText: 'text-amber-700',
        gradFrom: 'from-amber-50/60', gradTo: 'to-orange-50/30',
    },
    info: {
        bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-200',
        icon: 'text-blue-600', title: 'text-blue-800', text: 'text-blue-700',
        tag: 'blue', label: 'Bilgi',
        accent: 'bg-blue-100', accentText: 'text-blue-700',
        gradFrom: 'from-blue-50/60', gradTo: 'to-indigo-50/30',
    },
    positive: {
        bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-200',
        icon: 'text-emerald-600', title: 'text-emerald-800', text: 'text-emerald-700',
        tag: 'green', label: 'Pozitif',
        accent: 'bg-emerald-100', accentText: 'text-emerald-700',
        gradFrom: 'from-emerald-50/60', gradTo: 'to-teal-50/30',
    },
};

function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
];
function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < String(name || '').length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Evidence Section'lar ───────────────────────────────────────────────

function OTTrendChart({ evidence }) {
    const data = useMemo(() => {
        const breakdown = evidence?.monthly_breakdown || [];
        return breakdown.map((b) => ({
            label: b.period === 'previous' ? 'Önceki Dönem' : 'Mevcut Dönem',
            hours: b.hours || 0,
        }));
    }, [evidence]);

    if (data.length === 0) return null;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={13} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                    Aylık Fazla Mesai Karşılaştırma
                </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip unit="sa" />} />
                    <Line
                        type="monotone"
                        dataKey="hours"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', r: 5 }}
                        name="Fazla Mesai Saati"
                    />
                </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Önceki</p>
                    <p className="text-base font-black tabular-nums text-slate-800">
                        {evidence?.prev_total_hours ?? 0}<span className="text-[10px] text-slate-400 ml-0.5">sa</span>
                    </p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2 text-center">
                    <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">Mevcut</p>
                    <p className="text-base font-black tabular-nums text-indigo-800">
                        {evidence?.curr_total_hours ?? 0}<span className="text-[10px] text-indigo-400 ml-0.5">sa</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

function OTDowChart({ evidence }) {
    const data = useMemo(
        () => (evidence?.dow_distribution || []).map((d) => ({ day: d.day, hours: d.hours })),
        [evidence],
    );
    if (data.length === 0) return null;
    const heaviest = evidence?.heaviest_day;
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                        Gün Bazlı Fazla Mesai Dağılımı
                    </span>
                </div>
                {heaviest && (
                    <Tag color="orange" className="!m-0 text-[10px]">
                        En yoğun: {heaviest}
                    </Tag>
                )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip unit="sa" />} cursor={{ fill: 'rgba(245,158,11,0.08)' }} />
                    <Bar dataKey="hours" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Fazla Mesai Saati" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function AbsenceChart({ evidence }) {
    const data = useMemo(() => ([
        { label: 'Önceki Dönem', count: evidence?.previous_absences ?? 0 },
        { label: 'Mevcut Dönem', count: evidence?.current_absences ?? 0 },
    ]), [evidence]);
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-3">
                <AlertTriangle size={13} className="text-rose-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                    Devamsızlık Karşılaştırma
                </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip content={<ChartTooltip unit="gün" />} cursor={{ fill: 'rgba(244,63,94,0.08)' }} />
                    <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Devamsız Gün" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function PendingList({ evidence }) {
    const items = evidence?.pending_items || [];
    const navigate = useNavigate();
    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <Empty description="Bekleyen talep yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <Hourglass size={13} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                        Bekleyen Talepler ({items.length})
                    </span>
                </div>
                <Button
                    type="link"
                    size="small"
                    icon={<ArrowUpRight size={12} />}
                    onClick={() => navigate('/team-analytics?tab=sla')}
                    className="!text-[11px] !p-0"
                >
                    SLA Sekmesi
                </Button>
            </div>
            <div className="max-h-72 overflow-auto -mx-4 px-4 space-y-1.5">
                {items.slice(0, 30).map((item) => {
                    const ageColor = item.age_hours >= 168 ? 'text-red-700 bg-red-50'
                        : item.age_hours >= 72 ? 'text-amber-700 bg-amber-50'
                            : 'text-slate-700 bg-slate-50';
                    const typeLabel = item.type === 'LEAVE' ? 'İzin' : item.type === 'OVERTIME' ? 'Mesai' : item.type;
                    const typeColor = item.type === 'LEAVE' ? 'blue' : 'gold';
                    return (
                        <div
                            key={item.request_id}
                            className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
                        >
                            <Tag color={typeColor} className="!m-0 text-[10px] flex-shrink-0">
                                {typeLabel}
                            </Tag>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold text-slate-700 truncate">
                                    {item.employee_name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                    {item.department || '—'}
                                </p>
                            </div>
                            <div className={`text-[10px] font-bold tabular-nums px-2 py-1 rounded ${ageColor}`}>
                                {item.age_hours >= 24
                                    ? `${Math.round(item.age_hours / 24)}g`
                                    : `${Math.round(item.age_hours)}sa`}
                            </div>
                        </div>
                    );
                })}
            </div>
            {items.length > 30 && (
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                    +{items.length - 30} talep daha — SLA sekmesinden görüntüleyebilirsiniz
                </p>
            )}
        </div>
    );
}

function DeptComparisonChart({ evidence }) {
    const data = useMemo(() => {
        const comps = evidence?.department_comparisons || [];
        return comps.slice(0, 10).map((c) => ({
            department: c.department,
            'Önceki': c.prev_avg_hours,
            'Mevcut': c.curr_avg_hours,
            pct: c.pct_change,
        }));
    }, [evidence]);
    if (data.length === 0) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-rose-600" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                        Departman Performans Karşılaştırma
                    </span>
                </div>
                {evidence?.worst_department && (
                    <Tag color="red" className="!m-0 text-[10px]">
                        En çok düşen: {evidence.worst_department}
                    </Tag>
                )}
            </div>
            <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="department" stroke="#64748b" tick={{ fontSize: 11 }} width={120} />
                    <RTooltip content={<ChartTooltip unit="sa" />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    <Bar dataKey="Önceki" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={10} />
                    <Bar dataKey="Mevcut" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-400" /> Önceki ort. saat</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500" /> Mevcut ort. saat</span>
            </div>
        </div>
    );
}

function HighAttendancePanel({ evidence }) {
    const pct = evidence?.attendance_pct ?? 0;
    return (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-5 text-center">
            <div className="inline-flex p-3 rounded-full bg-emerald-100 mb-3">
                <Trophy size={22} className="text-emerald-600" />
            </div>
            <h3 className="text-base font-black text-emerald-800 mb-1">Tebrikler!</h3>
            <p className="text-sm text-emerald-700 mb-3">
                Ekibinizin devam oranı oldukça yüksek.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-lg bg-white/70 p-2.5">
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Devam Oranı</p>
                    <p className="text-xl font-black tabular-nums text-emerald-800">%{pct}</p>
                </div>
                <div className="rounded-lg bg-white/70 p-2.5">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Toplam Çalışan</p>
                    <p className="text-xl font-black tabular-nums text-slate-800">{evidence?.total_employees ?? 0}</p>
                </div>
                <div className="rounded-lg bg-white/70 p-2.5">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Devam Eden</p>
                    <p className="text-xl font-black tabular-nums text-slate-800">{evidence?.attended_employees ?? 0}</p>
                </div>
            </div>
        </div>
    );
}

function EvidenceSection({ code, evidence }) {
    if (!evidence || Object.keys(evidence).length === 0) return null;
    if (code === 'OT_TREND_UP' || code === 'OT_TREND_DOWN') {
        return <OTTrendChart evidence={evidence} />;
    }
    if (code === 'OT_DOW_HEAVY') {
        return <OTDowChart evidence={evidence} />;
    }
    if (code === 'ABSENCE_UP' || code === 'ABSENCE_DOWN') {
        return <AbsenceChart evidence={evidence} />;
    }
    if (code === 'PENDING_OLD') {
        return <PendingList evidence={evidence} />;
    }
    if (code === 'DEPT_PERFORMANCE_DROP') {
        return <DeptComparisonChart evidence={evidence} />;
    }
    if (code === 'HIGH_ATTENDANCE') {
        return <HighAttendancePanel evidence={evidence} />;
    }
    return null;
}

// ─── Affected Employees Table ───────────────────────────────────────────

function AffectedEmployeesTable({ rows, code }) {
    const valueLabel = useMemo(() => {
        if (code === 'OT_TREND_UP' || code === 'OT_TREND_DOWN' || code === 'OT_DOW_HEAVY') return 'Fazla Mesai (sa)';
        if (code === 'ABSENCE_UP' || code === 'ABSENCE_DOWN') return 'Gün';
        if (code === 'PENDING_OLD') return 'Bekleme (sa)';
        return 'Değer';
    }, [code]);

    if (!rows || rows.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center">
                <Users size={22} className="mx-auto mb-2 text-slate-300" />
                <p className="text-[12px] font-semibold text-slate-600">
                    Genel ekip içgörüsü
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                    Belirli bir kişi listesi yok — tüm ekip için geçerli.
                </p>
            </div>
        );
    }

    const columns = [
        {
            title: 'Çalışan',
            dataIndex: 'name',
            sorter: (a, b) => String(a.name).localeCompare(String(b.name), 'tr'),
            render: (v) => (
                <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm flex-shrink-0 ${avatarColor(v)}`}>
                        {initials(v)}
                    </div>
                    <span className="font-semibold text-slate-700 text-[12px]">{v}</span>
                </div>
            ),
        },
        {
            title: 'Departman',
            dataIndex: 'department',
            sorter: (a, b) => String(a.department || '').localeCompare(String(b.department || ''), 'tr'),
            render: (v) => <span className="text-slate-500 text-[11px]">{v || '—'}</span>,
        },
        {
            title: <span className="text-[11px] font-semibold">{valueLabel}</span>,
            dataIndex: 'value',
            align: 'right',
            sorter: (a, b) => (a.value ?? 0) - (b.value ?? 0),
            defaultSortOrder: 'descend',
            render: (v) => (
                v == null
                    ? <span className="text-slate-300 text-[11px]">—</span>
                    : <span className="font-bold tabular-nums text-slate-800 text-[12px]">{v}</span>
            ),
        },
        {
            title: 'Bağlam',
            dataIndex: 'context',
            render: (v) => <span className="text-[11px] text-slate-500">{v || '—'}</span>,
        },
    ];

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/60">
                <Users size={12} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                    Etkilenen Kişiler ({rows.length})
                </span>
            </div>
            <Table
                columns={columns}
                dataSource={rows}
                rowKey={(r) => `${r.employee_id}-${r.context || ''}`}
                pagination={rows.length > 10 ? { pageSize: 10, size: 'small' } : false}
                size="small"
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function InsightDetailDrawer({ open, onClose, insight }) {
    const { queryParams } = useAnalytics();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const code = insight?.code;

    useEffect(() => {
        if (!open || !code) return undefined;
        let cancelled = false;
        // setState'leri microtask'a ertele — react-hooks/set-state-in-effect uyumlu
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
            setData(null);
        });
        api.get('/attendance-analytics/insight-detail/', {
            params: { ...queryParams, code },
            timeout: 30000,
        })
            .then((res) => {
                if (cancelled) return;
                setData(res.data);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.error || err?.message || 'Detay yüklenemedi');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, code, queryParams]);

    // Insight'ın severity & icon — backend data varsa onu kullan, yoksa prop
    const severity = data?.severity || insight?.severity || 'info';
    const cfg = SEVERITY_CFG[severity] || SEVERITY_CFG.info;
    const Icon = ICON_MAP[insight?.icon] || Lightbulb;
    const title = data?.title || insight?.title || 'İçgörü Detayı';
    const message = data?.message || insight?.message || '';
    const reasoning = data?.reasoning || '';
    const recommendations = data?.recommendations || [];
    const affected = data?.affected_employees || [];

    const handleAction = () => {
        if (insight?.action?.route) {
            navigate(insight.action.route);
            onClose?.();
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width={720}
            title={null}
            closeIcon={null}
            destroyOnClose
            styles={{
                body: { padding: 0, background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 80%)' },
            }}
        >
            {/* Header */}
            <div className={`relative px-7 pt-6 pb-5 border-b border-slate-200/60 bg-gradient-to-br ${cfg.gradFrom} via-white ${cfg.gradTo}`}>
                <div className="absolute top-4 right-4 z-10">
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all backdrop-blur-sm"
                        aria-label="Kapat"
                    >
                        <span className="text-slate-500 text-lg leading-none">×</span>
                    </button>
                </div>
                <div className="flex items-start gap-3 pr-10">
                    <div className={`p-2.5 rounded-xl bg-white shadow-sm ${cfg.icon} flex-shrink-0`}>
                        <Icon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <div className={`p-1 rounded-md ${cfg.accent}`}>
                                <Sparkles size={11} className={cfg.accentText} />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${cfg.title}`}>
                                İçgörü Detayı
                            </span>
                            <Tag color={cfg.tag} className="!m-0 ml-1 text-[10px]">
                                {cfg.label}
                            </Tag>
                            {code && (
                                <span className="text-[9px] font-mono text-slate-400 bg-white/60 px-1.5 py-0.5 rounded">
                                    {code}
                                </span>
                            )}
                        </div>
                        <h2 className={`text-xl font-black leading-tight tracking-tight ${cfg.title}`}>
                            {title}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="px-7 py-5 space-y-5">
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <Loader2 size={28} className="mx-auto mb-3 text-indigo-500 animate-spin" />
                            <p className="text-[12px] text-slate-500">Detaylar yükleniyor...</p>
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                        <AlertCircle size={22} className="mx-auto mb-2 text-red-500" />
                        <h3 className="text-sm font-bold text-red-800 mb-1">Detay yüklenemedi</h3>
                        <p className="text-[12px] text-red-600">{error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Message */}
                        {message && (
                            <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
                                <div className="flex items-start gap-2">
                                    <FileText size={14} className={`${cfg.icon} flex-shrink-0 mt-0.5`} />
                                    <p className={`text-[13px] leading-relaxed font-medium ${cfg.text}`}>
                                        {message}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Reasoning */}
                        {reasoning && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Brain size={13} className="text-indigo-600" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                        Neden bu içgörü üretildi?
                                    </span>
                                </div>
                                <p className="text-[12px] text-slate-600 leading-relaxed">
                                    {reasoning}
                                </p>
                            </div>
                        )}

                        {/* Affected Employees Table */}
                        <AffectedEmployeesTable rows={affected} code={code} />

                        {/* Evidence (insight code'a göre dinamik) */}
                        {data?.evidence && (
                            <EvidenceSection code={code} evidence={data.evidence} />
                        )}

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-blue-50/30 p-4">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <ListChecks size={13} className="text-indigo-600" />
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.15em]">
                                        Önerilen Aksiyonlar
                                    </span>
                                </div>
                                <ul className="space-y-2">
                                    {recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[12px] text-slate-700 leading-relaxed">
                                            <CheckCircle2 size={13} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action Button */}
                        {insight?.action?.label && insight?.action?.route && (
                            <div className="pt-2">
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<ArrowRight size={14} />}
                                    iconPosition="end"
                                    onClick={handleAction}
                                    block
                                >
                                    {insight.action.label}
                                </Button>
                            </div>
                        )}

                        {/* Footer note */}
                        <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3">
                            <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-2">
                                <Lightbulb size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                <span>
                                    İçgörüler heuristic kurallarla otomatik üretilir. Aksiyon almadan önce
                                    ilgili kişi veya verilerle doğrulamanız önerilir.
                                </span>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Drawer>
    );
}
