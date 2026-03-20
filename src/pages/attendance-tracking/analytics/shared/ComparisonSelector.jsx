import React from 'react';
import { Select } from 'antd';
import { GitCompare } from 'lucide-react';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';

const MODES = [
    { value: 'none', label: 'Karsilastirma Yok' },
    { value: 'vs_employee', label: 'Calisan vs Calisan' },
    { value: 'vs_team_avg', label: 'Calisan vs Ekip Ort.' },
    { value: 'vs_period', label: 'Donem vs Donem' },
];

export default function ComparisonSelector({ employees = [] }) {
    const { comparisonMode, setComparisonMode, comparisonEmployees, setComparisonEmployees } = useAnalyticsFilter();

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
                <GitCompare size={14} className="text-slate-400" />
                <Select
                    value={comparisonMode}
                    onChange={setComparisonMode}
                    options={MODES}
                    size="small"
                    className="min-w-[180px]"
                    popupMatchSelectWidth={false}
                />
            </div>
            {(comparisonMode === 'vs_employee' || comparisonMode === 'vs_team_avg') && (
                <Select
                    mode="multiple"
                    value={comparisonEmployees}
                    onChange={(val) => setComparisonEmployees(val.slice(0, 3))}
                    options={employees.map(e => ({ value: e.id, label: e.name }))}
                    size="small"
                    placeholder="Calisan sec (maks 3)"
                    className="min-w-[250px]"
                    maxTagCount={3}
                    popupMatchSelectWidth={false}
                />
            )}
        </div>
    );
}
