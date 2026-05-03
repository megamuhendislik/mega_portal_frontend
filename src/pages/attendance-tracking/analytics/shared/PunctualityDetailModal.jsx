import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, ChevronDown, ChevronRight, Search, Award, AlertCircle } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

/**
 * PunctualityDetailModal — Dakiklik hesabını adim adim gosterir.
 *
 * Per-employee per-day:
 *   - vardiya basi (shift_start)
 *   - tolerans dk
 *   - ilk check_in
 *   - fark (dk)
 *   - dakik mi? (yesil tik / kirmizi caprzaz)
 *   - tatil/off / kayit yok durumu
 */
export default function PunctualityDetailModal({ open, onClose }) {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(new Set());

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        Promise.resolve().then(() => { if (!cancelled) setLoading(true); });
        api.get('/attendance-analytics/punctuality-detail/', { params: queryParams, timeout: 30000 })
            .then((res) => { if (!cancelled) setData(res.data); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, queryParams]);

    const filtered = useMemo(() => {
        if (!data?.employees) return [];
        if (!search) return data.employees;
        const q = search.toLocaleLowerCase('tr');
        return data.employees.filter((e) =>
            (e.name || '').toLocaleLowerCase('tr').includes(q)
            || (e.department || '').toLocaleLowerCase('tr').includes(q)
        );
    }, [data, search]);

    const toggle = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50/60 to-blue-50/60">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md">
                        <Clock size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-slate-800">Dakiklik Detayı — Hesaplama Şeffaflığı</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Her kişi için günlük: vardiya başı, ilk check-in, fark (dk), dakik mi? · Tatil/off günler hesaba katılmaz
                        </p>
                    </div>
                    {data?.summary && (
                        <div className="text-right pr-2">
                            <div className="text-2xl font-black text-emerald-600 tabular-nums">%{data.summary.pct}</div>
                            <div className="text-[10px] text-slate-500 tabular-nums">
                                {data.summary.punctual_days} / {data.summary.total_days} gün
                            </div>
                        </div>
                    )}
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                {/* Search bar */}
                <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ad veya departman ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">
                        {filtered.length} kişi
                    </span>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400 text-sm">Yükleniyor…</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">Veri yok</div>
                    ) : (
                        <div className="space-y-1.5">
                            {filtered.map((emp) => {
                                const isOpen = expanded.has(emp.employee_id);
                                const pct = emp.pct;
                                const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#6366f1' : pct >= 50 ? '#f59e0b' : '#ef4444';
                                return (
                                    <div key={emp.employee_id} className="border border-slate-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => toggle(emp.employee_id)}
                                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors"
                                        >
                                            <span className="text-slate-400">
                                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </span>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="text-[12px] font-bold text-slate-800 truncate">{emp.name}</div>
                                                <div className="text-[10px] text-slate-500 truncate">{emp.department}</div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="text-sm font-black tabular-nums" style={{ color }}>
                                                    %{pct}
                                                </div>
                                                <div className="text-[9px] text-slate-400 tabular-nums">
                                                    {emp.punctual_days}/{emp.total_days}
                                                </div>
                                            </div>
                                        </button>
                                        {isOpen && (
                                            <div className="border-t border-slate-100 bg-slate-50/40">
                                                <table className="w-full text-[11px]">
                                                    <thead>
                                                        <tr className="text-[9px] text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                                                            <th className="text-left py-1.5 px-2.5">Tarih</th>
                                                            <th className="text-left py-1.5 px-2">Gün</th>
                                                            <th className="text-left py-1.5 px-2">Vardiya</th>
                                                            <th className="text-center py-1.5 px-2">Tolerans</th>
                                                            <th className="text-left py-1.5 px-2">İlk Giriş</th>
                                                            <th className="text-right py-1.5 px-2">Fark</th>
                                                            <th className="text-center py-1.5 px-2">Sonuç</th>
                                                            <th className="text-left py-1.5 px-2">Not</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {emp.days.map((d, i) => (
                                                            <tr key={i} className={`border-b border-slate-100 last:border-b-0 ${d.is_punctual === false ? 'bg-rose-50/40' : ''}`}>
                                                                <td className="py-1 px-2.5 tabular-nums text-slate-700 font-medium">{d.date}</td>
                                                                <td className="py-1 px-2 text-slate-500">{d.day_name}</td>
                                                                <td className="py-1 px-2 tabular-nums text-slate-600">{d.shift_start || '—'}</td>
                                                                <td className="py-1 px-2 text-center tabular-nums text-slate-500">
                                                                    {d.tolerance_min ? `${d.tolerance_min}dk` : '—'}
                                                                </td>
                                                                <td className="py-1 px-2 tabular-nums text-slate-700 font-bold">{d.first_checkin || '—'}</td>
                                                                <td className="py-1 px-2 text-right tabular-nums">
                                                                    {d.diff_min == null ? '—' :
                                                                        d.diff_min > 0 ? <span className="text-rose-600">+{d.diff_min}dk</span> :
                                                                        d.diff_min < 0 ? <span className="text-emerald-600">{d.diff_min}dk</span> :
                                                                        <span className="text-slate-500">0dk</span>}
                                                                </td>
                                                                <td className="py-1 px-2 text-center">
                                                                    {d.is_punctual === true && <Award size={12} className="inline text-emerald-500" />}
                                                                    {d.is_punctual === false && <AlertCircle size={12} className="inline text-rose-500" />}
                                                                    {d.is_punctual == null && <span className="text-slate-300">—</span>}
                                                                </td>
                                                                <td className="py-1 px-2 text-[10px] text-slate-500">{d.note || ''}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer — formul aciklama */}
                <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500">
                    <b>Formül:</b> Her gün için <code>ilk_giris {'<='} vardiya_basi + tolerans_dk</code> ise <b className="text-emerald-700">DAKİK</b>, değilse <b className="text-rose-700">GEÇ</b>.
                    Vardiya/tolerans FiscalCalendar'dan, kişi başına farklı olabilir. Tatil/Off günler sayılmaz.
                </div>
            </div>
        </div>
    );
}
