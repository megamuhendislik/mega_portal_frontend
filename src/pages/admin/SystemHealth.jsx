import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

// Icons
import {
    ServerStackIcon,
    ClockIcon,
    ShieldCheckIcon,
    PlayCircleIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    CommandLineIcon,
    TrashIcon,
    KeyIcon,
    SparklesIcon,
    ClipboardDocumentCheckIcon,
    WrenchScrewdriverIcon,
    PauseCircleIcon,
    ChartBarIcon,
    UsersIcon,
    BuildingOfficeIcon,
    CreditCardIcon,
    UserGroupIcon,
    CakeIcon,
    BeakerIcon,
    BoltIcon,
    BugAntIcon,
    MoonIcon,
    UserIcon,
    FunnelIcon,
    CalculatorIcon,
    ArrowsRightLeftIcon,
    MagnifyingGlassIcon,
    IdentificationIcon,
    DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';

import ResourceMonitor from '../../components/ResourceMonitor';

// Extracted tab components (sadece doğrudan kullanılanlar; hub'lar kendi içe import yapar)
import DashboardTab from './system-health/DashboardTab';
import RecalculationAuditTab from './system-health/RecalculationAuditTab';
import RequestAuditTab from './system-health/RequestAuditTab';
import SettlementCarryAuditTab from './system-health/SettlementCarryAuditTab';
import GateEventPatternTab from './system-health/GateEventPatternTab';
import GhostEmployeesTab from './system-health/GhostEmployeesTab';
import PdksRawImportTab from './system-health/PdksRawImportTab';
import PdksReconcileTab from './system-health/PdksReconcileTab';

// Hub tabs (alt-sekmeli paneller — eski 44 tabı kapsar)
import TestsHubTab from './system-health/TestsHubTab';
import OTHubTab from './system-health/OTHubTab';
import RBACHubTab from './system-health/RBACHubTab';
import PersonDayHubTab from './system-health/PersonDayHubTab';
import RequestHubTab from './system-health/RequestHubTab';
import RecoveryHubTab from './system-health/RecoveryHubTab';
import AttendanceAuditHubTab from './system-health/AttendanceAuditHubTab';
import SystemMaintenanceHubTab from './system-health/SystemMaintenanceHubTab';

export default function SystemHealth() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const response = await api.get('/system/health-check/get_system_stats/');
            setStats(response.data);
        } catch (error) {
            console.error("Stats error:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ServerStackIcon className="w-7 h-7 text-indigo-600" />
                        Sistem Kontrol Merkezi
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Puantaj motoru doğrulama, servis logları ve sistem bütünlüğü paneli.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        SYSTEM ONLINE
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white px-2 rounded-xl shadow-sm border border-gray-100">
                <nav className="flex space-x-1 overflow-x-auto p-2" aria-label="Tabs">
                    {[
                        // ─── ⭐ Ana paneller ───
                        { id: 'dashboard', name: 'Genel Bakış', icon: ServerStackIcon },
                        { id: 'recalc_audit', name: 'TYR + Veri Bütünlüğü', icon: ArrowPathIcon },
                        { id: 'request_audit', name: 'Talep Denetimi', icon: DocumentMagnifyingGlassIcon },
                        { id: 'settlement_carry', name: 'Mutabakat Ay Devri', icon: ArrowsRightLeftIcon },
                        { id: 'gate_event_pattern', name: 'Gate Event Analizi', icon: BoltIcon },
                        // ─── 🎯 Hub'lar (alt-sekmeli) ───
                        { id: 'attendance_audit_hub', name: 'Mesai Denetim', icon: CalculatorIcon },
                        { id: 'ot_hub', name: 'Fazla Mesai', icon: BoltIcon },
                        { id: 'rbac_hub', name: 'RBAC & Yetki', icon: ShieldCheckIcon },
                        { id: 'persondayHub', name: 'Kişi-Gün Tanılama', icon: MagnifyingGlassIcon },
                        { id: 'request_hub', name: 'Talep & İzin', icon: ClipboardDocumentCheckIcon },
                        { id: 'recovery_hub', name: 'Onarım & Recovery', icon: WrenchScrewdriverIcon },
                        { id: 'tests_hub', name: 'Test & Doğrulama', icon: BeakerIcon },
                        { id: 'system_maintenance_hub', name: 'Sistem & Bakım', icon: ServerStackIcon },
                        // ─── 🔧 Stand-alone (özel araçlar) ───
                        { id: 'ghost_employees', name: 'Kalıntı Çalışanlar', icon: UserGroupIcon },
                        { id: 'pdks_raw_import', name: 'PDKS Raw Import', icon: CreditCardIcon },
                        { id: 'pdks_reconcile', name: 'PDKS Mutabakat', icon: IdentificationIcon },
                        { id: 'calendar_cleanup', name: 'Takvim Temizliği', icon: TrashIcon },
                        { id: 'stress_test', name: 'Stres Testi', icon: CommandLineIcon },
                        { id: 'synthetic', name: 'Sentetik Veri', icon: SparklesIcon },
                        { id: 'system_reset', name: 'Sistem Sıfırlama', icon: ExclamationTriangleIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-red-50 text-red-700'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* CONTENT AREA */}
            <div className="min-h-[500px]">
                {/* ⭐ Ana paneller */}
                {activeTab === 'dashboard' && <DashboardTab stats={stats} refresh={fetchStats} loading={loadingStats} />}
                {activeTab === 'recalc_audit' && <RecalculationAuditTab />}
                {activeTab === 'request_audit' && <RequestAuditTab />}
                {activeTab === 'settlement_carry' && <SettlementCarryAuditTab />}
                {activeTab === 'gate_event_pattern' && <GateEventPatternTab />}
                {/* 🎯 Hub'lar */}
                {activeTab === 'attendance_audit_hub' && <AttendanceAuditHubTab />}
                {activeTab === 'ot_hub' && <OTHubTab />}
                {activeTab === 'rbac_hub' && <RBACHubTab />}
                {activeTab === 'persondayHub' && <PersonDayHubTab />}
                {activeTab === 'request_hub' && <RequestHubTab />}
                {activeTab === 'recovery_hub' && <RecoveryHubTab />}
                {activeTab === 'tests_hub' && <TestsHubTab />}
                {activeTab === 'system_maintenance_hub' && <SystemMaintenanceHubTab />}
                {/* 🔧 Stand-alone */}
                {activeTab === 'ghost_employees' && <GhostEmployeesTab />}
                {activeTab === 'pdks_raw_import' && <PdksRawImportTab />}
                {activeTab === 'pdks_reconcile' && <PdksReconcileTab />}
                {activeTab === 'calendar_cleanup' && <CalendarCleanupTab />}
                {activeTab === 'stress_test' && <StressTestTab />}
                {activeTab === 'synthetic' && <SyntheticDataTab />}
                {activeTab === 'system_reset' && <SystemResetTab />}
            </div>

        </div>
    );
}

function SystemResetTab() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleWipeEmployees = async () => {
        if (!confirm("DİKKAT! Adminler hariç TÜM personel kayıtları, izinler, ve tüm geçmiş veriler SİLİNECEK.\n\nBu işlem geri alınamaz!\n\nDevam etmek istiyor musunuz?")) return;

        const verification = prompt("Onaylamak için lütfen 'SIL' yazınız:");
        if (verification !== 'SIL') return;

        setLoading(true);
        try {
            const res = await api.post('/system/health-check/wipe_all_employees/');
            setResult(res.data);
        } catch (e) {
            alert("Hata: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-6 text-red-700 bg-red-50 p-4 rounded-xl border border-red-200">
                <ExclamationTriangleIcon className="w-10 h-10" />
                <div>
                    <h3 className="text-xl font-bold">Tehlikeli Bölge (Danger Zone)</h3>
                    <p className="text-sm opacity-80">Bu alandaki işlemler geri alınamaz veri kayıplarına yol açar. Lütfen dikkatli kullanınız.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Item 1: Wipe Employees */}
                <div className="border border-red-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-gray-800 text-lg mb-2">Tüm Personeli Sil (Sıfırla)</h4>
                    <p className="text-sm text-gray-500 mb-6">
                        Süper Adminler hariç, sistemdeki <strong>tüm çalışanları</strong>, kullanıcı hesaplarını, izin taleplerini ve puantaj kayıtlarını kalıcı olarak siler via veritabanından kaldırır.
                        <br /><br />
                        Sistemi yeniden başlatmak veya test verilerini temizlemek için kullanın.
                    </p>

                    {result ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm border border-green-200">
                            <strong>İşlem Sonucu:</strong>
                            <p>{result.message || result.status}</p>
                        </div>
                    ) : (
                        <button
                            onClick={handleWipeEmployees}
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700 active:scale-95'}`}
                        >
                            {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <TrashIcon className="w-5 h-5" />}
                            {loading ? 'Siliniyor...' : 'Tüm Personeli Sil'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function CalendarCleanupTab() {
    const [calendars, setCalendars] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [result, setResult] = useState(null);

    useEffect(() => {
        scanCalendars();
    }, []);

    const scanCalendars = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/scan_junk_calendars/');
            setCalendars(res.data);
            setSelectedIds([]); // Reset selection on rescan
            setResult(null);
        } catch (e) {
            console.error(e);
            alert("Tarama Hatası!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`${selectedIds.length} adet takvim silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?`)) return;

        setLoading(true);
        try {
            const res = await api.post('/system/health-check/cleanup_calendars/', { calendar_ids: selectedIds });
            setResult(res.data);
            scanCalendars(); // Refresh list
        } catch (e) {
            alert("Silme hatası: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === calendars.length) setSelectedIds([]);
        else setSelectedIds(calendars.map(c => c.id));
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <TrashIcon className="w-6 h-6 text-red-600" />
                        Gereksiz Takvim Temizliği
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Sistem tarafından otomatik oluşturulmuş veya kullanılmayan "Custom" takvimleri tespit eder ve siler.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={scanCalendars}
                        className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 border border-gray-200"
                        title="Yeniden Tara"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Seçilenleri Sil ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Success Message */}
            {result && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm">
                    <div className="font-bold flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        İşlem Başarılı
                    </div>
                    <div>{result.deleted_count} adet takvim silindi.</div>
                    {result.errors?.length > 0 && (
                        <div className="mt-2 text-red-600">
                            <strong>Hatalar:</strong>
                            <ul className="list-disc list-inside text-xs">
                                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 w-[50px] text-center">
                                <input
                                    type="checkbox"
                                    checked={calendars.length > 0 && selectedIds.length === calendars.length}
                                    onChange={toggleSelectAll}
                                    disabled={loading || calendars.length === 0}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-4 py-3">Takvim Adı</th>
                            <th className="px-4 py-3">Yıl</th>
                            <th className="px-4 py-3">Kayıtlı Personel</th>
                            <th className="px-4 py-3">Oluşturulma Tarihi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && calendars.length === 0 && (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-400">Taranıyor...</td></tr>
                        )}
                        {!loading && calendars.length === 0 && (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                                <ShieldCheckIcon className="w-12 h-12 text-gray-200" />
                                <div>Temiz! Gereksiz takvim bulunamadı.</div>
                            </td></tr>
                        )}
                        {calendars.map(cal => (
                            <tr key={cal.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(cal.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(p => [...p, cal.id]);
                                            else setSelectedIds(p => p.filter(id => id !== cal.id));
                                        }}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="px-4 py-3 font-mono text-gray-700 font-medium">{cal.name}</td>
                                <td className="px-4 py-3 text-gray-500">{cal.year}</td>
                                <td className="px-4 py-3">
                                    {cal.employee_count > 0 ? (
                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">
                                            {cal.employee_count} Kişi
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">Kullanılmıyor</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{cal.created_at || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-xs text-gray-400 text-right">
                Toplam {calendars.length} adet "junk" potansiyeli taşıyan takvim bulundu.
            </div>
        </div>
    );
}

function StressTestTab() {
    const [isRunning, setIsRunning] = useState(false);
    const [activeTest, setActiveTest] = useState(null);
    const [logs, setLogs] = useState([]);
    const consoleEndRef = useRef(null);

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const startTest = async (endpoint, testName) => {
        setIsRunning(true);
        setActiveTest(testName);
        setLogs([`> ${testName} başlatılıyor...`, '> Async Task kuyruğa alınıyor...']);

        try {
            const startRes = await api.post(`/system/health-check/${endpoint}/`);
            if (startRes.data.error) throw new Error(startRes.data.error);

            const taskId = startRes.data.task_id;
            if (!taskId) throw new Error("Task ID alınamadı.");

            setLogs(prev => [...prev, `> Görev Kuyruğa Alındı: ${taskId}`, '> Bekleniyor...']);

            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await api.get(`/system/health-check/get_stress_test_status/?task_id=${taskId}`);
                    const { state, logs: remoteLogs, report, error } = statusRes.data;

                    if (state === 'PROGRESS' && remoteLogs) {
                        const formattedLogs = remoteLogs.map(l => {
                            if (typeof l === 'object') {
                                return `[${l.time}] ${l.message} ${l.details ? '(' + l.details + ')' : ''}`;
                            }
                            return l;
                        });
                        setLogs(formattedLogs);
                    }

                    if (state === 'SUCCESS') {
                        clearInterval(pollInterval);

                        // Show all runner logs from final report (covers fast-finish case where PROGRESS was never polled)
                        if (report?.logs && report.logs.length > 0) {
                            const formattedLogs = report.logs.map(l => {
                                if (typeof l === 'object') {
                                    return `[${l.time}] ${l.message} ${l.details ? '(' + l.details + ')' : ''}`;
                                }
                                return l;
                            });
                            setLogs(formattedLogs);
                        }

                        setLogs(prev => [...prev, '', `> TEST TAMAMLANDI: ${report?.summary || 'Sonuç yok'}`]);

                        if (report?.results && report.results.length > 0) {
                            const resultLines = report.results.map(r => {
                                const icon = r.status === 'PASS' ? '✅' : (r.status === 'FAIL' ? '❌' : '⚠️');
                                return `${icon} [#${r.id}] ${r.desc} ... ${r.status}${r.details ? ' (' + r.details + ')' : ''}`;
                            });
                            setLogs(prev => [...prev, '--- SONUÇLAR ---', ...resultLines]);
                        }

                        setIsRunning(false);
                        setActiveTest(null);
                    } else if (state === 'FAILURE') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> KRİTİK HATA: ${error}`]);
                        setIsRunning(false);
                        setActiveTest(null);
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 1000);

        } catch (error) {
            setLogs(prev => [...prev, `> BAŞLATMA HATASI: ${error.message}`]);
            setIsRunning(false);
            setActiveTest(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Control Panel */}
            <div className="col-span-1 space-y-4">
                {/* Attendance Stress Test */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-base font-bold text-gray-800 mb-1">Puantaj Stres Testi</h3>
                    <p className="text-gray-400 text-xs mb-3">150+ senaryo ile puantaj motorunu test eder</p>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                        <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
                            <li>Vardiya Toleransları (Snapping)</li>
                            <li>Otomatik Mola Kesintileri</li>
                            <li>Gece Vardiyası (Midnight Wrap)</li>
                            <li>Otomatik Mesai Bölme (Auto-Split)</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => startTest('run_comprehensive_stress_test', 'Puantaj Stres Testi')}
                        disabled={isRunning}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2
                            ${isRunning
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}
                        `}
                    >
                        {activeTest === 'Puantaj Stres Testi' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayCircleIcon className="w-4 h-4" />}
                        {activeTest === 'Puantaj Stres Testi' ? 'ÇALIŞIYOR...' : 'PUANTAJ TESTİ'}
                    </button>
                </div>

                {/* Production Readiness Test */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200">
                    <h3 className="text-base font-bold text-gray-800 mb-1">Üretim Hazırlık Testi</h3>
                    <p className="text-gray-400 text-xs mb-3">Tüm sistemleri kapsamlı test eder (production ready?)</p>

                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 mb-4">
                        <ul className="text-xs text-emerald-700 space-y-0.5 list-disc list-inside">
                            <li>Kimlik Doğrulama & Şifre Değiştirme</li>
                            <li>İzin / Mesai / Kartsız Giriş Talepleri</li>
                            <li>Onay, Red, İptal, Override Akışları</li>
                            <li>Vekalet Sistemi (Vekil Onay + Yönetici Ezme)</li>
                            <li>Güvenli Geçiş (Fernet Şifreleme)</li>
                            <li>Karar Geçmişi & Bildirim Zinciri</li>
                            <li>Aylık Özet & Hedef Hesaplama</li>
                            <li>Veri Temizliği & Bütünlük Doğrulama</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => startTest('run_production_readiness_test', 'Üretim Hazırlık Testi')}
                        disabled={isRunning}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2
                            ${isRunning
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'}
                        `}
                    >
                        {activeTest === 'Üretim Hazırlık Testi' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayCircleIcon className="w-4 h-4" />}
                        {activeTest === 'Üretim Hazırlık Testi' ? 'ÇALIŞIYOR...' : 'ÜRETİM TESTİ'}
                    </button>
                </div>
            </div>

            {/* Console Output */}
            <div className="col-span-2">
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col h-[400px] md:h-[700px]">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">
                            root@mega-engine:~# {activeTest ? `./run_${activeTest === 'Puantaj Stres Testi' ? 'stress' : 'readiness'}_test.sh` : 'bekleniyor...'}
                        </span>
                        <div className="flex gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500/80'}`}></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm text-green-400 space-y-1">
                        {logs.length === 0 && (
                            <div className="text-gray-600 select-none">
                                // Bekleniyor... Test başlatmak için soldaki butonlardan birini tıklayın.
                            </div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className={`
                                ${log.includes('❌') || log.includes('FAIL') || log.includes('HATA') ? 'text-red-400' : ''}
                                ${log.includes('⚠') || log.includes('WARN') ? 'text-yellow-400' : ''}
                                ${log.includes('PHASE') || log.includes('═══') || log.includes('╔') || log.includes('╚') ? 'text-cyan-400 font-bold' : ''}
                                ${log.includes('PRODUCTION READY') ? 'text-emerald-400 font-bold text-base' : ''}
                                ${log.includes('SORUN TESPİT') ? 'text-red-400 font-bold text-base' : ''}
                            `}>
                                {log}
                            </div>
                        ))}
                        <div ref={consoleEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SyntheticDataTab() {
    const [isRunning, setIsRunning] = useState(false);
    const [wipeExisting, setWipeExisting] = useState(true);
    const [logs, setLogs] = useState([]);
    const consoleEndRef = useRef(null);

    // Auto-scroll console
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const runGenerator = async () => {
        if (!confirm("DİKKAT: Bu işlem seçime bağlı olarak mevcut verileri silebilir ve sisteme binlerce rastgele kayıt ekler. Devam etmek istiyor musunuz?")) return;

        setIsRunning(true);
        setLogs(['> Başlatılıyor...', '> API İsteği gönderiliyor...']);

        try {
            // 1. Start Task
            const startRes = await api.post('/system/health-check/run_synthetic_data_generation/', { wipe_existing: wipeExisting });
            if (startRes.data.error) throw new Error(startRes.data.error);

            const taskId = startRes.data.task_id;
            setLogs(prev => [...prev, `> Görev Kuyruğa Alındı: ${taskId}`, '> İşleniyor...']);

            // 2. Poll Status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await api.get(`/system/health-check/get_synthetic_data_status/?task_id=${taskId}`);
                    const { state, logs: remoteLogs, report, error } = statusRes.data;

                    if (state === 'PROGRESS' && remoteLogs) {
                        // Use remote logs as source of truth for the list
                        const formattedLogs = remoteLogs.map(l => l);
                        setLogs(formattedLogs);
                    }

                    if (state === 'SUCCESS') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> ✅ İŞLEM BAŞARILI.`, `> Özet: ${report.summary}`]);
                        setIsRunning(false);
                    } else if (state === 'FAILURE') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> ❌ KRİTİK HATA: ${error}`]);
                        setIsRunning(false);
                    }

                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 1000);

        } catch (error) {
            setLogs(prev => [...prev, `> BAŞLATMA HATASI: ${error.message}`]);
            setIsRunning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Control Panel */}
            <div className="col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Sentetik Veri Üretimi</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Test ortamı için geçmişe yönelik rastgele veri üretir.
                    </p>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                        <h4 className="text-xs font-bold text-purple-800 uppercase mb-2">Nasıl Çalışır?</h4>
                        <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                            <li>Personelin İşe Giriş Tarihinden itibaren başlar.</li>
                            <li>Hafta içi rastgele giriş/çıkış saatleri üretir.</li>
                            <li>Arada rastgele izin ve devamsızlık ekler.</li>
                            <li>Tüm çalışanlar için uygulanır.</li>
                        </ul>
                    </div>

                    <div className="flex items-center gap-2 mb-6 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                        <input
                            type="checkbox"
                            id="wipe"
                            checked={wipeExisting}
                            onChange={e => setWipeExisting(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded"
                        />
                        <label htmlFor="wipe" className="font-bold select-none cursor-pointer">
                            ÖNCE MEVCUT VERİLERİ SİL (Tavsiye)
                        </label>
                    </div>

                    <button
                        onClick={runGenerator}
                        disabled={isRunning}
                        className={`w-full py-3 px-4 rounded-lg font-bold shadow-sm transition-all flex justify-center items-center gap-2
                            ${isRunning
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'}
                        `}
                    >
                        {isRunning ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                        {isRunning ? 'ÜRETİLİYOR...' : 'VERİ ÜRETİMİ BAŞLAT'}
                    </button>
                </div>
            </div>

            {/* Console Output */}
            <div className="col-span-2">
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col h-[250px] sm:h-[350px] md:h-[600px]">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">root@mega-engine:~# ./generate_synthetic_data.py</span>
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm text-purple-300 space-y-1">
                        {logs.length === 0 && (
                            <div className="text-gray-600 select-none">
                                // Bekleniyor...
                            </div>
                        )}
                        {logs.map((log, i) => {
                            let content = log;
                            if (typeof log === 'object' && log !== null) {
                                content = JSON.stringify(log);
                            }
                            return <div key={i} className="whitespace-pre-wrap break-words">{content}</div>;
                        })}
                        <div ref={consoleEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}


