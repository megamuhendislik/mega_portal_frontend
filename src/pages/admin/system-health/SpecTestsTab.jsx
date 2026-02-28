import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import {
    PlayCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    CalendarDaysIcon,
    CalendarIcon,
    DocumentChartBarIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    WrenchScrewdriverIcon,
    PauseCircleIcon,
    CloudArrowDownIcon,
    ExclamationCircleIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';

const STAGES = [
    { id: 1, name: 'RBAC & Yetkiler', icon: ShieldCheckIcon, color: 'indigo', description: '72 test — Yetki kalıtımı, yönetici hiyerarşisi, IsSystemAdmin, ViewSet koruması, audit fix doğrulamaları' },
    { id: 2, name: 'Talepler Sistemi', icon: ClipboardDocumentCheckIcon, color: 'emerald', description: '68 test — İzin/mesai/kartsız/yemek talepleri, DOCX export, AUTO_APPROVE, mali kilit, MealRequest statüleri' },
    { id: 3, name: 'Mesai Sistemi', icon: ClockIcon, color: 'amber', description: '95 test — Hesaplama motoru, öğle/mola, tolerans, takvim, Celery görevleri, race condition, dead zone' },
    { id: 4, name: 'Ek Mesai Atama', icon: CalendarDaysIcon, color: 'rose', description: '79 test — OvertimeAssignment CRUD, bulk_create, cancel, claim (auto-fill), claimable API, claim-potential, manual_entry, source_type, calendar, team_analytics, expire task (2 mali ay), geriye dönük onay & kümülatif bakiye cascade, 2 mali ay pencere doğrulaması (OT/kartsız giriş), yetki kontrolü' },
    { id: 5, name: 'İzin Sistemi', icon: CalendarIcon, color: 'violet', description: '37 test — FIFO sıralı düşüm, avans izin takibi, hak koruma, iade mantığı, legacy bakiye senkronizasyonu' },
    { id: 6, name: 'Rapor Bug Fix', icon: DocumentChartBarIcon, color: 'cyan', description: '29 test — rules_cache date key, çoklu attendance aggregation, takvim tatil filtresi, Celery mutabakat, izin duty get_day_rules, tüm izin türleri sayımı' },
    { id: 7, name: 'Sistem & Kritik Fix', icon: WrenchScrewdriverIcon, color: 'slate', description: '15 test — Şifre sıfırlama endpoint (XLSX, yetki), dept/pozisyon otomatik türetme, avans izin kısıtlama kaldırma, advance tracking' },
    { id: 8, name: 'Potansiyel Mola', icon: PauseCircleIcon, color: 'teal', description: '16 test — potential_break_seconds model alanı, tek/çoklu mola hesaplama, hak aşımı, break vs potential farkı, live-status endpoint mola bilgileri' },
    { id: 9, name: 'Yedekleme & Geri Yükleme', icon: CloudArrowDownIcon, color: 'sky', description: '32 test — JSON/CSV export, import yetki kontrolleri, dry-run simülasyon, UPSERT davranışı, round-trip veri bütünlüğü, validasyon kuralları' },
    { id: 10, name: 'Tolerans & Normal Mesai', icon: ClockIcon, color: 'orange', description: '33 test — Geç kalma toleransı (uzatma bölgesi), servis toleransı (snap), mola entegrasyonu (break credit, potential_break), normal mesai hesaplama (bucket dağılımı, öğle kesintisi, OT ayrışımı)' },
    { id: 11, name: 'Mazeret İzni', icon: ExclamationCircleIcon, color: 'amber', description: '42 test — ExcuseLeaveEntitlement model (lazy init, unique, defaults), EXCUSE_LEAVE validasyon (4.5sa/gün, 18sa/yıl kota, aynı gün engeli), onay/red/iptal bakiye akışı, excuse-balance API, Dashboard stats, Celery yıllık reset, saat hesaplama edge case\'leri' },
    { id: 12, name: 'Kart Okuyucu & Gate Service', icon: ShieldCheckIcon, color: 'blue', description: '65 test — Temel giriş/çıkış, duplicate detection, GateEventLog, fallback mekanizması (race condition), refresh_from_db, shift split entegrasyonu, midnight split, E2E senaryolar' },
    { id: 13, name: 'İzin Formu Validasyon & Preview', icon: ClipboardDocumentCheckIcon, color: 'violet', description: '37 test — İzin türü filtreleme (ANNUAL_LEAVE + EXCUSE_LEAVE), mazeret izni tarih validasyonu (yıl içi + 2 mali dönem geriye), mali dönem sınır testleri (26/25 geçişi), excuse-balance API (recent_requests, bakiye preview, sıralama), oluşturma validasyonları, yıllık izin bakiye kontrolleri' },
    { id: 14, name: 'Mola Off-Day & Parçalı Mesai', icon: PauseCircleIcon, color: 'rose', description: '63 test — Off-day/tatil mola kuralları (break=0, potential=0), live-status is_off_day doğruluğu (hafta sonu/tatil/normal gün), parçalı OT segment gruplama (≤30dk merge, >30dk ayrı), POTENTIAL net süre, claim-potential V3 (overtime_request_id, overlap kontrolü), claimable endpoint V3 (bireysel POTENTIAL, segments), today_summary endpoint off-day break_allowance=0 & is_off_day flag' },
    { id: 15, name: 'Şirket Dışı Görev v2', icon: MapPinIcon, color: 'purple', description: '45 test — Model yeni alanlar (lokasyon, ulaşım, konaklama), onay sonrası mesai (vardiya içi=DUTY, dışı=OT PENDING), off-day görev→OT, çok günlü görev, OT ilişkilendirme, serializer/API, tarih validasyonları' },
];

export default function SpecTestsTab() {
    const [loading, setLoading] = useState(false);
    const [runningStage, setRunningStage] = useState(null);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [currentStageInfo, setCurrentStageInfo] = useState(null);
    const timerRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        if (loading) {
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [loading]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}dk ${sec}sn` : `${sec}sn`;
    };

    const [scanResult, setScanResult] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [purging, setPurging] = useState(false);
    const [purgeResult, setPurgeResult] = useState(null);

    const scanTestData = async () => {
        setScanning(true);
        setPurgeResult(null);
        setError(null);
        try {
            const res = await api.get('/system/health-check/scan-test-data/');
            setScanResult(res.data);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setScanning(false);
        }
    };

    const purgeTestData = async () => {
        if (!confirm('TÜM test verilerini (SEC_, PRT_, STR_, TST_, TRBAC_ prefix\'li) silmek istediğinize emin misiniz?')) return;
        setPurging(true);
        setPurgeResult(null);
        setError(null);
        try {
            const res = await api.post('/system/health-check/purge-all-test-data/');
            setPurgeResult(res.data);
            setScanResult(null);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setPurging(false);
        }
    };

    const pollTaskStatus = (taskId) => {
        if (pollRef.current) clearInterval(pollRef.current);

        pollRef.current = setInterval(async () => {
            try {
                const res = await api.get(`/system/health-check/get-test-status/?task_id=${taskId}`);
                const data = res.data;

                if (data.state === 'PROGRESS') {
                    setCurrentStageInfo({
                        current: data.current_stage,
                        name: data.current_stage_name,
                        completed: data.completed_stages || [],
                        total: data.total_stages,
                    });
                    // Show intermediate results as they complete
                    if (data.completed_stages?.length > 0) {
                        setResults(prev => {
                            const totalRan = data.completed_stages.reduce((s, r) => s + (r.tests_ran || 0), 0);
                            const totalPassed = data.completed_stages.reduce((s, r) => s + (r.passed || 0), 0);
                            const totalFailed = data.completed_stages.reduce((s, r) => s + (r.failures || 0) + (r.errors || 0), 0);
                            return {
                                success: data.completed_stages.every(r => r.success),
                                total_tests: totalRan,
                                total_passed: totalPassed,
                                total_failed: totalFailed,
                                stages: data.completed_stages,
                                _partial: true,
                            };
                        });
                    }
                } else if (data.state === 'SUCCESS') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    setResults(data.result);
                    setCurrentStageInfo(null);
                    setLoading(false);
                    setRunningStage(null);
                } else if (data.state === 'FAILURE') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    setError(data.error || 'Task failed');
                    setCurrentStageInfo(null);
                    setLoading(false);
                    setRunningStage(null);
                }
                // PENDING state = task not started yet, keep polling
            } catch (e) {
                // Don't stop polling on transient network errors, but show a warning
                console.warn('Polling error:', e.message);
            }
        }, 3000);
    };

    const runTests = async (stage = 'all') => {
        setLoading(true);
        setRunningStage(stage);
        setError(null);
        setResults(null);
        setCurrentStageInfo(null);
        try {
            const res = await api.post('/system/health-check/run-stage-tests/', { stage });
            const taskId = res.data.task_id;
            if (taskId) {
                pollTaskStatus(taskId);
            } else {
                // Fallback: if response has direct results (shouldn't happen with new API)
                setResults(res.data);
                setLoading(false);
                setRunningStage(null);
            }
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Test başlatılamadı');
            setLoading(false);
            setRunningStage(null);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Target Spec Uyumluluk Testleri</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        12 aşamalı otomatik test — target_spec.md gereksinimlerini doğrular
                    </p>
                </div>
                <button
                    onClick={() => runTests('all')}
                    disabled={loading}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white shadow-sm transition-all ${
                        loading ? 'bg-gray-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                    }`}
                >
                    {loading && runningStage === 'all' ? (
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    ) : (
                        <PlayCircleIcon className="w-5 h-5" />
                    )}
                    {loading && runningStage === 'all' ? `Çalışıyor... (${formatTime(elapsed)})` : 'Tümünü Çalıştır'}
                </button>
            </div>

            {/* Test Data Cleanup Section */}
            <div className="mb-6 p-4 border border-orange-200 bg-orange-50/50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <TrashIcon className="w-5 h-5 text-orange-600" />
                            Test Verisi Temizleme
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Testlerin oluşturduğu artık kayıtları (SEC_, PRT_, STR_, TST_ prefix'li) tarar ve siler
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={scanTestData}
                            disabled={scanning || purging}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                scanning ? 'bg-gray-200 text-gray-400' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {scanning ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                            {scanning ? 'Taranıyor...' : 'Tara'}
                        </button>
                        <button
                            onClick={purgeTestData}
                            disabled={scanning || purging}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all ${
                                purging ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700 active:scale-95'
                            }`}
                        >
                            {purging ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                            {purging ? 'Siliniyor...' : 'Tümünü Sil'}
                        </button>
                    </div>
                </div>

                {/* Scan Results */}
                {scanResult && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                            {scanResult.total > 0 ? (
                                <span className="text-sm font-bold text-orange-700">
                                    {scanResult.total} artık test kaydı bulundu
                                </span>
                            ) : (
                                <span className="text-sm font-bold text-green-700">
                                    Artık test verisi bulunamadı
                                </span>
                            )}
                        </div>
                        {scanResult.total > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                {Object.entries(scanResult.counts).filter(([, v]) => v > 0).map(([key, count]) => (
                                    <div key={key} className="bg-white px-2 py-1 rounded border border-orange-200 flex justify-between">
                                        <span className="text-gray-600">{key.replace(/_/g, ' ')}</span>
                                        <span className="font-bold text-orange-700">{count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Purge Results */}
                {purgeResult && (
                    <div className={`mt-3 pt-3 border-t border-orange-200`}>
                        <div className={`p-3 rounded-lg text-sm ${
                            purgeResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                            <strong>{purgeResult.success ? 'Temizlik tamamlandı' : 'Hata'}:</strong> {purgeResult.message || purgeResult.error}
                            {purgeResult.details && Object.keys(purgeResult.details).length > 0 && (
                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
                                    {Object.entries(purgeResult.details).map(([key, count]) => (
                                        <span key={key} className="opacity-80">{key}: {count}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Loading indicator with progress */}
            {loading && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    <div className="flex items-center gap-3">
                        <ArrowPathIcon className="w-5 h-5 animate-spin flex-shrink-0" />
                        <div className="flex-1">
                            <strong>Testler çalışıyor...</strong> ({formatTime(elapsed)})
                            <p className="text-xs opacity-75 mt-0.5">
                                {currentStageInfo ? (
                                    <>Aşama {currentStageInfo.current}: {currentStageInfo.name} çalışıyor ({currentStageInfo.completed?.length || 0}/{currentStageInfo.total} tamamlandı)</>
                                ) : runningStage === 'all' ? (
                                    'Celery task başlatılıyor...'
                                ) : (
                                    `Aşama ${runningStage} başlatılıyor...`
                                )}
                            </p>
                        </div>
                    </div>
                    {/* Progress bar */}
                    {currentStageInfo && currentStageInfo.total > 1 && (
                        <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${((currentStageInfo.completed?.length || 0) / currentStageInfo.total) * 100}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <strong>Hata:</strong> {error}
                </div>
            )}

            {/* Overall Result */}
            {results && !results._partial && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    results.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                }`}>
                    <div className="flex items-center gap-3">
                        {results.success ? (
                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        ) : (
                            <XCircleIcon className="w-8 h-8 text-red-600" />
                        )}
                        <div>
                            <h3 className={`text-lg font-bold ${results.success ? 'text-green-700' : 'text-red-700'}`}>
                                {results.success ? 'TÜM TESTLER BAŞARILI' : 'BAŞARISIZ TESTLER VAR'}
                            </h3>
                            <p className="text-sm opacity-80">
                                {results.total_passed}/{results.total_tests} test başarılı
                                {results.total_failed > 0 && ` — ${results.total_failed} başarısız`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stage Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {STAGES.map((stage) => {
                    const stageResult = results?.stages?.find(s => s.stage === stage.id);
                    const hasResult = !!stageResult;
                    const isRunning = loading && (runningStage === stage.id || (runningStage === 'all' && currentStageInfo?.current === stage.id));

                    return (
                        <div
                            key={stage.id}
                            className={`border rounded-xl p-5 transition-all ${
                                isRunning
                                    ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-200'
                                    : hasResult
                                        ? stageResult.success
                                            ? 'border-green-200 bg-green-50/50'
                                            : 'border-red-200 bg-red-50/50'
                                        : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <stage.icon className={`w-5 h-5 text-${stage.color}-600`} />
                                    <h3 className="font-bold text-gray-800">Aşama {stage.id}</h3>
                                </div>
                                <button
                                    onClick={() => runTests(stage.id)}
                                    disabled={loading}
                                    className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
                                        loading
                                            ? 'bg-gray-100 text-gray-400'
                                            : `bg-${stage.color}-100 text-${stage.color}-700 hover:bg-${stage.color}-200`
                                    }`}
                                >
                                    {isRunning ? (
                                        <ArrowPathIcon className="w-4 h-4 animate-spin inline" />
                                    ) : 'Çalıştır'}
                                </button>
                            </div>
                            <h4 className="font-semibold text-gray-700 text-sm mb-1">{stage.name}</h4>
                            <p className="text-xs text-gray-500 mb-3">{stage.description}</p>

                            {hasResult && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        {stageResult.success ? (
                                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 text-red-600" />
                                        )}
                                        <span className={`text-sm font-bold ${
                                            stageResult.success ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            {stageResult.passed}/{stageResult.tests_ran} BAŞARILI
                                        </span>
                                    </div>
                                    {stageResult.failures + stageResult.errors > 0 && (
                                        <p className="text-xs text-red-600">
                                            {stageResult.failures} başarısız, {stageResult.errors} hata
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Detailed Test Results */}
            {results?.stages?.map((stageResult) => {
                const stage = STAGES.find(s => s.id === stageResult.stage);
                if (!stageResult.tests?.length && !stageResult.log) return null;

                return (
                    <div key={stageResult.stage} className="mb-6">
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                            {stage && <stage.icon className="w-5 h-5" />}
                            Aşama {stageResult.stage}: {stageResult.stage_name}
                        </h3>
                        {stageResult.tests?.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-gray-600 font-medium">Test</th>
                                            <th className="text-center px-4 py-2 text-gray-600 font-medium w-24">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stageResult.tests.map((test, idx) => (
                                            <tr key={idx} className={test.status === 'FAIL' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                                                <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                                                    {test.name}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {test.status === 'PASS' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                                            PASS
                                                        </span>
                                                    ) : test.status === 'FAIL' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                                            <XCircleIcon className="w-3.5 h-3.5" />
                                                            FAIL
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                                            {test.status}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Log output — auto-open if stage failed */}
                        {stageResult.log && (
                            <details className="mt-2" open={!stageResult.success}>
                                <summary className={`text-xs cursor-pointer hover:text-gray-700 font-medium ${
                                    stageResult.success ? 'text-gray-500' : 'text-red-600'
                                }`}>
                                    {stageResult.success ? 'Konsol çıktısını göster' : `Konsol çıktısı (${stageResult.failures} başarısız, ${stageResult.errors} hata)`}
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap break-words">
{stageResult.log}
                                </pre>
                            </details>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
