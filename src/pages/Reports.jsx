import React, { useState, useEffect } from 'react';
import {
    FileDown, FileText, FileSpreadsheet, Calendar, Clock,
    CalendarDays, Building2,
} from 'lucide-react';
import api from '../services/api';
import { getIstanbulToday } from '../utils/dateUtils';

// Rapor türleri — her biri Excel + PDF endpoint'lerine bağlı
const REPORTS = [
    {
        key: 'monthly',
        title: 'Aylık Mutabakat Raporu',
        desc: 'Personel bazlı günlük mesai, izin/mazeret, fazla mesai ve dönem bakiyesi özeti.',
        icon: FileSpreadsheet,
        color: 'green',
        excel: 'export_excel',
        pdf: 'export_pdf',
        file: 'Mesai_Raporu',
    },
    {
        key: 'overtime',
        title: 'Fazla Mesai Raporu',
        desc: 'Onaylı/bekleyen fazla mesai detayı: tarih, saat, süre, kaynak, onaylayan.',
        icon: Clock,
        color: 'amber',
        excel: 'overtime_excel',
        pdf: 'overtime_pdf',
        file: 'Fazla_Mesai_Raporu',
    },
    {
        key: 'leave',
        title: 'İzin & Bakiye Raporu',
        desc: 'Yıllık izin bakiyesi, kullanım, devir/yanma ve mazeret izni kotası.',
        icon: CalendarDays,
        color: 'blue',
        excel: 'leave_balance_excel',
        pdf: 'leave_balance_pdf',
        file: 'Izin_Bakiye_Raporu',
    },
];

const trMonths = {
    1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
    7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık',
};

const Reports = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState('');
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [activeReport, setActiveReport] = useState('monthly');
    const [loadingKey, setLoadingKey] = useState(null); // `${reportKey}-${format}`
    const [loadingCalendars, setLoadingCalendars] = useState(true);

    // İlk yükleme: takvimler, departmanlar, çalışanlar
    useEffect(() => {
        const fetchCalendars = async () => {
            try {
                const res = await api.get('/attendance/fiscal-calendars/');
                const cals = res.data.results || res.data;
                setCalendars(cals);
                const defaultCal = cals.find((c) => c.is_default) || cals[0];
                if (defaultCal) setSelectedCalendarId(defaultCal.id);
            } catch (err) {
                console.error('Calendar fetch error:', err);
            }
            setLoadingCalendars(false);
        };
        const fetchDepartments = async () => {
            try {
                const res = await api.get('/departments/');
                setDepartments(res.data.results || res.data || []);
            } catch (err) {
                console.error('Department fetch error:', err);
            }
        };
        const fetchEmployees = async () => {
            try {
                // include_inactive: ayrılan personelin geçmiş dönem raporu seçilebilsin
                const res = await api.get('/employees/', {
                    params: { page_size: 500, include_inactive: 1 },
                });
                setEmployees(res.data.results || res.data || []);
            } catch (err) {
                console.error('Employee fetch error:', err);
            }
        };
        fetchCalendars();
        fetchDepartments();
        fetchEmployees();
    }, []);

    // Takvim değişince dönemleri çek + içinde bulunulan mali dönemi seç
    useEffect(() => {
        if (!selectedCalendarId) return;
        const fetchPeriods = async () => {
            try {
                const res = await api.get('/attendance/fiscal-periods/', {
                    params: { calendar: selectedCalendarId },
                });
                const all = res.data.results || res.data;
                setPeriods(all);

                const today = getIstanbulToday(); // YYYY-MM-DD
                // Mali dönem 26-25 olduğundan takvim ayı değil, tarih aralığına göre seç
                let current = all.find(
                    (p) => p.start_date && p.end_date && p.start_date <= today && today <= p.end_date
                );
                if (!current) {
                    // Eşleşme yoksa: en son BİTMİŞ dönem (gelecek dönem değil)
                    const past = all
                        .filter((p) => p.end_date && p.end_date < today)
                        .sort((a, b) => (a.end_date < b.end_date ? 1 : -1));
                    current = past[0] || all[all.length - 1] || null;
                }
                setSelectedPeriod(current);
            } catch (err) {
                console.error('Periods fetch error:', err);
            }
        };
        fetchPeriods();
    }, [selectedCalendarId]);

    const buildParams = () => {
        const params = { year: selectedPeriod.year, month: selectedPeriod.month };
        if (selectedCalendarId) params.calendar_id = selectedCalendarId;
        if (selectedEmployeeId) params.employee_id = selectedEmployeeId;
        if (selectedDepartmentId) params.department_id = selectedDepartmentId;
        return params;
    };

    const handleDownload = async (report, format) => {
        if (!selectedPeriod) return;
        const action = format === 'excel' ? report.excel : report.pdf;
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        setLoadingKey(`${report.key}-${format}`);
        try {
            const response = await api.get(`/monthly-reports/${action}/`, {
                params: buildParams(),
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const suffix =
                (selectedEmployeeId ? `_emp${selectedEmployeeId}` : '') +
                (selectedDepartmentId ? `_dep${selectedDepartmentId}` : '');
            link.setAttribute(
                'download',
                `${report.file}_${selectedPeriod.year}_${selectedPeriod.month}${suffix}.${ext}`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            // Backend hata gövdesi blob olarak gelir — gerçek mesajı oku
            let msg = 'Rapor indirilemedi.';
            const data = error?.response?.data;
            if (data instanceof Blob) {
                try {
                    const txt = await data.text();
                    const j = JSON.parse(txt);
                    if (j?.error) msg = j.error;
                } catch {
                    /* JSON değilse genel mesaj kalır */
                }
            } else if (data?.error) {
                msg = data.error;
            }
            console.error('Download failed:', error);
            alert(msg);
        } finally {
            setLoadingKey(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul',
        });
    };

    const colorClasses = {
        green: 'bg-green-50 text-green-600',
        amber: 'bg-amber-50 text-amber-600',
        blue: 'bg-blue-50 text-blue-600',
    };

    const activeCfg = REPORTS.find((r) => r.key === activeReport) || REPORTS[0];

    // Departman seçiliyse çalışan listesini o departmana göre süz (UI kolaylığı)
    const filteredEmployees = employees.filter((e) => {
        if (!selectedDepartmentId) return true;
        const depId = e.department?.id ?? e.department;
        return String(depId) === String(selectedDepartmentId);
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Raporlar</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Mali dönem bazlı mesai, fazla mesai ve izin raporlarını Excel/PDF indirin.
                </p>
            </div>

            {/* Rapor türü seçici */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {REPORTS.map((r) => {
                    const Icon = r.icon;
                    const active = r.key === activeReport;
                    return (
                        <button
                            key={r.key}
                            onClick={() => setActiveReport(r.key)}
                            className={`text-left p-4 rounded-xl border transition-all ${
                                active
                                    ? 'border-blue-500 ring-2 ring-blue-100 bg-white shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${colorClasses[r.color]}`}>
                                    <Icon size={20} />
                                </div>
                                <span className="font-semibold text-slate-800 text-sm">{r.title}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-snug">{r.desc}</p>
                        </button>
                    );
                })}
            </div>

            {/* Filtreler + indirme */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">{activeCfg.title}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Takvim */}
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mali Dönem</label>
                        <select
                            value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.month}` : ''}
                            onChange={(e) => {
                                const [y, m] = e.target.value.split('-').map(Number);
                                setSelectedPeriod(periods.find((p) => p.year === y && p.month === m));
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            {periods.map((p) => (
                                <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                                    {trMonths[p.month]} {p.year}{p.is_locked ? ' 🔒' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Departman */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Departman</label>
                        <select
                            value={selectedDepartmentId}
                            onChange={(e) => {
                                setSelectedDepartmentId(e.target.value);
                                setSelectedEmployeeId(''); // departman değişince personel seçimini sıfırla
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="">Tüm Departmanlar</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Personel (ayrılanlar dahil) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Personel</label>
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="">Tüm Çalışanlar</option>
                            {filteredEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name}
                                    {emp.is_active === false ? ' (ayrıldı)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Dönem bilgi kutusu */}
                {selectedPeriod && (
                    <div className="bg-blue-50 mt-4 p-2 sm:p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <Calendar size={16} className="text-blue-600 flex-shrink-0" />
                        <span className="text-xs text-blue-700">
                            Rapor Aralığı: <strong>{formatDate(selectedPeriod.start_date)}</strong> — <strong>{formatDate(selectedPeriod.end_date)}</strong>
                            {selectedPeriod.is_locked ? ' · 🔒 Kilitli (kesinleşmiş)' : ' · Açık dönem (değişebilir)'}
                        </span>
                    </div>
                )}

                {/* İndirme butonları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-5">
                    <button
                        onClick={() => handleDownload(activeCfg, 'excel')}
                        disabled={loadingKey !== null || !selectedPeriod}
                        className="py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loadingKey === `${activeCfg.key}-excel` ? 'Hazırlanıyor...' : (
                            <><FileDown size={18} /> Excel İndir</>
                        )}
                    </button>
                    <button
                        onClick={() => handleDownload(activeCfg, 'pdf')}
                        disabled={loadingKey !== null || !selectedPeriod}
                        className="py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loadingKey === `${activeCfg.key}-pdf` ? 'Hazırlanıyor...' : (
                            <><FileText size={18} /> PDF İndir</>
                        )}
                    </button>
                </div>

                {(selectedDepartmentId || selectedEmployeeId) && (
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                        <Building2 size={12} />
                        {selectedEmployeeId
                            ? 'Tek personel raporu (departman filtresi yok sayılır).'
                            : 'Seçili departman için rapor üretilecek.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default Reports;
