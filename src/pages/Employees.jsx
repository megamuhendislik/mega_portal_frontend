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
    reports_to: '', // Manager ID
    functional_department: '', // Attribute (stored in secondary_departments)

    employee_code: '',
    card_uid: '',
    employment_status: 'ACTIVE',
    work_type: 'FULL_TIME',
    work_type: 'FULL_TIME',
    hired_date: new Date().toISOString().split('T')[0],

    // Schedule
    work_schedule: '', // ID of selected schedule or '' for Custom
    weekly_schedule: {}, // Custom JSON content

    // Step 3: Contact
    phone: '',
    phone_secondary: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',

    // Step 4: Details
    title: '',
    job_description: '',
    technical_skills: [], // List of strings
    certificates: [], // List of {name, date}
    foreign_languages: [], // List of {name, level}

    // Step 5: Permissions
    direct_permissions: [], // List of Permission IDs

    // System
    password: '', // Default initial password
    username: '' // Will be auto-generated or manual
};

const InputField = ({ label, value, onChange, type = "text", placeholder, icon: Icon, required }) => (
    <div className="group">
        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative transition-all duration-300 transform group-focus-within:-translate-y-1">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`
                    w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 
                    bg-slate-50 border border-slate-200 rounded-xl 
                    text-slate-700 font-medium placeholder:text-slate-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 
                    transition-all shadow-sm group-hover:bg-white
                `}
            />
        </div>
    </div>
);

const SelectField = ({ label, value, onChange, options, icon: Icon, required, disabled, className }) => (
    <div className="group">
        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative transition-all duration-300 transform group-focus-within:-translate-y-1">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 z-10 transition-colors" size={18} />}
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`
                    w-full ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 
                    bg-slate-50 border border-slate-200 rounded-xl 
                    text-slate-700 font-medium appearance-none
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 
                    transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
                    ${className}
                `}
            >
                {options}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
    </div>
);

// --- Step Components ---

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
            <InputField label="E-posta" value={formData.email} onChange={e => handleChange('email', e.target.value)} required type="email" placeholder="isim.soyisim@mega.com" />
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

const StepPermissions = ({ formData, handleChange, permissions, jobPositions }) => {
    // 1. Calculate Default Permissions from Job Position -> Roles
    const pos = jobPositions.find(p => p.id == formData.job_position);
    const defaultRolePermissions = new Set();

    if (pos && pos.default_roles) {
        pos.default_roles.forEach(role => {
            if (role.permissions) {
                role.permissions.forEach(perm => {
                    defaultRolePermissions.add(perm.id);
                });
            }
        });
    }

    const togglePermission = (permId) => {
        const currentDirect = formData.direct_permissions || [];
        if (currentDirect.includes(permId)) {
            handleChange('direct_permissions', currentDirect.filter(id => id !== permId));
        } else {
            handleChange('direct_permissions', [...currentDirect, permId]);
        }
    };

    // Group permissions by prefix for better UI (Optional, but flat list requested "tek tek")
    // Let's just flat list for now but with good search/filter potentially? 
    // User asked for "tek tek" (one by one).

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Yetkilendirme</h3>
                <p className="text-slate-500 text-sm">Pozisyona dayalı varsayılan yetkiler ve ek yetki tanımları.</p>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl mb-4 border border-blue-100 flex items-start gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                    <Key size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">Otomatik Yetki Atama</h4>
                    <p className="text-blue-700/80 text-xs mt-1">
                        Seçilen <strong>{pos?.name || 'Pozisyon'}</strong> pozisyonu için tanımlı rollerden gelen yetkiler otomatik olarak işaretlenmiştir ve değiştirilemez.
                        Ekstradan yetki vermek için kutucukları işaretleyebilirsiniz.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {permissions.map(perm => {
                    const isDefault = defaultRolePermissions.has(perm.id);
                    const isChecked = isDefault || (formData.direct_permissions || []).includes(perm.id);

                    return (
                        <label
                            key={perm.id}
                            className={`
                                flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none
                                ${isChecked
                                    ? isDefault
                                        ? 'bg-slate-50 border-slate-200 opacity-75'
                                        : 'bg-indigo-50 border-indigo-200 shadow-sm'
                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                }
                            `}
                        >
                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? (isDefault ? 'bg-slate-400 border-slate-400' : 'bg-indigo-600 border-indigo-600') : 'bg-white border-slate-300'}`}>
                                {isChecked && <Check size={12} className="text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={isChecked}
                                onChange={() => !isDefault && togglePermission(perm.id)}
                                disabled={isDefault}
                            />
                            <div>
                                <div className={`font-medium text-sm ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {perm.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{perm.code}</div>
                                {isDefault && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-auto mt-1 inline-block">Varsayılan</span>}
                            </div>
                        </label>
                    );
                })}
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
                    <div className="font-bold text-slate-800">{pos}</div>
                </div>
                <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-1/3 text-slate-500 font-medium">Yetkiler</div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                        <Key size={16} className="text-blue-500" />
                        <span>{(formData.direct_permissions?.length || 0)} Ek Yetki Seçildi</span>
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
    const [workSchedules, setWorkSchedules] = useState([]); // Added
    const [permissions, setPermissions] = useState([]); // All available permissions
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
            const [empRes, deptRes, posRes, permRes, schedRes] = await Promise.all([
                api.get('/employees/'),
                api.get('/departments/'),
                api.get('/job-positions/'),
                api.get('/permissions/'),
                api.get('/work-schedules/')
            ]);
            setEmployees(empRes.data.results || empRes.data);
            setDepartments(deptRes.data.results || deptRes.data);
            setJobPositions(posRes.data.results || posRes.data);
            setPermissions(permRes.data.results || permRes.data);
            setWorkSchedules(schedRes.data.results || schedRes.data);
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

            // Auto-generate username/email draft if creating
            if (viewMode === 'create' && (field === 'first_name' || field === 'last_name')) {
                const username = generateUsername(newState.first_name, newState.last_name);
                newState.username = username;
                if (!prev.email) newState.email = `${username}@mega.com`;
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
            const payload = {
                ...formData,
                work_schedule: formData.work_schedule || null,
                secondary_departments: formData.functional_department ? [formData.functional_department] : []
            };

            if (viewMode === 'create') {
                await api.post('/employees/', payload);
                alert("Personel ve Kullanıcı Hesabı başarıyla oluşturuldu.");
            } else if (viewMode === 'edit') {
                // Update
                // Remove readonly fields if necessary or backend handles it.
                // Password usually handled separately but here we might allow reset if provided?
                // For safety, remove password if empty
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
                                    onClick={() => setViewMode('create')}
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
                        {employees.filter(e => e.first_name.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
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
            <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px] flex flex-col md:flex-row">

                {/* Left Sidebar - Stepper */}
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
                            <h2 className="text-3xl font-bold leading-tight">Personel<br /><span className="text-blue-400">{viewMode === 'edit' ? 'Düzenleme' : 'Oluşturma'}</span></h2>
                        </div>

                        {/* Vertical Steps */}
                        <div className="space-y-1 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-700/50 z-0"></div>

                            {STEPS.map((s, idx) => {
                                const isActive = currentStep === s.number;
                                const isCompleted = currentStep > s.number;
                                const Icon = s.icon;

                                return (
                                    <div key={s.number} className="relative z-10 flex items-center gap-4 py-4 group">
                                        <div
                                            className={`
                                                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 shrink-0
                                                ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110' :
                                                    isCompleted ? 'bg-green-500/20 border-green-500 text-green-400' :
                                                        'bg-slate-800 border-slate-700 text-slate-500 group-hover:border-slate-600'}
                                            `}
                                        >
                                            {isCompleted ? <Check size={16} /> : <span className="text-sm font-bold">{s.number}</span>}
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-400'}`}>
                                                {s.title}
                                            </h4>
                                            {isActive && (
                                                <p className="text-[10px] text-blue-200 mt-0.5 animate-fade-in">Mevcut Adım</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-auto relative z-10 pt-8 opacity-60 text-xs text-slate-400 text-center">
                        MEGA PORTAL v1.0 &copy; 2025
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 bg-white flex flex-col">
                    {/* Header */}
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {STEPS[currentStep - 1].icon && React.createElement(STEPS[currentStep - 1].icon, { className: "text-blue-600", size: 24 })}
                                {STEPS[currentStep - 1].title}
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Lütfen gerekli bilgileri eksiksiz doldurunuz.</p>
                        </div>
                        <div className="text-slate-400 text-sm font-medium bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                            Adım {currentStep} / {STEPS.length}
                        </div>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="flex-1 p-10 overflow-y-auto max-h-[600px] custom-scrollbar">
                        {currentStep === 1 && <StepPersonal formData={formData} handleChange={handleInputChange} />}
                        {currentStep === 2 && <StepCorporate formData={formData} handleChange={handleInputChange} departments={departments} jobPositions={jobPositions} employees={employees} />}
                        {currentStep === 3 && <StepContact formData={formData} handleChange={handleInputChange} />}
                        {currentStep === 4 && <StepDetails formData={formData} handleChange={handleInputChange} workSchedules={workSchedules} />}
                        {currentStep === 5 && <StepPermissions formData={formData} handleChange={handleInputChange} permissions={permissions} jobPositions={jobPositions} />}
                        {currentStep === 6 && <StepPreview formData={formData} departments={departments} jobPositions={jobPositions} employees={employees} />}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className={`
                                h-12 px-6 rounded-xl font-bold flex items-center gap-2 transition-all
                                ${currentStep === 1
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}
                            `}
                        >
                            <ArrowLeft size={20} />
                            Geri
                        </button>

                        <button
                            onClick={currentStep === 6 ? handleSubmit : handleNext}
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
                                    {currentStep === 6 ? 'Kaydet ve Tamamla' : 'Devam Et'}
                                    {currentStep !== 6 && <ArrowRight size={20} />}
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



