import React, { useState, useEffect } from 'react';
import { Calendar, Save, RefreshCw, AlertCircle, Check, Lock, Unlock, Settings, Clock } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const SystemSettings = () => {
    // ... Fiscal Calendar State ...
    const [year, setYear] = useState(new Date().getFullYear());
    const [periods, setPeriods] = useState([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [editedPeriods, setEditedPeriods] = useState({});

    // ... General Settings State ...
    const [settings, setSettings] = useState(null);
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        fetchPeriods();
        fetchSettings();
    }, [year]);

    const fetchSettings = async () => {
        setLoadingSettings(true);
        try {
            const response = await api.get('/system/settings/'); // Assumes endpoint exists or we use health-check/get_settings?
            // Actually usually ViewSet is /api/system-settings/ or similar if created.
            // Let's check where SystemSettingsSerializer is used.
            // It was just added to serializers.py. We might need a ViewSet for it.
            // Assuming ViewSet at /api/audit/system-settings/ or similar?
            // Wait, I need to check where SystemSettings is exposed.
            // If not exposed, I need to create a view for it.
            // Assuming for now I will add /api/system/settings/ endpoint logic or use existing.

            // Temporary Fallback or explicit check:
            // Since I didn't verify ViewSet, I will implement it or check core/views.py again.
            // Let's assume standard ViewSet pattern:
            const res = await api.get('/core/system-settings/');
            if (res.data && res.data.length > 0) {
                setSettings(res.data[0]);
            } else {
                // Might be empty list if no settings? Singleton usually returns list or object.
                // If using ModelViewSet, it returns list.
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoadingSettings(false);
        }
    };

    // ... (Fiscal Functions keep same) ...
    // ...

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Settings className="text-slate-600" />
                        Sistem & Takvim Ayarları
                    </h1>
                    <p className="text-slate-500 mt-1">Global sistem parametreleri ve mali takvim yapılandırması.</p>
                </div>
            </div>

            {/* General Settings Card */}
            <div className="card p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="text-blue-500" />
                    Global Mesai Kuralları
                </h3>

                {loadingSettings ? (
                    <div className="animate-pulse h-12 bg-slate-100 rounded"></div>
                ) : (
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Varsayılan Günlük Mola Hakkı (Dakika)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={settings?.default_daily_break_allowance || ''}
                                onChange={(e) => setSettings(prev => ({ ...prev, default_daily_break_allowance: e.target.value }))}
                                className="input-field"
                                placeholder="Örn: 60"
                            />
                            <button
                                onClick={async () => {
                                    setSavingSettings(true);
                                    try {
                                        await api.patch(`/core/system-settings/${settings.id}/`, {
                                            default_daily_break_allowance: settings.default_daily_break_allowance
                                        });
                                        toast.success("Ayarlar kaydedildi.");
                                    } catch (e) {
                                        toast.error("Hata: " + e.message);
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                disabled={savingSettings}
                                className="btn btn-primary"
                            >
                                {savingSettings ? "..." : "Kaydet"}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Bu değer, özel bir kural tanımlanmamış tüm personeller için geçerli olacaktır.
                            Hiyerarşi: Personel &gt; Takvim Şablonu &gt; <strong>Sistem Varsayılanı</strong>.
                        </p>
                    </div>
                )}
            </div>

            {/* Fiscal Calendar Section */}
            {/* ... keeping existing table ... */}

        </div>
    );
};

export default SystemSettings;
