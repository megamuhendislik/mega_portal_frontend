import React, { useState, useEffect } from 'react';
import { DatePicker } from 'antd';
import { Calendar, Search, FileDown, Loader2, X } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../services/api';
import { getIstanbulToday } from '../../utils/dateUtils';

const { RangePicker } = DatePicker;

const trMonths = {
    1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
    7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık',
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul',
    });
};

/**
 * Muhasebe Paneli üst barı.
 *
 * Dönem seçimi iki moddan biriyle çalışır:
 *   - Mali takvim + dönem (calendar_id + year + month)  [varsayılan]
 *   - Serbest tarih aralığı (start + end)               [RangePicker doluysa öncelikli]
 *
 * Props:
 *   - onParamsChange({ params, ready })  — buildParams sonucu (üst sayfaya iletilir)
 *   - onSearchChange(q)                  — global arama metni
 *   - search                             — kontrol edilen arama değeri
 *   - onExport()                         — TXT indir tıklaması
 *   - exporting                          — indirme yükleme durumu
 */
export default function AccountingPeriodBar({
    onParamsChange,
    onSearchChange,
    search,
    onExport,
    exporting,
}) {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState('');
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [dateRange, setDateRange] = useState(null); // [dayjs, dayjs] | null
    const [loadingCalendars, setLoadingCalendars] = useState(true);

    // İlk yükleme: takvimler
    useEffect(() => {
        const fetchCalendars = async () => {
            try {
                const res = await api.get('/attendance/fiscal-calendars/');
                const cals = res.data.results || res.data || [];
                setCalendars(cals);
                const defaultCal = cals.find((c) => c.is_default) || cals[0];
                if (defaultCal) setSelectedCalendarId(defaultCal.id);
            } catch (err) {
                console.error('Takvim yüklenemedi:', err);
            }
            setLoadingCalendars(false);
        };
        fetchCalendars();
    }, []);

    // Takvim değişince dönemleri çek + içinde bulunulan mali dönemi seç
    useEffect(() => {
        if (!selectedCalendarId) return;
        const fetchPeriods = async () => {
            try {
                const res = await api.get('/attendance/fiscal-periods/', {
                    params: { calendar: selectedCalendarId },
                });
                const all = res.data.results || res.data || [];
                setPeriods(all);

                const today = getIstanbulToday();
                let current = all.find(
                    (p) => p.start_date && p.end_date && p.start_date <= today && today <= p.end_date
                );
                if (!current) {
                    const past = all
                        .filter((p) => p.end_date && p.end_date < today)
                        .sort((a, b) => (a.end_date < b.end_date ? 1 : -1));
                    current = past[0] || all[all.length - 1] || null;
                }
                setSelectedPeriod(current);
            } catch (err) {
                console.error('Dönemler yüklenemedi:', err);
            }
        };
        fetchPeriods();
    }, [selectedCalendarId]);

    // Dönem / takvim / tarih aralığı değişince üst sayfaya parametreleri ilet
    useEffect(() => {
        if (!onParamsChange) return;
        // Serbest aralık seçiliyse o öncelikli
        if (dateRange && dateRange[0] && dateRange[1]) {
            onParamsChange({
                params: {
                    start: dateRange[0].format('YYYY-MM-DD'),
                    end: dateRange[1].format('YYYY-MM-DD'),
                },
                ready: true,
            });
            return;
        }
        if (selectedPeriod) {
            const params = { year: selectedPeriod.year, month: selectedPeriod.month };
            if (selectedCalendarId) params.calendar_id = selectedCalendarId;
            onParamsChange({ params, ready: true });
            return;
        }
        onParamsChange({ params: {}, ready: false });
    }, [selectedCalendarId, selectedPeriod, dateRange, onParamsChange]);

    const rangeMode = !!(dateRange && dateRange[0] && dateRange[1]);

    return (
        <div className="glass-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Çalışma Takvimi */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Çalışma Takvimi</label>
                    {loadingCalendars ? (
                        <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                    ) : (
                        <select
                            value={selectedCalendarId}
                            onChange={(e) => setSelectedCalendarId(e.target.value)}
                            disabled={rangeMode}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            {calendars.map((cal) => (
                                <option key={cal.id} value={cal.id}>
                                    {cal.name} ({cal.year}){cal.is_default ? ' ★' : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Mali Dönem */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mali Dönem</label>
                    <select
                        value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''}
                        onChange={(e) => {
                            const [y, m] = e.target.value.split('-').map(Number);
                            setSelectedPeriod(periods.find((p) => p.year === y && p.month === m) || null);
                        }}
                        disabled={rangeMode}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        {periods.map((p) => (
                            <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                                {trMonths[p.month]} {p.year}{p.is_locked ? ' 🔒' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Serbest Tarih Aralığı */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Serbest Tarih Aralığı (opsiyonel)
                    </label>
                    <RangePicker
                        value={dateRange}
                        onChange={(vals) => setDateRange(vals)}
                        format="DD.MM.YYYY"
                        allowClear
                        className="w-full"
                        placeholder={['Başlangıç', 'Bitiş']}
                        maxDate={dayjs().add(1, 'year')}
                    />
                </div>

                {/* Global Arama */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ara (isim / kod)</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder="Çalışan ara…"
                            className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => onSearchChange?.('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                aria-label="Aramayı temizle"
                            >
                                <X size={15} />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Bilgi satırı + TXT indir */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar size={15} className="text-blue-500 flex-shrink-0" />
                    {rangeMode ? (
                        <span>
                            Serbest aralık: <strong>{dateRange[0].format('DD.MM.YYYY')}</strong> —{' '}
                            <strong>{dateRange[1].format('DD.MM.YYYY')}</strong>
                            {' · '}
                            <button
                                type="button"
                                onClick={() => setDateRange(null)}
                                className="text-blue-600 hover:underline"
                            >
                                Mali döneme dön
                            </button>
                        </span>
                    ) : selectedPeriod ? (
                        <span>
                            Dönem: <strong>{fmtDate(selectedPeriod.start_date)}</strong> —{' '}
                            <strong>{fmtDate(selectedPeriod.end_date)}</strong>
                            {selectedPeriod.is_locked ? ' · 🔒 Kilitli' : ' · Açık dönem'}
                        </span>
                    ) : (
                        <span className="text-slate-400">Dönem seçilmedi</span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onExport}
                    disabled={exporting || (!selectedPeriod && !rangeMode)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {exporting ? (
                        <><Loader2 size={16} className="animate-spin" /> Hazırlanıyor…</>
                    ) : (
                        <><FileDown size={16} /> TXT İndir</>
                    )}
                </button>
            </div>
        </div>
    );
}
