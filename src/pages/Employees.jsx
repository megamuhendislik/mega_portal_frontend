import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ChevronDown, Check, X, UserPlus, Building, Briefcase, Phone, FileText, ArrowRight, ArrowLeft, Loader2, Save } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Trash2, Edit2, Download, Upload } from 'lucide-react';

// --- Constants ---
const STEPS = [
    { number: 1, title: 'Kişisel Bilgiler', icon: UserPlus },
    { number: 2, title: 'Kurumsal Bilgiler', icon: Building },
    { number: 3, title: 'İletişim & Acil', icon: Phone },
    { number: 4, title: 'Detaylar & Yetkinlik', icon: Briefcase },
    { number: 5, title: 'Önizleme & Onay', icon: FileText }
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
    hired_date: new Date().toISOString().split('T')[0],

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

    // System
    password: 'Password123!', // Default initial password
    username: '' // Will be auto-generated or manual
};

const Employees = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit'
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
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
            const [empRes, deptRes, posRes] = await Promise.all([
                api.get('/employees/'),
                api.get('/departments/'),
                api.get('/job-positions/')
            ]);
            setEmployees(empRes.data.results || empRes.data);
            setDepartments(deptRes.data.results || deptRes.data);
            setJobPositions(posRes.data.results || posRes.data);
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
                return first_name && last_name && tc_number && email;
            case 2: // Corporate
                // reports_to is mandatory now for matrix structure
                let valid = department && job_position && employee_code && reports_to;

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
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
            setCurrentStep(prev => Math.min(prev + 1, 5));
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

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Payload Prep
            const payload = {
                ...formData,
                // If functional department selected, put it in secondary_departments list
                secondary_departments: formData.functional_department ? [formData.functional_department] : []
            };

            if (viewMode === 'create') {
                await api.post('/employees/create_with_user/', payload);
                alert("Personel başarıyla oluşturuldu.");
            } else {
                // Update logic would go here
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

    // --- Render Steps ---

    const renderStep1 = () => (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Kişisel Kimlik Bilgileri</h3>
                <p className="text-slate-500 text-sm">Personelin temel kimlik ve iletişim detayları.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Ad" value={formData.first_name} onChange={e => handleInputChange('first_name', e.target.value)} required placeholder="Örn: Ahmet" />
                <InputField label="Soyad" value={formData.last_name} onChange={e => handleInputChange('last_name', e.target.value)} required placeholder="Örn: Yılmaz" />
                <InputField label="TC Kimlik No" value={formData.tc_number} onChange={e => handleInputChange('tc_number', e.target.value)} required placeholder="11 haneli TC no" />
                <InputField label="E-posta" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} required type="email" placeholder="ahmet@sirket.com" />
                <InputField label="Doğum Tarihi" value={formData.birth_date} onChange={e => handleInputChange('birth_date', e.target.value)} type="date" />
                <InputField label="Doğum Yeri" value={formData.birth_place} onChange={e => handleInputChange('birth_place', e.target.value)} placeholder="Örn: İstanbul" />
            </div>
        </div>
    );

    const renderStep2 = () => {
        // Validation Logic for Functional Department Highlight
        const isDeptManager = jobPositions.find(p => p.id == formData.job_position)?.name === 'Departman Müdürü';

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
        const rootDepartments = departments.filter(d => !d.parent);
        const functionalDepts = departments.filter(d => d.is_chart_visible === false || d.code?.startsWith('FONKS'));
        const potentialManagers = employees.filter(e => e.is_active);

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
                    {/* 1. MANAGER */}
                    <div className="md:col-span-2">
                        <SelectField
                            label="Bağlı Olduğu Yönetici (Reports To)"
                            value={formData.reports_to}
                            onChange={e => handleInputChange('reports_to', e.target.value)}
                            required
                            icon={User}
                            className="bg-blue-50/30 border-blue-200"
                            options={
                                <>
                                    <option value="">Bir Yönetici Seçiniz...</option>
                                    {potentialManagers.map(mgr => (
                                        <option key={mgr.id} value={mgr.id}>
                                            {mgr.first_name} {mgr.last_name} — {mgr.job_position?.name || 'Pozisyonsuz'} ({mgr.department?.name || '-'})
                                        </option>
                                    ))}
                                </>
                            }
                        />
                    </div>

                    {/* 2. AUTO DEPARTMENT */}
                    <div>
                        <SelectField
                            label="Ana Departman (Otomatik)"
                            value={formData.department}
                            disabled
                            required
                            icon={Building}
                            className="bg-slate-100 text-slate-500"
                            options={
                                <>
                                    <option value="">Yönetici Seçimi Bekleniyor...</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </>
                            }
                        />
                    </div>

                    {/* 3. FUNCTIONAL */}
                    <div>
                        <SelectField
                            label="Fonksiyonel Birim / Disiplin"
                            value={formData.functional_department}
                            onChange={e => handleInputChange('functional_department', e.target.value)}
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
                            onChange={e => handleInputChange('job_position', e.target.value)}
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
                        <InputField label="Personel Sicil No" value={formData.employee_code} onChange={e => handleInputChange('employee_code', e.target.value)} required placeholder="Örn: 2478" />
                    </div>

                    <div>
                        <InputField label="İşe Başlama Tarihi" value={formData.hired_date} onChange={e => handleInputChange('hired_date', e.target.value)} type="date" />
                    </div>
                </div>
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">İletişim & Acil Durum</h3>
                <p className="text-slate-500 text-sm">İrtibat ve acil durumda aranacak kişi bilgileri.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Cep Telefonu" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} icon={Phone} placeholder="05..." />
                <InputField label="İkinci Telefon" value={formData.phone_secondary} onChange={e => handleInputChange('phone_secondary', e.target.value)} icon={Phone} />
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Adres</label>
                    <textarea
                        value={formData.address}
                        onChange={e => handleInputChange('address', e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all shadow-sm h-24 resize-none"
                    />
                </div>
            </div>

            <div className="mt-8 mb-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2"><span className="w-8 h-1 bg-red-400 rounded-full inline-block"></span> Acil Durum Kişisi</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <InputField label="Ad Soyad" value={formData.emergency_contact_name} onChange={e => handleInputChange('emergency_contact_name', e.target.value)} />
                <InputField label="Telefonu" value={formData.emergency_contact_phone} onChange={e => handleInputChange('emergency_contact_phone', e.target.value)} icon={Phone} />
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="animate-fade-in-up">
            <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800">Detaylar & Yetkinlikler</h3>
                <p className="text-slate-500 text-sm">Görev tanımı ve beceri seti.</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
                <div>
                    <InputField label="Görev Tanımı Özeti" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} />
                </div>
                {/* Placeholder for tags/skills input components - can be expanded later */}
            </div>
        </div>
    );

    const renderStep5 = () => {
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
                        <div className="w-1/3 text-slate-500 font-medium">Kullanıcı Adı</div>
                        <div className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-sm">{formData.username}</div>
                    </div>
                </div>
            </div>
        );
    };

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
                            <button
                                onClick={() => setViewMode('create')}
                                className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <UserPlus size={20} /> Yeni Ekle
                            </button>
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
                                    <div className="absolute top-4 right-4 z-10 animate-fade-in">
                                        <button
                                            onClick={(ev) => { ev.stopPropagation(); handleDelete(emp.id); }}
                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
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
                            <h2 className="text-3xl font-bold leading-tight">Yeni Personel<br /><span className="text-blue-400">Oluşturma</span></h2>
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
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                        {currentStep === 4 && renderStep4()}
                        {currentStep === 5 && renderStep5()}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-all flex items-center gap-2"
                        >
                            <ArrowLeft size={18} /> Önceki Adım
                        </button>

                        <div className="flex items-center gap-4">
                            {/* Optional Cancel Button could go here */}

                            {currentStep < 5 ? (
                                <button
                                    onClick={handleNext}
                                    className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Sonraki Adım <ArrowRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    Kaydı Tamamla
                                </button>
                            )}
                        </div>
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
