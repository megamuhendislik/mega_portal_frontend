import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, User, Building, ZoomIn, ZoomOut, Maximize, MousePointer } from 'lucide-react';
import api from '../services/api';

const EmployeeNode = ({ emp }) => (
    <div
        className={`
            relative z-10 p-2 rounded-lg border shadow-sm transition-all hover:shadow-md bg-white min-w-[140px] text-center cursor-pointer group
            ${emp.is_secondary
                ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                : 'border-slate-200 hover:border-blue-300'
            }
        `}
        onClick={(e) => {
            e.stopPropagation();
            alert(`Çalışan: ${emp.name}\nUnvan: ${emp.title}`);
        }}
    >
        <div className="flex flex-col items-center gap-1">
            <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                ${emp.is_secondary ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
            `}>
                {emp.name.charAt(0)}
            </div>

            <div>
                <h4 className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{emp.name}</h4>
                <p className="text-[9px] text-slate-500 truncate max-w-[120px]">{emp.title}</p>
            </div>

            {emp.functional_groups && emp.functional_groups.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                    {emp.functional_groups.map((group, idx) => (
                        <span key={idx} className="text-[6px] px-1 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            {group}
                        </span>
                    ))}
                </div>
            )}

            {emp.is_secondary && (
                <div className="absolute top-1 right-1">
                    <span className="text-[6px] px-1 rounded bg-amber-100 text-amber-700">Ek</span>
                </div>
            )}
        </div>
    </div>
);

const DepartmentNode = ({ node }) => (
    <div
        className={`
            relative z-10 p-3 rounded-xl border shadow-sm transition-all hover:shadow-lg bg-white min-w-[180px] max-w-[220px] text-center cursor-pointer
            border-blue-200 hover:border-blue-400
        `}
        onClick={(e) => {
            e.stopPropagation();
        }}
    >
        <div className="flex flex-col items-center gap-2">
            <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center shadow-sm 
                ${node.code === 'COMPANY' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}
            `}>
                <Building size={16} />
            </div>

            <div>
                <h3 className="font-bold text-slate-800 text-sm leading-tight">
                    {node.name}
                </h3>
            </div>
        </div>
    </div>
);

const TreeNode = ({ node, showAllEmployees }) => {
    // Only treat as having children if:
    // 1. It has sub-departments (always show)
    // 2. It has employees AND showAllEmployees is true
    const hasSubDepts = node.children && node.children.length > 0;
    const hasEmployees = node.employees && node.employees.length > 0;
    const shouldRenderChildren = hasSubDepts || (hasEmployees && showAllEmployees);

    return (
        <li>
            {node.type === 'employee' ? (
                <EmployeeNode emp={node} />
            ) : (
                <DepartmentNode node={node} />
            )}

            {shouldRenderChildren && (
                <ul>
                    {/* Render Employees if toggle is ON */}
                    {showAllEmployees && node.employees?.map(emp => (
                        <TreeNode key={`emp-${emp.id}`} node={{ ...emp, type: 'employee' }} showAllEmployees={showAllEmployees} />
                    ))}

                    {/* Always render sub-departments */}
                    {node.children?.map(child => (
                        <TreeNode key={child.id} node={{ ...child, type: 'department' }} showAllEmployees={showAllEmployees} />
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
    const [showEmployees, setShowEmployees] = useState(false); // Default off to reduce clutter

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const response = await api.get('/departments/hierarchy/');
                let data = response.data;

                // Filter Functional Groups
                if (Array.isArray(data)) {
                    data = data.filter(node =>
                        !node.code.includes('ROOT_FUNC') &&
                        !node.name.includes('Fonksiyonel') &&
                        !node.name.includes('Functional')
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

    // Pan Handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - startPos.x,
            y: e.clientY - startPos.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

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
        <div className="space-y-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0 px-1">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Organizasyon Şeması</h2>
                    <p className="text-slate-500 mt-1">İnteraktif Şema (Sürükle & Yakınlaştır)</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowEmployees(!showEmployees)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border shadow-sm
                            ${showEmployees
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }
                        `}
                    >
                        <User size={16} />
                        {showEmployees ? 'Çalışanları Gizle' : 'Çalışanları Göster'}
                    </button>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm z-50">
                        <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={18} /></button>
                        <span className="text-xs font-mono w-12 text-center">{(scale * 100).toFixed(0)}%</span>
                        <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={18} /></button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button onClick={handleResetZoom} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Sıfırla"><Maximize size={18} /></button>
                    </div>
                </div>
            </div>

            <div
                className="card bg-slate-50/50 flex-1 min-h-[600px] relative overflow-hidden cursor-grab active:cursor-grabbing border border-slate-200 rounded-xl"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
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
                                <TreeNode key={node.id} node={{ ...node, type: node.type || 'department' }} showAllEmployees={showEmployees} />
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
                    /* Core Flex Behavior for LIs */
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
