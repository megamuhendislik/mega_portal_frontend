import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';

const gridClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

export default function KPIGrid({ items = [], columns }) {
  if (!items || items.length === 0) return null;

  const colClass = columns
    ? gridClasses[columns] || 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';

  return (
    <div className={clsx('grid gap-3', colClass)}>
      {items.map((item, idx) => {
        const Icon = item.icon;
        const hasDelta = item.delta !== undefined && item.delta !== null;
        const isPositive = hasDelta && item.delta >= 0;

        return (
          <div
            key={idx}
            className={clsx(
              'relative overflow-hidden rounded-xl p-4 bg-gradient-to-br text-white min-h-[100px]',
              item.gradient || 'from-blue-500 to-blue-600'
            )}
          >
            {/* Watermark icon */}
            {Icon && (
              <Icon className="absolute -right-2 -bottom-2 w-16 h-16 text-white/10" />
            )}

            <div className="relative z-10">
              <p className="text-xs font-medium text-white/80 mb-1 truncate">
                {item.title}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {typeof item.value === 'number'
                    ? item.value.toLocaleString('tr-TR')
                    : item.value}
                </span>
                {item.suffix && (
                  <span className="text-sm font-medium text-white/70">
                    {item.suffix}
                  </span>
                )}
              </div>

              {hasDelta && (
                <div className="flex items-center gap-1 mt-1.5">
                  {isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-200" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-200" />
                  )}
                  <span
                    className={clsx(
                      'text-xs font-medium',
                      isPositive ? 'text-emerald-200' : 'text-red-200'
                    )}
                  >
                    {item.delta > 0 ? '+' : ''}
                    {item.delta}
                    {item.deltaSuffix || ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
