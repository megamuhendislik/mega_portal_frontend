import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconGradient = 'from-blue-500 to-blue-600',
  children,
  collapsible = true,
  defaultOpen = true,
  badge,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div
        className={clsx(
          'flex items-center justify-between px-5 py-4',
          collapsible && 'cursor-pointer select-none'
        )}
        onClick={() => collapsible && setOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={clsx(
                'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                iconGradient
              )}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 truncate">
                {title}
              </h3>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {collapsible && (
          <ChevronDown
            className={clsx(
              'w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0',
              open ? 'rotate-0' : '-rotate-90'
            )}
          />
        )}
      </div>

      {/* Body */}
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
