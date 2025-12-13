import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Users, Settings, Shield, Save, Plus, X, CalendarRange, FileText, LayoutDashboard, User, Mail, Phone, Briefcase, Calendar
} from 'lucide-react';
import api from '../services/api';

const EmployeeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [employee, setEmployee] = useState(null);
    const [managers, setManagers] = useState({ primary_managers: [], cross_managers: [] });
    const [team, setTeam] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignManagerModal, setAssignManagerModal] = useState(false);
    const [selectedManager, setSelectedManager] = useState('');

    const [workSchedules, setWorkSchedules] = useState([]);

    useEffect(() => {
        fetchEmployeeData();
    }, [id]);

    const fetchEmployeeData = async () => {
        try {
            const [empRes, managersRes, teamRes, allEmpRes, schedulesRes] = await Promise.all([
                api.get(`/employees/${id}/`),
                api.get(`/employees/${id}/managers/`),
                api.get(`/employees/${id}/team/`),
                api.get('/employees/'), // For selection dropdowns
                api.get('/work-schedules/')
            ]);

            setEmployee(empRes.data);
            setManagers(managersRes.data);
            setTeam(teamRes.data);
            setAllEmployees(allEmpRes.data.results || allEmpRes.data);
            setWorkSchedules(schedulesRes.data.results || schedulesRes.data);

            // Fetch all permissions
            const permsRes = await api.get('/permissions/');
            setAllPermissions(permsRes.data.results || permsRes.data);
        } catch (error) {
            console.error('Error fetching employee details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignManager = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/employees/${id}/assign-manager/`, {
                manager_id: selectedManager,
                relationship_type: 'PRIMARY'
            });
            setAssignManagerModal(false);
            fetchEmployeeData(); // Refresh data
        } catch (error) {
            console.error('Error assigning manager:', error);
            alert('Yönetici atanırken bir hata oluştu.');
        }
    };

    const handlePermissionToggle = (permId) => {
        const currentPerms = employee.direct_permissions.map(p => p.id);
        let newPerms;
        if (currentPerms.includes(permId)) {
            newPerms = currentPerms.filter(id => id !== permId);
        } else {
            newPerms = [...currentPerms, permId];
        }

        // Optimistic update for UI
        const updatedPermsList = allPermissions.filter(p => newPerms.includes(p.id));
        setEmployee({ ...employee, direct_permissions: updatedPermsList });
    };

    const handleSaveRoles = async () => {
        try {
            // Only save direct permissions
            const permIds = employee.direct_permissions.map(p => p.id);

            const payload = {
                direct_permissions: permIds,
                work_schedule: employee.work_schedule?.id || null,
                shift_start: employee.shift_start || null,
                shift_end: employee.shift_end || null,
                attendance_tolerance_minutes: employee.attendance_tolerance_minutes
            };

            await api.patch(`/employees/${id}/`, payload);
            alert('Ayarlar başarıyla güncellendi.');
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('Güncelleme sırasında bir hata oluştu.');
            fetchEmployeeData(); // Revert changes on error
        }
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
    if (!employee) return <div className="p-8 text-center">Çalışan bulunamadı.</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/employees')}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{employee.first_name} {employee.last_name}</h1>
                    <p className="text-slate-500">{employee.job_position_detail?.name} - {employee.department_detail?.name}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6">
                <div className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <User size={18} />
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setActiveTab('organization')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'organization' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={18} />
                        Organizasyon & Ekip
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
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">

                    {activeTab === 'overview' && (
                        <div className="card p-6 space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">Kişisel Bilgiler</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase">E-posta</label>
                                    <div className="flex items-center gap-2 mt-1 text-slate-700">
                                        <Mail size={16} className="text-blue-500" />
                                        {employee.email}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Telefon</label>
                                    <div className="flex items-center gap-2 mt-1 text-slate-700">
                                        <Phone size={16} className="text-blue-500" />
                                        {employee.phone || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Sicil No</label>
                                    <div className="flex items-center gap-2 mt-1 text-slate-700">
                                        <Briefcase size={16} className="text-blue-500" />
                                        {employee.employee_code}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase">İşe Başlama</label>
                                    <div className="flex items-center gap-2 mt-1 text-slate-700">
                                        <Calendar size={16} className="text-blue-500" />
                                        {employee.hired_date || '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'organization' && (
                        <div className="space-y-6">
                            {/* Managers Section */}
                            <div className="card p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-800">Yöneticiler</h3>
                                    <button
                                        onClick={() => setAssignManagerModal(true)}
                                        className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors font-medium"
                                    >
                                        + Yönetici Ata
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {managers.primary_managers.length > 0 ? (
                                        managers.primary_managers.map(mgr => (
                                            <div key={mgr.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {mgr.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{mgr.name}</div>
                                                        <div className="text-xs text-slate-500">{mgr.job_position}</div>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">Ana Yönetici</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-slate-400 text-sm text-center py-4">Henüz yönetici atanmamış.</div>
                                    )}
                                </div>
                            </div>

                            {/* Team Section */}
                            <div className="card p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Bağlı Ekip (Subordinates)</h3>
                                <div className="space-y-4">
                                    {team.length > 0 ? (
                                        team.map(member => (
                                            <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                                        {member.first_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{member.first_name} {member.last_name}</div>
                                                        <div className="text-xs text-slate-500">{member.job_position_detail?.name}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => navigate(`/employees/${member.id}`)}
                                                    className="text-xs text-slate-500 hover:text-blue-600"
                                                >
                                                    Detay
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-slate-400 text-sm text-center py-4">Bu çalışana bağlı kimse yok.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="card p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-800">Yetki ve Takvim Yönetimi</h3>
                                <button
                                    onClick={handleSaveRoles}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/30"
                                >
                                    <Save size={16} />
                                    Değişiklikleri Kaydet
                                </button>
                            </div>

                            {/* Work Schedule Section */}
                            <div className="mb-8 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h5 className="text-sm font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
                                    <CalendarRange size={16} />
                                    Çalışma Takvimi
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Takvim Şablonu</label>
                                        <select
                                            value={employee.work_schedule?.id || (employee.shift_start && employee.shift_end ? 'custom' : '')}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'custom') {
                                                    setEmployee({
                                                        ...employee,
                                                        work_schedule: null,
                                                        shift_start: employee.shift_start || '09:00',
                                                        shift_end: employee.shift_end || '18:00'
                                                    });
                                                } else {
                                                    const selectedId = val ? parseInt(val) : null;
                                                    const selectedSchedule = workSchedules.find(ws => ws.id === selectedId);
                                                    setEmployee({
                                                        ...employee,
                                                        work_schedule: selectedSchedule || null,
                                                        shift_start: null,
                                                        shift_end: null
                                                    });
                                                }
                                            }}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">Varsayılan / Yok</option>
                                            <option value="custom">Özel (Custom)</option>
                                            {workSchedules.map(ws => (
                                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Kullanıcının haftalık çalışma saatlerini belirler.
                                        </p>

                                        {/* Custom Time Inputs */}
                                        {!employee.work_schedule && employee.shift_start && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500">Başlangıç</label>
                                                    <input
                                                        type="time"
                                                        value={employee.shift_start}
                                                        onChange={(e) => setEmployee({ ...employee, shift_start: e.target.value })}
                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500">Bitiş</label>
                                                    <input
                                                        type="time"
                                                        value={employee.shift_end}
                                                        onChange={(e) => setEmployee({ ...employee, shift_end: e.target.value })}
                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tolerans (Dakika)</label>
                                        <input
                                            type="number"
                                            value={employee.attendance_tolerance_minutes || 0}
                                            onChange={(e) => setEmployee({ ...employee, attendance_tolerance_minutes: parseInt(e.target.value) || 0 })}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Geç kalma/erken çıkma için tolerans süresi.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {[
                                    'Employee Management',
                                    'Attendance & Time',
                                    'Overtime Management',
                                    'Project Management',
                                    'Reporting',
                                    'Organization & Settings',
                                    'Section Access'
                                ].map(category => {
                                    const categoryPerms = allPermissions.filter(p => {
                                        if (category === 'Employee Management') return p.code.startsWith('EMPLOYEE_');
                                        if (category === 'Attendance & Time') return p.code.startsWith('ATTENDANCE_') || p.code.startsWith('LEAVE_');
                                        if (category === 'Overtime Management') return p.code.startsWith('OVERTIME_');
                                        if (category === 'Project Management') return p.code.startsWith('PROJECT_');
                                        if (category === 'Reporting') return p.code.startsWith('REPORT_');
                                        if (category === 'Organization & Settings') return p.code.startsWith('ORG_') || p.code.startsWith('SETTINGS_') || p.code.startsWith('SYSTEM_');
                                        if (category === 'Section Access') return p.code.startsWith('VIEW_SECTION_');
                                        return false;
                                    });

                                    if (categoryPerms.length === 0) return null;

                                    const isSuperUser = employee.user?.is_superuser;
                                    const allCategoryIds = categoryPerms.map(p => p.id);
                                    const assignedCategoryIds = categoryPerms.filter(p => employee.direct_permissions.some(dp => dp.id === p.id)).map(p => p.id);
                                    const isAllSelected = assignedCategoryIds.length === allCategoryIds.length;

                                    const handleSelectAll = () => {
                                        if (isSuperUser) return;

                                        let newPermissions = [...employee.direct_permissions];
                                        if (isAllSelected) {
                                            // Deselect all in this category
                                            newPermissions = newPermissions.filter(p => !allCategoryIds.includes(p.id));
                                        } else {
                                            // Select all in this category
                                            const missingPerms = categoryPerms.filter(p => !newPermissions.some(dp => dp.id === p.id));
                                            newPermissions = [...newPermissions, ...missingPerms];
                                        }
                                        setEmployee({ ...employee, direct_permissions: newPermissions });
                                    };

                                    return (
                                        <div key={category} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                                                <h5 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    {category === 'Employee Management' && <Users size={16} />}
                                                    {(category === 'Attendance & Time' || category === 'Overtime Management') && <Calendar size={16} />}
                                                    {category === 'Project Management' && <Briefcase size={16} />}
                                                    {category === 'Reporting' && <FileText size={16} />}
                                                    {category === 'Organization & Settings' && <Settings size={16} />}
                                                    {category === 'Section Access' && <LayoutDashboard size={16} />}

                                                    {category === 'Employee Management' ? 'Çalışan Yönetimi' :
                                                        category === 'Attendance & Time' ? 'Mesai ve İzin' :
                                                            category === 'Overtime Management' ? 'Fazla Mesai Yönetimi' :
                                                                category === 'Project Management' ? 'Proje Yönetimi' :
                                                                    category === 'Reporting' ? 'Raporlama (Kapsamlı)' :
                                                                        category === 'Organization & Settings' ? 'Organizasyon ve Ayarlar' :
                                                                            'Bölüm Erişimi (Menü)'}
                                                </h5>
                                                {!isSuperUser && (
                                                    <button
                                                        onClick={handleSelectAll}
                                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                                    >
                                                        {isAllSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {categoryPerms.map(perm => {
                                                    const isAssigned = isSuperUser || employee.direct_permissions.some(p => p.id === perm.id);
                                                    return (
                                                        <div key={perm.id}
                                                            onClick={() => !isSuperUser && handlePermissionToggle(perm.id)}
                                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${isAssigned
                                                                ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500'
                                                                : 'bg-white border-slate-200 hover:border-blue-300'
                                                                } ${isSuperUser ? 'opacity-75 cursor-not-allowed' : ''}`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors shrink-0 ${isAssigned ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                                                    }`}>
                                                                    {isAssigned && <span className="text-white text-xs">✓</span>}
                                                                </div>
                                                                <div>
                                                                    <h4 className={`font-bold text-sm ${isAssigned ? 'text-blue-800' : 'text-slate-700'}`}>
                                                                        {perm.name}
                                                                    </h4>
                                                                    <p className="text-xs text-slate-500 mt-1 leading-snug">{perm.description}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-3">
                                <Shield size={20} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Dikkat</p>
                                    <p className="mt-1">Yetki değişiklikleri kullanıcının sisteme bir sonraki girişinde veya sayfa yenilemesinde aktif olacaktır.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Summary Card */}
                <div className="lg:col-span-1">
                    <div className="card p-6 sticky top-6">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">
                                {employee.first_name[0]}{employee.last_name[0]}
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">{employee.first_name} {employee.last_name}</h2>
                            <p className="text-slate-500 font-medium">{employee.job_position_detail?.name}</p>
                            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${employee.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {employee.is_active ? 'Aktif Çalışan' : 'Pasif'}
                            </div>
                        </div>

                        <div className="space-y-3 border-t border-slate-100 pt-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Departman</span>
                                <span className="font-medium text-slate-800 text-right">{employee.department_detail?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Lokasyon</span>
                                <span className="font-medium text-slate-800">Merkez Ofis</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assign Manager Modal */}
            {assignManagerModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">Yönetici Ata</h3>
                            <button onClick={() => setAssignManagerModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAssignManager} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Yönetici Seç</label>
                                <select
                                    required
                                    className="input-field"
                                    value={selectedManager}
                                    onChange={(e) => setSelectedManager(e.target.value)}
                                >
                                    <option value="">Seçiniz</option>
                                    {allEmployees
                                        .filter(e => e.id !== employee.id) // Can't manage self
                                        .map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.first_name} {e.last_name} ({e.job_position_detail?.name})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setAssignManagerModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 transition-all">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeDetail;
