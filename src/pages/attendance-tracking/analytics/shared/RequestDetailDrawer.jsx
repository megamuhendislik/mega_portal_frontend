import React, { useEffect, useState, useMemo } from 'react';
import { Drawer, Tag, Button } from 'antd';
import {
    Calendar as CalendarIcon, Clock, User, Building2, FileText,
    CheckCircle2, XCircle, Hourglass, AlertCircle, ExternalLink,
    Briefcase, MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

/**
 * RequestDetailDrawer — Talep detayını sağdan slide-in panel olarak gösterir.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - request: { id (e.g. "OT-12"), type ('LEAVE'|'OVERTIME'|'CARDLESS'), ... } — list row
 *
 * Tipe göre uygun endpoint'ten detay çeker:
 *  - LEAVE     -> /leave-requests/{id}/
 *  - OVERTIME  -> /overtime-requests/{id}/
 *  - CARDLESS  -> /cardless-entry-requests/{id}/
 */

const TYPE_CONFIG = {
    LEAVE: {
        label: 'İzin', color: '#3B82F6', bg: '#dbeafe', icon: Calendar,
        endpoint: 'leave-requests', viewRoute: '/requests',
    },
    OVERTIME: {
        label: 'Fazla Mesai', color: '#F59E0B', bg: '#fef3c7', icon: Briefcase,
        endpoint: 'overtime-requests', viewRoute: '/requests',
    },
    CARDLESS: {
        label: 'Kartsız Giriş', color: '#8B5CF6', bg: '#ede9fe', icon: AlertCircle,
        endpoint: 'cardless-entry-requests', viewRoute: '/requests',
    },
};

const STATUS_CONFIG = {
    PENDING: { label: 'Bekliyor', color: 'warning', icon: Hourglass },
    APPROVED: { label: 'Onaylandı', color: 'success', icon: CheckCircle2 },
    AUTO_APPROVED: { label: 'Otomatik Onaylandı', color: 'success', icon: CheckCircle2 },
    REJECTED: { label: 'Reddedildi', color: 'error', icon: XCircle },
    CANCELLED: { label: 'İptal Edildi', color: 'default', icon: XCircle },
    POTENTIAL: { label: 'Algılandı', color: 'processing', icon: Clock },
};

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
    } catch {
        return '—';
    }
}

function fmtAge(hours) {
    if (hours == null) return '—';
    if (hours < 1) return '< 1 saat';
    if (hours < 24) return `${Math.round(hours)} saat`;
    const days = Math.floor(hours / 24);
    const remH = Math.round(hours - days * 24);
    return `${days} gün ${remH} saat`;
}

// Parse "OT-123" -> 123
function parseRequestId(rawId) {
    if (!rawId) return null;
    const m = String(rawId).match(/-(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
}

function InfoBox({ icon: Icon, label, value, valueClass = 'text-slate-800' }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
                {Icon && <Icon size={11} className="text-slate-500" />}
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                    {label}
                </span>
            </div>
            <div className={`text-[13px] font-semibold ${valueClass}`}>
                {value || '—'}
            </div>
        </div>
    );
}

export default function RequestDetailDrawer({ open, onClose, request }) {
    const navigate = useNavigate();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const cfg = useMemo(() => TYPE_CONFIG[request?.type] || null, [request]);
    const numericId = useMemo(() => parseRequestId(request?.id), [request]);

    useEffect(() => {
        let cancelled = false;
        if (!open || !cfg || !numericId) {
            Promise.resolve().then(() => {
                if (cancelled) return;
                setDetail(null);
                setError(null);
            });
            return () => { cancelled = true; };
        }
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        api.get(`/${cfg.endpoint}/${numericId}/`)
            .then((res) => {
                if (cancelled) return;
                setDetail(res.data);
            })
            .catch((err) => {
                if (cancelled) return;
                // 404/403 yutalım — fallback: list row data göster
                setError(err?.response?.data?.detail || err?.message || 'Detay alınamadı');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, cfg, numericId]);

    if (!request) return null;

    const TypeIcon = cfg?.icon || FileText;
    const statusKey = request.status || detail?.status;
    const statusCfg = STATUS_CONFIG[statusKey] || { label: statusKey || '—', color: 'default', icon: AlertCircle };
    const StatusIcon = statusCfg.icon;

    const handleOpenRequest = () => {
        if (cfg?.viewRoute) {
            navigate(cfg.viewRoute);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width={520}
            destroyOnClose
            closable={false}
            styles={{
                body: { padding: 0 },
                header: { display: 'none' },
            }}
        >
            {/* Header */}
            <div
                className="px-6 pt-6 pb-5 border-b border-slate-200/70"
                style={{
                    background: cfg
                        ? `linear-gradient(180deg, ${cfg.bg}40 0%, #ffffff 100%)`
                        : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                                style={{
                                    background: cfg?.bg || '#f1f5f9',
                                    color: cfg?.color || '#475569',
                                    borderColor: cfg?.color || '#cbd5e1',
                                }}
                            >
                                <TypeIcon size={11} /> {cfg?.label || 'Talep'}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                                #{request.id}
                            </span>
                            <Tag color={statusCfg.color} icon={<StatusIcon size={10} />} className="!text-[10px] !ml-auto">
                                {statusCfg.label}
                            </Tag>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm flex-shrink-0"
                                style={{ background: cfg?.color || '#64748b' }}
                            >
                                {initials(request.employee_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-black text-slate-900 leading-tight truncate">
                                    {request.employee_name || '—'}
                                </h2>
                                <p className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                                    <Building2 size={11} /> {request.department || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
                {loading && (
                    <div className="text-center py-10 text-slate-400 text-sm">Yükleniyor…</div>
                )}

                {/* Detail grid — list row data fallback olarak her zaman gösterilir */}
                <div className="grid grid-cols-2 gap-2.5">
                    <InfoBox
                        icon={Calendar}
                        label="Tarih / Aralık"
                        value={request.date_or_range}
                    />
                    <InfoBox
                        icon={Clock}
                        label="Süre"
                        value={request.duration_or_days}
                    />
                    <InfoBox
                        icon={User}
                        label="Onaylayacak"
                        value={request.target_approver_name}
                    />
                    <InfoBox
                        icon={Hourglass}
                        label="Bekleme Süresi"
                        value={fmtAge(request.age_hours)}
                        valueClass={
                            request.age_hours > 168 ? 'text-red-700'
                                : request.age_hours > 72 ? 'text-orange-700'
                                : request.age_hours > 24 ? 'text-amber-700'
                                : 'text-slate-700'
                        }
                    />
                </div>

                <InfoBox
                    icon={Clock}
                    label="Oluşturulma"
                    value={fmtDateTime(request.created_at)}
                />

                {/* Reason */}
                {request.reason && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <MessageSquare size={11} className="text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                Sebep / Açıklama
                            </span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {request.reason}
                        </p>
                    </div>
                )}

                {/* Detail-specific extra info from API */}
                {!loading && detail && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 mb-1">
                            <FileText size={11} className="text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                Ek Bilgiler
                            </span>
                        </div>

                        {request.type === 'LEAVE' && (
                            <>
                                {detail.leave_type_name && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">İzin Türü:</span>
                                        <span className="font-semibold text-slate-700">{detail.leave_type_name}</span>
                                    </div>
                                )}
                                {detail.total_days != null && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Toplam Gün:</span>
                                        <span className="font-semibold text-slate-700">{detail.total_days} gün</span>
                                    </div>
                                )}
                                {detail.requested_hours != null && detail.requested_hours > 0 && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Talep Saati:</span>
                                        <span className="font-semibold text-slate-700">{detail.requested_hours} saat</span>
                                    </div>
                                )}
                            </>
                        )}

                        {request.type === 'OVERTIME' && (
                            <>
                                {detail.start_time && detail.end_time && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Saat Aralığı:</span>
                                        <span className="font-semibold text-slate-700 tabular-nums">
                                            {detail.start_time} – {detail.end_time}
                                        </span>
                                    </div>
                                )}
                                {detail.duration_seconds != null && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Süre:</span>
                                        <span className="font-semibold text-slate-700">
                                            {(detail.duration_seconds / 3600).toFixed(1)} saat
                                        </span>
                                    </div>
                                )}
                                {detail.source_type && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Kaynak:</span>
                                        <span className="font-semibold text-slate-700">{detail.source_type}</span>
                                    </div>
                                )}
                                {detail.task_description && (
                                    <div className="text-[12px]">
                                        <span className="text-slate-500">Görev: </span>
                                        <span className="text-slate-700">{detail.task_description}</span>
                                    </div>
                                )}
                            </>
                        )}

                        {request.type === 'CARDLESS' && (
                            <>
                                {detail.check_in_time && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Giriş:</span>
                                        <span className="font-semibold text-slate-700 tabular-nums">{detail.check_in_time}</span>
                                    </div>
                                )}
                                {detail.check_out_time && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Çıkış:</span>
                                        <span className="font-semibold text-slate-700 tabular-nums">{detail.check_out_time}</span>
                                    </div>
                                )}
                                {detail.send_to_substitute != null && (
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-slate-500">Vekile Gönderildi:</span>
                                        <span className="font-semibold text-slate-700">
                                            {detail.send_to_substitute ? 'Evet' : 'Hayır'}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {error && !detail && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                        Tam detay alınamadı: {error}
                    </div>
                )}

                {!loading && !error && !detail && (
                    <div className="text-[11px] text-slate-400 text-center py-2">
                        API detayı henüz yüklenmedi.
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 left-0 right-0 px-6 py-4 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex items-center justify-end gap-2">
                <Button onClick={onClose} size="middle">Kapat</Button>
                <Button
                    type="primary"
                    size="middle"
                    icon={<ExternalLink size={13} />}
                    onClick={handleOpenRequest}
                >
                    Talepler Sayfası
                </Button>
            </div>
        </Drawer>
    );
}

// Local Calendar lucide alias to avoid name collision with the imported one
function Calendar(props) {
    return <CalendarIcon {...props} />;
}
