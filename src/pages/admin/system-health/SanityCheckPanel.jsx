import React, { useState } from 'react';
import {
    BeakerIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const STATUS_STYLES = {
    pass: { icon: CheckCircleIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'GEÇTİ' },
    fail: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'KALDI' },
    error: { icon: ExclamationTriangleIcon, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'HATA' },
};

export default function SanityCheckPanel() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showLog, setShowLog] = useState(false);

    const runCheck = async () => {
        if (!window.confirm(
            'Hesaplama Sanity Check çalıştırılacak.\n\n' +
            '~16 sentetik senaryo izole transaction içinde test edilecek.\n' +
            'DB değiştirilmez (her test rollback). ~30-60 sn sürer.\n\n' +
            'Devam edilsin mi?'
        )) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.post('/system/health-check/recalc-sanity-check/', {}, {
                timeout: 600000,
            });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Sanity check başarısız');
        } finally {
            setLoading(false);
        }
    };

    const downloadTxt = () => {
        if (!result?.txt_log) return;
        const blob = new Blob([result.txt_log], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recalc_sanity_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="border-t-2 border-indigo-200 pt-6 mt-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                    <BeakerIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-800">Hesaplama Sanity Check</h3>
                    <p className="text-xs text-gray-500">
                        Recalc engine'ini sentetik senaryolarla test eder (normal/late/OT/tolerans/lunch/DUTY/LEAVE/cross-midnight/MANUAL_OT/CARD-DUTY bisect). Her senaryo izole rollback — DB değişmez.
                    </p>
                </div>
                <button
                    onClick={runCheck}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading
                        ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        : <BeakerIcon className="w-4 h-4" />}
                    {loading ? 'Çalışıyor...' : 'Sanity Check Çalıştır'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-3">
                    {/* Özet barı */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
                        <div className="flex-1">
                            <div className="text-xs text-gray-600 font-semibold">Sonuç</div>
                            <div className="text-lg font-bold text-gray-800">
                                {result.passed}/{result.total} geçti
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5 text-emerald-700">
                                <CheckCircleIcon className="w-4 h-4" />
                                <span className="text-sm font-bold">{result.passed}</span>
                            </div>
                            {result.failed > 0 && (
                                <div className="flex items-center gap-1.5 text-red-700">
                                    <XCircleIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold">{result.failed}</span>
                                </div>
                            )}
                            {result.errors > 0 && (
                                <div className="flex items-center gap-1.5 text-amber-700">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    <span className="text-sm font-bold">{result.errors}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowLog(s => !s)}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-50"
                            >
                                {showLog ? 'TXT Log Gizle' : 'TXT Log Göster'}
                            </button>
                            <button
                                onClick={downloadTxt}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700"
                            >
                                <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                                İndir
                            </button>
                        </div>
                    </div>

                    {/* Senaryo listesi */}
                    <div className="space-y-1.5">
                        {(result.scenarios || []).map((s) => {
                            const style = STATUS_STYLES[s.status] || STATUS_STYLES.error;
                            const Icon = style.icon;
                            return (
                                <div
                                    key={s.key}
                                    className={`flex items-start gap-3 px-3 py-2 ${style.bg} border ${style.border} rounded`}
                                >
                                    <Icon className={`w-4 h-4 ${style.color} shrink-0 mt-0.5`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-800">
                                                {s.label}
                                            </span>
                                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${style.color} bg-white`}>
                                                {style.label}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {s.duration_ms}ms
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5 italic">
                                            {s.desc}
                                        </p>
                                        <p className="text-xs text-gray-700 mt-1">
                                            {s.message}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* TXT log */}
                    {showLog && result.txt_log && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Detayli TXT Log</h4>
                            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-[11px] leading-relaxed overflow-auto max-h-[500px] font-mono whitespace-pre-wrap">
                                {result.txt_log}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
