import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const ACCENT_COLORS = {
  blue:    { bg: 'bg-blue-500',    light: 'bg-blue-100',    ring: 'ring-blue-500',    text: 'text-blue-600' },
  orange:  { bg: 'bg-orange-500',  light: 'bg-orange-100',  ring: 'ring-orange-500',  text: 'text-orange-600' },
  pink:    { bg: 'bg-pink-500',    light: 'bg-pink-100',    ring: 'ring-pink-500',    text: 'text-pink-600' },
  purple:  { bg: 'bg-purple-500',  light: 'bg-purple-100',  ring: 'ring-purple-500',  text: 'text-purple-600' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100', ring: 'ring-emerald-500', text: 'text-emerald-600' },
  indigo:  { bg: 'bg-indigo-500',  light: 'bg-indigo-100',  ring: 'ring-indigo-500',  text: 'text-indigo-600' },
};

const DOT_COLORS = {
  APPROVED:  'bg-emerald-400',
  PENDING:   'bg-amber-400',
  ESCALATED: 'bg-indigo-400',
};

function getMonthDays(year, month) {
  const lastDay = new Date(year, month + 1, 0);

  let startDow = new Date(year, month, 1).getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    days.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, month, year, isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    days.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }
  return days;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function SmartDatePicker({
  mode = 'single',
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates,
  holidays = [],
  leaveHistory = [],
  accentColor = 'blue',
  showLegend = true,
  compact = false,
  className = '',
}) {
  // Compact vs normal boyutlar
  const cellSize = compact ? 'aspect-square w-full text-xs' : 'aspect-square w-full text-sm';
  const headerSize = compact ? 'text-sm font-semibold' : 'text-base font-semibold';
  const weekdaySize = compact ? 'text-[11px]' : 'text-xs';
  const containerPadding = compact ? 'p-3' : 'p-4';
  const dotSize = compact ? 'w-1 h-1' : 'w-1.5 h-1.5';
  const navBtnSize = compact ? 'w-7 h-7' : 'w-8 h-8';
  const initialDate = useMemo(() => {
    if (mode === 'single' && value) {
      const [y, m] = value.split('-').map(Number);
      return { year: y, month: m - 1 };
    }
    if (mode === 'range' && value?.[0]) {
      const [y, m] = value[0].split('-').map(Number);
      return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);
  const [rangeStart, setRangeStart] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  const accent = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => { map[h.date] = h; });
    return map;
  }, [holidays]);

  const leaveMap = useMemo(() => {
    const map = {};
    leaveHistory.forEach(l => {
      if (!l.start_date || !l.end_date) return;
      const start = new Date(l.start_date + 'T00:00:00');
      const end = new Date(l.end_date + 'T00:00:00');
      const cur = new Date(start);
      while (cur <= end) {
        const ds = cur.toLocaleDateString('en-CA');
        if (!map[ds]) map[ds] = [];
        map[ds].push(l);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [leaveHistory]);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }), []);

  const prevMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const isDisabled = useCallback((dateStr) => {
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    if (disabledDates && disabledDates(dateStr)) return true;
    return false;
  }, [minDate, maxDate, disabledDates]);

  const isSelected = useCallback((dateStr) => {
    if (mode === 'single') return value === dateStr;
    if (mode === 'range' && value?.[0] && value?.[1]) {
      return dateStr >= value[0] && dateStr <= value[1];
    }
    return false;
  }, [mode, value]);

  const isRangeEdge = useCallback((dateStr) => {
    if (mode !== 'range' || !value) return false;
    return dateStr === value[0] || dateStr === value[1];
  }, [mode, value]);

  const isInHoverRange = useCallback((dateStr) => {
    if (mode !== 'range' || !rangeStart || !hoverDate) return false;
    const [a, b] = rangeStart < hoverDate ? [rangeStart, hoverDate] : [hoverDate, rangeStart];
    return dateStr >= a && dateStr <= b;
  }, [mode, rangeStart, hoverDate]);

  const handleDayClick = useCallback((dateStr) => {
    if (isDisabled(dateStr)) return;

    if (mode === 'single') {
      onChange?.(dateStr);
      return;
    }

    if (!rangeStart) {
      setRangeStart(dateStr);
      onChange?.([dateStr, null]);
    } else {
      const [start, end] = rangeStart <= dateStr ? [rangeStart, dateStr] : [dateStr, rangeStart];
      setRangeStart(null);
      setHoverDate(null);
      onChange?.([start, end]);
    }
  }, [mode, rangeStart, isDisabled, onChange]);

  const handleDayHover = useCallback((dateStr) => {
    if (mode === 'range' && rangeStart) {
      setHoverDate(dateStr);
    }
  }, [mode, rangeStart]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${containerPadding} select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className={`${navBtnSize} flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500`}
        >
          <ChevronLeft size={compact ? 14 : 18} />
        </button>
        <span className={`${headerSize} text-slate-700`}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className={`${navBtnSize} flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500`}
        >
          <ChevronRight size={compact ? 14 : 18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center ${weekdaySize} font-medium py-1 ${
              i >= 5 ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, idx) => {
          const dateStr = toDateStr(d.year, d.month, d.day);
          const dow = idx % 7;
          const isWeekend = dow >= 5;
          const disabled = isDisabled(dateStr);
          const selected = isSelected(dateStr);
          const edge = isRangeEdge(dateStr);
          const inHover = isInHoverRange(dateStr);
          const isToday = dateStr === todayStr;
          const holiday = holidayMap[dateStr];
          const leaves = leaveMap[dateStr];

          let bgClass = '';
          let textClass = d.isCurrentMonth ? 'text-slate-700' : 'text-slate-300';

          if (disabled) {
            textClass = 'text-slate-300';
            bgClass = 'cursor-not-allowed opacity-40';
          } else if (edge || (mode === 'single' && selected)) {
            bgClass = `${accent.bg} text-white`;
            textClass = 'text-white';
          } else if (selected && mode === 'range') {
            bgClass = accent.light;
          } else if (inHover) {
            bgClass = `${accent.light} opacity-60`;
          } else if (holiday && d.isCurrentMonth) {
            bgClass = 'bg-red-50';
            textClass = 'text-red-600';
          } else if (isWeekend && d.isCurrentMonth) {
            bgClass = 'bg-slate-50';
            textClass = 'text-slate-400';
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handleDayClick(dateStr)}
              onMouseEnter={() => handleDayHover(dateStr)}
              className={`
                relative flex flex-col items-center justify-center
                ${cellSize} rounded-lg
                transition-all duration-150
                ${bgClass}
                ${!disabled && d.isCurrentMonth ? 'hover:ring-1 hover:ring-slate-300 cursor-pointer' : ''}
                ${isToday && !selected ? `ring-2 ${accent.ring}` : ''}
              `}
              title={holiday ? holiday.name : undefined}
            >
              <span className={`leading-none font-medium ${textClass}`}>
                {d.day}
              </span>

              {leaves && d.isCurrentMonth && (
                <div className="flex gap-0.5 mt-0.5">
                  {leaves.slice(0, 3).map((l, i) => (
                    <span
                      key={i}
                      className={`${dotSize} rounded-full ${DOT_COLORS[l.status] || 'bg-slate-300'}`}
                    />
                  ))}
                </div>
              )}

              {holiday && d.isCurrentMonth && !selected && (
                <span className={`absolute top-0.5 right-0.5 ${dotSize} rounded-full bg-red-400`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && !compact && (leaveHistory.length > 0 || holidays.length > 0) && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
          {leaveHistory.some(l => l.status === 'APPROVED') && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Onaylı
            </div>
          )}
          {leaveHistory.some(l => l.status === 'PENDING') && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Bekleyen
            </div>
          )}
          {holidays.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Tatil
            </div>
          )}
        </div>
      )}
    </div>
  );
}
