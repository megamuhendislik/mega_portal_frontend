import React from 'react';
import { ArrowLeft, CalendarCheck, User, Clock, FileText, AlertCircle } from 'lucide-react';
import WeeklyOTLimitBar from './WeeklyOTLimitBar';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
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

export default function IntendedClaimList({ items, weeklyStatus, onBack, onClaim, claimingId }) {
  const claimable = items.filter(i => i.can_claim || i.is_rejected);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <CalendarCheck className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-slate-800">Planlanmış Ek Mesailer</h3>
        <span className="text-xs text-slate-400 ml-auto">{claimable.length} adet</span>
      </div>

      <WeeklyOTLimitBar weeklyStatus={weeklyStatus} compact />

      <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
        {claimable.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Talep edilebilir planlanmış mesai yok
          </div>
        ) : claimable.map((item) => {
          const isRejected = item.is_rejected;
          const actualDur = formatDuration(item.actual_overtime_seconds);
          const loading = claimingId === item.assignment_id;

          return (
            <div key={item.assignment_id}
              className={`p-4 rounded-xl border transition-all ${
                isRejected
                  ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/30'
                  : 'border-emerald-200 bg-white hover:shadow-sm'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 text-sm">{formatDate(item.date)}</span>
                {isRejected && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    Reddedildi
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {item.manager_name}
                  <span className="text-slate-300 mx-1">·</span>
                  <span className="text-slate-500">Maks: {item.max_duration_hours} sa</span>
                </div>
                {item.task_description && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{item.task_description}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {actualDur
                    ? <span>Gerçekleşen: <b>{actualDur}</b></span>
                    : <span className="text-slate-400 italic">Henüz gerçekleşen mesai yok</span>
                  }
                </div>
                {item.shift_start_time && (
                  <div className="text-xs text-slate-400">
                    Vardiya: {item.shift_start_time}-{item.shift_end_time}
                    {item.check_out_time && ` → Çıkış: ${item.check_out_time}`}
                  </div>
                )}
              </div>

              {isRejected && item.rejection_reason && (
                <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-red-50 text-red-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {item.rejection_reason}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button type="button"
                  onClick={() => onClaim(item)}
                  disabled={loading || (!actualDur && !isRejected)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${loading ? 'bg-slate-100 text-slate-400 cursor-wait' :
                      'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow'
                    }
                    disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
                  `}>
                  {loading ? 'Gönderiliyor...' : isRejected ? 'Tekrar Talep Et →' : 'Talep Et →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
