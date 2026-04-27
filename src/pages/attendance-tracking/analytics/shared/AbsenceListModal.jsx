import React, { useMemo } from 'react';
import { Modal, Empty, Tag } from 'antd';
import { XCircle, Calendar, X as CloseIcon, AlertTriangle } from 'lucide-react';

/**
 * AbsenceListModal — kişinin devamsızlık günleri.
 *
 * Backend çağrısı YOK — local data (calendarData) kullanılır.
 * calendarData içindeki status='absent' olan günler listelenir.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - calendarData: [{ date: 'YYYY-MM-DD', status: 'absent'|'partial'|... }]
 *  - employeeName?: string
 *  - dailyHours?: [{ date, worked, target, ot, status }]  — ek bilgi için
 */

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function formatDateTr(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return {
            day: TR_DAYS[d.getDay()],
            full: `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
            short: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`,
            obj: d,
        };
    } catch {
        return { day: '—', full: dateStr, short: dateStr, obj: new Date() };
    }
}

export default function AbsenceListModal({ open, onClose, calendarData = [], employeeName, dailyHours = [] }) {
    const absences = useMemo(() => {
        const dailyMap = new Map();
        dailyHours.forEach((d) => dailyMap.set(d.date, d));

        return calendarData
            .filter((d) => d.status === 'absent')
            .map((d) => ({
                date: d.date,
                fmt: formatDateTr(d.date),
                daily: dailyMap.get(d.date) || null,
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [calendarData, dailyHours]);

    const partials = useMemo(() => {
        const dailyMap = new Map();
        dailyHours.forEach((d) => dailyMap.set(d.date, d));

        return calendarData
            .filter((d) => d.status === 'partial')
            .map((d) => ({
                date: d.date,
                fmt: formatDateTr(d.date),
                daily: dailyMap.get(d.date) || null,
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [calendarData, dailyHours]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="92%"
            style={{ top: 30, maxWidth: 800 }}
            styles={{
                body: { padding: 0, background: 'linear-gradient(180deg, #fef2f2 0%, #ffffff 60%)' },
                content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
            }}
            closeIcon={null}
            destroyOnClose
            centered={false}
        >
            {/* Header */}
            <div className="relative px-7 pt-5 pb-4 border-b border-slate-200/60 bg-gradient-to-br from-red-50/40 via-white to-amber-50/30">
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 shadow-sm"
                    >
                        <CloseIcon size={14} className="text-slate-500" />
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded-md bg-red-100/80">
                        <XCircle size={12} className="text-red-700" />
                    </div>
                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-[0.2em]">
                        Devamsızlık
                    </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
                    {employeeName ? `${employeeName} — Devamsızlık Listesi` : 'Devamsızlık Listesi'}
                </h2>
                <p className="text-[12px] text-slate-500">
                    Seçili dönemdeki devamsızlık ve kısmi günler tarih bazında listelenmiştir.
                </p>

                {/* Üst özet */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-red-50/70 border border-red-200 px-3 py-2">
                        <div className="text-[9px] font-bold text-red-600 uppercase tracking-[0.15em]">Devamsız Gün</div>
                        <div className="text-lg font-black text-red-800 tabular-nums">{absences.length}<span className="text-xs text-slate-400 ml-1">gün</span></div>
                    </div>
                    <div className="rounded-lg bg-amber-50/70 border border-amber-200 px-3 py-2">
                        <div className="text-[9px] font-bold text-amber-600 uppercase tracking-[0.15em]">Kısmi (Hedef Altı)</div>
                        <div className="text-lg font-black text-amber-800 tabular-nums">{partials.length}<span className="text-xs text-slate-400 ml-1">gün</span></div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="px-7 py-5 max-h-[60vh] overflow-y-auto space-y-5">
                {/* Devamsızlıklar */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <XCircle size={14} className="text-red-500" />
                        <h3 className="text-sm font-black text-slate-800">Devamsız Günler ({absences.length})</h3>
                    </div>
                    {absences.length === 0 ? (
                        <div className="py-6">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={<span className="text-slate-500 text-sm">Bu dönemde devamsızlık yok</span>}
                            />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {absences.map((a) => (
                                <div
                                    key={a.date}
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50/30 hover:bg-red-50/60 transition-colors"
                                >
                                    <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                                        <XCircle size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-slate-800">
                                            {a.fmt.full}
                                        </p>
                                        <p className="text-[10px] text-slate-500">{a.fmt.day}</p>
                                    </div>
                                    <Tag color="error" className="!m-0 !text-[9px] !py-0 !px-1.5">
                                        Devamsız
                                    </Tag>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Kısmi günler */}
                {partials.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <h3 className="text-sm font-black text-slate-800">Kısmi / Hedef Altı Günler ({partials.length})</h3>
                        </div>
                        <div className="space-y-1.5">
                            {partials.map((a) => {
                                const worked = a.daily?.worked ?? null;
                                const target = a.daily?.target ?? 8;
                                const deficit = worked != null ? Math.max(0, target - worked) : null;
                                return (
                                    <div
                                        key={a.date}
                                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 transition-colors"
                                    >
                                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                                            <Calendar size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-slate-800">
                                                {a.fmt.full}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {a.fmt.day}
                                                {worked != null && (
                                                    <span className="ml-2 text-amber-600 font-semibold tabular-nums">
                                                        Çalışma: {worked}sa / Hedef: {target}sa
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {deficit != null && deficit > 0 && (
                                            <Tag color="warning" className="!m-0 !text-[9px] !py-0 !px-1.5">
                                                {deficit.toFixed(1)}sa eksik
                                            </Tag>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
