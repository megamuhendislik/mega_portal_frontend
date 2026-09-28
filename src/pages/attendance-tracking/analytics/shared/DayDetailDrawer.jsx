import React, { useMemo } from 'react';
import { Drawer, Tag } from 'antd';
import {
    Clock, AlarmClock, Coffee, TrendingUp, Calendar as CalendarIcon,
    CheckCircle2, XCircle, AlertTriangle, Target, BarChart3, Stethoscope, Umbrella,
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
 *      worked: number,        // normal + ot (izin HARİÇ)
 *      normal?: number,
 *      ot: number,
 *      missing?: number,
 *      leave?: number,        // saatlik/tam gün izin kredisi (saat)
 *      leave_label?: string,  // örn. 'Mazeret İzni'
 *      target: number|null,   // takvimden brüt günlük hedef (tatil 0, bilinmiyor null)
 *      status: string,
 *    } | null
 *  - employeeName?: string
 *  - calendarStatus?: 'full' | 'partial' | 'absent' | 'leave' | 'off' | 'future'
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
    leave: { label: 'İzinli', color: 'blue', icon: Umbrella },
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
    // Hedef yok/bilinmiyor (tatil 0, kayıtsız gün null) → "Hedefsiz gün"
    const target = day?.target ?? 0;
    const hasTarget = target > 0;
    // Backend gün-başına toplam alanları gönderiyor (normal/missing/break_*)
    const normal = day?.normal != null ? day.normal : Math.max(0, worked - ot);
    // İzin (saatlik mazeret / tam gün) çalışma değildir ama hedefi karşılar.
    const leave = day?.leave ?? 0;
    const leaveLabel = day?.leave_label || 'İzin';
    const covered = normal + leave;
    const deficit = day?.missing != null ? day.missing : Math.max(0, target - covered);
    const efficiency = hasTarget ? Math.round((covered / target) * 100) : 0;
    const barTotal = Math.max(target, covered + ot + deficit) || 1;
    const barWidth = (h) => `${Math.min(100, (h / barTotal) * 100)}%`;
    const hasBreak = day?.break_total != null;
    // Raporlu/İzinli (hospital visit) — DISPLAY-ONLY: normale yazılmaz, ayrı kategori.
    // Gün verisinden saat cinsinden okunur (saniye varsa saate çevrilir); yalnız >0 ise gösterilir.
    const hospitalVisit = day?.hospital_visit_hours != null
        ? day.hospital_visit_hours
        : (day?.hospital_visit_seconds != null ? day.hospital_visit_seconds / 3600 : 0);

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
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Hedef: {hasTarget ? formatHours(target) : 'yok'}
                                </p>
                            </div>

                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4" title="(Normal + İzin) / Hedef">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Target size={11} className="text-emerald-600" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Doluluk</span>
                                </div>
                                <div className="text-2xl font-black text-emerald-800 tabular-nums">
                                    {hasTarget ? (
                                        <>{efficiency}<span className="text-base text-slate-400 ml-0.5">%</span></>
                                    ) : '—'}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {!hasTarget ? 'Hedefsiz gün' : efficiency >= 100 ? 'Hedef üstü' : efficiency >= 80 ? 'İyi' : efficiency >= 60 ? 'Orta' : 'Düşük'}
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
                                    {deficit > 0 ? 'Hedef altı' : hasTarget ? 'Hedefe ulaşıldı' : 'Hedefsiz gün'}
                                </p>
                            </div>

                            {/* İzin (saatlik mazeret / tam gün) — çalışmaya eklenmez, hedefe sayılır */}
                            {leave > 0 && (
                                <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
                                    <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                                        <Umbrella size={11} className="text-cyan-600 flex-shrink-0" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] truncate" title={leaveLabel}>
                                            {leaveLabel}
                                        </span>
                                    </div>
                                    <div className="text-2xl font-black text-cyan-800 tabular-nums">
                                        {formatHours(leave)}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Çalışma değil, hedefe sayılır</p>
                                </div>
                            )}

                            {/* Raporlu/İzinli (hastane ziyareti) — yalnız HV>0 ise göster */}
                            {hospitalVisit > 0 && (
                                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Stethoscope size={11} className="text-purple-600" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">Raporlu/İzinli</span>
                                    </div>
                                    <div className="text-2xl font-black text-purple-800 tabular-nums">
                                        {formatHours(hospitalVisit)}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Sağlık raporu / izin</p>
                                </div>
                            )}
                        </div>

                        {/* Çalışma dağılımı bar */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                    Çalışma Dağılımı
                                </span>
                                <span className="text-[10px] font-bold text-slate-700 tabular-nums" title="(Normal + İzin) / Hedef">
                                    {formatHours(covered)} / {hasTarget ? formatHours(target) : 'hedef yok'}
                                </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                {normal > 0 && (
                                    <div
                                        className="h-full bg-indigo-500 transition-all"
                                        style={{ width: barWidth(normal) }}
                                        title={`Normal: ${formatHours(normal)}`}
                                    />
                                )}
                                {leave > 0 && (
                                    <div
                                        className="h-full bg-cyan-500 transition-all"
                                        style={{ width: barWidth(leave) }}
                                        title={`${leaveLabel}: ${formatHours(leave)}`}
                                    />
                                )}
                                {deficit > 0 && (
                                    <div
                                        className="h-full bg-rose-300 transition-all"
                                        style={{ width: barWidth(deficit) }}
                                        title={`Eksik: ${formatHours(deficit)}`}
                                    />
                                )}
                                {ot > 0 && (
                                    <div
                                        className="h-full bg-amber-500 transition-all"
                                        style={{ width: barWidth(ot) }}
                                        title={`Fazla Mesai: ${formatHours(ot)}`}
                                    />
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[10px] flex-wrap">
                                <span className="flex items-center gap-1 text-slate-500">
                                    <span className="w-2 h-2 rounded-sm bg-indigo-500" /> Normal {formatHours(normal)}
                                </span>
                                {leave > 0 && (
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <span className="w-2 h-2 rounded-sm bg-cyan-500" /> {leaveLabel} {formatHours(leave)}
                                    </span>
                                )}
                                {deficit > 0 && (
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <span className="w-2 h-2 rounded-sm bg-rose-300" /> Eksik {formatHours(deficit)}
                                    </span>
                                )}
                                {ot > 0 && (
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <span className="w-2 h-2 rounded-sm bg-amber-500" /> Fazla Mesai {formatHours(ot)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Mola — öğle hariç gerçek gün içi mola + hak içi kullanım/aşım */}
                        {hasBreak && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                        <Coffee size={11} className="text-emerald-600" /> Mola (öğle hariç)
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-700 tabular-nums">
                                        Toplam {formatHours(day.break_total)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hak İçi Kullanım</p>
                                        <p className="text-base font-black text-indigo-800 tabular-nums mt-0.5">{formatHours(day.break_usage)}</p>
                                    </div>
                                    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mola Aşımı</p>
                                        <p className="text-base font-black text-rose-700 tabular-nums mt-0.5">
                                            {day.break_overage > 0 ? formatHours(day.break_overage) : '—'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                                    Giriş/çıkışlar arası toplam dışarıda kalma (öğle arası düşülmüş). Hak içi kullanım mola hakkına sayılan kısım; aşım hakkı aşan kısımdır.
                                </p>
                            </div>
                        )}

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
                                    Çalışma süresi mola hariç net süreyi gösterir; izin süresi çalışmaya eklenmez,
                                    hedefi karşılayan ayrı kalem olarak gösterilir. Ek mesai onaylı segmentleri kapsar.
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
