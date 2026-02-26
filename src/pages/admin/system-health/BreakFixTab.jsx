import React, { useState } from 'react';
import {
    PlayCircleIcon,
    ArrowPathIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

export default function BreakFixTab() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [logs, setLogs] = useState([]);

    const handleRunFix = async () => {
        if (!confirm("Bu işlem tüm personelin puantaj verilerini YENİ MOLA MANTIĞINA göre tekrar hesaplayacaktır.\n\nİşlem uzun sürebilir ve canlı log akışı başlayacaktır. Devam etmek istiyor musunuz?")) return;

        setLoading(true);
        setLogs([]);
        setResult(null);

        try {
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/system/health-check/fix_retroactive_breaks/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({})
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace('data: ', ''));
                            if (data.message) {
                                setLogs(prev => [...prev, {
                                    time: new Date().toLocaleTimeString(),
                                    message: data.message,
                                    success: data.success !== false
                                }]);
                            }
                            if (data.done) {
                                setLoading(false);
                            }
                        } catch (e) {
                            console.error("Parse Error", e);
                        }
                    }
                }
            }
        } catch (e) {
            alert("Hata: " + e.message);
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-6 text-teal-700 bg-teal-50 p-4 rounded-xl border border-teal-200">
                <ClockIcon className="w-10 h-10" />
                <div>
                    <h3 className="text-xl font-bold">Mola Düzeltme</h3>
                    <p className="text-sm opacity-80">Geçmişe yönelik mola & eksik çalışma hesaplamalarını yeniden oluşturur.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="border border-teal-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-gray-800 text-lg mb-2 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-teal-600" />
                        Geçmişe Yönelik Mola & Eksik Çalışma Düzeltmesi
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Bu araç, sistemdeki <strong>"Kullanılan Mola Kadar Kredi"</strong> mantığını tüm geçmiş kayıtlara uygular.
                    </p>
                    <ul className="text-sm text-gray-500 mb-6 space-y-1 list-disc list-inside">
                        <li>Boşluk süresi mola hakkını aşıyorsa, aşan kısım <strong>Eksik Mesai</strong>'ye yansıtılır</li>
                        <li><strong>Mola</strong> sütunu sadece kullanılan yasal hakkı gösterir</li>
                        <li>Öğle arası (dead zone) mola hesabına dahil edilmez</li>
                        <li>Tüm süreler çalışanın bağlı olduğu takvimden alınır</li>
                    </ul>

                    <button
                        onClick={handleRunFix}
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-wait' : 'bg-teal-600 hover:bg-teal-700 active:scale-95'}`}
                    >
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayCircleIcon className="w-5 h-5" />}
                        {loading ? 'Düzeltme Uygulanıyor...' : 'Düzeltme İşlemini Başlat'}
                    </button>

                    {/* LOGS */}
                    {(logs.length > 0 || result) && (
                        <div className="mt-6 bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 max-h-[400px] overflow-y-auto">
                            <div className="text-white font-bold border-b border-gray-700 pb-2 mb-2 sticky top-0 bg-gray-900">
                                İşlem Logları:
                            </div>
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                                    <span className="text-gray-500 mr-2">[{log.time}]</span>
                                    <span className={log.success === false ? 'text-red-400' : 'text-green-400'}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            {result && (
                                <div className="mt-4 pt-4 border-t border-gray-700 text-yellow-400 font-bold">
                                    SONUÇ: {result.message}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
