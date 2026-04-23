import React from 'react';

/**
 * Ortak Recharts tooltip komponenti.
 * 5 tab'da tekrarlanan CustomTooltip tanımlarının yerine geçer.
 *
 * Props:
 *  - active, payload, label — Recharts tarafından inject edilir
 *  - formatter(value, name, entry) => [formattedValue, formattedName]
 *  - labelFormatter(label) => string
 *  - unit — değerin sonuna eklenir ("sa", "%", "dk" vb.)
 *  - showTotal — true ise alt satırda toplam gösterilir
 *  - hideLabel — label'ı gizle
 */

const DEFAULT_FORMATTER = (value, name) => {
    if (typeof value === 'number') {
        return [value.toLocaleString('tr-TR', { maximumFractionDigits: 2 }), name];
    }
    return [value, name];
};

export default function ChartTooltip({
    active,
    payload,
    label,
    formatter = DEFAULT_FORMATTER,
    labelFormatter,
    unit = '',
    showTotal = false,
    hideLabel = false,
    className = '',
}) {
    if (!active || !payload || payload.length === 0) return null;

    const total = showTotal
        ? payload.reduce((sum, entry) => sum + (typeof entry.value === 'number' ? entry.value : 0), 0)
        : null;

    return (
        <div
            className={`rounded-lg border border-white/20 bg-slate-900/95 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-md ${className}`}
            role="tooltip"
        >
            {!hideLabel && label !== undefined && label !== null && (
                <div className="mb-2 border-b border-white/10 pb-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                    {labelFormatter ? labelFormatter(label) : label}
                </div>
            )}

            <div className="space-y-1">
                {payload.map((entry, idx) => {
                    const result = formatter(entry.value, entry.name, entry);
                    const [formattedValue, formattedName] = Array.isArray(result) ? result : [result, entry.name];
                    return (
                        <div key={idx} className="flex items-center gap-2">
                            <span
                                className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: entry.color || entry.fill || '#6366f1' }}
                            />
                            <span className="text-white/70">{formattedName}:</span>
                            <span className="ml-auto font-semibold tabular-nums text-white">
                                {formattedValue}
                                {unit && <span className="ml-0.5 text-white/60">{unit}</span>}
                            </span>
                        </div>
                    );
                })}
            </div>

            {showTotal && total !== null && (
                <div className="mt-2 flex items-center justify-between border-t border-white/20 pt-1.5 text-xs text-white/80">
                    <span className="uppercase tracking-wider">Toplam</span>
                    <span className="font-semibold tabular-nums">
                        {total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        {unit && <span className="ml-0.5 text-white/60">{unit}</span>}
                    </span>
                </div>
            )}
        </div>
    );
}
