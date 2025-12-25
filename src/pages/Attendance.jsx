import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle, XCircle, Trash2, Filter, Users, User, BarChart2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import DailySummaryCard from '../components/DailySummaryCard';
import TeamSelector from '../components/TeamSelector';
import AttendanceLogTable from '../components/AttendanceLogTable';
import TeamAttendanceOverview from '../components/TeamAttendanceOverview';
import TeamComparisonChart from '../components/TeamComparisonChart';

const Attendance = () => {
    const { user } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState('my_attendance'); // 'my_attendance', 'team_attendance', 'team_detail'
    const [loading, setLoading] = useState(true);

    // Data State
    const [logs, setLogs] = useState([]);
    const [todaySummary, setTodaySummary] = useState(null);
    const [summary, setSummary] = useState({ totalWorkHours: 0, totalOvertime: 0, missingDays: 0 });

    // Team Data
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamComparison, setTeamComparison] = useState([]);

    // Filters
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [dateFilter, setDateFilter] = useState('MONTH');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Initialize dates
    useEffect(() => {
        handleDateFilterChange('MONTH');
    }, []);

    // Initial Load & Auth Check
    useEffect(() => {
        console.log("Attendance: User changed", user);
        if (user) {
            console.log("Attendance: User Employee ID:", user.employee?.id);
            if (activeTab === 'my_attendance') {
                // Default to self for My Attendance
                const empId = user.employee?.id || null;
                console.log("Attendance: Setting selectedEmployeeId to", empId);
                setSelectedEmployeeId(empId);
            } else if (activeTab === 'team_attendance') {
                fetchTeamData();
            }
        } else {
            console.log("Attendance: No user found in context");
        }
    }, [user, activeTab]);

    // Fetch Logs when params change
    useEffect(() => {
        if (selectedEmployeeId && startDate && endDate && (activeTab === 'my_attendance' || activeTab === 'team_detail')) {
            fetchAttendance();
            fetchTodaySummary();
        }
    }, [selectedEmployeeId, startDate, endDate, activeTab]);

    const handleDateFilterChange = (type) => {
        setDateFilter(type);
        const today = new Date();
        let start = new Date();
        let end = new Date();

        if (type === 'WEEK') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end.setDate(start.getDate() + 6);
        } else if (type === 'MONTH') {
            start.setDate(1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        if (type !== 'CUSTOM') {
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        }
    };

    const fetchTodaySummary = async () => {
        try {
            const params = {};
            if (selectedEmployeeId) {
                params.employee_id = selectedEmployeeId;
            }
            const response = await api.get('/attendance/today_summary/', { params });
            setTodaySummary(response.data);
        } catch (error) {
            console.error('Error fetching today summary:', error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/attendance/?employee_id=${selectedEmployeeId}&start_date=${startDate}&end_date=${endDate}`);
            const data = response.data.results || response.data;
            setLogs(data);
            calculateSummary(data);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            // Fetch employees managed by user (or all if admin)
            // Note: This endpoint might need adjustment depending on backend implementation
            const response = await api.get('/employees/');
            // Mocking "Status" data for now by mixing basic employee info with random status
            // In a real app, we'd need an endpoint like /attendance/team_status/

            const members = response.data.results || response.data || [];

            // Filter: If not admin, maybe filter? Assuming backend filters for us.

            // Map to Team Data format
            const mappedMembers = members.map(m => ({
                id: m.id,
                name: `${m.first_name} ${m.last_name}`,
                status: Math.random() > 0.5 ? 'IN' : 'OUT', // Mock Status
                lastActionTime: '09:00', // Mock Time
                totalTodayMinutes: Math.floor(Math.random() * 500), // Mock Minutes
                avatar: null
            }));

            setTeamMembers(mappedMembers);

            // Map Comparison Data
            const comparison = mappedMembers.map(m => ({
                label: m.name,
                value: m.totalTodayMinutes,
                color: '#3b82f6'
            }));
            setTeamComparison(comparison);

        } catch (error) {
            console.error("Team data fetch error", error);
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
            missingDays: 0
        });
    };

    const handleTeamMemberClick = (id) => {
        setSelectedEmployeeId(id);
        setActiveTab('team_detail');
    };

    const handleResetAll = async () => {
        if (!window.confirm('DİKKAT! Tüm mesai kayıtları silinecek. Bu işlem geri alınamaz. Emin misiniz?')) { return; }
        try {
            setLoading(true);
            await api.post('/attendance/reset_all/');
            alert('Tüm kayıtlar başarıyla silindi.');
            fetchAttendance();
        } catch (error) {
            alert('Hata: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Mesai Takibi</h2>
                    <p className="text-slate-500 font-medium">Giriş-çıkış kayıtlarınız ve çalışma süreleriniz</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab('my_attendance')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'my_attendance' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <User size={16} />
                        Kendi Mesaim
                    </button>
                    {(user?.user?.is_superuser || user?.employee?.roles?.some(r => r.key === 'MANAGER')) && (
                        <button
                            onClick={() => setActiveTab('team_attendance')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'team_attendance' || activeTab === 'team_detail' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={16} />
                            Ekip Mesaileri
                        </button>
                    )}
                </div>
            </div>

            {/* Content Based on Tab */}
            {activeTab === 'my_attendance' || activeTab === 'team_detail' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Controls Row */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        {/* Back Button for Detail View */}
                        {activeTab === 'team_detail' && (
                            <button
                                onClick={() => setActiveTab('team_attendance')}
                                className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"
                            >
                                ← Listeye Dön
                            </button>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                            {/* Date Range Picker */}
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <button onClick={() => handleDateFilterChange('WEEK')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dateFilter === 'WEEK' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Bu Hafta</button>
                                <button onClick={() => handleDateFilterChange('MONTH')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dateFilter === 'MONTH' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Bu Ay</button>
                                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDateFilter('CUSTOM'); }} className="bg-transparent text-xs font-bold text-slate-600 outline-none w-24" />
                                <span className="text-slate-400">-</span>
                                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDateFilter('CUSTOM'); }} className="bg-transparent text-xs font-bold text-slate-600 outline-none w-24" />
                            </div>

                            {/* Admin Reset */}
                            {user?.user?.is_superuser && (
                                <button onClick={handleResetAll} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Tüm Mesaileri Sıfırla"><Trash2 size={18} /></button>
                            )}
                        </div>
                    </div>

                    {/* Viewing Header */}
                    {activeTab === 'team_detail' && (
                        <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl flex items-center gap-3 text-blue-800">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-sm">
                                {selectedEmployeeId}
                            </div>
                            <div>
                                <p className="font-bold text-sm">Görüntülenen Çalışan ID: {selectedEmployeeId}</p>
                                <p className="text-xs opacity-75">Bu kullanıcının mesai detaylarını görüntülüyorsunuz.</p>
                            </div>
                        </div>
                    )}

                    {/* Today's Summary */}
                    <DailySummaryCard summary={todaySummary} loading={loading} />

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Clock size={24} /></div>
                            <div>
                                <p className="text-sm text-slate-500 font-bold">Toplam Çalışma</p>
                                <h3 className="text-2xl font-black text-slate-800">{summary.totalWorkHours} Saat</h3>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-500 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><CheckCircle size={24} /></div>
                            <div>
                                <p className="text-sm text-slate-500 font-bold">Fazla Mesai</p>
                                <h3 className="text-2xl font-black text-slate-800">{summary.totalOvertime} Saat</h3>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-orange-500 flex items-center gap-4">
                            <div className="p-3 bg-orange-50 rounded-full text-orange-600"><AlertCircle size={24} /></div>
                            <div>
                                <p className="text-sm text-slate-500 font-bold">Eksik Gün</p>
                                <h3 className="text-2xl font-black text-slate-800">-</h3>
                            </div>
                        </div>
                    </div>

                    {/* Logs Table */}
                    <AttendanceLogTable logs={logs} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Team Attendance View */}
                    <div className="lg:col-span-2 space-y-6">
                        <TeamAttendanceOverview teamData={teamMembers} onMemberClick={handleTeamMemberClick} />
                    </div>
                    <div>
                        <TeamComparisonChart data={teamComparison} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;

