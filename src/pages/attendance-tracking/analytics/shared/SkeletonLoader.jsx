import React from 'react';
import { Skeleton } from 'antd';

/**
 * Analytics sayfaları için yükleme iskeleti.
 * Spinner yerine içerik-shape korunur, kullanıcı görsel stabilite hisseder.
 *
 * Variants:
 *  - 'card'     — tek kart placeholder (default)
 *  - 'kpi-grid' — 4'lü KPI kart grid'i
 *  - 'chart'    — başlık + chart placeholder
 *  - 'table'    — tablo placeholder
 *  - 'section'  — başlık + chart + tablo kombinasyonu (tab default)
 *
 * Props:
 *  - variant — yukarıdaki değerlerden biri
 *  - count   — kaç kart/kart grid için
 *  - rows    — satır sayısı (table/card)
 *  - className
 */
export default function SkeletonLoader({
    variant = 'card',
    count = 1,
    rows = 4,
    className = '',
}) {
    if (variant === 'kpi-grid') {
        const n = count || 4;
        return (
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
                {Array.from({ length: n }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <Skeleton active paragraph={{ rows: 2 }} title={{ width: '60%' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'chart') {
        return (
            <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
                <Skeleton.Input active style={{ width: 240, height: 22 }} />
                <div className="mt-4">
                    <Skeleton.Image active style={{ width: '100%', height: 300 }} />
                </div>
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
                <Skeleton active paragraph={{ rows: rows || 6 }} title={{ width: '40%' }} />
            </div>
        );
    }

    if (variant === 'section') {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <Skeleton active paragraph={{ rows: 2 }} title={{ width: '60%' }} />
                        </div>
                    ))}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <Skeleton.Input active style={{ width: 240, height: 22 }} />
                    <div className="mt-4">
                        <Skeleton.Image active style={{ width: '100%', height: 280 }} />
                    </div>
                </div>
            </div>
        );
    }

    // variant === 'card' (default)
    return (
        <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
            <Skeleton active paragraph={{ rows }} />
        </div>
    );
}
