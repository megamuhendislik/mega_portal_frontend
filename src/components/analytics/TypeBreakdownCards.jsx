import { Calendar, Zap, Utensils, CreditCard, HeartPulse } from 'lucide-react';
import clsx from 'clsx';

const TYPES = [
  {
    key: 'leave',
    label: 'Izin',
    icon: Calendar,
    color: '#3B82F6',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    key: 'overtime',
    label: 'Ek Mesai',
    icon: Zap,
    color: '#F59E0B',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  {
    key: 'meal',
    label: 'Yemek',
    icon: Utensils,
    color: '#10B981',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    key: 'cardless',
    label: 'Kartsiz Giris',
    icon: CreditCard,
    color: '#8B5CF6',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
  },
  {
    key: 'health_report',
    label: 'Saglik Raporu',
    icon: HeartPulse,
    color: '#EC4899',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
  },
];

export default function TypeBreakdownCards({ summary, healthReport }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {TYPES.map((type) => {
        const Icon = type.icon;
        let total = 0;
        let approved = 0;
        let rejected = 0;
        let pending = 0;

        if (type.key === 'health_report') {
          if (healthReport) {
            total = healthReport.total || 0;
            approved = healthReport.health_report_count || healthReport.approved || 0;
            pending = healthReport.pending || 0;
            rejected = total - approved - pending;
            if (rejected < 0) rejected = 0;
          }
        } else {
          const data = summary[type.key];
          if (data) {
            total = data.total || 0;
            approved = data.approved || 0;
            rejected = data.rejected || 0;
            pending = data.pending || 0;
          }
        }

        const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

        return (
          <div
            key={type.key}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  type.bg
                )}
              >
                <Icon className={clsx('w-4 h-4', type.text)} />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {type.label}
              </span>
            </div>

            <p className="text-2xl font-bold text-gray-800 mb-2">
              {total.toLocaleString('tr-TR')}
            </p>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {approved > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                  {approved} onay
                </span>
              )}
              {rejected > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                  {rejected} red
                </span>
              )}
              {pending > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                  {pending} bekleyen
                </span>
              )}
            </div>

            {/* Approval progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${approvalRate}%`,
                  backgroundColor: type.color,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              %{approvalRate} onay orani
            </p>
          </div>
        );
      })}
    </div>
  );
}
