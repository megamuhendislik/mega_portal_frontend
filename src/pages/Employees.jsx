import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, MapPin, User, Settings, Trash2, Power, ShieldAlert, CheckCircle, X } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Employees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [jobPositions, setJobPositions] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, PASSIVE

    // Missing state restored
    const [showModal, setShowModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        department: '', job_position: '', role: '',
        hired_date: '', employee_code: '',
        tc_no: '', birth_date: '', address: '',
        emergency_contact_name: '', emergency_contact_phone: ''
    });

    const totalSteps = 4;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [empRes, deptRes, posRes, rolesRes] = await Promise.all([
                api.get('/employees/'),
                api.get('/departments/'),
                api.get('/job-positions/'),
                api.get('/roles/')
            ]);
            setEmployees(empRes.data.results || empRes.data);
            setDepartments(deptRes.data.results || deptRes.data);
            setJobPositions(posRes.data.results || posRes.data);
            setRoles(rolesRes.data.results || rolesRes.data);
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
        const pos = jobPositions.find(p => p.id === id);
        return pos ? pos.name : '-';
    };

    const getDepartmentName = (id) => {
        const dept = departments.find(d => d.id === id);
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

    const nextStep = () => {
        if (currentStep < totalSteps) setCurrentStep(curr => curr + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(curr => curr - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/employees/', formData);
            setEmployees([...employees, response.data]);
            setShowModal(false);
            setFormData({
                first_name: '', last_name: '', email: '', phone: '',
                department: '', job_position: '', role: '',
                hired_date: '', employee_code: '',
                tc_no: '', birth_date: '', address: '',
                emergency_contact_name: '', emergency_contact_phone: ''
            });
            setCurrentStep(1);
            alert('Çalışan başarıyla eklendi.');
        } catch (error) {
            console.error('Error creating employee:', error);
            alert('Çalışan eklenirken hata oluştu: ' + (error.response?.data?.detail || error.message));
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
            {[1, 2, 3, 4].map(step => (
                <div key={step} className={`flex flex-col items-center gap-2 bg-white px-2`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step === currentStep ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' :
                            step < currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                        {step < currentStep ? '✓' : step}
                    </div>
                    <span className={`text-xs font-medium ${step === currentStep ? 'text-blue-600' : 'text-slate-400'}`}>
                        {step === 1 ? 'Kimlik' : step === 2 ? 'Kurumsal' : step === 3 ? 'Diğer' : 'Özet'}
                    </span>
                </div>
            ))}
        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
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
                    </div>
                );
            case 2:
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
                );
            case 3:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                            <textarea name="address" rows="3" value={formData.address} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
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
            case 4:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-2">Özet Bilgiler</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500">Ad Soyad:</span> {formData.first_name} {formData.last_name}</div>
                                <div><span className="text-slate-500">E-posta:</span> {formData.email}</div>
                                <div><span className="text-slate-500">Departman:</span> {getDepartmentName(parseInt(formData.department))}</div>
                                <div><span className="text-slate-500">Pozisyon:</span> {getJobPositionName(parseInt(formData.job_position))}</div>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 text-center">
                            Bilgilerin doğruluğunu kontrol ettikten sonra "Kaydı Tamamla" butonuna tıklayınız.
                        </p>
                    </div>
                );
            default:
                return null;
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
