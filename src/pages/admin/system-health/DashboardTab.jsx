import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

import {
    CpuChipIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    XCircleIcon,
    CommandLineIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';

export default function DashboardTab({ stats, refresh, loading }) {
    const [recalcConsoleOpen, setRecalcConsoleOpen] = useState(false);
    const [recalcLogs, setRecalcLogs] = useState([]);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [runtimeConfig, setRuntimeConfig] = useState({});
    const [configLoading, setConfigLoading] = useState(true);
    const [systemSettings, setSystemSettings] = useState(null);
    const [startDateInput, setStartDateInput] = useState('');
    const [startDateSaving, setStartDateSaving] = useState(false);

    useEffect(() => {
        api.get('/system/health-check/get_runtime_config/')
            .then(res => setRuntimeConfig(res.data))
            .catch(() => {})
            .finally(() => setConfigLoading(false));

        // Fetch system settings (start date)
        api.get('/settings/').then(res => {
            const data = Array.isArray(res.data) ? res.data[0] : (res.data.results?.[0] || res.data);
            if (data) {
                setSystemSettings(data);
                setStartDateInput(data.attendance_start_date || '');
            }
        }).catch(() => {});
    }, []);

    const saveStartDate = async () => {
        if (!startDateInput) return;
        if (!window.confirm(`Sistem ba\u015Flang\u0131\u00E7 tarihi "${startDateInput}" olarak ayarlanacak.\n\nBu tarihten \u00F6nceki t\u00FCm puantaj verileri hesaplamalarda dikkate al\u0131nmayacakt\u0131r.\n\nOnayl\u0131yor musunuz?`)) return;
        setStartDateSaving(true);
        try {
            const settingsId = systemSettings?.id;
            if (settingsId) {
                await api.patch(`/settings/${settingsId}/`, { attendance_start_date: startDateInput });
            } else {
                await api.post('/settings/', { attendance_start_date: startDateInput });
            }
            setSystemSettings(prev => ({ ...prev, attendance_start_date: startDateInput }));
            alert('Sistem ba\u015Flang\u0131\u00E7 tarihi kaydedildi.');
        } catch (e) {
            alert('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setStartDateSaving(false);
        }
    };

    const clearStartDate = async () => {
        if (!window.confirm('Sistem ba\u015Flang\u0131\u00E7 tarihi kald\u0131r\u0131lacak. Onayl\u0131yor musunuz?')) return;
        setStartDateSaving(true);
        try {
            const settingsId = systemSettings?.id;
            if (settingsId) {
                await api.patch(`/settings/${settingsId}/`, { attendance_start_date: null });
            }
            setSystemSettings(prev => ({ ...prev, attendance_start_date: null }));
            setStartDateInput('');
            alert('Sistem ba\u015Flang\u0131\u00E7 tarihi kald\u0131r\u0131ld\u0131.');
        } catch (e) {
            alert('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setStartDateSaving(false);
        }
    };

    const toggleConfig = async (key, value) => {
        try {
            await api.post('/system/health-check/toggle_runtime_config/', { key, value });
            setRuntimeConfig(prev => ({ ...prev, [key]: value }));
        } catch (e) {
            console.error('Config toggle error:', e);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* KPI Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Toplam \u00C7al\u0131\u015Fan" value={stats?.total_employees} icon={CpuChipIcon} color="blue" loading={loading} />
                <KPICard title="Aktif \u00C7al\u0131\u015Fan" value={stats?.active_employees} icon={CheckCircleIcon} color="green" loading={loading} />
                <KPICard title="Bug\u00FCnk\u00FC Kay\u0131t" value={stats?.attendance_today} icon={ClockIcon} color="indigo" loading={loading} />
                <KPICard title="Bekleyen \u0130zin" value={stats?.pending_leave_requests} icon={ExclamationTriangleIcon} color="orange" loading={loading} />
            </div>

            {/* Runtime Config */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CpuChipIcon className="w-4 h-4 text-gray-400" />
                    Sistem Ayarlari
                </h3>
                <div className="space-y-5">
                    {/* Toggle: Servis Loglar\u0131 */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={runtimeConfig.service_logs_enabled || false}
                                disabled={configLoading}
                                onChange={e => toggleConfig('service_logs_enabled', e.target.checked)}
                            />
                            <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Servis Loglari</span>
                            <p className="text-xs text-gray-400">Acildiginda puantaj motorunun detayli loglarini DB'ye yazar. Servis Kontrol sayfasinda gorunur.</p>
                        </div>
                    </label>

                    {/* Sistem Ba\u015Flang\u0131\u00E7 Tarihi */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg mt-0.5">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-800">Sistem Baslangic Tarihi</h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Bu tarih sistemin canli olarak kullanilmaya basladigi gunu belirtir.
                                    Bu tarihten onceki puantaj verileri hesaplamalarda dikkate alinmaz.
                                </p>
                                <div className="flex items-center gap-3 mt-3">
                                    <input
                                        type="date"
                                        value={startDateInput}
                                        onChange={e => setStartDateInput(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    />
                                    <button
                                        onClick={saveStartDate}
                                        disabled={startDateSaving || !startDateInput}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {startDateSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                    {systemSettings?.attendance_start_date && (
                                        <button
                                            onClick={clearStartDate}
                                            disabled={startDateSaving}
                                            className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            Kaldir
                                        </button>
                                    )}
                                </div>
                                {systemSettings?.attendance_start_date && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-xs font-medium text-green-700">
                                            Aktif: {new Date(systemSettings.attendance_start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                {!systemSettings?.attendance_start_date && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                        <span className="text-xs text-gray-400">Henuz ayarlanmadi</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Panel */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrashIcon className="w-5 h-5 text-gray-400" />
                    Veri Temizli\u011Fi ve Y\u00F6netimi (Tehlikeli \u0130\u015Flemler)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionButton
                        label="Hata Taramas\u0131 (Regression Scan)"
                        description="Sistemde bilinen hatalar\u0131n (False Pending, Ghost Records) kal\u0131nt\u0131lar\u0131n\u0131 tarar."
                        hazard={false}
                        onClick={async () => {
                            try {
                                const res = await api.get('/system/health-check/detect_regression_artifacts/');
                                const rep = res.data.report;
                                const msg = `TRAMA SONUCU (${res.data.status.toUpperCase()}):\n\n` +
                                    `False Pending: ${rep.false_pending_count}\n` +
                                    `Ghost Records: ${rep.ghost_record_count}\n\n` +
                                    (rep.details.length > 0 ? "Detaylar:\n" + rep.details.join('\n') : "Sistem Temiz.");
                                alert(msg);
                            } catch (e) {
                                alert("Tarama Hatas\u0131: " + (e.response?.data?.error || e.message));
                            }
                        }}
                    />

                    <ActionButton
                        label="Sistemi Yeniden Hesapla (Detayl\u0131 Log)"
                        description="Mevcut giri\u015F/\u00E7\u0131k\u0131\u015F verilerini koruyarak t\u00FCm puantaj hesaplamalar\u0131n\u0131 yeniler ve i\u015Flem loglar\u0131n\u0131 d\u00F6ker."
                        hazard={false}
                        onClick={() => setRecalcConsoleOpen(true)}
                    />

                    <ActionButton
                        label="Molalar\u0131 Yeniden Olu\u015Ftur (Otomatik Kesinti)"
                        description="Belirtilen tarih aral\u0131\u011F\u0131ndaki t\u00FCm kay\u0131tlar\u0131 tarar ve personelin ba\u011Fl\u0131 oldu\u011Fu takvimin mola kurallar\u0131na g\u00F6re (\u00F6rn: 30dk veya 60dk) otomatik d\u00FC\u015F\u00FCm yapar."
                        hazard={false}
                        onClick={async () => {
                            const start = prompt("Ba\u015Flang\u0131\u00E7 Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 8) + '01');
                            if (!start) return;
                            const end = prompt("Biti\u015F Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                            if (!end) return;

                            if (confirm(`${start} - ${end} aras\u0131 t\u00FCm personelin molalar\u0131 takvim kurallar\u0131na g\u00F6re yeniden hesaplanacak. Onayl\u0131yor musunuz?`)) {
                                try {
                                    setRecalcConsoleOpen(true);
                                    setRecalcLoading(true);
                                    setRecalcLogs(['> Mola \u0130yile\u015Ftirme Ba\u015Flat\u0131l\u0131yor...', `> Aral\u0131k: ${start} - ${end}`]);

                                    const res = await api.post('/system/health-check/regenerate_compliance/', { start_date: start, end_date: end });

                                    setRecalcLogs(prev => [...prev, ...res.data.logs, `> SONU\u00C7: ${res.data.message}`]);
                                    alert(res.data.message);
                                    refresh();
                                } catch (e) {
                                    setRecalcLogs(prev => [...prev, `> HATA: ${e.response?.data?.error || e.message}`]);
                                    alert("Hata: " + (e.response?.data?.error || e.message));
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="Standart Mesai Harici Temizle"
                        description="Vardiya saatleri d\u0131\u015F\u0131ndaki (Erken Giri\u015F / Ge\u00E7 \u00C7\u0131k\u0131\u015F) t\u00FCm s\u00FCreleri siler ve giri\u015F-\u00E7\u0131k\u0131\u015F saatlerini vardiya saatlerine e\u015Fitler. Fazla mesaileri s\u0131f\u0131rlar."
                        hazard={true}
                        onClick={async () => {
                            const start = prompt("Ba\u015Flang\u0131\u00E7 Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 8) + '01');
                            if (!start) return;
                            const end = prompt("Biti\u015F Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                            if (!end) return;

                            if (confirm(`D\u0130KKAT: ${start} - ${end} aras\u0131ndaki t\u00FCm kay\u0131tlarda ERKEN G\u0130R\u0130\u015E ve GE\u00C7 \u00C7IKI\u015ELAR S\u0130L\u0130NECEK. Sadece standart \u00E7al\u0131\u015Fma saatleri kalacak. Onayl\u0131yor musunuz?`)) {
                                try {
                                    setRecalcConsoleOpen(true);
                                    setRecalcLoading(true);
                                    setRecalcLogs(['> Vardiyaya E\u015Fitleme Ba\u015Flat\u0131l\u0131yor...', `> Aral\u0131k: ${start} - ${end}`, '> Bu i\u015Flem fazla mesaileri silebilir.']);

                                    const res = await api.post('/system/health-check/snap_attendance_to_shift/', { start_date: start, end_date: end });

                                    setRecalcLogs(prev => [...prev, `> Ba\u015Far\u0131yla G\u00FCncellendi: ${res.data.updated_count} kay\u0131t`, `> Mesaj: ${res.data.message}`]);
                                    alert(res.data.message);
                                    refresh();
                                } catch (e) {
                                    setRecalcLogs(prev => [...prev, `> HATA: ${e.response?.data?.error || e.message}`]);
                                    alert("Hata: " + (e.response?.data?.error || e.message));
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />

                    {/* Recalculate Console Modal/Area */}
                    {recalcConsoleOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-900 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
                                <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
                                    <h3 className="text-white font-mono font-bold flex items-center gap-2">
                                        <CommandLineIcon className="w-5 h-5 text-green-400" />
                                        RECALCULATION_LOGS.log
                                    </h3>
                                    <button onClick={() => setRecalcConsoleOpen(false)} className="text-gray-400 hover:text-white transition">
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 bg-gray-950 p-4 overflow-y-auto font-mono text-xs text-green-300 space-y-1">
                                    {recalcLogs.length === 0 && !recalcLoading && (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                                            <p>Log d\u00F6k\u00FCm\u00FC i\u00E7in i\u015Flemi ba\u015Flat\u0131n.</p>
                                            <button
                                                onClick={async () => {
                                                    setRecalcLoading(true);
                                                    setRecalcLogs(['> Ba\u015Flat\u0131l\u0131yor...', '> T\u00FCm personel taran\u0131yor...']);
                                                    try {
                                                        const res = await api.post('/attendance/recalculate-history/', { debug_console: true });
                                                        setRecalcLogs(prev => [...prev, ...res.data.logs, `> B\u0130TT\u0130: ${res.data.status}`]);
                                                        refresh();
                                                    } catch (e) {
                                                        setRecalcLogs(prev => [...prev, `> HATA: ${e.response?.data?.error || e.message}`]);
                                                    } finally {
                                                        setRecalcLoading(false);
                                                    }
                                                }}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition"
                                            >
                                                BA\u015ELAT (DEBUG MODE)
                                            </button>
                                        </div>
                                    )}
                                    {recalcLogs.map((l, i) => {
                                        let content = l;
                                        if (typeof l === 'object' && l !== null) {
                                            content = `[${l.time}] ${l.message} ${l.details ? ` (${l.details})` : ''}`;
                                        }
                                        return (
                                            <div key={i} className="whitespace-pre-wrap break-all border-b border-gray-900/50 pb-0.5 text-xs text-green-300 font-mono">
                                                {content}
                                            </div>
                                        );
                                    })}
                                    {recalcLoading && <div className="animate-pulse text-green-500 mt-2">_ \u0130\u015Fleniyor...</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    <ActionButton
                        label="T\u00FCm Verileri S\u0131f\u0131rla (Fabrika Ayarlar\u0131)"
                        description="T\u00DCM Mesai, \u0130zin ve Talep verilerini TAMAMEN S\u0130LER."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('D\u0130KKAT: T\u00DCM KATILIM VER\u0130LER\u0130N\u0130 S\u0130LMEK \u00DCZER\u0130S\u0130N\u0130Z!\nBu i\u015Flem geri al\u0131namaz.\nDevam etmek istiyor musunuz?')) {
                                try {
                                    const res = await api.post('/attendance/reset-all-data/');
                                    alert(res.data.status);
                                    refresh();
                                } catch (e) {
                                    const msg = e.response?.data?.error || e.response?.data?.detail || e.message;
                                    alert('Hata: ' + msg);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="Test Verilerini Temizle"
                        description="Stres testi s\u0131ras\u0131nda olu\u015Fturulan ge\u00E7ici kullan\u0131c\u0131lar\u0131 (Test User*) siler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('Test kullan\u0131c\u0131lar\u0131n\u0131 silmek istiyor musunuz?')) {
                                try {
                                    const res = await api.post('/employees/cleanup-test-data/');
                                    const deletedUsers = res.data.deleted_users || [];

                                    if (deletedUsers.length > 0) {
                                        alert(`${res.data.status}\n\nSilinen: ${deletedUsers.length} kullan\u0131c\u0131`);
                                    } else {
                                        alert(res.data.status);
                                    }

                                    refresh();
                                } catch (e) {
                                    const msg = e.response?.data?.error || e.response?.data?.detail || e.message;
                                    const trace = e.response?.data?.traceback ? '\n\n' + e.response.data.traceback : '';
                                    console.error("Cleanup Error:", e);
                                    alert('Hata: ' + msg + trace);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="T\u00DCM \u0130zin ve Mesai Taleplerini Sil"
                        description="Sistemdeki T\u00DCM talep kay\u0131tlar\u0131n\u0131 (\u0130zin, Fazla Mesai, Yemek, Karts\u0131z Giri\u015F) kal\u0131c\u0131 olarak siler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('D\u0130KKAT: Sistemdeki T\u00DCM talepleri (\u0130zin, FM, Yemek, vb.) silmek \u00FCzeresiniz!\nBu i\u015Flem geri al\u0131namaz.\nDevam etmek istiyor musunuz?')) {
                                try {
                                    const res = await api.post('/system/health-check/clear_requests/', { model_type: 'all' });
                                    alert(res.data.message);
                                    refresh();
                                } catch (e) {
                                    alert('Hata: ' + (e.response?.data?.error || e.message));
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="T\u00FCm Test Departman/Pozisyon Verilerini Sil"
                        description="'Stress', 'Diagnostic', 'Test', 'Deneme' i\u00E7eren t\u00FCm yap\u0131lar\u0131 temizler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('\u0130\u00E7inde "Test", "Stress", "Diagnostic" ge\u00E7en T\u00DCM Departman ve Pozisyonlar silinecek.\nBu i\u015Flem geri al\u0131namaz. Onayl\u0131yor musunuz?')) {
                                setRecalcConsoleOpen(true);
                                setRecalcLogs(['> Temizlik \u0130\u015Flemi Ba\u015Flat\u0131l\u0131yor...', '> Hedef: Stress, Diagnostic, Test, Deneme...']);
                                setRecalcLoading(true);
                                try {
                                    // Artificial delay to show "Scanning" feel if super fast
                                    await new Promise(r => setTimeout(r, 800));

                                    const res = await api.post('/system/health-check/run_metadata_cleanup/');
                                    setRecalcLogs(prev => [...prev, `> \u0130\u015ELEM BA\u015EARILI.`, `> Mesaj: ${res.data.message}`]);
                                    refresh();
                                } catch (e) {
                                    const errMsg = e.response?.data?.error || e.message;
                                    setRecalcLogs(prev => [...prev, `> \u274C HATA: ${errMsg}`, '> Endpoint 404 ise: Backend deploy edilmemi\u015F olabilir.']);
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="Celery Kuyru\u011Funu Temizle (AC\u0130L)"
                        description="Sistemdeki t\u00FCm bekleyen g\u00F6revleri (Queue) siler. Log ta\u015Fmas\u0131 veya g\u00F6rev birikmesi durumunda kullan\u0131n."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('D\u0130KKAT! Bekleyen T\u00DCM arka plan g\u00F6revleri silinecek. Log ta\u015Fmas\u0131 veya s\u0131k\u0131\u015Fma varsa bunu kullan\u0131n.\n\nDevam edilsin mi?')) {
                                try {
                                    setRecalcConsoleOpen(true);
                                    setRecalcLoading(true);
                                    setRecalcLogs([
                                        '> \uD83D\uDE80 Temizlik \u0130\u015Flemi Ba\u015Flat\u0131l\u0131yor...',
                                        '> \uD83D\uDD0C Redis Sunucusuna Ba\u011Flan\u0131l\u0131yor...',
                                        '> \u2622\uFE0F FLUSHALL komutu haz\u0131rlan\u0131yor...'
                                    ]);

                                    // Artificial delay for UX
                                    await new Promise(r => setTimeout(r, 1000));

                                    const res = await api.post('/system/health-check/purge_celery_queue/');

                                    setRecalcLogs(prev => [
                                        ...prev,
                                        '> \u2622\uFE0F KOMUT G\u00D6NDER\u0130LD\u0130: FLUSHALL',
                                        `> \u2705 SUNUCU YANITI: ${res.data.status.toUpperCase()}`,
                                        `> \uD83D\uDCC4 MESAJ: ${res.data.message}`,
                                        `> \uD83D\uDDD1\uFE0F Silinen (Soft) G\u00F6rev: ${res.data.purged_count}`,
                                        '> \uD83C\uDFC1 \u0130\u015ELEM TAMAMLANDI.'
                                    ]);
                                } catch (e) {
                                    setRecalcLogs(prev => [
                                        ...prev,
                                        `> \u274C HATA: ${e.response?.data?.error || e.message}`
                                    ]);
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* System Status Panel */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Servis Durumu</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Veritaban\u0131</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">CONNECTED</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Redis / Celery</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">ACTIVE</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Gate API</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">LISTENING</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function KPICard({ title, value, icon: Icon, color, loading }) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50',
        green: 'text-green-600 bg-green-50',
        purple: 'text-purple-600 bg-purple-50',
        orange: 'text-orange-600 bg-orange-50',
    };
    const c = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${c}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                {loading ? (
                    <div className="h-8 w-16 bg-gray-100 rounded animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold text-gray-800">{value ?? '-'}</div>
                )}
            </div>
        </div>
    );
}

export function ActionButton({ label, description, onClick, hazard }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 rounded-lg border transition-all group
                ${hazard
                    ? 'border-red-100 bg-red-50/50 hover:bg-red-50 hover:border-red-200'
                    : 'border-gray-200 hover:bg-gray-50'}
            `}
        >
            <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${hazard ? 'text-red-700' : 'text-gray-700'}`}>{label}</span>
                {hazard && <TrashIcon className="w-5 h-5 text-red-300 group-hover:text-red-500" />}
            </div>
            {description && <p className={`text-xs ${hazard ? 'text-red-500' : 'text-gray-500'}`}>{description}</p>}
        </button>
    );
}
