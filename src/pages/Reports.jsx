import React, { useState } from 'react';
import { FileDown, Calendar } from 'lucide-react';
import api from '../services/api';

const Reports = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/attendance/monthly-reports/export_excel/`, {
                params: { year, month },
                responseType: 'blob', // Important for file download
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Mutabakat_${year}_${month}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Rapor indirilemedi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Raporlar</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Reconciliation Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <FileDown size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-800">Aylık Mutabakat Raporu</h3>
                            <p className="text-sm text-slate-500">Personel bazlı aylık mesai ve izin özeti.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Yıl</label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ay</label>
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {new Date(0, i).toLocaleString('tr-TR', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                            Rapor Aralığı: <strong>26 {new Date(0, month - 2).toLocaleString('tr-TR', { month: 'long' })}</strong> - <strong>25 {new Date(0, month - 1).toLocaleString('tr-TR', { month: 'long' })}</strong>
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Hazırlanıyor...' : (
                                <>
                                    <FileDown size={18} />
                                    Excel İndir
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
