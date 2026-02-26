import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { Trash2, PlusCircle, Edit, Save, X as XIcon, ChevronDown, ChevronUp, User, Building, ZoomIn, ZoomOut, Maximize, MousePointer, Star, Clock } from 'lucide-react';
import api from '../services/api';
import DebugConsole from '../components/DebugConsole';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { useOrgChartDnD } from './useOrgChartDnD';
import ReassignConfirmModal from './ReassignConfirmModal';
import OrgChartContextMenu from './OrgChartContextMenu';
import ManagerEditModal from './ManagerEditModal';

// --- Helper Functions (Module Scope) ---

const getRoleCategory = (title) => {
    if (!title) return 'Diğer';
    const t = title.toLowerCase();

    // System / Admin
    if (t.includes('sistem') || t.includes('admin') || t.toLowerCase() === 'yönetici') return 'Sistem Yönetimi';

    // Software / IT
    if (t.includes('yazılım') || t.includes('software') || t.includes('developer') || t.includes('temsilcisi') || t.includes('php') || t.includes('frontend') || t.includes('backend') || t.includes('full stack')) return 'Yazılım Ekibi';

    // Engineering (General)
    if (t.includes('mühendis') || t.includes('engineer') || t.includes('mim')) return 'Mühendislik Grubu';

    // Technicians
    if (t.includes('tekniker') || t.includes('teknisyen') || t.includes('ressam')) return 'Teknik Ekip';

    // Design
    if (t.includes('tasarım') || t.includes('design') || t.includes('grafik') || t.includes('art')) return 'Tasarım Ekibi';

    // Sales/Marketing
    if (t.includes('satış') || t.includes('pazarlama') || t.includes('sales') || t.includes('marketing')) return 'Satış & Pazarlama';

    // Finance/Accounting
    if (t.includes('muhasebe') || t.includes('finans') || t.includes('account') || t.includes('mali')) return 'Finans & Muhasebe';

    return title; // Fallback to exact title if no category matches
};

const getColorForCategory = (category) => {
    if (category === 'Sistem Yönetimi') return 'violet';
    if (category === 'Yazılım Ekibi') return 'blue';
    if (category === 'Mühendislik Grubu') return 'indigo';
    if (category === 'Teknik Ekip') return 'cyan';
    if (category === 'Tasarım Ekibi') return 'rose';
    if (category === 'Satış & Pazarlama') return 'emerald';
    if (category === 'Finans & Muhasebe') return 'amber';
    return 'slate';
};

const getThemeClasses = (colorName) => {
    const themes = {
        'blue': { border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-600' },
        'emerald': { border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-600' },
        'indigo': { border: 'border-indigo-200', text: 'text-indigo-800', badge: 'bg-indigo-600' },
        'amber': { border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-600' },
        'rose': { border: 'border-rose-200', text: 'text-rose-800', badge: 'bg-rose-600' },
        'cyan': { border: 'border-cyan-200', text: 'text-cyan-800', badge: 'bg-cyan-600' },
        'violet': { border: 'border-violet-200', text: 'text-violet-800', badge: 'bg-violet-600' },
        'slate': { border: 'border-slate-200', text: 'text-slate-800', badge: 'bg-slate-600' },
    };
    return themes[colorName] || themes['slate'];
};

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
    const navigate = useNavigate();
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!employee) return;
            try {
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

    const category = getRoleCategory(employee.title);
    const colorKey = getColorForCategory(category);
    const displayStatus = liveData ? liveData.label : null;
    const statusColor = liveData ? liveData.color : 'gray';
    const detailedUnit = liveData?.unit_detailed || employee.department_name || 'Ana Birim';
    const managerName = liveData?.manager_name || '-';
    const secondaryRoles = liveData?.secondary_roles || [];

    const statusDotColor = statusColor === 'green' ? 'bg-emerald-400' : statusColor === 'amber' ? 'bg-amber-400' : 'bg-slate-300';
    const statusBgColor = statusColor === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : statusColor === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200';

    const headerGradients = {
        'blue': 'from-blue-600 to-blue-700',
        'emerald': 'from-emerald-600 to-emerald-700',
        'indigo': 'from-indigo-600 to-indigo-700',
        'amber': 'from-amber-600 to-amber-700',
        'rose': 'from-rose-600 to-rose-700',
        'cyan': 'from-cyan-600 to-cyan-700',
        'violet': 'from-violet-600 to-violet-700',
        'slate': 'from-slate-600 to-slate-700',
    };
    const gradient = headerGradients[colorKey] || headerGradients['slate'];

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`bg-gradient-to-br ${gradient} p-5 text-white relative shrink-0`}>
                    <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                        <XIcon size={18} />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                                {employee.name.charAt(0)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${employee.is_online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold truncate">{employee.name}</h2>
                            <p className="text-white/80 text-sm mt-0.5 truncate">
                                {(!employee.title || employee.title === 'Temp') ? 'Unvan Belirtilmemiş' : employee.title}
                            </p>
                            {/* Inline live status */}
                            {loading ? (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
                                    <span className="text-xs text-white/60">Durum yükleniyor...</span>
                                </div>
                            ) : displayStatus && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium">
                                    <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                                    {displayStatus}
                                    {liveData?.check_in && <span className="text-white/60 ml-1">({liveData.check_in})</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 overflow-y-auto">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <InfoCell icon={<Building size={16} />} label="Departman" value={detailedUnit} color="blue" />
                        <InfoCell icon={<User size={16} />} label="Yönetici" value={managerName} color="indigo" />
                        {liveData?.duration && (
                            <InfoCell icon={<Clock size={16} />} label="Süre" value={liveData.duration} color="emerald" />
                        )}
                        {employee.is_secondary && (
                            <InfoCell icon={<Star size={16} />} label="Atama" value="İkincil Görevlendirme" color="amber" />
                        )}
                    </div>

                    {/* Secondary Roles */}
                    {secondaryRoles.length > 0 && (
                        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-100">
                            <p className="text-[10px] text-amber-600 font-bold mb-1.5 uppercase tracking-wider">Diğer Görevler</p>
                            <div className="space-y-1">
                                {secondaryRoles.map((role, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                                        <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                                        <span className="truncate">{role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Functional Groups */}
                    {employee.functional_groups?.length > 0 && (
                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                            <p className="text-[10px] text-blue-600 font-bold mb-1.5 uppercase tracking-wider">Fonksiyonel Gruplar</p>
                            <div className="flex flex-wrap gap-1.5">
                                {employee.functional_groups.map((group, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-white text-blue-700 text-[11px] font-medium rounded-md border border-blue-200">
                                        {group}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 pt-1 shrink-0">
                    <button
                        onClick={() => { onClose(); navigate(`/employees/${employee.id}`); }}
                        className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-sm hover:shadow-md transition-all"
                    >
                        Tam Profili Görüntüle
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const InfoCell = ({ icon, label, value, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        slate: 'bg-slate-50 text-slate-600',
    };
    const iconColor = colors[color] || colors.slate;
    return (
        <div className="flex items-start gap-2.5 p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconColor}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">{value}</p>
            </div>
        </div>
    );
};

// Employee Card
const EmployeeNode = ({ emp, onClick, showTags, dnd, isEditMode, onContextMenu }) => {
    const category = getRoleCategory(emp.title);
    const colorKey = getColorForCategory(category);
    const theme = getThemeClasses(colorKey);

    const isDragSource = dnd?.draggedEmployee?.id === emp.id;
    const isDragTarget = dnd?.dropTargetId === emp.id;
    const canDrag = isEditMode && !emp.is_secondary;

    const empData = {
        id: emp.id, name: emp.name, title: emp.title,
        department_id: emp.department_id, job_position_id: emp.job_position_id,
    };

    return (
        <div
            draggable={canDrag}
            onDragStart={canDrag ? (e) => dnd.handleDragStart(e, empData) : undefined}
            onDragEnd={canDrag ? () => dnd.handleDragEnd() : undefined}
            onDragOver={dnd ? (e) => dnd.handleDragOver(e, { ...empData, type: 'employee' }) : undefined}
            onDragLeave={dnd ? () => dnd.handleDragLeave() : undefined}
            onDrop={dnd ? (e) => dnd.handleDrop(e, { ...empData, type: 'employee' }) : undefined}
            className={`
                relative z-10 p-2 rounded-lg border shadow-sm transition-all hover:scale-105 hover:shadow-md cursor-pointer
                bg-white ${theme.border}
                flex flex-row items-center gap-2.5
                w-[190px] group
                ${isDragSource ? 'opacity-40 scale-95' : ''}
                ${isDragTarget ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : ''}
                ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
            `}
            onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(emp);
            }}
            onMouseDown={isEditMode ? (e) => e.stopPropagation() : undefined}
            onContextMenu={isEditMode && onContextMenu ? (e) => onContextMenu(e, empData) : undefined}
        >
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className={`
                    w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold
                    ${emp.is_secondary ? 'bg-amber-100 text-amber-700' : `${theme.badge} text-white`}
                `}>
                    {emp.name.charAt(0)}
                </div>
                <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white ${emp.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    title={emp.is_online ? 'Şirkette' : 'Dışarıda'}
                />
            </div>

            {/* Info */}
            <div className="flex flex-col min-w-0 flex-1">
                <h4 className="font-bold text-[11px] leading-tight truncate text-slate-800">
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
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                </div>
            )}
        </div>
    );
};

// Department Card
const DepartmentNode = ({ node, isEditMode, onAddChild, onEdit, onDelete, dnd }) => {
    const isDragTarget = dnd?.dropTargetId === node.id;

    return (
    <div
        onDragOver={dnd ? (e) => dnd.handleDragOver(e, { id: node.id, name: node.name, type: 'department' }) : undefined}
        onDragLeave={dnd ? () => dnd.handleDragLeave() : undefined}
        onDrop={dnd ? (e) => dnd.handleDrop(e, { id: node.id, name: node.name, type: 'department' }) : undefined}
        onMouseDown={isEditMode ? (e) => e.stopPropagation() : undefined}
        className={`
            relative z-10 px-4 py-3 rounded-xl border shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg
            bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-800
            min-w-[180px] max-w-[240px] group
            ${isDragTarget ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
        `}
        onClick={(e) => { e.stopPropagation(); }}
    >
        <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Building size={16} />
            </div>
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700 leading-tight">
                {node.name}
            </h3>
        </div>

        {/* Edit Actions */}
        {isEditMode && (
            <div className="absolute -top-2.5 -right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-1.5 bg-blue-100 text-blue-600 rounded-full shadow hover:bg-blue-200" title="Düzenle"><Edit size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); onAddChild(node); }} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full shadow hover:bg-emerald-200" title="Alt Birim Ekle"><PlusCircle size={12} /></button>
                {(!node.children || node.children.length === 0) && (!node.employees || node.employees.length === 0) && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="p-1.5 bg-red-100 text-red-600 rounded-full shadow hover:bg-red-200" title="Sil"><Trash2 size={12} /></button>
                )}
            </div>
        )}
    </div>
    );
};

// Stacked Group Node (New)
// Grid Group Node (Modified)
const GroupNode = ({ group, colorClass, onClick, showTags, dnd, isEditMode, onContextMenu }) => {
    // Define Color Styles
    const colors = {
        'blue': 'bg-blue-50/50 border-blue-200 text-blue-900',
        'emerald': 'bg-emerald-50/50 border-emerald-200 text-emerald-900',
        'indigo': 'bg-indigo-50/50 border-indigo-200 text-indigo-900',
        'amber': 'bg-amber-50/50 border-amber-200 text-amber-900',
        'rose': 'bg-rose-50/50 border-rose-200 text-rose-900',
        'cyan': 'bg-cyan-50/50 border-cyan-200 text-cyan-900',

        'violet': 'bg-violet-50/50 border-violet-200 text-violet-900',
        'slate': 'bg-slate-50/50 border-slate-200 text-slate-900',
    };

    // Header colors (slightly darker/stronger)
    const headerColors = {
        'blue': 'bg-blue-100 text-blue-800',
        'emerald': 'bg-emerald-100 text-emerald-800',
        'indigo': 'bg-indigo-100 text-indigo-800',
        'amber': 'bg-amber-100 text-amber-800',
        'rose': 'bg-rose-100 text-rose-800',
        'cyan': 'bg-cyan-100 text-cyan-800',
        'violet': 'bg-violet-100 text-violet-800',
        'slate': 'bg-slate-100 text-slate-800',
    };

    const theme = colors[colorClass] || colors['slate'];
    const headerTheme = headerColors[colorClass] || headerColors['slate'];

    return (
        <div className={`p-2.5 rounded-xl border-2 border-dashed ${theme} flex flex-col items-center gap-2 relative animate-fade-in group-node-container`}>
            {/* Group Header */}
            <div className={`
                absolute -top-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white/50
                ${headerTheme}
            `}>
                {group.title} ({group.employees.length})
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
                {group.employees.map(emp => (
                    <div key={emp.id} className="transform transition-transform hover:scale-105 active:scale-95">
                        <EmployeeNode
                            emp={{ ...emp, is_secondary: false }} // Ensure clean props
                            onClick={onClick}
                            showTags={showTags}
                            dnd={dnd}
                            isEditMode={isEditMode}
                            onContextMenu={onContextMenu}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const TreeNode = ({ node, showAllEmployees, showTags, onEmployeeClick, isEditMode, onAddChild, onEdit, onDelete, dnd, onContextMenu }) => {
    // 1. Determine Type Dynamically
    // CRITICAL FIX: Explicitly exclude 'group' type from being considered a department
    // because groups have 'employees' property which triggers the department logic
    const isGroup = node.type === 'group';
    const isDepartment = !isGroup && (node.type === 'department' || node.code || node.employees);

    // Combine Sub-Departments AND Employees into branching children
    let branchingChildren = [];



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
                        dnd={dnd}
                    />
                ) : node.type === 'group' ? (
                    <GroupNode
                        group={node}
                        colorClass={node.color}
                        onClick={onEmployeeClick}
                        showTags={showTags}
                        dnd={dnd}
                        isEditMode={isEditMode}
                        onContextMenu={onContextMenu}
                    />
                ) : (
                    <EmployeeNode emp={node} onClick={onEmployeeClick} showTags={showTags} dnd={dnd} isEditMode={isEditMode} onContextMenu={onContextMenu} />
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
                            dnd={dnd}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onContextMenu={onContextMenu}
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
    const [managerEditTarget, setManagerEditTarget] = useState(null); // { id, name } for ManagerEditModal
    const { hasPermission } = useAuth();
    const canReassign = hasPermission('ACTION_ORG_CHART_MANAGER_ASSIGN');

    // Zoom & Pan State
    const [scale, setScale] = useState(0.5);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const hasFittedRef = useRef(false);

    // 5. Hierarchy Flattening for System Admins
    // This function merges a Manager and their Subordinate Managers into a single "Group" node
    const flattenSystemAdmins = (nodes) => {
        if (!nodes) return [];

        return nodes.map(node => {
            // Check if this node is System Admin
            const nodeCategory = getRoleCategory(node.title);

            // Should we flatten? Only for 'Sistem Yönetimi' and if it has children of same category
            if (nodeCategory === 'Sistem Yönetimi' && node.children && node.children.length > 0) {
                // Find children that are ALSO System Admins
                const adminChildren = node.children.filter(c => getRoleCategory(c.title) === 'Sistem Yönetimi' && !c.code && !c.employees); // Ensure checks for 'employee' type nodes
                const otherChildren = node.children.filter(c => getRoleCategory(c.title) !== 'Sistem Yönetimi' || c.code || c.employees);

                if (adminChildren.length > 0) {
                    // Collect all Flattened Admins
                    // Parent + Children
                    const groupedEmployees = [
                        { ...node, children: [] }, // Scalped Parent
                        ...adminChildren.map(c => ({ ...c, children: [] })) // Scalped Children
                    ];

                    // Collect all 'Grandchildren' and 'Other Children' to be the new children of this group
                    // 1. Children of the Parent (that weren't admins) -> 'otherChildren'
                    // 2. Children of the Admin-Children (orphaned by grouping) -> we need to rescue them
                    let adoptedChildren = [...otherChildren];
                    adminChildren.forEach(adminChild => {
                        if (adminChild.children) {
                            adoptedChildren.push(...adminChild.children);
                        }
                    });

                    // Recursive call for adopted children (in case they need flattening too)
                    adoptedChildren = flattenSystemAdmins(adoptedChildren);

                    // Create the Synthetic Group Node
                    return {
                        id: `merged-admins-${node.id}`,
                        type: 'group',
                        title: 'Sistem Yönetimi',
                        color: 'violet',
                        employees: groupedEmployees,
                        children: adoptedChildren, // All branches now hang off this group
                        // Mark as 'merged' to distinguishing specific behavior if needed
                        _isMerged: true
                    };
                }
            }

            // Standard recursion if no merging happened
            if (node.children) {
                return { ...node, children: flattenSystemAdmins(node.children) };
            }
            return node;
        });
    };

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

            // APPLY FLATTENING
            // We need to apply it to the `employees` of the root department essentially, or traverse the whole tree.
            // Since data is usually [RootDept], we traverse it.

            // Helper to traverse Departments and apply flattening to their 'employees' lists
            // Because our logic above works on 'nodes' (employees), but the tree structure is Dept -> Employees
            const applyFlatteningToTree = (deptNodes) => {
                return deptNodes.map(d => {
                    let newApp = { ...d };

                    // 1. Flatten direct employees hierarchy
                    if (newApp.employees) {
                        newApp.employees = flattenSystemAdmins(newApp.employees);
                    }

                    // 2. Recurse for sub-departments
                    if (newApp.children) {
                        newApp.children = applyFlatteningToTree(newApp.children);
                    }

                    return newApp;
                });
            };

            const processedData = applyFlatteningToTree(data);
            setTreeData(processedData);

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

    // Fit-to-screen: measure content via scrollWidth/scrollHeight (unaffected by CSS transforms)
    const fitToScreen = useCallback(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const tree = content.querySelector('.tree');
        if (!tree || tree.scrollWidth === 0 || tree.scrollHeight === 0) return;

        // scrollWidth/scrollHeight give natural (unscaled) layout dimensions
        const treeW = tree.scrollWidth;
        const treeH = tree.scrollHeight;

        const containerW = container.clientWidth;
        const containerH = container.clientHeight;

        const padding = 16;
        const availableW = containerW - padding * 2;
        const availableH = containerH - padding * 2;

        const newScale = Math.min(availableW / treeW, availableH / treeH, 1);
        const clampedScale = Math.max(newScale, 0.15);

        // Center the content within the container
        const offsetX = (containerW - treeW * clampedScale) / 2;
        const offsetY = Math.max((containerH - treeH * clampedScale) / 2, 20);

        setScale(clampedScale);
        setPosition({ x: offsetX, y: offsetY });
    }, []);

    // Auto fit-to-screen after tree data loads
    useEffect(() => {
        if (treeData.length > 0 && !hasFittedRef.current) {
            hasFittedRef.current = true;
            const timer = setTimeout(() => fitToScreen(), 150);
            return () => clearTimeout(timer);
        }
    }, [treeData, fitToScreen]);

    // Drag & Drop for employee reassignment (must be after fetchHierarchy definition)
    const dnd = useOrgChartDnD({ isEditMode: isEditMode && canReassign, onReassignComplete: fetchHierarchy });

    const handleSaveDepartment = async (data) => {
        try {
            if (modalConfig.mode === 'create') {
                await api.post('/departments/', { ...data, parent: modalConfig.node.id });
            } else {
                await api.patch(`/departments/${modalConfig.node.id}/`, data);
            }
            const msg = modalConfig.mode === 'create' ? 'Departman oluşturuldu.' : 'Departman güncellendi.';
            setModalConfig(null);
            fetchHierarchy();
            toast.success(msg);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "İşlem başarısız.");
        }
    };

    const handleDeleteDepartment = async (node) => {
        if (!window.confirm(`${node.name} departmanını silmek istediğinize emin misiniz?`)) return;
        try {
            await api.delete(`/departments/${node.id}/`);
            fetchHierarchy();
            toast.success('Departman silindi.');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Silinemedi (Personel atanmış olabilir).");
        }
    };

    // Zoom Handlers
    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.15));
    const handleResetZoom = () => fitToScreen();

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
            setScale(prev => Math.min(Math.max(prev + delta, 0.15), 2));
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
            <Toaster position="top-right" />
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

            <ReassignConfirmModal
                reassignment={dnd.pendingReassignment}
                onConfirm={dnd.confirmReassignment}
                onCancel={dnd.cancelReassignment}
                isSaving={dnd.isSaving}
            />

            <OrgChartContextMenu
                visible={!!dnd.contextMenuTarget}
                position={dnd.contextMenuTarget?.position || { x: 0, y: 0 }}
                employee={dnd.contextMenuTarget?.employee}
                onClose={dnd.closeContextMenu}
                onEditManagers={(emp) => setManagerEditTarget(emp)}
            />

            {managerEditTarget && (
                <ManagerEditModal
                    employeeId={managerEditTarget.id}
                    employeeName={managerEditTarget.name}
                    onClose={() => setManagerEditTarget(null)}
                    onSaved={() => { setManagerEditTarget(null); fetchHierarchy(); }}
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
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors border shadow-sm whitespace-nowrap
                            ${showDebug
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }
`}
                    >
                        <MousePointer size={16} />
                        <span className="hidden sm:inline">{showDebug ? 'Debug Kapat' : 'Debug Aç'}</span>
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
                        <span className="hidden sm:inline">{showTags ? 'Etiketleri Gizle' : 'Etiketleri Göster'}</span>
                    </button>

                    {hasPermission('ACTION_ORG_CHART_MANAGER_ASSIGN') && (
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors border shadow-sm whitespace-nowrap ${isEditMode ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Edit size={16} />
                            <span className="hidden sm:inline">{isEditMode ? 'Düzenlemeyi Bitir' : 'Düzenle'}</span>
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

            {isEditMode && canReassign && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs sm:text-sm text-blue-700 flex items-center gap-2">
                    <span className="font-bold">Sürükle & Bırak:</span>
                    Personel kartlarını sürükleyerek yönetici veya departman ataması yapabilirsiniz.
                </div>
            )}

            <div
                ref={containerRef}
                className="card flex-1 h-[calc(100vh-90px)] min-h-[400px] sm:min-h-[600px] relative overflow-hidden cursor-grab active:cursor-grabbing border border-slate-200 rounded-xl touch-none shadow-inner"
                style={{
                    backgroundColor: '#f8fafc',
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 0.5px, transparent 0.5px)',
                    backgroundSize: '24px 24px',
                }}
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
                    ref={contentRef}
                    className="origin-top-left transition-transform duration-75 ease-out absolute"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        top: 0,
                        left: 0,
                        minWidth: '100%',
                        minHeight: '100%',
                        padding: '16px',
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
                                    dnd={isEditMode && canReassign ? dnd : undefined}
                                    onContextMenu={isEditMode && canReassign ? dnd.handleContextMenu : undefined}
                                />
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
    .tree ul {
        padding-top: 32px;
        position: relative;
        transition: all 0.3s;
        display: flex;
        justify-content: center;
        gap: 24px;
        width: max-content;
        min-width: 100%;
    }

    .tree li {
        text-align: center;
        list-style-type: none;
        position: relative;
        padding: 32px 6px 0 6px;
        transition: all 0.3s;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
    }

    .tree li::before, .tree li::after {
        content: '';
        position: absolute;
        top: 0;
        right: 50%;
        border-top: 1.5px solid #94a3b8;
        width: calc(50% + 12px);
        height: 32px;
        z-index: -1;
    }

    .tree li::after {
        right: auto;
        left: 50%;
        border-left: 1.5px solid #94a3b8;
    }

    .tree li:only-child::after, .tree li:only-child::before {
        display: none;
    }

    .tree li:only-child {
        padding-top: 0;
    }

    .tree li:first-child::before {
        border: 0 none;
    }

    .tree li:first-child::after {
        border-radius: 4px 0 0 0;
    }

    .tree li:last-child::after {
        border: 0 none;
    }

    .tree li:last-child::before {
        border-right: 1.5px solid #94a3b8;
        border-radius: 0 4px 0 0;
    }

    .tree ul ul::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        border-left: 1.5px solid #94a3b8;
        width: 0;
        height: 32px;
        transform: translateX(-50%);
        z-index: -1;
    }
`}</style>
        </div>
    );
};

export default OrganizationChart;
