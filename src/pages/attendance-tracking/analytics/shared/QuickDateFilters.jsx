import React from 'react';
import { DatePicker } from 'antd';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';

const FILTERS = [
    { key: 'this_week', label: 'Bu Hafta' },
    { key: 'last_7', label: 'Son 7 Gün' },
    { key: 'last_30', label: 'Son 30 Gün' },
    { key: 'this_month', label: 'Bu Ay' },
    { key: 'last_month', label: 'Geçen Ay' },
];

export default function QuickDateFilters() {
    const { quickFilter, setQuickFilter, setCustomRange } = useAnalyticsFilter();

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setQuickFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            quickFilter === f.key
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            <DatePicker.RangePicker
                size="small"
                onChange={(dates) => {
                    if (dates) {
                        setCustomRange({
                            start: dates[0].format('YYYY-MM-DD'),
                            end: dates[1].format('YYYY-MM-DD'),
                        });
                        setQuickFilter('custom');
                    }
                }}
                className="rounded-lg"
                placeholder={['Başlangıç', 'Bitiş']}
            />
        </div>
    );
}
