import React, { useState, useMemo } from 'react';
import { ArrowLeft, CalendarCheck, Zap, AlertTriangle } from 'lucide-react';
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

function calcSegSeconds(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff * 60;
}

// Tüm item'ların iç segment'lerini düz listeye aç
function flattenSegments(items) {
  const result = [];
  for (const item of items) {
    const segs = item.segments;
    if (segs && Array.isArray(segs) && segs.length > 1) {
      // Birden fazla iç segment — her birini ayrı göster
      segs.forEach((s, i) => {
        result.push({
          id: `${item.overtime_request_id}_${i}`,
          requestId: item.overtime_request_id,
          start: s.start,
          end: s.end,
          seconds: calcSegSeconds(s.start, s.end),
        });
      });
    } else {
      // Tek segment — item'ın kendi start/end'ini kullan
      result.push({
        id: `${item.overtime_request_id}_0`,
        requestId: item.overtime_request_id,
        start: item.start_time,
        end: item.end_time,
        seconds: item.actual_overtime_seconds || 0,
      });
    }
  }
  return result;
}

export default function ClaimConfirmPanel({
  type,
  claimTarget,
  weeklyStatus,
  approvers,
  onBack,
  onConfirm,
  submitting,
}) {
  const isIntended = type === 'intended';
  const [reason, setReason] = useState('');
  const [selectedApproverId, setSelectedApproverId] = useState(
    approvers.length === 1 ? approvers[0].id : null
  );
  const [sendToSubstitute, setSendToSubstitute] = useState(false);

  // items = dayGroup'taki POTENTIAL kayıtlar
  const rawItems = isIntended ? [] : (claimTarget?.items || []);
  // Segment'leri aç — her iç segment ayrı checkbox olur
  const displaySegments = useMemo(() => flattenSegments(rawItems), [rawItems]);

  const [selectedSegIds, setSelectedSegIds] = useState(
    () => new Set(displaySegments.map(s => s.id))
  );

  const toggleSegment = (id) => {
    setSelectedSegIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalSeconds = useMemo(() => {
    if (isIntended) {
      return claimTarget?.actual_overtime_seconds || 0;
    }
    return displaySegments
      .filter(s => selectedSegIds.has(s.id))
      .reduce((sum, s) => sum + s.seconds, 0);
  }, [isIntended, claimTarget, displaySegments, selectedSegIds]);

  const projectedHours = totalSeconds / 3600;
  const willExceed = weeklyStatus && !weeklyStatus.is_unlimited
    && (weeklyStatus.used_hours + projectedHours) > weeklyStatus.limit_hours;

  const canConfirm = totalSeconds > 0 && !submitting && !willExceed
    && (approvers.length <= 1 || selectedApproverId)
    && reason.trim().length > 0;

  const date = claimTarget?.date;
  const TypeIcon = isIntended ? CalendarCheck : Zap;
  const typeLabel = isIntended ? 'Planlanmış' : 'Planlanmamış';

  const handleConfirm = () => {
    const selectedSegs = displaySegments.filter(s => selectedSegIds.has(s.id));
    const selectedRequestIds = [...new Set(selectedSegs.map(s => s.requestId))];
    const allRequestIds = [...new Set(rawItems.map(i => i.overtime_request_id))];
    const excludedIds = allRequestIds.filter(id => !selectedRequestIds.includes(id));

    // Seçili segment saat bilgilerini backend'e gönder (kısmi claim için)
    const selectedSegmentTimes = selectedSegs.map(s => ({ start: s.start, end: s.end }));
    const allSegmentCount = displaySegments.length;
    const isPartialClaim = selectedSegs.length < allSegmentCount;

    onConfirm({
      type,
      claimTarget,
      reason,
      target_approver_id: selectedApproverId,
      send_to_substitute: sendToSubstitute,
      selected_ids: selectedRequestIds,
      excluded_ids: excludedIds,
      selected_segments: isPartialClaim ? selectedSegmentTimes : null,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <TypeIcon className={`w-5 h-5 ${isIntended ? 'text-emerald-600' : 'text-amber-600'}`} />
        <h3 className="font-bold text-slate-800">Talep Onayı</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{formatDate(date)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isIntended ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {typeLabel}
          </span>
        </div>

        {/* Segment checkbox'ları */}
        {displaySegments.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-2">
              Segmentler ({selectedSegIds.size}/{displaySegments.length} seçili)
            </div>
            <div className="space-y-1.5">
              {displaySegments.map(seg => (
                <label key={seg.id}
                  className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-white cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSegIds.has(seg.id)}
                      onChange={() => toggleSegment(seg.id)}
                      className={`w-4 h-4 rounded border-slate-300 ${
                        isIntended ? 'text-emerald-600 focus:ring-emerald-500' : 'text-amber-600 focus:ring-amber-500'
                      }`}
                    />
                    <span className="font-medium">{seg.start} – {seg.end}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{formatDuration(seg.seconds)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-slate-700">
          Toplam: <b>{formatDuration(totalSeconds)}</b>
        </div>

        <WeeklyOTLimitBar weeklyStatus={weeklyStatus} projectedHours={projectedHours} />

        {willExceed && (
          <div className="flex items-center gap-1.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Bu talep haftalık limiti aşacak! Segment seçimini azaltın.
          </div>
        )}

        {approvers.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Yönetici</label>
            <select value={selectedApproverId || ''}
              onChange={e => setSelectedApproverId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Seçiniz...</option>
              {approvers.map(a => (
                <option key={a.id} value={a.id}>
                  {a.full_name} ({a.relationship_type === 'PRIMARY' ? 'Birincil' : 'İkincil'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            rows={2} placeholder="Ek mesai nedeni..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={sendToSubstitute}
            onChange={e => setSendToSubstitute(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          Vekil yöneticiye de gönder
        </label>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
        <button type="button" onClick={onBack}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
          İptal
        </button>
        <button type="button" onClick={handleConfirm}
          disabled={!canConfirm}
          className={`px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-all
            ${isIntended
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
            }
            disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}>
          {submitting ? 'Gönderiliyor...' : 'Talep Et'}
        </button>
      </div>
    </div>
  );
}
