import React, { useState } from 'react';
import {
    ShieldCheckIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    PlayIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowPathIcon,
    UserGroupIcon,
    KeyIcon,
    UserIcon,
    Cog6ToothIcon,
    DocumentCheckIcon,
    LinkIcon,
    ClipboardDocumentListIcon
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

// ─── Section 1: Permissions ────────────────────────────────────────────────────

function PermissionsSection({ data }) {
    if (!data?.items || data.items.length === 0) {
        return <p className="text-gray-400 text-sm">Yetki verisi bulunamadi.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3">Kod</th>
                        <th className="px-4 py-3">Kategori (Beklenen)</th>
                        <th className="px-4 py-3">Kategori (Mevcut)</th>
                        <th className="px-4 py-3 w-[120px]">Durum</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.items.map((item, i) => (
                        <tr key={item.code || i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{item.code}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{item.expected_category || '-'}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{item.actual_category || '-'}</td>
                            <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Section 2: Roles ──────────────────────────────────────────────────────────

function RolesSection({ data }) {
    const [expandedRole, setExpandedRole] = useState(null);

    if (!data?.items || data.items.length === 0) {
        return <p className="text-gray-400 text-sm">Rol verisi bulunamadi.</p>;
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3">Rol Adi</th>
                            <th className="px-4 py-3 text-center">Beklenen Yetki</th>
                            <th className="px-4 py-3 text-center">Mevcut Yetki</th>
                            <th className="px-4 py-3 text-center">Eksik</th>
                            <th className="px-4 py-3 text-center">Fazla</th>
                            <th className="px-4 py-3 w-[120px]">Durum</th>
                            <th className="px-4 py-3 w-[40px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.items.map((role, i) => {
                            const hasMissing = role.missing_permissions && role.missing_permissions.length > 0;
                            const hasExtra = role.extra_permissions && role.extra_permissions.length > 0;
                            const canExpand = hasMissing || hasExtra;
                            const isExpanded = expandedRole === (role.name || i);

                            return (
                                <React.Fragment key={role.name || i}>
                                    <tr
                                        className={`transition-colors cursor-pointer ${role.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => canExpand && setExpandedRole(isExpanded ? null : (role.name || i))}
                                    >
                                        <td className="px-4 py-3 font-bold text-gray-800">{role.name}</td>
                                        <td className="px-4 py-3 text-center font-mono text-xs">{role.expected_count === 'ALL' ? <span className="text-indigo-600 font-bold">ALL</span> : role.expected_count}</td>
                                        <td className="px-4 py-3 text-center font-mono text-xs">{role.actual_count}</td>
                                        <td className="px-4 py-3 text-center">
                                            {hasMissing ? <CountBadge count={role.missing_permissions.length} color="red" /> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {hasExtra ? <CountBadge count={role.extra_permissions.length} color="amber" /> : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={role.status} /></td>
                                        <td className="px-4 py-3 text-center">
                                            {canExpand && (isExpanded ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />)}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} className="bg-gray-50/80 px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {hasMissing && (
                                                        <div>
                                                            <h5 className="text-xs font-bold text-red-700 mb-2">Eksik Yetkiler:</h5>
                                                            <div className="flex flex-wrap gap-1">
                                                                {role.missing_permissions.map(p => (
                                                                    <span key={p} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-mono border border-red-200">
                                                                        {p}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasExtra && (
                                                        <div>
                                                            <h5 className="text-xs font-bold text-amber-700 mb-2">Fazla Yetkiler:</h5>
                                                            <div className="flex flex-wrap gap-1">
                                                                {role.extra_permissions.map(p => (
                                                                    <span key={p} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-200">
                                                                        {p}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Section 3: Employee RBAC Status ───────────────────────────────────────────

function EmployeeRBACSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Calisan RBAC verisi bulunamadi.</p>;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                    <div className="text-2xl font-bold text-blue-700">{data.total_employees ?? '-'}</div>
                    <div className="text-xs text-blue-600 font-medium mt-1">Toplam Calisan</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                    <div className="text-2xl font-bold text-green-700">{data.with_roles ?? '-'}</div>
                    <div className="text-xs text-green-600 font-medium mt-1">Rolu Olan</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-center">
                    <div className="text-2xl font-bold text-amber-700">{data.without_manager ?? '-'}</div>
                    <div className="text-xs text-amber-600 font-medium mt-1">Yoneticisiz</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                    <div className="text-2xl font-bold text-indigo-700">{data.board_exempt ?? '-'}</div>
                    <div className="text-xs text-indigo-600 font-medium mt-1">Yonetim Kurulu</div>
                </div>
            </div>

            {/* Employees without roles */}
            {data.employees_without_roles && data.employees_without_roles.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                        <XCircleIcon className="w-4 h-4" /> Rolu Olmayan Calisanlar ({data.employees_without_roles.length})
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
                                {data.employees_without_roles.map((emp, i) => (
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

            {/* Employees without managers */}
            {data.employees_without_manager && data.employees_without_manager.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" /> Yoneticisi Olmayan Calisanlar ({data.employees_without_manager.length})
                    </h4>
                    <div className="overflow-x-auto border border-amber-100 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-amber-50 text-amber-700 font-semibold border-b border-amber-100">
                                <tr>
                                    <th className="px-4 py-2">Personel Kodu</th>
                                    <th className="px-4 py-2">Ad Soyad</th>
                                    <th className="px-4 py-2">Departman</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50">
                                {data.employees_without_manager.map((emp, i) => (
                                    <tr key={emp.id || i} className="hover:bg-amber-50/50">
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

            {/* All good */}
            {(!data.employees_without_roles || data.employees_without_roles.length === 0) &&
             (!data.employees_without_manager || data.employees_without_manager.length === 0) && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tum calisanlarin rolleri ve yoneticileri tanimli.
                </div>
            )}
        </div>
    );
}

// ─── Section 4: Manager Relations ──────────────────────────────────────────────

function ManagerRelationsSection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Yonetici iliskileri verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                    <div className="text-2xl font-bold text-blue-700">{data.primary_count ?? '-'}</div>
                    <div className="text-xs text-blue-600 font-medium mt-1">PRIMARY Iliski</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                    <div className="text-2xl font-bold text-indigo-700">{data.secondary_count ?? data.cross_count ?? '-'}</div>
                    <div className="text-xs text-indigo-600 font-medium mt-1">SECONDARY/CROSS Iliski</div>
                </div>
                <div className={`p-4 rounded-lg border text-center ${(data.orphan_count ?? 0) > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className={`text-2xl font-bold ${(data.orphan_count ?? 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>{data.orphan_count ?? 0}</div>
                    <div className={`text-xs font-medium mt-1 ${(data.orphan_count ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>Yetim Calisan</div>
                </div>
            </div>

            {/* Orphan employees list */}
            {data.orphan_employees && data.orphan_employees.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Yetim Calisanlar (yoneticisiz, YK degil, superuser degil)
                    </h4>
                    <div className="overflow-x-auto border border-red-100 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-red-50 text-red-700 font-semibold border-b border-red-100">
                                <tr>
                                    <th className="px-4 py-2">Personel Kodu</th>
                                    <th className="px-4 py-2">Ad Soyad</th>
                                    <th className="px-4 py-2">Departman</th>
                                    <th className="px-4 py-2">Pozisyon</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-50">
                                {data.orphan_employees.map((emp, i) => (
                                    <tr key={emp.id || i} className="hover:bg-red-50/50">
                                        <td className="px-4 py-2 font-mono text-xs">{emp.employee_code || '-'}</td>
                                        <td className="px-4 py-2 text-gray-800">{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</td>
                                        <td className="px-4 py-2 text-gray-500 text-xs">{emp.department || '-'}</td>
                                        <td className="px-4 py-2 text-gray-500 text-xs">{emp.position || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(!data.orphan_employees || data.orphan_employees.length === 0) && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Tum calisanlarin yonetici atamasi mevcut veya muaf.
                </div>
            )}
        </div>
    );
}

// ─── Section 5: Request Types ──────────────────────────────────────────────────

function RequestTypesSection({ data }) {
    if (!data?.items || data.items.length === 0) {
        return <p className="text-gray-400 text-sm">Talep tipi verisi bulunamadi.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3">Kod</th>
                        <th className="px-4 py-3 text-center">Aktif mi?</th>
                        <th className="px-4 py-3 text-center">DB'de Var mi?</th>
                        <th className="px-4 py-3 w-[120px]">Durum</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.items.map((item, i) => (
                        <tr key={item.code || i} className={`transition-colors ${item.status === 'FAIL' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{item.code}</td>
                            <td className="px-4 py-3 text-center">
                                {item.is_active ? (
                                    <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 text-red-400 mx-auto" />
                                )}
                            </td>
                            <td className="px-4 py-3 text-center">
                                {item.exists_in_db ? (
                                    <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 text-red-400 mx-auto" />
                                )}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Section 6: Request Integrity ──────────────────────────────────────────────

function RequestIntegritySection({ data }) {
    if (!data) return <p className="text-gray-400 text-sm">Talep butunlugu verisi bulunamadi.</p>;

    return (
        <div className="space-y-4">
            {/* Pending request counts */}
            {data.pending_by_type && Object.keys(data.pending_by_type).length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Bekleyen Talepler (Tipe Gore)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.entries(data.pending_by_type).map(([type, count]) => (
                            <div key={type} className={`p-3 rounded-lg border text-center ${count > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className={`text-lg font-bold ${count > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{count}</div>
                                <div className="text-[10px] font-mono text-gray-500 mt-0.5 truncate" title={type}>{type}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.auto_approve_user_count !== undefined && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="text-xl font-bold text-blue-700">{data.auto_approve_user_count}</div>
                        <div className="text-xs text-blue-600 font-medium mt-1">AUTO_APPROVE Kullanicisi</div>
                    </div>
                )}
                {data.stale_request_count !== undefined && (
                    <div className={`p-4 rounded-lg border ${data.stale_request_count > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                        <div className={`text-xl font-bold ${data.stale_request_count > 0 ? 'text-amber-700' : 'text-green-700'}`}>{data.stale_request_count}</div>
                        <div className={`text-xs font-medium mt-1 ${data.stale_request_count > 0 ? 'text-amber-600' : 'text-green-600'}`}>Bayat Talep (&gt;7 gun)</div>
                    </div>
                )}
                {data.ot_planning_model_exists !== undefined && (
                    <div className={`p-4 rounded-lg border ${data.ot_planning_model_exists ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-center gap-2">
                            {data.ot_planning_model_exists ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            ) : (
                                <XCircleIcon className="w-6 h-6 text-red-600" />
                            )}
                            <div>
                                <div className={`text-sm font-bold ${data.ot_planning_model_exists ? 'text-green-700' : 'text-red-700'}`}>
                                    OT Planning Model
                                </div>
                                <div className={`text-xs ${data.ot_planning_model_exists ? 'text-green-600' : 'text-red-600'}`}>
                                    {data.ot_planning_model_exists ? 'Mevcut' : 'Bulunamadi'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Items list if any */}
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

            {/* All good case */}
            {(!data.pending_by_type || Object.keys(data.pending_by_type).length === 0) &&
             (!data.items || data.items.length === 0) &&
             data.stale_request_count === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                    <CheckCircleIcon className="w-5 h-5" />
                    Talep butunlugu kontrolleri basarili.
                </div>
            )}
        </div>
    );
}

// ─── Section 7: System Config ──────────────────────────────────────────────────

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

export default function RBACAuditTab() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/system/health-check/rbac-audit/');
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
        { key: 'permissions', title: 'Yetkiler (Permissions)', icon: KeyIcon, Component: PermissionsSection },
        { key: 'roles', title: 'Roller (Roles)', icon: UserGroupIcon, Component: RolesSection },
        { key: 'employee_rbac', title: 'Calisan RBAC Durumu', icon: UserIcon, Component: EmployeeRBACSection },
        { key: 'manager_relations', title: 'Yonetici Iliskileri', icon: LinkIcon, Component: ManagerRelationsSection },
        { key: 'request_types', title: 'Talep Tipleri (Request Types)', icon: ClipboardDocumentListIcon, Component: RequestTypesSection },
        { key: 'request_integrity', title: 'Talep Butunlugu (Request Integrity)', icon: DocumentCheckIcon, Component: RequestIntegritySection },
        { key: 'system_config', title: 'Sistem Yapilandirmasi', icon: Cog6ToothIcon, Component: SystemConfigSection },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheckIcon className="w-7 h-7 text-indigo-600" />
                            RBAC & Talep Sistemi Denetimi
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Target Spec uyumluluk kontrolu -- Asama 1 (Yetki) + Asama 2 (Talepler)
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
                        {loading ? 'Denetim Calisiyor...' : 'Denetimi Baslat'}
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
                    <ShieldCheckIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h4 className="text-gray-400 font-medium text-lg">Henuz denetim calistirilmadi</h4>
                    <p className="text-gray-300 text-sm mt-2">
                        Yukaridaki "Denetimi Baslat" butonuna tiklayarak RBAC ve talep sistemi denetimini baslatabilirsiniz.
                    </p>
                </div>
            )}

            {/* ── Loading State ──────────────────────────────────────────────── */}
            {loading && (
                <div className="bg-white/80 backdrop-blur-sm p-12 rounded-xl shadow-lg border border-gray-200/50 text-center">
                    <ArrowPathIcon className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-spin" />
                    <h4 className="text-gray-600 font-medium text-lg">Denetim calisiyor...</h4>
                    <p className="text-gray-400 text-sm mt-2">
                        Yetkiler, roller, calisan durumu, talep tipleri ve sistem yapilandirmasi kontrol ediliyor.
                    </p>
                </div>
            )}
        </div>
    );
}
