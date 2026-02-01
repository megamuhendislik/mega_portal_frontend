import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Trash2, PlusCircle, Edit, Save, X as XIcon, ChevronDown, ChevronUp, User, Building, ZoomIn, ZoomOut, Maximize, MousePointer, Star } from 'lucide-react';
import api from '../services/api';
import DebugConsole from '../components/DebugConsole';
import { useAuth } from '../context/AuthContext';

const EditDepartmentModal = ({ mode, node, onClose, onSave }) => {
    const [name, setName] = useState(mode === 'edit' ? node.name : '');
    const [code, setCode] = useState(mode === 'edit' ? node.code : '');
    const [isChartVisible, setIsChartVisible] = useState(mode === 'edit' ? (node.is_chart_visible !== false) : true);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, code, is_chart_visible: isChartVisible });
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">{mode === 'create' ? 'Yeni Departman Ekle' : 'Departman Düzenle'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Departman Adı</label>
                        <input className="w-full border rounded-lg p-2" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kısaltma / Kod</label>
                        <input className="w-full border rounded-lg p-2" value={code} onChange={e => setCode(e.target.value)} required placeholder="Örn: HR, IT" />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isChartVisible} onChange={e => setIsChartVisible(e.target.checked)} className="rounded text-blue-600" />
                            <span className="text-sm text-slate-700">Şemada Göster</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">İptal</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

// Simple Modal Component for Employee Details
// Live Employee Detail Modal
const EmployeeDetailModal = ({ employee, onClose }) => {
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!employee) return;
            try {
                // Determine endpoint based on known API structure
                // Assume registered at /api/attendance/live-status/
                const res = await api.get(`/attendance/live-status/${employee.id}/status/`);
                setLiveData(res.data);
            } catch (err) {
                console.error("Status fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, [employee]);

    if (!employee) return null;

    // Default static data if live fetch fails or loading
    const displayStatus = liveData ? liveData.label : 'Yükleniyor...';
    const statusColor = liveData ? liveData.color : 'gray'; // green, amber, gray
    const detailedUnit = liveData?.unit_detailed || employee.department_name || 'Ana Birim';
    const managerName = liveData?.manager_name || '-';
    const secondaryRoles = liveData?.secondary_roles || [];

    // Status Badge Helpers
    const getBadgeStyle = (color) => {
        switch (color) {
            case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-blue-600 p-6 text-white text-center relative shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <ChevronDown className="rotate-180" size={24} />
                    </button>

                    <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-4xl font-bold mb-4 border-4 border-white/30 shadow-xl">
                        {employee.name.charAt(0)}
                    </div>
                    <h2 className="text-2xl font-bold">{employee.name}</h2>
                    <p className="text-blue-100 font-medium text-base mt-1">
                        {(!employee.title || employee.title === 'Temp') ? 'Unvan Belirtilmemiş' : employee.title}
                    </p>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Live Status Card */}
                    <div className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center justify-between ${getBadgeStyle(statusColor).replace('bg-', 'bg-opacity-50 bg-')}`}>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide opacity-70">Canlı Durum</p>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {loading ? (
                                    <span className="animate-pulse">Yükleniyor...</span>
                                ) : (
                                    <span>{displayStatus}</span>
                                )}
                            </h3>
                        </div>
                        <div className="text-right">
                            {liveData?.check_in && (
                                <p className="text-sm font-medium">Giriş: {liveData.check_in}</p>
                            )}
                            {liveData?.duration && (
                                <p className="text-xs opacity-75">{liveData.duration}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Unit Info (Renamed to Departman) */}
                        <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Building size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Departman</p>
                                <p className="text-sm font-semibold text-slate-800 break-words leading-snug mt-1">
                                    {detailedUnit}
                                </p>
                            </div>
                        </div>

                        {/* Manager Info (Replaced Job Description) */}
                        <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <User size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Yönetici</p>
                                <p className="text-sm font-semibold text-slate-800 break-words leading-snug mt-1">
                                    {managerName}
                                </p>
                            </div>
                        </div>

                        {/* Secondary Roles (Matrix) */}
                        {secondaryRoles.length > 0 && (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <p className="text-xs text-amber-700 font-bold mb-2 uppercase tracking-wide">Diğer Görevler (Matrix)</p>
                                <ul className="space-y-2">
                                    {secondaryRoles.map((role, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-amber-900 font-medium">
                                            <Star size={14} className="fill-amber-500 text-amber-500" />
                                            {role}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {employee.functional_groups && employee.functional_groups.length > 0 && (
                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <p className="text-xs text-blue-600 font-bold mb-2 uppercase tracking-wide">Fonksiyonel Gruplar</p>
                                <div className="flex flex-wrap gap-2">
                                    {employee.functional_groups.map((group, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-white text-blue-700 text-xs font-medium rounded border border-blue-200 shadow-sm">
                                            {group}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                    <button
                        onClick={() => alert('Profil detay sayfasına yönlendirilecek...')}
                        className="text-sm text-blue-600 font-bold hover:underline"
                    >
                        Tam Profili Görüntüle
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Horizontal Employee Card
const EmployeeNode = ({ emp, onClick, showTags }) => (
    <div
        className={`
            relative z-10 p-2 rounded-lg border shadow-sm transition-all hover:scale-105 hover:shadow-md cursor-pointer
            bg-white border-blue-200 text-slate-800
            flex flex-row items-center gap-3
            min-w-[220px] max-w-[280px] group h-[60px]
        `}
        onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(emp);
        }}
    >
        {/* Avatar Left */}
        <div className={`
            w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold border shadow-sm
            ${emp.is_secondary ? 'bg-amber-100 text-amber-700' : 'bg-blue-600 text-white'}
        `}>
            {emp.name.charAt(0)}
        </div>

        {/* Info Right */}
        <div className="flex flex-col min-w-0 flex-1">
            <h4 className="font-bold text-xs leading-tight truncate text-slate-900">
                {emp.name}
            </h4>
            {(!emp.title || emp.title === 'Temp') ? null : (
                <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                    {emp.title}
                </p>
            )}
        </div>

        {emp.is_secondary && (
            <div className="absolute top-1 right-1" title="İkincil Görevlendirme">
                <Star size={12} className="text-amber-500 fill-amber-500" />
            </div>
        )}
    </div>
);

// White Department Card
const DepartmentNode = ({ node, isEditMode, onAddChild, onEdit, onDelete }) => (
    <div
        className={`
            relative z-10 p-3 rounded-xl border-l-4 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer
            bg-white border-slate-200 border-l-emerald-500 text-slate-800
            min-w-[220px] max-w-[260px] group
        `}
        onClick={(e) => {
            e.stopPropagation();
        }}
    >
        <div className="flex flex-col items-center gap-2">
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1">
                <Building size={18} />
            </div>

            <div className="text-center px-2">
                <h3 className="font-bold text-sm uppercase tracking-wide text-slate-800 leading-tight">
                    {node.name}
                </h3>
            </div>

            {/* Edit Actions */}
            {isEditMode && (
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-1.5 bg-blue-100 text-blue-600 rounded-full shadow hover:bg-blue-200" title="Düzenle"><Edit size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onAddChild(node); }} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full shadow hover:bg-emerald-200" title="Alt Birim Ekle"><PlusCircle size={14} /></button>
                    {(!node.children || node.children.length === 0) && (!node.employees || node.employees.length === 0) && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="p-1.5 bg-red-100 text-red-600 rounded-full shadow hover:bg-red-200" title="Sil"><Trash2 size={14} /></button>
                    )}
                </div>
            )}
        </div>
    </div>
);

// Stacked Group Node (New)
const GroupNode = ({ group, colorClass, onClick, showTags }) => {
    const [expanded, setExpanded] = useState(false);

    // Define Color Styles
    const colors = {
        'blue': 'bg-blue-50 border-blue-200 text-blue-900',
        'emerald': 'bg-emerald-50 border-emerald-200 text-emerald-900',
        'indigo': 'bg-indigo-50 border-indigo-200 text-indigo-900',
        'amber': 'bg-amber-50 border-amber-200 text-amber-900',
        'rose': 'bg-rose-50 border-rose-200 text-rose-900',
        'cyan': 'bg-cyan-50 border-cyan-200 text-cyan-900',
        'slate': 'bg-slate-50 border-slate-200 text-slate-900',
    };

    const theme = colors[colorClass] || colors['slate'];
    const badgeTheme = theme.replace('bg-', 'bg-opacity-100 bg-').replace('text-', 'text-white bg-').replace('border-', 'border-transparent ');
    // Simplified Badge Theme logic:
    // Actually, let's just use hardcoded matching logic for badges based on group color

    return (
        <div className="flex flex-col items-center">
            <div
                className={`
                    relative z-10 p-2 rounded-xl border-2 shadow-sm transition-all cursor-pointer
                    ${theme} hover:shadow-md hover:scale-105 active:scale-95 group
                    min-w-[200px] max-w-[240px]
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                }}
            >
                {/* Stack Effect Background */}
                <div className={`absolute -top-1.5 left-2 right-2 h-4 rounded-t-lg -z-10 border ${theme} opacity-60 scale-95 origin-bottom`}></div>
                <div className={`absolute -top-3 left-4 right-4 h-4 rounded-t-lg -z-20 border ${theme} opacity-30 scale-90 origin-bottom`}></div>

                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase opacity-70 tracking-tight">{group.title} Grubu</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/50 border border-black/5`}>
                        {group.employees.length}
                    </span>
                </div>

                {/* Example Avatars */}
                <div className="flex items-center gap-1 overflow-hidden h-8 mb-1 px-1">
                    {group.employees.slice(0, 5).map((e, idx) => (
                        <div key={e.id} className="w-6 h-6 rounded-full bg-white border border-current flex items-center justify-center text-[10px] font-bold shadow-sm -ml-1 first:ml-0 relative z-0 hover:z-10 transition-all">
                            {e.name.charAt(0)}
                        </div>
                    ))}
                    {group.employees.length > 5 && (
                        <div className="w-6 h-6 rounded-full bg-white/80 border border-current flex items-center justify-center text-[9px] font-bold -ml-1 z-0">
                            +{group.employees.length - 5}
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <ChevronDown size={14} className={`mx-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* EXPANDED CONTENT */}
            {expanded && (
                <div className="mt-4 animate-fade-in-down grid grid-cols-1 gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200 shadow-inner max-w-[400px]">
                    {group.employees.map(emp => (
                        <EmployeeNode key={emp.id} emp={emp} onClick={onClick} showTags={showTags} />
                    ))}
                </div>
            )}
        </div>
    );
};

const TreeNode = ({ node, showAllEmployees, showTags, onEmployeeClick, isEditMode, onAddChild, onEdit, onDelete }) => {
    // 1. Determine Type Dynamically
    // CRITICAL FIX: Explicitly exclude 'group' type from being considered a department
    // because groups have 'employees' property which triggers the department logic
    const isGroup = node.type === 'group';
    const isDepartment = !isGroup && (node.type === 'department' || node.code || node.employees);

    // Combine Sub-Departments AND Employees into branching children
    let branchingChildren = [];

    // Grouping Helpers - CATEGORY BASED
    const getRoleCategory = (title) => {
        if (!title) return 'Diğer';
        const t = title.toLowerCase();

        // Software / IT
        if (t.includes('yazılım') || t.includes('software') || t.includes('developer') || t.includes('temsilcisi') || t.includes('php') || t.includes('frontend') || t.includes('backend') || t.includes('full stack')) return 'Yazılım Ekibi';

        // Engineering (General)
        if (t.includes('mühendis') || t.includes('engineer') || t.includes('mim')) return 'Mühendislik Grubu';

        // Technicians
        if (t.includes('tekniker') || t.includes('teknisyen')) return 'Teknik Ekip';

        // Design
        if (t.includes('tasarım') || t.includes('design') || t.includes('grafik') || t.includes('art')) return 'Tasarım Ekibi';

        // Sales/Marketing
        if (t.includes('satış') || t.includes('pazarlama') || t.includes('sales') || t.includes('marketing')) return 'Satış & Pazarlama';

        // Finance/Accounting
        if (t.includes('muhasebe') || t.includes('finans') || t.includes('account') || t.includes('mali')) return 'Finans & Muhasebe';

        return title; // Fallback to exact title if no category matches
    };

    const getColorForCategory = (category) => {
        if (category === 'Yazılım Ekibi') return 'blue';
        if (category === 'Mühendislik Grubu') return 'indigo';
        if (category === 'Teknik Ekip') return 'cyan';
        if (category === 'Tasarım Ekibi') return 'rose';
        if (category === 'Satış & Pazarlama') return 'emerald';
        if (category === 'Finans & Muhasebe') return 'amber';
        return 'slate';
    };

    // 4. Reusable Grouping Function
    const processChildrenWithGrouping = (nodes, childType = 'employee') => {
        if (!nodes || nodes.length === 0) return [];

        const groups = {};
        const resultList = [];
        const processedIds = new Set();

        // 1. Map Employees to Categories
        // Check if node is employee-like (has title). If it's a sub-department, category is 'Diğer' or irrelevant.
        const nodesWithCat = nodes.map(n => ({
            ...n,
            type: n.type || childType,
            _category: (n.employees || n.code) ? 'SUB_DEPT' : getRoleCategory(n.title) // Don't group sub-departments by title
        }));

        // 2. Count Categories
        const counts = {};
        nodesWithCat.forEach(n => {
            const c = n._category;
            if (c !== 'SUB_DEPT') {
                counts[c] = (counts[c] || 0) + 1;
            }
        });

        // 3. Create Groups
        const sortedNodes = [...nodesWithCat].sort((a, b) => {
            if (a._category === 'SUB_DEPT' && b._category !== 'SUB_DEPT') return 1; // Put depts at end? or keep original order? 
            if (b._category === 'SUB_DEPT' && a._category !== 'SUB_DEPT') return -1;
            if (a._category === 'SUB_DEPT' && b._category === 'SUB_DEPT') return 0; // Maintain relative order for sub-depts
            return a._category.localeCompare(b._category);
        });

        sortedNodes.forEach(nodeItem => {
            if (processedIds.has(nodeItem.id)) return;

            const category = nodeItem._category;

            // Only group employees, never departments
            if (category !== 'SUB_DEPT' && counts[category] >= 2) {
                const groupMembers = sortedNodes.filter(n => n._category === category);
                groupMembers.forEach(m => processedIds.add(m.id));

                resultList.push({
                    type: 'group',
                    title: category,
                    employees: groupMembers,
                    id: `group-${category}-${nodeItem.id}`, // Unique ID base
                    color: getColorForCategory(category)
                });
            } else {
                processedIds.add(nodeItem.id);
                resultList.push({ ...nodeItem });
            }
        });

        return resultList;
    };

    if (isDepartment) {
        // 1. Employees (Managers -> Subordinates Tree)
        if (showAllEmployees && node.employees && node.employees.length > 0) {
            // Apply grouping to Department's direct employees
            const groupedEmployees = processChildrenWithGrouping(node.employees, 'employee');
            branchingChildren.push(...groupedEmployees);
        }

        // 2. Sub-Departments (No grouping needed usually, just render)
        if (node.children && node.children.length > 0) {
            const deptNodes = node.children.map(d => ({ ...d, type: 'department' }));
            branchingChildren.push(...deptNodes);
        }
    } else {
        // Employee Node (Manager -> Subordinates)
        if (node.children && node.children.length > 0) {
            // Check if children are employees or mixed
            // If they are employees (subordinates), we SHOULD group them.
            // But we need to distinguish if they are departments (rare in employee-children but possible in mixed trees)

            // Heuristic: Filter children that are employees
            const childEmployees = node.children.filter(c => !c.code && !c.employees); // Simple heuristic for employee
            const childDepts = node.children.filter(c => c.code || c.employees);

            // Group the employees
            const groupedSubordinates = processChildrenWithGrouping(childEmployees, 'employee');

            // Map depts as is
            const mappedDepts = childDepts.map(d => ({ ...d, type: 'department' }));

            branchingChildren.push(...groupedSubordinates);
            branchingChildren.push(...mappedDepts);
        }
    }

    const hasChildren = branchingChildren.length > 0;

    return (
        <li>
            <div className="flex flex-col items-center relative gap-6">
                {/* Main Node Card */}
                {isDepartment ? (
                    <DepartmentNode
                        node={node}
                        isEditMode={isEditMode}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ) : node.type === 'group' ? (
                    <GroupNode
                        group={node}
                        colorClass={node.color}
                        onClick={onEmployeeClick}
                        showTags={showTags}
                    />
                ) : (
                    <EmployeeNode emp={node} onClick={onEmployeeClick} showTags={showTags} />
                )}
            </div>

            {/* Recursive Branching Children */}
            {hasChildren && (
                <ul>
                    {branchingChildren.map(child => (
                        <TreeNode
                            key={`${child.type}-${child.id}`}
                            node={child}
                            showAllEmployees={showAllEmployees}
                            showTags={showTags}
                            onEmployeeClick={onEmployeeClick}
                            isEditMode={isEditMode}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

const OrganizationChart = () => {
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEmployees, setShowEmployees] = useState(true); // Default ON to show hierarchy heads
    const [showTags, setShowTags] = useState(false); // Default OFF
    const [showDebug, setShowDebug] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [modalConfig, setModalConfig] = useState(null); // { mode: 'create'|'edit', node: ... }
    const { hasPermission } = useAuth();

    // Zoom & Pan State
    const [scale, setScale] = useState(1); // Default 100% zoom as requested
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const fetchHierarchy = async () => {
        setLoading(true);
        try {
            const response = await api.get('/departments/hierarchy/');
            let data = response.data;
            // Filter Functional Groups
            if (Array.isArray(data)) {
                data = data.filter(node =>
                    node.is_chart_visible !== false &&
                    !node.code.includes('ROOT_FUNC') &&
                    !node.name.includes('Fonksiyonel')
                );
            }

            if (Array.isArray(data) && data.length > 1) {
                data = [{ id: 'root-company', name: 'Mega Portal', code: 'COMPANY', employees: [], children: data }];
            }
            setTreeData(data);
        } catch (err) {
            console.error('Error fetching hierarchy:', err);
            setError('Organizasyon şemasını görüntüleme yetkiniz yok.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHierarchy();
    }, []);

    const handleSaveDepartment = async (data) => {
        try {
            if (modalConfig.mode === 'create') {
                await api.post('/departments/', { ...data, parent: modalConfig.node.id });
            } else {
                await api.patch(`/departments/${modalConfig.node.id}/`, data);
            }
            setModalConfig(null);
            fetchHierarchy();
        } catch (err) {
            console.error(err);
            alert("İşlem başarısız.");
        }
    };

    const handleDeleteDepartment = async (node) => {
        if (!window.confirm(`${node.name} departmanını silmek istediğinize emin misiniz?`)) return;
        try {
            await api.delete(`/departments/${node.id}/`);
            fetchHierarchy();
        } catch (err) {
            console.error(err);
            alert("Silinemedi (Personel atanmış olabilir).");
        }
    };

    // Zoom Handlers
    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));
    const handleResetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    // Pan Handlers (Mouse & Touch)
    const handleStart = (clientX, clientY) => {
        setIsDragging(true);
        setStartPos({ x: clientX - position.x, y: clientY - position.y });
    };

    const handleMove = (clientX, clientY) => {
        if (!isDragging) return;
        setPosition({
            x: clientX - startPos.x,
            y: clientY - startPos.y
        });
    };

    // Mouse Events
    const handleMouseDown = (e) => handleStart(e.clientX, e.clientY);
    const handleMouseMove = (e) => {
        if (isDragging) {
            e.preventDefault();
            handleMove(e.clientX, e.clientY);
        }
    };
    const handleMouseUp = () => setIsDragging(false);

    // Touch Events
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }
    };
    const handleTouchMove = (e) => {
        if (isDragging && e.touches.length === 1) {
            e.preventDefault(); // Prevent scrolling while panning
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    };
    const handleTouchEnd = () => setIsDragging(false);


    // Wheel Zoom
    const handleWheel = (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(prev => Math.min(Math.max(prev + delta, 0.3), 2));
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    if (error) return (
        <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                <User size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Erişim Engellendi</h3>
            <p className="text-slate-500 max-w-md">{error}</p>
        </div>
    );

    if (!treeData || treeData.length === 0) return (
        <div className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Building size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Veri Bulunamadı</h3>
            <p className="text-slate-500 mt-2">Organizasyon şeması boş.</p>
        </div>
    );

    return (
        <div className="space-y-2 h-full flex flex-col overflow-hidden relative">
            {selectedEmployee && (
                <EmployeeDetailModal
                    employee={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}

            {modalConfig && (
                <EditDepartmentModal
                    mode={modalConfig.mode}
                    node={modalConfig.node}
                    onClose={() => setModalConfig(null)}
                    onSave={handleSaveDepartment}
                />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 px-1 gap-2">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">Organizasyon Şeması</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={`
                            flex items - center gap - 2 px - 3 py - 1.5 rounded - lg text - xs md: text - sm font - medium transition - colors border shadow - sm whitespace - nowrap
                            ${showDebug
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }
`}
                    >
                        <MousePointer size={16} />
                        {showDebug ? 'Debug Kapat' : 'Debug Aç'}
                    </button>

                    <button
                        onClick={() => setShowTags(!showTags)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors border shadow-sm whitespace-nowrap
                            ${showTags
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }
                        `}
                    >
                        <Building size={16} />
                        {showTags ? 'Etiketleri Gizle' : 'Etiketleri Göster'}
                    </button>

                    {hasPermission('HR_ORG_MANAGE') && (
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors border shadow-sm whitespace-nowrap ${isEditMode ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Edit size={16} />
                            {isEditMode ? 'Düzenlemeyi Bitir' : 'Düzenle'}
                        </button>
                    )}

                    <div className="flex items-center gap-1 md:gap-2 bg-white p-1 rounded-lg border shadow-sm z-50">
                        <button onClick={handleZoomOut} className="p-1.5 md:p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={18} /></button>
                        <span className="text-xs font-mono w-10 md:w-12 text-center">{(scale * 100).toFixed(0)}%</span>
                        <button onClick={handleZoomIn} className="p-1.5 md:p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={18} /></button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button onClick={handleResetZoom} className="p-1.5 md:p-2 hover:bg-slate-100 rounded text-slate-600" title="Sıfırla"><Maximize size={18} /></button>
                    </div>
                </div>
            </div>

            {showDebug && (
                <DebugConsole treeData={treeData} />
            )}

            <div
                className="card bg-slate-50/50 flex-1 h-[calc(100vh-140px)] min-h-[600px] relative overflow-hidden cursor-grab active:cursor-grabbing border border-slate-200 rounded-xl touch-none shadow-inner"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
            >
                <div
                    className="origin-top-left transition-transform duration-75 ease-out absolute"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        top: 0,
                        left: 0,
                        minWidth: '100%',
                        minHeight: '100%',
                        padding: '100px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start'
                    }}
                >
                    <div className="tree select-none">
                        <ul>
                            {treeData.map(node => (
                                <TreeNode
                                    key={node.id}
                                    node={{ ...node, type: node.type || 'department' }}
                                    showAllEmployees={true} // ALWAYS FORCE SHOW
                                    showTags={showTags}
                                    onEmployeeClick={setSelectedEmployee}
                                    isEditMode={isEditMode}
                                    onAddChild={(node) => setModalConfig({ mode: 'create', node })}
                                    onEdit={(node) => setModalConfig({ mode: 'edit', node })}
                                    onDelete={handleDeleteDepartment}
                                />
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
    /* Tree CSS - Robust Flexbox Implementation */
    .tree ul {
        padding-top: 20px;
        position: relative;
        transition: all 0.5s;
        display: flex;
        justify-content: center;
    }

    .tree li {
        text-align: center;
        list-style-type: none;
        position: relative;
        padding: 20px 5px 0 5px;
        transition: all 0.5s;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    /* Connectors */
    .tree li::before, .tree li::after {
        content: '';
        position: absolute;
        top: 0;
        right: 50%;
        border-top: 2px solid #cbd5e1; /* Thicker, lighter line */
        width: 50%;
        height: 20px;
        z-index: -1;
    }

    .tree li::after {
        right: auto;
        left: 50%;
        border-left: 2px solid #cbd5e1;
    }

    /* Only Child: No horizontal connectors needed at top */
    .tree li:only-child::after, .tree li:only-child::before {
        display: none;
    }

    /* Only Child: Remove top padding */
    .tree li:only-child {
        padding-top: 0;
    }

    /* First Child: Remove left connector */
    .tree li:first-child::before {
        border: 0 none;
    }

    /* First Child: Add curve to right connector */
    .tree li:first-child::after {
        border-radius: 5px 0 0 0;
    }

    /* Last Child: Remove right connector */
    .tree li:last-child::after {
        border: 0 none;
    }

    /* Last Child: Add curve to left connector */
    .tree li:last-child::before {
        border-right: 2px solid #cbd5e1;
        border-radius: 0 5px 0 0;
    }

    /* Vertical connector from Parent down to Children */
    .tree ul ul::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        border-left: 2px solid #cbd5e1;
        width: 0;
        height: 20px;
        transform: translateX(-50%); /* Perfectly center vertical line */
        z-index: -1;
    }
`}</style>
        </div>
    );
};

export default OrganizationChart;
