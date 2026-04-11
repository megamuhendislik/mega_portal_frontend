import { useMemo, useState } from 'react';
import { Gift, ChevronUp, ChevronDown } from 'lucide-react';
import SmartDatePicker from '../common/SmartDatePicker';

const specialMaxDays = {
  'SPECIAL:PATERNITY_LEAVE': 5,
  'SPECIAL:BEREAVEMENT_LEAVE': 3,
  'SPECIAL:MARRIAGE_LEAVE': 3,
  'SPECIAL:UNPAID_LEAVE': null,
};

const statusColors = {
  APPROVED: 'bg-emerald-500',
  PENDING: 'bg-amber-500',
  ESCALATED: 'bg-indigo-500',
};

export default function LeaveInfoPanel({
  leaveType,
  leaveForm,
  setLeaveForm,
  leaveBalance,
  excuseBalance,
  entitlementInfo,
  recentLeaveHistory = [],
  holidays = [],
  calendarLeaveHistory = [],
}) {
  const calendarMode = useMemo(() => {
    if (['EXCUSE_LEAVE', 'BIRTHDAY_LEAVE'].includes(leaveType)) return 'single';
    return 'range';
  }, [leaveType]);

  const accentColor = useMemo(() => {
    if (leaveType === 'ANNUAL_LEAVE') return 'blue';
    if (leaveType === 'EXCUSE_LEAVE') return 'orange';
    if (leaveType === 'BIRTHDAY_LEAVE') return 'pink';
    return 'purple';
  }, [leaveType]);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d.toISOString().split('T')[0];
  }, []);

  const handleDateChange = (val) => {
    if (calendarMode === 'single') {
      setLeaveForm(prev => ({ ...prev, start_date: val, end_date: val }));
    } else {
      if (Array.isArray(val)) {
        setLeaveForm(prev => ({ ...prev, start_date: val[0], end_date: val[1] }));
      }
    }
  };

  const activeLeaves = useMemo(() => {
    return recentLeaveHistory
      .filter(l => ['PENDING', 'APPROVED', 'ESCALATED'].includes(l.status))
      .slice(0, 5);
  }, [recentLeaveHistory]);

  // --- Bölüm B: Bakiye kartı render ---
  const renderBalanceCard = () => {
    if (leaveType === 'ANNUAL_LEAVE') {
      return (
        <div className="bg-blue-50/80 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">İzin Bakiyesi</span>
            <span className="text-lg font-bold text-blue-700">{leaveBalance?.available || 0} gün</span>
          </div>
          {leaveBalance?.advance_used > 0 && (
            <div className="flex justify-between text-xs text-amber-600">
              <span>Avans Kullanılan</span>
              <span>{leaveBalance.advance_used} gün</span>
            </div>
          )}
          {entitlementInfo?.next_accrual_date && (
            <div className="text-xs text-slate-400 mt-1">
              Yenileme: {new Date(entitlementInfo.next_accrual_date).toLocaleDateString('tr-TR')}
            </div>
          )}
        </div>
      );
    }

    if (leaveType === 'EXCUSE_LEAVE') {
      const used = excuseBalance?.used_hours || 0;
      const total = excuseBalance?.total_hours || 18;
      const pct = Math.min(100, (used / total) * 100);
      return (
        <div className="bg-amber-50/80 rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-slate-500">Mazeret İzni</span>
            <span className="text-sm font-bold text-amber-700">
              {excuseBalance?.remaining_hours || 0} / {total} saat
            </span>
          </div>
          <div className="w-full bg-amber-200/50 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    }

    if (leaveType === 'BIRTHDAY_LEAVE') {
      return (
        <div className="bg-pink-50/80 rounded-xl p-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-pink-500" />
          <span className="text-sm text-pink-700">1 gün doğum günü izni hakkınız var</span>
        </div>
      );
    }

    // SPECIAL: izinler
    if (leaveType && leaveType.startsWith('SPECIAL:')) {
      const maxDays = specialMaxDays[leaveType];
      return (
        <div className="bg-purple-50/80 rounded-xl p-3 text-sm text-purple-700">
          {maxDays
            ? `Maksimum süre: ${maxDays} gün`
            : 'Ücretsiz izin — süre sınırı yok'}
        </div>
      );
    }

    return null;
  };

  const [calendarOpen, setCalendarOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      {/* Bölüm A: Kompakt Takvim */}
      <div>
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="lg:hidden w-full flex items-center justify-between text-sm text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors mb-2"
        >
          <span className="font-medium">Takvim</span>
          {calendarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className={`${calendarOpen ? 'block' : 'hidden'} lg:block`}>
          <SmartDatePicker
            compact
            mode={calendarMode}
            value={calendarMode === 'single'
              ? leaveForm.start_date
              : [leaveForm.start_date, leaveForm.end_date]}
            onChange={handleDateChange}
            holidays={holidays}
            leaveHistory={calendarLeaveHistory}
            minDate={minDate}
            accentColor={accentColor}
          />
        </div>
      </div>

      {/* Bölüm B: Bakiye Kartı */}
      <div>{renderBalanceCard()}</div>

      {/* Bölüm C: Son İzinler */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-slate-500">Son İzinler</div>
        {activeLeaves.length > 0 ? (
          activeLeaves.map(leave => (
            <div key={leave.id} className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[leave.status] || 'bg-slate-300'}`} />
              <span className="text-slate-600 truncate">
                {new Date(leave.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                {leave.end_date && leave.end_date !== leave.start_date &&
                  ` — ${new Date(leave.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`
                }
              </span>
              <span className="text-slate-400 truncate">{leave.request_type_display}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400 italic">Bu dönemde izin kaydı yok</div>
        )}
      </div>
    </div>
  );
}
