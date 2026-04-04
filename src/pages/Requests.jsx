import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Layers, ArrowDownLeft, CalendarCheck, BarChart3, Search, X
} from 'lucide-react';
import api from '../services/api';

import MyRequestsTab from './requests/MyRequestsTab';
import IncomingRequestsTab from './requests/IncomingRequestsTab';
import OvertimeRequestsTab from './requests/OvertimeRequestsTab';
import AnalyticsTab from './requests/AnalyticsTab';

// =========== TAB BUTTON ===========
const TabButton = ({ active, onClick, children, badge, icon }) => (
    <button
        onClick={onClick}
        className={`relative px-3 sm:px-4 md:px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 outline-none
            ${active ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
        `}
    >
        {icon && <span className={active ? 'text-blue-500' : 'text-slate-400'}>{icon}</span>}
        {children}
        {badge > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold
                ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {badge}
            </span>
        )}
        {active && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
        )}
    </button>
);

// =========== MAIN PAGE ===========
const TAB_ALIASES = {
    'incoming': 'incoming_requests',
    'incoming_requests': 'incoming_requests',
    'overtime': 'overtime_requests',
    'overtime_requests': 'overtime_requests',
    'analytics': 'analytics',
    'my_requests': 'my_requests',
};

const Requests = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = TAB_ALIASES[searchParams.get('tab')] || 'my_requests';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [mountedTabs, setMountedTabs] = useState({ [initialTab]: true });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Global search — shared across all tabs
    const [searchText, setSearchText] = useState('');

    // Manager detection — full subordinate lists (fetched ONCE, shared with all tabs)
    const [primarySubordinates, setPrimarySubordinates] = useState([]);
    const [secondarySubordinates, setSecondarySubordinates] = useState([]);
    const [teamCountsLoading, setTeamCountsLoading] = useState(true);
    const primaryCount = primarySubordinates.length;
    const secondaryCount = secondarySubordinates.length;
    const hasAnyTeam = primaryCount > 0 || secondaryCount > 0;
    // APPROVAL_* tüm rollere verildiği için yönetici tespitinde kullanılmaz;
    // gerçek yönetici = subordinate'i olan kişi
    const isManager = hasAnyTeam;

    // Badge for incoming tab
    const [incomingPendingCount, setIncomingPendingCount] = useState(0);

    useEffect(() => {
        const fetchSubordinates = async () => {
            try {
                const [priRes, secRes] = await Promise.allSettled([
                    api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY' } }),
                    api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY' } }),
                ]);
                const toList = (res) => {
                    if (res.status !== 'fulfilled') return [];
                    const d = res.value.data;
                    return Array.isArray(d) ? d : d.results || [];
                };
                setPrimarySubordinates(toList(priRes));
                setSecondarySubordinates(toList(secRes));
            } catch { /* not manager */ }
            setTeamCountsLoading(false);
        };
        fetchSubordinates();
    }, []);

    // Sync tab changes to URL
    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        setMountedTabs(prev => prev[tab] ? prev : { ...prev, [tab]: true });
        setSearchParams(tab === 'my_requests' ? {} : { tab: tab.replace('_requests', '') }, { replace: true });
    }, [setSearchParams]);

    // Cross-tab refresh: when any tab modifies data, bump trigger for all
    const handleDataChange = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const handlePendingCountChange = useCallback((count) => {
        setIncomingPendingCount(count);
    }, []);

    // Page title based on active tab
    const titles = {
        my_requests: { title: 'Kendi Taleplerim', subtitle: 'Tüm izin, mesai ve diğer taleplerinizi tek yerden yönetin. Yeni talep oluşturmak için "Yeni Talep" butonunu kullanın.' },
        incoming_requests: { title: 'Gelen Talepler', subtitle: 'Ekibinizden gelen talepleri inceleyin, onaylayın veya reddedin. Önceki kararları değiştirmek için "Değiştir" butonunu kullanabilirsiniz.' },
        overtime_requests: { title: 'Ek Mesai Talepleri', subtitle: 'Ek mesai takvimini görüntüleyin, manuel talep oluşturun veya yöneticiyseniz ekibinize mesai atayın.' },
        analytics: { title: 'Talep Analizi', subtitle: 'Talep istatistiklerinizi ve ekip performansını grafiklerle inceleyin.' },
    };
    const { title, subtitle } = titles[activeTab] || titles.my_requests;

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                    <p className="text-slate-500 font-medium">{subtitle}</p>
                </div>
                {/* Global Search */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Tüm taleplerde ara..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                    />
                    {searchText && (
                        <button
                            onClick={() => setSearchText('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
                <TabButton
                    active={activeTab === 'my_requests'}
                    onClick={() => handleTabChange('my_requests')}
                    icon={<Layers size={18} />}
                >
                    Kendi Taleplerim
                </TabButton>

                {(isManager || teamCountsLoading) && (
                    <TabButton
                        active={activeTab === 'incoming_requests'}
                        onClick={() => handleTabChange('incoming_requests')}
                        icon={<ArrowDownLeft size={18} />}
                        badge={incomingPendingCount}
                    >
                        Gelen Talepler
                    </TabButton>
                )}

                <TabButton
                    active={activeTab === 'overtime_requests'}
                    onClick={() => handleTabChange('overtime_requests')}
                    icon={<CalendarCheck size={18} />}
                >
                    Ek Mesai
                </TabButton>

                <TabButton
                    active={activeTab === 'analytics'}
                    onClick={() => handleTabChange('analytics')}
                    icon={<BarChart3 size={18} />}
                >
                    Analiz
                </TabButton>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                <div style={{ display: activeTab === 'my_requests' ? 'block' : 'none' }}>
                    {mountedTabs.my_requests && (
                        <MyRequestsTab
                            onDataChange={handleDataChange}
                            refreshTrigger={refreshTrigger}
                            searchText={searchText}
                        />
                    )}
                </div>

                {(isManager || teamCountsLoading) && (
                    <div style={{ display: activeTab === 'incoming_requests' ? 'block' : 'none' }}>
                        {mountedTabs.incoming_requests && (
                            <IncomingRequestsTab
                                onPendingCountChange={handlePendingCountChange}
                                onDataChange={handleDataChange}
                                refreshTrigger={refreshTrigger}
                                primaryCount={primaryCount}
                                secondaryCount={secondaryCount}
                                parentSearchText={searchText}
                                sharedPrimarySubordinates={primarySubordinates}
                                sharedSecondarySubordinates={secondarySubordinates}
                            />
                        )}
                    </div>
                )}

                <div style={{ display: activeTab === 'overtime_requests' ? 'block' : 'none' }}>
                    {mountedTabs.overtime_requests && (
                        <OvertimeRequestsTab
                            onDataChange={handleDataChange}
                            refreshTrigger={refreshTrigger}
                            primaryCount={primaryCount}
                            secondaryCount={secondaryCount}
                            teamCountsLoading={teamCountsLoading}
                            searchText={searchText}
                            sharedPrimarySubordinates={primarySubordinates}
                            sharedSecondarySubordinates={secondarySubordinates}
                        />
                    )}
                </div>

                <div style={{ display: activeTab === 'analytics' ? 'block' : 'none' }}>
                    {mountedTabs.analytics && (
                        <AnalyticsTab
                            refreshTrigger={refreshTrigger}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Requests;
