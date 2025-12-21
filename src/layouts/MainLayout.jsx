import React, { useState, useEffect } from 'react';
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
    const location = useLocation();

    // Sidebar State - Default closed on mobile (< 768px)
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    // Shift State
    const [isShiftActive, setIsShiftActive] = useState(false);
    const [shiftLoading, setShiftLoading] = useState(false);

    // Overtime Modal State
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
    const [lastAttendanceData, setLastAttendanceData] = useState(null);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile && !isSidebarOpen) {
                setIsSidebarOpen(true); // Auto open on desktop if closed
            } else if (mobile && isSidebarOpen) {
                setIsSidebarOpen(false); // Auto close on mobile resize
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check status on mount
    useEffect(() => {
        checkShiftStatus();
    }, []);

    // Close sidebar on route change if mobile
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname, isMobile]);

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
        if (user.user?.is_superuser) return true;
        if (!item.permission) return true;
        return user.all_permissions?.includes(item.permission);
    });

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Overtime Modal */}
            <OvertimeRequestModal
                isOpen={isOvertimeModalOpen}
                onClose={() => setIsOvertimeModalOpen(false)}
                attendanceData={lastAttendanceData}
                onSuccess={() => {
                    alert('Fazla mesai talebiniz oluşturuldu.');
                }}
            />

            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    "fixed md:relative z-40 h-full transition-all duration-300 ease-in-out flex flex-col shadow-2xl overflow-hidden",
                    // Base Dark Theme to match Employee Wizard
                    "bg-slate-900 text-white border-r border-white/5",
                    isSidebarOpen ? "w-72 translate-x-0" : (isMobile ? "-translate-x-full w-72" : "w-20 translate-x-0")
                )}
            >
                {/* Decorative Background Elements (MATCHING WIZARD DESIGN) */}
                <div className="absolute top-0 left-0 w-full h-full bg-slate-900 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50"></div>
                </div>
                {/* Logo Area */}
                <div className="p-6 flex items-center justify-between h-24 border-b border-white/5 relative z-10 overflow-hidden">
                    {/* Abstract Background Decoration */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none" />

                    {isSidebarOpen || isMobile ? (
                        <div className="flex items-center space-x-3 relative z-10 animate-fade-in">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain brightness-0 invert" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-lg tracking-wide text-white">
                                    MEGA PORTAL
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                                    Yönetim Paneli
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
                            <span className="text-white font-bold text-lg">M</span>
                        </div>
                    )}

                    {isMobile && (
                        <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent relative z-10">
                    {filteredNavItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "group flex items-center px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon
                                    size={20}
                                    className={clsx(
                                        "transition-transform duration-300",
                                        isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"
                                    )}
                                />

                                {(isSidebarOpen || isMobile) && (
                                    <span className="ml-3 font-medium text-sm tracking-wide transition-colors">
                                        {item.label}
                                    </span>
                                )}

                                {(isSidebarOpen || isMobile) && isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm relative z-10">
                    <button
                        onClick={logout}
                        className={clsx(
                            "flex items-center w-full p-3 rounded-xl transition-all duration-300 group border border-transparent",
                            "text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                        )}
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        {(isSidebarOpen || isMobile) && <span className="ml-3 font-medium text-sm">Çıkış Yap</span>}
                    </button>

                    {!isMobile && (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="mt-3 w-full flex items-center justify-center p-2 text-slate-600 hover:text-slate-300 transition-colors"
                        >
                            {isSidebarOpen ? (
                                <div className="flex items-center text-[10px] uppercase tracking-widest gap-2 opacity-50 hover:opacity-100">
                                    <ChevronRight className="rotate-180" size={12} />
                                    <span>Daralt</span>
                                </div>
                            ) : <Menu size={18} />}
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative w-full">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <Menu size={24} />
                            </button>
                        )}
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate">
                            {navItems.find(i => i.path === location.pathname)?.label || 'Mega Portal'}
                        </h1>
                    </div>

                    <div className="flex items-center space-x-3 md:space-x-6">
                        {/* Search Bar (Desktop) */}
                        <div className="hidden md:flex items-center bg-slate-100/80 rounded-full px-4 py-2 border border-transparent focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
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
                            {shiftLoading ? '...' : (isShiftActive ? 'Bitir' : 'Başlat')}
                        </button>

                        {/* Notifications */}
                        <NotificationBell />

                        {/* User Profile */}
                        <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

                        <Link to="/profile" className="flex items-center space-x-3 group cursor-pointer">
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || 'Kullanıcı')}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">{user?.job_position?.name || 'Personel'}</div>
                            </div>
                            <div className="h-10 w-10 md:h-11 md:w-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                                <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 md:p-6 scroll-smooth">
                    <div className="w-full h-full flex flex-col animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
