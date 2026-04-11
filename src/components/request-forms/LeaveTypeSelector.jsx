import { useState } from 'react';
import {
  Calendar,
  Clock,
  Gift,
  FileText,
  Baby,
  Heart,
  Sparkles,
  Ban,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const SPECIAL_LEAVES = [
  { code: 'SPECIAL:PATERNITY_LEAVE', label: 'Babalık İzni', icon: Baby, color: 'indigo' },
  { code: 'SPECIAL:BEREAVEMENT_LEAVE', label: 'Ölüm İzni', icon: Heart, color: 'slate' },
  { code: 'SPECIAL:MARRIAGE_LEAVE', label: 'Evlilik İzni', icon: Sparkles, color: 'rose' },
  { code: 'SPECIAL:UNPAID_LEAVE', label: 'Ücretsiz İzin', icon: Ban, color: 'gray' },
];

// Purge-safe static class maps
const CARD_STYLES = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/80',
    hoverBg: 'hover:from-blue-100 hover:to-blue-200/80',
    border: 'border-blue-200/60 hover:border-blue-300',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-200/60',
    badge: 'bg-blue-600 text-white',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/80',
    hoverBg: 'hover:from-amber-100 hover:to-amber-200/80',
    border: 'border-amber-200/60 hover:border-amber-300',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-200/60',
    badge: 'bg-amber-600 text-white',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100/80',
    hoverBg: 'hover:from-pink-100 hover:to-pink-200/80',
    border: 'border-pink-200/60 hover:border-pink-300',
    icon: 'text-pink-600',
    iconBg: 'bg-pink-200/60',
    badge: 'bg-pink-600 text-white',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/80',
    hoverBg: 'hover:from-purple-100 hover:to-purple-200/80',
    border: 'border-purple-200/60 hover:border-purple-300',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-200/60',
    badge: 'bg-purple-600 text-white',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/80',
    hoverBg: 'hover:from-indigo-100 hover:to-indigo-200/80',
    border: 'border-indigo-200/60 hover:border-indigo-300',
    icon: 'text-indigo-600',
    iconBg: 'bg-indigo-200/60',
    badge: 'bg-indigo-600 text-white',
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100/80',
    hoverBg: 'hover:from-slate-100 hover:to-slate-200/80',
    border: 'border-slate-200/60 hover:border-slate-300',
    icon: 'text-slate-600',
    iconBg: 'bg-slate-200/60',
    badge: 'bg-slate-600 text-white',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100/80',
    hoverBg: 'hover:from-rose-100 hover:to-rose-200/80',
    border: 'border-rose-200/60 hover:border-rose-300',
    icon: 'text-rose-600',
    iconBg: 'bg-rose-200/60',
    badge: 'bg-rose-600 text-white',
  },
  gray: {
    bg: 'bg-gradient-to-br from-gray-50 to-gray-100/80',
    hoverBg: 'hover:from-gray-100 hover:to-gray-200/80',
    border: 'border-gray-200/60 hover:border-gray-300',
    icon: 'text-gray-600',
    iconBg: 'bg-gray-200/60',
    badge: 'bg-gray-600 text-white',
  },
};

function LeaveCard({ label, icon: Icon, color, balanceText, onClick, disabled }) {
  const s = CARD_STYLES[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border
                 ${s.bg} ${s.hoverBg} ${s.border}
                 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]
                 transition-all duration-200 text-center group cursor-pointer
                 ${disabled ? 'opacity-40 cursor-not-allowed !scale-100 !shadow-none' : ''}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.iconBg} transition-colors`}>
        <Icon className={`w-7 h-7 ${s.icon}`} />
      </div>
      <div>
        <div className="font-semibold text-slate-800 text-sm">{label}</div>
        <div className="text-xs text-slate-500 mt-1">{balanceText}</div>
      </div>
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

  const birthdayNotEligible = birthdayBalance && birthdayBalance.eligible === false;
  const birthdayUsed = birthdayBalance?.already_used === true;
  const birthdayDisabled = birthdayNotEligible || birthdayUsed;

  return (
    <div className="space-y-4">
      {/* 2x2 Grid — ana izin kartları */}
      <div className="grid grid-cols-2 gap-3">
        {/* Yıllık İzin */}
        <LeaveCard
          label="Yıllık İzin"
          icon={Calendar}
          color="blue"
          balanceText={`Kalan: ${leaveBalance?.available || 0} gün`}
          onClick={() => onSelect('ANNUAL_LEAVE')}
        />

        {/* Mazeret İzni */}
        <LeaveCard
          label="Mazeret İzni"
          icon={Clock}
          color="amber"
          balanceText={`Kalan: ${excuseBalance?.hours_remaining != null ? excuseBalance.hours_remaining : (excuseBalance?.remaining_hours || 0)} saat`}
          onClick={() => onSelect('EXCUSE_LEAVE')}
        />

        {/* Doğum Günü İzni — her zaman göster, eligible değilse disabled */}
        <LeaveCard
          label="Doğum Günü İzni"
          icon={Gift}
          color="pink"
          balanceText={
            !birthdayBalance ? 'Yükleniyor...'
            : birthdayUsed ? 'Kullanıldı'
            : birthdayNotEligible ? 'Hak yok'
            : '1 gün hakkınız var'
          }
          onClick={() => !birthdayDisabled && onSelect('BIRTHDAY_LEAVE')}
          disabled={birthdayDisabled || !birthdayBalance}
        />

        {/* Özel İzinler */}
        <LeaveCard
          label="Özel İzinler"
          icon={FileText}
          color="purple"
          balanceText={expandedSpecial ? 'Seçim yapın' : 'Diğer izin türleri'}
          onClick={() => setExpandedSpecial((prev) => !prev)}
        />
      </div>

      {/* Özel İzinler — genişleyen alt kartlar (2x2 grid) */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out
                    ${expandedSpecial ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="grid grid-cols-2 gap-2 pt-1">
          {SPECIAL_LEAVES.map((item) => {
            const s = CARD_STYLES[item.color];
            return (
              <button
                key={item.code}
                onClick={() => onSelect(item.code)}
                className={`flex items-center gap-3 p-3 rounded-xl border
                           ${s.bg} ${s.hoverBg} ${s.border}
                           hover:scale-[1.02] hover:shadow-md active:scale-[0.98]
                           transition-all duration-200 text-left group cursor-pointer`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                  <item.icon className={`w-4.5 h-4.5 ${s.icon}`} />
                </div>
                <span className="font-medium text-slate-700 text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Kapat butonu */}
        <button
          onClick={() => setExpandedSpecial(false)}
          className="flex items-center justify-center gap-1 w-full mt-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>Kapat</span>
        </button>
      </div>
    </div>
  );
}
