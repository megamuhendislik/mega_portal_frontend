import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, User, Building, ZoomIn, ZoomOut, Maximize, MousePointer, Star } from 'lucide-react';
import api from '../services/api';
import DebugConsole from '../components/DebugConsole';
import { useAuth } from '../context/AuthContext';

// Simple Modal Component for Employee Details
const EmployeeDetailModal = ({ employee, onClose }) => {
    if (!employee) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-blue-600 p-6 text-white text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <ChevronDown className="rotate-180" size={20} />
                    </button>

                    <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-3xl font-bold mb-3 border-4 border-white/30">
                        {employee.name.charAt(0)}
                    </div>
                    <h2 className="text-xl font-bold">{employee.name}</h2>
                    <p className="text-blue-100 font-medium text-sm mt-1">
                        {(!employee.title || employee.title === 'Temp') ? 'Unvan Belirtilmemiş' : employee.title}
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <Building size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Bölüm</p>
                                <p className="text-sm font-semibold text-slate-700">
                                    {employee.department_name || 'Ana Birim'}
                                </p>
                            </div>
                        </div>

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

                        {employee.email && (
                            <div className="flex items-center gap-3 p-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <span className="text-xs">@</span>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs text-slate-500">Email</p>
                                    <p className="text-sm font-medium text-slate-700 truncate">{employee.email}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                        onClick={() => alert('Profil detay sayfasına yönlendirilecek...')}
                        className="text-sm text-blue-600 font-medium hover:underline"
                    >
                        Tam Profili Görüntüle
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmployeeNode = ({ emp, onClick, showTags }) => (
    <div
        className={`
            relative z-10 p-3 rounded-lg border-2 shadow-lg transition-all hover:scale-105 hover:shadow-xl cursor-pointer
            ${emp.is_secondary
                ? 'bg-amber-50 border-amber-300 text-amber-900' // Secondary Styling
                : 'bg-gradient-to-b from-blue-400 to-blue-600 border-blue-300 text-white' // Main Manager Styling (Blue 3D)
            }
            min-w-[180px] max-w-[220px]
        `}
        onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(emp);
        }}
    >
        <div className="flex flex-col items-center gap-1">
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1 border-2 border-white/30 shadow-inner
                ${emp.is_secondary ? 'bg-amber-100 text-amber-700' : 'bg-white/20 text-white backdrop-blur-sm'}
            `}>
                {emp.name.charAt(0)}
            </div>

            <div className="w-full px-1">
                <h4 className="font-bold text-sm leading-tight break-words drop-shadow-md uppercase tracking-wide">
                    {emp.name}
                </h4>
                {(!emp.title || emp.title === 'Temp') ? null : (
                    <p className={`text-xs font-medium mt-0.5 leading-tight break-words ${emp.is_secondary ? 'text-amber-700' : 'text-blue-100'}`}>
                        {emp.title}
                    </p>
                )}
            </div>

            {showTags && emp.functional_groups && emp.functional_groups.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {emp.functional_groups.map((group, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                            {group}
                        </span>
                    ))}
                </div>
            )}

            {emp.is_secondary && (
                <div className="absolute top-1 right-1" title="İkincil Görevlendirme">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                </div>
            )}
        </div>
    </div>
);

const DepartmentNode = ({ node }) => (
    <div
        className={`
            relative z-10 p-4 rounded-xl border-b-4 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer
            bg-gradient-to-br from-slate-700 to-slate-800 border-slate-900 text-white
            min-w-[240px] max-w-[280px]
        `}
        onClick={(e) => {
            e.stopPropagation();
        }}
    >
        <div className="flex flex-col items-center gap-2">
            <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center shadow-lg border border-white/10
                bg-white/10 backdrop-blur-md text-blue-300
            `}>
                <Building size={20} />
            </div>

            <div>
                <h3 className="font-bold text-base uppercase tracking-wider drop-shadow-lg">
                    {node.name}
                </h3>
            </div>
        </div>
    </div>
);

const TreeNode = ({ node, showAllEmployees, showTags, onEmployeeClick }) => {
    const isDepartment = node.type === 'department';

    // Combine Sub-Departments into branching children (Tree Structure)
    let branchingChildren = [];
    let employeeGroup = [];

    if (isDepartment) {
        // 1. Separation: Employees go to a "Group", Departments go to "Tree"
        if (node.employees && node.employees.length > 0) {
            const visibleEmployees = node.employees.filter(e => showAllEmployees || (e.rank && e.rank <= 3));
            if (visibleEmployees.length > 0) {
                employeeGroup = visibleEmployees.map(e => ({ ...e, type: 'employee' }));
            }
        }

        // 2. Sub-Departments (Tree Branches)
        if (node.children && node.children.length > 0) {
            branchingChildren = node.children.map(d => ({ ...d, type: 'department' }));
        }
    } else {
        // Employee Node (Manager -> Subordinates)
        // Keep original logic for employee-to-employee matrix reporting if used
        if (node.children && node.children.length > 0) {
            branchingChildren = node.children.map(child => ({
                ...child,
                type: child.code ? 'department' : 'employee'
            }));
        }
    }

    const hasTreeChildren = branchingChildren.length > 0;
    const hasEmployees = employeeGroup.length > 0;

    return (
        <li>
            <div className="flex flex-col items-center relative gap-4">
                {/* Main Node Card */}
                {isDepartment ? (
                    <DepartmentNode node={node} />
                ) : (
                    <EmployeeNode emp={node} onClick={onEmployeeClick} showTags={showTags} />
                )}

                {/* VISUAL IMPROVEMENT: Render Employees as a GRID here, under the specific Dept, 
                    instead of spreading them as individual tree branches. 
                    This keeps the chart compact.
                */}
                {isDepartment && hasEmployees && (
                    <div className="relative mt-4 p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 text-[10px] text-slate-400 font-medium border rounded-full">
                            Ekip ({employeeGroup.length})
                        </div>
                        {/* Vertical Line Connector is handled by parent CSS if we treat this div as part of the content, 
                            but conceptually it's a "leaf list" of this node. 
                        */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-max max-w-[800px]">
                            {employeeGroup.map(emp => (
                                <EmployeeNode
                                    key={`emp-grid-${emp.id}`}
                                    emp={emp}
                                    onClick={onEmployeeClick}
                                    showTags={showTags}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Recursive Branching Children (Only Departments or Direct Tree Subordinates) */}
            {hasTreeChildren && (
                <ul>
                    {branchingChildren.map(child => (
                        <TreeNode
                            key={`${child.type}-${child.id}`}
                            node={child}
                            showAllEmployees={showAllEmployees}
                            showTags={showTags}
                            onEmployeeClick={onEmployeeClick}
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

    // Zoom & Pan State
    const [scale, setScale] = useState(1); // Default 100% zoom as requested
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const response = await api.get('/departments/hierarchy/');
                let data = response.data;
                console.log('DEBUG: Organization Chart Data:', data);

                // Filter Functional Groups
                if (Array.isArray(data)) {
                    data = data.filter(node =>
                        node.is_chart_visible !== false && // Check explicit false
                        !node.code.includes('ROOT_FUNC') &&
                        !node.name.includes('Fonksiyonel')
                    );
                }

                if (Array.isArray(data) && data.length > 1) {
                    data = [{
                        id: 'root-company',
                        name: 'Mega Portal',
                        code: 'COMPANY',
                        employees: [],
                        children: data
                    }];
                }
                setTreeData(data);
            } catch (err) {
                console.error('Error fetching hierarchy:', err);
                setError('Organizasyon şemasını görüntüleme yetkiniz yok.');
            } finally {
                setLoading(false);
            }
        };

        fetchHierarchy();
    }, []);

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

                    <button
                        onClick={() => setShowEmployees(!showEmployees)}
                        className={`
                            flex items - center gap - 2 px - 3 py - 1.5 rounded - lg text - xs md: text - sm font - medium transition - colors border shadow - sm whitespace - nowrap
                            ${showEmployees
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }
`}
                    >
                        <User size={16} />
                        {showEmployees ? 'Çalışanları Gizle' : 'Çalışanları Göster'}
                    </button>

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
                                    showAllEmployees={showEmployees}
                                    showTags={showTags}
                                    onEmployeeClick={setSelectedEmployee}
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
