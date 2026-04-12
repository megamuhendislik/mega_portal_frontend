import React from 'react';
import { CalendarCheck, Zap, PenLine, ChevronRight } from 'lucide-react';

function CategoryCard({ label, description, icon: Icon, iconBg, iconColor, borderColor, count, rejectedCount, onClick }) {
  const total = (count || 0) + (rejectedCount || 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 p-4 rounded-xl border-2 bg-white
        transition-all duration-200 cursor-pointer text-left
        hover:shadow-lg active:scale-[0.98]
        ${borderColor}
      `}
    >
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900 text-[15px]">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        <div className="flex items-center gap-2 mt-1.5">
          {total > 0 ? (
            <>
              <span className="text-xs font-semibold text-slate-700">
                {total} talep edilebilir
              </span>
              {rejectedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                  {rejectedCount} red
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400">
              {label === 'Manuel Giriş' ? 'Sadece acil durumlar için' : 'Henüz talep yok'}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
    </button>
  );
}

export default function OTCategoryCards({ intendedCount, intendedRejCount, potentialCount, potentialRejCount, onSelect }) {
  return (
    <div className="space-y-3">
      <CategoryCard
        label="Planlanmış"
        description="Yönetici tarafından atanan ek mesailer"
        icon={CalendarCheck}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
        borderColor="border-emerald-200 hover:border-emerald-400"
        count={intendedCount}
        rejectedCount={intendedRejCount}
        onClick={() => onSelect('intended')}
      />
      <CategoryCard
        label="Planlanmamış"
        description="Kart okuyucudan algılanan fazla mesailer"
        icon={Zap}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        borderColor="border-amber-200 hover:border-amber-400"
        count={potentialCount}
        rejectedCount={potentialRejCount}
        onClick={() => onSelect('potential')}
      />
      <CategoryCard
        label="Manuel Giriş"
        description="Acil durumlar için. Evden mesai → Şirket Dışı Görev kullanın"
        icon={PenLine}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        borderColor="border-blue-200 hover:border-blue-400"
        onClick={() => onSelect('manual')}
      />
    </div>
  );
}
