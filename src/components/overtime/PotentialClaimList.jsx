import React, { useMemo } from 'react';
import { ArrowLeft, Zap, Clock, AlertCircle } from 'lucide-react';
import WeeklyOTLimitBar from './WeeklyOTLimitBar';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 dk';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} sa ${m} dk`;
  if (h > 0) return `${h} saat`;
  return `${m} dk`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${days[d.getDay()]}`;
}

const OT_TYPE_LABELS = {
  POST_SHIFT: { label: 'Vardiya Sonrası', cls: 'bg-blue-100 text-blue-700' },
  PRE_SHIFT: { label: 'Vardiya Öncesi', cls: 'bg-purple-100 text-purple-700' },
  OFF_DAY: { label: 'Tatil Günü', cls: 'bg-orange-100 text-orange-700' },
  MIXED: { label: 'Karışık', cls: 'bg-slate-100 text-slate-700' },
};

export default function PotentialClaimList({ items, weeklyStatus, onBack, onClaim, claimingId }) {
  const dayGroups = useMemo(() => {
    const groups = {};
    const claimable = items.filter(i => i.can_claim || i.is_rejected);
    claimable.forEach(item => {
      const key = item.date;
      if (!groups[key]) {
        groups[key] = { date: key, items: [], totalSeconds: 0, isRejected: false, rejectionReason: '' };
      }
      groups[key].items.push(item);
      groups[key].totalSeconds += item.actual_overtime_seconds || 0;
      if (item.is_rejected) {
        groups[key].isRejected = true;
        groups[key].rejectionReason = item.rejection_reason || '';
      }
    });
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [items]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <Zap className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-slate-800">Planlanmamış Ek Mesailer</h3>
        <span className="text-xs text-slate-400 ml-auto">{dayGroups.length} gün</span>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
        {dayGroups.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Talep edilebilir planlanmamış mesai yok
          </div>
        ) : dayGroups.map((group) => {
          const loading = claimingId === group.date;
          const otType = group.items[0]?.ot_type;
          const typeInfo = OT_TYPE_LABELS[otType] || null;

          return (
            <div key={group.date}
              className={`p-4 rounded-xl border transition-all ${
                group.isRejected
                  ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/30'
                  : 'border-amber-200 bg-white hover:shadow-sm'
              }`}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold text-slate-800 text-sm">{formatDate(group.date)}</span>
                {typeInfo && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeInfo.cls}`}>
                    {typeInfo.label}
                  </span>
                )}
                {group.items.length > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {group.items.length} segment
                  </span>
                )}
                {group.isRejected && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium ml-auto">
                    Reddedildi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-2 text-sm text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Toplam: <b>{formatDuration(group.totalSeconds)}</b>
              </div>

              <div className="space-y-1 ml-1">
                {group.items.map((seg) => (
                  <label key={seg.overtime_request_id}
                    className="flex items-center gap-2 text-sm text-slate-600 py-0.5">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      data-seg-id={seg.overtime_request_id}
                    />
                    <span>
                      {seg.start_time} – {seg.end_time}
                      <span className="text-slate-400 ml-1.5">
                        ({formatDuration(seg.actual_overtime_seconds)})
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {group.isRejected && group.rejectionReason && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-red-50 text-red-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {group.rejectionReason}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button type="button"
                  onClick={() => onClaim(group)}
                  disabled={loading}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${loading ? 'bg-slate-100 text-slate-400 cursor-wait' :
                      'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow'
                    }`}>
                  {loading ? 'Gönderiliyor...' : group.isRejected ? 'Tekrar Talep Et →' : 'Talep Et →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
