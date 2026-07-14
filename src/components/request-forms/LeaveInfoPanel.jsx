import { useMemo, useState, useEffect } from 'react';
import { Gift, ChevronUp, ChevronDown } from 'lucide-react';
import SmartDatePicker from '../common/SmartDatePicker';
import { advanceSuffix } from '../../utils/leaveBalance';
import api from '../../services/api';

// NOT: anahtarlar LeaveTypeSelector'ın ürettiği gerçek kodlarla (SPECIAL:PATERNITY
// vb, _LEAVE eki YOK) eşleşmeli — eski _LEAVE'li anahtarlar hiç eşleşmiyordu.
const specialMaxDays = {
  'SPECIAL:PATERNITY': 5,
  'SPECIAL:BEREAVEMENT': 3,
  'SPECIAL:MARRIAGE': 3,
  'SPECIAL:UNPAID': null,
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
    // Sabit süreli özel izinler: yalnız başlangıç seçilir (bitişi sunucu iş-günü
    // bazlı hesaplar). Ücretsiz izin (SPECIAL:UNPAID) ve yıllık aralık kalır.
    if (leaveType && leaveType.startsWith('SPECIAL:') && leaveType !== 'SPECIAL:UNPAID') return 'single';
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

  // Özel izin iş-günü önizlemesi (sunucudan; bordroyla birebir). Debounced.
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  useEffect(() => {
    if (!leaveType || !leaveType.startsWith('SPECIAL:') || !leaveForm.start_date) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    const code = leaveType.split(':')[1];
    if (code === 'UNPAID' && !leaveForm.end_date) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = { leave_type: code, start_date: leaveForm.start_date };
        if (code === 'UNPAID') params.end_date = leaveForm.end_date;
        const res = await api.get('/special-leaves/date-preview/', { params });
        if (!cancelled) setPreview(res.data);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [leaveType, leaveForm.start_date, leaveForm.end_date]);

  const coveredDays = useMemo(
    () => (preview?.days || []).filter(d => !d.is_off_day).map(d => d.date),
    [preview]);
  const fmtDate = (s) => (s
    ? new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    : '');

  // --- Bölüm B: Bakiye kartı render ---
  const renderBalanceCard = () => {
    if (leaveType === 'ANNUAL_LEAVE') {
      return (
        <div className="bg-blue-50/80 rounded-xl p-3 flex justify-between items-center">
          <span className="text-xs font-medium text-slate-500">İzin Bakiyesi</span>
          <span className="text-lg font-bold text-blue-700">
            {leaveBalance?.net_balance ?? leaveBalance?.available ?? 0} gün
            {leaveBalance?.advance_limit > 0 && (
              <span className="ml-1 text-xs font-semibold text-amber-600">
                {advanceSuffix({ limit: leaveBalance?.advance_limit, used: leaveBalance?.advance_used, remaining: leaveBalance?.advance_remaining })}
              </span>
            )}
          </span>
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
        <div className="bg-amber-50/80 rounded-xl p-3 space-y-2">
          {/* Bakiye — tek satır */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Mazeret İzni</span>
            <span className="text-sm font-bold text-amber-700">{fmtH(remaining)} kalan</span>
          </div>
          <div className="w-full bg-amber-200/50 rounded-full h-1.5">
            <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{fmtH(used)} kullanıldı</span>
            <span>{fmtH(total)} toplam</span>
          </div>
          {/* Gün detayı — gün seçilince inline */}
          {leaveForm.start_date && si && !si.is_off_day && si.shift_start && (
            <div className="pt-1.5 border-t border-amber-200/40 space-y-0.5 text-[11px]">
              <div className="flex justify-between"><span className="text-slate-500">Vardiya</span><span className="text-slate-600">{si.shift_start}–{si.shift_end}</span></div>
              {si.lunch_start && <div className="flex justify-between"><span className="text-slate-500">Öğle</span><span className="text-slate-600">{si.lunch_start}–{si.lunch_end}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Maks.</span><span className="text-amber-600 font-medium">4sa 30dk</span></div>
            </div>
          )}
          {leaveForm.start_date && si?.is_off_day && (
            <div className="pt-1.5 border-t border-red-200/40 text-xs text-red-600 font-medium">Çalışma günü değil</div>
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
      const offList = (preview?.days || []).filter(d => d.is_off_day);
      return (
        <div className="bg-purple-50/80 rounded-xl p-3 text-sm text-purple-700 space-y-1.5">
          <div>{maxDays ? `Maksimum süre: ${maxDays} gün` : 'Ücretsiz izin — süre sınırı yok'}</div>
          {previewLoading && <div className="text-xs text-slate-400">Hesaplanıyor…</div>}
          {preview && (
            <div className="pt-1.5 border-t border-purple-200/40 text-xs text-slate-600 space-y-0.5">
              {maxDays && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Bitiş</span>
                  <span className="font-medium text-slate-700">{fmtDate(preview.end_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">{maxDays ? 'İş günü' : 'Çalışılan gün'}</span>
                <span className="font-medium text-purple-700">{preview.total_days} gün</span>
              </div>
              {offList.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  {offList.length} off günü sayılmadı: {offList.slice(0, 3).map(d => fmtDate(d.date)).join(', ')}{(offList.length > 3 || preview.truncated) ? '…' : ''}
                </div>
              )}
              {!maxDays && preview.total_days === 0 && (
                <div className="text-red-600 font-medium">Seçilen aralıkta çalışılan gün yok — izin oluşturulamaz.</div>
              )}
            </div>
          )}
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
          className="md:hidden w-full flex items-center justify-between text-sm text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors mb-2"
        >
          <span className="font-medium">Takvim</span>
          {calendarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className={`${calendarOpen ? 'block' : 'hidden'} md:block`}>
          <SmartDatePicker
            compact
            mode={calendarMode}
            value={calendarMode === 'single'
              ? leaveForm.start_date
              : [leaveForm.start_date, leaveForm.end_date]}
            onChange={handleDateChange}
            holidays={holidays}
            leaveHistory={calendarLeaveHistory}
            highlightDates={calendarMode === 'single' ? coveredDays : []}
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
