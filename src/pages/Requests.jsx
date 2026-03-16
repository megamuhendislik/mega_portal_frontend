import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Layers, ArrowDownLeft, CalendarCheck, BarChart3
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

    // Manager detection — PRIMARY / SECONDARY counts
    const [primaryCount, setPrimaryCount] = useState(0);
    const [secondaryCount, setSecondaryCount] = useState(0);
    const [teamCountsLoading, setTeamCountsLoading] = useState(true);
    const hasAnyTeam = primaryCount > 0 || secondaryCount > 0;
    // APPROVAL_* tüm rollere verildiği için yönetici tespitinde kullanılmaz;
    // gerçek yönetici = subordinate'i olan kişi
    const isManager = hasAnyTeam;

    // Badge for incoming tab
    const [incomingPendingCount, setIncomingPendingCount] = useState(0);

    useEffect(() => {
        const fetchTeamCounts = async () => {
            try {
                const [priRes, secRes] = await Promise.allSettled([
                    api.get('/employees/subordinates/', { params: { relationship_type: 'PRIMARY', count_only: 'true' } }),
                    api.get('/employees/subordinates/', { params: { relationship_type: 'SECONDARY', count_only: 'true' } }),
                ]);
                if (priRes.status === 'fulfilled') {
                    const d = priRes.value.data;
                    setPrimaryCount(d.count != null ? d.count : (Array.isArray(d) ? d : d.results || []).length);
                }
                if (secRes.status === 'fulfilled') {
                    const d = secRes.value.data;
                    setSecondaryCount(d.count != null ? d.count : (Array.isArray(d) ? d : d.results || []).length);
                }
            } catch { /* not manager */ }
            setTeamCountsLoading(false);
        };
        fetchTeamCounts();
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
