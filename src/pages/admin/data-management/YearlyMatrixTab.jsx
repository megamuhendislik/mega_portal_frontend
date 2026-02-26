import React, { useState, useEffect, useMemo } from 'react';
import { Input, Button, Spin, Empty, message } from 'antd';
import {
    LeftOutlined,
    RightOutlined,
    CalendarOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';
import SettlementModal from './SettlementModal';

const MONTH_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_NAMES_SHORT = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

// ── Helpers ──────────────────────────────────────────────────────
const formatHours = (sec) => {
    if (!sec || sec < 60) return '-';
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    if (h === 0) return `${m} dk`;
    if (m === 0) return `${h} saat`;
    return `${h}s ${m}dk`;
};

// ── Component ────────────────────────────────────────────────────
export default function YearlyMatrixTab({ onNavigateToPersonel }) {
    // ── State ────────────────────────────────────────────────────
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    const [listYear, setListYear] = useState(new Date().getFullYear());
    const [bulkStats, setBulkStats] = useState({});
    const [loadingStats, setLoadingStats] = useState(false);

    const [settlementData, setSettlementData] = useState(null);

    // ── Filtered list ────────────────────────────────────────────
    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return employees;
        const lower = searchTerm.toLowerCase();
        return employees.filter(
            (e) =>
                e.first_name.toLowerCase().includes(lower) ||
                e.last_name.toLowerCase().includes(lower) ||
                (e.employee_code && e.employee_code.toLowerCase().includes(lower))
        );
    }, [searchTerm, employees]);

    // ── Data fetching ────────────────────────────────────────────
    useEffect(() => {
        setLoadingEmployees(true);
        api.get('/employees/?page_size=1000')
            .then((res) => {
                const data = res.data.results || res.data;
                setEmployees(data);
            })
            .catch(() => message.error('Personel listesi yüklenemedi.'))
            .finally(() => setLoadingEmployees(false));
    }, []);

    useEffect(() => {
        fetchBulkStats();
    }, [listYear]);

    const fetchBulkStats = () => {
        setLoadingStats(true);
        api.get('/system-data/get_bulk_yearly_stats/', { params: { year: listYear } })
            .then((res) => setBulkStats(res.data))
            .catch(() => message.error('İstatistik verisi yüklenemedi.'))
            .finally(() => setLoadingStats(false));
    };

    // ── Settlement ───────────────────────────────────────────────
    const openSettlement = (employee, month, stat) => {
        const balance =
            stat.balance !== undefined ? stat.balance : stat.ot - stat.missing;
        setSettlementData({
            isOpen: true,
            employee,
            year: listYear,
            month,
            netBalance: balance,
        });
    };

    // ── Calendar navigation ──────────────────────────────────────
    const handleCalendarClick = (emp) => {
        if (onNavigateToPersonel) {
            onNavigateToPersonel(emp);
        } else {
            console.log('onNavigateToPersonel not provided, selected:', emp.id);
        }
    };

    // ── Render ───────────────────────────────────────────────────
    return (
        <div className="animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-3 md:p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-3">
                    <h2 className="font-bold text-slate-700">Yıllık Personel Özeti</h2>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full md:w-auto">
                        {/* Year selector */}
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                            <Button
                                type="text"
                                size="small"
                                icon={<LeftOutlined />}
                                onClick={() => setListYear((y) => y - 1)}
                            />
                            <span className="text-lg font-bold text-slate-800 min-w-[100px] text-center select-none">
                                {listYear}
                            </span>
                            <Button
                                type="text"
                                size="small"
                                icon={<RightOutlined />}
                                onClick={() => setListYear((y) => y + 1)}
                            />
                        </div>

                        {/* Search */}
                        <Input
                            prefix={<SearchOutlined className="text-slate-400" />}
                            placeholder="Ara..."
                            allowClear
                            className="w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                {loadingEmployees || loadingStats ? (
                    <div className="flex items-center justify-center py-20">
                        <Spin size="large" tip="Yükleniyor..." />
                    </div>
                ) : (
                    <div className="max-h-[400px] md:max-h-[700px] overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-20 text-xs uppercase text-slate-500 font-bold tracking-wider shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 border-b bg-slate-50/95 sticky left-0 z-30 min-w-[200px]">
                                        Personel
                                    </th>
                                    {MONTH_NAMES_SHORT.map((m, i) => (
                                        <th
                                            key={m}
                                            className={`px-2 py-3 text-center border-b min-w-[90px] ${
                                                i % 2 === 0 ? 'bg-slate-50/95' : 'bg-white/95'
                                            }`}
                                        >
                                            {m}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 border-b text-right min-w-[80px]">
                                        İşlem
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredEmployees.map((emp) => {
                                    const empStats = bulkStats[emp.id] || {};
                                    return (
                                        <tr
                                            key={emp.id}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            {/* Employee name cell (sticky) */}
                                            <td className="px-4 py-3 bg-white group-hover:bg-blue-50/30 border-r border-slate-100 sticky left-0 z-10 w-[200px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {emp.first_name?.[0]}
                                                        {emp.last_name?.[0]}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="font-medium text-slate-900 text-sm">
                                                            {emp.first_name} {emp.last_name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500">
                                                            {emp.department_name || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Month cells */}
                                            {MONTH_COLS.map((m) => {
                                                const stat = empStats[m] || {};
                                                const hasOt = stat.ot > 300;
                                                const hasMissing = stat.missing > 300;
                                                const isEmpty = !hasOt && !hasMissing;

                                                return (
                                                    <td
                                                        key={m}
                                                        className={`px-1 py-2 text-center border-r border-slate-50 text-xs ${
                                                            m % 2 === 0 ? 'bg-slate-50/30' : ''
                                                        }`}
                                                    >
                                                        {isEmpty ? (
                                                            <span className="text-slate-200">-</span>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                {hasOt && (
                                                                    <span className="text-amber-700 bg-amber-50 px-1.5 rounded font-bold whitespace-nowrap">
                                                                        +{formatHours(stat.ot)}
                                                                    </span>
                                                                )}
                                                                {hasMissing && (
                                                                    <span className="text-red-700 bg-red-50 px-1.5 rounded font-bold whitespace-nowrap">
                                                                        -{formatHours(stat.missing)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Settlement trigger on hover */}
                                                        {!isEmpty && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openSettlement(emp, m, stat);
                                                                }}
                                                                className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 rounded"
                                                                title="Mahsuplaş / Sıfırla"
                                                            >
                                                                Sıfırla
                                                            </button>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Action cell */}
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CalendarOutlined />}
                                                    onClick={() => handleCalendarClick(emp)}
                                                    title="Takvimi Aç"
                                                    className="text-slate-400 hover:!text-blue-600"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredEmployees.length === 0 && (
                            <div className="py-12">
                                <Empty description="Sonuç bulunamadı." />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Settlement Modal */}
            <SettlementModal
                isOpen={settlementData?.isOpen}
                onClose={() => setSettlementData(null)}
                data={settlementData}
                onSaveSuccess={fetchBulkStats}
            />
        </div>
    );
}
