import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, MapPin, User, Settings, Trash2, Power, ShieldAlert, CheckCircle, X, Clock, Key, Users } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import WeeklyScheduleEditor from '../components/WeeklyScheduleEditor';

const Employees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [workSchedules, setWorkSchedules] = useState([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const [showModal, setShowModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);

    // Form Data State
    const [formData, setFormData] = useState({
        // Identity
        username: '', password: '',
        first_name: '', last_name: '', email: '', phone: '',
        tc_no: '', birth_date: '',

        // Corporate
        department: '', job_position: '', secondary_job_positions: [],
        hired_date: '', employee_code: '',
        primary_manager_ids: [], cross_manager_ids: [],

        // Work Schedule
        work_schedule: '', card_uid: '',
        attendance_tolerance_minutes: 0, daily_break_allowance: 0,
        shift_start: '', shift_end: '',
        weekly_schedule: {}, is_custom_schedule: false,

        // Permissions
        roles: [], direct_permissions: [],

        // Other
        address: '', emergency_contact_name: '', emergency_contact_phone: ''
    });

    const totalSteps = 5;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [empRes, deptRes, posRes, rolesRes, permsRes, schedRes] = await Promise.all([
                api.get('/employees/'),
                api.get('/departments/'),
                api.get('/job-positions/'),
                api.get('/roles/'),
                api.get('/permissions/'),
                api.get('/work-schedules/')
            ]);
            setEmployees(empRes.data.results || empRes.data);
            setDepartments(deptRes.data.results || deptRes.data);
            setJobPositions(posRes.data.results || posRes.data);
            setRoles(rolesRes.data.results || rolesRes.data);
            setPermissions(permsRes.data.results || permsRes.data);
            setWorkSchedules(schedRes.data.results || schedRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (emp) => {
        try {
            await api.patch(`/employees/${emp.id}/`, { is_active: !emp.is_active });
            setEmployees(employees.map(e => e.id === emp.id ? { ...e, is_active: !e.is_active } : e));
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('Durum değiştirilirken hata oluştu.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu çalışanı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/employees/${id}/`);
            setEmployees(employees.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Silme işlemi başarısız.');
        }
    };

    const getJobPositionName = (id) => {
        const pos = jobPositions.find(p => p.id === parseInt(id));
        return pos ? pos.name : '-';
    };

    const getDepartmentName = (id) => {
        const dept = departments.find(d => d.id === parseInt(id));
        return dept ? dept.name : '-';
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (emp.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (emp.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept ? emp.department === parseInt(selectedDept) : true;
        const matchesStatus = filterStatus === 'ALL' ? true :
            filterStatus === 'ACTIVE' ? emp.is_active : !emp.is_active;
        return matchesSearch && matchesDept && matchesStatus;
    });

    // Wizard Logic
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Auto-fill permissions when Job Positions change
    useEffect(() => {
        // Validation: wait for reference data
        if (jobPositions.length === 0 || roles.length === 0) return;

        if (!formData.job_position && (!formData.secondary_job_positions || formData.secondary_job_positions.length === 0)) {
            // If no position selected, maybe clear? But let's verify if we want to clear everything.
            // For now, if no position, we typically don't auto-fill anything.
            return;
        }

        const allSelectedRoleIds = new Set();

        // 1. Get roles from Primary Position
        if (formData.job_position) {
            const posId = parseInt(formData.job_position);
            const primaryPos = jobPositions.find(p => p.id === posId);
            if (primaryPos && primaryPos.default_roles) {
                primaryPos.default_roles.forEach(r => allSelectedRoleIds.add(r.id));
            }
        }

        // 2. Get roles from Secondary Positions
        if (formData.secondary_job_positions && formData.secondary_job_positions.length > 0) {
            formData.secondary_job_positions.forEach(posId => {
                const secPos = jobPositions.find(p => p.id === parseInt(posId));
                if (secPos && secPos.default_roles) {
                    secPos.default_roles.forEach(r => allSelectedRoleIds.add(r.id));
                }
            });
        }

        // 3. Collect permissions recursively (handling inheritance)
        const collectedPermissions = new Set();
        const visitedRoles = new Set(); // Prevent infinite loops

        const collectFromRole = (roleId) => {
            if (visitedRoles.has(roleId)) return;
            visitedRoles.add(roleId);

            const role = roles.find(r => r.id === roleId);
            if (!role) return;

            // Add direct permissions of this role
            // Check if 'permissions' is list of objects (from serializer) or IDs
            if (role.permissions) {
                role.permissions.forEach(p => {
                    // Handle both object and ID cases just to be safe
                    const pId = typeof p === 'object' ? p.id : p;
                    collectedPermissions.add(pId);
                });
            }

            // Recurse for inherited roles
            if (role.inherits_from && role.inherits_from.length > 0) {
                role.inherits_from.forEach(inheritedId => {
                    // inherits_from is typically list of IDs
                    const iId = typeof inheritedId === 'object' ? inheritedId.id : inheritedId;
                    collectFromRole(iId);
                });
            }
        };

        allSelectedRoleIds.forEach(roleId => collectFromRole(roleId));

        // Update FormData
        // We overwrite direct_permissions with the auto-calculated set.
        // This is standard "Preset" behavior.
        setFormData(prev => ({
            ...prev,
            roles: Array.from(allSelectedRoleIds),
            direct_permissions: Array.from(collectedPermissions)
        }));

    }, [formData.job_position, formData.secondary_job_positions, jobPositions, roles]);

    const handleMultiSelectChange = (e, field) => {
        const options = e.target.options;
        const values = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                values.push(parseInt(options[i].value));
            }
        }
        setFormData(prev => ({ ...prev, [field]: values }));
    };

    const toggleArrayItem = (field, id) => {
        setFormData(prev => {
            const current = prev[field] || [];
            if (current.includes(id)) {
                return { ...prev, [field]: current.filter(item => item !== id) };
            } else {
                return { ...prev, [field]: [...current, id] };
            }
        });
    };

    const nextStep = () => {
        if (currentStep < totalSteps) setCurrentStep(curr => curr + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(curr => curr - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Clean payload
            const payload = {
                ...formData,
                shift_start: formData.shift_start || null,
                shift_end: formData.shift_end || null,
                birth_date: formData.birth_date || null,
                hired_date: formData.hired_date || null,
                lunch_start: formData.lunch_start || null,
                lunch_end: formData.lunch_end || null,
                card_uid: formData.card_uid || null,
                // Ensure Arrays
                weekly_schedule: formData.weekly_schedule || {},
                roles: formData.roles || [],
                direct_permissions: formData.direct_permissions || [],
                secondary_job_positions: formData.secondary_job_positions || [],
            };

            const response = await api.post('/employees/', payload);
            setEmployees([...employees, response.data]);
            setShowModal(false);
            setFormData({
                username: '', password: '',
                first_name: '', last_name: '', email: '', phone: '',
                department: '', job_position: '',
                hired_date: '', employee_code: '',
                primary_manager_ids: [], cross_manager_ids: [],
                work_schedule: '', card_uid: '',
                attendance_tolerance_minutes: 0, daily_break_allowance: 0,
                shift_start: '', shift_end: '',
                roles: [], direct_permissions: [],
                tc_no: '', birth_date: '', address: '',
                emergency_contact_name: '', emergency_contact_phone: ''
            });
            setCurrentStep(1);
            alert('Çalışan başarıyla eklendi.');
        } catch (error) {
            console.error('Error creating employee:', error);
            let errorMsg = 'Çalışan eklenirken hata oluştu.';
            if (error.response?.data) {
                // If data is object with keys (validation errors)
                if (typeof error.response.data === 'object') {
                    errorMsg += '\n' + Object.entries(error.response.data)
                        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                        .join('\n');
                } else {
                    errorMsg += ' ' + (error.response.data.detail || JSON.stringify(error.response.data));
                }
            } else {
                errorMsg += ' ' + error.message;
            }
            alert(errorMsg);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
            {[1, 2, 3, 4, 5].map(step => (
                <div key={step} className={`flex flex-col items-center gap-2 bg-white px-2`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step === currentStep ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' :
                        step < currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                        {step < currentStep ? '✓' : step}
                    </div>
                    <span className={`text-xs font-medium ${step === currentStep ? 'text-blue-600' : 'text-slate-400'}`}>
                        {step === 1 ? 'Kimlik' : step === 2 ? 'Kurumsal' : step === 3 ? 'Mesai' : step === 4 ? 'Yetki' : 'Özet'}
                    </span>
                </div>
            ))}
        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Identity
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ad <span className="text-red-500">*</span></label>
                            <input type="text" name="first_name" required value={formData.first_name} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Soyad <span className="text-red-500">*</span></label>
                            <input type="text" name="last_name" required value={formData.last_name} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta <span className="text-red-500">*</span></label>
                            <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Adı <span className="text-red-500">*</span></label>
                            <input type="text" name="username" required value={formData.username} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre <span className="text-red-500">*</span></label>
                            <input type="password" name="password" required value={formData.password} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">TC Kimlik No</label>
                            <input type="text" name="tc_no" maxLength={11} value={formData.tc_no} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Doğum Tarihi</label>
                            <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                            <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Acil Durum Kişisi</label>
                            <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Acil Durum Telefonu</label>
                            <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                );
            case 2: // Corporate
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Departman <span className="text-red-500">*</span></label>
                            <select name="department" required value={formData.department} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Seçiniz</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ana Pozisyon (Primary) <span className="text-red-500">*</span></label>
                            <select name="job_position" required value={formData.job_position} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Seçiniz</option>
                                {jobPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ek Pozisyonlar (Secondary)</label>
                            <div className="flex flex-wrap gap-2">
                                {jobPositions.filter(p => p.id !== parseInt(formData.job_position)).map(p => (
                                    <label key={p.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${(formData.secondary_job_positions || []).includes(p.id) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={(formData.secondary_job_positions || []).includes(p.id)}
                                            onChange={() => toggleArrayItem('secondary_job_positions', p.id)}
                                        />
                                        <span>{p.name}</span>
                                        {(formData.secondary_job_positions || []).includes(p.id) && <CheckCircle size={14} />}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">İşe Başlama Tarihi <span className="text-red-500">*</span></label>
                            <input type="date" name="hired_date" required value={formData.hired_date} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sicil No</label>
                            <input type="text" name="employee_code" value={formData.employee_code} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        {/* Managers */}
                        <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <Users size={18} className="text-blue-500" /> Yönetici Atamaları
                            </h4>
                        </div>

                        {/* Primary Manager - Single Select */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Doğrudan Amir (Direct Manager)</label>
                            <select
                                value={formData.primary_manager_ids[0] || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => ({
                                        ...prev,
                                        primary_manager_ids: val ? [parseInt(val)] : []
                                    }));
                                }}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Departman Yöneticisine Bağla (Varsayılan)</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({getJobPositionName(emp.job_position)})</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Seçilmezse, hiyerarşide departman yöneticisine bağlanır.</p>
                        </div>

                        {/* Cross Managers - Multi Select */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Çapraz Yöneticiler (Matrix)</label>
                            <div className="h-32 overflow-y-auto border rounded-lg p-2 bg-slate-50">
                                {employees.map(emp => (
                                    <label key={emp.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.cross_manager_ids.includes(emp.id)}
                                            onChange={() => toggleArrayItem('cross_manager_ids', emp.id)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm">{emp.first_name} {emp.last_name}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Sadece görev atayabilen, ek yöneticiler.</p>
                        </div>
                    </div>
                );
            case 3: // Work Schedule
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                        <div className="md:col-span-2">
                            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <Clock size={18} className="text-blue-500" /> Çalışma Takvimi & Mesai
                            </h4>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Çalışma Takvimi</label>
                            <select
                                name="work_schedule"
                                value={formData.work_schedule || (formData.is_custom_schedule ? 'custom' : '')}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'custom') {
                                        setFormData(prev => ({ ...prev, work_schedule: '', is_custom_schedule: true }));
                                    } else {
                                        setFormData(prev => ({ ...prev, work_schedule: val, is_custom_schedule: false }));
                                    }
                                }}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Varsayılan</option>
                                <option value="custom">Özel Takvim Oluştur (Custom)</option>
                                {workSchedules.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                            </select>
                        </div>

                        {/* Custom Weekly Schedule Editor */}
                        {formData.is_custom_schedule && (
                            <div className="md:col-span-2 animate-in fade-in slide-in-from-top-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Haftalık Çalışma Planı</label>
                                <WeeklyScheduleEditor
                                    value={formData.weekly_schedule}
                                    onChange={(newSchedule) => setFormData(prev => ({ ...prev, weekly_schedule: newSchedule }))}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kart ID (Card UID)</label>
                            <input type="text" name="card_uid" value={formData.card_uid} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Kart okutunuz veya giriniz" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Geç Kalma Toleransı (Dk)</label>
                            <input type="number" name="attendance_tolerance_minutes" value={formData.attendance_tolerance_minutes} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Günlük Mola Hakkı (Dk)</label>
                            <input type="number" name="daily_break_allowance" value={formData.daily_break_allowance} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                );
            case 4: // Permissions
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                                <ShieldAlert size={18} /> Yetkilendirme
                            </h4>
                            <p className="text-sm text-blue-700">
                                Seçilen pozisyona göre yetkiler otomatik işaretlenmiştir. İsterseniz düzenleyebilirsiniz.
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700">Tüm Yetkiler</label>
                                <span className="text-xs text-slate-500">{permissions.length} yetki tanımlı</span>
                            </div>

                            <div className="h-[400px] overflow-y-auto border rounded-lg p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {permissions.map(perm => {
                                    const isChecked = formData.direct_permissions.includes(perm.id);
                                    return (
                                        <label
                                            key={perm.id}
                                            className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${isChecked
                                                ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500'
                                                : 'bg-slate-100 border-transparent hover:bg-white hover:border-slate-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleArrayItem('direct_permissions', perm.id)}
                                                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <div className={`font-medium text-sm ${isChecked ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    {perm.name}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{perm.code}</div>
                                                {perm.description && (
                                                    <div className="text-xs text-slate-500 mt-1 leading-snug">{perm.description}</div>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            case 5: // Summary
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Özet Bilgiler</h4>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div><span className="text-slate-500 block">Ad Soyad:</span> {formData.first_name} {formData.last_name}</div>
                                <div><span className="text-slate-500 block">E-posta:</span> {formData.email}</div>
                                <div><span className="text-slate-500 block">Departman:</span> {getDepartmentName(formData.department)}</div>
                                <div><span className="text-slate-500 block">Pozisyon:</span> {getJobPositionName(formData.job_position)}</div>
                                <div><span className="text-slate-500 block">Ana Yöneticiler:</span> {formData.primary_manager_ids.length} Kişi</div>
                                <div><span className="text-slate-500 block">Çapraz Yöneticiler:</span> {formData.cross_manager_ids.length} Kişi</div>
                                <div><span className="text-slate-500 block">Çalışma Takvimi:</span> {workSchedules.find(w => w.id === parseInt(formData.work_schedule))?.name || 'Varsayılan'}</div>
                                <div><span className="text-slate-500 block">Kullanıcı Adı:</span> {formData.username}</div>
                                <div><span className="text-slate-500 block">Kullanıcı Adı:</span> {formData.username}</div>
                                <div><span className="text-slate-500 block">Yetkiler:</span> {formData.direct_permissions.length} Adet Seçili</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                            <CheckCircle size={20} />
                            <span className="font-medium">Tüm bilgiler hazır. Kaydı tamamlayabilirsiniz.</span>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleResetData = async () => {
        if (!window.confirm('⚠️ DİKKAT! Admin hariç TÜM çalışanlar ve kullanıcılar silinecek.\n\nBu işlem geri alınamaz.\n\nOnaylıyor musunuz?')) return;
        try {
            const res = await api.post('/employees/reset-data/');
            alert(res.data.status);
            window.location.reload();
        } catch (error) {
            console.error('Reset error:', error);
            alert('Sıfırlama başarısız: ' + (error.response?.data?.error || error.message));
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Çalışanlar</h2>
                    <p className="text-slate-500 mt-1">Personel listesi ve yönetimi</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleResetData}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors border border-red-200"
                    >
                        <Trash2 size={18} className="mr-2" /> Verileri Sıfırla
                    </button>
                    <button
                        onClick={() => { setShowModal(true); setCurrentStep(1); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-blue-500/30"
                    >
                        <Plus size={18} className="mr-2" />
                        Yeni Çalışan Ekle
                    </button>
                </div>
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
                    </div>
                ))}
            </div>

            {
                filteredEmployees.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        Kayıtlı çalışan bulunamadı.
                    </div>
                )
            }

            {/* Add Employee Modal with Portal */}
            {
                showModal && createPortal(
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
                )
            }

            {/* Global Backdrop for Dropdowns */}
            {
                openMenuId && (
                    <div
                        className="fixed inset-0 z-20"
                        onClick={() => setOpenMenuId(null)}
                    ></div>
                )
            }
        </div>
    );
};

export default Employees;
