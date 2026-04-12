import React, { useState } from 'react';
import { Zap, Download, Search, AlertTriangle, CheckCircle2, Ghost } from 'lucide-react';
import api from '../../../services/api';

function getDefaultDateFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 60);
  return d.toISOString().slice(0, 10);
}
function getDefaultDateTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function PotentialAuditTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/system/health-check/potential-audit/', {
        date_from: dateFrom,
        date_to: dateTo,
        employee_id: employeeId || null,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const exportTxt = () => {
    if (!result) return;
    const lines = [];
    lines.push('=== POTENTIAL OT AUDIT REPORT ===');
    lines.push(`Tarih: ${result.date_range.start} — ${result.date_range.end}`);
    lines.push(`Çalışan: ${result.employee_id || 'Tümü'}`);
    lines.push(`Toplam POTENTIAL: ${result.total_potentials}`);
    lines.push(`Geçerli (kart verisi var): ${result.valid_count}`);
    lines.push(`Hayalet (kart verisi yok): ${result.phantom_count}`);
    lines.push(`Attendance kaydı yok: ${result.no_attendance_count}`);
    lines.push(`Süre: ${result.elapsed_seconds} sn`);
    lines.push('');
    lines.push('─'.repeat(100));

    for (const r of result.records) {
      lines.push('');
      lines.push(`${r.is_phantom ? '👻 HAYALET' : '✅ GEÇERLİ'} | POTENTIAL #${r.potential_id}`);
      lines.push(`  Çalışan: ${r.employee_name} (ID: ${r.employee_id})`);
      lines.push(`  Tarih: ${r.date}`);
      lines.push(`  Mesai: ${r.start_time || '?'} – ${r.end_time || '?'} (${r.duration_hours} sa)`);
      lines.push(`  Sebep: ${r.reason}`);
      lines.push(`  Segment: ${JSON.stringify(r.segments)}`);
      lines.push(`  Group Key: ${r.group_key || '-'}`);
      lines.push(`  Bağlı Attendance ID: ${r.linked_attendance_id || 'YOK'}`);
      lines.push(`  Attendance Sayısı: ${r.attendance_count}`);
      lines.push(`  Kart Verisi: ${r.has_card_data ? 'VAR' : 'YOK'}`);
      lines.push(`  Toplam Kart Süresi: ${Math.round((r.total_card_seconds || 0) / 60)} dk`);

      if (r.card_entries && r.card_entries.length > 0) {
        lines.push('  Kart Kayıtları:');
        for (const ce of r.card_entries) {
          lines.push(`    - Att#${ce.attendance_id}: ${ce.check_in || '?'}–${ce.check_out || '?'} | source=${ce.source} status=${ce.status} | ${Math.round((ce.total_seconds || 0) / 60)}dk çalışma, ${Math.round((ce.overtime_seconds || 0) / 60)}dk OT${ce.is_overtime_record ? ' [OT_RECORD]' : ''}`);
        }
      } else {
        lines.push('  Kart Kayıtları: HİÇ YOK');
      }
      lines.push('─'.repeat(100));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `potential_audit_${dateFrom}_${dateTo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filtreler */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Potansiyel Ek Mesai Denetimi
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          POTENTIAL statüsündeki ek mesai kayıtlarını gerçek kart okuyucu verileriyle karşılaştırır.
          Hayalet (kart verisi olmayan) kayıtları tespit eder.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Başlangıç</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bitiş</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Çalışan ID (opsiyonel)</label>
            <input type="number" value={employeeId} onChange={e => setEmployeeId(e.target.value)}
              placeholder="Tümü" className="px-3 py-2 border rounded-lg text-sm w-28" />
          </div>
          <button onClick={runAudit} disabled={loading}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Taranıyor...' : 'Denetle'}
          </button>
          {result && (
            <button onClick={exportTxt}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              TXT İndir
            </button>
          )}
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
      </div>

      {/* Özet */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{result.total_potentials}</div>
            <div className="text-xs text-slate-500 mt-1">Toplam POTENTIAL</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{result.valid_count}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Geçerli
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{result.phantom_count}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <Ghost className="w-3.5 h-3.5" /> Hayalet
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{result.no_attendance_count}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Attendance Yok
            </div>
          </div>
        </div>
      )}

      {/* Detay listesi */}
      {result && result.records.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Durum</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Çalışan</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Tarih</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Mesai Saati</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Süre</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Kart Kayıtları</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Sebep</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.records.map((r) => (
                  <tr key={r.potential_id} className={r.is_phantom ? 'bg-red-50/50' : ''}>
                    <td className="px-4 py-3">
                      {r.is_phantom ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          <Ghost className="w-3 h-3" /> Hayalet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Geçerli
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div>{r.employee_name}</div>
                      <div className="text-[10px] text-slate-400">ID: {r.employee_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.date}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.start_time} – {r.end_time}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.duration_hours} sa</td>
                    <td className="px-4 py-3">
                      {r.card_entries.length === 0 ? (
                        <span className="text-red-500 text-xs">Kayıt yok</span>
                      ) : (
                        <div className="space-y-0.5">
                          {r.card_entries.map((ce, i) => (
                            <div key={i} className="text-[11px] text-slate-600">
                              {ce.check_in || '?'}–{ce.check_out || '?'}
                              <span className="text-slate-400 ml-1">({ce.source})</span>
                              {ce.is_overtime_record && <span className="text-amber-600 ml-1">[OT]</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && result.records.length === 0 && (
        <div className="bg-white rounded-xl border p-10 text-center text-slate-400">
          Bu tarih aralığında POTENTIAL kayıt bulunamadı.
        </div>
      )}
    </div>
  );
}
