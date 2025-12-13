import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';

const OvertimeRequestModal = ({ isOpen, onClose, attendanceData, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !attendanceData) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/overtime-requests/create_from_attendance/', {
                attendance_id: attendanceData.id,
                reason: reason
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating overtime request:', err);
            setError(err.response?.data?.error || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="w-6 h-6" />
                            Fazla Mesai Tespit Edildi
                        </h3>
                        <p className="text-blue-100 mt-1 text-sm">
                            Mesai süreniz normal çalışma saatinizi aştı.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-blue-800 font-medium">
                                {attendanceData.overtime_minutes} dakika fazla mesai yaptınız.
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                Bu süreyi fazla mesai olarak talep etmek ister misiniz?
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Açıklama / Gerekçe <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-32 text-sm"
                                placeholder="Örn: Proje teslimi için ek çalışma yapıldı..."
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-lg transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? 'Gönderiliyor...' : 'Talep Oluştur'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OvertimeRequestModal;
