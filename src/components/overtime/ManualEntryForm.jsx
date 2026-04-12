import React, { useMemo } from 'react';
import { ArrowLeft, PenLine, AlertTriangle } from 'lucide-react';
import WeeklyOTLimitBar from './WeeklyOTLimitBar';

function calcDurationHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

function formatDurationFromHours(hours) {
  if (!hours || hours <= 0) return '';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0 && m > 0) return `${h} sa ${m} dk`;
  if (h > 0) return `${h} saat`;
  return `${m} dk`;
}

export default function ManualEntryForm({
  weeklyStatus,
  form, setForm,
  approvers, selectedApproverId, onApproverSelect,
  onBack, onSubmit, submitting,
}) {
  const durHours = useMemo(() => calcDurationHours(form.start_time, form.end_time), [form.start_time, form.end_time]);
  const projected = (weeklyStatus?.used_hours || 0) + durHours;
  const willExceed = weeklyStatus && !weeklyStatus.is_unlimited && projected > weeklyStatus.limit_hours;

  const canSubmit = form.date && form.start_time && form.end_time && form.reason?.trim() && durHours > 0
    && !submitting && !willExceed
    && (approvers.length <= 1 || selectedApproverId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <PenLine className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-slate-800">Manuel Ek Mesai Girişi</h3>
      </div>

      <WeeklyOTLimitBar weeklyStatus={weeklyStatus} projectedHours={durHours} />

      <div className="flex-1 overflow-y-auto mt-4 space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Kart kaydı olmayan durumlar içindir. Vardiya saatleriyle çakışan girişler reddedilecektir.</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç</label>
            <input type="time" value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş</label>
            <input type="time" value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {durHours > 0 && (
          <div className="text-sm text-slate-600">
            Süre: <b>{formatDurationFromHours(durHours)}</b>
            {weeklyStatus && !weeklyStatus.is_unlimited && (
              <span className={`ml-2 ${willExceed ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                → Haftalık: {projected.toFixed(1)}/{weeklyStatus.limit_hours} sa
              </span>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama *</label>
          <textarea value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            rows={3} placeholder="Ek mesai nedeni..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {approvers.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Yönetici</label>
            <select value={selectedApproverId || ''}
              onChange={e => onApproverSelect(e.target.value ? Number(e.target.value) : null)}
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

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.send_to_substitute || false}
            onChange={e => setForm(f => ({ ...f, send_to_substitute: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-300"
          />
          Vekil yöneticiye de gönder
        </label>

        {willExceed && (
          <div className="flex items-center gap-1.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Bu talep haftalık limiti aşacak!
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
        <button type="button" onClick={onBack}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
          İptal
        </button>
        <button type="button" onClick={onSubmit}
          disabled={!canSubmit}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm
            disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all">
          {submitting ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    </div>
  );
}
