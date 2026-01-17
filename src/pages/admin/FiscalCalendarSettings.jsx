import React, { useState, useEffect } from 'react';
import { Calendar, Save, RefreshCw, AlertCircle, Check, Lock, Unlock } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const FiscalCalendarSettings = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Edit state
    const [editedPeriods, setEditedPeriods] = useState({});

    useEffect(() => {
        fetchPeriods();
    }, [year]);

    const fetchPeriods = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/attendance/fiscal-periods/?year=${year}`);
            setPeriods(response.data);
            setEditedPeriods({});
        } catch (error) {
            console.error('Error fetching periods:', error);
            toast.error('Mali dönemler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDefaults = async () => {
        if (!window.confirm(`${year} yılı için varsayılan dönemleri oluşturmak istediğinize emin misiniz? Mevcut kayıtlar varsa silinebilir.`)) return;

        setGenerating(true);
        try {
            await api.post('/attendance/fiscal-periods/generate_defaults/', { year });
            toast.success(`${year} yılı için dönemler oluşturuldu.`);
            fetchPeriods();
        } catch (error) {
            console.error('Error generating defaults:', error);
            toast.error('İşlem başarısız oldu.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDateChange = (id, field, value) => {
        setEditedPeriods(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSave = async (period) => {
        const updates = editedPeriods[period.id];
        if (!updates) return;

        try {
            await api.patch(`/attendance/fiscal-periods/${period.id}/`, updates);
            toast.success('Dönem güncellendi.');

            // Clear edits for this item
            setEditedPeriods(prev => {
                const newEdits = { ...prev };
                delete newEdits[period.id];
                return newEdits;
            });

            fetchPeriods(); // Refresh to ensure sync
        } catch (error) {
            console.error('Error updating period:', error);
            toast.error('Güncelleme başarısız: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleToggleLock = async (period) => {
        try {
            await api.patch(`/attendance/fiscal-periods/${period.id}/`, { is_locked: !period.is_locked });
            toast.success(period.is_locked ? 'Dönem kilidi açıldı.' : 'Dönem kilitlendi.');
            fetchPeriods();
        } catch (error) {
            toast.error('İşlem başarısız.');
        }
    };

    const getMonthName = (monthNum) => {
        const date = new Date(2000, monthNum - 1, 1);
        return date.toLocaleString('tr-TR', { month: 'long' });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Calendar className="text-indigo-600" />
                        Mali Takvim Ayarları
                    </h1>
                    <p className="text-slate-500 mt-1">Maaş ve puantaj dönemlerinin tarihlerini yönetin.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2 flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Yıl:</span>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                        >
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerateDefaults}
                        disabled={generating}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        {generating ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                        Otomatik Oluştur
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-2" />
                    <p className="text-slate-500">Yükleniyor...</p>
                </div>
            ) : periods.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-400">
                        <Calendar size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">{year} Yılı İçin Veri Yok</h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        Henüz bu yıl için mali takvim oluşturulmamış. Varsayılan (26-25) kuralına göre oluşturmak için butona tıklayın.
                    </p>
                    <button onClick={handleGenerateDefaults} className="btn btn-primary">
                        Şimdi Oluştur
                    </button>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="p-4">Dönem (Ay)</th>
                                    <th className="p-4">Başlangıç</th>
                                    <th className="p-4">Bitiş</th>
                                    <th className="p-4 w-24 text-center">Durum</th>
                                    <th className="p-4 w-32 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {periods.map((period) => {
                                    const edits = editedPeriods[period.id] || {};
                                    const hasChanges = Object.keys(edits).length > 0;

                                    return (
                                        <tr key={period.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                                        {period.month}
                                                    </div>
                                                    {getMonthName(period.month)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="date"
                                                    disabled={period.is_locked}
                                                    value={edits.start_date !== undefined ? edits.start_date : period.start_date}
                                                    onChange={(e) => handleDateChange(period.id, 'start_date', e.target.value)}
                                                    className="input-field py-1.5 text-sm w-40 disabled:opacity-50"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="date"
                                                    disabled={period.is_locked}
                                                    value={edits.end_date !== undefined ? edits.end_date : period.end_date}
                                                    onChange={(e) => handleDateChange(period.id, 'end_date', e.target.value)}
                                                    className="input-field py-1.5 text-sm w-40 disabled:opacity-50"
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                {period.is_locked ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                                                        <Lock size={12} className="mr-1" /> Kilitli
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                                                        <Unlock size={12} className="mr-1" /> Açık
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasChanges && (
                                                        <button
                                                            onClick={() => handleSave(period)}
                                                            className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm transition-colors"
                                                            title="Kaydet"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleToggleLock(period)}
                                                        className={`p-2 rounded-lg transition-colors ${period.is_locked ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                        title={period.is_locked ? "Kilidi Aç" : "Kilitle"}
                                                    >
                                                        {period.is_locked ? <Unlock size={16} /> : <Lock size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FiscalCalendarSettings;
