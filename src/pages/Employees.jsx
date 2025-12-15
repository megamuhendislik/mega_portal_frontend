import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, MapPin, User, Settings, Trash2, Power, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Employees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, PASSIVE
    const [showModal, setShowModal] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);

    // Form States
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        phone: '',
        phone_secondary: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        remote_work_days: [],
        is_exempt_from_attendance: false,
        attendance_tolerance_minutes: 15,
        shift_start: '',
        shift_end: '',
        lunch_start: '12:30',
        lunch_end: '13:30',
        daily_break_allowance: 30,
        direct_permissions: []
    });

    const days = [
        { key: 'MON', label: 'Pzt' },
        { key: 'TUE', label: 'Sal' },
        { key: 'WED', label: 'Çar' },
        { key: 'THU', label: 'Per' },
        { key: 'FRI', label: 'Cum' },
        { key: 'SAT', label: 'Cmt' },
        { key: 'SUN', label: 'Paz' }
    ];

    const [workSchedules, setWorkSchedules] = useState([]);
    const [permissions, setPermissions] = useState([]);

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
        fetchWorkSchedules();
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            const response = await api.get('/permissions/');
            setPermissions(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };



    const fetchWorkSchedules = async () => {
        try {
            const response = await api.get('/work-schedules/');
            // Handle pagination if needed
            const data = response.data;
            if (Array.isArray(data)) {
                setWorkSchedules(data);
            } else if (data.results && Array.isArray(data.results)) {
                setWorkSchedules(data.results);
            } else {
                setWorkSchedules([]);
            }
        } catch (error) {
            console.error('Error fetching work schedules:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees/');
            const data = response.data;
            if (Array.isArray(data)) {
                setEmployees(data);
            } else if (data.results && Array.isArray(data.results)) {
                setEmployees(data.results);
            } else {
                setEmployees([]);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments/');
            const data = response.data;
            if (Array.isArray(data)) {
                setDepartments(data);
            } else if (data.results && Array.isArray(data.results)) {
                setDepartments(data.results);
            } else {
                setDepartments([]);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            setDepartments([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleDay = (dayKey) => {
        setFormData(prev => {
            const currentDays = prev.remote_work_days || [];
            if (currentDays.includes(dayKey)) {
                return { ...prev, remote_work_days: currentDays.filter(d => d !== dayKey) };
            } else {
                return { ...prev, remote_work_days: [...currentDays, dayKey] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/employees/', formData);
            setShowModal(false);
            fetchEmployees();
            // Reset form
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                department: '',
                phone: '',
                phone_secondary: '',
                address: '',
                emergency_contact_name: '',
                emergency_contact_phone: '',
                remote_work_days: [],
                is_exempt_from_attendance: false,
                attendance_tolerance_minutes: 15,
                shift_start: '',
                shift_end: '',
                lunch_start: '12:30',
                lunch_end: '13:30',
                daily_break_allowance: 30,
                work_schedule: '',
                direct_permissions: []
            });
            setCurrentStep(1);
        } catch (error) {
            console.error('Error creating employee:', error);
            alert('Çalışan eklenirken bir hata oluştu.');
        }
    };

    const nextStep = () => {
        if (currentStep < totalSteps) setCurrentStep(curr => curr + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(curr => curr - 1);
    };

    const handleToggleStatus = async (emp) => {
        // Implement status toggle logic
        console.log('Toggle status', emp);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu çalışanı silmek istediğinize emin misiniz?')) {
            try {
                await api.delete(`/employees/${id}/`);
                fetchEmployees();
            } catch (error) {
                console.error('Error deleting employee:', error);
            }
        }
    };

    const getDepartmentName = (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        return dept ? dept.name : '-';
    };

    const getJobPositionName = (pos) => {
        return pos?.name || '-';
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (emp.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (emp.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept ? emp.department === parseInt(selectedDept) : true;
        const matchesStatus = filterStatus === 'ALL' ? true : (filterStatus === 'ACTIVE' ? emp.is_active : !emp.is_active);
        return matchesSearch && matchesDept && matchesStatus;
    });

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${currentStep === step ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-100' :
                        currentStep > step ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                        {currentStep > step ? '✓' : step}
                    </div>
                    {step < 3 && (
                        <div className={`w-12 h-1 rounded-full mx-2 ${currentStep > step ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Kişisel Bilgiler
                return (
                    <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ad</label>
                                <input name="first_name" value={formData.first_name} onChange={handleInputChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Soyad</label>
                                <input name="last_name" value={formData.last_name} onChange={handleInputChange} className="input-field" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Departman</label>
                            <select name="department" value={formData.department} onChange={handleInputChange} className="input-field" required>
                                <option value="">Seçiniz</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Yetkiler</label>
                            <div className="space-y-4 max-h-96 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                                {['Employee Management', 'Attendance & Time', 'Organization & Settings'].map(category => {
                                    // Filter permissions based on code prefix or manual mapping
                                    const categoryPerms = permissions.filter(p => {
                                        if (category === 'Employee Management') return p.code.startsWith('EMPLOYEE_');
                                        if (category === 'Attendance & Time') return p.code.startsWith('ATTENDANCE_') || p.code.startsWith('LEAVE_');
                                        if (category === 'Organization & Settings') return p.code.startsWith('ORG_') || p.code.startsWith('SETTINGS_') || p.code.startsWith('SYSTEM_');
                                        return false;
                                    });

                                    if (categoryPerms.length === 0) return null;

                                    return (
                                        <div key={category} className="bg-slate-50 rounded-lg p-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">
                                                {category === 'Employee Management' ? 'Çalışan Yönetimi' :
                                                    category === 'Attendance & Time' ? 'Mesai ve İzin' :
                                                        'Organizasyon ve Ayarlar'}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {categoryPerms.map(perm => (
                                                    <label key={perm.id} className="flex items-start space-x-2 p-1 hover:bg-white rounded cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.direct_permissions.includes(perm.id)}
                                                            onChange={(e) => {
                                                                const newPerms = e.target.checked
                                                                    ? [...formData.direct_permissions, perm.id]
                                                                    : formData.direct_permissions.filter(id => id !== perm.id);
                                                                setFormData({ ...formData, direct_permissions: newPerms });
                                                            }}
                                                            className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-700">{perm.name}</span>
                                                            <span className="text-xs text-slate-500 leading-tight">{perm.description}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            case 2: // Çalışma Detayları
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Çalışma Takvimi</label>
                                <select
                                    name="work_schedule"
                                    value={formData.work_schedule || ''}
                                    onChange={handleInputChange}
                                    className="input-field"
                                >
                                    <option value="">Varsayılan</option>
                                    {workSchedules.map(sch => (
                                        <option key={sch.id} value={sch.id}>{sch.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tolerans (Dakika)</label>
                                <input
                                    type="number"
                                    name="attendance_tolerance_minutes"
                                    value={formData.attendance_tolerance_minutes}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Örn: 15"
                                />
                                <p className="text-xs text-slate-500 mt-1">Giriş/çıkış saatlerindeki kabul edilebilir sapma süresi.</p>
                            </div>
                        </div>

                        {/* Custom Shift Times */}
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <h4 className="text-sm font-bold text-blue-800 mb-3">Özel Çalışma Saatleri (Opsiyonel)</h4>
                            <p className="text-xs text-blue-600 mb-4">Eğer bir çalışma takvimi seçmezseniz, hafta içi günleri için bu saatler geçerli olacaktır.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Mesai Başlangıç</label>
                                    <input
                                        type="time"
                                        name="shift_start"
                                        value={formData.shift_start || ''}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Mesai Bitiş</label>
                                    <input
                                        type="time"
                                        name="shift_end"
                                        value={formData.shift_end || ''}
                                        onChange={handleInputChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Uzaktan Çalışma Günleri */}
                        <div>
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
                        <div>
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
                    <div key={emp.id} className={`card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group relative ${openMenuId === emp.id ? 'z-30' : 'z-0'}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === emp.id ? null : emp.id);
                                    }}
                                    className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-slate-100"
                                >
                                    <MoreVertical size={20} />
                                </button>

                                {openMenuId === emp.id && (
                                    <>
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-20 py-1 animate-fade-in">
                                            <button
                                                onClick={() => navigate(`/employees/${emp.id}`)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <Settings size={14} /> Detaylar
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(emp)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <Power size={14} /> {emp.is_active ? 'Pasife Al' : 'Aktif Et'}
                                            </button>
                                            <div className="h-px bg-slate-100 my-1"></div>
                                            <button
                                                onClick={() => handleDelete(emp.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 size={14} /> Sil
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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

            {/* Global Backdrop for Dropdowns */}
            {
                openMenuId && (
                    <div
                        className="fixed inset-0 z-20"
                        onClick={() => setOpenMenuId(null)}
                    ></div>
                )
            }
        </div >
    );
};

export default Employees;
