import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, ChevronUp, User, Building, ZoomIn, ZoomOut, Maximize, MousePointer, Star } from 'lucide-react';
import api from '../services/api';
import DebugConsole from '../components/DebugConsole';
import { useAuth } from '../context/AuthContext';

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
    const jobDesc = liveData?.job_description || employee.title || 'Görev tanımı yok.';

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
                        {/* Unit Info */}
                        <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Building size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Organizasyonel Birim</p>
                                <p className="text-sm font-semibold text-slate-800 break-words leading-snug mt-1">
                                    {detailedUnit}
                                </p>
                            </div>
                        </div>

                        {/* Job Description */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Görev Tanımı</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {jobDesc}
                            </p>
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
const DepartmentNode = ({ node }) => (
    <div
        className={`
            relative z-10 p-3 rounded-xl border-l-4 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer
            bg-white border-slate-200 border-l-emerald-500 text-slate-800
            min-w-[220px] max-w-[260px]
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
        </div>
    </div>
);

const TreeNode = ({ node, showAllEmployees, showTags, onEmployeeClick }) => {
    // 1. Determine Type Dynamicallly (Fix for "Departments appearing as Employees")
    const isDepartment = node.type === 'department' || node.code || node.employees;

    // Combine Sub-Departments AND Employees into branching children (Tree Structure)
    let branchingChildren = [];

    if (isDepartment) {
        // 1. Employees (Managers -> Subordinates Tree)
        if (showAllEmployees && node.employees && node.employees.length > 0) {
            const empNodes = node.employees.map(e => ({ ...e, type: 'employee' }));
            branchingChildren.push(...empNodes);
        }

        // 2. Sub-Departments
        if (node.children && node.children.length > 0) {
            const deptNodes = node.children.map(d => ({ ...d, type: 'department' }));
            branchingChildren.push(...deptNodes);
        }
    } else {
        // Employee Node (Manager -> Subordinates OR Mixed Departments)
        if (node.children && node.children.length > 0) {
            branchingChildren = node.children.map(child => {
                // Heuristic: If child has 'employees' array or 'code', treat as Department
                // Otherwise treat as Employee
                const childIsDept = child.employees || child.code;
                return {
                    ...child,
                    type: childIsDept ? 'department' : 'employee'
                };
            });
        }
    }

    const hasChildren = branchingChildren.length > 0;

    return (
        <li>
            <div className="flex flex-col items-center relative gap-6">
                {/* Main Node Card */}
                {isDepartment ? (
                    <DepartmentNode node={node} />
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
