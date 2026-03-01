import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ChevronDown, ChevronRight, Check, X, UserPlus, Building, Briefcase, Phone, FileText, ArrowRight, ArrowLeft, Loader2, Save, Key, Calculator, Network } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Trash2, Edit2, Download, Upload, CalendarRange } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ManagerAssignmentSection from '../components/ManagerAssignmentSection';


// --- Constants ---
const STEPS = [
    { number: 1, title: 'Kişisel Bilgiler', icon: UserPlus },
    { number: 2, title: 'Kurumsal Bilgiler', icon: Building },
    { number: 3, title: 'İletişim & Acil', icon: Phone },
    { number: 4, title: 'Detaylar & Yetkinlik', icon: Briefcase },
    { number: 5, title: 'İzin Yönetimi', icon: CalendarRange }, // [NEW] Dedicated Step
    { number: 6, title: 'Yetkilendirme', icon: Key },
    { number: 7, title: 'Önizleme & Onay', icon: FileText }
];

const FIELD_TO_STEP = {
    first_name: 1, last_name: 1, email: 1, username: 1, tc_number: 1,
    password: 1, birth_date: 1, user: 1,
    primary_managers: 2, secondary_managers: 2, department: 2,
    job_position: 2, tags: 2, assignments: 2, employee_code: 2,
    phone: 3, secondary_phone: 3, emergency_contact_name: 3,
    emergency_contact_phone: 3, address: 3, insurance_number: 3,
    work_type: 4, fiscal_calendar: 4, uses_service: 4,
    service_tolerance_minutes: 4, technical_skills: 4,
    leave_entitlements: 5, annual_leave_balance: 5,
    annual_leave_advance_limit: 5, annual_leave_accrual_rate: 5, hired_date: 5,
    roles: 6, direct_permissions: 6, excluded_permissions: 6, substitutes: 6,
};

// Add Shield Icon for Sensitive Data Indicator
const Shield = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const INITIAL_FORM_STATE = {
    // Step 1: Personal
    first_name: '',
    last_name: '',
    tc_number: '',
    birth_date: '',
    birth_place: '',
    email: '', // Required for user creation

    // Step 2: Corporate (Matrix)
    department: '', // Hierarchy Dept (Auto-filled)
    job_position: '',
    assignments: [], // Matrix (Dept+Title)
    primary_managers: [], // Birincil Yöneticiler [{manager_id, department_id, job_position_id}]
    secondary_managers: [], // İkincil Yöneticiler [{manager_id, department_id, job_position_id}]
    substitutes: [], // [NEW] Substitutes
    // functional_department: '', // REMOVED
    tags: [], // [NEW] Employee Tags
    roles: [],
    direct_permissions: [],
    excluded_permissions: [],

    employee_code: '',

    employment_status: 'ACTIVE',
    work_type: 'FULL_TIME',
    uses_service: false, // [NEW] Service Usage
    service_tolerance_minutes: 0,
    remote_work_days: [], // ['MON', 'WED']

    hired_date: new Date().toISOString().split('T')[0],

    // ...

    // System
    password: '', // Default initial password
    username: '', // Will be auto-generated or manual

    // Calendar
    fiscal_calendar: '', // NEW

    // Annual Leave
    // Annual Leave
    annual_leave_balance: 0,
    completed_annual_leave_total: 0,
    completed_annual_leave_this_year: 0,
    annual_leave_advance_limit: 0,
    annual_leave_accrual_rate: 14,
    auto_calculated_rate: null,
    leave_entitlements: []
};

// ...

const InputField = ({ label, icon: Icon, className, ...props }) => (
    <div className="group">
        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">{label} {props.required && <span className="text-red-500">*</span>}</label>
        <div className="relative transition-all duration-300">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />}
            <input
                {...props}
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all shadow-sm group-hover:bg-white ${className}`}
            />
        </div>
    </div>
);

const SelectField = ({ label, icon: Icon, options, className, ...props }) => (
    <div className="group">
        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">{label} {props.required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />}
            <select
                {...props}
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none appearance-none transition-all shadow-sm group-hover:bg-white cursor-pointer ${className}`}
            >
                {options}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        </div>
    </div>
);

const StepPersonal = ({ formData, handleChange, canEditSensitive = true, canChangePassword = true }) => (
    <div className="animate-fade-in-up">
        <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800">Kişisel Kimlik Bilgileri</h3>
            <p className="text-slate-500 text-sm">Personelin temel kimlik ve iletişim detayları.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <InputField label="Ad" value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} required placeholder="Personel Adı" />
            <InputField label="Soyad" value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} required placeholder="Personel Soyadı" />

            {/* Sensitive Check */}
            <div className="relative">
                <InputField
                    label="TC Kimlik No"
                    value={formData.tc_number}
                    onChange={e => handleChange('tc_number', e.target.value)}
                    required
                    placeholder="11 haneli TC no"
                    disabled={!canEditSensitive}
                    className={!canEditSensitive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}
                />
                {!canEditSensitive && <div className="absolute right-3 top-9 text-slate-400"><Shield size={16} /></div>}
            </div>

            <InputField
                label="E-posta"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                required
                type="email"
                placeholder="isim.soyisim@megamuhendislik.com.tr"
            />

            <InputField
                label="Doğum Tarihi"
                value={formData.birth_date}
                onChange={e => handleChange('birth_date', e.target.value)}
                type="date"
                disabled={!canEditSensitive}
                className={!canEditSensitive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}
            />

            <InputField label="Kullanıcı Adı" value={formData.username} onChange={e => handleChange('username', e.target.value)} required placeholder="kullanici.adi" />

            {/* Custom Password Input with Visibility Toggle */}
            <div className="group">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Şifre {canChangePassword && <span className="text-red-500">*</span>}</label>
                <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        value={formData.password}
                        onChange={e => handleChange('password', e.target.value)}
                        type="text"
                        disabled={!canChangePassword}
                        className={`w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all shadow-sm group-hover:bg-white ${!canChangePassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder={canChangePassword ? "İlk giriş şifresi (Görünür)" : "Yetkiniz yok"}
                    />
                </div>
                {canChangePassword && (
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                        * Güvenlik nedeniyle sadece <strong>yeni şifre</strong> girilirken görünür. Mevcut şifreler görüntülenemez.
                    </p>
                )}
            </div>
        </div>
    </div>
);

const StepCorporate = ({ formData, handleChange, departments, jobPositions, employees, availableTags, showManagerValidation }) => {
    const potentialManagers = employees || [];

    // Board muafiyet kontrolü - first primary manager's dept+pos'dan türetilir
    const firstPm = (formData.primary_managers || []).find(m => m.department_id && m.job_position_id);
    const selectedDept = firstPm ? departments.find(d => String(d.id) === String(firstPm.department_id)) : null;
    const selectedPos = firstPm ? jobPositions.find(p => String(p.id) === String(firstPm.job_position_id)) : null;
    const isBoardMember = selectedDept?.code?.startsWith('BOARD') || selectedPos?.key?.startsWith('BOARD_') || false;

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="mb-2 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Kurumsal & Hiyerarşi</h3>
                <p className="text-slate-500 text-sm">Pozisyon, raporlama hattı ve departman atamaları.</p>
            </div>

            {/* Matrix Alert Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Building size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">Matris Organizasyon Yapısı</h4>
                    <p className="text-blue-800/80 text-xs mt-1 leading-relaxed">
                        Lütfen <strong>Birincil Yöneticiler</strong> bölümünden en az bir yönetici atayınız. İlk birincil yönetici ana raporlama hattı olarak kullanılır.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* 1. BIRINCIL YÖNETICILER */}
                <div className="md:col-span-2">
                    <ManagerAssignmentSection
                        type="primary"
                        managers={formData.primary_managers || []}
                        onChange={mgrs => {
                            handleChange('primary_managers', mgrs);

                            // Auto-sync: first primary manager's dept+pos -> employee
                            const firstComplete = mgrs.find(m => m.manager_id && m.department_id && m.job_position_id);
                            if (firstComplete) {
                                handleChange('department', firstComplete.department_id);
                                handleChange('job_position', firstComplete.job_position_id);
                            }

                            // Role union from all positions (primary + secondary)
                            const allPosIds = new Set(mgrs.filter(m => m.job_position_id).map(m => Number(m.job_position_id)));
                            const sm = formData.secondary_managers || [];
                            sm.filter(m => m.job_position_id).forEach(m => allPosIds.add(Number(m.job_position_id)));

                            const unionRoles = new Set();
                            allPosIds.forEach(posId => {
                                const pos = jobPositions.find(p => Number(p.id) === posId);
                                if (pos?.default_roles) {
                                    pos.default_roles.forEach(r => unionRoles.add(r.id));
                                }
                            });
                            if (unionRoles.size > 0) {
                                handleChange('roles', [...unionRoles]);
                            }
                        }}
                        employeeList={employees}
                        departments={departments}
                        jobPositions={jobPositions}
                        excludeEmployeeId={null}
                        isBoardMember={isBoardMember}
                        showValidation={showManagerValidation}
                    />
                </div>

                {/* 1c. İKİNCİL YÖNETICILER */}
                <div className="md:col-span-2">
                    <ManagerAssignmentSection
                        type="secondary"
                        managers={formData.secondary_managers || []}
                        onChange={mgrs => handleChange('secondary_managers', mgrs)}
                        employeeList={employees}
                        departments={departments}
                        jobPositions={jobPositions}
                        excludeEmployeeId={null}
                        isBoardMember={isBoardMember}
                        showValidation={showManagerValidation}
                    />
                </div>

                {/* 3. TAGS / QUALITIES (Replaces Functional Unit) */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 ml-1">Etiketler / Uzmanlıklar</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[56px]">
                        {availableTags && availableTags.length > 0 ? (
                            availableTags.map(tag => {
                                const isSelected = (formData.tags || []).includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => {
                                            const current = formData.tags || [];
                                            const newTags = isSelected
                                                ? current.filter(id => id !== tag.id)
                                                : [...current, tag.id];
                                            handleChange('tags', newTags);
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isSelected
                                            ? 'shadow-sm'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                                            }`}
                                        style={isSelected ? (() => {
                                            const tagColorMap = {
                                                blue:    { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
                                                red:     { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
                                                green:   { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                                                amber:   { bg: '#fef3c7', text: '#a16207', border: '#fde68a' },
                                                purple:  { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
                                                emerald: { bg: '#d1fae5', text: '#047857', border: '#a7f3d0' },
                                                orange:  { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
                                                slate:   { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
                                                cyan:    { bg: '#cffafe', text: '#0e7490', border: '#a5f3fc' },
                                                violet:  { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
                                                indigo:  { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
                                            };
                                            const tc = tagColorMap[tag.color] || tagColorMap.blue;
                                            return { backgroundColor: tc.bg, color: tc.text, borderColor: tc.border };
                                        })() : {}}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })
                        ) : (
                            <span className="text-xs text-slate-400 italic">Tanımlı etiket bulunmuyor.</span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Personelin teknik uzmanlık veya çalışma grubunu belirtmek için etiket seçiniz.</p>
                </div>

                {/* 5. MATRIX ASSIGNMENTS (Dynamic List) */}
                <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700 ml-1">İkincil Görevlendirmeler (Matrix)</label>
                        <button
                            type="button"
                            onClick={() => {
                                const current = formData.assignments || [];
                                handleChange('assignments', [...current, { department_id: '', job_position_id: '' }]);
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                            <Plus size={14} /> Yeni Görev Ekle
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(!formData.assignments || formData.assignments.length === 0) && (
                            <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center text-sm text-slate-400">
                                Ek görevlendirme bulunmuyor.
                            </div>
                        )}
                        {(formData.assignments || []).map((asn, idx) => (
                            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-2 items-start animate-fade-in">
                                <div className="flex-1">
                                    <select
                                        value={asn.department_id || ''}
                                        onChange={e => {
                                            const newAsn = [...(formData.assignments || [])];
                                            newAsn[idx].department_id = e.target.value;
                                            handleChange('assignments', newAsn);
                                        }}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    >
                                        <option value="">Departman Seçiniz...</option>
                                        {/* Flatten departments for select */}
                                        {departments.filter(d => !d.parent).map(root => (
                                            <optgroup key={root.id} label={root.name}>
                                                {/* Recursive function approach handled in renderDepartmentOptions? We can simplify here or copy logic */}
                                                <option value={root.id}>{root.name}</option>
                                                {departments.filter(d => d.parent === root.id).map(child => (
                                                    <option key={child.id} value={child.id}>&nbsp;&nbsp;└ {child.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                        {departments.filter(d => !d.parent && d.children && d.children.length === 0).length === 0 && (
                                            departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                                        )}
                                    </select>
                                </div>

                                {/* Functional Unit removed in Matrix too */}
                                <div className="flex-1">
                                    <select
                                        value={asn.job_position_id || ''}
                                        onChange={e => {
                                            const newAsn = [...(formData.assignments || [])];
                                            newAsn[idx].job_position_id = e.target.value;
                                            handleChange('assignments', newAsn);
                                        }}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    >
                                        <option value="">Unvan Seçiniz...</option>
                                        {jobPositions.map(pos => (
                                            <option key={pos.id} value={pos.id}>{pos.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <select
                                        value={asn.manager_id || ''} // New
                                        onChange={e => {
                                            const newAsn = [...(formData.assignments || [])];
                                            newAsn[idx].manager_id = e.target.value;
                                            handleChange('assignments', newAsn);
                                        }}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    >
                                        <option value="">Yönetici Seçiniz (Opsiyonel)...</option>
                                        {potentialManagers.map(mgr => (
                                            <option key={mgr.id} value={mgr.id}>
                                                {mgr.first_name} {mgr.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newAsn = formData.assignments.filter((_, i) => i !== idx);
                                        handleChange('assignments', newAsn);
                                    }}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 6. SUBSTITUTES (Vekiller) */}
                <div className="md:col-span-2">
                    <div className="group">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Vekiller / Onay Yetkilileri (Substitutes)</label>
                        <div className="relative">
                            <UserPlus className="absolute left-3 top-3 text-slate-400" size={18} />
                            <select
                                multiple
                                value={formData.substitutes}
                                onChange={e => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    handleChange('substitutes', selected);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none h-24"
                            >
                                {potentialManagers.map(mgr => ( // Re-using potentialManagers list as it contains employees
                                    <option key={mgr.id} value={mgr.id}>
                                        {mgr.first_name} {mgr.last_name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400 mt-1 ml-1">Bu kişi izinli olduğunda yerine imza atabilecek kişiler. (Çoklu seçim için CTRL)</p>
                        </div>
                    </div>
                </div>

                <div>
                    <InputField label="Personel Sicil No" value={formData.employee_code} onChange={e => handleChange('employee_code', e.target.value)} required placeholder="Örn: 2478" />
                </div>

                <div>
                    <InputField label="İşe Başlama Tarihi" value={formData.hired_date} onChange={e => handleChange('hired_date', e.target.value)} type="date" />
                </div>
            </div >
        </div >
    );
};

const StepContact = ({ formData, handleChange }) => (
    <div className="animate-fade-in-up">
        <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800">İletişim & Acil Durum</h3>
            <p className="text-slate-500 text-sm">İrtibat ve acil durumda aranacak kişi bilgileri.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <InputField label="Cep Telefonu" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} icon={Phone} placeholder="05..." />
            <InputField label="İkinci Telefon" value={formData.phone_secondary} onChange={e => handleChange('phone_secondary', e.target.value)} icon={Phone} />
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Adres</label>
                <textarea
                    value={formData.address}
                    onChange={e => handleChange('address', e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all shadow-sm h-24 resize-none"
                />
            </div>
        </div>

        <div className="mt-8 mb-4">
            <h4 className="font-bold text-slate-700 flex items-center gap-2"><span className="w-8 h-1 bg-red-400 rounded-full inline-block"></span> Acil Durum Kişisi</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <InputField label="Ad Soyad" value={formData.emergency_contact_name} onChange={e => handleChange('emergency_contact_name', e.target.value)} />
            <InputField label="Telefonu" value={formData.emergency_contact_phone} onChange={e => handleChange('emergency_contact_phone', e.target.value)} icon={Phone} />
        </div>
    </div>
);

const StepDetails = ({ formData, handleChange, workSchedules }) => {



    // Sync customMode with parent if needed, but local toggle is fine for UI
    // Logic: If user selects "Custom" in dropdown -> set work_schedule = "" -> show Editor

    // Find selected Fiscal Calendar to show defaults
    const selectedSchedule = workSchedules.find(ws => ws.id == (formData.fiscal_calendar || ''));

    // Helper to get default time from schedule JSON (assuming MON as standard)
    const getDefaultTime = (type) => {
        if (!selectedSchedule?.schedule?.MON) return '';
        return selectedSchedule.schedule.MON[type] || '';
    };

    const defaultShiftStart = getDefaultTime('start');
    const defaultShiftEnd = getDefaultTime('end');
    const defaultLunchStart = selectedSchedule?.lunch_start?.slice(0, 5) || '';
    const defaultLunchEnd = selectedSchedule?.lunch_end?.slice(0, 5) || '';
    const defaultBreak = selectedSchedule?.daily_break_allowance || '';
    const defaultTolerance = selectedSchedule?.late_tolerance_minutes || '';
    const defaultServiceTolerance = selectedSchedule?.service_tolerance_minutes || '';

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Detaylar & Çalışma Takvimi</h3>
                <p className="text-slate-500 text-sm">Görev tanımı ve mesai saatleri.</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
                <div>
                    <InputField label="Görev Tanımı Özeti" value={formData.title} onChange={e => handleChange('title', e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Work Type */}
                    <div>
                        <SelectField
                            label="Çalışma Şekli"
                            value={formData.work_type}
                            onChange={e => handleChange('work_type', e.target.value)}
                            options={
                                <>
                                    <option value="FULL_TIME">Tam Zamanlı (Ofis)</option>
                                    <option value="REMOTE">Uzaktan (Tam)</option>
                                    <option value="HYBRID">Hibrit</option>
                                    <option value="PART_TIME">Yarı Zamanlı</option>
                                    <option value="FIELD">Saha</option>
                                </>
                            }
                        />
                    </div>

                    {/* Remote Days (Visible if REMOTE or HYBRID) */}
                    {(formData.work_type === 'REMOTE' || formData.work_type === 'HYBRID') && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Uzaktan Çalışma Günleri</label>
                            <div className="flex flex-wrap gap-2">
                                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => {
                                    const isSelected = formData.remote_work_days.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                const current = formData.remote_work_days;
                                                const newDays = isSelected
                                                    ? current.filter(d => d !== day)
                                                    : [...current, day];
                                                handleChange('remote_work_days', newDays);
                                            }}
                                            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${isSelected
                                                ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg scale-105'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                        >
                                            {day === 'MON' ? 'Pzt' : day === 'TUE' ? 'Sal' : day === 'WED' ? 'Çar' : day === 'THU' ? 'Per' : day === 'FRI' ? 'Cum' : day === 'SAT' ? 'Cmt' : 'Paz'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Schedule System Selection */}
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <CalendarRange size={18} className="text-blue-500" />
                        Çalışma Takvimi Planı
                    </h4>

                    {/* Fiscal Calendar Selection */}
                    <div className="space-y-4 animate-fade-in">
                        <SelectField
                            label="Mali Takvim Seçiniz"
                            value={formData.fiscal_calendar || ''}
                            onChange={e => handleChange('fiscal_calendar', e.target.value)}
                            required
                            options={
                                <>
                                    <option value="" disabled>Seçiniz...</option>
                                    {workSchedules.map(ws => (
                                        <option key={ws.id} value={ws.id}>
                                            {ws.name} ({ws.year})
                                        </option>
                                    ))}
                                </>
                            }
                        />

                        {selectedSchedule && (
                            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
                                <strong>Seçili Takvim:</strong> {selectedSchedule.name} ({selectedSchedule.year})
                                <br />
                                Kapsam: {selectedSchedule.description || 'Genel Şirket Takvimi'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Service Usage Toggle */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.uses_service || false}
                                onChange={e => handleChange('uses_service', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <div>
                            <span className="text-sm font-medium text-slate-700">Servis Kullanıyor</span>
                            <p className="text-xs text-slate-400">İşaretlenirse, servis toleransı uygulanır</p>
                        </div>
                    </div>

                    {formData.uses_service && (
                        <div className="pl-14 animate-fade-in">
                            <InputField
                                label="Servis Toleransı (Dk)"
                                type="number"
                                min="0"
                                value={formData.service_tolerance_minutes || ''}
                                onChange={e => handleChange('service_tolerance_minutes', e.target.value ? parseInt(e.target.value) : 0)}
                                placeholder={defaultServiceTolerance ? `Takvim varsayılanı: ${defaultServiceTolerance} dk` : 'Boş ise takvim ayarı kullanılır'}
                            />
                            <p className="text-xs text-slate-400 mt-1 ml-1">Boş bırakılırsa takvim ayarı kullanılır</p>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

const StepLeave = ({ formData, handleChange }) => {

    // Helper to calculate total from grid
    const calculatedTotal = (formData.leave_entitlements || []).reduce((sum, item) => sum + (parseFloat(item.days_entitled) - (item.days_used || 0)), 0);

    const addYearRow = () => {
        const currentYears = (formData.leave_entitlements || []).map(x => parseInt(x.year));
        const nextYear = currentYears.length > 0 ? Math.max(...currentYears) + 1 : new Date().getFullYear();

        if (currentYears.includes(nextYear)) {
            toast.error(`${nextYear} yılı zaten mevcut.`);
            return;
        }

        const newRow = {
            year: nextYear,
            days_entitled: formData.auto_calculated_rate || formData.annual_leave_accrual_rate || 14,
            days_used: 0
        };
        handleChange('leave_entitlements', [...(formData.leave_entitlements || []), newRow]);
    };

    const updateRow = (index, field, value) => {
        const newRows = [...(formData.leave_entitlements || [])];

        if (field === 'year') {
            const otherYears = newRows.filter((_, i) => i !== index).map(r => parseInt(r.year));
            if (otherYears.includes(parseInt(value))) {
                toast.error(`${value} yılı zaten mevcut.`);
                return;
            }
        }

        newRows[index] = { ...newRows[index], [field]: value };
        handleChange('leave_entitlements', newRows);
    };

    const removeRow = (index) => {
        const row = (formData.leave_entitlements || [])[index];
        if (row && parseFloat(row.days_used || 0) > 0) {
            toast.error(`${row.year} yılı kullanım kaydı olan izin hakkı silinemez.`);
            return;
        }
        const newRows = (formData.leave_entitlements || []).filter((_, i) => i !== index);
        handleChange('leave_entitlements', newRows);
    };

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">İzin Yönetimi</h3>
                <p className="text-slate-500 text-sm">Yıllık izin bakiyeleri ve hak ediş ayarları.</p>
            </div>

            <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-emerald-900">Özet Durum</h4>
                        <p className="text-xs text-emerald-700">Aşağıdaki tabloya göre hesaplanan toplamlar.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                        <div className="text-xs text-emerald-600 font-bold uppercase">Hesaplanan Bakiye</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{calculatedTotal} <span className="text-sm font-normal text-slate-400">Gün</span></div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                        <div className="text-xs text-emerald-600 font-bold uppercase">Kullanılan (Bu Yıl)</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{formData.completed_annual_leave_this_year} <span className="text-sm font-normal text-slate-400">Gün</span></div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                        <div className="text-xs text-emerald-600 font-bold uppercase mb-1">Avans Limiti</div>
                        <div className="flex items-baseline gap-2">
                            <input
                                type="number"
                                min="0"
                                value={formData.annual_leave_advance_limit || 0}
                                onChange={e => handleChange('annual_leave_advance_limit', parseInt(e.target.value) || 0)}
                                className="w-20 text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-emerald-200 focus:border-emerald-500 outline-none text-center"
                            />
                            <span className="text-sm font-normal text-slate-400">Gün</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Bakiye yetersiz olduğunda kullanılabilecek avans gün sayısı.</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                        <div className="text-xs text-emerald-600 font-bold uppercase">Bu Yıl Hakediş</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{formData.annual_leave_accrual_rate || formData.auto_calculated_rate} <span className="text-sm font-normal text-slate-400">Gün</span></div>
                        {formData.auto_calculated_rate && Number(formData.annual_leave_accrual_rate) !== Number(formData.auto_calculated_rate) ? (
                            <div className="text-[10px] text-amber-600 mt-0.5 font-bold">Override (Kanuni: {formData.auto_calculated_rate} gün)</div>
                        ) : (
                            <div className="text-[10px] text-emerald-500 mt-0.5">4857 Madde 53'e göre otomatik</div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <InputField
                        type="date"
                        label="İşe Giriş Tarihi (Hak Ediş Bazı)"
                        value={formData.hired_date}
                        onChange={e => handleChange('hired_date', e.target.value)}
                        className="bg-white border-blue-200"
                    />
                    <div>
                        <InputField
                            type="number"
                            label="Yıllık Hak Ediş (Bu Yıl)"
                            value={formData.annual_leave_accrual_rate}
                            onChange={e => handleChange('annual_leave_accrual_rate', e.target.value)}
                            className="bg-white"
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400">Kanuni: {formData.auto_calculated_rate || 14} gün</span>
                            {formData.auto_calculated_rate && Number(formData.annual_leave_accrual_rate) !== Number(formData.auto_calculated_rate) && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold" title="Bu değer sadece bu yılın hakedişi için geçerlidir. Sonraki yıl kanuni hesaplamaya döner.">Override aktif</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Granular History Editor */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2"><CalendarRange size={16} /> Yıllık İzin Geçmişi & Hak Edişler</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">Geçmiş yıllardan devreden veya bu yıl hak edilen izinleri yıl bazında giriniz.</p>
                    </div>
                    <button type="button" onClick={addYearRow} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 shadow-blue-200 shadow-md transition-all font-bold">+ Yıl Ekle</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 w-24">Yıl</th>
                                <th className="px-4 py-3 w-32">Hak Edilen</th>
                                <th className="px-4 py-3 w-32">Kullanılan</th>
                                <th className="px-4 py-3 w-32">Kalan</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(formData.leave_entitlements || []).length === 0 && (
                                <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic text-xs">Henüz veri girişi yapılmamış. Yeni yıl ekleyerek başlayın.</td></tr>
                            )}
                            {(formData.leave_entitlements || []).sort((a, b) => a.year - b.year).map((ent, idx) => {
                                const remaining = (parseFloat(ent.days_entitled) || 0) - (parseFloat(ent.days_used) || 0);
                                return (
                                    <tr key={idx} className="group hover:bg-blue-50/20">
                                        <td className="px-4 py-2">
                                            <input type="number" value={ent.year} onChange={e => updateRow(idx, 'year', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono text-center font-bold text-slate-700" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="number" value={ent.days_entitled} onChange={e => updateRow(idx, 'days_entitled', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none text-center font-bold text-emerald-600" />
                                        </td>
                                        <td className="px-4 py-2 text-center text-slate-500 font-mono text-xs">
                                            {ent.days_used}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`font-bold px-2 py-0.5 rounded ${remaining > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {remaining}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {parseFloat(ent.days_used || 0) > 0 ? (
                                                <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Kullanım kaydı olan izin silinemez">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                </span>
                                            ) : (
                                                <button type="button" onClick={() => removeRow(idx)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"><Trash2 size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {/* ReadOnly Total */}
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-right text-sm">
                    <span className="text-slate-500 mr-2">Toplam Kalan İzin Hakkı:</span>
                    <span className="font-bold text-slate-800 text-lg">{calculatedTotal} Gün</span>
                </div>
            </div>
        </div>
    );
};

const PERMISSION_CATEGORIES = [
    {
        id: 'menu',
        label: 'Menü & Sayfa Erişimi',
        icon: FileText,
        color: 'text-emerald-500',
        filter: (p) => p.category === 'PAGE' || p.category === 'MENU'
    },
    {
        id: 'requests',
        label: 'Onay ve İşlemler', // Renamed from Talep & Mesai
        icon: CalendarRange,
        color: 'text-purple-500',
        filter: (p) => p.category === 'APPROVAL' || p.category === 'ACTION' || p.category === 'REQUEST' || p.category === 'FEATURE' // Comprehensive fallback
    },
    {
        id: 'system',
        label: 'Sistem & Admin',
        icon: Settings,
        color: 'text-amber-500',
        filter: (p) => p.category === 'SYSTEM'
    }
];

const StepPermissions = ({ formData, handleChange, permissions, roles, canManageRoles = true }) => {
    const [activeTab, setActiveTab] = useState('menu');

    const toggleRole = (roleId) => {
        const current = formData.roles || [];
        if (current.includes(roleId)) {
            handleChange('roles', current.filter(id => id !== roleId));
            // When removing a role, we should arguably clear exclusions related to it? 
            // Or just leave them, they won't do anything if role isn't there.
        } else {
            handleChange('roles', [...current, roleId]);
        }
    };

    // Helper to check if a permission is granted by a selected Role (includes inherited permissions)
    const isGrantedByRole = (permId) => {
        if (!formData.roles || formData.roles.length === 0) return false;

        // Ensure type safety (IDs can be string/number mismatch)
        const selectedIds = formData.roles.map(id => Number(id));

        const selectedRoles = roles.filter(r => selectedIds.includes(Number(r.id)));

        // Use all_permissions (includes inherited) if available, fallback to permissions
        return selectedRoles.some(r => {
            const perms = r.all_permissions || r.permissions || [];
            return perms.some(p => Number(p.id) === Number(permId));
        });
    };

    const togglePermission = (permId) => {
        const fromRole = isGrantedByRole(permId);
        const direct = formData.direct_permissions || [];
        const excluded = formData.excluded_permissions || [];

        if (fromRole) {
            // Logic for Role-based permissions: Toggle Exclusion
            if (excluded.includes(permId)) {
                // Was excluded, now including it back (Uncheck -> Check)
                handleChange('excluded_permissions', excluded.filter(id => id !== permId));
            } else {
                // Was included, now excluding it (Check -> Uncheck)
                handleChange('excluded_permissions', [...excluded, permId]);
            }
        } else {
            // Logic for Non-Role permissions: Toggle Direct
            if (direct.includes(permId)) {
                handleChange('direct_permissions', direct.filter(id => id !== permId));
            } else {
                handleChange('direct_permissions', [...direct, permId]);
            }
        }
    };

    // Filter permissions for the active tab
    const activeCategory = PERMISSION_CATEGORIES.find(c => c.id === activeTab);
    const tabPermissions = permissions.filter(p => activeCategory.filter(p));

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Yetkilendirme ve Roller</h3>
                <p className="text-slate-500 text-sm">Kullanıcının rollerini ve detaylı erişim yetkilerini belirleyiniz.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[300px] md:min-h-[500px]">

                {/* COL 1: ROLES (Presets) */}
                <div className="lg:col-span-1 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Briefcase size={18} className="text-indigo-500" /> Roller (Paket)
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">Roller, önceden tanımlı yetki gruplarıdır. Rol seçtiğinizde ilgili yetkiler otomatik tanımlanır.</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {roles.map(role => {
                            const isChecked = (formData.roles || []).map(r => Number(r)).includes(Number(role.id));
                            return (
                                <label key={role.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200'} ${!canManageRoles ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input type="checkbox" className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" checked={isChecked} onChange={() => toggleRole(role.id)} disabled={!canManageRoles} />
                                    <div>
                                        <div className="font-bold text-sm text-slate-800">{role.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{role.description}</div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* COL 2: GRANULAR PERMISSIONS */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 overflow-x-auto">
                        {PERMISSION_CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const isActive = activeTab === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${isActive ? `border-blue-500 text-slate-800 bg-blue-50/30` : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <Icon size={18} className={isActive ? cat.color : 'text-slate-400'} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Permissions Grid */}
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {tabPermissions.length === 0 && (
                                <p className="col-span-2 text-center text-slate-400 py-10 italic">Bu kategoride yetki bulunamadı.</p>
                            )}
                            {tabPermissions.map(perm => {
                                const fromRole = isGrantedByRole(perm.id);
                                const isDirect = (formData.direct_permissions || []).includes(perm.id);
                                const isExcluded = (formData.excluded_permissions || []).includes(perm.id);

                                // Effectively checked if (Role AND NOT Excluded) OR Direct
                                const isChecked = (fromRole && !isExcluded) || isDirect;

                                return (
                                    <label key={perm.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? (fromRole ? 'bg-slate-50 border-slate-200 opacity-90' : 'bg-blue-50 border-blue-200 shadow-sm') : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                        <div className="mt-0.5">
                                            <input
                                                type="checkbox"
                                                // USER REQUEST: fromRole -> Gray tick (text-slate-500?), Direct -> Blue (text-blue-600)
                                                className={`w-4 h-4 rounded focus:ring-blue-500 ${fromRole ? (isChecked ? 'text-slate-500 bg-slate-100 border-slate-300' : 'text-slate-300 bg-red-50 ring-red-200') : 'text-blue-600'}`}
                                                checked={isChecked}
                                                onChange={() => togglePermission(perm.id)}
                                                disabled={!canManageRoles}
                                            />
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${isChecked ? 'text-slate-800' : 'text-slate-400 line-through decoration-slate-300'}`}>{perm.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{perm.code}</div>

                                            {fromRole && isChecked && (
                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 w-fit px-1.5 py-0.5 rounded">
                                                    <Briefcase size={10} /> Rolden Tanımlı
                                                </div>
                                            )}
                                            {fromRole && !isChecked && (
                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 w-fit px-1.5 py-0.5 rounded">
                                                    <XCircle size={10} /> Hariç Tutuldu
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div> Doğrudan Yetki</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-50 border border-indigo-200 rounded"></div> Rolden Gelen</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div> Hariç Tutulan</div>
                        </div>
                        <div>Top. {tabPermissions.length} yetki listeleniyor</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StepPreview = ({ formData, departments, jobPositions, employees }) => {
    const primaryManagers = formData.primary_managers || [];

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                    <Check size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Kaydı Tamamla</h2>
                <p className="text-slate-500 mt-2">Lütfen bilgileri son kez kontrol ediniz.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                <div className="p-4 flex flex-col md:flex-row gap-1 md:gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-full md:w-1/3 text-slate-500 font-medium">Ad Soyad</div>
                    <div className="font-bold text-slate-800">{formData.first_name} {formData.last_name}</div>
                </div>
                <div className="p-4 flex flex-col md:flex-row gap-1 md:gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-full md:w-1/3 text-slate-500 font-medium">TC Kimlik No</div>
                    <div className="font-bold text-slate-800">{formData.tc_number}</div>
                </div>
                <div className="p-4 flex flex-col md:flex-row gap-1 md:gap-4 hover:bg-slate-50 transition-colors bg-blue-50/30">
                    <div className="w-full md:w-1/3 text-slate-500 font-medium">Birincil Yöneticiler</div>
                    <div className="font-bold text-blue-700">
                        {primaryManagers.length > 0 ? (
                            <div className="space-y-1">
                                {primaryManagers.map((pm, idx) => {
                                    const mgrEmp = pm.manager_id ? employees.find(e => e.id == pm.manager_id) : null;
                                    const deptName = pm.department_id ? departments.find(d => d.id == pm.department_id)?.name : '-';
                                    const posName = pm.job_position_id ? jobPositions.find(p => p.id == pm.job_position_id)?.name : '-';
                                    return (
                                        <div key={idx} className="text-sm">
                                            <span className="font-bold">{mgrEmp ? `${mgrEmp.first_name} ${mgrEmp.last_name}` : '-'}</span>
                                            <span className="text-blue-500 mx-1">|</span>
                                            <span className="text-slate-600">{deptName}</span>
                                            <span className="text-blue-500 mx-1">|</span>
                                            <span className="text-slate-600">{posName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : '-'}
                    </div>
                </div>

                {(formData.substitutes?.length > 0) && (
                    <div className="p-4 flex flex-col md:flex-row gap-1 md:gap-4 hover:bg-slate-50 transition-colors bg-indigo-50/30">
                        <div className="w-full md:w-1/3 text-slate-500 font-medium">Vekiller</div>
                        <div className="font-bold text-indigo-700">{formData.substitutes.length} Kişi Seçildi</div>
                    </div>
                )}


                <div className="p-4 flex flex-col md:flex-row gap-1 md:gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-full md:w-1/3 text-slate-500 font-medium">Yetkiler</div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                        <Key size={16} className="text-blue-500" />
                        <span>{(formData.roles?.length || 0)} Rol + {(formData.direct_permissions?.length || 0)} Ek Yetki</span>
                    </div>
                </div>
                <div className="p-4 flex flex-col md:flex-row gap-1 md:gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-full md:w-1/3 text-slate-500 font-medium">Kullanıcı Adı</div>
                    <div className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-sm">{formData.username}</div>
                </div>
            </div>
        </div>
    );
};

const Employees = () => {
    const { user, hasPermission } = useAuth();
    const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [permissions, setPermissions] = useState([]); // [RESTORED]
    const [workSchedules, setWorkSchedules] = useState([]); // Added
    const [roles, setRoles] = useState([]); // [NEW]
    const [availableTags, setAvailableTags] = useState([]); // [NEW]
    const [hierarchyData, setHierarchyData] = useState([]);
    const [collapsedNodes, setCollapsedNodes] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [showManagerValidation, setShowManagerValidation] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [positionFilter, setPositionFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showSettings, setShowSettings] = useState(false); // Toggle management mode

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [empRes, deptRes, posRes, permRes, schedRes, roleRes, tagsRes, hierRes] = await Promise.all([
                api.get('/employees/'),
                api.get('/departments/'),
                api.get('/job-positions/'),
                api.get('/permissions/'),
                api.get('/attendance/fiscal-calendars/'),
                api.get('/roles/'),
                api.get('/employee-tags/'),
                api.get('/departments/hierarchy/').catch(() => ({ data: [] }))
            ]);
            setEmployees(empRes.data.results || empRes.data);
            setDepartments(deptRes.data.results || deptRes.data);
            setJobPositions(posRes.data.results || posRes.data);
            setPermissions(permRes.data.results || permRes.data);
            setWorkSchedules(schedRes.data.results || schedRes.data);
            setRoles(roleRes.data.results || roleRes.data);
            setAvailableTags(tagsRes.data.results || tagsRes.data);
            setHierarchyData(hierRes.data || []);
        } catch (error) {
            console.error("Data fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers ---
    const generateUsername = (first, last) => {
        if (!first || !last) return '';
        const trMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U' };
        const cleanFirst = first.toLowerCase().replace(/[çğıöşü]/g, l => trMap[l]).replace(/[^a-z0-9]/g, '');
        const cleanLast = last.toLowerCase().replace(/[çğıöşü]/g, l => trMap[l]).replace(/[^a-z0-9]/g, '');
        return `${cleanFirst}.${cleanLast}`;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            // Logic: First primary manager auto-dept (legacy reports_to davranışı)
            // primary_managers array değiştiğinde ilk yöneticinin departmanını ata
            if (field === 'primary_managers' && Array.isArray(value) && value.length > 0) {
                const firstMgrId = value[0]?.manager_id;
                if (firstMgrId) {
                    const manager = employees.find(e => e.id == firstMgrId);
                    if (manager && manager.department) {
                        newState.department = manager.department.id || manager.department;
                    }
                }
            }

            // Logic: Job Position -> Auto Roles [NEW]
            if (field === 'job_position') {
                const pos = jobPositions.find(p => p.id == value);
                if (pos && pos.default_roles) {
                    newState.roles = pos.default_roles.map(r => r.id);
                }
            }

            // Auto-generate username/email draft if creating
            if (viewMode === 'create' && (field === 'first_name' || field === 'last_name')) {
                const username = generateUsername(newState.first_name, newState.last_name);
                newState.username = username;
                if (!prev.email) newState.email = `${username}@megamuhendislik.com.tr`;
            }
            return newState;
        });
    };

    // --- Wizard Navigation ---
    const validateStep = (step) => {
        const { first_name, last_name, tc_number, email } = formData;
        switch (step) {
            case 1: // Personal
                return first_name && last_name && tc_number && email && formData.username && formData.password;
            case 2: {
                let valid = !!formData.employee_code;
                if (!valid) return false;

                // Board muafiyet kontrolü (first primary manager's dept+pos)
                const pm = formData.primary_managers || [];
                const firstPm = pm.find(m => m.department_id && m.job_position_id);
                const selDept = firstPm ? departments.find(d => String(d.id) === String(firstPm.department_id)) : null;
                const selPos = firstPm ? jobPositions.find(p => String(p.id) === String(firstPm.job_position_id)) : null;
                const boardExempt = selDept?.code?.startsWith('BOARD') || selPos?.key?.startsWith('BOARD_') || false;

                // Birincil yönetici zorunlu (board hariç)
                if (!boardExempt) {
                    if (pm.length === 0 || pm.some(e => !e.manager_id || !e.department_id || !e.job_position_id)) {
                        return false;
                    }
                }
                // İkincil yönetici satırlarında eksik alan varsa engelle
                const sm = formData.secondary_managers || [];
                if (sm.length > 0 && sm.some(e => !e.manager_id || !e.department_id || !e.job_position_id)) {
                    return false;
                }
                return true;
            }
            case 3: // Contact
                return true; // Optional fields mostly
            case 4: // Details
                return true; // Optional
            case 5: // Permissions
                return true; // Optional
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep === 2) setShowManagerValidation(false);
            setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
            setCurrentStep(prev => Math.min(prev + 1, 7));
            window.scrollTo(0, 0);
        } else {
            if (currentStep === 2) setShowManagerValidation(true);
            toast.error("Lütfen zorunlu alanları doldurunuz.");
        }
    };

    const handleAddNew = () => {
        setFormData({ ...INITIAL_FORM_STATE, substitutes: [], roles: [], secondary_job_positions: [], excluded_permissions: [] });
        setViewMode('create');
        setCurrentStep(1);
        setCompletedSteps([]);
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo(0, 0);
    };

    const goToStep = (step, fromError = false) => {
        // Allow: going back, staying on current, or error-driven navigation
        // Block: skipping ahead past current step unless validation passes
        if (step > currentStep && !fromError) {
            for (let s = currentStep; s < step; s++) {
                if (!validateStep(s)) {
                    toast.error(`Lütfen önce "${STEPS[s - 1].title}" adımını tamamlayınız.`);
                    return;
                }
            }
        }
        setCurrentStep(step);
        setFormErrors(prev => {
            const next = { ...prev };
            delete next[step];
            return next;
        });
        window.scrollTo(0, 0);
    };

    const handleDelete = async (employeeId) => {
        if (!window.confirm("Bu personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz (soft delete).")) return;

        try {
            await api.delete(`/employees/${employeeId}/`);
            alert("Personel silindi.");
            fetchInitialData();
        } catch (error) {
            console.error("Delete error:", error);
            alert("Silme işlemi başarısız: " + (error.response?.data?.error || "Yetkiniz yok."));
        }
    };

    const handleEdit = (emp) => {
        // Populate formData from emp
        // Need to parse permissions, schedule etc.
        const workSched = emp.work_schedule?.id || '';
        const customSched = emp.work_schedule ? {} : (emp.weekly_schedule || {});

        // Find reverse lookup for roles vs direct (this is tricky in frontend, 
        // but for now we just load what we have. 
        // Ideally we fetch DETAIL for this employee to get full perms. 
        // We will do a Quick Fetch using ID.
        loadEmployeeDetail(emp.original_id || emp.id);
    };

    const loadEmployeeDetail = async (id) => {
        setLoading(true);
        try {
            const res = await api.get(`/employees/${id}/`);
            const data = res.data;

            // Transform to Form Data
            const newForm = {
                id: data.id, // Important for update
                first_name: data.first_name,
                last_name: data.last_name,
                tc_number: data.tc_number || '',
                birth_date: data.birth_date || '',
                birth_place: data.birth_place || '',
                email: data.email,
                username: data.user?.username || '', // Read only usually

                department: data.department?.id || data.department,
                job_position: data.job_position?.id || data.job_position,
                primary_managers: (data.primary_managers || []).map(m => ({
                    manager_id: m.id,
                    department_id: m.department_id || '',
                    job_position_id: m.job_position_id || ''
                })),
                secondary_managers: (data.secondary_managers || []).map(m => ({
                    manager_id: m.id,
                    department_id: m.department_id || '',
                    job_position_id: m.job_position_id || ''
                })),
                // functional_department: data.functional_unit || '', // REMOVED
                tags: (data.tags || []).map(t => t.id), // Map Tags

                employee_code: data.employee_code,
                card_uid: data.card_uid || '',
                employment_status: data.employment_status,
                work_type: data.work_type,
                uses_service: data.uses_service || false, // [NEW]
                service_tolerance_minutes: data.service_tolerance_minutes || 0,
                hired_date: data.hired_date || '',

                // Annual Leave
                annual_leave_balance: data.annual_leave_balance || 0,
                completed_annual_leave_total: data.completed_annual_leave_total || 0,
                completed_annual_leave_this_year: data.completed_annual_leave_this_year || 0,
                annual_leave_advance_limit: data.annual_leave_advance_limit || 0,
                annual_leave_accrual_rate: data.annual_leave_accrual_rate || 14,
                auto_calculated_rate: data.auto_calculated_rate || null,
                leave_entitlements: data.leave_entitlements || [],

                // Calendar & Assignments
                work_schedule: data.work_schedule?.id || '',
                fiscal_calendar: data.fiscal_calendar || '', // Added (Backend returns ID)
                weekly_schedule: data.weekly_schedule || {},

                // Matrix Assignments (Map from backend format to frontend)
                assignments: (data.assignments || [])
                    .filter(a => !a.is_primary)
                    .map(a => ({
                        department_id: a.department_id || a.department?.id || a.department,
                        job_position_id: a.job_position_id || a.job_position?.id || a.job_position,
                        manager_id: a.manager_id || a.manager?.id || '', // New
                        // functional_unit_id: a.functional_unit_id || a.functional_unit?.id || '' // REMOVED
                    })),

                // Schedule Overrides mapping
                daily_break_allowance: data.daily_break_allowance || '',
                attendance_tolerance_minutes: data.attendance_tolerance_minutes || '',
                shift_start: data.shift_start || '',
                shift_end: data.shift_end || '',
                lunch_start: data.lunch_start || '',
                lunch_end: data.lunch_end || '',
                attendance_rules: data.attendance_rules || '',

                phone: data.phone || '', // Existing lines continue...


                phone_secondary: data.phone_secondary || '',
                address: data.address || '',
                emergency_contact_name: data.emergency_contact_name || '',
                emergency_contact_phone: data.emergency_contact_phone || '',

                title: data.title || '',
                job_description: data.job_description || '',
                technical_skills: data.technical_skills || [],
                certificates: data.certificates || [],
                foreign_languages: data.foreign_languages || [],

                substitutes: data.substitutes || [], // [NEW] - Ensure this is populated if API returns IDs
                roles: data.roles ? data.roles.map(r => r.id || r) : [],

                direct_permissions: data.direct_permissions ? data.direct_permissions.map(p => p.id) : [],
                excluded_permissions: data.excluded_permissions ? data.excluded_permissions.map(p => p.id) : [],
                password: '', // Don't populate
            };

            setFormData(newForm);
            setViewMode('edit');
            setCurrentStep(1);
        } catch (err) {
            console.error(err);
            alert("Detaylar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Payload Prep
            const cleanPayload = { ...formData };

            // Convert empty strings to null for optional fields
            Object.keys(cleanPayload).forEach(key => {
                if (cleanPayload[key] === '') {
                    cleanPayload[key] = null;
                }
            });

            const payload = {
                ...cleanPayload,
                // functional_unit: cleanPayload.functional_department || null, // REMOVED
                work_schedule: cleanPayload.work_schedule || null,
                // Force null for override fields to strictly enforce Fiscal Calendar defaults
                shift_start: null,
                shift_end: null,
                lunch_start: null,
                lunch_end: null,
                daily_break_allowance: null,
                // attendance_tolerance_minutes: null, // Allow editing/saving
                service_tolerance_minutes: cleanPayload.uses_service ? (cleanPayload.service_tolerance_minutes || null) : null,
                weekly_schedule: null, // Force remove any legacy weekly schedule data
                // assignments is already in cleanPayload
            };

            if (viewMode === 'create') {
                const res = await api.post('/employees/', payload);
                const newId = res.data.id;

                // [NEW] Update Entitlements for new employee
                // (Now handled by POST /employees/)
                // if (payload.leave_entitlements && payload.leave_entitlements.length > 0) {
                //     await api.post(`/employees/${newId}/update_entitlements/`, {
                //         entitlements: payload.leave_entitlements
                //     });
                // }

                toast.success("Personel ve Kullanıcı Hesabı başarıyla oluşturuldu.");
            } else if (viewMode === 'edit') {
                if (!payload.password) delete payload.password;
                await api.patch(`/employees/${payload.id}/`, payload);
                toast.success("Personel bilgileri güncellendi.");
            }

            fetchInitialData();
            setViewMode('list');
            setFormData(INITIAL_FORM_STATE);
            setCurrentStep(1);
            setShowManagerValidation(false);
        } catch (error) {
            console.error("Submit Error:", error);
            const errData = error.response?.data;

            if (!errData) {
                toast.error("Bağlantı hatası. Lütfen tekrar deneyin.");
                return;
            }

            // Parse field-level errors and map to steps
            const stepErrors = {};
            const errorMessages = [];

            if (typeof errData === 'string') {
                errorMessages.push(errData);
            } else if (errData.detail) {
                errorMessages.push(typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail));
            } else if (errData.non_field_errors) {
                const nfe = Array.isArray(errData.non_field_errors) ? errData.non_field_errors : [errData.non_field_errors];
                errorMessages.push(...nfe.map(e => typeof e === 'string' ? e : JSON.stringify(e)));
            } else {
                Object.entries(errData).forEach(([field, msgs]) => {
                    const step = FIELD_TO_STEP[field] || 1;
                    if (!stepErrors[step]) stepErrors[step] = [];
                    const msgText = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
                    stepErrors[step].push({ field, message: msgText });
                    errorMessages.push(msgText);
                });
            }

            setFormErrors(stepErrors);

            // Navigate to first errored step
            const errorSteps = Object.keys(stepErrors).map(Number).sort((a, b) => a - b);
            if (errorSteps.length > 0) {
                goToStep(errorSteps[0], true);
                toast.error(`${errorSteps.length} adımda hata bulundu. İlk hatalı adıma yönlendirildiniz.`);
            } else if (errorMessages.length > 0) {
                toast.error("Hata: " + errorMessages[0]);
            } else {
                toast.error("İşlem başarısız. Lütfen bilgileri kontrol ediniz.");
            }

            if (errData.primary_managers) {
                setShowManagerValidation(true);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // --- UI Components ---
    // Moved outside of component scope to fix focus issues

    // --- Render Steps ---
    // Using external components StepPersonal, StepCorporate, etc.

    // --- Main Render ---

    if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

    if (viewMode === 'list') {
        // Search filter for hierarchy
        const searchLower = searchTerm.toLocaleLowerCase('tr-TR');
        const matchesSearch = (emp) => {
            if (!searchTerm) return true;
            return (emp.name || '').toLocaleLowerCase('tr-TR').includes(searchLower) ||
                (emp.title || '').toLocaleLowerCase('tr-TR').includes(searchLower);
        };

        // Toggle collapse
        const toggleNode = (nodeId) => {
            setCollapsedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
        };

        // Find employee data from employees array by id
        const getEmpData = (empId) => {
            const id = typeof empId === 'string' && empId.includes('-') ? null : empId;
            return id ? employees.find(e => e.id === id) : null;
        };

        // Render a single employee row in the tree
        const renderEmployeeRow = (emp, depth = 0, parentKey = '') => {
            const empData = getEmpData(emp.id);
            const hasChildren = (emp.children && emp.children.length > 0);
            const nodeKey = `emp-${parentKey}-${emp.id}`;
            const isCollapsed = collapsedNodes[nodeKey];
            const show = matchesSearch(emp) || !searchTerm;

            if (!show && !hasChildren) return null;

            const rows = [];
            rows.push(
                <div key={nodeKey} className="group flex items-center gap-2 py-2.5 px-4 hover:bg-blue-50/40 transition-colors border-b border-slate-50" style={{ paddingLeft: `${16 + depth * 28}px` }}>
                    {/* Expand/Collapse */}
                    <button
                        onClick={() => hasChildren && toggleNode(nodeKey)}
                        className={`w-5 h-5 flex items-center justify-center rounded transition-all shrink-0 ${hasChildren ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-100 cursor-pointer' : 'invisible'}`}
                    >
                        {hasChildren && (isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
                    </button>

                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg ${hasChildren ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'} text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}>
                        {(emp.name || '??').split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>

                    {/* Name & Title */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm truncate ${hasChildren ? 'text-slate-900' : 'text-slate-700'}`}>{emp.name}</span>
                            {emp.is_secondary && <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Matrix</span>}
                        </div>
                        <span className="text-xs text-slate-500 truncate block">{emp.title}</span>
                    </div>

                    {/* Employee code */}
                    {empData && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded hidden md:inline-block shrink-0">#{empData.employee_code}</span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {showSettings ? (
                            <>
                                <button onClick={() => empData && handleEdit(empData)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Düzenle"><Edit2 size={15} /></button>
                                {hasPermission('PAGE_EMPLOYEES') && empData && (
                                    <button onClick={() => handleDelete(empData.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Sil"><Trash2 size={15} /></button>
                                )}
                            </>
                        ) : (
                            <button onClick={() => empData && handleEdit(empData)} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 text-xs font-bold transition-colors">Detay</button>
                        )}
                    </div>
                </div>
            );

            // Render children recursively
            if (hasChildren && !isCollapsed) {
                emp.children.forEach(child => {
                    // If child is a department
                    if (child.employees !== undefined) {
                        rows.push(...renderDepartmentNode(child, depth + 1, nodeKey));
                    } else {
                        const childRows = renderEmployeeRow(child, depth + 1, nodeKey);
                        if (childRows) rows.push(...(Array.isArray(childRows) ? childRows : [childRows]));
                    }
                });
            }

            return rows;
        };

        // Render a department node in the tree
        const renderDepartmentNode = (dept, depth = 0, parentKey = '') => {
            const nodeKey = `dept-${parentKey}-${dept.id}`;
            const isCollapsed = collapsedNodes[nodeKey];
            const empCount = (dept.employees || []).length;
            const childDeptCount = (dept.children || []).length;
            const hasContent = empCount > 0 || childDeptCount > 0;

            const rows = [];
            rows.push(
                <div key={nodeKey} className="flex items-center gap-2 py-2.5 px-4 bg-slate-50/80 border-b border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors" style={{ paddingLeft: `${16 + depth * 28}px` }} onClick={() => hasContent && toggleNode(nodeKey)}>
                    <button className={`w-5 h-5 flex items-center justify-center rounded transition-all shrink-0 ${hasContent ? 'text-slate-500' : 'invisible'}`}>
                        {hasContent && (isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
                    </button>
                    <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Building size={13} />
                    </div>
                    <span className="font-bold text-sm text-slate-700">{dept.name}</span>
                    <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-100">{dept.code}</span>
                </div>
            );

            if (!isCollapsed) {
                // Render employees (flatten merged groups)
                (dept.employees || []).forEach(emp => {
                    if (emp.type === 'group' && emp.employees) {
                        // Merged admin group — render each employee
                        emp.employees.forEach(subEmp => {
                            const subRows = renderEmployeeRow(subEmp, depth + 1, nodeKey);
                            if (subRows) rows.push(...(Array.isArray(subRows) ? subRows : [subRows]));
                        });
                        // Render children departments of the merged group
                        (emp.children || []).forEach(child => {
                            if (child.employees !== undefined) {
                                rows.push(...renderDepartmentNode(child, depth + 1, nodeKey));
                            } else {
                                const childRows = renderEmployeeRow(child, depth + 1, nodeKey);
                                if (childRows) rows.push(...(Array.isArray(childRows) ? childRows : [childRows]));
                            }
                        });
                    } else {
                        const empRows = renderEmployeeRow(emp, depth + 1, nodeKey);
                        if (empRows) rows.push(...(Array.isArray(empRows) ? empRows : [empRows]));
                    }
                });

                // Render child departments
                (dept.children || []).forEach(child => {
                    rows.push(...renderDepartmentNode(child, depth + 1, nodeKey));
                });
            }

            return rows;
        };

        return (
            <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 animate-fade-in">
                <Toaster position="top-right" />
                <div className="max-w-[1600px] mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personel Yönetimi</h1>
                            <p className="text-slate-500 mt-1 flex items-center gap-2"><Network size={16} /> Hiyerarşik Görünüm</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {hasPermission('PAGE_EMPLOYEES') && (
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className={`
                                        h-12 px-4 rounded-xl font-bold flex items-center gap-2 border transition-all duration-300
                                        ${showSettings
                                            ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-amber-500/10'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                                        }
                                    `}
                                >
                                    <Settings size={20} className={showSettings ? 'animate-spin-slow' : ''} />
                                    {showSettings ? 'Yönetimi Kapat' : 'Yönet'}
                                </button>
                            )}

                            {hasPermission('PAGE_EMPLOYEES') && (
                                <button
                                    onClick={handleAddNew}
                                    className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <UserPlus size={20} /> Yeni Ekle
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-center flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                placeholder="İsim, unvan ara..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-1.5 transition-all text-sm shrink-0"
                            >
                                <X size={16} /> Temizle
                            </button>
                        )}
                        <button
                            onClick={() => setCollapsedNodes({})}
                            className="h-12 px-4 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-medium flex items-center gap-1.5 transition-all text-sm border border-slate-200 shrink-0"
                        >
                            <ChevronDown size={16} /> Tümünü Aç
                        </button>
                        <button
                            onClick={() => {
                                // Collapse all nodes
                                const allCollapsed = {};
                                const collapseAll = (nodes, prefix = '') => {
                                    (nodes || []).forEach(dept => {
                                        const key = `dept-${prefix}-${dept.id}`;
                                        allCollapsed[key] = true;
                                        (dept.employees || []).forEach(emp => {
                                            if (emp.children?.length) allCollapsed[`emp-${key}-${emp.id}`] = true;
                                            if (emp.type === 'group') {
                                                (emp.employees || []).forEach(sub => { if (sub.children?.length) allCollapsed[`emp-${key}-${sub.id}`] = true; });
                                            }
                                        });
                                        collapseAll(dept.children, key);
                                    });
                                };
                                collapseAll(hierarchyData);
                                setCollapsedNodes(allCollapsed);
                            }}
                            className="h-12 px-4 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-medium flex items-center gap-1.5 transition-all text-sm border border-slate-200 shrink-0"
                        >
                            <ChevronRight size={16} /> Tümünü Kapat
                        </button>
                    </div>

                    {/* Hierarchical Tree View */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {hierarchyData.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {hierarchyData.map(dept => renderDepartmentNode(dept, 0, ''))}
                            </div>
                        ) : (
                            <div className="px-6 py-12 text-center text-slate-500">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                    <Network size={32} />
                                </div>
                                <p className="font-medium">Hiyerarşi verisi bulunamadı.</p>
                                <p className="text-sm mt-1">Organizasyon şeması henüz yapılandırılmamış olabilir.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Step Progress Calculation
    const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 px-2 md:py-10 md:px-4 font-sans text-slate-900">
            {/* Nav Back */}
            <div className="w-full max-w-7xl mb-6">
                <button
                    onClick={() => setViewMode('list')}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold transition-colors group"
                >
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-400 transition-colors shadow-sm">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="text-lg">Personel Listesine Dön</span>
                </button>
            </div>

            {/* Main Card Container */}
            <div className={`w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[400px] md:min-h-[700px] flex flex-col ${viewMode === 'create' ? 'md:flex-row' : ''}`}> {/* Full width for edit */}

                {/* Left Sidebar - Stepper (Only for Wizard/Create) */}
                {viewMode === 'create' && (
                    <div className="w-full md:w-80 bg-slate-900 text-white p-4 md:p-8 flex flex-col relative overflow-hidden shrink-0">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 left-0 w-full h-full bg-slate-900 z-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                        </div>

                        <div className="relative z-10">
                            <div className="mb-10">
                                <div className="flex items-center gap-3 mb-2 opacity-80">
                                    <UserPlus size={24} className="text-blue-400" />
                                    <span className="text-xs font-bold tracking-widest uppercase text-blue-200">İK YÖNETİMİ</span>
                                </div>
                                <h2 className="text-3xl font-bold leading-tight">Personel<br /><span className="text-blue-400">Oluşturma</span></h2>
                            </div>

                            {/* Vertical Steps */}
                            <div className="space-y-1 relative">
                                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-700/50 z-0"></div>
                                {STEPS.map((s) => {
                                    const isActive = currentStep === s.number;
                                    const isCompleted = currentStep > s.number;
                                    const hasError = formErrors[s.number] && formErrors[s.number].length > 0;
                                    const errorCount = hasError ? formErrors[s.number].length : 0;

                                    return (
                                        <div
                                            key={s.number}
                                            className="relative z-10 flex items-center gap-4 py-4 group cursor-pointer"
                                            onClick={() => goToStep(s.number, hasError)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={e => e.key === 'Enter' && goToStep(s.number, hasError)}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 shrink-0 relative ${
                                                hasError
                                                    ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                                    : isActive
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110'
                                                        : isCompleted
                                                            ? 'bg-green-500/20 border-green-500 text-green-400'
                                                            : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:border-slate-500'
                                            }`}>
                                                {hasError ? (
                                                    <span className="text-sm font-bold">!</span>
                                                ) : isCompleted ? (
                                                    <Check size={16} />
                                                ) : (
                                                    <span className="text-sm font-bold">{s.number}</span>
                                                )}
                                                {hasError && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                                        {errorCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-bold transition-colors ${
                                                    hasError ? 'text-red-400' : isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-400 group-hover:text-slate-300'
                                                }`}>{s.title}</h4>
                                                {isActive && !hasError && <p className="text-[10px] text-blue-200 mt-0.5 animate-fade-in">Mevcut Adım</p>}
                                                {hasError && (
                                                    <p className="text-[10px] text-red-300 mt-0.5 truncate max-w-[160px]">
                                                        {formErrors[s.number].map(e => e.message).join(' · ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-auto relative z-10 pt-8 opacity-60 text-xs text-slate-400 text-center">MEGA PORTAL v1.0 &copy; 2025</div>
                    </div>
                )}

                {/* Right Content Area */}
                <div className="flex-1 bg-white flex flex-col h-full max-h-[calc(100vh-100px)]"> {/* Constrain height for scrolling */}
                    {/* Header */}
                    <div className="px-4 py-4 md:px-10 md:py-6 border-b border-slate-100 flex flex-wrap justify-between items-center bg-white sticky top-0 z-20 gap-2">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                {viewMode === 'edit' ? <Edit2 className="text-blue-600" size={28} /> : (STEPS[currentStep - 1]?.icon && React.createElement(STEPS[currentStep - 1].icon, { className: "text-blue-600", size: 24 }))}
                                {viewMode === 'edit' ? 'Personel Düzenle' : STEPS[currentStep - 1]?.title}
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">{viewMode === 'edit' ? 'Tüm bilgileri tek ekranda güncelleyebilirsiniz.' : 'Lütfen gerekli bilgileri eksiksiz doldurunuz.'}</p>
                        </div>
                        <div className="text-slate-400 text-sm font-medium bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                            {viewMode === 'edit' ? 'Hızlı Düzenleme Modu' : `Adım ${currentStep} / ${STEPS.length}`}
                        </div>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar scroll-smooth">
                        {viewMode === 'edit' ? (
                            /* EDIT MODE: SINGLE PAGE SCROLL */
                            <div className="max-w-full md:max-w-4xl mx-auto space-y-6 md:space-y-12 pb-20">
                                {/* Section 1: Personal */}
                                <section id="sec-personal" className="scroll-mt-24">
                                    {/* Re-using Step Components directly */}
                                    {/* Note: Step components have internal headers, so we can just stack them */}
                                    <StepPersonal
                                        formData={formData}
                                        handleChange={handleInputChange}
                                        canEditSensitive={hasPermission('PAGE_EMPLOYEES')}
                                        canChangePassword={hasPermission('PAGE_EMPLOYEES')}
                                    />
                                </section>

                                {/* Section 2: Corporate */}
                                <section id="sec-corporate" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepCorporate formData={formData} handleChange={handleInputChange} departments={departments} jobPositions={jobPositions} employees={employees} showManagerValidation={showManagerValidation} />
                                </section>

                                {/* Section 3: Contact */}
                                <section id="sec-contact" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepContact formData={formData} handleChange={handleInputChange} />
                                </section>

                                {/* Section 4: Details */}
                                <section id="sec-details" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepDetails formData={formData} handleChange={handleInputChange} workSchedules={workSchedules} />
                                </section>

                                {/* Section 5: Annual Leave (Edit Mode) */}
                                <section id="sec-leave" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepLeave formData={formData} handleChange={handleInputChange} />
                                </section>

                                {/* Section 5: Permissions */}
                                {hasPermission('SYSTEM_FULL_ACCESS') && (
                                    <section id="sec-permissions" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                        <StepPermissions formData={formData} handleChange={handleInputChange} permissions={permissions} jobPositions={jobPositions} roles={roles} canManageRoles={true} />
                                    </section>
                                )}
                            </div>
                        ) : (
                            /* CREATE WIZARD MODE */
                            <div className="h-full">
                                {/* Error Summary Banner */}
                                {Object.keys(formErrors).length > 0 && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in-up">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-bold text-red-800 flex items-center gap-2">
                                                <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">!</span>
                                                Kayıt Hataları
                                            </h4>
                                            <button onClick={() => setFormErrors({})} className="text-xs text-red-400 hover:text-red-600 font-medium">Kapat</button>
                                        </div>
                                        <div className="space-y-1">
                                            {Object.entries(formErrors).sort(([a], [b]) => Number(a) - Number(b)).map(([step, errors]) => (
                                                errors.map((err, i) => (
                                                    <div key={`${step}-${i}`} className="flex items-center gap-2 text-xs">
                                                        <span className="text-red-400">&#x2022;</span>
                                                        <span className="text-red-700 flex-1">{err.message}</span>
                                                        <button
                                                            onClick={() => goToStep(Number(step), true)}
                                                            className="text-blue-600 hover:text-blue-800 underline shrink-0 text-[11px]"
                                                        >
                                                            {STEPS.find(s => s.number === Number(step))?.title || `Adım ${step}`}
                                                        </button>
                                                    </div>
                                                ))
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {currentStep === 1 && <StepPersonal formData={formData} handleChange={handleInputChange} canEditSensitive={true} canChangePassword={true} />}
                                {currentStep === 2 && <StepCorporate formData={formData} handleChange={handleInputChange} departments={departments} jobPositions={jobPositions} employees={employees} showManagerValidation={showManagerValidation} />}
                                {currentStep === 3 && <StepContact formData={formData} handleChange={handleInputChange} />}
                                {currentStep === 4 && <StepDetails formData={formData} handleChange={handleInputChange} workSchedules={workSchedules} />}
                                {currentStep === 5 && <StepLeave formData={formData} handleChange={handleInputChange} />}
                                {currentStep === 6 && hasPermission('SYSTEM_FULL_ACCESS') && <StepPermissions formData={formData} handleChange={handleInputChange} permissions={permissions} jobPositions={jobPositions} roles={roles} canManageRoles={true} />}
                                {currentStep === 6 && !hasPermission('SYSTEM_FULL_ACCESS') && (
                                    <div className="flex flex-col items-center justify-center h-full p-4 md:p-10 text-center animate-fade-in">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400"><Key size={32} /></div>
                                        <h3 className="text-xl font-bold text-slate-700">Yetkilendirme Erişimi Kısıtlı</h3>
                                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                                            Bu personel için rol ve yetki tanımlama yetkiniz bulunmuyor. Varsayılan roller (pozisyona göre) otomatik atanacaktır.
                                            <br /><br />Devam etmek için <strong>"Devam Et"</strong> butonuna tıklayınız.
                                        </p>
                                    </div>
                                )}
                                {currentStep === 7 && <StepPreview formData={formData} departments={departments} jobPositions={jobPositions} employees={employees} />}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center sticky bottom-0 z-20 w-full gap-2">
                        {/* Back / Cancel Button */}
                        <button
                            onClick={viewMode === 'edit' ? () => setViewMode('list') : handleBack}
                            disabled={viewMode === 'create' && currentStep === 1}
                            className={`
                                h-12 px-6 rounded-xl font-bold flex items-center gap-2 transition-all
                                ${(viewMode === 'create' && currentStep === 1)
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200'}
                            `}
                        >
                            <ArrowLeft size={20} />
                            {viewMode === 'edit' ? 'Vazgeç ve Dön' : 'Geri'}
                        </button>

                        {/* Save / Next Button */}
                        <button
                            onClick={viewMode === 'create' ? (currentStep === 7 ? handleSubmit : handleNext) : handleSubmit}
                            disabled={submitting}
                            className={`
                                h-12 px-8 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all transform active:scale-95
                                ${submitting ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:-translate-y-1'}
                            `}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    İşleniyor...
                                </>
                            ) : (
                                <>
                                    {viewMode === 'edit' ? 'Değişiklikleri Kaydet' : (currentStep === 7 ? 'Kaydet ve Tamamla' : 'Devam Et')}
                                    {viewMode === 'create' && currentStep !== 7 && <ArrowRight size={20} />}
                                    {viewMode === 'edit' && <Save size={20} />}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Styles */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                .animate-fade-in-up {
                     animation: fade-in 0.4s ease-out forwards; 
                }
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1; 
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8; 
                }
            `}</style>
        </div>
    );

};

export default Employees;



