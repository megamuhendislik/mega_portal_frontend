import React, { useState } from 'react';
import {
    BeakerIcon,
    PlayCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const STATUS_STYLE = {
    pass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    fail: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    pending: 'bg-slate-50 border-slate-200 text-slate-500',
};

const STATUS_LABEL = {
    pass: 'BAŞARILI',
    fail: 'HATALI',
    error: 'EXCEPTION',
    pending: 'Bekliyor',
};

const StatusIcon = ({ status }) => {
    if (status === 'pass') return <CheckCircleIcon className="w-5 h-5 text-emerald-600" />;
    if (status === 'fail') return <XCircleIcon className="w-5 h-5 text-amber-600" />;
    if (status === 'error') return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
    return <ClockIcon className="w-5 h-5 text-slate-400" />;
};

export default function FixSimulationTab() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const runSimulation = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post(
                '/system/health-check/fix-simulation/',
                {},
                { timeout: 600000 } // 10 dakika — backend simulation ~1-2dk
            );
            setResults(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Simülasyon başlatılamadı');
        } finally {
            setLoading(false);
        }
    };

    const totalDuration = results?.simulations?.reduce((s, r) => s + (r.duration_ms || 0), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <BeakerIcon className="w-5 h-5 text-purple-600" />
                            Fix Simülasyonu
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Bu oturumda yapılan tüm bug fix&apos;leri canlı veritabanında izole transaction içinde test edilir
                            (her test sonunda rollback — DB değişmez). Sonuçlar her fix&apos;in canlıda doğru çalıştığını kanıtlar.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={runSimulation}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            <PlayCircleIcon className="w-4 h-4" />
                        )}
                        {loading ? 'Çalışıyor...' : (results ? 'Yeniden Çalıştır' : 'Simülasyonu Başlat')}
                    </button>
                </div>

                {/* Summary */}
                {results && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="text-2xl font-bold text-slate-800">{results.total}</div>
                            <div className="text-xs text-slate-500 mt-0.5">Toplam Senaryo</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <div className="text-2xl font-bold text-emerald-700">{results.passed}</div>
                            <div className="text-xs text-emerald-600 mt-0.5">Başarılı</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="text-2xl font-bold text-amber-700">{results.failed}</div>
                            <div className="text-xs text-amber-600 mt-0.5">Hatalı</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="text-2xl font-bold text-red-700">{results.errors}</div>
                            <div className="text-xs text-red-600 mt-0.5">Exception</div>
                        </div>
                    </div>
                )}

                {results && (
                    <div className="mt-3 text-xs text-slate-500">
                        Toplam süre: {(totalDuration / 1000).toFixed(2)}sn |
                        Mod: izole transaction (DB değişmedi)
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Initial state */}
            {!loading && !results && !error && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <BeakerIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Simülasyon henüz çalıştırılmadı</p>
                    <p className="text-slate-400 text-sm mt-1">
                        Yukarıdaki &ldquo;Simülasyonu Başlat&rdquo; butonuna tıklayın. ~1-2 dakika sürer.
                    </p>
                </div>
            )}

            {/* Results */}
            {results?.simulations?.length > 0 && (
                <div className="space-y-2">
                    {results.simulations.map((sim) => (
                        <div
                            key={sim.key}
                            className={`border rounded-xl p-4 ${STATUS_STYLE[sim.status] || STATUS_STYLE.pending}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <StatusIcon status={sim.status} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold">{sim.label}</span>
                                            <span className="text-[10px] font-mono opacity-60">
                                                {sim.key}
                                            </span>
                                        </div>
                                        <p className="text-xs mt-1 opacity-90 leading-relaxed">
                                            {sim.message}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                                        {STATUS_LABEL[sim.status]}
                                    </div>
                                    <div className="text-[10px] opacity-60 mt-0.5">
                                        {sim.duration_ms}ms
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
