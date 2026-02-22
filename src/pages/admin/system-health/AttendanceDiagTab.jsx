import React, { useState } from 'react';
import api from '../../../services/api';

import {
    ClockIcon,
} from '@heroicons/react/24/outline';

export default function AttendanceDiagTab() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [allMonths, setAllMonths] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedEmp, setExpandedEmp] = useState({});

    const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

    const fetchDiag = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { year, all: 'true' };
            if (!allMonths) params.month = month;
            const res = await api.get('/dashboard/diag-monthly/', { params });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleEmp = (code) => {
        setExpandedEmp(prev => ({ ...prev, [code]: !prev[code] }));
    };

    const fmtH = (h) => {
        if (h === null || h === undefined) return '-';
        const hours = Math.floor(Math.abs(h));
        const mins = Math.round((Math.abs(h) - hours) * 60);
        const sign = h < 0 ? '-' : '';
        return `${sign}${hours}s ${mins}dk`;
    };

    const getBadge = (m) => {
        if (!m.has_data && !m.is_future) return { text: 'VERİ YOK', cls: 'bg-orange-100 text-orange-700' };
        if (m.is_future) return { text: 'GELECEK', cls: 'bg-gray-100 text-gray-500' };
        if (m.mismatch) return { text: 'UYUMSUZ', cls: 'bg-red-100 text-red-700' };
        if (m.fresh_missing_h > 0) return { text: `${fmtH(m.fresh_missing_h)} EKSİK`, cls: 'bg-red-50 text-red-600' };
        if (m.fresh_overtime_h > 0) return { text: `${fmtH(m.fresh_overtime_h)} FAZLA`, cls: 'bg-emerald-50 text-emerald-600' };
        return { text: 'OK', cls: 'bg-green-100 text-green-700' };
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Mesai Hesaplama Doğrulama</h2>
            <p className="text-sm text-gray-500 mb-4">
                Tüm çalışanların aylık mesai hesaplamalarını kontrol edin. Ham attendance kayıtları, hedef saatler ve hesaplanan değerler karşılaştırmalı gösterilir.
            </p>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Yıl:</label>
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm">
                        {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Ay:</label>
                    <select value={month} onChange={e => setMonth(parseInt(e.target.value))} disabled={allMonths} className="border rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">
                        {monthNames.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={allMonths} onChange={e => setAllMonths(e.target.checked)} className="rounded" />
                    Tüm Aylar (1-12)
                </label>
                <button
                    onClick={fetchDiag}
                    disabled={loading}
                    className="ml-auto px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Hesaplanıyor...' : 'Doğrula'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
            )}

            {data && (
                <div className="space-y-2">
                    {/* Meta */}
                    <div className="text-xs text-gray-400 mb-3">
                        Oluşturulma: {data.generated_at} | Bugün: {data.today} | {data.employee_count} çalışan | Kontrol edilen aylar: {data.months_checked?.join(', ')}
                    </div>

                    {/* Summary Stats */}
                    {(() => {
                        const emps = data.employees || [];
                        const noData = emps.filter(e => Object.values(e.months).some(m => !m.has_data && !m.is_future)).length;
                        const mismatched = emps.filter(e => Object.values(e.months).some(m => m.mismatch)).length;
                        const withMissing = emps.filter(e => Object.values(e.months).some(m => m.fresh_missing_h > 0)).length;
                        return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="p-3 bg-blue-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-700">{emps.length}</div>
                                    <div className="text-xs text-blue-600">Toplam Çalışan</div>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-orange-700">{noData}</div>
                                    <div className="text-xs text-orange-600">Veri Yok</div>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-700">{mismatched}</div>
                                    <div className="text-xs text-red-600">Cache Uyumsuz</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-amber-700">{withMissing}</div>
                                    <div className="text-xs text-amber-600">Eksik Mesaili</div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Employee List */}
                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Çalışan</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Departman</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Takvim</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Program</th>
                                    {(data.months_checked || []).map(m => (
                                        <th key={m} className="text-center px-2 py-2 font-medium text-gray-600">{monthNames[m-1]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(data.employees || []).map(emp => {
                                    const isExpanded = expandedEmp[emp.employee_code];
                                    return (
                                        <React.Fragment key={emp.employee_code}>
                                            <tr
                                                className="border-t hover:bg-gray-50 cursor-pointer"
                                                onClick={() => toggleEmp(emp.employee_code)}
                                            >
                                                <td className="px-4 py-2 font-medium text-gray-800">
                                                    <span className="mr-1 text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                                                    {emp.name}
                                                    <span className="text-xs text-gray-400 ml-1">({emp.employee_code})</span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 text-xs">{emp.department}</td>
                                                <td className="px-3 py-2 text-gray-600 text-xs">{emp.fiscal_calendar}</td>
                                                <td className="px-3 py-2 text-gray-600 text-xs">{emp.work_schedule}</td>
                                                {(data.months_checked || []).map(m => {
                                                    const md = emp.months[String(m)];
                                                    if (!md) return <td key={m} className="px-2 py-2 text-center text-xs text-gray-300">-</td>;
                                                    const badge = getBadge(md);
                                                    return (
                                                        <td key={m} className="px-2 py-2 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                                                                {badge.text}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            {isExpanded && (data.months_checked || []).map(m => {
                                                const md = emp.months[String(m)];
                                                if (!md || md.error) return null;
                                                return (
                                                    <tr key={`${emp.employee_code}-${m}-detail`} className="bg-slate-50 border-t border-dashed">
                                                        <td colSpan={4 + (data.months_checked || []).length} className="px-6 py-3">
                                                            <div className="text-xs font-bold text-gray-700 mb-2">{monthNames[m-1]} {data.year} — Detay</div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Dönem</div>
                                                                    <div>{md.period}</div>
                                                                    <div className="text-gray-400">Hesap sonu: {md.calc_end}</div>
                                                                    <div className="text-gray-400">Hedef sonu: {md.target_calc_end}</div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Ham Attendance</div>
                                                                    <div>Kayıt: <b className={md.raw_attendance_count === 0 ? 'text-red-600' : 'text-green-600'}>{md.raw_attendance_count}</b></div>
                                                                    <div>Normal: <b>{fmtH(md.raw_normal_hours)}</b></div>
                                                                    <div>Ek Mesai: <b>{fmtH(md.raw_overtime_hours)}</b></div>
                                                                    <div>Mola: <b>{Math.round((md.raw_break_seconds || 0) / 60)}dk</b></div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Hedef</div>
                                                                    <div>Ay Toplam: <b>{fmtH(md.target_gross_hours)}</b></div>
                                                                    <div>Bugüne Kadar: <b>{fmtH(md.past_target_hours)}</b></div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Hesaplama (Taze)</div>
                                                                    <div>Tamamlanan: <b className="text-blue-600">{fmtH(md.fresh_completed_h)}</b></div>
                                                                    <div>Eksik: <b className={md.fresh_missing_h > 0 ? 'text-red-600' : ''}>{fmtH(md.fresh_missing_h)}</b></div>
                                                                    <div>Ek Mesai: <b className="text-emerald-600">{fmtH(md.fresh_overtime_h)}</b></div>
                                                                    <div>Net Bakiye: <b className={md.fresh_net_balance_h < 0 ? 'text-red-600' : 'text-emerald-600'}>{fmtH(md.fresh_net_balance_h)}</b></div>
                                                                </div>
                                                            </div>
                                                            {md.cached_completed_h !== null && (
                                                                <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                                                                    <span className="font-semibold text-yellow-700">Cache (DB): </span>
                                                                    Tamamlanan: {fmtH(md.cached_completed_h)} | Eksik: {fmtH(md.cached_missing_h)} | Ek Mesai: {fmtH(md.cached_overtime_h)}
                                                                    {md.mismatch && <span className="ml-2 text-red-600 font-bold">⚠ UYUMSUZ</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!data && !loading && (
                <div className="text-center py-16 text-gray-400">
                    <ClockIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Yukarıdan yıl ve ay seçip "Doğrula" butonuna tıklayın.</p>
                </div>
            )}
        </div>
    );
}
