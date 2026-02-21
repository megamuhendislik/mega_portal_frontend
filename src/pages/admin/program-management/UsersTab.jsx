import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Users, Check, Search } from 'lucide-react';

const UsersTab = ({ program, onUpdate, onRefresh }) => {
    const [allEmployees, setAllEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loadingEmps, setLoadingEmps] = useState(false);

    // Load employees list
    useEffect(() => {
        const loadEmployees = async () => {
            setLoadingEmps(true);
            try {
                const res = await api.get('/employees/', { params: { is_active: true, page_size: 9999 } });
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setAllEmployees(data);
            } catch (err) {
                console.error('Employee fetch error:', err);
            }
            setLoadingEmps(false);
        };
        loadEmployees();
    }, []);

    // Sync selected IDs from program data
    useEffect(() => {
        if (program?.allowed_users_detail) {
            setSelectedIds(new Set(program.allowed_users_detail.map(u => u.id)));
        }
    }, [program?.allowed_users_detail]);

    const filteredEmployees = allEmployees.filter(emp => {
        const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const dept = (emp.department_name || emp.department?.name || '').toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || dept.includes(q) || (emp.employee_code || '').includes(q);
    });

    const toggleUser = (empId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(empId)) next.delete(empId);
            else next.add(empId);
            return next;
        });
    };

    const saveUsers = async () => {
        setSaving(true);
        try {
            await api.post(`/external-programs/${program.id}/manage_users/`, {
                action: 'set',
                user_ids: Array.from(selectedIds)
            });
            onRefresh();
        } catch (err) {
            console.error('Save users error:', err);
        }
        setSaving(false);
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    return (
        <div className="space-y-4">
            {/* Restrict Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div>
                    <p className="text-sm font-semibold text-slate-700">Kullanıcı Kısıtlaması</p>
                    <p className="text-xs text-slate-500">
                        {program.restrict_to_allowed_users
                            ? 'Sadece aşağıdaki listede seçili kullanıcılar bu programı kullanabilir.'
                            : 'Herkes bu programı kullanabilir. Kısıtlamak için aktifleştirin.'}
                    </p>
                </div>
                <button
                    onClick={() => onUpdate({ restrict_to_allowed_users: !program.restrict_to_allowed_users })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${program.restrict_to_allowed_users ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${program.restrict_to_allowed_users ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Personel ara (ad, departman, sicil no)..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                </div>
                <button onClick={selectAll} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 whitespace-nowrap transition-colors">Tümünü Seç</button>
                <button onClick={deselectAll} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 whitespace-nowrap transition-colors">Temizle</button>
            </div>

            {/* Counter */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{selectedIds.size} kullanıcı seçili / {allEmployees.length} toplam personel</span>
                <button
                    onClick={saveUsers}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                    {saving ? 'Kaydediliyor...' : <><Check size={14} /> Kaydet</>}
                </button>
            </div>

            {/* Employee List */}
            <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {loadingEmps ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse">Personel listesi yükleniyor...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Users size={28} className="mx-auto mb-2 opacity-50" />
                        <p>Sonuç bulunamadı</p>
                    </div>
                ) : (
                    filteredEmployees.map(emp => {
                        const isSelected = selectedIds.has(emp.id);
                        const empName = `${emp.first_name} ${emp.last_name}`;
                        const deptName = emp.department_name || emp.department?.name || '';
                        return (
                            <div
                                key={emp.id}
                                onClick={() => toggleUser(emp.id)}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50' : ''
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}>
                                    {isSelected && <Check size={12} />}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {empName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{empName}</p>
                                    <p className="text-xs text-slate-400 truncate">{deptName}{emp.employee_code ? ` • ${emp.employee_code}` : ''}</p>
                                </div>
                                {isSelected && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Yetkili</span>}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default UsersTab;
