import React from 'react';
import { AlertTriangle } from 'lucide-react';

const getBarColor = (pct) => {
  if (pct >= 85) return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
  if (pct >= 60) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
};

export default function WeeklyOTLimitBar({ weeklyStatus, projectedHours = 0, compact = false }) {
  if (!weeklyStatus || weeklyStatus.is_unlimited) return null;

  const { limit_hours, used_hours, remaining_hours, window_start, window_end } = weeklyStatus;
  const pctUsed = Math.min(100, Math.round((used_hours / limit_hours) * 100));
  const projected = used_hours + projectedHours;
  const pctProjected = Math.min(100, Math.round((projected / limit_hours) * 100));
  const willExceed = projected > limit_hours;
  const colors = getBarColor(pctUsed);
  const projColors = projectedHours > 0 ? getBarColor(pctProjected) : null;

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.border} border`}>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${pctUsed}%` }} />
        </div>
        <span className={`text-xs font-medium ${colors.text}`}>{used_hours}/{limit_hours} sa</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-sm font-semibold ${colors.text}`}>
          Haftalık Limit: {used_hours} / {limit_hours} sa
        </span>
        <span className="text-xs text-slate-500">
          {fmtDate(window_start)} – {fmtDate(window_end)}
        </span>
      </div>

      <div className="h-2.5 bg-white/60 rounded-full overflow-hidden mb-1">
        <div className={`h-full ${colors.bar} rounded-full transition-all duration-300`} style={{ width: `${pctUsed}%` }} />
      </div>

      {projectedHours > 0 && (
        <>
          <div className="flex items-center justify-between mt-2 mb-1">
            <span className={`text-xs font-medium ${projColors.text}`}>
              Talep sonrası: {projected.toFixed(1)} / {limit_hours} sa
            </span>
            <span className={`text-xs ${projColors.text}`}>
              Kalan: {Math.max(0, limit_hours - projected).toFixed(1)} sa
            </span>
          </div>
          <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
            <div className={`h-full ${projColors.bar} rounded-full transition-all duration-300`} style={{ width: `${pctProjected}%` }} />
          </div>
        </>
      )}

      {willExceed && (
        <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          Bu talep haftalık limiti aşacak!
        </div>
      )}

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-slate-400">%{pctUsed} kullanıldı</span>
        <span className={`text-xs ${colors.text}`}>Kalan: {remaining_hours} sa</span>
      </div>
    </div>
  );
}
