import React, { useState } from 'react';
import api from '../../../services/api';
import {
    ArrowPathIcon, MagnifyingGlassIcon, WrenchScrewdriverIcon,
    ArrowDownTrayIcon, CheckCircleIcon, CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const YEAR = new Date().getFullYear();

export default function AnnualLeaveAccrualAuditTab() {
    const [dateFrom, setDateFrom] = useState(`${YEAR}-03-01`);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [year, setYear] = useState(YEAR);
    const [notify, setNotify] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [rowFixId, setRowFixId] = useState(null);
    const [results, setResults] = useState(null);
    const [fixReport, setFixReport] = useState(null);

    const body = (extra = {}) => ({
        year, date_from: dateFrom, date_to: dateTo, ...extra,
    });

    const scan = async () => {
        setScanning(true); setFixReport(null);
        try {
            const res = await api.post('/system/health-check/annual-leave-accrual-audit/', body({ mode: 'scan' }));
            setResults(res.data);
        } catch (e) {
            alert('Tarama hatası: ' + (e.response?.data?.error || e.message));
        } finally { setScanning(false); }
    };

    const fixAll = async () => {
        if (!results?.summary?.missing_count) return;
        if (!confirm(`${results.summary.missing_count} kişinin eksik ${year} hak edişi OLUŞTURULACAK.\nDevam edilsin mi?`)) return;
        setFixing(true);
        try {
            const res = await api.post('/system/health-check/annual-leave-accrual-audit/', body({ mode: 'fix', notify }));
            setResults(res.data); setFixReport(res.data);
        } catch (e) {
            alert('Toplu onar hatası: ' + (e.response?.data?.error || e.message));
        } finally { setFixing(false); }
    };

    const fixOne = async (issue) => {
        if (!confirm(`${issue.employee_name} için ${year} hak edişi (${issue.expected_days} gün) oluşturulsun mu?`)) return;
        setRowFixId(issue.employee_id);
        try {
            const res = await api.post('/system/health-check/annual-leave-accrual-audit/',
                body({ mode: 'fix', employee_ids: [issue.employee_id], notify }));
            setResults(res.data); setFixReport(res.data);
        } catch (e) {
            alert('Onar hatası: ' + (e.response?.data?.error || e.message));
        } finally { setRowFixId(null); }
    };

    const exportTxt = async () => {
        try {
            const res = await api.get('/system/health-check/annual-leave-accrual-audit-export/', {
                params: { year, date_from: dateFrom, date_to: dateTo }, responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/plain;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url; a.download = `yillik_izin_yenileme_denetimi_${year}.txt`; a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) { alert('İndir hatası: ' + e.message); }
    };

    const s = results?.summary;
    const missing = (results?.issues || []).filter(i => !i.fixed);
    const fixedRows = (results?.issues || []).filter(i => i.fixed);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Başlık + filtreler */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1">
                    <CalendarDaysIcon className="w-6 h-6 text-indigo-600" />
                    Yıllık İzin Yenileme Denetimi
                </h3>
                <p className="text-sm text-gray-500 mb-5">
                    {year} yılında yıldönümü gelen çalışanların yıllık izin artışı otomatik yapıldı mı — gün gün kontrol. Eksikleri önizle, TXT indir, onar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <label className="text-sm">
                        <span className="block text-gray-600 mb-1">Yıl</span>
                        <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || YEAR)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm">
                        <span className="block text-gray-600 mb-1">Başlangıç (yıldönümü ≥)</span>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm">
                        <span className="block text-gray-600 mb-1">Bitiş (yıldönümü ≤)</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm flex items-end gap-2 pb-2">
                        <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600" />
                        <span className="text-gray-600">Onarınca çalışana bildirim gönder</span>
                    </label>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={scan} disabled={scanning}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                        {scanning ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                        {scanning ? 'Taranıyor...' : 'TARA (Önizleme)'}
                    </button>
                    {s?.missing_count > 0 && (
                        <button onClick={fixAll} disabled={fixing}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                            {fixing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <WrenchScrewdriverIcon className="w-4 h-4" />}
                            {fixing ? 'Onarılıyor...' : `TÜMÜNÜ ONAR (${s.missing_count})`}
                        </button>
                    )}
                    {results && (
                        <button onClick={exportTxt}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold rounded-lg">
                            <ArrowDownTrayIcon className="w-4 h-4" /> TXT İNDİR
                        </button>
                    )}
                </div>
            </div>

            {/* Özet */}
            {s && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Stat label="Kontrol edilen" value={s.eligible_checked} color="bg-blue-50 text-blue-700" />
                    <Stat label="Yapılmış (OK)" value={s.ok_count} color="bg-green-50 text-green-700" />
                    <Stat label="EKSİK" value={s.missing_count} color="bg-red-50 text-red-700" />
                    <Stat label="Onarılan" value={s.fixed} color="bg-emerald-50 text-emerald-700" />
                </div>
            )}

            {/* Fix raporu */}
            {fixReport?.action_log?.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                    <div className="font-bold flex items-center gap-2 mb-2">
                        <CheckCircleIcon className="w-5 h-5" /> {fixReport.action_log.length} hak ediş oluşturuldu
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                        {fixReport.action_log.map((a, i) => (
                            <li key={i}>{a.employee_name} — {a.rate} gün (yıldönümü {a.anniversary})
                                {a.advance_closed > 0 ? ` · avans kapandı ${a.advance_closed}` : ''}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Eksik tablosu */}
            {results && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 font-bold text-gray-700">
                        Eksik Hak Edişler {missing.length ? `(${missing.length})` : ''}
                    </div>
                    {missing.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-2">
                            <CheckCircleIcon className="w-12 h-12 text-green-200" />
                            Eksik yok — penceredeki tüm yıldönümü tahakkukları yapılmış.
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-2">Yıldönümü</th>
                                    <th className="px-4 py-2">Çalışan</th>
                                    <th className="px-4 py-2">İşe Giriş</th>
                                    <th className="px-4 py-2">Beklenen Gün</th>
                                    <th className="px-4 py-2 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {missing.map(it => (
                                    <tr key={it.employee_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-mono text-gray-700">{it.anniversary}</td>
                                        <td className="px-4 py-2">{it.employee_name} <span className="text-gray-400">#{it.employee_id}</span></td>
                                        <td className="px-4 py-2 text-gray-500">{it.hired_date}</td>
                                        <td className="px-4 py-2">
                                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold">
                                                {it.expected_days} gün{it.expected_source === 'override' ? ' (override)' : ''}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button onClick={() => fixOne(it)} disabled={rowFixId === it.employee_id}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold disabled:opacity-50">
                                                {rowFixId === it.employee_id ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <WrenchScrewdriverIcon className="w-3 h-3" />}
                                                Onar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {fixedRows.length > 0 && (
                        <div className="px-5 py-3 border-t border-gray-100 text-xs text-emerald-700 bg-emerald-50">
                            ✓ {fixedRows.length} kayıt bu oturumda onarıldı.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const Stat = ({ label, value, color }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
        <div className="text-2xl font-bold">{value ?? 0}</div>
        <div className="text-xs font-medium mt-1">{label}</div>
    </div>
);
