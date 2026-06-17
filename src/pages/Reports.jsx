import React, { useState, useEffect, useRef } from 'react';
import {
    FileDown, FileText, FileSpreadsheet, Calendar, Building2, Loader2,
} from 'lucide-react';
import api from '../services/api';
import ModalOverlay from '../components/ui/ModalOverlay';
import { getIstanbulToday } from '../utils/dateUtils';

// Tek rapor: Aylık Mutabakat (Excel + PDF endpoint'lerine bağlı)
const MONTHLY_REPORT = {
    key: 'monthly',
    title: 'Aylık Mutabakat Raporu',
    desc: 'Personel bazlı günlük mesai, izin/mazeret, fazla mesai ve dönem bakiyesi özeti.',
    icon: FileSpreadsheet,
    excel: 'export_excel',
    pdf: 'export_pdf',
    file: 'Mesai_Raporu',
};

// İndirme timeout'ları (ms). Tüm şirket raporu ~300 çalışan için dakikalarca sürebilir;
// gunicorn tarafı 3600sn'e kadar bekler, bu yüzden frontend timeout'unu kapsama göre
// ölçeklendiriyoruz (varsayılan axios 30sn tüm-şirketi indirirken yetmiyordu).
const TIMEOUT_WHOLE_COMPANY = 30 * 60 * 1000; // 30 dk — tüm şirket
const TIMEOUT_DEPARTMENT = 10 * 60 * 1000;    // 10 dk — departman
const TIMEOUT_SINGLE = 3 * 60 * 1000;         // 3 dk — tek personel

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
    // İndirme durumu: { format: 'excel'|'pdf', scope: 'company'|'department'|'single' } | null
    const [downloading, setDownloading] = useState(null);
    const [loadingCalendars, setLoadingCalendars] = useState(true);
    const abortRef = useRef(null); // devam eden indirmeyi iptal etmek için

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

    // Tek personel seçili → 'single'; departman seçili → 'department'; ikisi de yok → 'company'
    const resolveScope = () => {
        if (selectedEmployeeId) return 'single';
        if (selectedDepartmentId) return 'department';
        return 'company';
    };

    const timeoutForScope = (scope) => {
        if (scope === 'company') return TIMEOUT_WHOLE_COMPANY;
        if (scope === 'department') return TIMEOUT_DEPARTMENT;
        return TIMEOUT_SINGLE;
    };

    const handleCancelDownload = () => {
        abortRef.current?.abort();
    };

    const handleDownload = async (format) => {
        if (!selectedPeriod || downloading) return;
        const report = MONTHLY_REPORT;
        const action = format === 'excel' ? report.excel : report.pdf;
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        const scope = resolveScope();
        const controller = new AbortController();
        abortRef.current = controller;
        setDownloading({ format, scope });
        try {
            const response = await api.get(`/monthly-reports/${action}/`, {
                params: buildParams(),
                responseType: 'blob',
                timeout: timeoutForScope(scope),
                signal: controller.signal,
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            // Dosya adı kapsamla tutarlı: tek personel seçiliyse departman eki yok
            // (backend tek personelde department_id'yi yok sayar).
            const suffix = selectedEmployeeId
                ? `_emp${selectedEmployeeId}`
                : (selectedDepartmentId ? `_dep${selectedDepartmentId}` : '');
            link.setAttribute(
                'download',
                `${report.file}_${selectedPeriod.year}_${selectedPeriod.month}${suffix}.${ext}`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            // Kullanıcı iptal ettiyse sessiz geç (finally yükleme ekranını kapatır)
            if (error?.code === 'ERR_CANCELED') {
                return;
            }
            // Timeout hatası ayrı mesaj (blob gövdesi yok)
            let msg = 'Rapor indirilemedi.';
            if (error?.code === 'ECONNABORTED') {
                msg = 'Rapor hazırlanması çok uzun sürdü (zaman aşımı). Lütfen departman veya personel filtresiyle daraltıp tekrar deneyin.';
            } else {
                // Backend hata gövdesi blob olarak gelir — gerçek mesajı oku
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
            }
            console.error('Download failed:', error);
            // Önce yükleme ekranını kapat, sonra uyarıyı göster (alert bloklarken
            // modal altta asılı kalmasın)
            abortRef.current = null;
            setDownloading(null);
            alert(msg);
            return;
        } finally {
            abortRef.current = null;
            setDownloading(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul',
        });
    };

    // Departman seçiliyse çalışan listesini o departmana göre süz (UI kolaylığı)
    const filteredEmployees = employees.filter((e) => {
        if (!selectedDepartmentId) return true;
        const depId = e.department?.id ?? e.department;
        return String(depId) === String(selectedDepartmentId);
    });

    const ReportIcon = MONTHLY_REPORT.icon;
    const scopeLabel = {
        company: 'Tüm şirket',
        department: 'Seçili departman',
        single: 'Tek personel',
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Raporlar</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Mali dönem bazlı Aylık Mutabakat Raporunu Excel/PDF olarak indirin.
                </p>
            </div>

            {/* Filtreler + indirme */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-50 text-green-600">
                        <ReportIcon size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800">{MONTHLY_REPORT.title}</h3>
                        <p className="text-xs text-slate-500 leading-snug">{MONTHLY_REPORT.desc}</p>
                    </div>
                </div>

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
                        onClick={() => handleDownload('excel')}
                        disabled={downloading !== null || !selectedPeriod}
                        className="py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {downloading?.format === 'excel' ? (
                            <><Loader2 size={18} className="animate-spin" /> Hazırlanıyor...</>
                        ) : (
                            <><FileDown size={18} /> Excel İndir</>
                        )}
                    </button>
                    <button
                        onClick={() => handleDownload('pdf')}
                        disabled={downloading !== null || !selectedPeriod}
                        className="py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {downloading?.format === 'pdf' ? (
                            <><Loader2 size={18} className="animate-spin" /> Hazırlanıyor...</>
                        ) : (
                            <><FileText size={18} /> PDF İndir</>
                        )}
                    </button>
                </div>

                {(selectedDepartmentId || selectedEmployeeId) ? (
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                        <Building2 size={12} />
                        {selectedEmployeeId
                            ? 'Tek personel raporu (departman filtresi yok sayılır).'
                            : 'Seçili departman için rapor üretilecek.'}
                    </p>
                ) : (
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                        <Building2 size={12} />
                        Tüm şirket raporu üretilecek — kişi sayısına göre birkaç dakika veya daha uzun sürebilir.
                    </p>
                )}
            </div>

            {/* Yükleme ekranı (indirme sırasında) */}
            <ModalOverlay
                open={downloading !== null}
                closeOnOverlayClick={false}
                closeOnEsc={false}
            >
                <div
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                    className="bg-white rounded-xl shadow-xl border border-slate-200 px-8 py-7 max-w-sm w-full mx-auto text-center"
                >
                    <div
                        aria-hidden="true"
                        className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4"
                    >
                        <Loader2 size={28} className="text-blue-600 animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Rapor Hazırlanıyor</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {scopeLabel[downloading?.scope] || 'Rapor'} ·{' '}
                        {downloading?.format === 'excel' ? 'Excel' : 'PDF'} dosyası oluşturuluyor…
                    </p>
                    {downloading?.scope === 'company' && (
                        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Tüm şirket için tüm personel işleniyor. Bu işlem kişi sayısına göre
                                {' '}<strong>birkaç dakika veya daha uzun</strong> sürebilir — lütfen sayfayı
                                kapatmayın veya yenilemeyin.
                            </p>
                        </div>
                    )}
                    <div
                        aria-hidden="true"
                        className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"
                    >
                        <div className="h-full w-1/3 bg-blue-500 rounded-full report-progress-bar" />
                    </div>
                    <button
                        type="button"
                        onClick={handleCancelDownload}
                        className="mt-5 text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                    >
                        İptal
                    </button>
                </div>
            </ModalOverlay>
        </div>
    );
};

export default Reports;
