import React, { useState, Suspense } from 'react';
import { BarChart3, Users } from 'lucide-react';

const PersonalRequestAnalytics = React.lazy(() => import('./PersonalRequestAnalytics'));
const TeamRequestAnalytics = React.lazy(() => import('./TeamRequestAnalytics'));

export default function RequestAnalyticsPage() {
    const [tab, setTab] = useState('personal');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Talep Analizleri</h1>
                    <p className="text-sm text-slate-500 mt-1">Talep istatistikleri ve trend analizleri</p>
                </div>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setTab('personal')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                            tab === 'personal' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                        }`}
                    >
                        <BarChart3 size={16} /> Kisisel
                    </button>
                    <button
                        onClick={() => setTab('team')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                            tab === 'team' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                        }`}
                    >
                        <Users size={16} /> Ekip
                    </button>
                </div>
            </div>
            <Suspense fallback={
                <div className="bg-white rounded-2xl p-6 animate-pulse">
                    <div className="h-60 bg-slate-100 rounded-xl" />
                </div>
            }>
                {tab === 'personal' && <PersonalRequestAnalytics />}
                {tab === 'team' && <TeamRequestAnalytics />}
            </Suspense>
        </div>
    );
}
