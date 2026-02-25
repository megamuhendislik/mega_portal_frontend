import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  BriefcaseIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeSlashIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const SEVERITY_STYLES = {
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-600 border-blue-200',
};

const SEVERITY_ICONS = {
  error: <XCircleIcon className="w-4 h-4 text-red-500" />,
  warning: <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />,
  info: <InformationCircleIcon className="w-4 h-4 text-blue-500" />,
};

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 opacity-70" />
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function DeptNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const [showEmps, setShowEmps] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const hasEmps = node.employees && node.employees.length > 0;

  return (
    <div className={depth > 0 ? 'ml-5 border-l border-slate-200 pl-3' : ''}>
      <div className="flex items-center gap-2 py-1.5 group">
        {(hasChildren || hasEmps) ? (
          <button onClick={() => { setOpen(!open); if (!open) setShowEmps(true); else setShowEmps(false); }}
            className="p-0.5 rounded hover:bg-slate-100">
            {open ? <ChevronDownIcon className="w-4 h-4 text-slate-400" /> : <ChevronRightIcon className="w-4 h-4 text-slate-400" />}
          </button>
        ) : <span className="w-5" />}

        <span className={`text-sm font-semibold ${node.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
          {node.name}
        </span>
        <span className="text-xs text-slate-400 font-mono">{node.code}</span>

        {!node.is_active && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-600">PASİF</span>
        )}
        {!node.is_chart_visible && (
          <EyeSlashIcon className="w-3.5 h-3.5 text-slate-400" title="Şemada gizli" />
        )}

        {node.total_employee_count > node.employee_count ? (
          <span className="ml-auto flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              node.employee_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {node.employee_count} direkt
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {node.total_employee_count} toplam
            </span>
          </span>
        ) : (
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
            node.employee_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
          }`}>
            {node.employee_count} kişi
          </span>
        )}

        {node.manager_name && (
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            Yön: {node.manager_name}
          </span>
        )}
      </div>

      {open && (
        <>
          {hasEmps && (
            <div className="ml-7 mb-1">
              <button onClick={() => setShowEmps(!showEmps)}
                className="text-xs text-slate-500 hover:text-slate-700 mb-1 flex items-center gap-1">
                {showEmps ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                Çalışanları göster ({node.employee_count})
              </button>
              {showEmps && (
                <div className="space-y-0.5 mb-2">
                  {node.employees.map((emp) => (
                    <div key={`${emp.id}-${emp.is_primary}`} className="flex items-center gap-2 text-xs py-0.5 px-2 rounded hover:bg-slate-50">
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.is_primary ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <span className="text-slate-700 font-medium">{emp.name}</span>
                      <span className="text-slate-400">{emp.position}</span>
                      {!emp.is_primary && (
                        <span className="px-1 py-0.5 text-[10px] bg-amber-100 text-amber-600 rounded">İkincil</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {hasChildren && node.children.map((child) => (
            <DeptNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}

function PositionRow({ item }) {
  const [open, setOpen] = useState(false);
  const hasEmps = item.employees && item.employees.length > 0;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 py-2 px-3 hover:bg-slate-50 cursor-pointer" onClick={() => hasEmps && setOpen(!open)}>
        {hasEmps ? (
          open ? <ChevronDownIcon className="w-4 h-4 text-slate-400" /> : <ChevronRightIcon className="w-4 h-4 text-slate-400" />
        ) : <span className="w-4" />}

        <span className="text-sm font-medium text-slate-800 min-w-[180px]">{item.name}</span>
        <span className="text-xs text-slate-400 font-mono min-w-[140px]">{item.key}</span>
        <span className="text-xs text-slate-500 min-w-[60px]">Seviye: {item.hierarchy_level}</span>

        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
          item.employee_count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'
        }`}>
          {item.employee_count} kişi
        </span>
      </div>

      {open && hasEmps && (
        <div className="pl-11 pb-2 space-y-0.5">
          {item.employees.map((emp) => (
            <div key={`${emp.id}-${emp.department}`} className="flex items-center gap-2 text-xs py-0.5 px-2 rounded hover:bg-slate-50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700 font-medium">{emp.name}</span>
              <span className="text-slate-400">— {emp.department}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgAuditTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState('departments');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/system/health-check/org_audit/');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border flex items-center justify-center gap-3">
        <ArrowPathIcon className="w-6 h-6 text-indigo-500 animate-spin" />
        <span className="text-slate-600">Org yapısı taranıyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">Tekrar Dene</button>
      </div>
    );
  }

  if (!data) return null;

  const { departments, positions, assignments } = data;
  const issueCount = assignments.issues?.length || 0;

  const tabs = [
    { id: 'departments', label: 'Departmanlar', icon: BuildingOffice2Icon, count: departments.summary.total },
    { id: 'positions', label: 'Pozisyonlar', icon: BriefcaseIcon, count: positions.summary.total },
    { id: 'issues', label: 'Sorunlar', icon: ExclamationTriangleIcon, count: issueCount },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Toplam Dept" value={departments.summary.total} color="bg-white border-slate-200 text-slate-800" icon={BuildingOffice2Icon} />
        <StatCard label="Aktif" value={departments.summary.active} color="bg-emerald-50 border-emerald-200 text-emerald-800" icon={CheckCircleIcon} />
        <StatCard label="Pasif" value={departments.summary.inactive} color="bg-red-50 border-red-200 text-red-800" icon={XCircleIcon} />
        <StatCard label="Boş (0 kişi)" value={departments.summary.empty} color="bg-amber-50 border-amber-200 text-amber-800" icon={ExclamationTriangleIcon} />
        <StatCard label="Pozisyon" value={positions.summary.total} color="bg-white border-slate-200 text-slate-800" icon={BriefcaseIcon} />
        <StatCard label="Sorun" value={issueCount} color={issueCount > 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} icon={ExclamationTriangleIcon} />
      </div>

      {/* Section Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setSection(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                section === tab.id
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}>
              <tab.icon className="w-4.5 h-4.5" />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab.id === 'issues' && tab.count > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}

          <button onClick={fetchData} className="ml-auto mr-3 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Yenile">
            <ArrowPathIcon className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-4 max-h-[600px] overflow-y-auto">
          {/* Departments */}
          {section === 'departments' && (
            <div className="space-y-1">
              {departments.tree.map((root) => (
                <DeptNode key={root.id} node={root} depth={0} />
              ))}
              {departments.tree.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Departman bulunamadı</p>
              )}
            </div>
          )}

          {/* Positions */}
          {section === 'positions' && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_140px_80px_80px] gap-3 px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-b">
                <span>Pozisyon</span><span>Key</span><span>Seviye</span><span className="text-right">Kişi</span>
              </div>
              {positions.items.map((item) => (
                <PositionRow key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Issues */}
          {section === 'issues' && (
            <div className="space-y-4">
              {/* Unassigned employees */}
              {assignments.unassigned_employees && assignments.unassigned_employees.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4" />
                    Atamasız Çalışanlar ({assignments.unassigned_employees.length})
                  </h4>
                  <div className="rounded-lg border border-amber-200 overflow-hidden">
                    {assignments.unassigned_employees.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-3 px-3 py-2 text-sm border-b border-amber-100 last:border-0 bg-amber-50/50">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-medium text-slate-800">{emp.name}</span>
                        <span className="text-slate-400 text-xs">Dept: {emp.department}</span>
                        <span className="text-slate-400 text-xs">Poz: {emp.position}</span>
                        <span className="ml-auto text-xs text-amber-600">{emp.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All issues */}
              {assignments.issues && assignments.issues.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Tüm Sorunlar ({assignments.issues.length})</h4>
                  <div className="space-y-1.5">
                    {assignments.issues.map((issue, idx) => (
                      <div key={idx} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info}`}>
                        {SEVERITY_ICONS[issue.severity]}
                        <span className="font-medium">{issue.name}</span>
                        <span className="opacity-70 text-xs ml-auto">{issue.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-emerald-700 font-semibold">Sorun bulunamadı</p>
                  <p className="text-slate-400 text-sm">Org yapısı tutarlı görünüyor</p>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-slate-700">{assignments.summary.total}</div>
                  <div className="text-xs text-slate-500">Toplam Atama</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-emerald-700">{assignments.summary.primary}</div>
                  <div className="text-xs text-emerald-600">Primary</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-amber-700">{assignments.summary.secondary}</div>
                  <div className="text-xs text-amber-600">İkincil</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${assignments.summary.unassigned > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <div className={`text-lg font-bold ${assignments.summary.unassigned > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{assignments.summary.unassigned}</div>
                  <div className={`text-xs ${assignments.summary.unassigned > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Atamasız</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
