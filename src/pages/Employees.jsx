import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, MapPin, User, Settings, Trash2, Power, ShieldAlert } from 'lucide-react';
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
    {/* Header */ }
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

    {/* Filters */ }
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

    {/* Employee Grid */ }
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

    {
        filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-slate-400">
                Kayıtlı çalışan bulunamadı.
            </div>
        )
    }

    {/* Add Employee Modal with Portal */ }
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

    {/* Global Backdrop for Dropdowns */ }
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
