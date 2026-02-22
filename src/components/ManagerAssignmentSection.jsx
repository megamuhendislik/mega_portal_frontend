import React, { useEffect } from 'react';
import { Plus, X, UserPlus, Users } from 'lucide-react';

/**
 * Paylaşılan yönetici atama bileşeni.
 * Employees.jsx ve EmployeeDetail.jsx tarafından kullanılır.
 *
 * Props:
 *   type: 'primary' | 'secondary'
 *   managers: [{manager_id, department_id, job_position_id}]
 *   onChange: (newArray) => void
 *   employeeList: [] — tüm aktif çalışanlar
 *   departments: [] — tüm departmanlar
 *   jobPositions: [] — tüm pozisyonlar
 *   excludeEmployeeId: number|null — çalışanın kendi ID'si
 *   isBoardMember: boolean — board muafiyeti
 *   showValidation: boolean — inline hata gösterimi
 *   disabled: boolean
 */
const ManagerAssignmentSection = ({
    type = 'primary',
    managers = [],
    onChange,
    employeeList = [],
    departments = [],
    jobPositions = [],
    excludeEmployeeId = null,
    isBoardMember = false,
    showValidation = false,
    disabled = false,
}) => {
    const isPrimary = type === 'primary';

    // Renk şeması
    const colors = isPrimary
        ? { bg: 'blue-50/50', border: 'blue-100', ring: 'blue-500', text: 'blue-600', hoverBg: 'blue-100', addBg: 'blue-50', label: 'blue-700' }
        : { bg: 'emerald-50/50', border: 'emerald-100', ring: 'emerald-500', text: 'emerald-600', hoverBg: 'emerald-100', addBg: 'emerald-50', label: 'emerald-700' };

    const label = isPrimary ? 'Birincil Yöneticiler' : 'İkincil Yöneticiler';
    const helpText = isPrimary
        ? 'İzin ve mesai onayı verecek yöneticiler. Ekip listesinde görünür.'
        : 'Sadece talep onayı verebilir, ekip listesinde görünmez.';
    const Icon = isPrimary ? UserPlus : Users;

    // Zorunlu ilk satır: primary + non-board → mount'ta boş satır ekle
    useEffect(() => {
        if (isPrimary && !isBoardMember && managers.length === 0) {
            onChange([{ manager_id: '', department_id: '', job_position_id: '' }]);
        }
    }, [isPrimary, isBoardMember]); // eslint-disable-line react-hooks/exhaustive-deps

    // Seçili yönetici ID'lerini topla (duplicate filtre için)
    const selectedManagerIds = managers
        .map(m => String(m.manager_id || ''))
        .filter(Boolean);

    // Belirli bir satır için uygun yönetici listesi (duplicate + self filtreli)
    const getAvailableManagers = (currentIdx) => {
        const othersSelected = managers
            .filter((_, i) => i !== currentIdx)
            .map(m => String(m.manager_id || ''))
            .filter(Boolean);

        return employeeList
            .filter(e => e.is_active !== false)
            .filter(e => String(e.id) !== String(excludeEmployeeId))
            .filter(e => !othersSelected.includes(String(e.id)));
    };

    // Yönetici seçildiğinde auto-fill
    const handleManagerChange = (idx, managerId) => {
        const arr = [...managers];
        arr[idx] = { ...arr[idx], manager_id: managerId };

        if (managerId) {
            const mgr = employeeList.find(e => String(e.id) === String(managerId));
            if (mgr) {
                // Yöneticinin kendi departman ve pozisyonunu otomatik doldur
                const deptId = mgr.department?.id || mgr.department || '';
                const posId = mgr.job_position?.id || mgr.job_position || '';
                arr[idx].department_id = deptId;
                arr[idx].job_position_id = posId;
            }
        } else {
            arr[idx].department_id = '';
            arr[idx].job_position_id = '';
        }

        onChange(arr);
    };

    const handleFieldChange = (idx, field, value) => {
        const arr = [...managers];
        arr[idx] = { ...arr[idx], [field]: value };
        onChange(arr);
    };

    const addRow = () => {
        onChange([...managers, { manager_id: '', department_id: '', job_position_id: '' }]);
    };

    const removeRow = (idx) => {
        // İlk satırı sil → primary + non-board ise engelle
        if (isPrimary && !isBoardMember && idx === 0 && managers.length === 1) return;
        onChange(managers.filter((_, i) => i !== idx));
    };

    // Satır bazlı inline hata hesapla
    const getRowErrors = (entry, idx) => {
        if (!showValidation) return {};
        const errs = {};
        if (!entry.manager_id) errs.manager_id = 'Zorunlu';
        if (!entry.department_id) errs.department_id = 'Zorunlu';
        if (!entry.job_position_id) errs.job_position_id = 'Zorunlu';
        // Duplicate kontrolü
        const othersSelected = managers
            .filter((_, i) => i !== idx)
            .map(m => String(m.manager_id || ''))
            .filter(Boolean);
        if (entry.manager_id && othersSelected.includes(String(entry.manager_id))) {
            errs.manager_id = 'Tekrar';
        }
        return errs;
    };

    // Section-level hata (hiç yönetici yok)
    const showSectionError = showValidation && isPrimary && !isBoardMember && managers.length === 0;

    const canDelete = (idx) => {
        if (disabled) return false;
        // Primary non-board: son satır silinemez
        if (isPrimary && !isBoardMember && managers.length <= 1) return false;
        return true;
    };

    return (
        <div className="mb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={16} className={`text-${colors.text}`} />
                    <label className={`block text-sm font-semibold text-${colors.label}`}>
                        {label}
                        {isPrimary && !isBoardMember && (
                            <span className="text-red-500 ml-1">*</span>
                        )}
                    </label>
                </div>
                {!disabled && (
                    <button
                        type="button"
                        onClick={addRow}
                        className={`text-xs font-bold text-${colors.text} hover:text-${colors.label} flex items-center gap-1 bg-${colors.addBg} px-2 py-1 rounded-lg border border-${colors.border} hover:bg-${colors.hoverBg} transition-colors`}
                    >
                        <Plus size={12} /> Ekle
                    </button>
                )}
            </div>

            {/* Section error */}
            {showSectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-600 font-medium mb-2">
                    En az bir birincil yönetici atanmalıdır.
                </div>
            )}

            {/* Rows */}
            {managers.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center text-xs text-slate-400">
                    {isPrimary ? 'Birincil yönetici atanmadı.' : 'İkincil yönetici atanmadı.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {managers.map((entry, idx) => {
                        const rowErrors = getRowErrors(entry, idx);
                        const availableManagers = getAvailableManagers(idx);
                        const hasError = Object.keys(rowErrors).length > 0;

                        return (
                            <div
                                key={idx}
                                className={`flex gap-2 items-start p-2 bg-${colors.bg} rounded-xl border ${hasError && showValidation ? 'border-red-300' : `border-${colors.border}`}`}
                            >
                                {/* Yönetici */}
                                <div className="flex-1 min-w-0">
                                    <label className="block text-xs text-slate-500 mb-0.5">
                                        Yönetici {isPrimary && idx === 0 && !isBoardMember && <span className="text-red-400">*</span>}
                                    </label>
                                    <select
                                        value={entry.manager_id || ''}
                                        onChange={e => handleManagerChange(idx, e.target.value)}
                                        disabled={disabled}
                                        className={`w-full p-1.5 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-${colors.ring} outline-none ${rowErrors.manager_id ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200'}`}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {availableManagers.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.first_name} {m.last_name} — {m.job_position_name || m.job_position?.name || '-'}
                                            </option>
                                        ))}
                                        {/* Şu an seçili yöneticiyi de göster (başka satırda da olsa) */}
                                        {entry.manager_id && !availableManagers.some(m => String(m.id) === String(entry.manager_id)) && (() => {
                                            const current = employeeList.find(e => String(e.id) === String(entry.manager_id));
                                            return current ? (
                                                <option key={current.id} value={current.id}>
                                                    {current.first_name} {current.last_name} — {current.job_position_name || '-'}
                                                </option>
                                            ) : null;
                                        })()}
                                    </select>
                                    {rowErrors.manager_id && <p className="text-[10px] text-red-500 mt-0.5">{rowErrors.manager_id}</p>}
                                </div>

                                {/* Departman */}
                                <div className="flex-1 min-w-0">
                                    <label className="block text-xs text-slate-500 mb-0.5">Departman <span className="text-red-400">*</span></label>
                                    <select
                                        value={entry.department_id || ''}
                                        onChange={e => handleFieldChange(idx, 'department_id', e.target.value)}
                                        disabled={disabled}
                                        className={`w-full p-1.5 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-${colors.ring} outline-none ${rowErrors.department_id ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200'}`}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    {rowErrors.department_id && <p className="text-[10px] text-red-500 mt-0.5">{rowErrors.department_id}</p>}
                                </div>

                                {/* Pozisyon */}
                                <div className="flex-1 min-w-0">
                                    <label className="block text-xs text-slate-500 mb-0.5">Pozisyon <span className="text-red-400">*</span></label>
                                    <select
                                        value={entry.job_position_id || ''}
                                        onChange={e => handleFieldChange(idx, 'job_position_id', e.target.value)}
                                        disabled={disabled}
                                        className={`w-full p-1.5 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-${colors.ring} outline-none ${rowErrors.job_position_id ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200'}`}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {jobPositions.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    {rowErrors.job_position_id && <p className="text-[10px] text-red-500 mt-0.5">{rowErrors.job_position_id}</p>}
                                </div>

                                {/* Silme butonu */}
                                {canDelete(idx) ? (
                                    <button
                                        type="button"
                                        onClick={() => removeRow(idx)}
                                        className="mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                ) : (
                                    <div className="mt-5 w-[30px]" /> // Placeholder for alignment
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Yardım metni */}
            <p className="text-xs text-slate-400 mt-1.5">{helpText}</p>
        </div>
    );
};

export default ManagerAssignmentSection;
