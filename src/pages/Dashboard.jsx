import React, { useEffect, useState } from 'react';
import { Users, Briefcase, Clock, TrendingUp, Activity, Calendar } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
    const [statsData, setStatsData] = useState({
        total_employees: 0,
        active_projects: 0,
        pending_requests: 0,
        monthly_performance: 0
    });
    const [loading, setLoading] = useState(true);

    const [todaySummary, setTodaySummary] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, summaryRes] = await Promise.all([
                    api.get('/dashboard/stats/'),
                    api.get('/attendance/today_summary/')
                ]);
                setStatsData(statsRes.data);
                setTodaySummary(summaryRes.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Optional: Poll for live updates every minute
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const stats = [
        {
            title: 'Toplam Çalışan',
            value: statsData.total_employees,
            change: '+0%', // Dynamic change calculation can be added later
            trend: 'neutral',
            icon: Users,
            color: 'bg-blue-500',
            lightColor: 'bg-blue-50'
        },
        {
            title: 'Aktif Projeler',
            value: statsData.active_projects,
            change: '+0',
            trend: 'neutral',
            icon: Briefcase,
            color: 'bg-indigo-500',
            lightColor: 'bg-indigo-50'
        },
        {
            title: 'Bekleyen Talepler',
            value: statsData.pending_requests,
            change: '0',
            trend: 'neutral',
            icon: Clock,
            color: 'bg-amber-500',
            lightColor: 'bg-amber-50'
        },
        {
            title: 'Aylık Performans',
            value: `%${statsData.monthly_performance}`,
            change: '+0%',
            trend: 'neutral',
            icon: TrendingUp,
            color: 'bg-emerald-500',
            lightColor: 'bg-emerald-50'
        },
    ];

    // Empty activities for now as requested "0 data"
    const activities = [];

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Genel Bakış</h2>
                    <p className="text-slate-500 mt-1">İşletmenizin anlık durumunu buradan takip edebilirsiniz.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-sm text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        Son Güncelleme: Bugün, {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/30">
                        Rapor Oluştur
                    </button>
                </div>
            </div>

            import DailySummaryCard from '../components/DailySummaryCard';

            // ... inside Dashboard component ...

            {/* Today's Summary Section */}
            <DailySummaryCard summary={todaySummary} loading={loading} />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                <h3 className="text-3xl font-bold text-slate-800 mt-2 group-hover:text-blue-600 transition-colors">{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.lightColor} text-white`}>
                                <stat.icon size={24} className={stat.color.replace('bg-', 'text-')} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className={stat.trend === 'up' ? 'text-emerald-500 font-medium' : stat.trend === 'down' ? 'text-red-500 font-medium' : 'text-slate-400 font-medium'}>
                                {stat.change}
                            </span>
                            <span className="text-slate-400 ml-2">geçen aya göre</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-blue-500" />
                            Son Aktiviteler
                        </h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Tümünü Gör</button>
                    </div>

                    <div className="space-y-6">
                        {activities.length > 0 ? (
                            activities.map((activity) => (
                                <div key={activity.id} className="flex items-start space-x-4 group">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                            {activity.avatar}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-800">
                                            <span className="font-semibold">{activity.user}</span> {activity.action} <span className="font-medium text-blue-600">{activity.target}</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1 flex items-center">
                                            <Clock size={12} className="mr-1" />
                                            {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                Henüz aktivite bulunmuyor.
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Deadlines / Quick Actions */}
                <div className="space-y-8">
                    <div className="card bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
                        <h3 className="text-lg font-bold mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                            Yaklaşan Teslimler
                        </h3>
                        <div className="space-y-4">
                            {/* Empty state for deadlines */}
                            <div className="text-center py-4 text-slate-400 text-sm">
                                Yaklaşan teslim bulunmuyor.
                            </div>
                        </div>
                        <button className="w-full mt-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                            Takvime Git
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
