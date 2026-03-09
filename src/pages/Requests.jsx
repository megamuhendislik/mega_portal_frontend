import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Layers, ArrowDownLeft, CalendarCheck, BarChart3
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
    const { hasPermission } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = TAB_ALIASES[searchParams.get('tab')] || 'my_requests';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Manager detection
    const [subordinates, setSubordinates] = useState([]);
    const isManager = hasPermission('APPROVAL_LEAVE') || hasPermission('APPROVAL_OVERTIME') || subordinates.length > 0;

    // Badge for incoming tab
    const [incomingPendingCount, setIncomingPendingCount] = useState(0);

    useEffect(() => {
        const fetchSubordinates = async () => {
            try {
                const res = await api.get('/employees/subordinates/');
                setSubordinates(Array.isArray(res.data) ? res.data : res.data.results || []);
            } catch (e) { /* not manager */ }
        };
        fetchSubordinates();
    }, []);

    // Sync tab changes to URL
    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
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
        my_requests: { title: 'Kendi Taleplerim', subtitle: 'Tüm izin, mesai ve diğer taleplerinizi tek yerden yönetin.' },
        incoming_requests: { title: 'Gelen Talepler', subtitle: 'Ekibinizden gelen talepleri onaylayın veya reddedin.' },
        overtime_requests: { title: 'Ek Mesai Talepleri', subtitle: 'Ek mesai oluşturun, talep edin veya ekibinize atayın.' },
        analytics: { title: 'Talep Analizi', subtitle: 'Talep istatistiklerinizi ve ekip performansını inceleyin.' },
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

                {isManager && (
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
                {activeTab === 'my_requests' && (
                    <MyRequestsTab
                        onDataChange={handleDataChange}
                        refreshTrigger={refreshTrigger}
                    />
                )}
                {activeTab === 'incoming_requests' && isManager && (
                    <IncomingRequestsTab
                        onPendingCountChange={handlePendingCountChange}
                        onDataChange={handleDataChange}
                        refreshTrigger={refreshTrigger}
                    />
                )}
                {activeTab === 'overtime_requests' && (
                    <OvertimeRequestsTab
                        onDataChange={handleDataChange}
                        refreshTrigger={refreshTrigger}
                    />
                )}
                {activeTab === 'analytics' && (
                    <AnalyticsTab
                        refreshTrigger={refreshTrigger}
                    />
                )}
            </div>
        </div>
    );
};

export default Requests;
