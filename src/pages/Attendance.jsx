import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import DailySummaryCard from '../components/DailySummaryCard';
import TeamSelector from '../components/TeamSelector';

const Attendance = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [summary, setSummary] = useState({
        totalWorkHours: 0,
        totalOvertime: 0,
        missingDays: 0
    });

    const [todaySummary, setTodaySummary] = useState(null);

    // Initialize intent
    useEffect(() => {
        if (user?.employee?.id) {
            setSelectedEmployeeId(user.employee.id);
        } else if (user) {
            // User loaded but no employee profile? Stop loading.
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedEmployeeId) {
            fetchAttendance();
            fetchTodaySummary();
        }
    }, [selectedEmployeeId]);

    const fetchTodaySummary = async () => {
        try {
            // Note: Current Status API defaults to Request.User. 
            // If viewing another employee, we might not see THEIR 'today summary' unless API supports it.
            // For now, let's keep it as is (User's own status) or update API later.
            // The requirement was mainly about seeing logs.
            const response = await api.get('/attendance/today_summary/');
            setTodaySummary(response.data);
        } catch (error) {
            console.error('Error fetching today summary:', error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/attendance/?employee_id=${selectedEmployeeId}`);
            const data = response.data.results || response.data;
            setLogs(data);
            calculateSummary(data);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateSummary = (data) => {
        let totalMinutes = 0;
        let overtimeMinutes = 0;

        data.forEach(log => {
            if (log.total_minutes) totalMinutes += log.total_minutes;
            if (log.overtime_minutes) overtimeMinutes += log.overtime_minutes;
        });

        setSummary({
            totalWorkHours: (totalMinutes / 60).toFixed(1),
            totalOvertime: (overtimeMinutes / 60).toFixed(1),
            missingDays: 0 // Logic for missing days would require comparing against expected work days
        });
    };

    const handleResetAll = async () => {
        if (!window.confirm('DİKKAT! Tüm mesai kayıtları silinecek. Bu işlem geri alınamaz. Emin misiniz?')) {
            return;
        }

        try {
            setLoading(true);
            await api.post('/attendance/reset_all/');
            alert('Tüm kayıtlar başarıyla silindi.');
            fetchAttendance(); // Refresh list
        } catch (error) {
            console.error('Error resetting attendance:', error);
            alert('Bir hata oluştu: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    };

    const getStatusBadge = (status) => {
        const styles = {
            'OPEN': 'bg-blue-100 text-blue-700',
            'PENDING_MANAGER_APPROVAL': 'bg-yellow-100 text-yellow-700',
            'APPROVED': 'bg-emerald-100 text-emerald-700',
            'REJECTED': 'bg-red-100 text-red-700',
            'AUTO_APPROVED': 'bg-emerald-50 text-emerald-600'
        };

        const labels = {
            'OPEN': 'Çıkış Bekliyor',
            'PENDING_MANAGER_APPROVAL': 'Onay Bekliyor',
            'APPROVED': 'Onaylandı',
            'REJECTED': 'Reddedildi',
            'AUTO_APPROVED': 'Otomatik Onay'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Mesai Takibi</h2>
                    <p className="text-slate-500 mt-1">Giriş-çıkış kayıtlarınız ve çalışma süreleriniz</p>
                </div>
                <div className="flex gap-3">
                    {/* Team Selector */}
                    <TeamSelector
                        selectedId={selectedEmployeeId}
                        onSelect={setSelectedEmployeeId}
                    />

                    {/* Admin Reset Button */}
                    {user?.user?.is_superuser && (
                        <button
                            onClick={handleResetAll}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors font-medium text-sm"
                        >
                            <Trash2 size={16} />
                            Tüm Mesaileri Sıfırla
                        </button>
                    )}
                    {/* Future: Date Range Picker */}
                </div>
            </div>


            {/* Today's Summary Card */}
            <DailySummaryCard summary={todaySummary} loading={loading} />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 flex items-center space-x-4 border-l-4 border-blue-500">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Toplam Çalışma</p>
                        <h3 className="text-2xl font-bold text-slate-800">{summary.totalWorkHours} Saat</h3>
                    </div>
                </div>
                <div className="card p-6 flex items-center space-x-4 border-l-4 border-emerald-500">
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Fazla Mesai</p>
                        <h3 className="text-2xl font-bold text-slate-800">{summary.totalOvertime} Saat</h3>
                    </div>
                </div>
                {/* Placeholder for Missing Days or other metric */}
                <div className="card p-6 flex items-center space-x-4 border-l-4 border-orange-500">
                    <div className="p-3 bg-orange-50 rounded-full text-orange-600">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Eksik/Hatalı Gün</p>
                        <h3 className="text-2xl font-bold text-slate-800">-</h3>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Tarih</th>
                                <th className="p-4">Giriş</th>
                                <th className="p-4">Çıkış</th>
                                <th className="p-4">Süre (Dk)</th>
                                <th className="p-4">Mola (Dk)</th>
                                <th className="p-4">Normal / Fazla</th>
                                <th className="p-4">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                                    <td className="p-4 font-medium">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-slate-400" />
                                            {formatDate(log.work_date)}
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-slate-600">{formatTime(log.check_in)}</td>
                                    <td className="p-4 font-mono text-slate-600">{formatTime(log.check_out)}</td>
                                    <td className="p-4 font-bold text-slate-800">
                                        {log.total_minutes ? `${Math.floor(log.total_minutes / 60)}s ${log.total_minutes % 60}dk` : '-'}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {log.break_minutes > 0 ? (
                                            <span className="text-emerald-600 font-medium">+{log.break_minutes} dk</span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col text-xs">
                                            <span className="text-slate-600">Normal: {log.normal_minutes || 0} dk</span>
                                            {log.overtime_minutes > 0 && (
                                                <span className="text-emerald-600 font-bold">Fazla: {log.overtime_minutes} dk</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(log.status)}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400">
                                        Henüz kayıt bulunmamaktadır.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default Attendance;
