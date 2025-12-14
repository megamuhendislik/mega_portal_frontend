import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Search,
    Bell,
    Network,
    Clock,
    Calendar,
    CalendarRange,
    Flag
} from 'lucide-react';
import clsx from 'clsx';

import OvertimeRequestModal from '../components/OvertimeRequestModal';
import NotificationBell from '../components/NotificationBell';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    // Shift State
    const [isShiftActive, setIsShiftActive] = useState(false);
    const [shiftLoading, setShiftLoading] = useState(false);

    // Overtime Modal State
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
    const [lastAttendanceData, setLastAttendanceData] = useState(null);

    // Check status on mount
    React.useEffect(() => {
        checkShiftStatus();
    }, []);

    const checkShiftStatus = async () => {
        try {
            const api = (await import('../services/api')).default;
            const response = await api.get('/attendance/current_status/');
            setIsShiftActive(response.data.is_active);
        } catch (error) {
            console.error('Shift status check failed:', error);
        }
    };

    const handleShiftToggle = async () => {
        setShiftLoading(true);
        try {
            const api = (await import('../services/api')).default;
            const response = await api.post('/attendance/toggle_shift/');

            if (response.data.status === 'STARTED') {
                setIsShiftActive(true);
            } else {
                setIsShiftActive(false);
                // Check for overtime
                if (response.data.overtime_detected) {
                    setLastAttendanceData(response.data.data);
                    setIsOvertimeModalOpen(true);
                }
            }
        } catch (error) {
            console.error('Shift toggle failed:', error);
            alert('İşlem başarısız oldu.');
        } finally {
            setShiftLoading(false);
        }
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'VIEW_SECTION_DASHBOARD' },
        { path: '/employees', label: 'Çalışanlar', icon: Users, permission: 'VIEW_SECTION_EMPLOYEES' },
        { path: '/organization-chart', label: 'Organizasyon Şeması', icon: Network, permission: 'VIEW_SECTION_ORG_CHART' },
        { path: '/projects', label: 'Projeler', icon: Briefcase, permission: 'VIEW_SECTION_PROJECTS' },
        { path: '/attendance', label: 'Mesai Takibi', icon: Clock, permission: 'VIEW_SECTION_ATTENDANCE' },
        { path: '/calendar', label: 'Takvim', icon: Calendar, permission: 'VIEW_SECTION_CALENDAR' },
        { path: '/work-schedules', label: 'Çalışma Takvimleri', icon: CalendarRange, permission: 'VIEW_SECTION_WORK_SCHEDULES' },
        { path: '/requests', label: 'Talepler', icon: FileText, permission: 'VIEW_SECTION_REQUESTS' },
        { path: '/reports', label: 'Raporlar', icon: Flag, permission: 'VIEW_SECTION_REPORTS' },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!user) return false;
        // Check if user is superuser (user object is nested in employee response)
        if (user.user?.is_superuser) return true;
        // If no permission defined, show it (or hide it, depending on policy. Let's show public items if any)
        if (!item.permission) return true;
        return user.all_permissions?.includes(item.permission);
    });

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            {/* Overtime Modal */}
            <OvertimeRequestModal
                isOpen={isOvertimeModalOpen}
                onClose={() => setIsOvertimeModalOpen(false)}
                attendanceData={lastAttendanceData}
                onSuccess={() => {
                    // Optional: Show success toast
                    alert('Fazla mesai talebiniz oluşturuldu.');
                }}
            />

            {/* Sidebar */}
            <aside
                className={clsx(
                    "bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl z-20",
                    isSidebarOpen ? "w-72" : "w-20"
                )}
            >
                {/* Logo Area */}
                <div className="p-6 flex items-center justify-between h-20 border-b border-slate-800/50">
                    {isSidebarOpen ? (
                        <div className="flex items-center space-x-3 animate-fade-in">
                            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain bg-white rounded p-0.5" />
                            <span className="font-bold text-lg tracking-wide">MEGA İNŞAAT</span>
                        </div>
                    ) : (
                        <div className="w-8 h-8 bg-white rounded flex items-center justify-center mx-auto p-0.5">
                            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {filteredNavItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "group flex items-center px-3 py-3 rounded-xl transition-all duration-200 relative overflow-hidden",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <item.icon size={22} className={clsx("transition-transform duration-200", isActive && "scale-110")} />

                                {isSidebarOpen && (
                                    <span className="ml-3 font-medium tracking-wide animate-fade-in">
                                        {item.label}
                                    </span>
                                )}

                                {isSidebarOpen && isActive && (
                                    <ChevronRight size={16} className="ml-auto opacity-70" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                    <button
                        onClick={logout}
                        className={clsx(
                            "flex items-center w-full p-3 rounded-xl transition-all duration-200 group",
                            "text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                        )}
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        {isSidebarOpen && <span className="ml-3 font-medium">Çıkış Yap</span>}
                    </button>

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="mt-4 w-full flex items-center justify-center p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        {isSidebarOpen ? <div className="flex items-center text-xs uppercase tracking-wider space-x-2"><span>Daralt</span><X size={14} /></div> : <Menu size={20} />}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-20 flex items-center justify-between px-8 sticky top-0 z-10 transition-all duration-300">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {navItems.find(i => i.path === location.pathname)?.label || 'Mega Portal'}
                        </h1>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Search Bar (Visual Only) */}
                        <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 border border-transparent focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Search size={18} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ara..."
                                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-48 text-slate-700 placeholder-slate-400"
                            />
                        </div>

                        {/* Shift Toggle Button */}
                        <button
                            onClick={handleShiftToggle}
                            disabled={shiftLoading}
                            className={clsx(
                                "hidden md:flex items-center px-4 py-2 rounded-full font-medium transition-all shadow-sm mx-4",
                                isShiftActive
                                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200",
                                shiftLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            <Clock size={18} className="mr-2" />
                            {shiftLoading ? 'İşleniyor...' : (isShiftActive ? 'Mesaiyi Sonlandır' : 'Mesai Başlat')}
                        </button>

                        {/* Notifications */}
                        <NotificationBell />

                        {/* User Profile */}
                        <div className="h-8 w-px bg-slate-200 mx-2"></div>

                        <Link to="/profile" className="flex items-center space-x-3 group cursor-pointer">
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || 'Kullanıcı')}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">{user?.job_position?.name || 'Personel'}</div>
                            </div>
                            <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                                <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
