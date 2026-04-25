import React, { useState, useMemo } from 'react';
import {
    LockClosedIcon,
    ArrowDownTrayIcon,
    PlayIcon,
    ArrowPathIcon,
    XCircleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    UsersIcon,
    KeyIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

// ─── Bypass Path Helpers ───────────────────────────────────────────────────────

const BYPASS_LABELS = {
    SUPERUSER: { label: 'Superuser', color: 'bg-rose-50 border-rose-200 text-rose-800', dot: 'bg-rose-500' },
    SYSTEM_ADMIN_ROLE: { label: 'SYSTEM_ADMIN Rolü', color: 'bg-indigo-50 border-indigo-200 text-indigo-800', dot: 'bg-indigo-500' },
    SYSTEM_FULL_ACCESS: { label: 'SYSTEM_FULL_ACCESS', color: 'bg-purple-50 border-purple-200 text-purple-800', dot: 'bg-purple-500' },
    NORMAL: { label: 'Normal', color: 'bg-gray-50 border-gray-200 text-gray-700', dot: 'bg-gray-400' },
};

function BypassBadge({ path }) {
    const meta = BYPASS_LABELS[path] || BYPASS_LABELS.NORMAL;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
        </span>
    );
}

// ─── TXT Generator ─────────────────────────────────────────────────────────────

function pad(s, n) {
    s = String(s ?? '');
    return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

// Matrix sütun başlıkları — uzun rol key'leri çakışmadan gösterilebilsin diye
// kısaltma sözlüğü. Bilinmeyen rol için ilk 7 karakter fallback.
const ROLE_ABBREV = {
    SYSTEM_ADMIN:      'SYS_ADM',
    PROJECT_MANAGER:   'PRJ_MGR',
    ACC_MANAGER:       'ACC_MGR',
    ACC_STAFF:         'ACC_STF',
    GROUP_CHIEF:       'GRP_CHF',
    SENIOR_ENGINEER:   'SR_ENG',
    ENGINEER:          'ENG',
    SENIOR_TECHNICIAN: 'SR_TEC',
    TECHNICIAN:        'TEC',
    EMPLOYEE:          'EMP',
};

function abbrevRoleKey(key) {
    return ROLE_ABBREV[key] || key.slice(0, 7);
}

function buildTxtReport(data) {
    const { summary, permissions, roles, permission_matrix, employees, generated_at } = data;

    const lines = [];
    const sep = '═'.repeat(80);
    const sub = '─'.repeat(80);
    const ts = new Date(generated_at).toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'medium',
    });

    // Header
    lines.push(sep);
    lines.push('  MEGA PORTAL — YETKİ SİSTEMİ TAM ANALİZİ');
    lines.push(`  ${ts} (İstanbul)  |  ${summary.total_employees} çalışan, ${summary.total_permissions} yetki, ${summary.total_roles} rol`);
    lines.push(sep);
    lines.push('');

    // [1] Özet
    lines.push('[1] ÖZET');
    lines.push(`    Toplam Çalışan         : ${summary.total_employees}`);
    lines.push(`    Toplam Yetki           : ${summary.total_permissions}`);
    lines.push(`    Toplam Rol             : ${summary.total_roles}`);
    lines.push(`    Superuser              : ${summary.superusers}`);
    lines.push(`    Admin (effective)      : ${summary.admins}`);
    lines.push(`    Direct Permission'lı   : ${summary.with_direct_perms}`);
    lines.push(`    Exclusion'lı           : ${summary.with_excluded_perms}`);
    lines.push('');
    lines.push('    Bypass Dağılımı:');
    Object.entries(summary.by_bypass_path || {}).forEach(([path, count]) => {
        lines.push(`      ${pad(path, 22)}: ${count}`);
    });
    lines.push('');

    // [2] Yetkiler — kategorilere göre grupla
    lines.push(`[2] YETKİLER (${permissions.length})`);
    const byCategory = {};
    permissions.forEach((p) => {
        if (!byCategory[p.category]) byCategory[p.category] = [];
        byCategory[p.category].push(p);
    });
    Object.keys(byCategory).sort().forEach((cat) => {
        lines.push(`    ${cat}/`);
        byCategory[cat].forEach((p) => {
            lines.push(`      ${pad(p.code, 28)} — ${p.role_count} rolde, ${p.employee_count} çalışanda effective`);
        });
    });
    lines.push('');

    // [3] Roller
    lines.push(`[3] ROLLER (${roles.length})`);
    roles.forEach((r) => {
        const allFlag = r.perm_count >= permissions.length ? ' (TÜM YETKİLER)' : '';
        lines.push(`    ${pad(r.key, 22)} — ${r.name}  (${r.perm_count} yetki)${allFlag}  [${r.employee_count} çalışan]`);
        if (r.perm_count < permissions.length) {
            r.perm_codes.forEach((c) => lines.push(`      ✓ ${c}`));
        }
    });
    lines.push('');

    // [4] Yetki Matrisi
    lines.push('[4] YETKİ MATRİSİ');
    const roleKeys = roles.map((r) => r.key);
    const colWidth = 9;  // 8 char görünür + 1 padding (kısaltmalar 7 chare kadar)
    const headerRow = pad('Permission', 30) + ' | '
        + roleKeys.map((k) => pad(abbrevRoleKey(k), colWidth - 1)).join(' | ');
    lines.push('    ' + headerRow);
    lines.push('    ' + '-'.repeat(headerRow.length));
    permissions.forEach((p) => {
        const row = pad(p.code, 30) + ' | '
            + roleKeys.map((k) => {
                const has = permission_matrix[k]?.[p.code];
                return pad(has ? '   ✓   ' : '   −   ', colWidth - 1);
            }).join(' | ');
        lines.push('    ' + row);
    });
    lines.push('');
    // Sütun başlığı kısaltmalarının açılımı
    lines.push('    Sütun Açıklamaları:');
    roleKeys.forEach((k) => {
        lines.push(`      ${pad(abbrevRoleKey(k), 9)} = ${k}`);
    });
    lines.push('');

    // [5] Çalışanlar
    lines.push(`[5] ÇALIŞANLAR (${employees.length})`);
    lines.push('');
    employees.forEach((emp, idx) => {
        const num = String(idx + 1).padStart(3, '0');
        const allPermsFlag = emp.effective_count >= permissions.length;
        let bypassLine = `Bypass : ${BYPASS_LABELS[emp.bypass_path]?.label || emp.bypass_path}`;
        if (emp.bypass_path === 'SUPERUSER') bypassLine = 'Bypass : ★ SUPERUSER (Django)';
        else if (emp.bypass_path === 'SYSTEM_ADMIN_ROLE') bypassLine = 'Bypass : ★ SYSTEM_ADMIN rolü';
        else if (emp.bypass_path === 'SYSTEM_FULL_ACCESS') bypassLine = 'Bypass : ★ SYSTEM_FULL_ACCESS yetkisi';

        lines.push(`#${num} — ${emp.name} (${emp.code || '-'})`);
        lines.push(`       Bölüm  : ${emp.department || '-'} | Pozisyon: ${emp.position || '-'}`);
        lines.push(`       ${bypassLine}`);
        lines.push(`       Roller : ${emp.roles.length ? emp.roles.join(', ') : '—'}`);
        lines.push(`       Direct : ${emp.direct_permissions.length ? emp.direct_permissions.join(', ') : '—'}`);
        lines.push(`       Hariç  : ${emp.excluded_permissions.length ? emp.excluded_permissions.join(', ') : '—'}`);
        if (allPermsFlag) {
            lines.push(`       Effective (${emp.effective_count}/${permissions.length}) — TÜM YETKİLER`);
        } else {
            lines.push(`       Effective (${emp.effective_count}):`);
        }
        emp.effective_permissions.forEach((ep) => {
            lines.push(`         · ${pad(ep.code, 28)} [${ep.source}]`);
        });
        emp.excluded_details.forEach((ex) => {
            lines.push(`         × ${pad(ex.code, 28)} [HARIÇ TUTULDU — ${ex.would_have_been}]`);
        });
        lines.push('');
    });

    // Footer
    lines.push(sub);
    lines.push('                              RAPOR SONU');
    lines.push(sep);

    return lines.join('\n');
}

function downloadTxt(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Permission Matrix Component ───────────────────────────────────────────────

function MatrixSection({ permissions, roles, permission_matrix }) {
    const [filter, setFilter] = useState('');
    const filteredPerms = useMemo(() => {
        if (!filter) return permissions;
        const q = filter.toLowerCase();
        return permissions.filter((p) =>
            p.code.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
        );
    }, [permissions, filter]);

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <KeyIcon className="w-5 h-5 text-indigo-500" />
                    Yetki Matrisi ({roles.length} rol × {permissions.length} yetki)
                </h3>
                <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Yetki kodu ara..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                </div>
            </div>
            <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-lg">
                <table className="text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left font-bold text-gray-700 sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[220px]">
                                Permission
                            </th>
                            {roles.map((r) => (
                                <th
                                    key={r.key}
                                    className="px-2 py-2 text-center font-bold text-gray-700 whitespace-nowrap"
                                    title={`${r.name} — ${r.perm_count} yetki, ${r.employee_count} çalışan`}
                                >
                                    {r.key.length > 10 ? r.key.slice(0, 9) + '…' : r.key}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredPerms.map((p) => (
                            <tr key={p.code} className="hover:bg-indigo-50/30">
                                <td className="px-3 py-1.5 font-mono text-[11px] font-bold text-indigo-700 sticky left-0 bg-white border-r border-gray-100 whitespace-nowrap">
                                    <span className="text-gray-400 mr-1.5">[{p.category}]</span>{p.code}
                                </td>
                                {roles.map((r) => {
                                    const has = permission_matrix[r.key]?.[p.code];
                                    return (
                                        <td key={r.key} className="px-2 py-1.5 text-center">
                                            {has
                                                ? <span className="text-green-600 font-bold">✓</span>
                                                : <span className="text-gray-300">−</span>}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Sort Header (modül scope'unda — render içinde oluşturma yasak) ───────────

function SortHeader({ k, children, className, sortKey, sortDir, onToggle }) {
    return (
        <th
            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 select-none ${className || ''}`}
            onClick={() => onToggle(k)}
        >
            <span className="flex items-center gap-1">
                {children}
                {sortKey === k && <span className="text-indigo-500 text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
            </span>
        </th>
    );
}

// ─── Employee Table Component ──────────────────────────────────────────────────

function EmployeeRow({ emp, allPermissionsCount }) {
    const [expanded, setExpanded] = useState(false);
    const allPerms = emp.effective_count >= allPermissionsCount;

    return (
        <>
            <tr
                className={`cursor-pointer transition-colors ${expanded ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}`}
                onClick={() => setExpanded(!expanded)}
            >
                <td className="px-3 py-2 w-8">
                    {expanded ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{emp.code || '-'}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{emp.name}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{emp.department || '-'}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{emp.position || '-'}</td>
                <td className="px-3 py-2 text-center">
                    <BypassBadge path={emp.bypass_path} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-700">{emp.roles.length ? emp.roles.join(', ') : <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-center">
                    <span className={`font-mono text-xs font-bold ${allPerms ? 'text-rose-600' : 'text-gray-700'}`}>
                        {emp.effective_count}/{allPermissionsCount}
                    </span>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={8} className="bg-indigo-50/20 px-6 py-4 border-l-4 border-indigo-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                                <div className="font-bold text-gray-700 mb-1.5">Roller ({emp.roles.length})</div>
                                {emp.roles.length === 0
                                    ? <div className="text-gray-400 italic">— Rol atanmamış</div>
                                    : <div className="flex flex-wrap gap-1">
                                        {emp.roles.map((r) => (
                                            <span key={r} className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono text-[11px] font-bold border border-indigo-200">{r}</span>
                                        ))}
                                    </div>}
                            </div>
                            <div>
                                <div className="font-bold text-gray-700 mb-1.5">Doğrudan Yetkiler ({emp.direct_permissions.length})</div>
                                {emp.direct_permissions.length === 0
                                    ? <div className="text-gray-400 italic">— Doğrudan atanmış yetki yok</div>
                                    : <div className="flex flex-wrap gap-1">
                                        {emp.direct_permissions.map((c) => (
                                            <span key={c} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono text-[11px] border border-emerald-200">{c}</span>
                                        ))}
                                    </div>}
                            </div>
                            {emp.excluded_permissions.length > 0 && (
                                <div className="md:col-span-2">
                                    <div className="font-bold text-rose-700 mb-1.5">Hariç Tutulan ({emp.excluded_permissions.length})</div>
                                    <div className="flex flex-wrap gap-1">
                                        {emp.excluded_details.map((ex) => (
                                            <span key={ex.code} className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono text-[11px] border border-rose-200" title={`Olurdu: ${ex.would_have_been}`}>
                                                ✗ {ex.code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <div className="font-bold text-gray-700 mb-1.5">
                                    Effective Yetkiler ({emp.effective_count}/{allPermissionsCount})
                                    {allPerms && <span className="ml-2 text-rose-600 font-bold">— TÜM YETKİLER</span>}
                                </div>
                                <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                                    <table className="w-full text-[11px]">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Yetki Kodu</th>
                                                <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Kaynak</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {emp.effective_permissions.map((ep) => (
                                                <tr key={ep.code} className="hover:bg-gray-50">
                                                    <td className="px-3 py-1 font-mono text-indigo-700 font-bold">{ep.code}</td>
                                                    <td className="px-3 py-1 font-mono text-gray-500">{ep.source}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

function EmployeeSection({ employees, totalPerms }) {
    const [search, setSearch] = useState('');
    const [bypassFilter, setBypassFilter] = useState('ALL');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const filtered = useMemo(() => {
        let out = employees;
        if (bypassFilter !== 'ALL') out = out.filter((e) => e.bypass_path === bypassFilter);
        if (search) {
            const q = search.toLowerCase();
            out = out.filter((e) =>
                [e.name, e.code, e.department, e.position, ...(e.roles || [])]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(q))
            );
        }
        const sorted = [...out].sort((a, b) => {
            let av, bv;
            if (sortKey === 'name') { av = a.name; bv = b.name; }
            else if (sortKey === 'department') { av = a.department || ''; bv = b.department || ''; }
            else if (sortKey === 'effective') { av = a.effective_count; bv = b.effective_count; }
            else if (sortKey === 'roles') { av = a.roles.length; bv = b.roles.length; }
            else { av = a.code || ''; bv = b.code || ''; }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [employees, search, bypassFilter, sortKey, sortDir]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-indigo-500" />
                    Çalışanlar ({filtered.length}{filtered.length !== employees.length ? ` / ${employees.length}` : ''})
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={bypassFilter}
                        onChange={(e) => setBypassFilter(e.target.value)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    >
                        <option value="ALL">Tüm bypass tipleri</option>
                        <option value="SUPERUSER">Superuser</option>
                        <option value="SYSTEM_ADMIN_ROLE">SYSTEM_ADMIN Rolü</option>
                        <option value="SYSTEM_FULL_ACCESS">SYSTEM_FULL_ACCESS</option>
                        <option value="NORMAL">Normal</option>
                    </select>
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Ad, kod, departman, rol ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                    </div>
                </div>
            </div>
            <div className="overflow-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                        <tr>
                            <th className="w-8"></th>
                            <SortHeader k="code" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Kod</SortHeader>
                            <SortHeader k="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Ad Soyad</SortHeader>
                            <SortHeader k="department" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Bölüm</SortHeader>
                            <th className="px-3 py-2 text-left">Pozisyon</th>
                            <th className="px-3 py-2 text-center">Bypass</th>
                            <SortHeader k="roles" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Roller</SortHeader>
                            <SortHeader k="effective" className="text-center" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Yetki</SortHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-xs">Eşleşen çalışan yok.</td></tr>
                        ) : filtered.map((emp) => (
                            <EmployeeRow key={emp.id} emp={emp} allPermissionsCount={totalPerms} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Bypass Hierarchy Component ────────────────────────────────────────────────

function BypassSection({ employees, summary }) {
    const buckets = {
        SUPERUSER: employees.filter((e) => e.bypass_path === 'SUPERUSER'),
        SYSTEM_ADMIN_ROLE: employees.filter((e) => e.bypass_path === 'SYSTEM_ADMIN_ROLE'),
        SYSTEM_FULL_ACCESS: employees.filter((e) => e.bypass_path === 'SYSTEM_FULL_ACCESS'),
        NORMAL: employees.filter((e) => e.bypass_path === 'NORMAL'),
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
                Bypass Hiyerarşisi
            </h3>
            <p className="text-xs text-gray-500 mb-4">
                Çalışanların yetki bypass yoluna göre dağılımı.
                <code className="bg-gray-100 px-1 mx-1 rounded">SUPERUSER &gt; SYSTEM_ADMIN_ROLE &gt; SYSTEM_FULL_ACCESS &gt; NORMAL</code>
                sırasıyla, ilk eşleşen kazanır.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['SUPERUSER', 'SYSTEM_ADMIN_ROLE', 'SYSTEM_FULL_ACCESS', 'NORMAL'].map((path) => {
                    const list = buckets[path];
                    const meta = BYPASS_LABELS[path];
                    return (
                        <div key={path} className={`border-2 rounded-xl p-4 ${meta.color}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                                    <h4 className="text-sm font-bold">{meta.label}</h4>
                                </div>
                                <span className="text-2xl font-bold">{summary.by_bypass_path?.[path] ?? 0}</span>
                            </div>
                            <div className="text-[11px] opacity-90 max-h-40 overflow-y-auto space-y-0.5 pr-1">
                                {list.length === 0
                                    ? <div className="italic opacity-60">— Bu kategoride çalışan yok</div>
                                    : list.map((e) => (
                                        <div key={e.id} className="flex justify-between gap-2">
                                            <span className="truncate">{e.name}</span>
                                            <span className="font-mono opacity-70 flex-shrink-0">{e.code || '-'}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Roles Table Component ─────────────────────────────────────────────────────

function RolesSection({ roles, totalPerms }) {
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                <UserGroupIcon className="w-5 h-5 text-indigo-500" />
                Roller ({roles.length})
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                        <tr>
                            <th className="px-3 py-2 text-left">Anahtar</th>
                            <th className="px-3 py-2 text-left">Ad</th>
                            <th className="px-3 py-2 text-center">Yetki</th>
                            <th className="px-3 py-2 text-center">Çalışan</th>
                            <th className="px-3 py-2 text-left">İçerdiği Yetkiler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.map((r) => {
                            const allPerms = r.perm_count >= totalPerms;
                            return (
                                <tr key={r.key} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-mono text-xs font-bold text-indigo-700 align-top">{r.key}</td>
                                    <td className="px-3 py-2 text-gray-800 align-top">{r.name}</td>
                                    <td className="px-3 py-2 text-center align-top">
                                        <span className={`font-mono text-xs font-bold ${allPerms ? 'text-rose-600' : 'text-gray-700'}`}>
                                            {r.perm_count}/{totalPerms}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center text-gray-700 align-top">{r.employee_count}</td>
                                    <td className="px-3 py-2 align-top">
                                        {allPerms
                                            ? <span className="text-rose-600 font-bold text-xs">★ TÜM YETKİLER</span>
                                            : <div className="flex flex-wrap gap-1">
                                                {r.perm_codes.map((c) => (
                                                    <span key={c} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-[10px] border border-indigo-100">{c}</span>
                                                ))}
                                            </div>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PermissionAnalysisTab() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/system/health-check/permission-analysis/');
            setData(res.data);
        } catch (err) {
            setError('Analiz başlatılamadı: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!data) return;
        const ts = new Date(data.generated_at).toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `yetki-sistemi-analizi-${ts}.txt`;
        downloadTxt(buildTxtReport(data), filename);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <LockClosedIcon className="w-7 h-7 text-indigo-600" />
                            Yetki Sistemi Tam Analizi
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Tüm rol-yetki matrisi · Her çalışanın effective yetkileri · Bypass hiyerarşisi · TXT export
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={runAnalysis}
                            disabled={loading}
                            className={`px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2
                                ${loading
                                    ? 'bg-gray-100 text-gray-400 cursor-wait border border-gray-200'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95'}
                            `}
                        >
                            {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayIcon className="w-5 h-5" />}
                            {loading ? 'Çalışıyor...' : data ? 'Yenile' : 'Analizi Çalıştır'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!data || loading}
                            className={`px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2
                                ${!data || loading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md active:scale-95'}
                            `}
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            TXT İndir
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <XCircleIcon className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="mt-4 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                    <DocumentTextIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <strong>KVKK güvenli:</strong> Çıktı sadece personel kodu, ad-soyad, departman ve pozisyon içerir.
                        TC kimlik dahil edilmez. Sayfa <code className="bg-white px-1 rounded">SYSTEM_FULL_ACCESS</code> yetkisine açıktır.
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {data && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Özet</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <div className="text-3xl font-bold text-blue-700">{data.summary.total_employees}</div>
                            <div className="text-xs text-blue-600 font-medium mt-1">Toplam Çalışan</div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center">
                            <div className="text-3xl font-bold text-indigo-700">{data.summary.total_permissions}</div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">Toplam Yetki</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-center">
                            <div className="text-3xl font-bold text-purple-700">{data.summary.total_roles}</div>
                            <div className="text-xs text-purple-600 font-medium mt-1">Toplam Rol</div>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 text-center">
                            <div className="text-3xl font-bold text-rose-700">{data.summary.admins}</div>
                            <div className="text-xs text-rose-600 font-medium mt-1">Admin (effective)</div>
                        </div>
                        <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100 text-center">
                            <div className="text-2xl font-bold text-rose-700">{data.summary.superusers}</div>
                            <div className="text-xs text-rose-600 font-medium mt-1">Superuser</div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
                            <div className="text-2xl font-bold text-emerald-700">{data.summary.with_direct_perms}</div>
                            <div className="text-xs text-emerald-600 font-medium mt-1">Doğrudan Yetki'li</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-center">
                            <div className="text-2xl font-bold text-amber-700">{data.summary.with_excluded_perms}</div>
                            <div className="text-xs text-amber-600 font-medium mt-1">Hariç Tutmalı</div>
                        </div>
                        <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 text-center">
                            <div className="text-xs text-gray-500 font-medium">Oluşturma</div>
                            <div className="text-[11px] text-gray-700 font-mono mt-1">
                                {new Date(data.generated_at).toLocaleString('tr-TR', {
                                    timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short'
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sections */}
            {data && <BypassSection employees={data.employees} summary={data.summary} />}
            {data && <RolesSection roles={data.roles} totalPerms={data.permissions.length} />}
            {data && (
                <MatrixSection
                    permissions={data.permissions}
                    roles={data.roles}
                    permission_matrix={data.permission_matrix}
                />
            )}
            {data && <EmployeeSection employees={data.employees} totalPerms={data.permissions.length} />}

            {/* Empty State */}
            {!data && !loading && (
                <div className="bg-white/80 backdrop-blur-sm p-12 rounded-xl shadow-lg border border-gray-200/50 text-center">
                    <LockClosedIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h4 className="text-gray-400 font-medium text-lg">Henüz analiz çalıştırılmadı</h4>
                    <p className="text-gray-300 text-sm mt-2">
                        "Analizi Çalıştır" ile tüm RBAC sisteminin tam dump'ını alabilir, "TXT İndir" ile dosya olarak kaydedebilirsiniz.
                    </p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-white/80 backdrop-blur-sm p-12 rounded-xl shadow-lg border border-gray-200/50 text-center">
                    <ArrowPathIcon className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-spin" />
                    <h4 className="text-gray-600 font-medium text-lg">Analiz çalışıyor...</h4>
                    <p className="text-gray-400 text-sm mt-2">
                        Tüm yetkiler, roller ve çalışanlar için effective permission'lar hesaplanıyor.
                    </p>
                </div>
            )}
        </div>
    );
}
