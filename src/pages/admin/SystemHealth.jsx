
import React, { useState } from 'react';
import {
    Activity, Database, Users, Calendar, AlertTriangle,
    CheckCircle, XCircle, Play, Shield, Terminal
} from 'lucide-react';
import api from '../../services/api';

const SystemHealth = () => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const runDiagnostics = async () => {
        setLoading(true);
        setLogs([]);
        setResults(null);
        setError(null);

        try {
            const response = await api.post('/system/health-check/run_diagnostics/');
            setResults(response.data.results);
            setLogs(response.data.logs);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.details || "Diagnosis Failed");
            if (err.response?.data?.logs) {
                setLogs(err.response.data.logs);
            }
        } finally {
            setLoading(false);
        }
    };

    const StatusItem = ({ label, passed, icon: Icon }) => {
        let colorClass = "text-gray-400";
        let statusText = "Waiting...";
        let StatusIcon = Icon;

        if (results) {
            if (passed) {
                colorClass = "text-green-500";
                statusText = "Passed";
                StatusIcon = CheckCircle;
            } else {
                colorClass = "text-red-500";
                statusText = "Failed";
                StatusIcon = XCircle;
            }
        } else if (loading) {
            statusText = "Checking...";
        }

        return (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h4 className="font-medium text-white">{label}</h4>
                        <span className={`text-xs ${colorClass}`}>{statusText}</span>
                    </div>
                </div>
                {results && (
                    <StatusIcon className={colorClass} size={24} />
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white">Sistem Sağlık Merkezi</h1>
                <p className="text-gray-400">
                    Sistem bütünlüğünü doğrulamak için uçtan uca teşhis testleri çalıştırın.
                </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <h3 className="text-amber-500 font-medium">Dikkat: Test Modu</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Bu işlem veritabanında geçici test verileri oluşturur ve ardından siler.
                        İşlem sırasında canlı veri etkilenmez ancak yoğunluk durumuna göre test süresi değişebilir.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Shield size={20} className="text-brand-primary" />
                            Kontrol Paneli
                        </h3>

                        <div className="space-y-4">
                            <StatusItem
                                label="Veritabanı Bağlantısı"
                                icon={Database}
                                passed={results?.database}
                            />
                            <StatusItem
                                label="Personel İşlemleri (CRUD)"
                                icon={Users}
                                passed={results?.employee}
                            />
                            <StatusItem
                                label="Mesai Döngüsü & Hesaplama"
                                icon={Calendar}
                                passed={results?.attendance}
                            />
                            <StatusItem
                                label="Temizlik & Güvenlik"
                                icon={CheckCircle}
                                passed={results?.cleanup}
                            />
                        </div>

                        <button
                            onClick={runDiagnostics}
                            disabled={loading}
                            className={`w-full mt-6 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
                                ${loading
                                    ? 'bg-white/5 text-gray-400 cursor-not-allowed'
                                    : 'bg-brand-primary text-white hover:bg-brand-primary/90 hover:scale-[1.02]'
                                }
                            `}
                        >
                            {loading ? (
                                <>
                                    <Activity className="animate-spin" size={20} />
                                    Test Çalışıyor...
                                </>
                            ) : (
                                <>
                                    <Play size={20} />
                                    Sistem Testini Başlat
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Console Log */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0f1115] border border-white/10 rounded-xl p-6 h-full min-h-[500px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Terminal size={20} className="text-gray-400" />
                                İşlem Kayıtları (Logs)
                            </h3>
                            {error && (
                                <span className="text-red-500 text-sm font-medium">Test Hatası Tespit Edildi</span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2 p-4 bg-black/20 rounded-lg border border-white/5">
                            {logs.length === 0 && !loading && (
                                <div className="text-gray-500 h-full flex items-center justify-center text-center">
                                    <p>Test başlatmak için butona tıklayın.<br />Sonuçlar burada görüntülenecektir.</p>
                                </div>
                            )}

                            {logs.map((log, idx) => (
                                <div key={idx} className={`flex gap-3 ${log.success ? 'text-green-400' : 'text-red-400'}`}>
                                    <span className="text-gray-600 shrink-0">[{log.time}]</span>
                                    <div>
                                        <span>{log.success ? '✓' : '✗'} {log.message}</span>
                                        {log.details && (
                                            <div className="text-gray-500 text-xs mt-1 ml-4 pl-2 border-l border-gray-700">
                                                {log.details}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="text-blue-400 animate-pulse flex gap-3">
                                    <span className="text-gray-600">...</span>
                                    <span>İşlem yürütülüyor...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemHealth;
