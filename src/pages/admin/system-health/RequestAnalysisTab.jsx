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

    const fmtHour = (secs) => {
        if (!secs) return '0 sa';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
    };

    const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

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

    const { overview, monthly_trend, department_breakdown, employee_breakdown, weekly_pattern } = data;

    // KPI Cards
    const totalAll = overview ? Object.values(overview).reduce((s, v) => s + (v.total || 0), 0) : 0;
    const totalPending = overview ? Object.values(overview).reduce((s, v) => s + (v.pending || 0), 0) : 0;
    const totalApproved = overview ? Object.values(overview).reduce((s, v) => s + (v.approved || 0), 0) : 0;
    const totalRejected = overview ? Object.values(overview).reduce((s, v) => s + (v.rejected || 0), 0) : 0;
    const approvalRate = data.approval_rate ?? pct(totalApproved, totalApproved + totalRejected);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Talep Analizi</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Tüm talep türleri için kapsamlı istatistikler</p>
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
            {overview && (
                <Section title="Talep Türü Dağılımı" sectionKey="types" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <TypeCard title="İzin" data={overview.leave} color="purple" />
                        <TypeCard title="Fazla Mesai" data={overview.overtime} color="amber" />
                        <TypeCard title="Yemek" data={overview.meal} color="emerald" />
                        <TypeCard title="Kartsız Giriş" data={overview.cardless} color="blue" />
                    </div>
                </Section>
            )}

            {/* Extra Stats */}
            {(data.approved_overtime_hours || data.approved_leave_days || data.avg_response_hours) && (
                <Section title="Özet İstatistikler" sectionKey="stats" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-3 gap-3">
                        {data.approved_overtime_hours != null && (
                            <StatBox label="Onaylı Ek Mesai" value={fmtHour(data.approved_overtime_hours * 3600)} />
                        )}
                        {data.approved_leave_days != null && (
                            <StatBox label="Onaylı İzin" value={`${data.approved_leave_days} gün`} />
                        )}
                        {data.avg_response_hours != null && (
                            <StatBox label="Ort. Yanıt Süresi" value={`${data.avg_response_hours} saat`} />
                        )}
                    </div>
                </Section>
            )}

            {/* Monthly Trend */}
            {monthly_trend && monthly_trend.length > 0 && (
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
                                {monthly_trend.map((m, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{m.month_label || `${m.year}-${String(m.month).padStart(2, '0')}`}</td>
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
            {department_breakdown && department_breakdown.length > 0 && (
                <Section title="Departman Kırılımı" sectionKey="dept" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Çalışan</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-green-600">Onaylı</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-red-600">Reddedili</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Bekleyen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {department_breakdown.map((d, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{d.department || 'Bilinmiyor'}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{d.employee_count || '-'}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{d.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-green-700">{d.approved || 0}</td>
                                        <td className="px-3 py-2 text-center text-red-700">{d.rejected || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{d.pending || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Employee Breakdown */}
            {employee_breakdown && employee_breakdown.length > 0 && (
                <Section title="Personel Kırılımı" sectionKey="emp" expanded={expandedSection} toggle={toggleSection}>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="bg-gray-50">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Personel</th>
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Departman</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Toplam</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">İzin</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600">Mesai</th>
                                    <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600">Yemek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employee_breakdown.map((e, i) => (
                                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-700">{e.name || 'Bilinmiyor'}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{e.department || '-'}</td>
                                        <td className="px-3 py-2 text-center font-bold text-gray-800">{e.total || 0}</td>
                                        <td className="px-3 py-2 text-center text-purple-700">{e.leave || 0}</td>
                                        <td className="px-3 py-2 text-center text-amber-700">{e.overtime || 0}</td>
                                        <td className="px-3 py-2 text-center text-emerald-700">{e.meal || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

            {/* Weekly Pattern */}
            {weekly_pattern && weekly_pattern.length > 0 && (
                <Section title="Haftalık Dağılım" sectionKey="weekly" expanded={expandedSection} toggle={toggleSection}>
                    <div className="grid grid-cols-7 gap-2">
                        {weekly_pattern.map((w, i) => (
                            <div key={i} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="text-xs font-semibold text-gray-500 mb-1">{w.day_label || w.day}</div>
                                <div className="text-lg font-bold text-gray-800">{w.total || 0}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5">talep</div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Pending Requests Detail */}
            {data.pending_requests && data.pending_requests.length > 0 && (
                <Section title={`Bekleyen Talepler (${data.pending_requests.length})`} sectionKey="pending" expanded={expandedSection} toggle={toggleSection}>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {data.pending_requests.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                <div>
                                    <div className="text-sm font-medium text-gray-800">{r.employee_name || 'Bilinmiyor'}</div>
                                    <div className="text-xs text-gray-500">
                                        {r.type_label || r.type} — {r.date || r.start_date}
                                    </div>
                                </div>
                                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Bekliyor</span>
                            </div>
                        ))}
                    </div>
                </Section>
            )}
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
    const pct = data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0;
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-xs font-bold text-${color}-600 uppercase mb-2`}>{title}</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">{data.total}</div>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-gray-500">Onaylı</span>
                    <span className="text-green-600 font-medium">{data.approved}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Bekleyen</span>
                    <span className="text-amber-600 font-medium">{data.pending}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Reddedilen</span>
                    <span className="text-red-600 font-medium">{data.rejected}</span>
                </div>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${pct}%` }}></div>
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
    const isOpen = expanded === sectionKey || expanded === null;
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
