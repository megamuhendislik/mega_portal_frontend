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
            relative z-10 p-4 rounded-xl border shadow-sm transition-all hover:shadow-lg bg-white min-w-[220px] text-center cursor-pointer
            border-blue-400 bg-blue-50/30 ring-1 ring-blue-100
        `}
        onClick={(e) => {
            e.stopPropagation();
        }}
    >
        <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-blue-600 text-white">
                <Building size={20} />
            </div>

            <div>
                <h3 className="font-bold text-blue-900 text-sm">
                    {node.name}
                </h3>
                {node.code && <div className="text-[10px] text-slate-400">{node.code}</div>}
            </div>
        </div>
    </div>
);

const TreeNode = ({ node }) => {
    // We treat everything as children (Employees + Sub-Departments)
    const hasChildren = (node.employees && node.employees.length > 0) || (node.children && node.children.length > 0);

    return (
        <li>
            {node.type === 'employee' ? (
                <EmployeeNode emp={node} />
            ) : (
                <DepartmentNode node={node} />
            )}

            {hasChildren && (
                <ul>
                    {/* Visualizing Employees as nodes directly under the department */}
                    {node.employees?.map(emp => (
                        <TreeNode key={`emp-${emp.id}`} node={{ ...emp, type: 'employee' }} />
                    ))}
                    {node.children?.map(child => (
                        <TreeNode key={child.id} node={{ ...child, type: 'department' }} />
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
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0 px-1">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Organizasyon Şeması</h2>
                    <p className="text-slate-500 mt-1">İnteraktif Şema (Sürükle & Yakınlaştır)</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={18} /></button>
                    <span className="text-xs font-mono w-12 text-center">{(scale * 100).toFixed(0)}%</span>
                    <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={18} /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={handleResetZoom} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Sıfırla"><Maximize size={18} /></button>
                </div>
            </div>

            <div
                className="card bg-slate-50/50 flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing border border-slate-200 rounded-xl"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <div
                    className="absolute top-0 left-0 origin-top-left transition-transform duration-75 ease-out"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        width: 'fit-content',
                        height: 'fit-content',
                        padding: '100px' // Initial padding
                    }}
                >
                    <div className="tree select-none">
                        <ul>
                            {treeData.map(node => (
                                <TreeNode key={node.id} node={{ ...node, type: 'department' }} />
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                /* Tree CSS - Standard Logic */
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
                .tree li::before, .tree li::after {
                    content: '';
                    position: absolute; top: 0; right: 50%;
                    border-top: 1px solid #94a3b8;
                    width: 50%; height: 20px;
                }
                .tree li::after {
                    right: auto; left: 50%;
                    border-left: 1px solid #94a3b8;
                }
                .tree li:only-child::after, .tree li:only-child::before {
                    display: none;
                }
                .tree li:only-child { 
                    padding-top: 0;
                }
                .tree li:first-child::before, .tree li:last-child::after {
                    border: 0 none;
                }
                .tree li:last-child::before{
                    border-right: 1px solid #94a3b8;
                    border-radius: 0 5px 0 0;
                }
                .tree li:first-child::after{
                    border-radius: 5px 0 0 0;
                }
                .tree ul ul::before{
                    content: '';
                    position: absolute; top: 0; left: 50%;
                    border-left: 1px solid #94a3b8;
                    width: 0; height: 20px;
                }
            `}</style>
        </div>
    );
};

export default OrganizationChart;
