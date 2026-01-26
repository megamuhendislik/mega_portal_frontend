import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Users, Settings, Shield, Save, Plus, X, CalendarRange, FileText, LayoutDashboard, User, Mail, Phone, Briefcase, Calendar, MapPin, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import WeeklyScheduleEditor from '../components/WeeklyScheduleEditor';

const EmployeeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth(); // Destructure
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    const canEdit = hasPermission('EMPLOYEE_UPDATE'); // Check permission
    const canEditSensitive = hasPermission('EMPLOYEE_EDIT_SENSITIVE');
    const canChangePassword = hasPermission('EMPLOYEE_CHANGE_PASSWORD');
    const canManageRoles = hasPermission('EMPLOYEE_MANAGE_ROLES'); // Use ACCESS_ASSIGN_PERMISSIONS if mapped, but preferably explicit

    // Data Sources
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [workSchedules, setWorkSchedules] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [allRoles, setAllRoles] = useState([]);

    // Form Data State (Unified)
    const [formData, setFormData] = useState({
        // Identity
        first_name: '', last_name: '', email: '', phone: '',
        tc_no: '', birth_date: '',
        address: '', emergency_contact_name: '', emergency_contact_phone: '',

        // Corporate
        department: '', job_position: '',
        hired_date: '', employee_code: '',
        primary_manager_ids: [], cross_manager_ids: [],
        is_active: true,
        is_profile_editable: false,

        // Work Schedule
        work_schedule: '',
        attendance_tolerance_minutes: 0, daily_break_allowance: 0,
        shift_start: '', shift_end: '',
        lunch_start: '12:30', lunch_end: '13:30',

        // Permissions
        roles: [], direct_permissions: [],

        // Password (New)
        new_password: '',
    });

    const [customScheduleMode, setCustomScheduleMode] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [empRes, deptRes, posRes, allEmpRes, schedRes, permsRes, rolesRes, managersRes] = await Promise.all([
                api.get(`/employees/${id}/`),
                api.get('/departments/'),
                api.get('/job-positions/'),
                api.get('/employees/'),
                api.get('/work-schedules/'),
                api.get('/permissions/'),
                api.get('/roles/'),
                api.get(`/employees/${id}/managers/`)
            ]);

            const emp = empRes.data;
            const managers = managersRes.data;

            setDepartments(deptRes.data.results || deptRes.data);
            setJobPositions(posRes.data.results || posRes.data);
            setAllEmployees(allEmpRes.data.results || allEmpRes.data);
            setWorkSchedules(schedRes.data.results || schedRes.data);
            setAllPermissions(permsRes.data.results || permsRes.data);
            setAllRoles(rolesRes.data.results || rolesRes.data);

            // Populate Form Data
            setFormData({
                first_name: emp.first_name || '',
                last_name: emp.last_name || '',
                email: emp.email || '',
                phone: emp.phone || '',
                tc_no: emp.tc_no || '',
                birth_date: emp.birth_date || '',
                address: emp.address || '',
                emergency_contact_name: emp.emergency_contact_name || '',
                emergency_contact_phone: emp.emergency_contact_phone || '',

                department: emp.department || '',
                job_position: emp.job_position || '',
                hired_date: emp.hired_date || '',
                employee_code: emp.employee_code || '',
                is_active: emp.is_active,
                is_profile_editable: emp.is_profile_editable || false,

                // Map managers to IDs
                primary_manager_ids: managers.primary_managers.map(m => m.id),
                cross_manager_ids: managers.cross_managers.map(m => m.id),

                work_schedule: emp.work_schedule?.id || '',
                attendance_tolerance_minutes: emp.attendance_tolerance_minutes || 0,
                daily_break_allowance: emp.daily_break_allowance || 0,
                shift_start: emp.shift_start || '',
                shift_end: emp.shift_end || '',
                lunch_start: emp.lunch_start || '12:30',
                lunch_end: emp.lunch_end || '13:30',
                weekly_schedule: emp.weekly_schedule || {},

                roles: emp.roles.map(r => r.id),
                direct_permissions: emp.direct_permissions.map(p => p.id),

                new_password: '', // Reset
            });

            // If no work schedule is assigned, assume custom mode
            setCustomScheduleMode(!emp.work_schedule);

        } catch (error) {
            console.error('Error fetching employee details:', error);
            alert('Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleSave = async () => {
        try {
            // Prepare payload
            const payload = {
                ...formData,
                work_schedule: formData.work_schedule || null, // Handle empty string
                department: formData.department || null,
                job_position: formData.job_position || null,
            };

            // Handle password change
            if (formData.new_password) {
                payload.password = formData.new_password;
            } else {
                delete payload.new_password; // Don't send empty new_password field to backend if it expects 'password'
            }

            await api.patch(`/employees/${id}/`, payload);
            alert('Değişiklikler başarıyla kaydedildi.');
            fetchInitialData(); // Refresh to ensure sync
        } catch (error) {
            console.error('Error updating employee:', error);
            alert('Güncelleme sırasında hata oluştu: ' + (error.response?.data?.detail || error.message));
        }
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/employees')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{formData.first_name} {formData.last_name}</h1>
                        <p className="text-slate-500">
                            {jobPositions.find(p => p.id === parseInt(formData.job_position))?.name || '-'}
                            {' • '}
                            {departments.find(d => d.id === parseInt(formData.department))?.name || '-'}
                        </p>
                    </div>
                </div>
                {canEdit && (
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
                    >
                        <Save size={18} />
                        Kaydet
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6">
                <div className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <User size={18} />
                        Kimlik & İletişim
                    </button>
                    <button
                        onClick={() => setActiveTab('organization')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'organization' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={18} />
                        Kurumsal & Organizasyon
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Settings size={18} />
                        Ayarlar & Yetkiler
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <fieldset disabled={!canEdit} className="contents">
                        {activeTab === 'overview' && (
                            <div className="card p-6 space-y-6 animate-in fade-in slide-in-from-left-4">
                                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Kişisel Bilgiler</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">TC Kimlik No</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="tc_no"
                                                maxLength={11}
                                                value={formData.tc_no}
                                                onChange={handleInputChange}
                                                disabled={!canEditSensitive} // Granular check
                                                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${!canEditSensitive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                            />
                                            {!canEditSensitive && <Shield className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Doğum Tarihi</label>
                                        <input
                                            type="date"
                                            name="birth_date"
                                            value={formData.birth_date}
                                            onChange={handleInputChange}
                                            disabled={!canEditSensitive} // Granular check
                                            className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${!canEditSensitive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                        />
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
                            </div>
                        )}

                        {activeTab === 'organization' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                                <div className="card p-6">
                                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Kurumsal Bilgiler</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Departman <span className="text-red-500">*</span></label>
                                            <select name="department" required value={formData.department} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="">Seçiniz</option>
                                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Pozisyon <span className="text-red-500">*</span></label>
                                            <select name="job_position" required value={formData.job_position} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="">Seçiniz</option>
                                                {jobPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">İşe Başlama Tarihi <span className="text-red-500">*</span></label>
                                            <input type="date" name="hired_date" required value={formData.hired_date} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Sicil No</label>
                                            <input type="text" name="employee_code" value={formData.employee_code} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="card p-6">
                                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Yönetici Atamaları</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Ana Yöneticiler (Primary)</label>
                                            <div className="h-48 overflow-y-auto border rounded-lg p-2 bg-slate-50">
                                                {allEmployees.filter(e => e.id !== parseInt(id)).map(emp => (
                                                    <label key={emp.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.primary_manager_ids.includes(emp.id)}
                                                            onChange={() => toggleArrayItem('primary_manager_ids', emp.id)}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm">{emp.first_name} {emp.last_name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">İzin ve mesai onayı verecek yöneticiler.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Çapraz Yöneticiler (Cross)</label>
                                            <div className="h-48 overflow-y-auto border rounded-lg p-2 bg-slate-50">
                                                {allEmployees.filter(e => e.id !== parseInt(id)).map(emp => (
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
                                            <p className="text-xs text-slate-500 mt-1">Sadece görev atayabilen yöneticiler.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                                {/* Profile Edit Permission (New) */}
                                {canEditSensitive && (
                                    <div className={`card p-6 border ${formData.is_profile_editable ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                    <Settings size={20} className={formData.is_profile_editable ? "text-green-600" : "text-slate-400"} />
                                                    Profil Düzenleme İzni
                                                </h3>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    Bu izin açıldığında, kullanıcı <b>tek seferlik</b> olarak kendi şifresini ve kişisel bilgilerini (adres, telefon vb.) düzenleyebilir.
                                                    işlem sonrası izin otomatik olarak kapanacaktır.
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={formData.is_profile_editable}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, is_profile_editable: e.target.checked }))}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Password Change Section (Protected) */}
                                {canChangePassword && (
                                    <div className="card p-6 border border-yellow-200 bg-yellow-50/30">
                                        <h3 className="text-lg font-bold text-slate-800 border-b border-yellow-100 pb-4 mb-4 flex items-center gap-2">
                                            <Shield size={20} className="text-yellow-600" />
                                            Güvenlik & Şifre
                                        </h3>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Yeni Şifre Belirle</label>
                                            <input
                                                type="text" // Visible as requested
                                                name="new_password"
                                                value={formData.new_password}
                                                onChange={handleInputChange}
                                                placeholder="Yeni şifre giriniz (Boş bırakılırsa değişmez)"
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Dikkat: Şifre alanını doldurup kaydederseniz kullanıcının şifresi değişecektir.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Work Schedule */}
                                <div className="card p-6">
                                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
                                        <CalendarRange size={20} className="text-blue-500" />
                                        Çalışma Takvimi & Mesai
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Takvim Şablonu</label>
                                            <select
                                                value={formData.work_schedule || (customScheduleMode ? 'custom' : '')}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'custom') {
                                                        setCustomScheduleMode(true);
                                                        setFormData(prev => ({ ...prev, work_schedule: '' }));
                                                    } else if (val === '') {
                                                        setCustomScheduleMode(false);
                                                        setFormData(prev => ({ ...prev, work_schedule: '' }));
                                                    } else {
                                                        setCustomScheduleMode(false);
                                                        setFormData(prev => ({ ...prev, work_schedule: parseInt(val) }));
                                                    }
                                                }}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">Varsayılan / Yok</option>
                                                <option value="custom">Özel (Custom)</option>
                                                {workSchedules.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Tolerans (Dk)</label>
                                            <input type="number" name="attendance_tolerance_minutes" value={formData.attendance_tolerance_minutes} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Mola Hakkı (Dk)</label>
                                            <input type="number" name="daily_break_allowance" value={formData.daily_break_allowance} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>

                                        {customScheduleMode && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vardiya Başlangıç</label>
                                                    <input type="time" name="shift_start" value={formData.shift_start} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vardiya Bitiş</label>
                                                    <input type="time" name="shift_end" value={formData.shift_end} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Öğle Molası Başlangıç</label>
                                            <input type="time" name="lunch_start" value={formData.lunch_start} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Öğle Molası Bitiş</label>
                                            <input type="time" name="lunch_end" value={formData.lunch_end} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Roles & Permissions */}
                                <div className="card p-6">
                                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
                                        <Shield size={20} className="text-blue-500" /> Roller ve Yetkiler
                                    </h3>

                                    <div className="mb-6">
                                        <h4 className="font-semibold text-slate-700 mb-3">Roller</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {allRoles.map(role => (
                                                <label key={role.id} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.roles.includes(role.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'} ${!canManageRoles ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.roles.includes(role.id)}
                                                        onChange={() => toggleArrayItem('roles', role.id)}
                                                        disabled={!canManageRoles} // Granular check
                                                        className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-800">{role.name}</div>
                                                        <div className="text-xs text-slate-500">{role.description}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        {!canManageRoles && <p className="text-xs text-red-400 mt-2">* Rol yönetimi için yetkiniz bulunmamaktadır.</p>}
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-3">Ekstra Yetkiler</h4>
                                        <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {allPermissions.map(perm => (
                                                <label key={perm.id} className={`flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer ${!canManageRoles ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.direct_permissions.includes(perm.id)}
                                                        onChange={() => toggleArrayItem('direct_permissions', perm.id)}
                                                        disabled={!canManageRoles} // Granular check
                                                        className="rounded text-orange-600 focus:ring-orange-500"
                                                    />
                                                    <span className="text-sm" title={perm.description}>{perm.name} <span className="text-xs text-slate-400">({perm.code})</span></span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </fieldset>
                </div>

                {/* Right Column - Summary Card */}
                <div className="lg:col-span-1">
                    <div className="card p-6 sticky top-6">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">
                                {formData.first_name?.[0]}{formData.last_name?.[0]}
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">{formData.first_name} {formData.last_name}</h2>
                            <p className="text-slate-500 font-medium">
                                {jobPositions.find(p => p.id === parseInt(formData.job_position))?.name || '-'}
                            </p>
                            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${formData.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {formData.is_active ? 'Aktif Çalışan' : 'Pasif'}
                            </div>
                        </div>

                        <div className="space-y-3 border-t border-slate-100 pt-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Departman</span>
                                <span className="font-medium text-slate-800 text-right">
                                    {departments.find(d => d.id === parseInt(formData.department))?.name || '-'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">İşe Başlama</span>
                                <span className="font-medium text-slate-800">{formData.hired_date || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Yöneticiler</span>
                                <span className="font-medium text-slate-800">{formData.primary_manager_ids.length} Ana, {formData.cross_manager_ids.length} Çapraz</span>
                            </div>
                        </div>
                        {canEdit && (
                            <button
                                onClick={handleSave}
                                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Değişiklikleri Kaydet
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default EmployeeDetail;
