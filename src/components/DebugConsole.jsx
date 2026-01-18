
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DebugConsole = ({ treeData }) => {
    const [fullState, setFullState] = useState(null);
    const [activeTab, setActiveTab] = useState('hierarchy');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAttributes = async () => {
            setLoading(true);
            try {
                const res = await api.get('/departments/full-debug/');
                setFullState(res.data);
            } catch (err) {
                console.error("Debug fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        if (activeTab !== 'hierarchy' && !fullState) {
            fetchAttributes();
        }
    }, [activeTab]);

    const tabs = [
        { id: 'hierarchy', label: 'Hierarchy (Tree)' },
        { id: 'departments', label: 'Departments DB' },
        { id: 'employees', label: 'Employees' },
        { id: 'roles', label: 'Roles & Perms' },
        { id: 'positions', label: 'Positions' },
    ];

    return (
        <div className="shrink-0 max-h-96 overflow-hidden flex flex-col bg-slate-900 text-slate-300 font-mono text-xs rounded-xl border border-slate-700 shadow-lg m-2">

            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-slate-800 border-b border-slate-700 sticky top-0 overflow-x-auto">
                <span className="font-bold text-amber-400 px-2">DEBUG MODE</span>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1 rounded transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="overflow-auto p-4 flex-1">
                {activeTab === 'hierarchy' && (
                    <pre>{JSON.stringify(treeData, null, 2)}</pre>
                )}

                {loading && <div className="text-center p-4 text-blue-400">Loading System State...</div>}

                {!loading && fullState && activeTab === 'departments' && (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-700">
                                <th className="p-1">ID</th>
                                <th className="p-1">Code</th>
                                <th className="p-1">Name</th>
                                <th className="p-1">Parent</th>
                                <th className="p-1">Manager</th>
                                <th className="p-1">Visible?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullState.departments.map(d => (
                                <tr key={d.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="p-1 text-slate-500">{d.id}</td>
                                    <td className="p-1 text-blue-300">{d.code}</td>
                                    <td className="p-1">{d.name}</td>
                                    <td className="p-1 text-amber-300">{d.parent || '-'}</td>
                                    <td className="p-1">{d.manager || '-'}</td>
                                    <td className="p-1">{d.is_chart_visible ? 'YES' : <span className="text-red-400">HIDDEN</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && fullState && activeTab === 'employees' && (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-700">
                                <th className="p-1">Name</th>
                                <th className="p-1">Position</th>
                                <th className="p-1">Dept (Main)</th>
                                <th className="p-1">Manager</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullState.employees.map(e => (
                                <tr key={e.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="p-1 text-white">{e.name}</td>
                                    <td className="p-1 text-purple-300">{e.title}</td>
                                    <td className="p-1 text-blue-300">{e.dept}</td>
                                    <td className="p-1 text-amber-300">{e.manager}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && fullState && activeTab === 'roles' && (
                    <div className="space-y-4">
                        {fullState.roles.map(r => (
                            <div key={r.key} className="border border-slate-700 rounded p-2">
                                <div className="font-bold text-green-400 mb-1">{r.name} ({r.key})</div>
                                <div className="flex flex-wrap gap-1">
                                    {r.permissions.map(p => (
                                        <span key={p} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-600">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && fullState && activeTab === 'positions' && (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-700">
                                <th className="p-1">Position Name</th>
                                <th className="p-1">Level</th>
                                <th className="p-1">Default Roles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullState.positions.map(p => (
                                <tr key={p.name} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="p-1 text-white">{p.name}</td>
                                    <td className="p-1 text-blue-300">{p.level}</td>
                                    <td className="p-1 text-green-300">{p.roles.join(', ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

            </div>
        </div>
    );
};

export default DebugConsole;
