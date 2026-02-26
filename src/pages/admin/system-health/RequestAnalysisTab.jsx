import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

export default function RequestAnalysisTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState(6);
    const [error, setError] = useState(null);
    const [expandedSection, setExpandedSection] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/request-analytics/comprehensive/?range=${range}`);
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Veri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleSection = (key) => {
        setExpandedSection(prev => prev === key ? null : key);
    };

    const fmtHour = (hours) => {
        if (!hours) return '0 sa';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
    };

    if (loading && !data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Talep analizi yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-8">
                <div className="text-center">
                    <p className="text-red-600 font-medium mb-2">Hata</p>
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Backend response structure:
    // overview: { total_requests, by_type: {leave:{total,pending,approved,rejected}, overtime, meal, cardless}, approval_rate, total_overtime_hours, total_leave_days, avg_response_hours }
    // monthly_trend: [{ month:"2025-09", label:"Eylül 2025", leave, overtime, meal, cardless, total, overtime_hours, leave_days }]
    // department_breakdown: [{ name, employee_count, total, approved, leave, overtime, meal, cardless, overtime_hours, leave_days }]
    // employee_breakdown: [{ id, name, department, role, total, approved, leave, overtime, meal, cardless, overtime_hours, leave_days }]
    // weekly_pattern: [{ day:"Pazartesi", day_short:"Paz", leave, overtime, meal, cardless, total }]
    // overtime_sources: { intended, potential, manual }
    // leave_types: [{ name, count, approved, total_days }]
    // indirect_analysis: { subordinate_managers, total_indirect_requests }

    const ov = data.overview || {};
    const byType = ov.by_type || {};
    const totalAll = ov.total_requests || 0;
    const approvalRate = ov.approval_rate ?? 0;

    // Pending count from by_type
    const totalPending = Object.values(byType).reduce((s, v) => s + (v?.pending || 0), 0);
    const totalApproved = Object.values(byType).reduce((s, v) => s + (v?.approved || 0), 0);
    const totalRejected = Object.values(byType).reduce((s, v) => s + (v?.rejected || 0), 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Talep Analizi</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {data.requester?.name && <span className="font-medium">{data.requester.name}</span>}
                        {data.requester?.managed_count > 0 && <span> — {data.requester.managed_count} personel kapsamında</span>}
                        {data.period && <span> | {data.period.start} → {data.period.end}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={range}
                        onChange={(e) => setRange(Number(e.target.value))}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50"
                    >
                        <option value={3}>Son 3 Ay</option>
                        <option value={6}>Son 6 Ay</option>
                        <option value={12}>Son 12 Ay</option>
                        <option value={24}>Son 24 Ay</option>
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Yükleniyor...' : 'Yenile'}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard label="Toplam Talep" value={totalAll} color="blue" />
                <KpiCard label="Bekleyen" value={totalPending} color="amber" />
                <KpiCard label="Onaylanan" value={totalApproved} color="green" />
                <KpiCard label="Reddedilen" value={totalRejected} color="red" />
                <KpiCard label="Onay Oranı" value={`%${approvalRate}`} color="indigo" />
            </div>

            {/* Type Breakdown */}
            {Object.keys(byType).length > 0 && (
                <Section title="Talep Türü Dağılımı" sectionKey="types" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <TypeCard title="İzin" data={byType.leave} color="purple" />
                        <TypeCard title="Fazla Mesai" data={byType.overtime} color="amber" />
                        <TypeCard title="Yemek" data={byType.meal} color="emerald" />
                        <TypeCard title="Kartsız Giriş" data={byType.cardless} color="blue" />
                    </div>
                </Section>
            )}

            {/* Extra Stats */}
            {(ov.total_overtime_hours > 0 || ov.total_leave_days > 0 || ov.avg_response_hours) && (
                <Section title="Özet İstatistikler" sectionKey="stats" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-3 gap-3">
                        <StatBox label="Onaylı Ek Mesai" value={fmtHour(ov.total_overtime_hours)} />
                        <StatBox label="Onaylı İzin" value={`${ov.total_leave_days || 0} gün`} />
                        <StatBox label="Ort. Yanıt Süresi" value={ov.avg_response_hours != null ? `${ov.avg_response_hours} saat` : '-'} />
                    </div>
                </Section>
            )}

            {/* Overtime Sources */}
            {data.overtime_sources && (
                <Section title="Ek Mesai Kaynak Dağılımı" sectionKey="ot_src" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-3 gap-3">
                        <StatBox label="Planlı (Atama)" value={data.overtime_sources.intended || 0} />
                        <StatBox label="Algılanan (Potansiyel)" value={data.overtime_sources.potential || 0} />
                        <StatBox label="Manuel Giriş" value={data.overtime_sources.manual || 0} />
                    </div>
                </Section>
            )}

            {/* Leave Types */}
            {data.leave_types && data.leave_types.length > 0 && (
                <Section title="İzin Türü Dağılımı" sectionKey="leave_types" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">İzin Türü</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-600">Onaylı</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">Toplam Gün</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.leave_types.map((lt, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{lt.name}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{lt.count}</td>
                                        <td className="px-3 py-2 text-center text-green-700">{lt.approved}</td>
                                        <td className="px-3 py-2 text-center text-blue-700">{lt.total_days || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Monthly Trend */}
            {data.monthly_trend && data.monthly_trend.length > 0 && (
                <Section title="Aylık Trend" sectionKey="trend" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Ay</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">Kartsız</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-700">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.monthly_trend.map((m, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${m.total > 0 ? '' : 'opacity-50'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{m.label || m.month}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{m.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{m.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{m.meal || 0}</td>
                                        <td className="px-3 py-2 text-center text-blue-700">{m.cardless || 0}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{m.total || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Department Breakdown */}
            {data.department_breakdown && data.department_breakdown.length > 0 && (
                <Section title="Departman Kırılımı" sectionKey="dept" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Çalışan</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-600">Onaylı</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.department_breakdown.map((d, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${d.total > 0 ? '' : 'opacity-40'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{d.name || 'Departmansız'}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{d.employee_count || 0}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{d.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-green-700">{d.approved || 0}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{d.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{d.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{d.meal || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Role Breakdown */}
            {data.role_breakdown && data.role_breakdown.length > 0 && (
                <Section title="Pozisyon Kırılımı" sectionKey="role" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Pozisyon</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Çalışan</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.role_breakdown.map((r, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${r.total > 0 ? '' : 'opacity-40'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{r.role || 'Pozisyonsuz'}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{r.employee_count || 0}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{r.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{r.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{r.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{r.meal || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Employee Breakdown */}
            {data.employee_breakdown && data.employee_breakdown.length > 0 && (
                <Section title="Personel Kırılımı" sectionKey="emp" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Personel</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">Kartsız</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employee_breakdown.map((e, i) => (
                                    <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${e.total > 0 ? '' : 'opacity-40'}`}>
                                        <td className="px-3 py-2 font-medium text-gray-700">{e.name}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{e.department || '-'}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{e.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{e.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{e.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{e.meal || 0}</td>
                                        <td className="px-3 py-2 text-center text-blue-700">{e.cardless || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Indirect Analysis (Subordinate Managers) */}
            {data.indirect_analysis?.subordinate_managers?.length > 0 && (
                <Section title={`Dolaylı Yönetici Analizi (${data.indirect_analysis.total_indirect_requests} talep)`} sectionKey="indirect" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Yönetici</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Ekip</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Gelen</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-600">Onaylı</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-red-600">Reddedilen</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Bekleyen</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-indigo-600">Onay %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.indirect_analysis.subordinate_managers.map((mgr, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{mgr.name}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{mgr.department || '-'}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{mgr.direct_reports}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{mgr.requests_received}</td>
                                        <td className="px-3 py-2 text-center text-green-700">{mgr.approved}</td>
                                        <td className="px-3 py-2 text-center text-red-700">{mgr.rejected}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{mgr.pending}</td>
                                        <td className="px-3 py-2 text-center text-indigo-700 font-medium">%{mgr.approval_rate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Weekly Pattern */}
            {data.weekly_pattern && data.weekly_pattern.length > 0 && (
                <Section title="Haftalık Dağılım" sectionKey="weekly" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-7 gap-2">
                        {data.weekly_pattern.map((w, i) => {
                            const maxTotal = Math.max(...data.weekly_pattern.map(x => x.total || 0), 1);
                            const intensity = Math.round((w.total / maxTotal) * 100);
                            return (
                                <div key={i} className="text-center p-3 rounded-lg border border-gray-100" style={{ backgroundColor: `rgba(59, 130, 246, ${intensity / 300})` }}>
                                    <div className="text-xs font-semibold text-gray-600 mb-1">{w.day}</div>
                                    <div className="text-lg font-bold text-gray-800">{w.total || 0}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">talep</div>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* Assignment Stats */}
            {data.assignment_stats && data.assignment_stats.total > 0 && (
                <Section title="Ek Mesai Atama İstatistikleri" sectionKey="assign" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatBox label="Toplam Atama" value={data.assignment_stats.total} />
                        <StatBox label="Atandı" value={data.assignment_stats.assigned} />
                        <StatBox label="Talep Edildi" value={data.assignment_stats.claimed} />
                        <StatBox label="Süresi Doldu" value={data.assignment_stats.expired} />
                        <StatBox label="İptal" value={data.assignment_stats.cancelled} />
                    </div>
                </Section>
            )}

            {/* OT-Meal Correlation */}
            {data.overtime_meal_correlation && data.overtime_meal_correlation.length > 0 && (
                <Section title="Ek Mesai — Yemek Korelasyonu" sectionKey="ot_meal" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Personel</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai Gün</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai Saat</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemekli Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-red-600">Mesaisiz Yemek</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam Yemek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.overtime_meal_correlation.map((c, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{c.name}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{c.overtime_days}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{c.overtime_hours} sa</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{c.meal_with_ot}</td>
                                        <td className="px-3 py-2 text-center text-red-700">{c.meal_without_ot}</td>
                                        <td className="px-3 py-2 text-center text-gray-800 font-bold">{c.total_meals}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Raw JSON Debug (collapsed) */}
            <Section title="Ham Veri (Debug)" sectionKey="debug" expanded={expandedSection} toggle={toggleSection}>
                <pre className="text-[10px] text-gray-500 bg-gray-50 p-3 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </Section>
        </div>
    );
}

/* ─── Helpers ─── */

function KpiCard({ label, value, color }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    };
    return (
        <div className={`rounded-xl border p-3 ${colors[color] || colors.blue}`}>
            <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
            <div className="text-xl font-bold">{value}</div>
        </div>
    );
}

function TypeCard({ title, data, color }) {
    if (!data) return null;
    const pct = data.total > 0 ? Math.round(((data.approved || 0) / data.total) * 100) : 0;
    const barColors = { purple: '#a855f7', amber: '#f59e0b', emerald: '#10b981', blue: '#3b82f6' };
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-bold uppercase mb-2" style={{ color: barColors[color] || '#6b7280' }}>{title}</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">{data.total}</div>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-gray-500">Onaylı</span>
                    <span className="text-green-600 font-medium">{data.approved || 0}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Bekleyen</span>
                    <span className="text-amber-600 font-medium">{data.pending || 0}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Reddedilen</span>
                    <span className="text-red-600 font-medium">{data.rejected || 0}</span>
                </div>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColors[color] || '#6b7280' }}></div>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 text-right">%{pct} onay</div>
        </div>
    );
}

function StatBox({ label, value }) {
    return (
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-base font-bold text-gray-800">{value}</div>
        </div>
    );
}

function Section({ title, sectionKey, expanded, toggle, children }) {
    const isOpen = expanded === sectionKey;
    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <button
                onClick={() => toggle(sectionKey)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
                <h3 className="text-sm font-bold text-gray-700">{title}</h3>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && <div className="px-4 pb-4">{children}</div>}
        </div>
    );
}
