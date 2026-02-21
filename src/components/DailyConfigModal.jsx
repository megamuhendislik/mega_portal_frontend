import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Coffee, Trash2, Save } from 'lucide-react';
import api from '../services/api';
import moment from 'moment';

const DailyConfigModal = ({ date, calendarId, initialOverride, isHoliday, initialHolidayData, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState(initialOverride ? (initialOverride.is_off ? 'HOLIDAY' : 'CUSTOM') : isHoliday ? 'HOLIDAY' : 'STANDARD');
    const [loading, setLoading] = useState(false);

    // Custom Schedule State
    const [formData, setFormData] = useState({
        is_off: initialOverride?.is_off || false,
        start_time: initialOverride?.start_time || '09:00',
        end_time: initialOverride?.end_time || '18:00',
        lunch_start: initialOverride?.lunch_start || '12:00',
        lunch_end: initialOverride?.lunch_end || '13:00',
        description: initialOverride?.description || ''
    });

    // Holiday State (Simplified)
    const [holidayName, setHolidayName] = useState(initialOverride?.is_off ? (initialOverride?.description || 'Tatil') : (initialHolidayData?.title || 'Resmi Tatil'));

    const handleSave = async () => {
        setLoading(true);
        try {
            const dateStr = moment(date).format('YYYY-MM-DD');

            // 1. DELETE EXISTING OVERRIDE
            if (initialOverride?.id) {
                await api.delete(`/attendance/daily-overrides/${initialOverride.id}/`);
            }

            // 2. CREATE NEW (based on tab)
            if (activeTab === 'CUSTOM') {
                await api.post('/attendance/daily-overrides/', {
                    date: dateStr,
                    calendar: calendarId || null,
                    ...formData
                });
            } else if (activeTab === 'HOLIDAY') {
                await api.post('/attendance/daily-overrides/', {
                    date: dateStr,
                    calendar: calendarId || null,
                    is_off: true,
                    description: holidayName
                });
            }
            // STANDARD tab: just delete (already done above), no new override

            onSuccess();
        } catch (error) {
            alert('Hata: ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-indigo-600" />
                        {moment(date).format('DD MMMM YYYY')} Yapılandırması
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    {/* Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setActiveTab('STANDARD')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'STANDARD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Standart
                        </button>
                        <button
                            onClick={() => setActiveTab('HOLIDAY')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'HOLIDAY' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Tatil / İzin
                        </button>
                        <button
                            onClick={() => setActiveTab('CUSTOM')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'CUSTOM' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Özel Saatler
                        </button>
                    </div>

                    {/* Content */}
                    <div className="min-h-[200px]">
                        {activeTab === 'STANDARD' && (
                            <div className="text-center py-8 px-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                    <Calendar size={24} />
                                </div>
                                <p className="text-sm text-slate-600 font-medium">Bu gün için varsayılan haftalık çalışma programı uygulanacak.</p>
                                <p className="text-xs text-slate-400 mt-2">Varsa tüm özel ayarlar silinecektir.</p>
                            </div>
                        )}

                        {activeTab === 'HOLIDAY' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Tatil Açıklaması</label>
                                    <input
                                        type="text"
                                        value={holidayName}
                                        onChange={(e) => setHolidayName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300"
                                        placeholder="Örn: Cumhuriyet Bayramı"
                                    />
                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                        <Trash2 size={12} />
                                        Bu gün "OFF" (Çalışma Yok) olarak işaretlenecektir.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'CUSTOM' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                                    <Clock size={14} />
                                    <span>Bu güne özel mesai saatleri tanımlayın.</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Mesai Başlangıç</label>
                                        <input
                                            type="time"
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Mesai Bitiş</label>
                                        <input
                                            type="time"
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-xs">
                                        <Coffee size={14} className="text-amber-500" />
                                        <span>Öğle Molası</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mola Başlangıç</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_start}
                                                onChange={(e) => setFormData({ ...formData, lunch_start: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mola Bitiş</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_end}
                                                onChange={(e) => setFormData({ ...formData, lunch_end: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Açıklama (isteğe bağlı)</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300"
                                        placeholder="Örn: Yarım gün Cumartesi"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyConfigModal;
