import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, UserPlus, Search, Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ManagerEditModal = ({ employeeId, employeeName, onClose, onSaved }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [primaryManagers, setPrimaryManagers] = useState([]);
    const [secondaryManagers, setSecondaryManagers] = useState([]);
    const [addingTo, setAddingTo] = useState(null); // 'primary' | 'secondary' | null

    // Add-form state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedPosId, setSelectedPosId] = useState('');
    const [validationError, setValidationError] = useState('');
    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empRes, deptRes, posRes] = await Promise.allSettled([
                    api.get(`/employees/${employeeId}/`),
                    api.get('/departments/'),
                    api.get('/job-positions/'),
                ]);
                if (empRes.status === 'fulfilled') {
                    const emp = empRes.value.data;
                    setPrimaryManagers((emp.primary_managers || []).map(normalizeManager));
                    setSecondaryManagers((emp.secondary_managers || []).map(normalizeManager));
                }
                if (deptRes.status === 'fulfilled') {
                    const d = deptRes.value.data;
                    setDepartments(Array.isArray(d) ? d : d.results || []);
                }
                if (posRes.status === 'fulfilled') {
                    const p = posRes.value.data;
                    setPositions(Array.isArray(p) ? p : p.results || []);
                }
            } catch {
                toast.error('Veriler yüklenirken hata oluştu.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [employeeId]);

    const normalizeManager = (m) => ({
        id: m.id,
        name: m.name,
        department_id: m.department_id || '',
        department_name: m.department_name || '',
        job_position_id: m.job_position_id || '',
        assignment_position_name: m.assignment_position_name || m.job_position || '',
    });

    // Debounced employee search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (searchQuery.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await api.get(`/employees/?search=${encodeURIComponent(searchQuery)}`);
                const data = Array.isArray(res.data) ? res.data : res.data.results || [];
                setSearchResults(data);
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const resetAddForm = () => {
        setAddingTo(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        setSelectedEmployee(null);
        setSelectedDeptId('');
        setSelectedPosId('');
        setValidationError('');
    };

    const handleSelectEmployee = (emp) => {
        setSelectedEmployee(emp);
        setSearchQuery(emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim());
        setShowDropdown(false);
        if (emp.department) setSelectedDeptId(String(emp.department));
        if (emp.job_position) setSelectedPosId(String(emp.job_position));
    };

    const handleAdd = () => {
        setValidationError('');
        if (!selectedEmployee) {
            setValidationError('Lütfen bir personel seçin.');
            return;
        }
        if (selectedEmployee.id === employeeId) {
            setValidationError('Personel kendisini yönetici olarak atayamaz.');
            return;
        }
        const targetList = addingTo === 'primary' ? primaryManagers : secondaryManagers;
        if (targetList.some((m) => m.id === selectedEmployee.id)) {
            setValidationError('Bu yönetici zaten listede.');
            return;
        }
        const newManager = {
            id: selectedEmployee.id,
            name: selectedEmployee.full_name || selectedEmployee.name || `${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim(),
            department_id: selectedDeptId || '',
            department_name: departments.find((d) => String(d.id) === String(selectedDeptId))?.name || '',
            job_position_id: selectedPosId || '',
            assignment_position_name: positions.find((p) => String(p.id) === String(selectedPosId))?.name || '',
        };
        if (addingTo === 'primary') {
            setPrimaryManagers((prev) => [...prev, newManager]);
        } else {
            setSecondaryManagers((prev) => [...prev, newManager]);
        }
        resetAddForm();
    };

    const handleRemove = (type, managerId) => {
        if (type === 'primary') {
            setPrimaryManagers((prev) => prev.filter((m) => m.id !== managerId));
        } else {
            setSecondaryManagers((prev) => prev.filter((m) => m.id !== managerId));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                primary_managers: primaryManagers.map((m) => ({
                    manager_id: m.id,
                    department_id: m.department_id || null,
                    job_position_id: m.job_position_id || null,
                })),
                secondary_managers: secondaryManagers.map((m) => ({
                    manager_id: m.id,
                    department_id: m.department_id || null,
                    job_position_id: m.job_position_id || null,
                })),
            };
            await api.patch(`/employees/${employeeId}/`, payload);
            toast.success('Yönetici atamaları başarıyla kaydedildi.');
            onSaved();
        } catch {
            toast.error('Kaydetme sırasında hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    };

    const renderManagerCard = (manager, type) => (
        <div key={manager.id} className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${type === 'primary' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                {getInitials(manager.name)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{manager.name}</p>
                <p className="text-xs text-slate-500 truncate">
                    {[manager.department_name, manager.assignment_position_name].filter(Boolean).join(' - ') || '-'}
                </p>
            </div>
            <button onClick={() => handleRemove(type, manager.id)} className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );

    const renderAddForm = () => (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
            {/* Employee search */}
            <div ref={searchRef} className="relative">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSelectedEmployee(null); }}
                        placeholder="Personel ara..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {searchLoading && <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />}
                </div>
                {showDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white shadow-lg rounded-lg z-50 border border-slate-200">
                        {searchResults.map((emp) => (
                            <button
                                key={emp.id}
                                onClick={() => handleSelectEmployee(emp)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {getInitials(emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`)}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-800 truncate">{emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</p>
                                    <p className="text-xs text-slate-500 truncate">{emp.department_name || ''}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* Department & Position selects */}
            <div className="flex gap-2">
                <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Departman</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={selectedPosId} onChange={(e) => setSelectedPosId(e.target.value)} className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Pozisyon</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            {validationError && <p className="text-xs text-red-500">{validationError}</p>}
            <div className="flex justify-end gap-2">
                <button onClick={resetAddForm} className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">Vazgeç</button>
                <button onClick={handleAdd} className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Ekle</button>
            </div>
        </div>
    );

    const renderSection = (title, type, managers, accentClass, iconColor) => (
        <div className="flex-1 min-w-0">
            <div className={`border-l-4 ${accentClass} pl-3 mb-3`}>
                <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                    <Star className={`w-3.5 h-3.5 ${iconColor}`} />
                    {title}
                </h4>
            </div>
            <div className="space-y-2">
                {managers.map((m) => renderManagerCard(m, type))}
                {addingTo === type ? renderAddForm() : (
                    <button
                        onClick={() => { resetAddForm(); setAddingTo(type); }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-300 rounded-lg transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Yönetici Ekle
                    </button>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Yönetici Atamaları</h3>
                        <p className="text-sm text-slate-500">{employeeName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="flex gap-6">
                            {renderSection('Birincil Yöneticiler', 'primary', primaryManagers, 'border-l-blue-500', 'text-blue-500')}
                            {renderSection('İkincil Yöneticiler', 'secondary', secondaryManagers, 'border-l-amber-500', 'text-amber-500')}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                    <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
                        İptal
                    </button>
                    <button onClick={handleSave} disabled={saving || loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ManagerEditModal;
