import React, { useState } from 'react';
import {
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    PlayIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    SunIcon,
    PauseCircleIcon,
    AdjustmentsHorizontalIcon,
    ChartBarSquareIcon,
    BanknotesIcon,
    CpuChipIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// ─── Status Helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    if (status === 'PASS' || status === 'pass') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                <CheckCircleIcon className="w-3.5 h-3.5" /> Basarili
            </span>
        );
    }
    if (status === 'FAIL' || status === 'fail') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                <XCircleIcon className="w-3.5 h-3.5" /> Basarisiz
            </span>
        );
    }
    if (status === 'WARNING' || status === 'warning') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Uyari
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            {status}
        </span>
    );
}

function SectionStatusIcon({ passed, failed, warnings }) {
    if (failed > 0) return <XCircleIcon className="w-6 h-6 text-red-500" />;
    if (warnings > 0) return <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />;
    return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
}

function CountBadge({ count, color }) {
    const colors = {
        green: 'bg-green-100 text-green-800 border-green-200',
        red: 'bg-red-100 text-red-800 border-red-200',
        amber: 'bg-amber-100 text-amber-800 border-amber-200',
        gray: 'bg-gray-100 text-gray-600 border-gray-200',
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${colors[color] || colors.gray}`}>
            {count}
        </span>
    );
}

// ─── Score Circle ──────────────────────────────────────────────────────────────

function ScoreCircle({ percentage }) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const color = percentage >= 95 ? '#22c55e' : percentage >= 80 ? '#eab308' : '#ef4444';

    return (
        <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                    cx="60" cy="60" r={radius} fill="none"
                    stroke={color} strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color }}>%{percentage}</span>
                <span className="text-xs text-gray-400 font-medium">Uyumluluk</span>
            </div>
        </div>
    );
}

// ─── Collapsible Section ───────────────────────────────────────────────────────

function CollapsibleSection({ id, title, icon: Icon, passed, failed, warnings, total, expanded, onToggle, children }) {
    const isOpen = expanded;

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 overflow-hidden transition-all duration-200">
            <button
                onClick={() => onToggle(id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <SectionStatusIcon passed={passed} failed={failed} warnings={warnings} />
                    {Icon && <Icon className="w-5 h-5 text-indigo-500" />}
                    <h3 className="text-base font-bold text-gray-800">{title}</h3>
                </div>
                <div className="flex items-center gap-3">
                    {passed > 0 && <CountBadge count={`${passed} basarili`} color="green" />}
                    {failed > 0 && <CountBadge count={`${failed} basarisiz`} color="red" />}
                    {warnings > 0 && <CountBadge count={`${warnings} uyari`} color="amber" />}
                    {total > 0 && <span className="text-xs text-gray-400 ml-1">{total} kontrol</span>}
                    {isOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                </div>
            </button>
            {isOpen && (
                <div className="px-6 pb-5 border-t border-gray-100 pt-4 animate-in fade-in duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Section 1: Takvim Sistemi (calendar_system) ──────────────────────────────

function CalendarSystemSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Takvim sistemi verisi bulunamadi.</p>;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            {(data.total_employees !== undefined || data.with_calendar !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.total_employees !== undefined && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <div className="text-2xl font-bold text-blue-700">{data.total_employees}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1">Toplam Calisan</div>
                        </div>
                    )}
                    {data.with_calendar !== undefined && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">{data.with_calendar}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">Takvimi Olan</div>
                        </div>
                    )}
                    {data.without_calendar !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.without_calendar > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <div className={`text-2xl font-bold ${data.without_calendar > 0 ? 'text-red-700' : 'text-green-700'}`}>{data.without_calendar}</div>
                            <div className={`text-xs font-medium mt-1 ${data.without_calendar > 0 ? 'text-red-600' : 'text-green-600'}`}>Takvimsiz</div>
                        </div>
                    )}
                    {data.template_count !== undefined && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                            <div className="text-2xl font-bold text-indigo-700">{data.template_count}</div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">Sablon Sayisi</div>
                        </div>
                    )}
                </div>
            )}

            {/* Employees without calendar */}
            {data.employees_without_calendar && data.employees_without_calendar.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                        <XCircleIcon className="w-4 h-4" /> Takvimi Olmayan Calisanlar ({data.employees_without_calendar.length})
                    </h4>
                    <div className="overflow-x-auto border border-red-100 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-red-50 text-red-700 font-semibold border-b border-red-100">
                                <tr>
                                    <th className="px-4 py-2">Personel Kodu</th>
                                    <th className="px-4 py-2">Ad Soyad</th>
                                    <th className="px-4 py-2">Departman</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-50">
                                {data.employees_without_calendar.map((emp, i) => (
                                    <tr key={emp.id || i} className="hover:bg-red-50/50">
                                        <td className="px-4 py-2 font-mono text-xs">{emp.employee_code || '-'}</td>
                                        <td className="px-4 py-2 text-gray-800">{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</td>
                                        <td className="px-4 py-2 text-gray-500 text-xs">{emp.department || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Items list */}
            {data.items && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Kontrol</th>
                                <th className="px-4 py-3">Detay</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items.map((item, i) => (
                                <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 text-gray-800 text-sm">{item.check || item.label}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* All good */}
            {(!data.employees_without_calendar || data.employees_without_calendar.length === 0) &&
             (!data.items || data.items.length === 0) &&
             data.without_calendar === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tum calisanlarin mali takvimleri tanimli.
                </div>
            )}
        </div>
    );
}

// ─── Section 2: Ogle Arasi (lunch_break) ──────────────────────────────────────

function LunchBreakSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Ogle arasi verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            {(data.templates_with_lunch !== undefined || data.templates_without_lunch !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.total_templates !== undefined && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <div className="text-2xl font-bold text-blue-700">{data.total_templates}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1">Toplam Sablon</div>
                        </div>
                    )}
                    {data.templates_with_lunch !== undefined && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">{data.templates_with_lunch}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">Ogle Arasi Tanimli</div>
                        </div>
                    )}
                    {data.templates_without_lunch !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.templates_without_lunch > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                            <div className={`text-2xl font-bold ${data.templates_without_lunch > 0 ? 'text-amber-700' : 'text-green-700'}`}>{data.templates_without_lunch}</div>
                            <div className={`text-xs font-medium mt-1 ${data.templates_without_lunch > 0 ? 'text-amber-600' : 'text-green-600'}`}>Tanimsiz</div>
                        </div>
                    )}
                </div>
            )}

            {/* Items */}
            {data.items && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Kontrol</th>
                                <th className="px-4 py-3">Detay</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items.map((item, i) => (
                                <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 text-gray-800 text-sm">{item.check || item.label || item.template_name || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || item.lunch_config || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(!data.items || data.items.length === 0) && data.templates_without_lunch === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tum sablonlarin ogle arasi yapilandirmasi tanimli.
                </div>
            )}
        </div>
    );
}

// ─── Section 3: Mola Haklari (break_allowance) ───────────────────────────────

function BreakAllowanceSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Mola haklari verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Summary */}
            {(data.templates_with_break !== undefined || data.templates_without_break !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.total_templates !== undefined && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <div className="text-2xl font-bold text-blue-700">{data.total_templates}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1">Toplam Sablon</div>
                        </div>
                    )}
                    {data.templates_with_break !== undefined && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">{data.templates_with_break}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">Mola Hakki Tanimli</div>
                        </div>
                    )}
                    {data.templates_without_break !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.templates_without_break > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                            <div className={`text-2xl font-bold ${data.templates_without_break > 0 ? 'text-amber-700' : 'text-green-700'}`}>{data.templates_without_break}</div>
                            <div className={`text-xs font-medium mt-1 ${data.templates_without_break > 0 ? 'text-amber-600' : 'text-green-600'}`}>Tanimsiz</div>
                        </div>
                    )}
                </div>
            )}

            {/* Items */}
            {data.items && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Kontrol</th>
                                <th className="px-4 py-3">Detay</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items.map((item, i) => (
                                <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 text-gray-800 text-sm">{item.check || item.label || item.template_name || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || item.break_config || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(!data.items || data.items.length === 0) && data.templates_without_break === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tum sablonlarin mola hakki yapilandirmasi tanimli.
                </div>
            )}
        </div>
    );
}

// ─── Section 4: Tolerans Ayarlari (tolerance) ─────────────────────────────────

function ToleranceSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Tolerans ayarlari verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Summary */}
            {(data.employees_using_service !== undefined || data.late_tolerance_set !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.late_tolerance_set !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.late_tolerance_set ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                            <div className="flex items-center justify-center gap-2">
                                {data.late_tolerance_set ? (
                                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                ) : (
                                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                )}
                                <div className={`text-sm font-bold ${data.late_tolerance_set ? 'text-green-700' : 'text-amber-700'}`}>
                                    Gec Kalma Toleransi
                                </div>
                            </div>
                            <div className={`text-xs mt-1 ${data.late_tolerance_set ? 'text-green-600' : 'text-amber-600'}`}>
                                {data.late_tolerance_set ? 'Tanimli' : 'Tanimsiz'}
                            </div>
                        </div>
                    )}
                    {data.service_tolerance_set !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.service_tolerance_set ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                            <div className="flex items-center justify-center gap-2">
                                {data.service_tolerance_set ? (
                                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                ) : (
                                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                )}
                                <div className={`text-sm font-bold ${data.service_tolerance_set ? 'text-green-700' : 'text-amber-700'}`}>
                                    Servis Toleransi
                                </div>
                            </div>
                            <div className={`text-xs mt-1 ${data.service_tolerance_set ? 'text-green-600' : 'text-amber-600'}`}>
                                {data.service_tolerance_set ? 'Tanimli' : 'Tanimsiz'}
                            </div>
                        </div>
                    )}
                    {data.employees_using_service !== undefined && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                            <div className="text-2xl font-bold text-indigo-700">{data.employees_using_service}</div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">Servis Kullanan</div>
                        </div>
                    )}
                </div>
            )}

            {/* Items */}
            {data.items && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Kontrol</th>
                                <th className="px-4 py-3">Detay</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items.map((item, i) => (
                                <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 text-gray-800 text-sm">{item.check || item.label}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(!data.items || data.items.length === 0) && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tolerans ayarlari kontrolleri basarili.
                </div>
            )}
        </div>
    );
}

// ─── Section 5: Aylik Hedefler (monthly_targets) ──────────────────────────────

function MonthlyTargetsSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Aylik hedef verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Summary */}
            {(data.total_employees !== undefined || data.with_target !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.total_employees !== undefined && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <div className="text-2xl font-bold text-blue-700">{data.total_employees}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1">Toplam Calisan</div>
                        </div>
                    )}
                    {data.with_target !== undefined && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">{data.with_target}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">Hedefi Olan</div>
                        </div>
                    )}
                    {data.without_target !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.without_target > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <div className={`text-2xl font-bold ${data.without_target > 0 ? 'text-red-700' : 'text-green-700'}`}>{data.without_target}</div>
                            <div className={`text-xs font-medium mt-1 ${data.without_target > 0 ? 'text-red-600' : 'text-green-600'}`}>Hedefi Olmayan</div>
                        </div>
                    )}
                    {data.current_month !== undefined && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                            <div className="text-lg font-bold text-indigo-700">{data.current_month}</div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">Mevcut Donem</div>
                        </div>
                    )}
                </div>
            )}

            {/* Items */}
            {data.items && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Kontrol</th>
                                <th className="px-4 py-3">Detay</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items.map((item, i) => (
                                <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 text-gray-800 text-sm">{item.check || item.label}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Employees without targets */}
            {data.employees_without_target && data.employees_without_target.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                        <XCircleIcon className="w-4 h-4" /> Hedefi Olmayan Calisanlar ({data.employees_without_target.length})
                    </h4>
                    <div className="overflow-x-auto border border-red-100 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-red-50 text-red-700 font-semibold border-b border-red-100">
                                <tr>
                                    <th className="px-4 py-2">Personel Kodu</th>
                                    <th className="px-4 py-2">Ad Soyad</th>
                                    <th className="px-4 py-2">Departman</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-50">
                                {data.employees_without_target.map((emp, i) => (
                                    <tr key={emp.id || i} className="hover:bg-red-50/50">
                                        <td className="px-4 py-2 font-mono text-xs">{emp.employee_code || '-'}</td>
                                        <td className="px-4 py-2 text-gray-800">{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</td>
                                        <td className="px-4 py-2 text-gray-500 text-xs">{emp.department || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(!data.items || data.items.length === 0) &&
             (!data.employees_without_target || data.employees_without_target.length === 0) &&
             data.without_target === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tum calisanlarin aylik hedefleri tanimli.
                </div>
            )}
        </div>
    );
}

// ─── Section 6: Mali Donemler (fiscal_periods) ───────────────────────────────

function FiscalPeriodsSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Mali donem verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Summary */}
            {(data.total_periods !== undefined || data.locked_periods !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.total_periods !== undefined && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <div className="text-2xl font-bold text-blue-700">{data.total_periods}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1">Toplam Donem</div>
                        </div>
                    )}
                    {data.locked_periods !== undefined && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                            <div className="text-2xl font-bold text-indigo-700">{data.locked_periods}</div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">Kilitli Donem</div>
                        </div>
                    )}
                    {data.unlocked_periods !== undefined && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">{data.unlocked_periods}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">Acik Donem</div>
                        </div>
                    )}
                    {data.has_gap !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.has_gap ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <div className="flex items-center justify-center gap-2">
                                {data.has_gap ? (
                                    <XCircleIcon className="w-6 h-6 text-red-600" />
                                ) : (
                                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                )}
                                <div className={`text-sm font-bold ${data.has_gap ? 'text-red-700' : 'text-green-700'}`}>
                                    Sureklilik
                                </div>
                            </div>
                            <div className={`text-xs mt-1 ${data.has_gap ? 'text-red-600' : 'text-green-600'}`}>
                                {data.has_gap ? 'Bosluk Var' : 'Sorunsuz'}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Items */}
            {data.items && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Kontrol</th>
                                <th className="px-4 py-3">Detay</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items.map((item, i) => (
                                <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 text-gray-800 text-sm">{item.check || item.label}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(!data.items || data.items.length === 0) && !data.has_gap && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Mali donem surekliligi ve kilit durumu sorunsuz.
                </div>
            )}
        </div>
    );
}

// ─── Section 7: Celery Gorevleri (celery_tasks) ──────────────────────────────

function CeleryTasksSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Celery gorev verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Summary */}
            {(data.total_tasks !== undefined || data.healthy_tasks !== undefined) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.total_tasks !== undefined && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <div className="text-2xl font-bold text-blue-700">{data.total_tasks}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1">Toplam Gorev</div>
                        </div>
                    )}
                    {data.healthy_tasks !== undefined && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <div className="text-2xl font-bold text-green-700">{data.healthy_tasks}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">Saglikli</div>
                        </div>
                    )}
                    {data.stale_tasks !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.stale_tasks > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <div className={`text-2xl font-bold ${data.stale_tasks > 0 ? 'text-red-700' : 'text-green-700'}`}>{data.stale_tasks}</div>
                            <div className={`text-xs font-medium mt-1 ${data.stale_tasks > 0 ? 'text-red-600' : 'text-green-600'}`}>Bayat Gorev</div>
                        </div>
                    )}
                    {data.stale_records !== undefined && (
                        <div className={`p-4 rounded-lg border text-center ${data.stale_records > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                            <div className={`text-2xl font-bold ${data.stale_records > 0 ? 'text-amber-700' : 'text-green-700'}`}>{data.stale_records}</div>
                            <div className={`text-xs font-medium mt-1 ${data.stale_records > 0 ? 'text-amber-600' : 'text-green-600'}`}>Bayat Kayit</div>
                        </div>
                    )}
                </div>
            )}

            {/* Task Details */}
            {data.items && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Gorev Adi</th>
                                <th className="px-4 py-3">Son Calisma</th>
                                <th className="px-4 py-3">Detay</th>
                                <th className="px-4 py-3 w-[120px]">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.items.map((item, i) => (
                                <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{item.check || item.task_name || item.label}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.last_run || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || '-'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(!data.items || data.items.length === 0) && data.stale_tasks === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tum Celery gorevleri saglikli calisiyor.
                </div>
            )}
        </div>
    );
}

// ─── Section 8: Sistem Ayarlari (system_config) ──────────────────────────────

function SystemConfigSection({ data }) {
    if (!data?.items || data.items.length === 0) {
        return <p className="text-gray-400 text-sm">Sistem yapilandirma verisi bulunamadi.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3">Ayar</th>
                        <th className="px-4 py-3">Beklenen Deger</th>
                        <th className="px-4 py-3">Mevcut Deger</th>
                        <th className="px-4 py-3 w-[120px]">Durum</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.items.map((item, i) => (
                        <tr key={item.key || i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{item.key || item.setting}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs font-mono">{String(item.expected ?? '-')}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs font-mono">{String(item.actual ?? '-')}</td>
                            <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Generic Items Section (fallback) ─────────────────────────────────────────

function GenericItemsSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Veri bulunamadi.</p>;

    // If it has items array
    if (data.items && data.items.length > 0) {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3">Kontrol</th>
                            <th className="px-4 py-3">Detay</th>
                            <th className="px-4 py-3 w-[120px]">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.items.map((item, i) => (
                            <tr key={i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : item.status === 'WARNING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}>
                                <td className="px-4 py-3 text-gray-800 text-sm">{item.check || item.label || item.key || '-'}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs font-mono">{item.detail || item.value || '-'}</td>
                                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
            <CheckCircleIcon className="w-5 h-5" />
            Tum kontroller basarili.
        </div>
    );
}

// ─── Helper: count section stats ───────────────────────────────────────────────

function countSectionStats(section) {
    if (!section) return { passed: 0, failed: 0, warnings: 0, total: 0 };

    // If the section has direct pass/fail/warning counts
    if (section.passed !== undefined) {
        return {
            passed: section.passed || 0,
            failed: section.failed || 0,
            warnings: section.warnings || 0,
            total: section.total || (section.passed + section.failed + (section.warnings || 0)),
        };
    }

    // If the section has items array, count from statuses
    const items = section.items || [];
    let passed = 0, failed = 0, warnings = 0;
    items.forEach(item => {
        const s = (item.status || '').toUpperCase();
        if (s === 'PASS') passed++;
        else if (s === 'FAIL') failed++;
        else if (s === 'WARNING') warnings++;
    });

    return { passed, failed, warnings, total: items.length };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AttendanceAuditTab() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/system/health-check/attendance-audit/');
            setResults(res.data);
            // Auto-expand sections that have failures
            const autoExpand = {};
            const sections = res.data?.sections || {};
            Object.keys(sections).forEach(key => {
                const stats = countSectionStats(sections[key]);
                if (stats.failed > 0) autoExpand[key] = true;
            });
            setExpandedSections(autoExpand);
        } catch (err) {
            setError('Denetim baslatilamadi: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (id) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const expandAll = () => {
        if (!results?.sections) return;
        const all = {};
        Object.keys(results.sections).forEach(key => { all[key] = true; });
        setExpandedSections(all);
    };

    const collapseAll = () => {
        setExpandedSections({});
    };

    // Overall stats
    const overallScore = results?.overall_score ?? null;
    const totalChecks = results?.total_checks ?? 0;
    const totalPassed = results?.total_passed ?? 0;
    const totalFailed = results?.total_failed ?? 0;
    const totalWarnings = results?.total_warnings ?? 0;
    const sections = results?.sections || {};

    // Section definitions for rendering
    const sectionDefs = [
        { key: 'calendar_system', title: 'Takvim Sistemi', icon: CalendarDaysIcon, Component: CalendarSystemSection },
        { key: 'lunch_break', title: 'Ogle Arasi', icon: SunIcon, Component: LunchBreakSection },
        { key: 'break_allowance', title: 'Mola Haklari', icon: PauseCircleIcon, Component: BreakAllowanceSection },
        { key: 'tolerance', title: 'Tolerans Ayarlari', icon: AdjustmentsHorizontalIcon, Component: ToleranceSection },
        { key: 'monthly_targets', title: 'Aylik Hedefler', icon: ChartBarSquareIcon, Component: MonthlyTargetsSection },
        { key: 'fiscal_periods', title: 'Mali Donemler', icon: BanknotesIcon, Component: FiscalPeriodsSection },
        { key: 'celery_tasks', title: 'Celery Gorevleri', icon: CpuChipIcon, Component: CeleryTasksSection },
        { key: 'system_config', title: 'Sistem Ayarlari', icon: Cog6ToothIcon, Component: SystemConfigSection },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ClockIcon className="w-7 h-7 text-indigo-600" />
                            Mesai Uyumluluk Denetimi
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Takvim, mola, tolerans, hedef, mali donem ve Celery gorev sagligi kontrolu
                        </p>
                    </div>
                    <button
                        onClick={runAudit}
                        disabled={loading}
                        className={`px-6 py-3 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2 flex-shrink-0
                            ${loading
                                ? 'bg-gray-100 text-gray-400 cursor-wait border border-gray-200'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95'}
                        `}
                    >
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayIcon className="w-5 h-5" />}
                        {loading ? 'Denetim Calisiyor...' : 'Denetimi Calistir'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <XCircleIcon className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* ── Overall Score Card ─────────────────────────────────────────── */}
            {results && (
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Score circle */}
                        <ScoreCircle percentage={overallScore ?? 0} />

                        {/* Stats grid */}
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                <div className="text-3xl font-bold text-gray-800">{totalChecks}</div>
                                <div className="text-xs text-gray-500 font-medium mt-1">Toplam Kontrol</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                <div className="text-3xl font-bold text-green-700">{totalPassed}</div>
                                <div className="text-xs text-green-600 font-medium mt-1">Basarili</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                                <div className="text-3xl font-bold text-red-700">{totalFailed}</div>
                                <div className="text-xs text-red-600 font-medium mt-1">Basarisiz</div>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                                <div className="text-3xl font-bold text-amber-700">{totalWarnings}</div>
                                <div className="text-xs text-amber-600 font-medium mt-1">Uyari</div>
                            </div>
                        </div>
                    </div>

                    {/* Expand / Collapse All */}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={expandAll}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                            Tumunu Ac
                        </button>
                        <button
                            onClick={collapseAll}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Tumunu Kapat
                        </button>
                    </div>
                </div>
            )}

            {/* ── Section Cards ──────────────────────────────────────────────── */}
            {results && sectionDefs.map(({ key, title, icon, Component }) => {
                const sectionData = sections[key];
                if (!sectionData) return null;
                const stats = countSectionStats(sectionData);

                return (
                    <CollapsibleSection
                        key={key}
                        id={key}
                        title={title}
                        icon={icon}
                        passed={stats.passed}
                        failed={stats.failed}
                        warnings={stats.warnings}
                        total={stats.total}
                        expanded={!!expandedSections[key]}
                        onToggle={toggleSection}
                    >
                        <Component data={sectionData} />
                    </CollapsibleSection>
                );
            })}

            {/* ── Audit Timestamp ────────────────────────────────────────────── */}
            {results?.timestamp && (
                <div className="text-xs text-gray-400 text-right px-2">
                    Denetim zamani: {new Date(results.timestamp).toLocaleString('tr-TR')}
                </div>
            )}

            {/* ── Empty State ────────────────────────────────────────────────── */}
            {!results && !loading && (
                <div className="bg-white/80 backdrop-blur-sm p-12 rounded-xl shadow-lg border border-gray-200/50 text-center">
                    <ClockIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h4 className="text-gray-400 font-medium text-lg">Henuz denetim calistirilmadi</h4>
                    <p className="text-gray-300 text-sm mt-2">
                        Yukaridaki "Denetimi Calistir" butonuna tiklayarak mesai uyumluluk denetimini baslatabilirsiniz.
                    </p>
                </div>
            )}

            {/* ── Loading State ──────────────────────────────────────────────── */}
            {loading && (
                <div className="bg-white/80 backdrop-blur-sm p-12 rounded-xl shadow-lg border border-gray-200/50 text-center">
                    <ArrowPathIcon className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-spin" />
                    <h4 className="text-gray-600 font-medium text-lg">Denetim calisiyor...</h4>
                    <p className="text-gray-400 text-sm mt-2">
                        Takvim sistemi, mola haklari, tolerans ayarlari, aylik hedefler, mali donemler ve Celery gorevleri kontrol ediliyor.
                    </p>
                </div>
            )}
        </div>
    );
}
