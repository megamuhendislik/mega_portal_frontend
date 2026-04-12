import React, { useMemo } from 'react';
import { ArrowLeft, Zap, Clock, AlertCircle } from 'lucide-react';

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

function calcSegDuration(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff * 60; // seconds
}

function formatTimeDuration(start, end) {
  const secs = calcSegDuration(start, end);
  return formatDuration(secs);
}

const OT_TYPE_LABELS = {
  POST_SHIFT: { label: 'Vardiya Sonrası', cls: 'bg-blue-100 text-blue-700' },
  PRE_SHIFT: { label: 'Vardiya Öncesi', cls: 'bg-purple-100 text-purple-700' },
  OFF_DAY: { label: 'Tatil Günü', cls: 'bg-orange-100 text-orange-700' },
  MIXED: { label: 'Karışık', cls: 'bg-slate-100 text-slate-700' },
};

// Bir POTENTIAL item'ından gösterilebilir segment listesi çıkar
function getDisplaySegments(item) {
  // segments JSON varsa ve birden fazla segment içeriyorsa, onları göster
  const segs = item.segments;
  if (segs && Array.isArray(segs) && segs.length > 1) {
    return segs.map((s, i) => ({
      id: `${item.overtime_request_id}_seg${i}`,
      start: s.start,
      end: s.end,
      durationSeconds: calcSegDuration(s.start, s.end),
    }));
  }
  // Tek segment veya segments yoksa, start_time/end_time kullan
  return [{
    id: `${item.overtime_request_id}_seg0`,
    start: item.start_time,
    end: item.end_time,
    durationSeconds: item.actual_overtime_seconds || 0,
  }];
}

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

          // Tüm item'ların segment'lerini aç
          const allSegments = group.items.flatMap(item => getDisplaySegments(item));
          const totalSegCount = allSegments.length;

          return (
            <div key={group.date}
              className={`p-4 rounded-xl border transition-all ${
                group.isRejected
                  ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/30'
                  : 'border-amber-200 bg-white hover:shadow-sm'
              }`}>
              {/* Üst satır */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold text-slate-800 text-sm">{formatDate(group.date)}</span>
                {typeInfo && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeInfo.cls}`}>
                    {typeInfo.label}
                  </span>
                )}
                {totalSegCount > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {totalSegCount} segment
                  </span>
                )}
                {group.isRejected && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium ml-auto">
                    Reddedildi
                  </span>
                )}
              </div>

              {/* Toplam süre */}
              <div className="flex items-center gap-1.5 mb-2 text-sm text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Toplam: <b>{formatDuration(group.totalSeconds)}</b>
              </div>

              {/* Segment listesi — her segment ayrı satır */}
              <div className="space-y-1 ml-1">
                {allSegments.map((seg) => (
                  <div key={seg.id}
                    className="flex items-center gap-2 text-sm text-slate-600 py-0.5 px-2 rounded-lg bg-slate-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-medium">{seg.start} – {seg.end}</span>
                    <span className="text-slate-400 text-xs">
                      ({formatTimeDuration(seg.start, seg.end)})
                    </span>
                  </div>
                ))}
              </div>

              {/* Red nedeni */}
              {group.isRejected && group.rejectionReason && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-red-50 text-red-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {group.rejectionReason}
                </div>
              )}

              {/* Talep Et butonu */}
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
