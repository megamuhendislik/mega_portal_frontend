import React, { useState } from 'react';
import {
    Calculator,
    LayoutGrid,
    CalendarCheck,
    Clock,
    CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

// =========== PLACEHOLDER ===========
const TabPlaceholder = ({ title }) => (
    <div className="glass-card p-10 flex flex-col items-center justify-center text-center text-slate-400">
        <p className="text-base font-bold text-slate-500">{title}</p>
        <p className="text-sm font-medium mt-1">Yakında</p>
    </div>
);

// =========== MAIN PAGE ===========
const TABS = [
    { key: 'overview', label: 'Genel Bakış', icon: <LayoutGrid size={18} /> },
    { key: 'leaves', label: 'İzinler', icon: <CalendarCheck size={18} /> },
    { key: 'overtime', label: 'Mesailer', icon: <Clock size={18} /> },
    { key: 'cards', label: 'Kart Verileri', icon: <CreditCard size={18} /> },
];

const AccountingPanel = () => {
    // useAuth: ileride mali dönem/yetki bazlı görünüm için kullanılacak
    useAuth();
    const [activeTab, setActiveTab] = useState('overview');

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

            {/* Üst Bar — Placeholder (mali dönem / tarih / arama / TXT indir sonraki ünitede eklenecek) */}
            <div className="glass-card p-4" />

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
                {TABS.map((tab) => (
                    <TabButton
                        key={tab.key}
                        active={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        icon={tab.icon}
                    >
                        {tab.label}
                    </TabButton>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {TABS.map((tab) => (
                    <div key={tab.key} style={{ display: activeTab === tab.key ? 'block' : 'none' }}>
                        <TabPlaceholder title={tab.label} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AccountingPanel;
