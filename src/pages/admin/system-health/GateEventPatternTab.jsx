import React, { useState } from 'react';
import {
    ArrowPathIcon,
    BoltIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    UserGroupIcon,
    ClockIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const StatCard = ({ label, value, color, sub }) => (
    <div className={`rounded-2xl border p-4 ${color}`}>
        <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
);

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            {Icon && <Icon className="w-4 h-4 text-indigo-500" />}
            {title}
        </h3>
        {children}
    </div>
);

function buildTxtReport(data) {
    const lines = [];
    const sep = '='.repeat(78);
    const sub = '-'.repeat(78);
    lines.push(sep);
    lines.push('GATE EVENT PATTERN ANALİZİ');
    lines.push(sep);
    lines.push(`Çalıştırma  : ${new Date().toLocaleString('tr-TR')}`);
    lines.push(`Aralık      : Son ${data.days} gün`);
    lines.push(`Cutoff      : ${data.cutoff || '-'}`);
    lines.push('');
    lines.push(sub);
    lines.push('ÖZET');
    lines.push(sub);
    lines.push(`Toplam Event       : ${data.total_events}`);
    lines.push(`Orphan Event       : ${data.orphan_count}  (Attendance'a yansımayan)`);
    lines.push(`Top Etkilenen     : ${data.top_employees?.length || 0} çalışan`);
    lines.push(`Son Sistem Hatası : ${data.recent_errors?.length || 0} kayıt (gate_service)`);
    lines.push('');

    lines.push(sub);
    lines.push('STATUS DAĞILIMI (tüm event statüleri)');
    lines.push(sub);
    (data.status_breakdown || []).forEach((s) => {
        lines.push(`  ${String(s.cnt).padStart(6)}  ${s.status}`);
    });
    lines.push('');

    lines.push(sub);
    lines.push('ORPHAN SEBEPLERİ (Attendance match yok olan event\'ler)');
    lines.push(sub);
    if (!data.orphan_reasons?.length) {
        lines.push('  (orphan yok)');
    } else {
        data.orphan_reasons.forEach((r) => {
            lines.push(`  ${String(r.count).padStart(6)}  ${r.status}`);
        });
    }
    lines.push('');

    lines.push(sub);
    lines.push('EN ÇOK ETKİLENEN ÇALIŞANLAR (Top 10)');
    lines.push(sub);
    if (!data.top_employees?.length) {
        lines.push('  (yok)');
    } else {
        data.top_employees.forEach((e, i) => {
            lines.push(`  ${(i + 1).toString().padStart(2)}. ${e.employee_name.padEnd(35)} (ID:${e.employee_id})  ${e.orphan_count} orphan`);
        });
    }
    lines.push('');

    lines.push(sub);
    lines.push('SAATLİK DAĞILIM (orphan event\'leri)');
    lines.push(sub);
    (data.hourly_distribution || []).forEach((h) => {
        if (h.count > 0) {
            const bar = '█'.repeat(Math.min(h.count, 50));
            lines.push(`  ${String(h.hour).padStart(2, '0')}:00  ${String(h.count).padStart(4)}  ${bar}`);
        }
    });
    lines.push('');

    lines.push(sub);
    lines.push('ORPHAN ÖRNEKLERİ (ilk 50)');
    lines.push(sub);
    lines.push('  event_id                          | çalışan                    | timestamp           | dir  | status');
    if (!data.orphan_sample?.length) {
        lines.push('  (yok)');
    } else {
        data.orphan_sample.forEach((o) => {
            const eid = (o.event_id || '').padEnd(33).slice(0, 33);
            const name = (o.employee_name || '').padEnd(26).slice(0, 26);
            const ts = (o.timestamp || '').slice(0, 19);
            const dir = (o.direction || '').padEnd(4);
            const st = (o.status || '').slice(0, 50);
            lines.push(`  ${eid} | ${name} | ${ts} | ${dir} | ${st}`);
        });
    }
    lines.push('');

    lines.push(sub);
    lines.push('SON GATE_SERVICE HATALARI (SystemErrorLog)');
    lines.push(sub);
    if (!data.recent_errors?.length) {
        lines.push('  (gate_service kaynaklı hata kaydı yok — iyi)');
    } else {
        data.recent_errors.forEach((e, i) => {
            lines.push(`  [${i + 1}] ${e.last_occurrence || '-'}  ${e.level}  x${e.occurrence_count}`);
            lines.push(`      logger : ${e.logger_name}`);
            lines.push(`      msg    : ${(e.message || '').slice(0, 220)}`);
            lines.push('');
        });
    }
    lines.push(sep);
    lines.push('RAPOR SONU');
    lines.push(sep);
    return lines.join('\n');
}

function downloadTxt(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function GateEventPatternTab() {
    const [loading, setLoading] = useState(false);
    const [days, setDays] = useState(7);
    const [employeeId, setEmployeeId] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const run = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ days: String(days) });
            if (employeeId) params.set('employee_id', employeeId);
            const res = await api.get(`/system/health-check/gate-event-pattern/?${params.toString()}`, {
                timeout: 120000,
            });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Analiz çalıştırılamadı');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!data) return;
        const today = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
        downloadTxt(buildTxtReport(data), `gate_event_pattern_${today}.txt`);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <BoltIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Gate Event Pattern Analizi</h2>
                        <p className="text-xs text-gray-500">
                            Kart okuyucu olaylarının Attendance kayıtlarına yansıma oranını ve orphan event'lerin kök sebebini analiz eder.
                            'Tam Yeniden Hesaplama' raporundaki 'Raw Event Replay' bulgularının arkasındaki pattern.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3 mt-4">
                    <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Son N Gün</label>
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            <option value={1}>1 gün</option>
                            <option value={3}>3 gün</option>
                            <option value={7}>7 gün</option>
                            <option value={14}>14 gün</option>
                            <option value={30}>30 gün</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Sicil No (opsiyonel)</label>
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            placeholder="Boş = tümü"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>
                    <button
                        onClick={run}
                        disabled={loading}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            <BoltIcon className="w-4 h-4" />
                        )}
                        Analizi Çalıştır
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!data}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-40 transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        TXT İndir
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Results */}
            {data && (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                            label="Toplam Event"
                            value={data.total_events || 0}
                            color="bg-blue-50 border-blue-100 text-blue-700"
                            sub={`son ${data.days} gün`}
                        />
                        <StatCard
                            label="Orphan Event"
                            value={data.orphan_count || 0}
                            color={
                                data.orphan_count > 0
                                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                                    : 'bg-green-50 border-green-100 text-green-700'
                            }
                            sub="Attendance match yok"
                        />
                        <StatCard
                            label="Etkilenen Çalışan"
                            value={data.top_employees?.length || 0}
                            color="bg-amber-50 border-amber-100 text-amber-700"
                            sub="Top 10 listelendi"
                        />
                        <StatCard
                            label="Sistem Hatası"
                            value={data.recent_errors?.length || 0}
                            color={
                                (data.recent_errors?.length || 0) > 0
                                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                                    : 'bg-green-50 border-green-100 text-green-700'
                            }
                            sub="gate_service log"
                        />
                    </div>

                    {/* Status Breakdown */}
                    <Section title="Status Dağılımı (tüm event'ler)" icon={DocumentTextIcon}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wide">
                                        <th className="text-left py-2 px-2">Status</th>
                                        <th className="text-right py-2 px-2">Adet</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.status_breakdown || []).map((s) => (
                                        <tr key={s.status} className="border-b border-gray-100">
                                            <td className="py-2 px-2 font-mono text-gray-700">{s.status}</td>
                                            <td className="py-2 px-2 text-right font-bold text-gray-800">{s.cnt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    {/* Orphan Reasons */}
                    {data.orphan_reasons?.length > 0 && (
                        <Section title="Orphan Sebepleri (Attendance match yok)" icon={ExclamationTriangleIcon}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wide">
                                            <th className="text-left py-2 px-2">Status</th>
                                            <th className="text-right py-2 px-2">Adet</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.orphan_reasons.map((r) => (
                                            <tr key={r.status} className="border-b border-gray-100">
                                                <td className="py-2 px-2 font-mono text-rose-700">{r.status}</td>
                                                <td className="py-2 px-2 text-right font-bold text-rose-800">{r.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}

                    {/* Top Employees */}
                    {data.top_employees?.length > 0 && (
                        <Section title="En Çok Etkilenen Çalışanlar (Top 10)" icon={UserGroupIcon}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wide">
                                            <th className="text-left py-2 px-2 w-10">#</th>
                                            <th className="text-left py-2 px-2">Çalışan</th>
                                            <th className="text-left py-2 px-2">ID</th>
                                            <th className="text-right py-2 px-2">Orphan Adet</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.top_employees.map((e, i) => (
                                            <tr key={e.employee_id} className="border-b border-gray-100">
                                                <td className="py-2 px-2 text-gray-400 font-mono">{i + 1}</td>
                                                <td className="py-2 px-2 font-bold text-gray-800">{e.employee_name}</td>
                                                <td className="py-2 px-2 font-mono text-gray-500">{e.employee_id}</td>
                                                <td className="py-2 px-2 text-right font-bold text-rose-700">{e.orphan_count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}

                    {/* Hourly Distribution */}
                    {(data.hourly_distribution || []).some(h => h.count > 0) && (
                        <Section title="Saatlik Dağılım (orphan event'leri)" icon={ClockIcon}>
                            <div className="space-y-1">
                                {data.hourly_distribution
                                    .filter(h => h.count > 0)
                                    .map((h) => (
                                        <div key={h.hour} className="flex items-center gap-2 text-xs">
                                            <span className="w-12 font-mono text-gray-500">{String(h.hour).padStart(2, '0')}:00</span>
                                            <span className="w-8 text-right font-bold text-gray-700">{h.count}</span>
                                            <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                                                <div
                                                    className="bg-indigo-500 h-full"
                                                    style={{ width: `${Math.min((h.count / Math.max(...data.hourly_distribution.map(x => x.count))) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </Section>
                    )}

                    {/* Recent Errors */}
                    {data.recent_errors?.length > 0 && (
                        <Section title="Son gate_service Hataları" icon={ExclamationTriangleIcon}>
                            <div className="space-y-2">
                                {data.recent_errors.map((e, i) => (
                                    <div key={i} className="border border-gray-200 rounded-lg p-3 text-xs">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-gray-500">{e.last_occurrence}</span>
                                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                                                {e.level} ×{e.occurrence_count}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mb-1">{e.logger_name}</div>
                                        <div className="text-gray-700">{e.message}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Orphan Sample */}
                    {data.orphan_sample?.length > 0 && (
                        <Section title={`Orphan Örnekleri (ilk ${data.orphan_sample.length})`} icon={DocumentTextIcon}>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wide">
                                            <th className="text-left py-2 px-2">event_id</th>
                                            <th className="text-left py-2 px-2">Çalışan</th>
                                            <th className="text-left py-2 px-2">Timestamp</th>
                                            <th className="text-left py-2 px-2">Dir</th>
                                            <th className="text-left py-2 px-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.orphan_sample.map((o) => (
                                            <tr key={o.event_id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-1.5 px-2 font-mono text-[10px] text-gray-500">{o.event_id}</td>
                                                <td className="py-1.5 px-2 text-gray-800">{o.employee_name}</td>
                                                <td className="py-1.5 px-2 font-mono text-[10px] text-gray-600">{(o.timestamp || '').slice(0, 19)}</td>
                                                <td className="py-1.5 px-2 font-mono text-[10px]">{o.direction}</td>
                                                <td className="py-1.5 px-2 font-mono text-[10px] text-rose-700">{o.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    )}
                </>
            )}

            {/* Empty */}
            {!data && !loading && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <BoltIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600">Analiz çalıştırılmadı</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Üstteki "Analizi Çalıştır" butonuna bas. Sonuçları gör + TXT olarak indir.
                    </p>
                </div>
            )}
        </div>
    );
}
