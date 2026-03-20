import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
    CakeIcon,
    GiftIcon,
    CheckCircleIcon,
    BellIcon,
} from '@heroicons/react/24/outline';
import { getIstanbulMonth, getIstanbulYear } from '../../../utils/dateUtils';

const TURKISH_MONTHS = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function BirthdayTab() {
    const [selectedMonth, setSelectedMonth] = useState(() => getIstanbulMonth());
    const [selectedYear, setSelectedYear] = useState(() => getIstanbulYear());
    const [birthdayData, setBirthdayData] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [notifSending, setNotifSending] = useState(false);
    const [notifResult, setNotifResult] = useState(null);

    const currentMonth = getIstanbulMonth();
    const currentYear = getIstanbulYear();

    useEffect(() => {
        fetchBirthdays();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchStats();
    }, [selectedYear]);

    const fetchBirthdays = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/system/health-check/birthdays-this-month/?month=${selectedMonth}&year=${selectedYear}`);
            setBirthdayData(res.data);
        } catch { setBirthdayData(null); }
        finally { setLoading(false); }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const res = await api.get(`/system/health-check/birthday-stats/?year=${selectedYear}`);
            setStats(res.data);
        } catch { setStats(null); }
        finally { setStatsLoading(false); }
    };

    const sendNotifications = async () => {
        if (!window.confirm(`${TURKISH_MONTHS[selectedMonth]} ${selectedYear} ayındaki çalışanlara doğum günü kutlama bildirimi gönderilecek. Onaylıyor musunuz?`)) return;
        setNotifSending(true);
        setNotifResult(null);
        try {
            const res = await api.post('/system/health-check/birthday-notifications/', { month: selectedMonth, year: selectedYear });
            setNotifResult({ success: true, sent: res.data.sent });
        } catch (e) {
            setNotifResult({ success: false, error: e.response?.data?.error || e.message });
        } finally { setNotifSending(false); }
    };

    const yearOptions = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) yearOptions.push(y);

    const todayCount = stats?.today_count || 0;
    const monthCount = birthdayData?.count || 0;
    const leaveUsedCount = birthdayData?.birthdays?.filter(b => b.leave_used).length || 0;
    const leaveRate = monthCount > 0 ? Math.round((leaveUsedCount / monthCount) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header + Selectors */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <CakeIcon className="w-6 h-6 text-pink-500" />
                    Doğum Günü Yönetimi
                </h2>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                    >
                        {TURKISH_MONTHS.slice(1).map((name, i) => (
                            <option key={i + 1} value={i + 1}>{name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                    >
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Bu Ayki Doğum Günleri"
                    value={monthCount}
                    subtitle={TURKISH_MONTHS[selectedMonth]}
                    color="pink"
                    loading={loading}
                />
                <KPICard
                    title="İzin Kullanım Oranı"
                    value={`%${leaveRate}`}
                    subtitle={`${leaveUsedCount}/${monthCount}`}
                    color="emerald"
                    loading={loading}
                />
                <KPICard
                    title="En Yoğun Ay"
                    value={stats?.busiest_month?.month_name || '-'}
                    subtitle={`${stats?.busiest_month?.count || 0} kişi`}
                    color="purple"
                    loading={statsLoading}
                />
                <KPICard
                    title="Bugün Doğum Günü"
                    value={todayCount}
                    subtitle={todayCount > 0 ? 'Kutlu olsun!' : '-'}
                    color="amber"
                    loading={statsLoading}
                />
            </div>

            {/* Chart + Mini Calendar Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Aylık Dağılım — {selectedYear}</h3>
                    {statsLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="w-6 h-6 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={stats?.monthly_distribution || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(v, name) => [v, name === 'count' ? 'Doğum Günü' : 'İzin Kullanıldı']}
                                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                />
                                <Bar dataKey="count" name="Doğum Günü" radius={[4, 4, 0, 0]}>
                                    {(stats?.monthly_distribution || []).map((entry) => (
                                        <Cell key={`month-${entry.month}`} fill={entry.month === selectedMonth ? '#ec4899' : '#fce7f3'} />
                                    ))}
                                </Bar>
                                <Bar dataKey="leave_used" name="İzin Kullanıldı" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Mini Calendar Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Yıllık Takvim</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {(stats?.monthly_distribution || TURKISH_MONTHS.slice(1).map((n, i) => ({ month: i + 1, month_name: n, count: 0 }))).map(m => (
                            <button
                                key={m.month}
                                onClick={() => setSelectedMonth(m.month)}
                                className={`p-2 rounded-lg text-center transition-all border ${
                                    m.month === selectedMonth
                                        ? 'bg-pink-50 border-pink-300 ring-2 ring-pink-200'
                                        : 'border-gray-100 hover:border-pink-200 hover:bg-pink-50/50'
                                }`}
                            >
                                <p className={`text-xs font-bold ${m.month === selectedMonth ? 'text-pink-700' : 'text-gray-600'}`}>
                                    {m.month_name}
                                </p>
                                <p className={`text-lg font-black ${m.month === selectedMonth ? 'text-pink-600' : m.count > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                                    {m.count}
                                </p>
                                {m.month === currentMonth && selectedYear === currentYear && (
                                    <span className="text-[8px] font-bold text-pink-500">BU AY</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bulk Notification */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <BellIcon className="w-5 h-5 text-pink-500" />
                    <div>
                        <p className="text-sm font-bold text-gray-700">Toplu Kutlama Bildirimi</p>
                        <p className="text-xs text-gray-400">{TURKISH_MONTHS[selectedMonth]} {selectedYear} ayındaki {monthCount} çalışana bildirim gönder</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {notifResult && (
                        <span className={`text-xs font-bold ${notifResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                            {notifResult.success ? `${notifResult.sent} bildirim gönderildi` : notifResult.error}
                        </span>
                    )}
                    <button
                        onClick={sendNotifications}
                        disabled={notifSending || monthCount === 0}
                        className="px-4 py-2 bg-pink-500 text-white text-sm font-bold rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {notifSending ? 'Gönderiliyor...' : 'Bildirim Gönder'}
                    </button>
                </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <CakeIcon className="w-5 h-5 text-pink-500" />
                        {TURKISH_MONTHS[selectedMonth]} {selectedYear} — Doğum Günleri
                        {birthdayData && (
                            <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                                {birthdayData.count} kişi
                            </span>
                        )}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                    </div>
                ) : !birthdayData || birthdayData.count === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <CakeIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                        <p className="text-sm font-medium">Bu ayda doğum günü olan çalışan yok</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {birthdayData.birthdays.map(emp => (
                            <div
                                key={emp.id}
                                className={`relative p-4 rounded-xl border transition-all ${
                                    emp.is_today
                                        ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200 shadow-md ring-2 ring-pink-200/50'
                                        : emp.days_until !== null && emp.days_until >= 0
                                            ? 'bg-gray-50 border-gray-100 hover:border-pink-200 hover:shadow-sm'
                                            : 'bg-gray-50/50 border-gray-100 opacity-60'
                                }`}
                            >
                                {emp.is_today && (
                                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">🎂</div>
                                )}
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${
                                        emp.is_today ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-600'
                                    }`}>
                                        {emp.birth_day}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`font-bold text-sm truncate ${emp.is_today ? 'text-pink-700' : 'text-gray-800'}`}>
                                            {emp.full_name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium truncate">{emp.department}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] font-bold text-gray-500">{emp.age} yaş</span>
                                            {emp.is_today ? (
                                                <span className="text-[10px] font-bold text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded-full">BUGÜN!</span>
                                            ) : emp.days_until !== null && emp.days_until > 0 ? (
                                                <span className="text-[10px] font-medium text-gray-400">{emp.days_until} gün kaldı</span>
                                            ) : emp.days_until !== null && emp.days_until < 0 ? (
                                                <span className="text-[10px] text-gray-400">geçti</span>
                                            ) : null}
                                        </div>
                                        <div className="mt-1">
                                            {emp.leave_used ? (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                    <CheckCircleIcon className="w-3 h-3" /> İzin Kullanıldı
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                    <GiftIcon className="w-3 h-3" /> İzin Hakkı Var
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function KPICard({ title, value, subtitle, color, loading }) {
    const colors = {
        pink: 'text-pink-600 bg-pink-50 border-pink-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
    };
    const c = colors[color] || colors.pink;

    return (
        <div className={`rounded-xl border p-4 ${c}`}>
            {loading ? (
                <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-7 bg-gray-200 rounded w-1/3" />
                </div>
            ) : (
                <>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{title}</p>
                    <p className="text-2xl font-black mt-1">{value}</p>
                    {subtitle && <p className="text-xs font-medium opacity-60 mt-0.5">{subtitle}</p>}
                </>
            )}
        </div>
    );
}
