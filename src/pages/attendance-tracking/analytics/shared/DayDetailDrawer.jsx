import React, { useMemo } from 'react';
import { Drawer, Tag } from 'antd';
import {
    Clock, AlarmClock, Coffee, TrendingUp, Calendar as CalendarIcon,
    CheckCircle2, XCircle, AlertTriangle, Target, BarChart3,
} from 'lucide-react';

/**
 * DayDetailDrawer — kişi+gün için detay panel.
 *
 * AntD Drawer (sağdan slide-in). Backend çağrısı YOK — local data
 * (personalData) kullanılır.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - day: {
 *      date: 'YYYY-MM-DD',
 *      worked: number,
 *      ot: number,
 *      target: number,
 *      status: string,
 *    } | null
 *  - employeeName?: string
 *  - calendarStatus?: 'full' | 'partial' | 'absent' | 'off' | 'future'
 *  - entryExit?: { first_check_in, last_check_out } (varsa)
 */

const STATUS_LABEL = {
    APPROVED: 'Onaylanmış',
    AUTO_APPROVED: 'Otomatik Onaylı',
    PENDING_MANAGER_APPROVAL: 'Onay Bekliyor',
    CALCULATED: 'Hesaplanmış',
    OPEN: 'Açık',
    REJECTED: 'Reddedildi',
    ABSENT: 'Devamsız',
    HEALTH_REPORT: 'Sağlık Raporu',
    HOSPITAL_VISIT: 'Hastane Ziyareti',
    EXTERNAL_DUTY: 'Dış Görev',
    LEAVE: 'İzinli',
};

const CALENDAR_STATUS = {
    full: { label: 'Tam Çalışma', color: 'success', icon: CheckCircle2 },
    partial: { label: 'Kısmi Çalışma', color: 'warning', icon: AlertTriangle },
    absent: { label: 'Devamsız', color: 'error', icon: XCircle },
    off: { label: 'Tatil / Hafta Sonu', color: 'default', icon: CalendarIcon },
    future: { label: 'Gelecek Tarih', color: 'processing', icon: CalendarIcon },
};

function formatDateTr(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${days[d.getDay()]}`;
    } catch {
        return dateStr;
    }
}

function formatHours(h) {
    if (h == null) return '—';
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${hours}s ${String(mins).padStart(2, '0')}dk`;
}

export default function DayDetailDrawer({ open, onClose, day, employeeName, calendarStatus, entryExit }) {
    const statusCfg = useMemo(() => CALENDAR_STATUS[calendarStatus] || null, [calendarStatus]);
    const StatusIcon = statusCfg?.icon || CalendarIcon;

    const worked = day?.worked ?? 0;
    const ot = day?.ot ?? 0;
    const target = day?.target ?? 8;
    const normal = Math.max(0, worked - ot);
    const deficit = Math.max(0, target - normal);
    const efficiency = target > 0 ? Math.round((worked / target) * 100) : 0;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width={460}
            title={null}
            closeIcon={null}
            styles={{ body: { padding: 0, background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 80%)' } }}
        >
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-slate-200/60 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="p-1 rounded-md bg-indigo-100/80">
                                <CalendarIcon size={11} className="text-indigo-700" />
                            </div>
                            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-[0.2em]">
                                Gün Detayı
                            </span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900 leading-tight mb-1">
                            {formatDateTr(day?.date)}
                        </h2>
                        {employeeName && (
                            <p className="text-[12px] text-slate-500 font-medium">{employeeName}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm flex-shrink-0"
                        aria-label="Kapat"
                    >
                        <span className="text-slate-500 text-lg leading-none">×</span>
                    </button>
                </div>

                {/* Status badge */}
                {statusCfg && (
                    <div className="mt-3 inline-flex items-center gap-1.5">
                        <Tag color={statusCfg.color} icon={<StatusIcon size={11} />} className="!m-0 !flex !items-center !gap-1 !py-0.5">
                            {statusCfg.label}
                        </Tag>
                        {day?.status && day.status !== 'CALCULATED' && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {STATUS_LABEL[day.status] || day.status}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
                {!day ? (
                    <div className="text-center py-10 text-slate-400 text-sm">Veri yok</div>
                ) : (
                    <>
                        {/* Quick stats grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Clock size={11} className="text-indigo-600" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Çalışma</span>
                                </div>
                                <div className="text-2xl font-black text-indigo-800 tabular-nums">
                                    {formatHours(worked)}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">Hedef: {formatHours(target)}</p>
                            </div>

                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Target size={11} className="text-emerald-600" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Doluluk</span>
                                </div>
                                <div className="text-2xl font-black text-emerald-800 tabular-nums">
                                    {efficiency}<span className="text-base text-slate-400 ml-0.5">%</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {efficiency >= 100 ? 'Hedef üstü' : efficiency >= 80 ? 'İyi' : efficiency >= 60 ? 'Orta' : 'Düşük'}
                                </p>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <TrendingUp size={11} className="text-amber-600" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Fazla Mesai</span>
                                </div>
                                <div className="text-2xl font-black text-amber-800 tabular-nums">
                                    {ot > 0 ? formatHours(ot) : '—'}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {ot > 0 ? 'Onaylı Fazla Mesai' : 'Fazla mesai yok'}
                                </p>
                            </div>

                            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <BarChart3 size={11} className="text-rose-600" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Eksik</span>
                                </div>
                                <div className="text-2xl font-black text-rose-800 tabular-nums">
                                    {deficit > 0 ? formatHours(deficit) : '—'}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {deficit > 0 ? 'Hedef altı' : 'Hedefe ulaşıldı'}
                                </p>
                            </div>
                        </div>

                        {/* Çalışma dağılımı bar */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                    Çalışma Dağılımı
                                </span>
                                <span className="text-[10px] font-bold text-slate-700 tabular-nums">
                                    {formatHours(worked)} / {formatHours(target)}
                                </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                {normal > 0 && (
                                    <div
                                        className="h-full bg-indigo-500 transition-all"
                                        style={{ width: `${Math.min(100, (normal / Math.max(target, worked)) * 100)}%` }}
                                        title={`Normal: ${formatHours(normal)}`}
                                    />
                                )}
                                {ot > 0 && (
                                    <div
                                        className="h-full bg-amber-500 transition-all"
                                        style={{ width: `${Math.min(100, (ot / Math.max(target, worked)) * 100)}%` }}
                                        title={`Fazla Mesai: ${formatHours(ot)}`}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[10px]">
                                <span className="flex items-center gap-1 text-slate-500">
                                    <span className="w-2 h-2 rounded-sm bg-indigo-500" /> Normal {formatHours(normal)}
                                </span>
                                {ot > 0 && (
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <span className="w-2 h-2 rounded-sm bg-amber-500" /> Fazla Mesai {formatHours(ot)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Giriş/Çıkış (entryExit varsa) */}
                        {entryExit && (entryExit.first_check_in || entryExit.last_check_out) && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">
                                    Giriş / Çıkış
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                            <AlarmClock size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">İlk Giriş</p>
                                            <p className="text-base font-black text-slate-800 tabular-nums">{entryExit.first_check_in || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                            <AlarmClock size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Son Çıkış</p>
                                            <p className="text-base font-black text-slate-800 tabular-nums">{entryExit.last_check_out || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3">
                            <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-2">
                                <Coffee size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                <span>
                                    Çalışma süresi mola hariç net süreyi gösterir. Ek mesai onaylı segmentleri kapsar.
                                    Detaylı kayıtlar için ilgili çalışanın "Devam Takibi" sayfasını ziyaret edin.
                                </span>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Drawer>
    );
}
