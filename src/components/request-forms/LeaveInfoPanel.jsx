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
  workingDaysInfo,
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
        <div className="bg-blue-50/80 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs font-medium text-slate-500">İzin Bakiyesi</span>
          <span className="text-lg font-bold text-blue-700">{leaveBalance?.available || 0} gün</span>
        </div>
      );
    }

    if (leaveType === 'EXCUSE_LEAVE') {
      const remaining = excuseBalance?.hours_remaining ?? excuseBalance?.remaining_hours ?? 0;
      const used = excuseBalance?.hours_used ?? excuseBalance?.used_hours ?? 0;
      const total = excuseBalance?.hours_entitled ?? excuseBalance?.total_hours ?? 18;
      const pct = Math.min(100, (used / total) * 100);
      const fmtH = (v) => { const h = Math.floor(v); const m = Math.round((v - h) * 60); return m > 0 ? `${h}sa ${m}dk` : `${h} saat`; };
      const si = excuseBalance?.schedule_info;
      return (
        <div className="space-y-3">
          {/* Bakiye kartı — kompakt */}
          <div className="bg-amber-50/80 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-500">Mazeret İzni</span>
              <span className="text-sm font-bold text-amber-700">{fmtH(remaining)} kalan</span>
            </div>
            <div className="w-full bg-amber-200/50 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{fmtH(used)} kullanıldı</span>
              <span>{fmtH(total)} toplam</span>
            </div>
          </div>

          {/* Gün detayı — takvimde gün seçilince gösterilir */}
          {leaveForm.start_date && si && !si.is_off_day && (
            <div className="bg-white/80 rounded-xl p-3 space-y-1.5 border border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-400">Seçili Gün</span>
              {si.shift_start && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Vardiya</span>
                  <span className="font-medium text-slate-700">{si.shift_start} – {si.shift_end}</span>
                </div>
              )}
              {si.lunch_start && si.lunch_end && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Öğle Arası</span>
                  <span className="text-slate-700">{si.lunch_start} – {si.lunch_end}</span>
                </div>
              )}
              {si.shift_start && si.shift_end && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200/40">
                  <span className="text-slate-500">Net Çalışma</span>
                  <span className="font-semibold text-amber-700">
                    {(() => {
                      const [ssH, ssM] = si.shift_start.split(':').map(Number);
                      const [seH, seM] = si.shift_end.split(':').map(Number);
                      let mins = (seH * 60 + seM) - (ssH * 60 + ssM);
                      if (si.lunch_start && si.lunch_end) {
                        const [lsH, lsM] = si.lunch_start.split(':').map(Number);
                        const [leH, leM] = si.lunch_end.split(':').map(Number);
                        mins -= (leH * 60 + leM) - (lsH * 60 + lsM);
                      }
                      const h = Math.floor(mins / 60); const m = mins % 60;
                      return m > 0 ? `${h}sa ${m}dk` : `${h} saat`;
                    })()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Günlük Maks.</span>
                <span className="text-amber-600">4sa 30dk</span>
              </div>
            </div>
          )}

          {/* Tatil/izin günü uyarısı */}
          {leaveForm.start_date && si?.is_off_day && (
            <div className="bg-red-50/80 rounded-xl p-3 text-sm text-red-700 font-medium">
              Bu tarih çalışma günü değil
            </div>
          )}
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
    <div className="flex flex-col gap-3">
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

      {/* Bölüm B: Bakiye Kartı — sabit min yükseklik */}
      <div className="min-h-[44px]">{renderBalanceCard()}</div>

      {/* Bölüm C: Son İzinler — sabit 5 satır alanı */}
      <div className="min-h-[100px]">
        <div className="text-xs font-medium text-slate-500 mb-1.5">Son İzinler</div>
        {recentLeaveHistory.length === 0 && activeLeaves.length === 0 ? (
          /* Veri henüz yüklenmedi veya hiç yok — sabit placeholder */
          <div className="space-y-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : activeLeaves.length > 0 ? (
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
