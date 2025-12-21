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

    // Step 2: Corporate
    department: '', // ID
    job_position: '', // ID
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
        const { first_name, last_name, tc_number, email, department, job_position, employee_code } = formData;
        switch (step) {
            case 1: // Personal
                return first_name && last_name && tc_number && email;
            case 2: // Corporate
                return department && job_position && employee_code;
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

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Prepare payload
            const payload = { ...formData };
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

    // --- Wizard Steps Components ---

    const renderStep1 = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Kişisel Kimlik Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="label-std">Ad <span className="text-red-500">*</span></label>
                    <input value={formData.first_name} onChange={e => handleInputChange('first_name', e.target.value)} className="input-std" placeholder="Örn: Ahmet" />
                </div>
                <div>
                    <label className="label-std">Soyad <span className="text-red-500">*</span></label>
                    <input value={formData.last_name} onChange={e => handleInputChange('last_name', e.target.value)} className="input-std" placeholder="Örn: Yılmaz" />
                </div>
                <div>
                    <label className="label-std">TC Kimlik No <span className="text-red-500">*</span></label>
                    <input value={formData.tc_number} onChange={e => handleInputChange('tc_number', e.target.value)} className="input-std" maxLength={11} placeholder="11 haneli TC no" />
                </div>
                <div>
                    <label className="label-std">E-posta <span className="text-red-500">*</span></label>
                    <input value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="input-std" type="email" />
                </div>
                <div>
                    <label className="label-std">Doğum Tarihi</label>
                    <input type="date" value={formData.birth_date} onChange={e => handleInputChange('birth_date', e.target.value)} className="input-std" />
                </div>
                <div>
                    <label className="label-std">Doğum Yeri</label>
                    <input value={formData.birth_place} onChange={e => handleInputChange('birth_place', e.target.value)} className="input-std" />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => {
        // Recursive function to render department tree in select
        const renderDepartmentOptions = (depts, level = 0) => {
            return depts.map(dept => {
                // Find children
                const children = departments.filter(d => d.parent === dept.id);
                return (
                    <React.Fragment key={dept.id}>
                        <option value={dept.id}>
                            {'\u00A0'.repeat(level * 4)}{level > 0 ? '└ ' : ''}{dept.name}
                        </option>
                        {children.length > 0 && renderDepartmentOptions(children, level + 1)}
                    </React.Fragment>
                );
            });
        };

        // Get root departments
        const rootDepartments = departments.filter(d => !d.parent);

        return (
            <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Kurumsal Pozisyon ve Departman</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="label-std">Departman / Birim <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select
                                value={formData.department}
                                onChange={e => handleInputChange('department', e.target.value)}
                                className="input-std appearance-none"
                            >
                                <option value="">Seçiniz...</option>
                                {renderDepartmentOptions(rootDepartments)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Lütfen organizasyon şemasına uygun ana veya alt birimi seçiniz.</p>
                    </div>

                    <div>
                        <label className="label-std">Unvan (Job Position) <span className="text-red-500">*</span></label>
                        <select
                            value={formData.job_position}
                            onChange={e => handleInputChange('job_position', e.target.value)}
                            className="input-std"
                        >
                            <option value="">Seçiniz...</option>
                            {jobPositions.map(pos => <option key={pos.id} value={pos.id}>{pos.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="label-std">Personel Sicil No <span className="text-red-500">*</span></label>
                        <input value={formData.employee_code} onChange={e => handleInputChange('employee_code', e.target.value)} className="input-std" placeholder="Örn: 2478" />
                    </div>

                    <div>
                        <label className="label-std">İşe Başlama Tarihi</label>
                        <input type="date" value={formData.hired_date} onChange={e => handleInputChange('hired_date', e.target.value)} className="input-std" />
                    </div>
                    <div>
                        <label className="label-std">Çalışma Şekli</label>
                        <select value={formData.work_type} onChange={e => handleInputChange('work_type', e.target.value)} className="input-std">
                            <option value="FULL_TIME">Tam Zamanlı</option>
                            <option value="PART_TIME">Yarı Zamanlı</option>
                            <option value="REMOTE">Uzaktan</option>
                            <option value="HYBRID">Hibrit</option>
                            <option value="FIELD">Saha</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">İletişim Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="label-std">Cep Telefonu</label>
                    <input value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} className="input-std" placeholder="05..." />
                </div>
                <div>
                    <label className="label-std">İkinci Telefon</label>
                    <input value={formData.phone_secondary} onChange={e => handleInputChange('phone_secondary', e.target.value)} className="input-std" />
                </div>
                <div className="md:col-span-2">
                    <label className="label-std">Adres</label>
                    <textarea value={formData.address} onChange={e => handleInputChange('address', e.target.value)} className="input-std h-24" />
                </div>
            </div>

            <h4 className="text-md font-bold text-slate-700 mt-6 mb-4">Acil Durum Kişisi</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="label-std">Adı Soyadı</label>
                    <input value={formData.emergency_contact_name} onChange={e => handleInputChange('emergency_contact_name', e.target.value)} className="input-std" />
                </div>
                <div>
                    <label className="label-std">Yakınlık Telefonu</label>
                    <input value={formData.emergency_contact_phone} onChange={e => handleInputChange('emergency_contact_phone', e.target.value)} className="input-std" />
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Profesyonel Detaylar</h3>
            <div>
                <label className="label-std">Görev Tanımı (Kısa)</label>
                <input value={formData.title} onChange={e => handleInputChange('title', e.target.value)} className="input-std" placeholder="Örn: Kıdemli İnşaat Mühendisi" />
            </div>
            <div>
                <label className="label-std">Detaylı İş Tanımı</label>
                <textarea value={formData.job_description} onChange={e => handleInputChange('job_description', e.target.value)} className="input-std h-32" />
            </div>

            {/* Dynamic Lists Concept - Simplified for now */}
            <div>
                <label className="label-std">Teknik Yetkinlikler (Virgülle ayırın)</label>
                <input
                    className="input-std"
                    placeholder="AutoCAD, Primavera, Python..."
                    onChange={e => setFormData({ ...formData, technical_skills: e.target.value.split(',').map(s => s.trim()) })}
                />
            </div>
        </div>
    );

    const renderStep5 = () => {
        const dept = departments.find(d => d.id == formData.department)?.name || '-';
        const pos = jobPositions.find(p => p.id == formData.job_position)?.name || '-';

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Check size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-green-800">Kayda Hazır</h3>
                        <p className="text-green-600 text-sm">Girilen bilgileri kontrol edip oluşturma işlemini tamamlayın.</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="p-4 flex gap-4">
                        <div className="w-1/3 text-slate-500 font-medium">Ad Soyad</div>
                        <div className="font-bold text-slate-800">{formData.first_name} {formData.last_name}</div>
                    </div>
                    <div className="p-4 flex gap-4">
                        <div className="w-1/3 text-slate-500 font-medium">TC No</div>
                        <div className="font-bold text-slate-800">{formData.tc_number}</div>
                    </div>
                    <div className="p-4 flex gap-4">
                        <div className="w-1/3 text-slate-500 font-medium">E-posta</div>
                        <div className="font-bold text-slate-800">{formData.email}</div>
                    </div>
                    <div className="p-4 flex gap-4">
                        <div className="w-1/3 text-slate-500 font-medium">Departman</div>
                        <div className="font-bold text-blue-600">{dept}</div>
                    </div>
                    <div className="p-4 flex gap-4">
                        <div className="w-1/3 text-slate-500 font-medium">Pozisyon</div>
                        <div className="font-bold text-slate-800">{pos}</div>
                    </div>
                    <div className="p-4 flex gap-4">
                        <div className="w-1/3 text-slate-500 font-medium">Kullanıcı Adı (Otomatik)</div>
                        <div className="font-bold text-slate-800 font-mono bg-slate-100 px-2 rounded">{formData.username}</div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Render ---

    if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

    if (viewMode === 'list') {
        return (
            <div className="p-6 max-w-[1600px] mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Personel Listesi</h1>
                        <p className="text-slate-500 mt-1">Süper Admin / İK Yönetimi</p>
                    </div>
                    <button onClick={() => setViewMode('create')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all">
                        <UserPlus size={20} /> Yeni Personel Ekle
                    </button>
                </div>

                {/* Search / Filter Bar */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            placeholder="Personel ara..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {employees.filter(e => e.first_name.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                        <div key={emp.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                                        {emp.first_name[0]}{emp.last_name[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{emp.first_name} {emp.last_name}</h3>
                                        <div className="text-xs text-slate-500 font-medium">{emp.job_position?.name || '-'}</div>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {emp.is_active ? 'AKTİF' : 'PASİF'}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Departman:</span>
                                    <span className="font-medium text-slate-700 text-right">{emp.department?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Email:</span>
                                    <span className="font-medium text-slate-700">{emp.email}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Create View (Wizard)
    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in pb-32">
            {/* Wizard Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Yeni Personel Ekleme</h1>
                    <p className="text-slate-500">Lütfen tüm adımları eksiksiz tamamlayın.</p>
                </div>
            </div>

            {/* Steps Indicator */}
            <div className="mb-10">
                <div className="flex justify-between relative">
                    {/* Progress Bar Background */}
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2 rounded-full"></div>
                    {/* Active Progress */}
                    <div
                        className="absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    ></div>

                    {STEPS.map((step) => {
                        const isActive = currentStep >= step.number;
                        const isCurrent = currentStep === step.number;
                        return (
                            <div key={step.number} className="flex flex-col items-center gap-2 bg-white px-2">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm
                                    ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' :
                                        isActive ? 'bg-green-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-400'}
                                `}>
                                    {isActive && !isCurrent ? <Check size={18} /> : step.number}
                                </div>
                                <span className={`text-xs font-bold whitespace-nowrap ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>{step.title}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 min-h-[400px]">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}
            </div>

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-50 flex justify-center">
                <div className="w-full max-w-5xl flex justify-between items-center px-6">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <ArrowLeft size={20} /> Geri
                    </button>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setViewMode('list')}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                        >
                            İptal
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={handleNext}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
                            >
                                İleri <ArrowRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Kaydı Tamamla
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Employees;
