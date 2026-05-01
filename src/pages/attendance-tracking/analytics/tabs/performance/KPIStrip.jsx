import React, { useMemo } from 'react';
import { Target, TrendingUp, Activity, AlertTriangle, Zap } from 'lucide-react';
import KPICard from '../../shared/KPICard';
import { fmtPct } from './helpers';

/**
 * 5 ana metrigin ekip ozeti.
 * Sadece has_target=true olan kisilerden ortalama alinir.
 * Saat metrikleri (FM, Eksik) tum populasyondan toplanir.
 */
export default function KPIStrip({ employees }) {
    const stats = useMemo(() => {
        const eligible = employees.filter((e) => e.has_target ?? (e.target_hours > 0));
        const n = eligible.length || 1;

        const avgNormal = Math.round(
            eligible.reduce((s, e) => s + (e.normal_completion_pct ?? e.efficiency_pct ?? 0), 0) / n
        );
        const avgTotal = Math.round(
            eligible.reduce((s, e) => s + (e.total_completion_pct || 0), 0) / n
        );
        const totalOt = Math.round(employees.reduce((s, e) => s + (e.ot_hours || 0), 0));
        const totalMissing = Math.round(employees.reduce((s, e) => s + (e.missing_hours || 0), 0));

        const otNVals = eligible.filter((e) => e.ot_to_normal_pct != null).map((e) => e.ot_to_normal_pct);
        const avgOtN = otNVals.length > 0
            ? Math.round(otNVals.reduce((s, v) => s + v, 0) / otNVals.length)
            : null;

        return { avgNormal, avgTotal, totalOt, totalMissing, avgOtN, count: eligible.length };
    }, [employees]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KPICard
                title="Yapılan Normal Mesai"
                value={stats.avgNormal}
                suffix="%" icon={Target}
                gradient="indigo"
                subtitle="Ortalama (W ÷ Y)"
            />
            <KPICard
                title="Toplam Doluluk"
                value={stats.avgTotal}
                suffix="%" icon={TrendingUp}
                gradient={stats.avgTotal >= 100 ? 'violet' : 'emerald'}
                subtitle="(W+FM) ÷ Y · uncapped"
            />
            <KPICard
                title="Fazla Mesai"
                value={stats.totalOt}
                suffix="sa" icon={Zap}
                gradient="amber"
                subtitle={`Toplam · ${stats.count} kişi`}
            />
            <KPICard
                title="Eksik Mesai"
                value={stats.totalMissing}
                suffix="sa" icon={AlertTriangle}
                gradient="red"
                subtitle="Toplam"
            />
            <KPICard
                title="FM / Normal"
                value={stats.avgOtN == null ? '—' : fmtPct(stats.avgOtN).replace('%', '')}
                suffix={stats.avgOtN == null ? '' : '%'}
                icon={Activity}
                gradient="violet"
                subtitle="FM yoğunluğu"
            />
        </div>
    );
}
