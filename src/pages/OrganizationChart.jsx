import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, User, Building } from 'lucide-react';
import api from '../services/api';

const TreeNode = ({ node, level = 0 }) => {
    const [expanded, setExpanded] = useState(true);
    const [showEmployees, setShowEmployees] = useState(true); // Open by default
    const hasChildren = node.children && node.children.length > 0;

    return (
        <li>
            <div className="flex flex-col items-center">
                <div
                    className={`
                        relative z-10 p-3 rounded-xl border shadow-sm transition-all hover:shadow-md bg-white min-w-[200px] text-center cursor-pointer
                        ${level === 0 ? 'border-blue-400 bg-blue-50 ring-4 ring-blue-50/50' : 'border-slate-200'}
                    `}
                    onClick={() => hasChildren && setExpanded(!expanded)}
                >
                    <div className="flex flex-col items-center gap-1">
                        <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center shadow-sm mb-1
                            ${level === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}
                        `}>
                            <Building size={16} />
                        </div>

                        {/* ... */}

                        <div>
                            <h3 className={`font-bold ${level === 0 ? 'text-blue-900 text-base' : 'text-slate-800 text-sm'}`}>
                                {node.name}
                            </h3>
                            {node.code && <div className="text-[10px] text-slate-400">{node.code}</div>}
                        </div>

                        <div className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-medium text-slate-600 border border-slate-200">
                            {node.employees.length} Çalışan
                        </div>

                        {node.employees.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmployees(!showEmployees);
                                }}
                                className="mt-2 text-[10px] text-blue-500 hover:text-blue-700 underline flex items-center gap-1"
                            >
                                <User size={10} />
                                {showEmployees ? 'Gizle' : 'Göster'}
                            </button>
                        )}

                        {showEmployees && (
                            <div className="mt-2 w-full pt-2 border-t border-slate-100 flex flex-col gap-1">
                                {node.employees.map(emp => (
                                    <div
                                        key={emp.id}
                                        className={`
                                            text-[10px] text-left p-1.5 rounded flex flex-col border
                                            ${emp.is_secondary
                                                ? 'bg-amber-50 text-amber-900 border-amber-100'
                                                : 'bg-slate-50 text-slate-600 border-slate-100'
                                            }
                                        `}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium truncate">{emp.name}</span>
                                                {emp.is_secondary && <span className="text-[8px] px-1 rounded bg-amber-100 text-amber-700 ml-1">Ek</span>}
                                            </div>

                                            <span className={`text-[9px] ${emp.is_secondary ? 'text-amber-700/70' : 'text-slate-400'}`}>
                                                {emp.title}
                                            </span>

                                            {/* Functional Group Badges */}
                                            {emp.functional_groups && emp.functional_groups.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {emp.functional_groups.map((group, idx) => (
                                                        <span key={idx} className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                            {group}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {hasChildren && expanded && (
                <ul>
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} level={level + 1} />
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

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const response = await api.get('/departments/hierarchy/');
                console.log('Organization Chart API Response:', response);
                let data = response.data;
                console.log('Organization Chart Data:', data);

                // If multiple roots, wrap them in a virtual company node
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
                setError('Organizasyon şemasını görüntüleme yetkiniz yok veya bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchHierarchy();
    }, []);

    const containerRef = React.useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [startY, setStartY] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - containerRef.current.offsetLeft);
        setStartY(e.pageY - containerRef.current.offsetTop);
        setScrollLeft(containerRef.current.scrollLeft);
        setScrollTop(containerRef.current.scrollTop);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const y = e.pageY - containerRef.current.offsetTop;
        const walkX = (x - startX) * 1.5; // Scroll-fast
        const walkY = (y - startY) * 1.5;
        containerRef.current.scrollLeft = scrollLeft - walkX;
        containerRef.current.scrollTop = scrollTop - walkY;
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

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Organizasyon Şeması</h2>
                    <p className="text-slate-500 mt-1">Şirket hiyerarşisi ve departman yapısı (Sürükleyerek gezinebilirsiniz)</p>
                </div>
            </div>

            <div
                ref={containerRef}
                className={`card p-8 overflow-auto bg-slate-50/50 flex-1 min-h-[600px] select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                <div className="tree min-w-max mx-auto pointer-events-none">
                    <ul className="pointer-events-auto">
                        {treeData.map(node => (
                            <TreeNode key={node.id} node={node} />
                        ))}
                    </ul>
                </div>
            </div>

            <style>{`
                /* Tree CSS */
                .tree ul {
                    padding-top: 20px; 
                    position: relative;
                    transition: all 0.5s;
                    display: flex;
                    justify-content: center;
                }

                .tree li {
                    float: left; 
                    text-align: center;
                    list-style-type: none;
                    position: relative;
                    padding: 20px 5px 0 5px;
                    transition: all 0.5s;
                }

                /* We will use ::before and ::after to draw the connectors */

                .tree li::before, .tree li::after {
                    content: '';
                    position: absolute; 
                    top: 0; 
                    right: 50%;
                    border-top: 1px solid #94a3b8;
                    width: 50%; 
                    height: 20px;
                }

                .tree li::after {
                    right: auto; 
                    left: 50%;
                    border-left: 1px solid #94a3b8;
                }

                /* We need to remove left-right connectors from elements without 
                   any siblings */
                .tree li:only-child::after, .tree li:only-child::before {
                    display: none;
                }

                /* Remove space from the top of single children */
                .tree li:only-child { 
                    padding-top: 0;
                }

                /* Remove left connector from first child and 
                   right connector from last child */
                .tree li:first-child::before, .tree li:last-child::after {
                    border: 0 none;
                }

                /* Adding back the vertical connector to the last nodes */
                .tree li:last-child::before{
                    border-right: 1px solid #94a3b8;
                    border-radius: 0 5px 0 0;
                }
                .tree li:first-child::after{
                    border-radius: 5px 0 0 0;
                }

                /* Time to add downward connectors from parents */
                .tree ul ul::before{
                    content: '';
                    position: absolute; 
                    top: 0; 
                    left: 50%;
                    border-left: 1px solid #94a3b8;
                    width: 0; 
                    height: 20px;
                }
            `}</style>
        </div>
    );
};

export default OrganizationChart;
