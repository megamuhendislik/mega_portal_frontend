import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ChevronDown, Check, X, UserPlus, Building, Briefcase, Phone, FileText, ArrowRight, ArrowLeft, Loader2, Save, Key } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Trash2, Edit2, Download, Upload, CalendarRange } from 'lucide-react';
import WeeklyScheduleEditor from '../components/WeeklyScheduleEditor';

// --- Constants ---
const STEPS = [
    { number: 1, title: 'Kişisel Bilgiler', icon: UserPlus },
    { number: 2, title: 'Kurumsal Bilgiler', icon: Building },
    { number: 3, title: 'İletişim & Acil', icon: Phone },
    { number: 4, title: 'Detaylar & Yetkinlik', icon: Briefcase },
    { number: 5, title: 'Yetkilendirme', icon: Key }, // New Step
    { number: 6, title: 'Önizleme & Onay', icon: FileText }
];

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
    secondary_job_positions: [], // List of IDs
    reports_to: '', // Manager ID (Primary)
    // cross_manager_ids: [], // REMOVED
    substitutes: [], // [NEW] Substitutes
    functional_department: '', // Attribute (stored in secondary_departments)
    secondary_departments: [], // Additional depts

    employee_code: '',

    employment_status: 'ACTIVE',
    work_type: 'FULL_TIME',
    uses_service: false, // [NEW] Service Usage
    remote_work_days: [], // ['MON', 'WED']

    hired_date: new Date().toISOString().split('T')[0],

    // ...

    // System
    password: '', // Default initial password
    username: '' // Will be auto-generated or manual
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

const StepPersonal = ({ formData, handleChange }) => (
    <div className="animate-fade-in-up">
        <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800">Kişisel Kimlik Bilgileri</h3>
            <p className="text-slate-500 text-sm">Personelin temel kimlik ve iletişim detayları.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <InputField label="Ad" value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} required placeholder="Personel Adı" />
            <InputField label="Soyad" value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} required placeholder="Personel Soyadı" />
            <InputField label="TC Kimlik No" value={formData.tc_number} onChange={e => handleChange('tc_number', e.target.value)} required placeholder="11 haneli TC no" />
            <InputField
                label="E-posta"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                required
                type="email"
                placeholder="isim.soyisim@megamuhendislik.com.tr"
            />

            <InputField label="Doğum Tarihi" value={formData.birth_date} onChange={e => handleChange('birth_date', e.target.value)} type="date" />
            <InputField label="Kullanıcı Adı" value={formData.username} onChange={e => handleChange('username', e.target.value)} required placeholder="kullanici.adi" />
            <InputField label="Şifre" value={formData.password} onChange={e => handleChange('password', e.target.value)} required type="text" placeholder="İlk giriş şifresi" />
        </div>
    </div>
);

const StepCorporate = ({ formData, handleChange, departments, jobPositions, employees }) => {
    const isDeptManager = jobPositions.find(p => p.id == formData.job_position)?.name === 'Departman Müdürü';
    const rootDepartments = departments.filter(d => !d.parent);
    const functionalDepts = departments.filter(d => d.is_chart_visible === false || d.code?.startsWith('FONKS'));
    const potentialManagers = employees.filter(e => e.is_active);

    const renderDepartmentOptions = (depts, level = 0) => {
        return depts.map(dept => {
            const children = departments.filter(d => d.parent === dept.id);
            return (
                <React.Fragment key={dept.id}>
                    <option value={dept.id}>{'\u00A0'.repeat(level * 4)}{level > 0 ? '└ ' : ''}{dept.name}</option>
                    {children.length > 0 && renderDepartmentOptions(children, level + 1)}
                </React.Fragment>
            );
        });
    };

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
                        Lütfen önce <strong>Yönetici (Reports To)</strong> seçimini yapınız. Ana departman yöneticiden otomatik çekilecektir.
                        Eğer <strong>"Departman Müdürü"</strong> unvanı seçilirse, Fonksiyonel Birim seçimi zorunlu hale gelir.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* 1. MANAGER (Optional for Top Level) */}
                <div className="md:col-span-2">
                    <SelectField
                        label="Bağlı Olduğu Yönetici (Reports To)"
                        value={formData.reports_to}
                        onChange={e => handleChange('reports_to', e.target.value)}
                        icon={UserPlus}
                        className="bg-blue-50/30 border-blue-200"
                        options={
                            <>
                                <option value="">Bir Yönetici Seçiniz (Opsiyonel / En Üst Düzey)...</option>
                                {potentialManagers.map(mgr => (
                                    <option key={mgr.id} value={mgr.id}>
                                        {mgr.first_name} {mgr.last_name} — {mgr.job_position?.name || 'Pozisyonsuz'} ({mgr.department?.name || '-'})
                                    </option>
                                ))}
                            </>
                        }
                    />
                </div>

                {/* 2. DEPARTMENT (Editable) */}
                <div>
                    <SelectField
                        label="Ana Departman"
                        value={formData.department}
                        onChange={e => handleChange('department', e.target.value)}
                        required
                        icon={Building}
                        options={
                            <>
                                <option value="">Bir Departman Seçiniz...</option>
                                {renderDepartmentOptions(rootDepartments)}
                            </>
                        }
                    />
                </div>

                {/* 3. FUNCTIONAL */}
                <div>
                    <SelectField
                        label="Fonksiyonel Birim / Disiplin"
                        value={formData.functional_department}
                        onChange={e => handleChange('functional_department', e.target.value)}
                        icon={Settings}
                        className={isDeptManager ? 'border-amber-400 bg-amber-50/50' : ''}
                        options={
                            <>
                                <option value="">Yok / Genel</option>
                                {functionalDepts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </>
                        }
                    />
                    {isDeptManager && <p className="text-xs text-amber-600 font-bold mt-1 ml-1 animate-pulse">bu alan zorunludur *</p>}
                </div>

                {/* 4. JOB POSITION */}
                <div>
                    <SelectField
                        label="Unvan (Pozisyon)"
                        value={formData.job_position}
                        onChange={e => handleChange('job_position', e.target.value)}
                        required
                        icon={Briefcase}
                        options={
                            <>
                                <option value="">Seçiniz...</option>
                                {jobPositions.map(pos => <option key={pos.id} value={pos.id}>{pos.name}</option>)}
                            </>
                        }
                    />
                </div>

                {/* 5. SECONDARY POSITIONS (Multi) */}
                <div className="md:col-span-2">
                    <div className="group">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Ek Pozisyonlar (Opsiyonel)</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-3 text-slate-400" size={18} />
                            <select
                                multiple
                                value={formData.secondary_job_positions}
                                onChange={e => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    handleChange('secondary_job_positions', selected);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none h-24"
                            >
                                {jobPositions.map(pos => (
                                    <option key={pos.id} value={pos.id}>{pos.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400 mt-1 ml-1">Birden fazla seçim için CTRL tuşuna basılı tutunuz.</p>
                        </div>
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
                                        {mgr.first_name} {mgr.last_name} — {mgr.job_position?.name || 'Pozisyonsuz'}
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
            </div>
        </div>
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
    const [customMode, setCustomMode] = useState(!formData.work_schedule);

    // Sync customMode with parent if needed, but local toggle is fine for UI
    // Logic: If user selects "Custom" in dropdown -> set work_schedule = "" -> show Editor

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

                {/* Overrides Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <Settings size={16} className="text-slate-500" />
                        Mesai Kuralları & İstisnalar (Override)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InputField type="time" label="Mesai Başlangıç" value={formData.shift_start} onChange={e => handleChange('shift_start', e.target.value)} />
                        <InputField type="time" label="Mesai Bitiş" value={formData.shift_end} onChange={e => handleChange('shift_end', e.target.value)} />
                        <InputField type="time" label="Öğle Başlangıç" value={formData.lunch_start} onChange={e => handleChange('lunch_start', e.target.value)} />
                        <InputField type="time" label="Öğle Bitiş" value={formData.lunch_end} onChange={e => handleChange('lunch_end', e.target.value)} />

                        <InputField type="number" label="Mola Hakkı (Dk)" value={formData.daily_break_allowance} onChange={e => handleChange('daily_break_allowance', e.target.value)} />
                        <InputField type="number" label="Tolerans (Dk)" value={formData.attendance_tolerance_minutes} onChange={e => handleChange('attendance_tolerance_minutes', e.target.value)} />
                    </div>

                    {/* Service Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 mt-4">
                        <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.uses_service ? 'bg-blue-600' : 'bg-slate-300'}`} onClick={() => handleChange('uses_service', !formData.uses_service)}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.uses_service ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <div>
                            <span className="font-bold text-slate-700 text-sm block">Servis Kullanıyor</span>
                            <span className="text-xs text-slate-400">İşaretlenirse, geç kalma/erken çıkmada servis toleransı uygulanır.</span>
                        </div>
                    </div>

                    <div className="text-xs text-slate-400">
                        * Değerler boş bırakılırsa varsayılan veya seçilen takvim kuralları geçerli olur. Mevcut varsayılanlar otomatik yüklenmiştir.
                    </div>
                </div>

                {/* Work Schedule Section */}
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <CalendarRange size={18} className="text-blue-500" />
                        Çalışma Takvimi
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Takvim Şablonu</label>
                            <select
                                value={formData.work_schedule || (customMode ? 'custom' : '')}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'custom') {
                                        setCustomMode(true);
                                        handleChange('work_schedule', '');
                                        // Initialize weekly_schedule if empty? Editor handles it.
                                    } else {
                                        setCustomMode(false);
                                        handleChange('work_schedule', val);
                                        handleChange('weekly_schedule', {}); // Clear custom if switching to Default
                                    }
                                }}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">Varsayılan / Yok</option>
                                <option value="custom">Özel (Custom)</option>
                                {workSchedules.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                {customMode ? "Kişiye özel haftalık program." : "Şablon seçildiğinde haftalık saatler şablondan gelir."}
                            </p>
                        </div>
                    </div>

                    {customMode && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <WeeklyScheduleEditor
                                value={formData.weekly_schedule}
                                onChange={(val) => handleChange('weekly_schedule', val)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StepPermissions = ({ formData, handleChange, permissions, jobPositions, roles }) => {
    // Group permissions
    const pagePermissions = permissions.filter(p => p.code.startsWith('VIEW_'));
    const actionPermissions = permissions.filter(p => !p.code.startsWith('VIEW_'));

    const toggleRole = (roleId) => {
        const current = formData.roles || [];
        if (current.includes(roleId)) {
            handleChange('roles', current.filter(id => id !== roleId));
        } else {
            handleChange('roles', [...current, roleId]);
        }
    };

    const togglePermission = (permId) => {
        const current = formData.direct_permissions || [];
        if (current.includes(permId)) {
            handleChange('direct_permissions', current.filter(id => id !== permId));
        } else {
            handleChange('direct_permissions', [...current, permId]);
        }
    };

    // Helper to check if a permission is already granted by a selected Role
    const isGrantedByRole = (permId) => {
        if (!formData.roles) return false;
        // Find selected roles
        const selectedRoles = roles.filter(r => formData.roles.includes(r.id));
        // Check if any has this permission (Assuming roles have 'permissions' array populated)
        return selectedRoles.some(r => r.permissions && r.permissions.some(p => p.id === permId));
    };

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Yetkilendirme ve Roller</h3>
                <p className="text-slate-500 text-sm">Kullanıcının rollerini ve sayfa erişim yetkilerini belirleyiniz.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">

                {/* COL 1: ROLES */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Briefcase size={18} className="text-blue-500" /> Roller
                    </h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {roles.map(role => {
                            const isChecked = (formData.roles || []).includes(role.id);
                            return (
                                <label key={role.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" checked={isChecked} onChange={() => toggleRole(role.id)} />
                                    <div>
                                        <div className="font-bold text-sm text-slate-800">{role.name}</div>
                                        <div className="text-[10px] text-slate-400">{role.description}</div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* COL 2: PAGE ACCESS */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-emerald-500" /> Ekran Yetkileri
                    </h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {pagePermissions.map(perm => {
                            const fromRole = isGrantedByRole(perm.id);
                            const isDirect = (formData.direct_permissions || []).includes(perm.id);
                            const isChecked = fromRole || isDirect;

                            return (
                                <label key={perm.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${isChecked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        checked={isChecked}
                                        onChange={() => togglePermission(perm.id)}
                                        disabled={fromRole}
                                    />
                                    <div>
                                        <div className="font-medium text-xs text-slate-800">{perm.name}</div>
                                        {fromRole && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded inline-block mt-0.5">Rolden Geliyor</span>}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* COL 3: ACTION ACCESS */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Key size={18} className="text-amber-500" /> İşlem Yetkileri
                    </h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {actionPermissions.map(perm => {
                            const fromRole = isGrantedByRole(perm.id);
                            const isDirect = (formData.direct_permissions || []).includes(perm.id);
                            const isChecked = fromRole || isDirect;

                            return (
                                <label key={perm.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${isChecked ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-amber-200'}`}>
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                        checked={isChecked}
                                        onChange={() => togglePermission(perm.id)}
                                        disabled={fromRole}
                                    />
                                    <div>
                                        <div className="font-medium text-xs text-slate-800">{perm.name}</div>
                                        {fromRole && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded inline-block mt-0.5">Rolden Geliyor</span>}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StepPreview = ({ formData, departments, jobPositions, employees }) => {
    const mgr = employees.find(e => e.id == formData.reports_to);
    const dept = departments.find(d => d.id == formData.department)?.name;
    const func = departments.find(d => d.id == formData.functional_department)?.name || '-';
    const pos = jobPositions.find(p => p.id == formData.job_position)?.name;

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
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 text-slate-500 font-medium">Ad Soyad</div>
                    <div className="font-bold text-slate-800">{formData.first_name} {formData.last_name}</div>
                </div>
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 text-slate-500 font-medium">TC Kimlik No</div>
                    <div className="font-bold text-slate-800">{formData.tc_number}</div>
                </div>
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors bg-blue-50/30">
                    <div className="w-1/3 text-slate-500 font-medium">Ana Departman</div>
                    <div className="font-bold text-blue-700">{dept}</div>
                </div>
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors bg-blue-50/30">
                    <div className="w-1/3 text-slate-500 font-medium">Yönetici</div>
                    <div className="font-bold text-blue-700">{mgr ? mgr.first_name + ' ' + mgr.last_name : '-'}</div>
                </div>
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 text-slate-500 font-medium">Fonksiyonel</div>
                    <div className="font-bold text-slate-800">{func}</div>
                </div>
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 text-slate-500 font-medium">Pozisyon</div>
                    <div className="font-bold text-slate-800">
                        {pos}
                        {formData.secondary_job_positions?.length > 0 && <span className="text-xs text-slate-500 block">+ {formData.secondary_job_positions.length} Ek Pozisyon</span>}
                    </div>
                </div>

                {(formData.substitutes?.length > 0) && (
                    <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors bg-indigo-50/30">
                        <div className="w-1/3 text-slate-500 font-medium">Vekiller</div>
                        <div className="font-bold text-indigo-700">{formData.substitutes.length} Kişi Seçildi</div>
                    </div>
                )}

                {(formData.shift_start || formData.lunch_start) && (
                    <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors bg-amber-50/30">
                        <div className="w-1/3 text-slate-500 font-medium">Özel Kurallar</div>
                        <div className="font-bold text-amber-700 text-sm">
                            {formData.shift_start}-{formData.shift_end} (Mola: {formData.daily_break_allowance}dk)
                        </div>
                    </div>
                )}
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 text-slate-500 font-medium">Yetkiler</div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                        <Key size={16} className="text-blue-500" />
                        <span>{(formData.roles?.length || 0)} Rol + {(formData.direct_permissions?.length || 0)} Ek Yetki</span>
                    </div>
                </div>
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 text-slate-500 font-medium">Kullanıcı Adı</div>
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
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [completedSteps, setCompletedSteps] = useState([]);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [showSettings, setShowSettings] = useState(false); // Toggle management mode

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [empRes, deptRes, posRes, permRes, schedRes, roleRes] = await Promise.all([
                api.get('/employees/'),
                api.get('/departments/'),
                api.get('/job-positions/'),
                api.get('/permissions/'),
                api.get('/work-schedules/'),
                api.get('/roles/')
            ]);
            setEmployees(empRes.data.results || empRes.data);
            setDepartments(deptRes.data.results || deptRes.data);
            setJobPositions(posRes.data.results || posRes.data);
            setPermissions(permRes.data.results || permRes.data);
            setWorkSchedules(schedRes.data.results || schedRes.data);
            setRoles(roleRes.data.results || roleRes.data);
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

            // Logic: Manager Selection -> Auto Dept
            if (field === 'reports_to') {
                const manager = employees.find(e => e.id == value);
                if (manager && manager.department) {
                    newState.department = manager.department.id || manager.department; // Auto-assign Manager's Dept
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
        const { first_name, last_name, tc_number, email, department, job_position, employee_code, reports_to, functional_department } = formData;
        switch (step) {
            case 1: // Personal
                return first_name && last_name && tc_number && email && formData.username && formData.password;
            case 2: // Corporate
                // reports_to is OPTIONAL for top-level managers (CEO, GM) or first employee
                // But Department and Position are MUST.
                let valid = department && job_position && employee_code;

                // Special Rule: If 'Departman Müdürü', strictly require functional_department
                const posName = jobPositions.find(p => p.id == job_position)?.name;
                if (posName === 'Departman Müdürü' && !functional_department) {
                    return false;
                }
                return valid;
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
            setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
            setCurrentStep(prev => Math.min(prev + 1, 6));
            window.scrollTo(0, 0);
        } else {
            alert("Lütfen zorunlu alanları doldurunuz.");
        }
    };

    const handleAddNew = () => {
        setFormData({ ...INITIAL_FORM_STATE, substitutes: [], roles: [], secondary_job_positions: [] });
        setViewMode('create');
        setCurrentStep(1);
        setCompletedSteps([]);
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
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
        loadEmployeeDetail(emp.id);
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
                reports_to: data.reports_to || '',
                functional_department: (data.secondary_departments?.[0]?.id) || '', // Simplify first dim

                employee_code: data.employee_code,
                card_uid: data.card_uid || '',
                employment_status: data.employment_status,
                work_type: data.work_type,
                uses_service: data.uses_service || false, // [NEW]
                hired_date: data.hired_date || '',

                work_schedule: data.work_schedule?.id || '',
                weekly_schedule: data.weekly_schedule || {},

                phone: data.phone || '',
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
                roles: data.roles ? data.roles.map(r => r.id || r) : [], // [NEW] Populating IDs

                direct_permissions: data.direct_permissions ? data.direct_permissions.map(p => p.id) : [],
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
                work_schedule: cleanPayload.work_schedule || null,
                secondary_departments: cleanPayload.functional_department ? [cleanPayload.functional_department] : []
            };

            if (viewMode === 'create') {
                await api.post('/employees/', payload);
                alert("Personel ve Kullanıcı Hesabı başarıyla oluşturuldu.");
            } else if (viewMode === 'edit') {
                // Update
                // Remove readonly fields if necessary or backend handles it.
                // For safety, remove password if empty/null
                if (!payload.password) delete payload.password;

                await api.patch(`/employees/${payload.id}/`, payload);
                alert("Personel bilgileri güncellendi.");
            }

            fetchInitialData();
            setViewMode('list');
            setFormData(INITIAL_FORM_STATE);
            setCurrentStep(1);
        } catch (error) {
            console.error("Submit Error:", error);
            alert("Hata: " + (error.response?.data?.detail || "İşlem başarısız."));
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
        return (
            <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 animate-fade-in">
                <div className="max-w-[1600px] mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personel</h1>
                            <p className="text-slate-500 mt-1">Süper Admin / İK Yönetimi</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {hasPermission('EMPLOYEE_UPDATE') && (
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



                            {hasPermission('EMPLOYEE_CREATE') && (
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
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-8 max-w-2xl">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                placeholder="İsim, unvan veya departman ile ara..."
                                className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {employees
                            .filter(e => e.employment_status !== 'TERMINATED')
                            .filter(e => e.first_name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(emp => (
                                <div key={emp.id} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
                                    {showSettings && (
                                        <div className="absolute top-4 right-4 z-10 animate-fade-in flex gap-2">
                                            <button
                                                onClick={(ev) => { ev.stopPropagation(); handleEdit(emp); }}
                                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                                                title="Düzenle"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(ev) => { ev.stopPropagation(); handleDelete(emp.id); }}
                                                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                                                title="Sil"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-5 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-inner">
                                            {emp.first_name[0]}{emp.last_name[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">{emp.first_name} {emp.last_name}</h3>
                                            <p className="text-sm text-slate-500 font-medium mt-0.5">{emp.job_position?.name || 'Pozisyon Yok'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Building size={16} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{emp.department?.name || 'Departman Yok'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <div className="w-4 flex justify-center shrink-0 text-slate-400">@</div>
                                            <span className="truncate">{emp.email}</span>
                                        </div>
                                        {/* New Schedule Info Section */}
                                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-slate-400 mb-0.5">Takvim</div>
                                                <div className="font-bold text-slate-700 truncate" title={emp.work_schedule_name}>{emp.work_schedule_name}</div>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                                                <div className="text-slate-400 mb-0.5">Tolerans / Mola</div>
                                                <div className="font-bold text-slate-700">{emp.attendance_tolerance_minutes}dk / {emp.daily_break_allowance}dk</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        );
    }

    // Step Progress Calculation
    const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4 font-sans text-slate-900">
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
            <div className={`w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex flex-col ${viewMode === 'create' ? 'md:flex-row' : ''}`}> {/* Full width for edit */}

                {/* Left Sidebar - Stepper (Only for Wizard/Create) */}
                {viewMode === 'create' && (
                    <div className="w-full md:w-80 bg-slate-900 text-white p-8 flex flex-col relative overflow-hidden shrink-0">
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
                                {STEPS.map((s, idx) => {
                                    const isActive = currentStep === s.number;
                                    const isCompleted = currentStep > s.number;
                                    const Icon = s.icon;
                                    return (
                                        <div key={s.number} className="relative z-10 flex items-center gap-4 py-4 group">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 shrink-0 ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110' : isCompleted ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:border-slate-600'}`}>
                                                {isCompleted ? <Check size={16} /> : <span className="text-sm font-bold">{s.number}</span>}
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-400'}`}>{s.title}</h4>
                                                {isActive && <p className="text-[10px] text-blue-200 mt-0.5 animate-fade-in">Mevcut Adım</p>}
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
                    <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
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
                    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar scroll-smooth">
                        {viewMode === 'edit' ? (
                            /* EDIT MODE: SINGLE PAGE SCROLL */
                            <div className="max-w-4xl mx-auto space-y-12 pb-20">
                                {/* Section 1: Personal */}
                                <section id="sec-personal" className="scroll-mt-24">
                                    {/* Re-using Step Components directly */}
                                    {/* Note: Step components have internal headers, so we can just stack them */}
                                    <StepPersonal formData={formData} handleChange={handleInputChange} />
                                </section>

                                {/* Section 2: Corporate */}
                                <section id="sec-corporate" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepCorporate formData={formData} handleChange={handleInputChange} departments={departments} jobPositions={jobPositions} employees={employees} />
                                </section>

                                {/* Section 3: Contact */}
                                <section id="sec-contact" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepContact formData={formData} handleChange={handleInputChange} />
                                </section>

                                {/* Section 4: Details */}
                                <section id="sec-details" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepDetails formData={formData} handleChange={handleInputChange} workSchedules={workSchedules} />
                                </section>

                                {/* Section 5: Permissions */}
                                <section id="sec-permissions" className="scroll-mt-24 pt-8 border-t border-slate-100">
                                    <StepPermissions formData={formData} handleChange={handleInputChange} permissions={permissions} jobPositions={jobPositions} roles={roles} />
                                </section>
                            </div>
                        ) : (
                            /* CREATE WIZARD MODE */
                            <div className="h-full">
                                {currentStep === 1 && <StepPersonal formData={formData} handleChange={handleInputChange} />}
                                {currentStep === 2 && <StepCorporate formData={formData} handleChange={handleInputChange} departments={departments} jobPositions={jobPositions} employees={employees} />}
                                {currentStep === 3 && <StepContact formData={formData} handleChange={handleInputChange} />}
                                {currentStep === 4 && <StepDetails formData={formData} handleChange={handleInputChange} workSchedules={workSchedules} />}
                                {currentStep === 5 && <StepPermissions formData={formData} handleChange={handleInputChange} permissions={permissions} jobPositions={jobPositions} roles={roles} />}
                                {currentStep === 6 && <StepPreview formData={formData} departments={departments} jobPositions={jobPositions} employees={employees} />}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center sticky bottom-0 z-20 w-full">
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
                            onClick={viewMode === 'create' ? (currentStep === 6 ? handleSubmit : handleNext) : handleSubmit}
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
                                    {viewMode === 'edit' ? 'Değişiklikleri Kaydet' : (currentStep === 6 ? 'Kaydet ve Tamamla' : 'Devam Et')}
                                    {viewMode === 'create' && currentStep !== 6 && <ArrowRight size={20} />}
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



