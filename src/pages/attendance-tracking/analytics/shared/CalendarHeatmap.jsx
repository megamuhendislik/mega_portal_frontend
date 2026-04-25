import React, { useMemo } from 'react';
import { Tooltip, Empty } from 'antd';

/**
 * CalendarHeatmap — GitHub-style yıl boyu yoğunluk haritası.
 *
 * Props:
 *   data: [{ date: 'YYYY-MM-DD', value: number, ...meta }]
 *   year: number (default current)
 *   colorScale: ['#f1f5f9', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7'] (5 ton)
 *   tooltipFormat: (item) => string
 */

const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const DEFAULT_COLORS = ['#f1f5f9', '#bae6fd', '#7dd3fc', '#38bdf8', '#0284c7'];

function getQuintile(value, max) {
    if (value === 0 || max === 0) return 0;
    const ratio = value / max;
    if (ratio >= 0.8) return 4;
    if (ratio >= 0.6) return 3;
    if (ratio >= 0.4) return 2;
    if (ratio >= 0.2) return 1;
    return 0;
}

export default function CalendarHeatmap({
    data = [],
    year = new Date().getFullYear(),
    colorScale = DEFAULT_COLORS,
    tooltipFormat,
    title = 'Yıllık Yoğunluk',
}) {
    const dataMap = useMemo(() => {
        const m = new Map();
        data.forEach((d) => m.set(d.date, d));
        return m;
    }, [data]);

    const maxValue = useMemo(() => Math.max(...data.map((d) => d.value || 0), 1), [data]);

    // Tüm yılın günlerini oluştur, hafta-bazlı grid
    const weeks = useMemo(() => {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);

        // İlk pazartesiye geri sar
        const firstDay = yearStart.getDay(); // 0=Sunday
        const offsetDays = firstDay === 0 ? 6 : firstDay - 1; // Pazartesi başlangıç
        const startDate = new Date(yearStart);
        startDate.setDate(startDate.getDate() - offsetDays);

        const weeksArr = [];
        let current = new Date(startDate);
        while (current <= yearEnd) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = current.toISOString().slice(0, 10);
                const item = dataMap.get(dateStr);
                week.push({
                    date: dateStr,
                    inYear: current.getFullYear() === year,
                    value: item?.value || 0,
                    item,
                });
                current.setDate(current.getDate() + 1);
            }
            weeksArr.push(week);
        }
        return weeksArr;
    }, [year, dataMap]);

    // Ay etiketleri için her ayın hangi haftadan başladığını bul
    const monthLabels = useMemo(() => {
        const labels = [];
        let currentMonth = -1;
        weeks.forEach((week, idx) => {
            const firstInYear = week.find((d) => d.inYear);
            if (!firstInYear) return;
            const m = parseInt(firstInYear.date.slice(5, 7), 10) - 1;
            if (m !== currentMonth) {
                labels.push({ weekIdx: idx, month: m });
                currentMonth = m;
            }
        });
        return labels;
    }, [weeks]);

    if (data.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-bold text-slate-500 uppercase mb-3">{title}</div>
                <Empty description="Yıllık yoğunluk verisi yok" />
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>Az</span>
                    {colorScale.map((c, i) => (
                        <span key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                    <span>Çok</span>
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <div className="inline-block">
                    {/* Ay etiketleri */}
                    <div className="flex gap-[2px] mb-1 ml-7">
                        {weeks.map((_, weekIdx) => {
                            const label = monthLabels.find((m) => m.weekIdx === weekIdx);
                            return (
                                <div key={weekIdx} className="w-3 text-[10px] font-medium text-slate-500" style={{ minWidth: '12px' }}>
                                    {label ? TR_MONTHS_SHORT[label.month] : ''}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid: 7 satır (gün) × N kolon (hafta) */}
                    <div className="flex gap-[2px]">
                        {/* Sol gün etiketleri */}
                        <div className="flex flex-col gap-[2px] mr-1">
                            {TR_DAYS_SHORT.map((day, i) => (
                                <div key={day} className="h-3 text-[10px] font-medium text-slate-400 leading-[12px]" style={{ height: '12px' }}>
                                    {i % 2 === 0 ? day : ''}
                                </div>
                            ))}
                        </div>

                        {/* Hafta kolonları */}
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-[2px]">
                                {week.map((day, dayIdx) => {
                                    const intensity = day.value > 0 ? getQuintile(day.value, maxValue) : 0;
                                    const color = colorScale[intensity];
                                    const tooltip = day.inYear
                                        ? (tooltipFormat ? tooltipFormat(day) : `${day.date}: ${day.value || 0}`)
                                        : '';
                                    return (
                                        <Tooltip key={dayIdx} title={tooltip} placement="top" overlayStyle={{ fontSize: '11px' }}>
                                            <div
                                                className={`w-3 h-3 rounded-sm transition-all ${day.inYear ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : 'opacity-0'}`}
                                                style={{ backgroundColor: day.inYear ? color : 'transparent' }}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-3 text-[10px] text-slate-400 text-center">
                {year} yılı — toplam {data.length} günlük veri
            </div>
        </div>
    );
}
