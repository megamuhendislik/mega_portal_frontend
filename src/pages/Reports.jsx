import React, { useState, useEffect } from 'react';
import { FileDown, Calendar, ChevronDown } from 'lucide-react';
import api from '../services/api';

const Reports = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState('');
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingCalendars, setLoadingCalendars] = useState(true);

    // Fetch available fiscal calendars
    useEffect(() => {
        const fetchCalendars = async () => {
            try {
                const res = await api.get('/attendance/fiscal-calendars/');
                const cals = res.data.results || res.data;
                setCalendars(cals);
                // Auto-select default calendar
                const defaultCal = cals.find(c => c.is_default) || cals[0];
                if (defaultCal) {
                    setSelectedCalendarId(defaultCal.id);
                }
            } catch (err) {
                console.error('Calendar fetch error:', err);
            }
            setLoadingCalendars(false);
        };
        fetchCalendars();
    }, []);

    // Fetch periods when calendar changes
    useEffect(() => {
        if (!selectedCalendarId) return;
        const fetchPeriods = async () => {
            try {
                const res = await api.get(`/attendance/fiscal-periods/`, {
                    params: { calendar: selectedCalendarId }
                });
                const allPeriods = res.data.results || res.data;
                setPeriods(allPeriods);

                // Auto-select current period
                const now = new Date();
                const currentMonth = now.getMonth() + 1;
                const currentYear = now.getFullYear();
                const current = allPeriods.find(p => p.year === currentYear && p.month === currentMonth);
                setSelectedPeriod(current || allPeriods[allPeriods.length - 1] || null);
            } catch (err) {
                console.error('Periods fetch error:', err);
            }
        };
        fetchPeriods();
    }, [selectedCalendarId]);

    const handleDownload = async () => {
        if (!selectedPeriod) return;
        setLoading(true);
        try {
            const params = {
                year: selectedPeriod.year,
                month: selectedPeriod.month,
            };
            if (selectedCalendarId) {
                params.calendar_id = selectedCalendarId;
            }

            const response = await api.get('/monthly-reports/export_excel/', {
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Mutabakat_${selectedPeriod.year}_${selectedPeriod.month}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Rapor indirilemedi.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const trMonths = {
        1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
        7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Raporlar</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Reconciliation Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <FileDown size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-800">Aylık Mutabakat Raporu</h3>
                            <p className="text-sm text-slate-500">Personel bazlı aylık mesai ve izin özeti</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Calendar Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Çalışma Takvimi</label>
                            {loadingCalendars ? (
                                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                            ) : (
                                <select
                                    value={selectedCalendarId}
                                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                >
                                    {calendars.map(cal => (
                                        <option key={cal.id} value={cal.id}>
                                            {cal.name} ({cal.year})
                                            {cal.is_default ? ' ★' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Period Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mali Dönem</label>
                            <select
                                value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''}
                                onChange={(e) => {
                                    const [y, m] = e.target.value.split('-').map(Number);
                                    const p = periods.find(p => p.year === y && p.month === m);
                                    setSelectedPeriod(p);
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                                {periods.map(p => (
                                    <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                                        {trMonths[p.month]} {p.year}
                                        {p.is_locked ? ' 🔒' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Period Info Box */}
                        {selectedPeriod && (
                            <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
                                <Calendar size={16} className="text-blue-600 flex-shrink-0" />
                                <span className="text-xs text-blue-700">
                                    Rapor Aralığı: <strong>{formatDate(selectedPeriod.start_date)}</strong> — <strong>{formatDate(selectedPeriod.end_date)}</strong>
                                </span>
                            </div>
                        )}

                        <button
                            onClick={handleDownload}
                            disabled={loading || !selectedPeriod}
                            className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Hazırlanıyor...' : (
                                <>
                                    <FileDown size={18} />
                                    Excel İndir
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
