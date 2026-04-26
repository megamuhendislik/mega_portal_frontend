import React, { useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import { Users, Shield, Info, Clock } from 'lucide-react';
import api from '../../../../services/api';

/**
 * ScopeBanner — Tüm analiz tab'larının üstünde gösterilir.
 *
 * Kullanıcının kapsamını netleştirir: kendi ekibim vs tüm şirket
 * (sistem yöneticisi). Backend `/attendance-analytics/scope-info/`
 * endpoint'i ile tek API çağrısında özet alır.
 *
 * Prop'lar:
 *   - startDate, endDate (string, ISO YYYY-MM-DD): Pro-rata uyarısı için.
 *     Verilen aralık şu anki günü kapsıyorsa "Devam Eden Dönem" rozeti çıkar.
 *   - className (string): Ekstra Tailwind utility'leri.
 */

function isPeriodInProgress(startDate, endDate) {
    if (!startDate || !endDate) return false;
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        return today >= start && today < end;
    } catch {
        return false;
    }
}

export default function ScopeBanner({ startDate, endDate, className = '' }) {
    const [info, setInfo] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api.get('/attendance-analytics/scope-info/')
            .then((res) => {
                if (!cancelled) setInfo(res.data);
            })
            .catch(() => { /* sessizce yut — banner görünmesin */ });
        return () => { cancelled = true; };
    }, []);

    if (!info) return null;

    const { is_admin, employee_count, admin_reason } = info;
    const periodInProgress = isPeriodInProgress(startDate, endDate);

    const Icon = is_admin ? Shield : Users;
    const scopeLabel = is_admin ? 'Tüm Şirket' : 'Ekibim';

    const reasonText = {
        superuser: 'Süper Kullanıcı',
        system_admin_role: 'Sistem Yöneticisi (rol)',
        system_full_access: 'Sistem Tam Erişim',
    }[admin_reason] || null;

    // Tailwind dynamic class purge'ünden kaçınmak için sınıflar açık yazıldı
    const containerClass = is_admin
        ? 'border-indigo-200 from-indigo-50/60 to-white'
        : 'border-emerald-200 from-emerald-50/60 to-white';
    const chipClass = is_admin
        ? 'bg-indigo-100/70 text-indigo-700'
        : 'bg-emerald-100/70 text-emerald-700';
    const iconClass = is_admin ? 'text-indigo-700' : 'text-emerald-700';

    return (
        <div className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border bg-gradient-to-r ${containerClass} ${className}`}>
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg ${chipClass}`}>
                <Icon size={14} className={iconClass} />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                    Kapsam: {scopeLabel}
                </span>
            </div>
            <span className="text-[13px] font-semibold text-slate-700 tabular-nums">
                {employee_count}{' '}
                <span className="text-[11px] text-slate-500 font-normal">aktif çalışan</span>
            </span>
            {is_admin && reasonText && (
                <Tooltip title="Yetki kaynağınız (admin sınıflandırma sebebi)">
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                        {reasonText}
                        <Info size={10} className="opacity-60" />
                    </span>
                </Tooltip>
            )}
            {periodInProgress && (
                <Tooltip title="Bu dönem henüz tamamlanmadı. Verimlilik / hedef yüzdeleri geçen iş günleri kadar oransal hesaplandı.">
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        <Clock size={10} /> Devam Eden Dönem
                        <Info size={10} className="opacity-60" />
                    </span>
                </Tooltip>
            )}
        </div>
    );
}
