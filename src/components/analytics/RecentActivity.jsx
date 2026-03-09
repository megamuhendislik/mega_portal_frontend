import {
  Calendar,
  Zap,
  Utensils,
  CreditCard,
  HeartPulse,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

const TYPE_CONFIG = {
  leave: { icon: Calendar, bg: 'bg-blue-100', text: 'text-blue-600' },
  overtime: { icon: Zap, bg: 'bg-amber-100', text: 'text-amber-600' },
  meal: { icon: Utensils, bg: 'bg-emerald-100', text: 'text-emerald-600' },
  cardless: { icon: CreditCard, bg: 'bg-purple-100', text: 'text-purple-600' },
  health_report: { icon: HeartPulse, bg: 'bg-pink-100', text: 'text-pink-600' },
};

const STATUS_COLORS = {
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Onaylandi' },
  ORDERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Siparis' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Reddedildi' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Iptal' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Bekliyor' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function RecentActivity({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {data.map((item, idx) => {
        const typeCfg = TYPE_CONFIG[item.type] || {
          icon: FileText,
          bg: 'bg-gray-100',
          text: 'text-gray-600',
        };
        const statusCfg = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
        const Icon = typeCfg.icon;

        return (
          <div
            key={idx}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {/* Type icon */}
            <div
              className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                typeCfg.bg
              )}
            >
              <Icon className={clsx('w-4 h-4', typeCfg.text)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">
                <span className="font-medium">{item.type_label || item.type}</span>
                {item.summary && (
                  <span className="text-gray-500"> - {item.summary}</span>
                )}
              </p>
            </div>

            {/* Status badge */}
            <span
              className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                statusCfg.bg,
                statusCfg.text
              )}
            >
              {statusCfg.label}
            </span>

            {/* Date */}
            <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
              {formatDate(item.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
