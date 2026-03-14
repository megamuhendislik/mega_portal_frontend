import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

const STATUS_COLORS = {
  POTENTIAL: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
  ASSIGNED: 'bg-orange-100 text-orange-800',
  CLAIMED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

const SOURCE_COLORS = {
  INTENDED: 'bg-blue-100 text-blue-700',
  POTENTIAL: 'bg-purple-100 text-purple-700',
  MANUAL: 'bg-orange-100 text-orange-700',
};

const SOURCE_LABELS = {
  INTENDED: 'Planlı',
  POTENTIAL: 'Algılanan',
  MANUAL: 'Manuel',
};

const CLAIM_STATUS_CONFIG = {
  CLAIMABLE: { color: 'bg-emerald-100 text-emerald-800', label: 'Talep Edilebilir' },
  CLAIMED: { color: 'bg-blue-100 text-blue-800', label: 'Talep Edildi' },
  BLOCKED: { color: 'bg-red-100 text-red-800', label: 'Bloklanmış' },
  EXPIRED: { color: 'bg-gray-100 text-gray-500', label: 'Süresi Geçmiş' },
};

const STATUS_LABELS = {
  POTENTIAL: 'Potansiyel',
  PENDING: 'Beklemede',
  APPROVED: 'Onaylı',
  REJECTED: 'Reddedildi',
  CANCELLED: 'İptal',
  ASSIGNED: 'Atandı',
  CLAIMED: 'Talep Edildi',
  EXPIRED: 'Süresi Doldu',
};

const OT_TYPE_LABELS = {
  PRE_SHIFT: 'Vardiya Öncesi',
  POST_SHIFT: 'Vardiya Sonrası',
  OFF_DAY: 'Tatil Günü',
  MIXED: 'Karma',
};

function formatHours(h) {
  if (!h && h !== 0) return '—';
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0 && mins === 0) return '0dk';
  if (hours === 0) return `${mins}dk`;
  if (mins === 0) return `${hours}s`;
  return `${hours}s ${mins}dk`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function SummaryCard({ title, count, hours, icon: Icon, colorClasses, subtitle }) {
  return (
    <div className={`rounded-xl border p-4 ${colorClasses}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-70">{title}</span>
        <Icon className="w-5 h-5 opacity-50" />
      </div>
      <div className="text-2xl font-bold">{count}</div>
      {hours !== undefined && hours !== null && (
        <div className="text-sm opacity-60 mt-1">{formatHours(hours)}</div>
      )}
      {subtitle && <div className="text-xs opacity-50 mt-1 leading-snug">{subtitle}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function SourceBadge({ source }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[source] || 'bg-gray-100'}`}>
      {SOURCE_LABELS[source] || source}
    </span>
  );
}

function ClaimStatusBadge({ claimStatus, blockReason }) {
  const config = CLAIM_STATUS_CONFIG[claimStatus] || CLAIM_STATUS_CONFIG.CLAIMABLE;
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
      {blockReason && (
        <span className="text-[11px] text-red-500 leading-tight max-w-[200px]">{blockReason}</span>
      )}
    </div>
  );
}

function DataTable({ title, count, columns, data, defaultExpanded = false, filterBar }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">{count}</span>
        </div>
        {expanded
          ? <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          : <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        }
      </button>
      {expanded && (
        <>
          {filterBar && <div className="px-5 pb-3 border-t border-gray-100 pt-3">{filterBar}</div>}
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  {columns.map((col, i) => (
                    <th key={i} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                      Kayıt bulunamadı
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      {columns.map((col, ci) => (
                        <td key={ci} className="px-4 py-2.5 whitespace-nowrap">
                          {col.render ? col.render(row) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function FilterRow({ search, setSearch, filters = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[180px]">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Çalışan veya departman ara..."
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>
      {filters.map((f, i) => (
        <select
          key={i}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="">{f.placeholder}</option>
          {f.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

function FixActionCard({ title, description, icon: Icon, colorClasses, state, onScan, onFix }) {
  const { loading, result, executing } = state;
  const hasResults = result && !result.error;
  const count = hasResults ? (result.affected_count ?? result.would_affect ?? 0) : 0;
  const isDryRun = hasResults && result.dry_run === true;

  return (
    <div className={`rounded-xl border p-4 ${colorClasses}`}>
      <div className="flex items-start gap-3 mb-3">
        <Icon className="w-5 h-5 mt-0.5 shrink-0 opacity-70" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold leading-snug">{title}</h4>
          <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      {result?.error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{result.error}</div>
      )}

      {hasResults && (
        <div className="bg-white/60 rounded-lg px-3 py-2 mb-3 text-xs space-y-1">
          <div className="font-medium">
            {isDryRun ? 'Tarama Sonucu' : 'Düzeltme Tamamlandı'}: <span className="font-bold">{count}</span> kayıt {isDryRun ? 'bulundu' : 'düzeltildi'}
          </div>
          {result.details && result.details.length > 0 && (
            <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
              {result.details.slice(0, 10).map((d, i) => (
                <li key={i} className="text-[11px] opacity-80 truncate" title={typeof d === 'string' ? d : JSON.stringify(d)}>
                  {typeof d === 'string' ? d : `${d.employee_name || ''} — ${formatDate(d.date)} ${d.reason || d.status || ''}`}
                </li>
              ))}
              {result.details.length > 10 && (
                <li className="text-[11px] opacity-50">...ve {result.details.length - 10} kayıt daha</li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onScan}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/80 border border-current/10 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <MagnifyingGlassIcon className="w-3.5 h-3.5" />}
          Tarama Yap
        </button>
        {isDryRun && count > 0 && (
          <button
            onClick={() => {
              if (window.confirm(`${count} kayıt düzeltilecek. Devam edilsin mi?`)) onFix();
            }}
            disabled={executing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {executing ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <WrenchScrewdriverIcon className="w-3.5 h-3.5" />}
            Düzelt
          </button>
        )}
        {!isDryRun && count > 0 && (
          <span className="flex items-center gap-1 text-xs text-green-700">
            <CheckCircleIcon className="w-4 h-4" /> Tamamlandı
          </span>
        )}
      </div>
    </div>
  );
}

export default function OTAnalysisTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Table-level filters
  const [assignSearch, setAssignSearch] = useState('');
  const [assignStatus, setAssignStatus] = useState('');
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatus, setReqStatus] = useState('');
  const [reqSource, setReqSource] = useState('');
  const [potSearch, setPotSearch] = useState('');
  const [potClaimStatus, setPotClaimStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/system/health-check/ot-analysis/');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Veri alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Filtered data ---
  const filteredAssignments = useMemo(() => {
    if (!data?.assignments) return [];
    return data.assignments.filter(a => {
      if (assignSearch && !`${a.employee_name} ${a.department}`.toLowerCase().includes(assignSearch.toLowerCase())) return false;
      if (assignStatus && a.status !== assignStatus) return false;
      return true;
    });
  }, [data?.assignments, assignSearch, assignStatus]);

  const filteredRequests = useMemo(() => {
    if (!data?.requests) return [];
    return data.requests.filter(r => {
      if (reqSearch && !`${r.employee_name} ${r.department}`.toLowerCase().includes(reqSearch.toLowerCase())) return false;
      if (reqStatus && r.status !== reqStatus) return false;
      if (reqSource && r.source !== reqSource) return false;
      return true;
    });
  }, [data?.requests, reqSearch, reqStatus, reqSource]);

  const filteredPotentials = useMemo(() => {
    if (!data?.potentials) return [];
    return data.potentials.filter(p => {
      if (potSearch && !`${p.employee_name} ${p.department}`.toLowerCase().includes(potSearch.toLowerCase())) return false;
      if (potClaimStatus && p.claim_status !== potClaimStatus) return false;
      return true;
    });
  }, [data?.potentials, potSearch, potClaimStatus]);

  // --- Column definitions ---
  const assignmentColumns = [
    { label: 'Çalışan', key: 'employee_name' },
    { label: 'Departman', key: 'department' },
    { label: 'Tarih', render: (r) => formatDate(r.date) },
    { label: 'Max Saat', render: (r) => `${r.max_hours} sa` },
    { label: 'Görev', render: (r) => (
      <span className="max-w-[200px] truncate block text-gray-600" title={r.task_description}>
        {r.task_description || '—'}
      </span>
    )},
    { label: 'Atayan', key: 'assigned_by' },
    { label: 'Durum', render: (r) => <StatusBadge status={r.status} /> },
    { label: 'Talep', render: (r) => r.has_claim
      ? <span className="text-green-600 font-medium text-xs">✓ Var</span>
      : <span className="text-gray-400 text-xs">✗ Yok</span>
    },
  ];

  const requestColumns = [
    { label: 'Çalışan', key: 'employee_name' },
    { label: 'Departman', key: 'department' },
    { label: 'Tarih', render: (r) => formatDate(r.date) },
    { label: 'Saat', render: (r) => `${r.start_time} - ${r.end_time}` },
    { label: 'Süre', render: (r) => formatHours(r.hours) },
    { label: 'Kaynak', render: (r) => <SourceBadge source={r.source} /> },
    { label: 'Durum', render: (r) => <StatusBadge status={r.status} /> },
    { label: 'Onaylayan', render: (r) => r.approval_manager || r.target_approver || '—' },
  ];

  const potentialColumns = [
    { label: 'Çalışan', key: 'employee_name' },
    { label: 'Departman', key: 'department' },
    { label: 'Tarih', render: (r) => formatDate(r.date) },
    { label: 'Saat', render: (r) => `${r.start_time} - ${r.end_time}` },
    { label: 'Süre', render: (r) => formatHours(r.hours) },
    { label: 'OT Tipi', render: (r) => (
      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
        {OT_TYPE_LABELS[r.ot_type] || r.ot_type}
      </span>
    )},
    { label: 'Durum', render: (r) => <ClaimStatusBadge claimStatus={r.claim_status} blockReason={r.block_reason} /> },
  ];

  // --- Fix Actions State ---
  const [fixStates, setFixStates] = useState({
    orphan: { loading: false, result: null, executing: false },
    duplicate: { loading: false, result: null, executing: false },
    short: { loading: false, result: null, executing: false },
    nullApprover: { loading: false, result: null, executing: false },
  });

  const updateFixState = (key, patch) => setFixStates(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const runFixAction = useCallback(async (key, endpoint, dryRun = true) => {
    const stateKey = dryRun ? 'loading' : 'executing';
    updateFixState(key, { [stateKey]: true });
    try {
      const res = await api.post(`/system/health-check/ot-analysis/${endpoint}/`, { dry_run: dryRun });
      updateFixState(key, { [stateKey]: false, result: res.data });
      if (!dryRun) fetchData(); // refresh after real fix
    } catch (err) {
      updateFixState(key, { [stateKey]: false, result: { error: err.response?.data?.detail || err.message } });
    }
  }, [fetchData]);

  // --- TXT Rapor İndir ---
  const downloadReport = useCallback(() => {
    if (!data) return;
    const s = data.summary || {};
    const pad = (str, len) => (str + ' '.repeat(len)).slice(0, len);
    const line = (char = '─', len = 80) => char.repeat(len);
    const now = new Date().toLocaleString('tr-TR');

    let txt = '';
    txt += `${'═'.repeat(80)}\n`;
    txt += `  EK MESAİ ANALİZ RAPORU\n`;
    txt += `  Dönem: ${s.period_label || '—'}   |   Oluşturma: ${now}\n`;
    txt += `${'═'.repeat(80)}\n\n`;

    // Özet
    txt += `── ÖZET ${'─'.repeat(72)}\n\n`;
    txt += `  Potansiyel Mesai    : ${s.total_potential || 0} kayıt  (${formatHours(s.total_potential_hours)})\n`;
    txt += `  Talep Edilen        : ${s.total_requested || 0} kayıt  (${formatHours(s.total_requested_hours)})\n`;
    txt += `  Yönetici Atamaları  : ${s.total_assignments || 0} kayıt\n`;
    txt += `  Talepsiz Potansiyel : ${s.unclaimed_potential || 0} kayıt  (${formatHours(s.unclaimed_potential_hours)})\n`;
    txt += `  Bloklanmış          : ${s.blocked_potential || 0} kayıt  (${formatHours(s.blocked_potential_hours)})\n\n`;

    if (s.requests_by_status && Object.keys(s.requests_by_status).length) {
      txt += `  Talep Durumları     : ${Object.entries(s.requests_by_status).map(([k, v]) => `${STATUS_LABELS[k] || k}: ${v}`).join(', ')}\n`;
    }
    if (s.requests_by_source && Object.keys(s.requests_by_source).length) {
      txt += `  Talep Kaynakları    : ${Object.entries(s.requests_by_source).map(([k, v]) => `${SOURCE_LABELS[k] || k}: ${v}`).join(', ')}\n`;
    }
    if (s.assignments_by_status && Object.keys(s.assignments_by_status).length) {
      txt += `  Atama Durumları     : ${Object.entries(s.assignments_by_status).map(([k, v]) => `${STATUS_LABELS[k] || k}: ${v}`).join(', ')}\n`;
    }
    txt += '\n';

    // Tablo 1: Atamalar
    if (data.assignments?.length) {
      txt += `── YÖNETİCİ ATAMALARI (${data.assignments.length}) ${'─'.repeat(50)}\n\n`;
      txt += `  ${pad('Çalışan', 22)} ${pad('Departman', 16)} ${pad('Tarih', 10)} ${pad('Max', 6)} ${pad('Durum', 14)} ${pad('Talep', 8)} Atayan\n`;
      txt += `  ${line('─', 22)} ${line('─', 16)} ${line('─', 10)} ${line('─', 6)} ${line('─', 14)} ${line('─', 8)} ${line('─', 20)}\n`;
      for (const a of data.assignments) {
        txt += `  ${pad(a.employee_name || '—', 22)} ${pad(a.department || '—', 16)} ${pad(formatDate(a.date), 10)} ${pad(a.max_hours + 'sa', 6)} ${pad(STATUS_LABELS[a.status] || a.status, 14)} ${pad(a.has_claim ? '✓ Var' : '✗ Yok', 8)} ${a.assigned_by || '—'}\n`;
      }
      txt += '\n';
    }

    // Tablo 2: Talepler
    if (data.requests?.length) {
      txt += `── EK MESAİ TALEPLERİ (${data.requests.length}) ${'─'.repeat(50)}\n\n`;
      txt += `  ${pad('Çalışan', 22)} ${pad('Departman', 16)} ${pad('Tarih', 10)} ${pad('Saat', 14)} ${pad('Süre', 10)} ${pad('Kaynak', 12)} ${pad('Durum', 14)} Onaylayan\n`;
      txt += `  ${line('─', 22)} ${line('─', 16)} ${line('─', 10)} ${line('─', 14)} ${line('─', 10)} ${line('─', 12)} ${line('─', 14)} ${line('─', 20)}\n`;
      for (const r of data.requests) {
        txt += `  ${pad(r.employee_name || '—', 22)} ${pad(r.department || '—', 16)} ${pad(formatDate(r.date), 10)} ${pad(`${r.start_time}-${r.end_time}`, 14)} ${pad(formatHours(r.hours), 10)} ${pad(SOURCE_LABELS[r.source] || r.source, 12)} ${pad(STATUS_LABELS[r.status] || r.status, 14)} ${r.approval_manager || r.target_approver || '—'}\n`;
      }
      txt += '\n';
    }

    // Tablo 3: Potansiyeller
    if (data.potentials?.length) {
      txt += `── POTANSİYEL MESAİLER (${data.potentials.length}) ${'─'.repeat(50)}\n\n`;
      txt += `  ${pad('Çalışan', 22)} ${pad('Departman', 16)} ${pad('Tarih', 10)} ${pad('Saat', 14)} ${pad('Süre', 10)} ${pad('OT Tipi', 16)} ${pad('Durum', 18)} Bloklanma Sebebi\n`;
      txt += `  ${line('─', 22)} ${line('─', 16)} ${line('─', 10)} ${line('─', 14)} ${line('─', 10)} ${line('─', 16)} ${line('─', 18)} ${line('─', 30)}\n`;
      for (const p of data.potentials) {
        const claimLabel = CLAIM_STATUS_CONFIG[p.claim_status]?.label || p.claim_status;
        txt += `  ${pad(p.employee_name || '—', 22)} ${pad(p.department || '—', 16)} ${pad(formatDate(p.date), 10)} ${pad(`${p.start_time}-${p.end_time}`, 14)} ${pad(formatHours(p.hours), 10)} ${pad(OT_TYPE_LABELS[p.ot_type] || p.ot_type || '—', 16)} ${pad(claimLabel, 18)} ${p.block_reason || '—'}\n`;
      }
      txt += '\n';
    }

    txt += `${'═'.repeat(80)}\n`;
    txt += `  Rapor sonu — ${now}\n`;
    txt += `${'═'.repeat(80)}\n`;

    // Download
    const blob = new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `ek-mesai-analiz-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  // --- Render ---
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-500 mr-3" />
        <span className="text-gray-500">Ek mesai verileri yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <ExclamationTriangleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-red-600 hover:text-red-800 underline">
          Tekrar Dene
        </button>
      </div>
    );
  }

  const s = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Ek Mesai Analizi</h2>
          <p className="text-sm text-gray-500">{s.period_label || 'Mevcut mali ay'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadReport}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Raporu İndir
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          title="Potansiyel"
          count={s.total_potential || 0}
          hours={s.total_potential_hours}
          icon={BoltIcon}
          colorClasses="bg-blue-50 border-blue-200 text-blue-900"
        />
        <SummaryCard
          title="Talep Edilen"
          count={s.total_requested || 0}
          hours={s.total_requested_hours}
          icon={ClockIcon}
          colorClasses="bg-green-50 border-green-200 text-green-900"
          subtitle={s.requests_by_status
            ? Object.entries(s.requests_by_status).map(([k, v]) => `${STATUS_LABELS[k] || k}: ${v}`).join(' · ')
            : ''
          }
        />
        <SummaryCard
          title="Atamalar"
          count={s.total_assignments || 0}
          icon={UserGroupIcon}
          colorClasses="bg-purple-50 border-purple-200 text-purple-900"
          subtitle={s.assignments_by_status
            ? Object.entries(s.assignments_by_status).map(([k, v]) => `${STATUS_LABELS[k] || k}: ${v}`).join(' · ')
            : ''
          }
        />
        <SummaryCard
          title="Talepsiz Potansiyel"
          count={s.unclaimed_potential || 0}
          hours={s.unclaimed_potential_hours}
          icon={ExclamationTriangleIcon}
          colorClasses="bg-amber-50 border-amber-200 text-amber-900"
        />
        <SummaryCard
          title="Bloklanmış"
          count={s.blocked_potential || 0}
          hours={s.blocked_potential_hours}
          icon={NoSymbolIcon}
          colorClasses="bg-red-50 border-red-200 text-red-900"
        />
      </div>

      {/* Fix Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <WrenchScrewdriverIcon className="w-4 h-4" />
          Veri Düzeltme Aksiyonları
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <FixActionCard
            title="Yetim CLAIMED Atamalar"
            description="Talep iptal/red edilmiş ama atama hâlâ CLAIMED durumda. ASSIGNED'a sıfırlanır."
            icon={ExclamationTriangleIcon}
            colorClasses="bg-amber-50 border-amber-200 text-amber-900"
            state={fixStates.orphan}
            onScan={() => runFixAction('orphan', 'fix-orphan-assignments', true)}
            onFix={() => runFixAction('orphan', 'fix-orphan-assignments', false)}
          />
          <FixActionCard
            title="Çoklu İPTAL Temizliği"
            description="Aynı çalışan/tarih/saat için birden fazla CANCELLED kayıt. En eski korunur, geri kalan silinir."
            icon={TrashIcon}
            colorClasses="bg-gray-50 border-gray-200 text-gray-800"
            state={fixStates.duplicate}
            onScan={() => runFixAction('duplicate', 'fix-duplicate-cancelled', true)}
            onFix={() => runFixAction('duplicate', 'fix-duplicate-cancelled', false)}
          />
          <FixActionCard
            title="Kısa Potansiyel Temizliği"
            description="Minimum eşik (30dk) altındaki POTENTIAL kayıtlar. Bu kayıtlar zaten talep edilemez, temizlenir."
            icon={ClockIcon}
            colorClasses="bg-blue-50 border-blue-200 text-blue-800"
            state={fixStates.short}
            onScan={() => runFixAction('short', 'fix-short-potentials', true)}
            onFix={() => runFixAction('short', 'fix-short-potentials', false)}
          />
          <FixActionCard
            title="NULL Onaylayıcı Düzelt"
            description="PENDING talepler onaylayıcısız. ApproverService ile atanır veya POTENTIAL'e geri döndürülür."
            icon={ShieldExclamationIcon}
            colorClasses="bg-red-50 border-red-200 text-red-800"
            state={fixStates.nullApprover}
            onScan={() => runFixAction('nullApprover', 'fix-null-approvers', true)}
            onFix={() => runFixAction('nullApprover', 'fix-null-approvers', false)}
          />
        </div>
      </div>

      {/* Table 1: Assignments */}
      <DataTable
        title="Yönetici Ek Mesai Atamaları"
        count={filteredAssignments.length}
        columns={assignmentColumns}
        data={filteredAssignments}
        defaultExpanded={true}
        filterBar={
          <FilterRow
            search={assignSearch}
            setSearch={setAssignSearch}
            filters={[{
              value: assignStatus,
              onChange: setAssignStatus,
              placeholder: 'Tüm Durumlar',
              options: [
                { value: 'ASSIGNED', label: 'Atandı' },
                { value: 'CLAIMED', label: 'Talep Edildi' },
                { value: 'EXPIRED', label: 'Süresi Doldu' },
                { value: 'CANCELLED', label: 'İptal' },
              ],
            }]}
          />
        }
      />

      {/* Table 2: Requests */}
      <DataTable
        title="Ek Mesai Talepleri"
        count={filteredRequests.length}
        columns={requestColumns}
        data={filteredRequests}
        defaultExpanded={true}
        filterBar={
          <FilterRow
            search={reqSearch}
            setSearch={setReqSearch}
            filters={[
              {
                value: reqStatus,
                onChange: setReqStatus,
                placeholder: 'Tüm Durumlar',
                options: [
                  { value: 'PENDING', label: 'Beklemede' },
                  { value: 'APPROVED', label: 'Onaylı' },
                  { value: 'REJECTED', label: 'Reddedildi' },
                  { value: 'CANCELLED', label: 'İptal' },
                ],
              },
              {
                value: reqSource,
                onChange: setReqSource,
                placeholder: 'Tüm Kaynaklar',
                options: [
                  { value: 'INTENDED', label: 'Planlı' },
                  { value: 'POTENTIAL', label: 'Algılanan' },
                  { value: 'MANUAL', label: 'Manuel' },
                ],
              },
            ]}
          />
        }
      />

      {/* Table 3: Potentials */}
      <DataTable
        title="Potansiyel Mesailer — Talep Edilmemiş"
        count={filteredPotentials.length}
        columns={potentialColumns}
        data={filteredPotentials}
        defaultExpanded={true}
        filterBar={
          <FilterRow
            search={potSearch}
            setSearch={setPotSearch}
            filters={[{
              value: potClaimStatus,
              onChange: setPotClaimStatus,
              placeholder: 'Tüm Durumlar',
              options: [
                { value: 'CLAIMABLE', label: 'Talep Edilebilir' },
                { value: 'CLAIMED', label: 'Talep Edildi' },
                { value: 'BLOCKED', label: 'Bloklanmış' },
                { value: 'EXPIRED', label: 'Süresi Geçmiş' },
              ],
            }]}
          />
        }
      />
    </div>
  );
}
