import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
    formatOvertimeSeconds,
    formatWarningDate,
    getNonWorkingDayOvertimeWarnings,
} from './nonWorkingDayOvertimeUtils';

const NonWorkingDayOvertimeWarning = ({ source, className = '' }) => {
    const warnings = getNonWorkingDayOvertimeWarnings(source);
    if (warnings.length === 0) return null;
    const ruleTexts = [...new Set(warnings.map(warning => warning.ruleText).filter(Boolean))];

    return (
        <div className={`rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 ${className}`.trim()}>
            <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="min-w-0">
                    <p className="text-sm font-bold">İzin / rapor gününde fazla mesai</p>
                    <div className="mt-0.5 space-y-1 text-xs leading-5 text-amber-800">
                        {ruleTexts.map(ruleText => (
                            <p key={ruleText}>{ruleText}</p>
                        ))}
                    </div>
                    <ul className="mt-2 space-y-1 text-xs">
                        {warnings.map((warning, index) => (
                            <li key={`${warning.date}-${index}`} className="font-medium">
                                {formatWarningDate(warning.date)}
                                {warning.status?.label ? ` · ${warning.status.label}` : ''}
                                {warning.overtimeSeconds > 0
                                    ? ` · ${formatOvertimeSeconds(warning.overtimeSeconds)} fazla mesai`
                                    : ''}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default NonWorkingDayOvertimeWarning;
