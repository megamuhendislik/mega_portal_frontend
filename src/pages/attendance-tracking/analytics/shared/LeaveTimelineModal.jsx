import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Empty, Tag, Spin } from 'antd';
import {
    Coins, Calendar, X as CloseIcon, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import api from '../../../../services/api';

/**
 * LeaveTimelineModal — kişinin yıllık izin geçmişi.
 *
 * Backend endpoint: GET /leave-requests/?employee_id={id}
 * (year filtresini frontend uyguluyor — backend tüm taleplerini döner)
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - employeeId: number
 *  - employeeName?: string
 *  - leaveUsed?: number — özet (parent'tan gelen "kullanılan" gün)
 *  - leaveTotal?: number — özet (parent'tan gelen "toplam hak")
 */

const STATUS_CFG = {
    APPROVED: { label: 'Onaylı', color: 'success', icon: CheckCircle2 },
    AUTO_APPROVED: { label: 'Otomatik Onaylı', color: 'success', icon: CheckCircle2 },
    PENDING: { label: 'Bekliyor', color: 'warning', icon: Clock },
    PENDING_MANAGER_APPROVAL: { label: 'Bekliyor', color: 'warning', icon: Clock },
    REJECTED: { label: 'Reddedildi', color: 'error', icon: XCircle },
    CANCELLED: { label: 'İptal', color: 'default', icon: XCircle },
};

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function formatDate(s) {
    if (!s) return '—';
    try {
        const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''));
        return `${String(d.getDate()).padStart(2, '0')} ${TR_MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
    } catch {
        return s;
    }
}

export default function LeaveTimelineModal({ open, onClose, employeeId, employeeName, leaveUsed, leaveTotal }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !employeeId) return undefined;
        let cancelled = false;
        // setState'leri microtask'a ertele — react-hooks/set-state-in-effect uyumlu
        Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setError(null);
        });
        // Backend: /leave-requests/ list endpoint — employee_id filtresi destekleniyor
        api.get('/leave-requests/', { params: { employee_id: employeeId, page_size: 200 } })
            .then((res) => {
                if (cancelled) return;
                const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
                setData(arr);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.detail || err.message || 'Talepler yüklenemedi');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, employeeId]);

    // Yıllık gruplama
    const grouped = useMemo(() => {
        const byYear = {};
        data.forEach((req) => {
            const year = (req.start_date || req.created_at || '').slice(0, 4) || 'Bilinmiyor';
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push(req);
        });
        // Yıl bazında sırala (yeni → eski)
        return Object.entries(byYear)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, items]) => ({
                year,
                items: items.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '')),
                total_days: items
                    .filter((i) => i.status === 'APPROVED' || i.status === 'AUTO_APPROVED')
                    .reduce((s, i) => s + (parseFloat(i.total_days) || 0), 0),
                count: items.length,
            }));
    }, [data]);

    const remaining = (leaveTotal || 0) - (leaveUsed || 0);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="92%"
            style={{ top: 30, maxWidth: 900 }}
            styles={{
                body: { padding: 0, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', overflowX: 'hidden', background: 'linear-gradient(180deg, #fffbf3 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            {/* Header */}
            <div className="relative px-7 pt-5 pb-4 border-b border-slate-200/60 bg-gradient-to-br from-blue-50/40 via-white to-amber-50/30">
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-blue-100/80">
                        <Coins size={12} className="text-blue-700" />
                    </div>
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em]">
                        İzin Geçmişi
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    {employeeName ? `${employeeName} — İzin Zaman Çizelgesi` : 'İzin Zaman Çizelgesi'}
                </h2>
                <p className="text-[12px] text-slate-500">
                    Tüm izin talepleri (yıllık, mazeret ve diğerleri) yıl bazında gruplanmıştır.
                </p>

                {/* Üst özet kartlar */}
                {(leaveTotal != null || leaveUsed != null) && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-blue-50/70 border border-blue-200 px-3 py-2">
                            <div className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.15em]">Toplam Hak</div>
                            <div className="text-lg font-black text-blue-800 tabular-nums">{leaveTotal || 0}<span className="text-xs text-slate-400 ml-1">gün</span></div>
                        </div>
                        <div className="rounded-lg bg-amber-50/70 border border-amber-200 px-3 py-2">
                            <div className="text-[9px] font-bold text-amber-600 uppercase tracking-[0.15em]">Kullanılan</div>
                            <div className="text-lg font-black text-amber-800 tabular-nums">{leaveUsed || 0}<span className="text-xs text-slate-400 ml-1">gün</span></div>
                        </div>
                        <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 px-3 py-2">
                            <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.15em]">Kalan</div>
                            <div className="text-lg font-black text-emerald-800 tabular-nums">{remaining > 0 ? remaining : 0}<span className="text-xs text-slate-400 ml-1">gün</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="px-7 py-5 max-h-[60vh] overflow-y-auto">
                {loading && (
                    <div className="text-center py-10 text-slate-500">
                        <Spin /> <p className="mt-2 text-sm">Yükleniyor...</p>
                    </div>
                )}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                        Hata: {error}
                    </div>
                )}
                {!loading && !error && grouped.length === 0 && (
                    <div className="py-10">
                        <Empty description="Bu çalışana ait izin talebi bulunamadı" />
                    </div>
                )}
                {!loading && !error && grouped.length > 0 && (
                    <div className="space-y-5">
                        {grouped.map((group) => (
                            <div key={group.year} className="space-y-2">
                                <div className="flex items-baseline gap-3 mb-2">
                                    <h3 className="text-lg font-black text-slate-800">{group.year}</h3>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {group.count} talep · {group.total_days} gün onaylı
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    {group.items.map((req) => {
                                        const cfg = STATUS_CFG[req.status] || STATUS_CFG.PENDING;
                                        const Icon = cfg.icon;
                                        const typeName = req.request_type_name || req.leave_type_name || req.request_type?.name || 'İzin';
                                        return (
                                            <div
                                                key={req.id}
                                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                                            >
                                                <div className="p-1.5 rounded-lg bg-slate-50 text-slate-500">
                                                    <Calendar size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[12px] font-bold text-slate-800 truncate">
                                                            {typeName}
                                                        </span>
                                                        <Tag color={cfg.color} icon={<Icon size={10} />} className="!m-0 !flex !items-center !gap-1 !py-0 !px-1.5 !text-[9px]">
                                                            {cfg.label}
                                                        </Tag>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500">
                                                        {formatDate(req.start_date)}
                                                        {req.end_date && req.end_date !== req.start_date && (
                                                            <> → {formatDate(req.end_date)}</>
                                                        )}
                                                        {req.reason && (
                                                            <span className="ml-2 text-slate-400 italic">"{req.reason.slice(0, 60)}{req.reason.length > 60 ? '…' : ''}"</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-base font-black text-slate-800 tabular-nums">
                                                        {parseFloat(req.total_days || 0)}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase">gün</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
