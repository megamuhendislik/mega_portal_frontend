import React, { useState } from 'react';
import {
    ShieldCheckIcon,
    KeyIcon,
    IdentificationIcon,
    UserGroupIcon,
    ArrowsRightLeftIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

import SecurityAuditTab from './SecurityAuditTab';
import RBACAuditTab from './RBACAuditTab';
import PermissionAnalysisTab from './PermissionAnalysisTab';
import PermissionsTab from './PermissionsTab';
import ManagerPermissionTab from './ManagerPermissionTab';
import ManagerCheckTab from './ManagerCheckTab';
import SecondaryManagerCheckerTab from './SecondaryManagerCheckerTab';
import SubstituteAuditTab from './SubstituteAuditTab';

const SUB_TABS = [
    { id: 'security', name: 'Güvenlik Denetimi', icon: ShieldCheckIcon, Component: SecurityAuditTab,
      desc: '98 SEC-XX otomatik güvenlik senaryosu + cleanup' },
    { id: 'rbac', name: 'RBAC Uyumluluk', icon: ClipboardDocumentCheckIcon, Component: RBACAuditTab,
      desc: '7 bölümlü RBAC denetimi (rol-permission tutarlılık, bypass, skor)' },
    { id: 'analysis', name: 'Yetki Sistemi Analizi', icon: KeyIcon, Component: PermissionAnalysisTab,
      desc: 'Tüm RBAC dump (kullanıcı × rol × permission) + TXT export + bypass hierarchy' },
    { id: 'check', name: 'Yetki Kontrolü', icon: KeyIcon, Component: PermissionsTab,
      desc: 'Permission/Role health check + yetki matrisi' },
    { id: 'mgr_perm', name: 'Yönetici Yetki Testi', icon: ShieldCheckIcon, Component: ManagerPermissionTab,
      desc: '15 MGR-XX senaryosu (PRIMARY onay, SECONDARY engel, hiyerarşi, devir)' },
    { id: 'mgr_check', name: 'Yönetici Check', icon: IdentificationIcon, Component: ManagerCheckTab,
      desc: 'Çalışan başına PRIMARY/SECONDARY/CROSS yönetici durumu (PRIMARY yok tespiti)' },
    { id: 'secondary', name: 'İkincil Yönetici', icon: UserGroupIcon, Component: SecondaryManagerCheckerTab,
      desc: 'BOARD auto-SECONDARY yönetici atama matrisi + dry-run/cleanup' },
    { id: 'substitute', name: 'Vekalet Denetimi', icon: ArrowsRightLeftIcon, Component: SubstituteAuditTab,
      desc: 'Vekalet/delegation 7 kategori denetimi (orphan/expired/overlap/circular)' },
];

export default function RBACHubTab() {
    const [active, setActive] = useState('security');
    const meta = SUB_TABS.find(t => t.id === active) || SUB_TABS[0];
    const Comp = meta.Component;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                        <ShieldCheckIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">RBAC & Yetki Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            Güvenlik, RBAC, yetki, yönetici ve vekalet denetimi — tek panelde.
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
                                    Active ? 'bg-emerald-600 text-white'
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
