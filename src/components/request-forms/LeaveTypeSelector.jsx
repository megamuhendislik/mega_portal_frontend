import { useState } from 'react';
import {
  Calendar,
  Clock,
  Gift,
  FileText,
  ChevronRight,
  ChevronDown,
  Baby,
  Heart,
  Sparkles,
  Ban,
} from 'lucide-react';

const ICON_WRAPPER_COLORS = {
  blue: 'bg-blue-100 group-hover:bg-blue-200',
  amber: 'bg-amber-100 group-hover:bg-amber-200',
  pink: 'bg-pink-100 group-hover:bg-pink-200',
  purple: 'bg-purple-100 group-hover:bg-purple-200',
  indigo: 'bg-indigo-100 group-hover:bg-indigo-200',
  slate: 'bg-slate-100 group-hover:bg-slate-200',
  rose: 'bg-rose-100 group-hover:bg-rose-200',
  gray: 'bg-gray-100 group-hover:bg-gray-200',
};

const ICON_COLORS = {
  blue: 'text-blue-600',
  amber: 'text-amber-600',
  pink: 'text-pink-600',
  purple: 'text-purple-600',
  indigo: 'text-indigo-600',
  slate: 'text-slate-600',
  rose: 'text-rose-600',
  gray: 'text-gray-600',
};

const BORDER_COLORS = {
  blue: 'hover:border-blue-200',
  amber: 'hover:border-amber-200',
  pink: 'hover:border-pink-200',
  purple: 'hover:border-purple-200',
  indigo: 'hover:border-indigo-200',
  slate: 'hover:border-slate-200',
  rose: 'hover:border-rose-200',
  gray: 'hover:border-gray-200',
};

const SPECIAL_LEAVES = [
  { code: 'SPECIAL:PATERNITY_LEAVE', label: 'Babalık İzni', icon: Baby, color: 'indigo' },
  { code: 'SPECIAL:BEREAVEMENT_LEAVE', label: 'Ölüm İzni', icon: Heart, color: 'slate' },
  { code: 'SPECIAL:MARRIAGE_LEAVE', label: 'Evlilik İzni', icon: Sparkles, color: 'rose' },
  { code: 'SPECIAL:UNPAID_LEAVE', label: 'Ücretsiz İzin', icon: Ban, color: 'gray' },
];

function LeaveCard({ label, icon: Icon, color, balanceText, onClick, disabled, chevron }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-transparent
                 bg-white/60 backdrop-blur-sm hover:scale-[1.02] hover:shadow-md
                 ${BORDER_COLORS[color]} active:scale-[0.98]
                 transition-all duration-200 text-left group
                 ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none' : ''}`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                    ${ICON_WRAPPER_COLORS[color]}`}
      >
        <Icon className={`w-6 h-6 ${ICON_COLORS[color]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{balanceText}</div>
      </div>
      {chevron || (
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
      )}
    </button>
  );
}

function SmallLeaveCard({ label, icon: Icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-transparent
                 bg-white/60 backdrop-blur-sm hover:scale-[1.02] hover:shadow-md
                 ${BORDER_COLORS[color]} active:scale-[0.98]
                 transition-all duration-200 text-left group`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                    ${ICON_WRAPPER_COLORS[color]}`}
      >
        <Icon className={`w-5 h-5 ${ICON_COLORS[color]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm">{label}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
    </button>
  );
}

export default function LeaveTypeSelector({
  onSelect,
  leaveBalance,
  excuseBalance,
  birthdayBalance,
}) {
  const [expandedSpecial, setExpandedSpecial] = useState(false);

  const showBirthday = birthdayBalance && birthdayBalance.eligible !== false;
  const birthdayDisabled = birthdayBalance?.already_used === true;

  return (
    <div className="space-y-3">
      {/* 1 - Yıllık İzin */}
      <LeaveCard
        label="Yıllık İzin"
        icon={Calendar}
        color="blue"
        balanceText={`Kalan: ${leaveBalance?.available || 0} gün`}
        onClick={() => onSelect('ANNUAL_LEAVE')}
      />

      {/* 2 - Mazeret İzni */}
      <LeaveCard
        label="Mazeret İzni"
        icon={Clock}
        color="amber"
        balanceText={`Kalan: ${excuseBalance?.remaining_hours || 0} saat`}
        onClick={() => onSelect('EXCUSE_LEAVE')}
      />

      {/* 3 - Doğum Günü İzni */}
      {showBirthday && (
        <LeaveCard
          label="Doğum Günü İzni"
          icon={Gift}
          color="pink"
          balanceText={birthdayDisabled ? 'Kullanıldı' : '1 gün hakkınız var'}
          onClick={() => !birthdayDisabled && onSelect('BIRTHDAY_LEAVE')}
          disabled={birthdayDisabled}
        />
      )}

      {/* 4 - Özel İzinler */}
      <LeaveCard
        label="Özel İzinler"
        icon={FileText}
        color="purple"
        balanceText="Babalık, Ölüm, Evlilik, Ücretsiz"
        onClick={() => setExpandedSpecial((prev) => !prev)}
        chevron={
          expandedSpecial ? (
            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )
        }
      />

      {/* Özel İzinler Alt Kartları */}
      <div
        className={`overflow-hidden transition-all duration-250 ease-in-out
                    ${expandedSpecial ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
      >
        <div className="pl-6 space-y-2">
          {SPECIAL_LEAVES.map((item) => (
            <SmallLeaveCard
              key={item.code}
              label={item.label}
              icon={item.icon}
              color={item.color}
              onClick={() => onSelect(item.code)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
