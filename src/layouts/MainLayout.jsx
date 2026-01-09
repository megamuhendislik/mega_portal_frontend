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
    Flag,
    Shield,
    Database
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
        { path: '/', label: 'Ana Sayfa', icon: LayoutDashboard, permission: 'VIEW_SECTION_DASHBOARD' },
        { path: '/employees', label: 'Çalışanlar', icon: Users, permission: 'VIEW_SECTION_EMPLOYEES' },
        { path: '/organization-chart', label: 'Organizasyon Şeması', icon: Network, permission: 'VIEW_SECTION_ORG_CHART' },
        { path: '/projects', label: 'Projeler', icon: Briefcase, permission: 'VIEW_SECTION_PROJECTS' },
        { path: '/attendance', label: 'Mesai Takibi', icon: Clock, permission: 'VIEW_SECTION_ATTENDANCE' },
        { path: '/calendar', label: 'Takvim', icon: Calendar, permission: 'VIEW_SECTION_CALENDAR' },
        { path: '/work-schedules', label: 'Çalışma Takvimleri', icon: CalendarRange, permission: 'VIEW_SECTION_WORK_SCHEDULES' },
        { path: '/requests', label: 'Talepler', icon: FileText, permission: 'VIEW_SECTION_REQUESTS' },
        { path: '/reports', label: 'Raporlar', icon: Flag, permission: 'VIEW_SECTION_REPORTS' },
        { path: '/admin/service-control', label: 'Servis Yönetimi', icon: Monitor, permission: null, adminOnly: true },
        { path: '/admin/system-health', label: 'Sistem Sağlığı', icon: Shield, permission: null, adminOnly: true },
        { path: '/debug/attendance', label: 'Debug', icon: Database, permission: null, adminOnly: true },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!user) return false;
        if (user.user?.is_superuser) return true;

        // Hide Admin only items from non-superusers (unless they have explicit permission, but Health Check is critical)
        if (item.adminOnly) return false;

        if (!item.permission) return true;
        return user.all_permissions?.includes(item.permission);
    });

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
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
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Premium Sidebar */}
            <aside
                className={clsx(
                    "fixed md:relative z-40 h-full transition-all duration-400 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col shadow-2xl overflow-hidden",
                    "bg-[#0F172A] border-r border-white/5",
                    isSidebarOpen ? "w-[280px] translate-x-0" : (isMobile ? "-translate-x-full w-[280px]" : "w-[88px] translate-x-0")
                )}
            >
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
                </div>

                {/* Logo Section */}
                <div className="p-6 h-24 flex items-center justify-between border-b border-white/5 relative z-10">
                    <div className={clsx("flex items-center gap-4 transition-all duration-300", !isSidebarOpen && !isMobile && "justify-center w-full")}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10 shrink-0">
                            {isSidebarOpen || isMobile ? (
                                <img src="/mega_logo.png" alt="Mega Portal" className="w-10 h-10 object-contain" />
                            ) : (
                                <span className="text-white font-bold text-lg">M</span>
                            )}
                        </div>

                        {(isSidebarOpen || isMobile) && (
                            <div className="flex flex-col animate-fade-in">
                                <span className="font-bold text-lg tracking-tight text-white leading-tight">
                                    MEGA PORTAL
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                                    Yönetim Paneli
                                </span>
                            </div>
                        )}
                    </div>

                    {isMobile && (
                        <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent relative z-10">
                    {filteredNavItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "group flex items-center px-3.5 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg shadow-blue-900/20 ring-1 ring-white/10"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon
                                    size={22}
                                    className={clsx(
                                        "transition-transform duration-300 shrink-0",
                                        isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-blue-400 group-hover:scale-105"
                                    )}
                                />

                                {(isSidebarOpen || isMobile) && (
                                    <span className={clsx(
                                        "ml-3.5 font-medium text-[15px] tracking-wide transition-colors truncate",
                                        isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                                    )}>
                                        {item.label}
                                    </span>
                                )}

                                {isActive && (isSidebarOpen || isMobile) && (
                                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User & Toggle Section */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md relative z-10">
                    <button
                        onClick={logout}
                        className={clsx(
                            "flex items-center w-full p-3.5 rounded-xl transition-all duration-300 group border border-transparent",
                            "text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                        )}
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform shrink-0" />
                        {(isSidebarOpen || isMobile) && (
                            <span className="ml-3 font-medium text-sm">Oturumu Kapat</span>
                        )}
                    </button>

                    {!isMobile && (
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="mt-2 w-full flex items-center justify-center p-2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {isSidebarOpen ? (
                                <div className="flex items-center text-[10px] uppercase tracking-widest gap-2 opacity-50 hover:opacity-100">
                                    <ChevronRight className="rotate-180" size={12} />
                                    <span>Menüyü Daralt</span>
                                </div>
                            ) : <Menu size={20} />}
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative w-full bg-[#F8FAFC]">
                {/* Modern Header */}
                <header className="h-20 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-all duration-300 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2.5 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
                            >
                                <Menu size={24} />
                            </button>
                        )}
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
                            {navItems.find(i => i.path === location.pathname)?.label || 'Mega Portal'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        {/* Search (Desktop) */}
                        <div className="hidden md:flex items-center bg-slate-100/50 hover:bg-white border border-slate-200/60 focus-within:border-blue-400/50 rounded-full px-4 py-2.5 w-64 transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:shadow-md">
                            <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Arama yap..."
                                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-slate-700 placeholder-slate-400 outline-none"
                            />
                        </div>

                        {/* Shift Button */}
                        <button
                            onClick={handleShiftToggle}
                            disabled={shiftLoading}
                            className={clsx(
                                "flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 shadow-sm border transform hover:scale-105 active:scale-95",
                                isShiftActive
                                    ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:border-rose-200 hover:shadow-rose-100"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 hover:shadow-emerald-100",
                                shiftLoading && "opacity-70 cursor-wait"
                            )}
                        >
                            <Clock size={18} className={clsx(shiftLoading && "animate-spin")} />
                            {shiftLoading ? 'İşleniyor...' : (isShiftActive ? 'Mesaiyi Bitir' : 'Mesai Başlat')}
                        </button>

                        <NotificationBell />

                        <div className="h-8 w-px bg-slate-200 hidden md:block" />

                        {/* Profile Dropdown Trigger */}
                        <Link to="/profile" className="flex items-center gap-3 pl-2 group">
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || 'Kullanıcı')}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {user?.job_position?.name || 'Personel'}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600 font-black text-lg">
                                            {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    <div className="max-w-[1600px] mx-auto animate-fade-in w-full pb-10">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
