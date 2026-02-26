import React, { useState, useRef } from 'react';
import { Tabs, ConfigProvider } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { Database, Users, Layers, BarChart3, HardDrive } from 'lucide-react';
import PersonelTab from './data-management/PersonelTab';
import BulkOperationsTab from './data-management/BulkOperationsTab';
import YearlyMatrixTab from './data-management/YearlyMatrixTab';
import BackupTab from './data-management/BackupTab';

export default function DataManagement() {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('personel');
    const [navigateEmployee, setNavigateEmployee] = useState(null);

    if (!hasPermission('PAGE_DATA_MANAGEMENT') && !hasPermission('SYSTEM_FULL_ACCESS')) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <h2 className="text-xl font-bold text-red-500 mb-2">Erişim Reddedildi</h2>
                <p className="text-slate-600">Bu sayfayı görüntülemek için yeterli yetkiniz bulunmamaktadır.</p>
            </div>
        );
    }

    const handleNavigateToPersonel = (employee) => {
        setNavigateEmployee(employee);
        setActiveTab('personel');
    };

    const tabItems = [
        {
            key: 'personel',
            label: (
                <span className="flex items-center gap-2 px-1">
                    <Users size={16} />
                    Personel Verileri
                </span>
            ),
            children: (
                <PersonelTab
                    initialEmployee={navigateEmployee}
                />
            ),
        },
        {
            key: 'bulk',
            label: (
                <span className="flex items-center gap-2 px-1">
                    <Layers size={16} />
                    Toplu İşlemler
                </span>
            ),
            children: <BulkOperationsTab />,
        },
        {
            key: 'matrix',
            label: (
                <span className="flex items-center gap-2 px-1">
                    <BarChart3 size={16} />
                    Yıllık Matris
                </span>
            ),
            children: (
                <YearlyMatrixTab
                    onNavigateToPersonel={handleNavigateToPersonel}
                />
            ),
        },
        {
            key: 'backup',
            label: (
                <span className="flex items-center gap-2 px-1">
                    <HardDrive size={16} />
                    Yedekleme
                </span>
            ),
            children: <BackupTab />,
        },
    ];

    return (
        <div className="p-3 md:p-6 max-w-[1800px] mx-auto min-h-screen">
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Database className="text-blue-600" size={24} />
                    </div>
                    Sistem Veri Yönetimi
                </h1>
                <p className="text-sm text-slate-500 mt-1 ml-12">
                    Personel verilerini görüntüleyin, düzenleyin ve yönetin
                </p>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
                destroyInactiveTabPane={false}
                className="data-management-tabs"
            />
        </div>
    );
}
