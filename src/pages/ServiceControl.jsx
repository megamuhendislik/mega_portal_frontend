import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle, Monitor, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import api from '../services/api';

const ServiceControl = () => {
    const [selectedDate, setSelectedDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await api.get('/service-logs/');
                setLogs(response.data?.results || response.data || []);
            } catch (error) {
                console.error("Log fetch error:", error);
            }
        };

        const interval = setInterval(fetchLogs, 3000);
        fetchLogs();
        return () => clearInterval(interval);
    }, []);

    const handleRecalculate = async () => {
        setLoading(true);
        setStatus(null);
        setMessage('');

        try {
            const response = await api.post('/attendance/recalculate-all/', { date: selectedDate });
            setStatus('success');
            setMessage(response.data.message || `${format(new Date(selectedDate), 'd MMMM yyyy', { locale: tr })} icin hesaplama tamamlandi.`);
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage(error.response?.data?.error || 'Islem baslatilamadi veya sunucu hatasi olustu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                    <Monitor className="text-white w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Servis Yonetimi</h1>
                    <p className="text-slate-500 font-medium">Toplu puantaj ve servis hesaplama islemleri</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Daily Calculation Trigger */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Play size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Gunluk Hesaplama Tetikle</h2>
                    </div>

                    <p className="text-sm text-slate-500 mb-6">
                        Secilen gun icin <b>tum calisanlarin</b> giris-cikis, mola ve fazla mesai hesaplarini yeniden calistirir.
                        Manuel duzeltmeler yapildiktan sonra senkronizasyon icin kullanin.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Hedef Tarih</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Bu islem calisan sayisina bagli olarak birkac saniye surebilir.
                                Islem sirasinda sistem yavasliayabilir.
                            </p>
                        </div>

                        <button
                            onClick={handleRecalculate}
                            disabled={loading}
                            className={`w-full py-3.5 px-6 rounded-xl font-bold text-white shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2
                        ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-300'}
                    `}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Hesaplaniyor...
                                </>
                            ) : (
                                <>
                                    <Play size={18} fill="currentColor" />
                                    Servisi Calistir
                                </>
                            )}
                        </button>

                        {status === 'success' && (
                            <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-2 text-sm font-medium">
                                <CheckCircle size={18} />
                                {message}
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="mt-4 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg flex items-center gap-2 text-sm font-medium">
                                <XCircle size={18} />
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Card 2: Status */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Monitor size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Sistem Durumu</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-slate-900 font-bold mb-1">Servis Aktif</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            Canli guncelleme her 30 saniyede, gece gorevleri 00:01'de otomatik calisir.
                        </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <h4 className="font-bold text-slate-900 mb-3 text-sm">Hizli Baglantilar</h4>
                        <div className="grid grid-cols-1 gap-2">
                            <Link to="/admin/system-health" className="w-full text-left p-3 hover:bg-slate-50 rounded-lg text-sm text-slate-600 font-medium transition-colors border border-transparent hover:border-slate-100 flex justify-between group">
                                Sistem Kontrol Merkezi
                                <span className="text-slate-300 group-hover:text-indigo-500 transition-colors">&rarr;</span>
                            </Link>
                            <Link to="/admin/live-status" className="w-full text-left p-3 hover:bg-slate-50 rounded-lg text-sm text-slate-600 font-medium transition-colors border border-transparent hover:border-slate-100 flex justify-between group">
                                Canli Durum Paneli
                                <span className="text-slate-300 group-hover:text-indigo-500 transition-colors">&rarr;</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Logs Console */}
            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-slate-100 font-mono text-sm font-semibold flex items-center gap-2">
                        <Activity size={16} className="text-green-400" />
                        CANLI SERVIS LOGLARI (Son 100 Islem)
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">Otomatik Yenileniyor...</span>
                </div>
                <div className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-1 custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="text-slate-500 text-center py-10">
                            Henuz log kaydi yok. Sistem Sagligi &gt; Sistem Ayarlari'ndan Servis Loglarini aktif edin.
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-2 hover:bg-slate-800 p-0.5 rounded">
                                <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className={clsx(
                                    "font-bold shrink-0 w-16",
                                    log.level === 'INFO' && "text-blue-400",
                                    log.level === 'WARN' && "text-yellow-400",
                                    log.level === 'ERROR' && "text-red-500"
                                )}>{log.level}</span>
                                <span className="text-slate-400 shrink-0 w-24">[{log.component}]</span>
                                <span className="text-slate-300 truncate">
                                    {log.details && log.details.original ?
                                        <span>{log.message} <span className="text-slate-600">({JSON.stringify(log.details)})</span></span>
                                        : log.message
                                    }
                                </span>
                                {log.employee_name && log.employee_name !== '-' && (
                                    <span className="text-indigo-400 ml-auto shrink-0 text-[10px] bg-indigo-900/30 px-1 rounded flex items-center">
                                        {log.employee_name}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceControl;
