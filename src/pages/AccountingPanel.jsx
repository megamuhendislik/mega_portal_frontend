import React, { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import {
    Calculator,
    LayoutGrid,
    CalendarCheck,
    Clock,
    CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AccountingPeriodBar from './accounting/AccountingPeriodBar';
import OverviewTab from './accounting/OverviewTab';
import LeavesTab from './accounting/LeavesTab';
import OvertimeTab from './accounting/OvertimeTab';
import CardDataTab from './accounting/CardDataTab';
import PersonDrawer from './accounting/PersonDrawer';

// =========== TAB BUTTON ===========
const TabButton = ({ active, onClick, children, icon }) => (
    <button
        onClick={onClick}
        className={`relative px-3 sm:px-4 md:px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 outline-none
            ${active ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
        `}
    >
        {icon && <span className={active ? 'text-blue-500' : 'text-slate-400'}>{icon}</span>}
        {children}
        {active && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
        )}
    </button>
);

// =========== MAIN PAGE ===========
const TABS = [
    { key: 'overview', label: 'Genel Bakış', icon: <LayoutGrid size={18} /> },
    { key: 'leaves', label: 'İzinler', icon: <CalendarCheck size={18} /> },
    { key: 'overtime', label: 'Mesailer', icon: <Clock size={18} /> },
    { key: 'cards', label: 'Kart Verileri', icon: <CreditCard size={18} /> },
];

// Content-Disposition'dan dosya adını ayıkla
const filenameFromDisposition = (disposition, fallback) => {
    if (!disposition) return fallback;
    const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8) {
        try { return decodeURIComponent(utf8[1]); } catch { /* yoksay */ }
    }
    const plain = disposition.match(/filename="?([^";]+)"?/i);
    return plain ? plain[1] : fallback;
};

const AccountingPanel = () => {
    // useAuth: yetki/oturum bağlamı (sayfa zaten PAGE_ACCOUNTING ile korunuyor)
    useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Üst bar durumu
    const [periodState, setPeriodState] = useState({ params: {}, ready: false });
    const [search, setSearch] = useState('');

    // Hangi sekmeler bir kez mount edildi (lazy mount + state korunur)
    const [mounted, setMounted] = useState({ overview: true });

    // Kişi drawer'ı
    const [drawerEmpId, setDrawerEmpId] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Kart verileri sekmesine dış seçim aktarımı
    const [cardEmpId, setCardEmpId] = useState(null);

    // TXT indirme durumları
    const [exporting, setExporting] = useState(false);          // roster (üst bar)
    const [exportingPerson, setExportingPerson] = useState(false); // kişi (drawer)

    const handleParamsChange = useCallback((next) => {
        setPeriodState(next);
    }, []);

    const handleTabChange = (key) => {
        setActiveTab(key);
        setMounted((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    };

    const openPerson = useCallback((employeeId) => {
        if (!employeeId) return;
        setDrawerEmpId(employeeId);
        setDrawerOpen(true);
    }, []);

    // Ortak blob indirme
    const blobDownload = async (params, fallbackName, setBusy) => {
        if (!periodState.ready) {
            message.warning('Lütfen önce bir dönem seçin.');
            return;
        }
        setBusy(true);
        try {
            const res = await api.get('/accounting/export-txt/', {
                params,
                responseType: 'blob',
                timeout: 5 * 60 * 1000,
            });
            const disposition = res.headers?.['content-disposition'];
            const name = filenameFromDisposition(disposition, fallbackName);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            // Backend hata gövdesi blob olarak gelir — gerçek mesajı oku
            let msg = 'TXT indirilemedi.';
            const data = error?.response?.data;
            if (data instanceof Blob) {
                try {
                    const j = JSON.parse(await data.text());
                    if (j?.error) msg = j.error;
                } catch { /* JSON değilse genel mesaj */ }
            } else if (data?.error) {
                msg = data.error;
            }
            console.error('TXT indirme hatası:', error);
            message.error(msg);
        } finally {
            setBusy(false);
        }
    };

    const handleExportRoster = () => {
        blobDownload(
            { ...periodState.params, q: search || undefined, scope: 'roster' },
            'muhasebe_paneli.txt',
            setExporting,
        );
    };

    const handleExportPerson = (employeeId) => {
        if (!employeeId) return;
        blobDownload(
            { ...periodState.params, scope: 'person', employee_id: employeeId },
            `muhasebe_kisi_${employeeId}.txt`,
            setExportingPerson,
        );
    };

    // Kart verileri sekmesine dış seçim "consumed" callback'i (referans sabit)
    const consumeCardExternal = useRef(() => setCardEmpId(null)).current;

    const { params, ready } = periodState;

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500">
                        <Calculator size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            Muhasebe Paneli
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Tüm çalışanların izin, fazla mesai, kart verisi ve durumları — salt-okunur görüntüleme
                        </p>
                    </div>
                </div>
            </div>

            {/* Üst Bar */}
            <AccountingPeriodBar
                onParamsChange={handleParamsChange}
                onSearchChange={setSearch}
                search={search}
                onExport={handleExportRoster}
                exporting={exporting}
            />

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
                {TABS.map((tab) => (
                    <TabButton
                        key={tab.key}
                        active={activeTab === tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        icon={tab.icon}
                    >
                        {tab.label}
                    </TabButton>
                ))}
            </div>

            {/* Content Area — lazy mount, aktif/pasif görünüm ile state korunur */}
            <div className="min-h-[400px]">
                {mounted.overview && (
                    <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
                        <OverviewTab
                            params={params}
                            ready={ready}
                            search={search}
                            active={activeTab === 'overview'}
                            onSelectEmployee={openPerson}
                        />
                    </div>
                )}
                {mounted.leaves && (
                    <div style={{ display: activeTab === 'leaves' ? 'block' : 'none' }}>
                        <LeavesTab
                            params={params}
                            ready={ready}
                            search={search}
                            active={activeTab === 'leaves'}
                            onSelectEmployee={openPerson}
                        />
                    </div>
                )}
                {mounted.overtime && (
                    <div style={{ display: activeTab === 'overtime' ? 'block' : 'none' }}>
                        <OvertimeTab
                            params={params}
                            ready={ready}
                            search={search}
                            active={activeTab === 'overtime'}
                            onSelectEmployee={openPerson}
                        />
                    </div>
                )}
                {mounted.cards && (
                    <div style={{ display: activeTab === 'cards' ? 'block' : 'none' }}>
                        <CardDataTab
                            params={params}
                            ready={ready}
                            active={activeTab === 'cards'}
                            externalEmployeeId={cardEmpId}
                            onConsumeExternal={consumeCardExternal}
                        />
                    </div>
                )}
            </div>

            {/* Kişi detayı drawer */}
            <PersonDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                employeeId={drawerEmpId}
                params={params}
                onExportPerson={handleExportPerson}
                exportingPerson={exportingPerson}
            />
        </div>
    );
};

export default AccountingPanel;
