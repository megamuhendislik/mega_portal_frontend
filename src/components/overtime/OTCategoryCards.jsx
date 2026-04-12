import React from 'react';
import { CalendarCheck, Zap, PenLine } from 'lucide-react';

const CARD_STYLES = {
  green: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/80',
    hoverBg: 'hover:from-emerald-100 hover:to-emerald-200/80',
    border: 'border-emerald-200/60 hover:border-emerald-300',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-200/60',
    badge: 'bg-emerald-600 text-white',
    rejBadge: 'bg-red-100 text-red-700',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/80',
    hoverBg: 'hover:from-amber-100 hover:to-amber-200/80',
    border: 'border-amber-200/60 hover:border-amber-300',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-200/60',
    badge: 'bg-amber-600 text-white',
    rejBadge: 'bg-red-100 text-red-700',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/80',
    hoverBg: 'hover:from-blue-100 hover:to-blue-200/80',
    border: 'border-blue-200/60 hover:border-blue-300',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-200/60',
    badge: 'bg-blue-600 text-white',
    rejBadge: 'bg-red-100 text-red-700',
  },
};

function CategoryCard({ label, subtitle, icon: Icon, color, count, rejectedCount, onClick }) {
  const s = CARD_STYLES[color];
  const isEmpty = (count === 0 || count === undefined) && !rejectedCount;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-2 p-5 rounded-2xl border
        transition-all duration-200 cursor-pointer text-center
        hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]
        ${s.bg} ${s.hoverBg} ${s.border}
        ${isEmpty ? 'opacity-60' : ''}
      `}
    >
      <div className={`w-14 h-14 rounded-2xl ${s.iconBg} flex items-center justify-center`}>
        <Icon className={`w-7 h-7 ${s.icon}`} />
      </div>
      <span className="font-bold text-slate-800 text-sm">{label}</span>
      {count > 0 && (
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${s.badge}`}>
          {count} adet
        </span>
      )}
      {rejectedCount > 0 && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.rejBadge}`}>
          {rejectedCount} reddedildi
        </span>
      )}
      {isEmpty && color !== 'blue' && (
        <span className="text-xs text-slate-400">Talep edilebilir mesai yok</span>
      )}
      <span className="text-[11px] text-slate-400">{subtitle}</span>
    </button>
  );
}

export default function OTCategoryCards({ intendedCount, intendedRejCount, potentialCount, potentialRejCount, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <CategoryCard
        label="Planlanmış"
        subtitle="Yönetici ataması"
        icon={CalendarCheck}
        color="green"
        count={intendedCount}
        rejectedCount={intendedRejCount}
        onClick={() => onSelect('intended')}
      />
      <CategoryCard
        label="Planlanmamış"
        subtitle="Sistem algıladı"
        icon={Zap}
        color="amber"
        count={potentialCount}
        rejectedCount={potentialRejCount}
        onClick={() => onSelect('potential')}
      />
      <CategoryCard
        label="Manuel Giriş"
        subtitle="Kart kaydı olmadan"
        icon={PenLine}
        color="blue"
        onClick={() => onSelect('manual')}
      />
    </div>
  );
}
