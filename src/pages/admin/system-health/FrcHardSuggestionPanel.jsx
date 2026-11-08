import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { describeHardSuggestion, summarizeHardApplyResult } from './frcHardSuggestions';

function fmtDateTr(iso) {
    const [y, m, d] = String(iso || '').split('-');
    return y && m && d ? `${d}.${m}.${y}` : String(iso || '');
}

function gateText(events) {
    return (events || [])
        .map((g) => `${String(g.ts || '').slice(-8, -3) || g.ts} ${g.dir}`)
        .join(', ');
}

export function FrcHardSuggestionPanel({ suggestions, gateEvents, selectedIds }) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return null;
    return (
        <div className="p-3 bg-sky-50 border border-sky-300 rounded-lg text-sky-900">
            <h6 className="text-[10px] font-bold uppercase">Onaylı talep önerileri</h6>
            <div className="mt-1.5 space-y-1.5">
                {suggestions.map((s) => {
                    const d = describeHardSuggestion(s);
                    const selectable = s.selectable !== false;
                    const selected = selectable && selectedIds?.has(s.suggestion_id);
                    return (
                        <div key={s.suggestion_id} className="text-[11px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="font-bold">#{s.request_id}</span>
                            <span>· {d.statusLabel}</span>
                            <span>· {d.actionLabel}</span>
                            <span className="font-mono">· {d.oldText} → {d.newText}</span>
                            <span>· Aylık etki {d.effectText}</span>
                            {s.approver_name && <span>· Onaylayan: {s.approver_name}</span>}
                            {s.locked && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                    Kilitli dönem
                                </span>
                            )}
                            {!selectable && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold">
                                    Uygulanamaz (gün listeye alınmadı)
                                </span>
                            )}
                            {selected && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-200 text-sky-800 text-[10px] font-bold">
                                    Seçildi
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            {gateEvents?.length > 0 && (
                <div className="mt-1.5 font-mono text-[10px] text-sky-800">
                    Kart: {gateText(gateEvents)}
                </div>
            )}
        </div>
    );
}

export function FrcHardSuggestionChecklist({ items, selectedIds, onToggle, onClear, disabled }) {
    const { hasPermission } = useAuth();
    if (!hasPermission('SYSTEM_FULL_ACCESS')) return null;
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
        <div className="p-4 bg-sky-50 border border-sky-300 rounded-lg text-sky-900">
            <div className="text-sm font-bold">
                Onaylı talep değişiklikleri — uygulanacakları seçin
            </div>
            <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
                {items.map(({ employeeName, date, suggestion }) => {
                    const d = describeHardSuggestion(suggestion);
                    return (
                        <label
                            key={suggestion.suggestion_id}
                            className="flex items-start gap-2 text-[12px] cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                disabled={disabled}
                                checked={selectedIds.has(suggestion.suggestion_id)}
                                onChange={() => onToggle(suggestion.suggestion_id)}
                            />
                            <span>
                                {employeeName} · {fmtDateTr(date)} · #{suggestion.request_id} ·{' '}
                                <span className="font-mono">{d.oldText} → {d.newText}</span> · {d.effectText}
                            </span>
                        </label>
                    );
                })}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[12px]">
                <span className="font-bold">{selectedIds.size} seçildi</span>
                <button
                    type="button"
                    onClick={onClear}
                    disabled={disabled || selectedIds.size === 0}
                    className="px-2 py-1 rounded border border-sky-300 bg-white font-bold hover:bg-sky-100 disabled:opacity-50"
                >
                    Seçimi temizle
                </button>
            </div>
        </div>
    );
}

export function FrcHardApplyResult({ data }) {
    if (!data) return null;
    const { applied, rejected, derivedCount } = summarizeHardApplyResult(data);
    if (applied.length === 0 && rejected.length === 0) return null;
    return (
        <div className="p-3 bg-white border border-gray-300 rounded-lg text-[12px] text-gray-800 space-y-1">
            <div className="font-bold">Uygulanan öneriler: {applied.length}</div>
            {rejected.length > 0 && (
                <div>
                    <div className="font-bold">Uygulanmayan öneriler: {rejected.length}</div>
                    <div className="mt-1 space-y-0.5">
                        {rejected.map((r) => (
                            <div key={r.suggestion_id} className="text-[11px]">
                                {r.employee_name ? `${r.employee_name} · ` : ''}
                                {r.work_date ? `${fmtDateTr(r.work_date)} · ` : ''}
                                #{r.request_id} · {r.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {derivedCount > 0 && (
                <div>Bu seçim nedeniyle {derivedCount} talep daha düzeltildi.</div>
            )}
        </div>
    );
}
