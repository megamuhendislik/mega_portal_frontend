import React, { useState } from 'react';
import {
    ServerStackIcon,
    BugAntIcon,
    ChartBarIcon,
    CommandLineIcon,
    ClipboardDocumentCheckIcon,
    SparklesIcon,
    BuildingOfficeIcon,
    ExclamationTriangleIcon,
    UsersIcon,
    CakeIcon,
    WalletIcon,
    BanknotesIcon,
} from '@heroicons/react/24/outline';

import ServiceHealthTab from './ServiceHealthTab';
import ErrorLogsTab from './ErrorLogsTab';
import ResourceMonitor from '../../../components/ResourceMonitor';
import OrgAuditTab from './OrgAuditTab';
import DataBrowserTab from './DataBrowserTab';
import BirthdayTab from './BirthdayTab';
import PasswordResetTab from './PasswordResetTab';
import BalanceHealthTab from './BalanceHealthTab';
import AdvanceLeaveManagementTab from './AdvanceLeaveManagementTab';

const SUB_TABS = [
    { id: 'service', name: 'Servis Sağlığı', icon: ServerStackIcon, Component: ServiceHealthTab,
      desc: 'Servis kullanıcılarının (uses_service=True) tolerans/kart sağlığı kontrolü' },
    { id: 'errors', name: 'Hata Logları', icon: BugAntIcon, Component: ErrorLogsTab,
      desc: 'Backend ErrorLog kayıtları (list, filter, bulk_update, cleanup)' },
    { id: 'resources', name: 'Kaynak Kullanımı', icon: ChartBarIcon, Component: ResourceMonitor,
      desc: 'CPU/RAM 5sn polling (psutil)' },
    { id: 'browser', name: 'Veri Tarayıcı', icon: ClipboardDocumentCheckIcon, Component: DataBrowserTab,
      desc: 'Test/junk veri tarama (prefix match, future-dated, suspicious) + toplu silme' },
    { id: 'org', name: 'Org Röntgen', icon: BuildingOfficeIcon, Component: OrgAuditTab,
      desc: 'Departman/pozisyon/role org-yapısı denetimi + duplicate sil + enforce' },
    { id: 'password', name: 'Şifre Sıfırlama', icon: UsersIcon, Component: PasswordResetTab,
      desc: 'Çift onaylı toplu şifre sıfırlama → XLSX indir' },
    { id: 'birthdays', name: 'Doğum Günleri', icon: CakeIcon, Component: BirthdayTab,
      desc: 'Aylık doğum günü listesi + yıllık istatistik + manuel bildirim' },
    { id: 'balance', name: 'Bakiye Sağlığı', icon: WalletIcon, Component: BalanceHealthTab,
      desc: 'İzin bakiye sayaçları (mazeret/yıllık/avans) drift denetimi + Düzelt + avans izin tanımlama' },
    { id: 'advance', name: 'Avans İzin Yönetimi', icon: BanknotesIcon, Component: AdvanceLeaveManagementTab,
      desc: 'Son 12 ayda işe başlamış çalışanlara toplu avans izin tanımlama (önizleme + geri al)' },
];

// Aşağıdaki 3 tab burada (deferred — kullanıcı talebine göre eklendi):
// - synthetic (SyntheticDataTab inline'da)
// - stress_test (StressTestTab inline'da)
// - system_reset (SystemResetTab inline'da)
// Bu inline'lar SystemHealth.jsx'te. Hub'a katmak için ya inline'ları
// ayrı dosyaya çıkarmak ya da Hub'ı SystemHealth.jsx içinde tanımlamak gerek.
// Şimdilik bunları sidebar'da tutmaya devam ediyoruz; ileride hub'a alınabilir.

export default function SystemMaintenanceHubTab() {
    const [active, setActive] = useState('service');
    const meta = SUB_TABS.find(t => t.id === active) || SUB_TABS[0];
    const Comp = meta.Component;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        <ServerStackIcon className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Sistem & Bakım Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            Servis sağlığı, hata logları, kaynak, veri tarayıcı, org röntgen ve bakım araçları.
                        </p>
                    </div>
                </div>

                <nav className="flex flex-wrap gap-1.5 mt-3">
                    {SUB_TABS.map(t => {
                        const Active = active === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActive(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                                    Active ? 'bg-slate-600 text-white'
                                           : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.name}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-2 text-[11px] text-gray-500 italic">{meta.desc}</div>
            </div>

            <Comp />
        </div>
    );
}
