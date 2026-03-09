import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';

const CHIPS = [
  { key: 'delta_total', label: 'Toplam Talep', suffix: '' },
  { key: 'delta_approval_rate', label: 'Onay Orani', suffix: '%' },
  { key: 'delta_overtime_hours', label: 'Mesai Saati', suffix: 's' },
  { key: 'delta_leave_days', label: 'Izin Gunu', suffix: 'g' },
];

export default function ComparisonBanner({ comparison }) {
  if (!comparison) return null;

  const chips = CHIPS.filter(
    (c) => comparison[c.key] !== undefined && comparison[c.key] !== null
  );

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-xs font-medium text-gray-500 mr-1">
        Onceki Doneme Gore
      </span>
      {chips.map((chip) => {
        const val = comparison[chip.key];
        const isPositive = val >= 0;

        return (
          <div
            key={chip.key}
            className={clsx(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
              isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>
              {val > 0 ? '+' : ''}
              {typeof val === 'number' ? val.toLocaleString('tr-TR') : val}
              {chip.suffix}
            </span>
            <span className="text-gray-500">{chip.label}</span>
          </div>
        );
      })}
    </div>
  );
}
