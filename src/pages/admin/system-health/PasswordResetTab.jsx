import React, { useState } from 'react';
import api from '../../../services/api';
import {
    ExclamationTriangleIcon,
    ArrowDownTrayIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';

export default function PasswordResetTab() {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    const handleReset = async () => {
        // First confirmation dialog
        const confirmed = window.confirm(
            'DİKKAT! Tüm kullanıcıların şifreleri sıfırlanacak ve yeni şifreler XLSX olarak indirilecektir.\n\nDevam etmek istiyor musunuz?'
        );
        if (!confirmed) return;

        // Typed confirmation
        const typed = window.prompt("Onaylamak için 'SIFIRLA' yazınız:");
        if (typed !== 'SIFIRLA') return;

        setLoading(true);
        setError(null);
        setDone(false);

        try {
            const response = await api.post('/system/health-check/reset-passwords/', {}, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sifre_sifirla_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setDone(true);
        } catch (e) {
            if (e.response?.data instanceof Blob) {
                try {
                    const text = await e.response.data.text();
                    const json = JSON.parse(text);
                    setError(json.error || json.detail || 'Bilinmeyen hata');
                } catch {
                    setError('Sunucu hatasi olustu.');
                }
            } else {
                setError(e.response?.data?.error || e.response?.data?.detail || e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 flex items-start gap-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-amber-800 font-bold text-lg mb-1">
                        Toplu Şifre Sıfırlama
                    </h3>
                    <p className="text-amber-700 text-sm leading-relaxed">
                        Bu işlem <strong>TÜM kullanıcıların şifrelerini sıfırlar</strong> ve yeni şifreleri
                        bir XLSX dosyası olarak indirir. Bu işlem geri alınamaz.
                        Sadece gerekli durumlarda kullanınız.
                    </p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {/* Password Pattern Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <KeyIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-blue-800 font-semibold text-sm mb-1">
                            Yeni şifre formatı
                        </p>
                        <p className="text-blue-700 text-sm">
                            kullanıcı_adı_ilk_kısım + 123
                        </p>
                        <p className="text-blue-600 text-xs mt-1">
                            Örnek: mehmet.yildirim → <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">mehmet123</code>
                        </p>
                    </div>
                </div>

                {/* Reset Button */}
                <button
                    onClick={handleReset}
                    disabled={loading}
                    className={`
                        flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white
                        transition-all duration-200
                        ${loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow'
                        }
                    `}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Şifreler sıfırlanıyor...
                        </>
                    ) : (
                        <>
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Şifreleri Sıfırla & XLSX İndir
                        </>
                    )}
                </button>

                {/* Success Message */}
                {done && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-in fade-in duration-200">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-800 text-sm font-medium">
                            Şifreler başarıyla sıfırlandı. XLSX dosyası indirildi.
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 animate-in fade-in duration-200">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-800 text-sm font-medium">
                            Hata: {error}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
