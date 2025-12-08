import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, MapPin, User, Settings, Trash2, Power, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import WeeklyScheduleSelector from '../components/WeeklyScheduleSelector';

const Employees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, PASSIVE
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        job_position: '',
        employee_code: '',
        password: '', // Temporary for creation
        secondary_job_positions: [],
        remote_work_days: [],
        weekly_schedule: {},
        attendance_tolerance_minutes: 0,
        weekly_schedule: {},
        attendance_tolerance_minutes: 0,
        is_exempt_from_attendance: false,
        requires_approval: true
    });

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [empRes, deptRes, jobRes] = await Promise.all([
                api.get('/employees/'),
                api.get('/departments/'),
                api.get('/job-positions/')
            ]);
            // Handle pagination (DRF returns { results: [...] } when paginated)
            const empData = empRes.data.results || empRes.data;
            const deptData = deptRes.data.results || deptRes.data;
            const jobData = jobRes.data.results || jobRes.data;

            setEmployees(Array.isArray(empData) ? empData : []);
            setDepartments(Array.isArray(deptData) ? deptData : []);
            setJobPositions(Array.isArray(jobData) ? jobData : []);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Fallback to empty arrays on error to prevent crashes
            setEmployees([]);
            setDepartments([]);
            setJobPositions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/employees/', {
                ...formData,
                username: formData.email.split('@')[0], // Auto-generate username
                is_active: true
            });
            setShowModal(false);
            fetchData(); // Refresh list
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                department: '',
                job_position: '',
                employee_code: '',
                password: ''
            });
        } catch (error) {
            console.error('Error creating employee:', error);
            alert('Error creating employee. Please check the console.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
            try {
                await api.delete(`/employees/${id}/hard-delete/`);
                fetchData();
            } catch (error) {
                console.error('Error deleting employee:', error);
                alert('Silme işlemi başarısız oldu.');
            }
        }
    };

    const handleToggleStatus = async (emp) => {
        const newStatus = emp.employment_status === 'PASSIVE' ? 'ACTIVE' : 'PASSIVE';
        const isActive = newStatus === 'ACTIVE';

        if (window.confirm(`Kullanıcı durumunu ${newStatus === 'PASSIVE' ? 'PASİF' : 'AKTİF'} yapmak istediğinize emin misiniz?`)) {
            try {
                await api.patch(`/employees/${emp.id}/`, {
                    employment_status: newStatus,
                    is_active: isActive
                });
                fetchData();
            } catch (error) {
                console.error('Error updating status:', error);
                alert('Durum güncelleme başarısız oldu.');
            }
        }
    };

    const filteredEmployees = Array.isArray(employees) ? employees.filter(emp => {
        const firstName = emp?.first_name || '';
        const lastName = emp?.last_name || '';
        const email = emp?.email || '';

        const matchesSearch = (firstName + ' ' + lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.toLowerCase().includes(searchTerm.toLowerCase());
        email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept ? emp.department === parseInt(selectedDept) : true;

        let matchesStatus = true;
        if (filterStatus === 'ACTIVE') matchesStatus = emp.is_active;
        if (filterStatus === 'PASSIVE') matchesStatus = !emp.is_active || emp.employment_status === 'PASSIVE';

        return matchesSearch && matchesDept && matchesStatus;
    }) : [];

    const getDepartmentName = (id) => departments.find(d => d.id === id)?.name || '-';
    const getJobPositionName = (id) => jobPositions.find(j => j.id === id)?.name || '-';

    if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    const nextStep = () => {
        // Simple validation before proceeding
        if (currentStep === 1) {
            if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
                alert('Lütfen zorunlu alanları doldurunuz.');
                return;
            }
        } else if (currentStep === 2) {
            if (!formData.department || !formData.job_position || !formData.employee_code) {
                alert('Lütfen zorunlu alanları doldurunuz.');
                return;
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step === currentStep ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' :
                        step < currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                        {step < currentStep ? <span>✓</span> : step}
                    </div>
                    {step < totalSteps && (
                        <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${step < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Kişisel Bilgiler
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ad <span className="text-red-500">*</span></label>
                                <input required name="first_name" value={formData.first_name} onChange={handleInputChange} className="input-field" placeholder="Örn: Ahmet" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Soyad <span className="text-red-500">*</span></label>
                                <input required name="last_name" value={formData.last_name} onChange={handleInputChange} className="input-field" placeholder="Örn: Yılmaz" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">E-posta <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="input-field pl-12" placeholder="ornek@sirket.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Şifre <span className="text-red-500">*</span></label>
                                <input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="input-field" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">SGK Sicil Numarası</label>
                                <input name="insurance_number" value={formData.insurance_number || ''} onChange={handleInputChange} className="input-field" placeholder="SGK Sicil No" />
                            </div>
                        </div>
                    </div>
                );
            case 2: // İş & Pozisyon
                const days = [
                    { key: 'MON', label: 'Pzt' },
                    { key: 'TUE', label: 'Sal' },
                    { key: 'WED', label: 'Çar' },
                    { key: 'THU', label: 'Per' },
                    { key: 'FRI', label: 'Cum' },
                    { key: 'SAT', label: 'Cmt' },
                    { key: 'SUN', label: 'Paz' },
                ];

                const toggleDay = (dayKey) => {
                    const currentDays = formData.remote_work_days || [];
                    if (currentDays.includes(dayKey)) {
                        setFormData({ ...formData, remote_work_days: currentDays.filter(d => d !== dayKey) });
                    } else {
                        setFormData({ ...formData, remote_work_days: [...currentDays, dayKey] });
                    }
                };

                const toggleSecondaryPosition = (posId) => {
                    const currentPos = formData.secondary_job_positions || [];
                    const posIdInt = parseInt(posId);
                    if (currentPos.includes(posIdInt)) {
                        setFormData({ ...formData, secondary_job_positions: currentPos.filter(id => id !== posIdInt) });
                    } else {
                        setFormData({ ...formData, secondary_job_positions: [...currentPos, posIdInt] });
                    }
                };

                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Departman <span className="text-red-500">*</span></label>
                                <select required name="department" value={formData.department} onChange={handleInputChange} className="input-field">
                                    <option value="">Seçiniz</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name} {d.parent_name ? `(${d.parent_name})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ana Pozisyon <span className="text-red-500">*</span></label>
                                <select required name="job_position" value={formData.job_position} onChange={handleInputChange} className="input-field">
                                    <option value="">Seçiniz</option>
                                    {jobPositions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Şirket Personel Numarası <span className="text-red-500">*</span></label>
                                <input required name="employee_code" value={formData.employee_code} onChange={handleInputChange} className="input-field" placeholder="Örn: PER-001" />
                            </div>

                            {/* Ek Pozisyonlar */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ek Pozisyonlar (Opsiyonel)</label>
                                <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50">
                                    {jobPositions.map(j => (
                                        <button
                                            key={j.id}
                                            type="button"
                                            onClick={() => toggleSecondaryPosition(j.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${(formData.secondary_job_positions || []).includes(j.id)
                                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                                }`}
                                        >
                                            {j.name}
                                            {(formData.secondary_job_positions || []).includes(j.id) && <span className="ml-1">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Çalışma Şekli</label>
                                <select name="work_type" value={formData.work_type || 'FULL_TIME'} onChange={handleInputChange} className="input-field">
                                    <option value="FULL_TIME">Tam Zamanlı (Ofis)</option>
                                    <option value="REMOTE">Uzaktan</option>
                                    <option value="HYBRID">Hibrit</option>
                                    <option value="PART_TIME">Yarı Zamanlı</option>
                                    <option value="FIELD">Saha</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <WeeklyScheduleSelector
                                    value={formData.weekly_schedule}
                                    onChange={(newSchedule) => setFormData({ ...formData, weekly_schedule: newSchedule })}
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Opsiyonel Gecikme İzni (Dakika)</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="attendance_tolerance_minutes"
                                    value={formData.attendance_tolerance_minutes || 0}
                                    onChange={handleInputChange}
                                    className="input-field w-32"
                                    placeholder="Örn: 15"
                                />
                                <p className="text-xs text-slate-500 mt-1">Giriş/çıkış saatlerindeki kabul edilebilir sapma süresi.</p>
                            </div>

                            {/* Uzaktan Çalışma Günleri */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Uzaktan Çalışma Günleri</label>
                                <div className="flex gap-2">
                                    {days.map(day => (
                                        <button
                                            key={day.key}
                                            type="button"
                                            onClick={() => toggleDay(day.key)}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${(formData.remote_work_days || []).includes(day.key)
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mesai Muafiyeti */}
                            <div className="md:col-span-3">
                                <label className="flex items-center p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        name="is_exempt_from_attendance"
                                        checked={formData.is_exempt_from_attendance || false}
                                        onChange={(e) => setFormData({ ...formData, is_exempt_from_attendance: e.target.checked })}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-medium text-slate-900">Mesai Takibinden Muaf</span>
                                        <span className="block text-xs text-slate-500">Bu çalışan için kart basma veya saat takibi zorunluluğu aranmaz.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 3: // İletişim & Adres
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input name="phone" value={formData.phone || ''} onChange={handleInputChange} className="input-field pl-12" placeholder="0555..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">2. Telefon</label>
                                <input name="phone_secondary" value={formData.phone_secondary || ''} onChange={handleInputChange} className="input-field" placeholder="0555..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Adres</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-slate-400" size={20} />
                                    <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="input-field pl-12 h-32 resize-none" placeholder="Açık adres..." />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-red-50/50 rounded-xl border border-red-100">
                            <h4 className="text-base font-bold text-red-800 mb-4 flex items-center">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-2 text-sm">!</span>
                                Acil Durum Bilgileri
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-red-700 mb-2">Kişi Adı</label>
                                    <input name="emergency_contact_name" value={formData.emergency_contact_name || ''} onChange={handleInputChange} className="bg-white border-red-200 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 block w-full rounded-lg px-4 py-3 border outline-none transition-all" placeholder="Yakını" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-700 mb-2">Telefon</label>
                                    <input name="emergency_contact_phone" value={formData.emergency_contact_phone || ''} onChange={handleInputChange} className="bg-white border-red-200 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 block w-full rounded-lg px-4 py-3 border outline-none transition-all" placeholder="0555..." />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Çalışanlar</h2>
                    <p className="text-slate-500 mt-1">Personel listesi ve yönetimi</p>
                </div>
                <button
                    onClick={() => { setShowModal(true); setCurrentStep(1); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus size={18} className="mr-2" />
                    Yeni Çalışan Ekle
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="İsim veya e-posta ile ara..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter size={20} className="text-slate-400" />
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                    >
                        <option value="">Tüm Departmanlar</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Tüm Durumlar</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="PASSIVE">Pasif</option>
                    </select>
                </div>
            </div>

            {/* Employee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEmployees.map(emp => (
                    <div key={emp.id} className="card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                <MoreVertical size={20} />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {emp.first_name} {emp.last_name}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-4">{getJobPositionName(emp.job_position)}</p>

                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center">
                                <Mail size={14} className="mr-2 text-slate-400" />
                                <span className="truncate">{emp.email}</span>
                            </div>
                            <div className="flex items-center">
                                <User size={14} className="mr-2 text-slate-400" />
                                <span>{getDepartmentName(emp.department)}</span>
                            </div>
                            <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${emp.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                <span className={emp.is_active ? 'text-emerald-600' : 'text-red-600'}>
                                    {emp.is_active ? 'Aktif' : 'Pasif'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            className="mt-4 w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings size={16} />
                            Yönet
                        </button>

                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => handleToggleStatus(emp)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${emp.is_active
                                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    }`}
                                title={emp.is_active ? "Pasife Al" : "Aktif Et"}
                            >
                                <Power size={16} />
                                {emp.is_active ? 'Pasif' : 'Aktif'}
                            </button>
                            <button
                                onClick={() => handleDelete(emp.id)}
                                className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                                title="Kalıcı Olarak Sil"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredEmployees.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    Kayıtlı çalışan bulunamadı.
                </div>
            )}

            {/* Add Employee Modal with Portal */}
            {showModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">Yeni Çalışan Ekle</h3>
                                <p className="text-sm text-slate-500 mt-1">Lütfen çalışan bilgilerini eksiksiz doldurunuz.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-full shadow-sm hover:shadow-md">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        {/* Stepper Indicator */}
                        <div className="pt-8 px-8">
                            {renderStepIndicator()}
                        </div>

                        {/* Form Content */}
                        <div className="flex-1 overflow-y-auto px-8 pb-8">
                            <form onSubmit={handleSubmit} id="employeeForm">
                                {renderStepContent()}
                            </form>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${currentStep === 1
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                                    }`}
                            >
                                Geri
                            </button>

                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all text-sm flex items-center transform hover:scale-[1.02]"
                                >
                                    İleri <span className="ml-2">&gt;</span>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    form="employeeForm"
                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 transition-all text-sm flex items-center transform hover:scale-[1.02]"
                                >
                                    <span className="mr-2">✓</span>
                                    Kaydı Tamamla
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};


export default Employees;
