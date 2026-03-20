import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Table,
    Upload,
    Button,
    Modal,
    Tag,
    Alert,
    Badge,
    Checkbox,
    Tooltip,
    message,
    Card,
    Statistic,
    Space,
    Spin,
    Segmented,
    Collapse,
} from 'antd';
import {
    InboxOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    SyncOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    ToolOutlined,
    DeleteOutlined,
    ThunderboltOutlined,
    SafetyOutlined,
    ReloadOutlined,
    EditOutlined,
    DownloadOutlined,
    LoadingOutlined,
    CodeOutlined,
    RollbackOutlined,
} from '@ant-design/icons';
import api from '../../../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a date string (YYYY-MM-DD) to Turkish locale display */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    } catch {
        return dateStr;
    }
}

/** Format time string for display - handles both HH:MM:SS and ISO datetime */
function formatTime(timeStr) {
    if (!timeStr) return '-';
    // If ISO datetime, extract time part
    if (timeStr.includes('T')) {
        try {
            const d = new Date(timeStr);
            return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' });
        } catch {
            return timeStr;
        }
    }
    return timeStr;
}

/** Format seconds to human-readable Turkish duration */
function formatSeconds(s) {
    if (s === null || s === undefined) return '-';
    const abs = Math.abs(s);
    const sign = s < 0 ? '-' : '';
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const sec = Math.floor(abs % 60);
    if (h > 0) return `${sign}${h}sa ${m}dk ${sec}sn`;
    if (m > 0) return `${sign}${m}dk ${sec}sn`;
    return `${sign}${sec}sn`;
}

/** Format hours (decimal) to human-readable with seconds */
function formatHours(h) {
    if (h === null || h === undefined) return '-';
    const totalSec = Math.round(h * 3600);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) return `${hours}sa ${mins}dk ${secs}sn`;
    if (mins > 0) return `${mins}dk ${secs}sn`;
    return `${secs}sn`;
}

// ---------------------------------------------------------------------------
// Problem category config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG = {
    MATCH:             { label: 'Eşleşiyor',         color: 'green',   icon: '✓' },
    LEAVE_DAY:         { label: 'İzin Günü',          color: 'blue',    icon: '📋' },
    PARTIAL_LEAVE:     { label: 'Kısmi İzin',         color: 'geekblue', icon: '📝' },
    HEALTH_REPORT_DAY: { label: 'Sağlık Raporu',      color: 'cyan',    icon: '🏥' },
    TIME_DIFF:         { label: 'Saat Farkı',         color: 'orange',  icon: '⏱' },
    SESSION_MISMATCH:  { label: 'Oturum Uyumsuz',     color: 'red',     icon: '⚡' },
    NO_SYSTEM_RECORD:  { label: 'Sistemde Kayıt Yok', color: 'volcano', icon: '⚠' },
    ABSENT_IN_SYSTEM:  { label: 'Devamsız (ABSENT)',   color: 'purple',  icon: '👤' },
};

function getCategoryTag(cat) {
    const cfg = CATEGORY_CONFIG[cat];
    if (!cfg) return <Tag>{cat || '-'}</Tag>;
    return <Tag color={cfg.color}>{cfg.icon} {cfg.label}</Tag>;
}

/** Source label mapping */
const SOURCE_LABELS = {
    CARD: 'Kart',
    SPLIT: 'Bölünmüş',
    AUTO_SPLIT: 'Oto-Bölünmüş',
    DUTY: 'Görev/İzin',
    HEALTH_REPORT: 'Sağlık Raporu',
    HOSPITAL_VISIT: 'Hastane Ziyareti',
    MANUAL: 'Manuel',
    SYSTEM: 'Sistem',
};

/** Generate Turkish problem description for a record */
function getProblemDescription(record) {
    const cat = record.problem_category;
    if (cat === 'MATCH') return null;

    const lines = [];
    const sessions = record.sessions || [];
    const has2359 = sessions.some(s => s.sys_check_out === '23:59:59');
    const csvCount = record.csv_session_count || 0;
    const sysCount = record.sys_session_count || 0;
    const dutySessions = record.duty_sessions || [];

    if (cat === 'LEAVE_DAY') {
        lines.push('Bu gün onaylı izin günü — sistemde DUTY (görev/izin) kaydı mevcut.');
        lines.push(`CSV'de ${csvCount} kart okuyucu oturumu var ama izinli olduğu için CARD kaydı oluşturulmamış.`);
        if (dutySessions.length > 0) {
            const ds = dutySessions[0];
            lines.push(`İzin kaydı: ${ds.check_in || '-'} — ${ds.check_out || '-'} (${SOURCE_LABELS[ds.source] || ds.source})`);
        }
    } else if (cat === 'PARTIAL_LEAVE') {
        lines.push('Kısmi izin günü — hem CARD hem DUTY kaydı mevcut.');
        lines.push('Kart kayıtları izin saatleriyle çakışmamak için kırpılmış, bu nedenle saat farkı beklenen bir durumdur.');
        if (dutySessions.length > 0) {
            const ds = dutySessions[0];
            lines.push(`İzin kaydı: ${ds.check_in || '-'} — ${ds.check_out || '-'} (${SOURCE_LABELS[ds.source] || ds.source})`);
        }
    } else if (cat === 'HEALTH_REPORT_DAY') {
        lines.push('Sağlık raporu günü — sistemde sağlık raporu veya hastane ziyareti kaydı mevcut.');
        if (dutySessions.length > 0) {
            for (const ds of dutySessions) {
                lines.push(`${SOURCE_LABELS[ds.source] || ds.source}: ${ds.check_in || '-'} — ${ds.check_out || '-'}`);
            }
        }
    } else if (cat === 'ABSENT_IN_SYSTEM') {
        lines.push('Kart okuyucu verileri sisteme ulaşmamış — çalışan ABSENT (devamsız) olarak işaretlenmiş.');
        lines.push(`CSV'de ${csvCount} oturum mevcut ama sistemde hiçbir giriş/çıkış kaydı yok.`);
    } else if (cat === 'NO_SYSTEM_RECORD') {
        lines.push('Bu tarih için sistemde hiçbir mesai kaydı bulunamadı.');
        if (csvCount > 0) lines.push(`CSV'de ${csvCount} oturum mevcut.`);
    } else if (cat === 'TIME_DIFF') {
        if (has2359) {
            const lastCsv = sessions.filter(s => s.csv_check_out && s.sys_check_out === '23:59:59');
            const realOut = lastCsv.length > 0 ? lastCsv[0].csv_check_out : null;
            lines.push(`Son oturum gece yarısı kapama ile 23:59:59'a uzatılmış.`);
            if (realOut) lines.push(`Gerçek çıkış saati: ${realOut} (CSV'den).`);
        } else {
            lines.push('Giriş/çıkış saatleri CSV ile sistem arasında farklı.');
        }
        const diffH = Math.abs((record.csv_total_hours || 0) - (record.sys_total_hours || 0));
        if (diffH > 0.5) lines.push(`Toplam saat farkı: ${diffH.toFixed(1)} saat.`);
    } else if (cat === 'SESSION_MISMATCH') {
        lines.push(`Oturum sayısı uyuşmuyor: CSV'de ${csvCount}, sistemde ${sysCount} oturum.`);
        if (has2359) lines.push('Ek olarak, sistemde son çıkış 23:59:59 — gece yarısı kapama sorunu.');
        const onlyCsv = sessions.filter(s => s.only_in_csv).length;
        const onlySys = sessions.filter(s => s.only_in_system).length;
        if (onlyCsv > 0) lines.push(`${onlyCsv} oturum sadece CSV'de var (sistemde eksik).`);
        if (onlySys > 0) lines.push(`${onlySys} oturum sadece sistemde var (CSV'de eksik).`);
    }
    return lines;
}

/** Generate change preview for a record */
function getChangePreview(record) {
    const sessions = record.sessions || [];
    const csvSessions = sessions.filter(s => !s.only_in_system && (s.csv_check_in || s.csv_check_out));
    const sysCount = record.sys_session_count || 0;
    const otCount = record.overtime_request_count || 0;

    return {
        willDeleteSessions: sysCount,
        willCreateSessions: csvSessions.length,
        csvTotalHours: record.csv_total_hours || 0,
        sysTotalHours: record.sys_total_hours || 0,
        otCount,
        csvSessions,
    };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Summary stat card */
const SummaryCard = ({ title, value, color, icon, suffix }) => (
    <Card size="small" className={`${color} border`}>
        <Statistic
            title={<span className="text-xs font-medium">{title}</span>}
            value={value}
            suffix={suffix}
            prefix={icon}
            valueStyle={{ fontSize: 28, fontWeight: 700 }}
        />
    </Card>
);

/** Expanded row: session-based comparison + raw CSV events */
const ExpandedRowContent = ({ record, onFix, fixing }) => {
    const sessions = record.sessions || [];
    const csvEvents = record.csv_events || [];
    const dutySessions = record.duty_sessions || [];
    const sourceBreakdown = record.source_breakdown || {};
    const problemLines = getProblemDescription(record);
    const preview = record.problem_category !== 'MATCH' ? getChangePreview(record) : null;
    const isLeaveCategory = ['LEAVE_DAY', 'PARTIAL_LEAVE', 'HEALTH_REPORT_DAY'].includes(record.problem_category);

    const sessionColumns = [
        {
            title: '#',
            dataIndex: 'session_index',
            key: 'idx',
            width: 40,
            align: 'center',
            render: (v) => <span className="text-xs text-gray-400">{v}</span>,
        },
        {
            title: 'CSV Giriş',
            dataIndex: 'csv_check_in',
            key: 'csv_ci',
            width: 100,
            render: (v, s) => (
                <span className={`font-mono text-xs font-semibold ${s.only_in_csv ? 'text-orange-600' : 'text-green-700'}`}>
                    {v || '-'}
                </span>
            ),
        },
        {
            title: 'CSV Çıkış',
            dataIndex: 'csv_check_out',
            key: 'csv_co',
            width: 100,
            render: (v, s) => (
                <span className={`font-mono text-xs font-semibold ${s.only_in_csv ? 'text-orange-600' : 'text-green-700'}`}>
                    {v || '-'}
                </span>
            ),
        },
        {
            title: 'Sistem Giriş',
            dataIndex: 'sys_check_in',
            key: 'sys_ci',
            width: 100,
            render: (v, s) => {
                const cls = s.only_in_system ? 'text-blue-600' : s.check_in_differs ? 'text-red-600 font-bold' : 'text-gray-700';
                return <span className={`font-mono text-xs ${cls}`}>{v || '-'}</span>;
            },
        },
        {
            title: 'Sistem Çıkış',
            dataIndex: 'sys_check_out',
            key: 'sys_co',
            width: 100,
            render: (v, s) => {
                const cls = s.only_in_system ? 'text-blue-600' : s.check_out_differs ? 'text-red-600 font-bold' : 'text-gray-700';
                return <span className={`font-mono text-xs ${cls}`}>{v || '-'}</span>;
            },
        },
        {
            title: 'Kaynak',
            dataIndex: 'sys_source',
            key: 'source',
            width: 90,
            render: (v) => v ? <Tag color="blue" className="text-xs">{SOURCE_LABELS[v] || v}</Tag> : <span className="text-xs text-gray-300">-</span>,
        },
        {
            title: 'Durum',
            key: 'sess_status',
            width: 130,
            render: (_, s) => {
                if (s.only_in_csv) return <Tag color="orange">Sadece CSV</Tag>;
                if (s.only_in_system) return <Tag color="blue">Sadece Sistem</Tag>;
                if (s.check_in_differs || s.check_out_differs) return <Tag color="red">Fark Var</Tag>;
                return <Tag color="green">Eşleşiyor</Tag>;
            },
        },
    ];

    return (
        <div className="space-y-4 p-2">
            {/* Problem description */}
            {problemLines && problemLines.length > 0 && (
                <Alert
                    type={isLeaveCategory ? 'info' : record.problem_category === 'ABSENT_IN_SYSTEM' ? 'error' : record.problem_category === 'NO_SYSTEM_RECORD' ? 'error' : 'warning'}
                    showIcon
                    icon={isLeaveCategory ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                    message={
                        <span className="font-semibold">
                            Sorun: {CATEGORY_CONFIG[record.problem_category]?.label || record.problem_category}
                        </span>
                    }
                    description={
                        <ul className="list-disc pl-4 mt-1 text-sm space-y-0.5">
                            {problemLines.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                    }
                />
            )}

            {/* Change preview + Fix button */}
            {preview && record.has_difference && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">
                        <ToolOutlined className="mr-1" />
                        CSV Verileri ile Düzeltme Önizlemesi
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Silinecek:</span>
                            <span className="font-medium text-red-600">
                                {preview.willDeleteSessions} sistem oturumu
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Oluşturulacak:</span>
                            <span className="font-medium text-green-600">
                                {preview.willCreateSessions} CSV oturumu
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Mevcut toplam:</span>
                            <span className="font-mono">{formatHours(preview.sysTotalHours)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Yeni toplam (tahmini):</span>
                            <span className="font-mono font-semibold text-blue-700">~{formatHours(preview.csvTotalHours)}</span>
                        </div>
                        {preview.otCount > 0 && (
                            <div className="col-span-2 flex items-center gap-2 text-red-500">
                                <WarningOutlined />
                                <span className="font-medium">{preview.otCount} ek mesai talebi silinecek</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Düzeltme sonrası: snapping, mola, ek mesai otomatik hesaplanır. Tahmini saat kesin değildir.
                    </div>
                    {onFix && (
                        <Button
                            type="primary"
                            danger
                            size="small"
                            icon={<ToolOutlined />}
                            className="mt-3"
                            loading={fixing}
                            disabled={fixing || preview.willCreateSessions === 0}
                            onClick={() => onFix(record)}
                        >
                            Bu Kaydı Düzelt
                        </Button>
                    )}
                    {preview.willCreateSessions === 0 && (
                        <div className="mt-2 text-xs text-orange-500">
                            CSV'de geçerli oturum bulunamadığı için düzeltme yapılamaz.
                        </div>
                    )}
                </div>
            )}

            {/* Session comparison */}
            <div>
                <h4 className="text-sm font-semibold mb-2 text-gray-700">
                    <SyncOutlined className="mr-1" />
                    Oturum Karşılaştırma
                    <span className="ml-2 text-xs font-normal text-gray-400">
                        (CSV: {record.csv_session_count || 0} oturum, Sistem: {record.sys_session_count || 0} oturum)
                    </span>
                </h4>
                {sessions.length === 0 ? (
                    <p className="text-xs text-gray-400">Oturum verisi yok.</p>
                ) : (
                    <Table
                        dataSource={sessions}
                        rowKey={(s) => s.session_index}
                        size="small"
                        pagination={false}
                        bordered
                        columns={sessionColumns}
                        rowClassName={(s) => {
                            if (s.only_in_csv) return 'pdks-row-missing';
                            if (s.only_in_system) return 'pdks-row-system-only';
                            if (s.check_in_differs || s.check_out_differs) return 'pdks-row-diff';
                            return 'pdks-row-match';
                        }}
                    />
                )}
            </div>

            {/* Duty/Leave sessions */}
            {dutySessions.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-2 text-blue-700">
                        📋 Görev/İzin Kayıtları ({dutySessions.length})
                        <span className="ml-2 text-xs font-normal text-gray-400">
                            (CSV karşılaştırmasına dahil değil)
                        </span>
                    </h4>
                    <Table
                        dataSource={dutySessions}
                        rowKey={(s) => s.attendance_id}
                        size="small"
                        pagination={false}
                        bordered
                        columns={[
                            {
                                title: 'Giriş',
                                dataIndex: 'check_in',
                                key: 'ci',
                                width: 100,
                                render: (v) => <span className="font-mono text-xs text-blue-700">{v || '-'}</span>,
                            },
                            {
                                title: 'Çıkış',
                                dataIndex: 'check_out',
                                key: 'co',
                                width: 100,
                                render: (v) => <span className="font-mono text-xs text-blue-700">{v || '-'}</span>,
                            },
                            {
                                title: 'Kaynak',
                                dataIndex: 'source',
                                key: 'source',
                                width: 140,
                                render: (v) => <Tag color="blue">{SOURCE_LABELS[v] || v}</Tag>,
                            },
                            {
                                title: 'Durum',
                                dataIndex: 'status',
                                key: 'status',
                                width: 120,
                                render: (v) => <Tag>{v}</Tag>,
                            },
                        ]}
                    />
                </div>
            )}

            {/* System summary + Raw events side by side */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* System totals */}
                {record.has_attendance && (
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold mb-2 text-gray-700">
                            <ToolOutlined className="mr-1" />
                            Sistem Özeti
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 rounded p-2">
                                <span className="text-gray-500">Toplam Süre:</span>
                                <span className="ml-2 font-semibold">{formatHours(record.sys_total_hours)}</span>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                                <span className="text-gray-500">Ek Mesai:</span>
                                <span className="ml-2 font-semibold">{formatHours(record.sys_overtime_hours)}</span>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                                <span className="text-gray-500">Durum:</span>
                                <span className="ml-2 font-semibold">{record.attendance_status || '-'}</span>
                            </div>
                            <div className="bg-gray-50 rounded p-2">
                                <span className="text-gray-500">Fazla Mesai Talep:</span>
                                <span className="ml-2 font-semibold">{record.overtime_request_count || 0}</span>
                            </div>
                            {Object.keys(sourceBreakdown).length > 0 && (
                                <div className="col-span-2 bg-blue-50 rounded p-2">
                                    <span className="text-gray-500">Kaynak Dağılımı:</span>
                                    <span className="ml-2">
                                        {Object.entries(sourceBreakdown).map(([src, cnt]) => (
                                            <Tag key={src} color="blue" className="text-xs ml-1">
                                                {SOURCE_LABELS[src] || src}: {cnt}
                                            </Tag>
                                        ))}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Raw CSV events */}
                <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-2 text-gray-700">
                        <FileTextOutlined className="mr-1" />
                        Ham CSV Olayları ({csvEvents.length})
                    </h4>
                    {csvEvents.length === 0 ? (
                        <p className="text-xs text-gray-400">Olay bulunamadı.</p>
                    ) : (
                        <Table
                            dataSource={csvEvents}
                            rowKey={(e, i) => `${e.event_id || i}`}
                            size="small"
                            pagination={false}
                            bordered
                            columns={[
                                {
                                    title: 'Saat',
                                    dataIndex: 'time',
                                    key: 'time',
                                    width: 100,
                                    render: (v) => <span className="font-mono text-xs">{formatTime(v)}</span>,
                                },
                                {
                                    title: 'Yön',
                                    dataIndex: 'direction',
                                    key: 'direction',
                                    width: 80,
                                    render: (v) => (
                                        <Tag color={v === 'GIRIS' || v === 'IN' ? 'green' : 'red'}>
                                            {v === 'GIRIS' || v === 'IN' ? 'GİRİŞ' : v === 'CIKIS' || v === 'OUT' ? 'ÇIKIŞ' : v}
                                        </Tag>
                                    ),
                                },
                                {
                                    title: 'Event ID',
                                    dataIndex: 'event_id',
                                    key: 'event_id',
                                    width: 110,
                                    render: (v) => <span className="font-mono text-xs text-gray-500">{v || '-'}</span>,
                                },
                            ]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PdksCompareTab() {
    // State
    const [mode, setMode] = useState('compare');
    const previewResultsRef = useRef(null);
    const [file, setFile] = useState(null);
    const [comparing, setComparing] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [results, setResults] = useState(null);
    const [fixResults, setFixResults] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [showOnlyDiff, setShowOnlyDiff] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState(null); // null = all
    const [cleaning, setCleaning] = useState(false);

    // Full Reset mode state
    const [resetPreview, setResetPreview] = useState(null);
    const [resetResults, setResetResults] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [executing, setExecuting] = useState(false);

    // Undo state
    const [undoing, setUndoing] = useState(false);

    // Real-time log modal state
    const [logModalOpen, setLogModalOpen] = useState(false);
    const [resetLogs, setResetLogs] = useState([]);
    const [resetProgress, setResetProgress] = useState(null); // {status, current_item, total_items, ...}
    const logEndRef = useRef(null);
    const pollRef = useRef(null);
    const sessionIdRef = useRef(null);

    // Mode switch handler — clears all state
    const handleModeChange = useCallback((newMode) => {
        setMode(newMode);
        setResults(null);
        setFixResults(null);
        setSelectedRows([]);
        setResetPreview(null);
        setResetResults(null);
        setShowOnlyDiff(false);
        setCategoryFilter(null);
    }, []);

    // Auto-scroll log to bottom
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [resetLogs]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // -----------------------------------------------------------------------
    // Derived data
    // -----------------------------------------------------------------------

    const summary = useMemo(() => {
        if (!results?.matches) return null;
        const matches = results.matches;
        const total = matches.length;
        const leaveCats = ['LEAVE_DAY', 'PARTIAL_LEAVE', 'HEALTH_REPORT_DAY'];
        const realDiffs = matches.filter((m) => m.has_difference && !leaveCats.includes(m.problem_category));
        const withDiff = realDiffs.length;
        const matching = matches.filter((m) => m.problem_category === 'MATCH').length;
        const leaveDays = matches.filter((m) => leaveCats.includes(m.problem_category)).length;
        const noAttendance = matches.filter((m) => !m.has_attendance).length;
        return { total, withDiff, matching, leaveDays, noAttendance };
    }, [results]);

    const categorySummary = useMemo(() => {
        return results?.summary?.category_summary || {};
    }, [results]);

    const filteredData = useMemo(() => {
        if (!results?.matches) return [];
        let data = [...results.matches];
        if (showOnlyDiff) {
            const expectedCats = ['MATCH', 'LEAVE_DAY', 'PARTIAL_LEAVE', 'HEALTH_REPORT_DAY'];
            data = data.filter((m) => !expectedCats.includes(m.problem_category));
        }
        if (categoryFilter) {
            data = data.filter((m) => m.problem_category === categoryFilter);
        }
        // Default sort: work_date asc, then employee_name asc
        data.sort((a, b) => {
            const dateComp = (a.work_date || '').localeCompare(b.work_date || '');
            if (dateComp !== 0) return dateComp;
            return (a.employee_name || '').localeCompare(b.employee_name || '', 'tr');
        });
        return data;
    }, [results, showOnlyDiff, categoryFilter]);

    const rowKey = useCallback((record) => `${record.employee_id}_${record.work_date}`, []);

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    const handleCompare = async () => {
        if (!file) {
            message.warning('Lütfen önce bir CSV dosyası seçin.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        setComparing(true);
        setResults(null);
        setFixResults(null);
        setSelectedRows([]);
        try {
            const res = await api.post('/system/health-check/pdks-compare/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResults(res.data);
            message.success(
                `Karşılaştırma tamamlandı: ${res.data.matches?.length || 0} gün işlendi.`
            );
        } catch (e) {
            const errMsg =
                e.response?.data?.error ||
                e.response?.data?.detail ||
                e.message;
            message.error('Karşılaştırma hatası: ' + errMsg);
        } finally {
            setComparing(false);
        }
    };

    const handleFix = () => {
        if (selectedRows.length === 0) {
            message.warning('Lütfen düzeltilecek kayıtları seçin.');
            return;
        }

        Modal.confirm({
            title: 'PDKS Verisi ile Düzeltme Onayı',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div className="mt-2 text-sm">
                    <p>
                        <strong>{selectedRows.length}</strong> gün için kart giriş/çıkış
                        verileri güncellenecek ve mesai yeniden hesaplanacak.
                    </p>
                    <p className="mt-2 text-red-500 font-medium">
                        İlgili tarihlerdeki TÜM ek mesai talepleri silinecek ve mesai yeniden hesaplanacaktır.
                        Potansiyel mesai olarak yeniden oluşturulabilir.
                    </p>
                </div>
            ),
            okText: 'Düzelt',
            okButtonProps: { danger: true },
            cancelText: 'İptal',
            onOk: executeFixing,
            width: 480,
        });
    };

    const executeFixing = async () => {
        const corrections = selectedRows.map((key) => {
            const match = results.matches.find((m) => `${m.employee_id}_${m.work_date}` === key);
            if (!match) return null;
            // Send sessions (all check_in/check_out pairs from CSV)
            const sessions = (match.sessions || [])
                .filter(s => !s.only_in_system) // exclude system-only sessions
                .map(s => ({
                    check_in: s.csv_check_in,
                    check_out: s.csv_check_out,
                }))
                .filter(s => s.check_in || s.check_out); // at least one must exist
            return {
                employee_id: match.employee_id,
                work_date: match.work_date,
                sessions,
            };
        }).filter(Boolean);

        if (corrections.length === 0) {
            message.error('Düzeltilecek geçerli kayıt bulunamadı.');
            return;
        }

        setFixing(true);
        try {
            const res = await api.post('/system/health-check/pdks-fix/', { corrections });
            setFixResults(res.data);
            const fixed = res.data.summary?.fixed || 0;
            const failed = res.data.summary?.failed || 0;
            if (failed === 0) {
                message.success(`${fixed} kayıt başarıyla düzeltildi.`);
            } else {
                message.warning(`${fixed} düzeltildi, ${failed} hata oluştu.`);
            }
            setSelectedRows([]);
        } catch (e) {
            const errMsg =
                e.response?.data?.error ||
                e.response?.data?.detail ||
                e.message;
            message.error('Düzeltme hatası: ' + errMsg);
        } finally {
            setFixing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResults(null);
        setFixResults(null);
        setSelectedRows([]);
        setShowOnlyDiff(true);
        setCategoryFilter(null);
        setResetPreview(null);
        setResetResults(null);
    };

    const handleFixSingle = (record) => {
        const sessions = (record.sessions || [])
            .filter(s => !s.only_in_system)
            .map(s => ({ check_in: s.csv_check_in, check_out: s.csv_check_out }))
            .filter(s => s.check_in || s.check_out);

        if (sessions.length === 0) {
            message.error('CSV\'de geçerli oturum bulunamadı.');
            return;
        }

        const preview = getChangePreview(record);
        const problemLines = getProblemDescription(record);

        Modal.confirm({
            title: `${record.employee_name} — ${formatDate(record.work_date)} Düzeltme Onayı`,
            icon: <ExclamationCircleOutlined />,
            width: 520,
            content: (
                <div className="mt-2 text-sm space-y-2">
                    {problemLines && (
                        <div className="bg-orange-50 border border-orange-200 rounded p-2 text-xs">
                            <strong>Sorun:</strong>
                            <ul className="list-disc pl-4 mt-1">
                                {problemLines.map((l, i) => <li key={i}>{l}</li>)}
                            </ul>
                        </div>
                    )}
                    <p>
                        Sistemdeki <strong>{preview.willDeleteSessions}</strong> oturum silinecek,
                        CSV'den <strong>{preview.willCreateSessions}</strong> oturum oluşturulacak.
                    </p>
                    <p>
                        Tahmini: {formatHours(preview.sysTotalHours)} → ~{formatHours(preview.csvTotalHours)}
                    </p>
                    {preview.otCount > 0 && (
                        <p className="text-red-500 font-medium">
                            {preview.otCount} ek mesai talebi silinecek!
                        </p>
                    )}
                </div>
            ),
            okText: 'Düzelt',
            okButtonProps: { danger: true },
            cancelText: 'İptal',
            onOk: async () => {
                setFixing(true);
                try {
                    const res = await api.post('/system/health-check/pdks-fix/', {
                        corrections: [{
                            employee_id: record.employee_id,
                            work_date: record.work_date,
                            sessions,
                        }],
                    });
                    setFixResults(res.data);
                    const fixed = res.data.summary?.fixed || 0;
                    if (fixed > 0) {
                        message.success(`${record.employee_name} (${formatDate(record.work_date)}) düzeltildi.`);
                    } else {
                        message.warning('Düzeltme yapılamadı.');
                    }
                } catch (e) {
                    message.error('Düzeltme hatası: ' + (e.response?.data?.error || e.message));
                } finally {
                    setFixing(false);
                }
            },
        });
    };

    const handleCleanupEmployees = (employeeIds, employeeNames) => {
        Modal.confirm({
            title: 'Kalıntı Çalışanları Tamamen Sil',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div className="mt-2 text-sm">
                    <p>
                        <strong>{employeeIds.length}</strong> çalışan ve TÜM ilişkili verileri (mesai, ek mesai, izin, yemek, kullanıcı hesabı) tamamen silinecek:
                    </p>
                    <ul className="list-disc pl-4 mt-2 text-gray-600">
                        {employeeNames.map((name, i) => (
                            <li key={i}>{name} (ID: {employeeIds[i]})</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-red-500 font-medium">
                        Bu işlem GERİ ALINAMAZ! Çalışan ve tüm verileri kalıcı olarak silinecektir.
                    </p>
                </div>
            ),
            okText: 'Tamamen Sil',
            okButtonProps: { danger: true },
            cancelText: 'İptal',
            width: 480,
            onOk: async () => {
                setCleaning(true);
                try {
                    const res = await api.post('/system/health-check/pdks-cleanup-employees/', {
                        employee_ids: employeeIds,
                    });
                    const deleted = res.data.summary?.deleted || 0;
                    message.success(`${deleted} çalışan ve tüm verileri tamamen silindi.`);
                    // Remove ABSENT rows for cleaned employees from current results
                    if (results?.matches) {
                        const cleanedIds = new Set(
                            res.data.results
                                ?.filter(r => r.status === 'deleted')
                                .map(r => r.employee_id) || []
                        );
                        setResults(prev => ({
                            ...prev,
                            matches: prev.matches.filter(m => !cleanedIds.has(m.employee_id)),
                        }));
                    }
                } catch (e) {
                    const errMsg = e.response?.data?.error || e.message;
                    message.error('Temizleme hatası: ' + errMsg);
                } finally {
                    setCleaning(false);
                }
            },
        });
    };

    // -----------------------------------------------------------------------
    // Full Reset handlers
    // -----------------------------------------------------------------------

    const handleResetPreview = useCallback(async () => {
        if (!file) {
            message.warning('Lütfen önce bir CSV dosyası seçin.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        setPreviewing(true);
        setResetPreview(null);
        setResetResults(null);
        try {
            const res = await api.post('/system/health-check/pdks-full-reset-preview/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000, // 5 dakika timeout (büyük CSV'ler için)
            });
            console.log('[PDKS Preview] Response received:', {
                status: res.status,
                previewCount: res.data?.preview?.length,
                summaryKeys: Object.keys(res.data?.summary || {}),
                hasParseErrors: res.data?.parse_errors?.length > 0,
            });
            setResetPreview(res.data);
            message.success(
                `Analiz tamamlandı: ${res.data.summary?.total_employee_days || 0} çalışan-gün işlendi.`
            );
            // Sonuçlara scroll et
            setTimeout(() => {
                previewResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (e) {
            console.error('[PDKS Preview] Error:', e);
            const errMsg =
                e.response?.data?.error ||
                e.response?.data?.detail ||
                e.message;
            message.error('Analiz hatası: ' + errMsg);
        } finally {
            setPreviewing(false);
        }
    }, [file]);

    // Start polling reset progress from backend
    const startProgressPolling = useCallback((sid) => {
        if (pollRef.current) clearInterval(pollRef.current);
        let lastLogCount = 0;
        pollRef.current = setInterval(async () => {
            try {
                const res = await api.get(`/system/health-check/pdks-reset-progress/?session_id=${sid}`);
                const data = res.data;
                if (data.status === 'not_found') return;
                setResetProgress(data);
                // Append only new logs
                if (data.logs && data.logs.length > lastLogCount) {
                    const newEntries = data.logs.slice(lastLogCount);
                    lastLogCount = data.logs.length;
                    setResetLogs((prev) => [...prev, ...newEntries]);
                }
                if (data.status === 'completed' || data.status === 'error') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            } catch {
                // Ignore polling errors (execute still running)
            }
        }, 1000);
    }, []);

    const handleResetExecute = useCallback(() => {
        if (!file) {
            message.warning('Lütfen önce bir CSV dosyası seçin.');
            return;
        }
        Modal.confirm({
            title: 'TAM RESET & YENİDEN HESAPLAMA ONAYI',
            icon: <ExclamationCircleOutlined />,
            width: 560,
            content: (
                <div className="mt-2 text-sm space-y-3">
                    <Alert
                        type="error"
                        showIcon
                        message="DİKKAT: Bu işlem mevcut kayıtları siler ve yeniden oluşturur!"
                        description={
                            <div className="mt-1 space-y-1">
                                <p>Seçili tarih aralığındaki TÜM attendance kayıtları silinecek.</p>
                                <p>CSV verileri ile sıfırdan yeni kayıtlar oluşturulacak.</p>
                                <p>Potansiyel (POTENTIAL) Fazla Mesai talepleri silinecek.</p>
                                <p>Onaylı Fazla Mesai, izin, kartsız giriş ve dış görev kayıtları korunacak.</p>
                            </div>
                        }
                    />
                    {resetPreview?.summary && (
                        <div className="bg-gray-50 rounded p-2 text-xs">
                            <strong>Özet:</strong> {resetPreview.summary.total_employee_days} çalışan-gün,{' '}
                            {resetPreview.summary.total_attendance_to_delete} attendance silinecek,{' '}
                            {resetPreview.summary.total_csv_sessions_to_create} session oluşturulacak
                        </div>
                    )}
                </div>
            ),
            okText: 'Onayla ve Tam Reset Çalıştır',
            okButtonProps: { danger: true },
            cancelText: 'İptal',
            onOk: async () => {
                // Generate unique session ID for progress tracking
                const sid = `rst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                sessionIdRef.current = sid;

                // Open log modal & reset state
                setResetLogs([{ time: new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' }), msg: 'Başlatılıyor...', type: 'step' }]);
                setResetProgress({ status: 'running', current_item: 0, total_items: 0 });
                setLogModalOpen(true);
                setExecuting(true);

                // Start polling for progress
                startProgressPolling(sid);

                const formData = new FormData();
                formData.append('file', file);
                formData.append('session_id', sid);
                formData.append('preview_confirmed', 'true');
                try {
                    const res = await api.post('/system/health-check/pdks-full-reset-execute/', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        timeout: 1800000, // 30 min
                    });
                    setResetResults(res.data);
                    const s = res.data.summary || {};
                    // Add final log entry
                    setResetLogs((prev) => [
                        ...prev,
                        {
                            time: new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' }),
                            msg: `İşlem tamamlandı: ${s.success || 0} başarılı, ${s.skipped || 0} atlandı, ${s.failed || 0} hata`,
                            type: (s.failed || 0) === 0 ? 'done' : 'error',
                        },
                    ]);
                    setResetProgress((p) => ({ ...p, status: 'completed' }));
                    if ((s.failed || 0) === 0) {
                        message.success(`Tam reset tamamlandı: ${s.success || 0} başarılı, ${s.skipped || 0} atlandı.`);
                    } else {
                        message.warning(`Tam reset: ${s.success || 0} başarılı, ${s.failed || 0} hata, ${s.skipped || 0} atlandı.`);
                    }
                } catch (e) {
                    const errMsg =
                        e.response?.data?.error ||
                        e.response?.data?.detail ||
                        e.message;
                    setResetLogs((prev) => [
                        ...prev,
                        { time: new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' }), msg: `HATA: ${errMsg}`, type: 'error' },
                    ]);
                    setResetProgress((p) => ({ ...p, status: 'error' }));
                    message.error('Tam reset hatası: ' + errMsg);
                } finally {
                    setExecuting(false);
                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
            },
        });
    }, [file, resetPreview, startProgressPolling]);

    // -----------------------------------------------------------------------
    // Undo — Geri Al
    // -----------------------------------------------------------------------
    const handleUndo = useCallback(() => {
        const snapshotId = resetResults?.snapshot_id;
        if (!snapshotId) {
            message.error('Snapshot bilgisi bulunamadı — geri alma mümkün değil.');
            return;
        }
        Modal.confirm({
            title: 'GERİ ALMA ONAYI',
            icon: <ExclamationCircleOutlined />,
            width: 480,
            content: (
                <div className="mt-2 text-sm space-y-2">
                    <Alert
                        type="warning"
                        showIcon
                        message="Reset öncesi duruma geri dönülecek"
                        description="Tüm attendance ve ek mesai kayıtları reset öncesindeki haline geri yüklenecektir."
                    />
                </div>
            ),
            okText: 'Geri Al',
            okButtonProps: { danger: true },
            cancelText: 'İptal',
            onOk: async () => {
                setUndoing(true);
                try {
                    const res = await api.post('/system/health-check/pdks-full-reset-undo/', {
                        snapshot_id: snapshotId,
                    }, { timeout: 600000 });
                    const d = res.data;
                    if (d.status === 'success') {
                        message.success(`Geri alma tamamlandı: ${d.restored_days} gün, ${d.restored_attendance} attendance, ${d.restored_ot} OT geri yüklendi.`);
                    } else {
                        message.warning(`Kısmi geri alma: ${d.restored_days} gün geri yüklendi, ${d.errors?.length || 0} hata.`);
                    }
                    setResetResults(null);
                    setResetPreview(null);
                } catch (e) {
                    const errMsg = e.response?.data?.error || e.message;
                    message.error('Geri alma hatası: ' + errMsg);
                } finally {
                    setUndoing(false);
                }
            },
        });
    }, [resetResults]);

    // -----------------------------------------------------------------------
    // Export preview as TXT
    // -----------------------------------------------------------------------

    const handleExportPreviewTxt = useCallback(() => {
        if (!resetPreview) return;
        const s = resetPreview.summary || {};
        const lines = [];
        const sep = '='.repeat(80);
        const sep2 = '-'.repeat(60);

        lines.push(sep);
        lines.push('PDKS TAM RESET — DRY-RUN RAPORU');
        lines.push(`Tarih: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
        lines.push(sep);
        lines.push('');

        // Summary
        lines.push('ÖZET');
        lines.push(sep2);
        lines.push(`Eşleşen Çalışan       : ${s.matched_employees || 0}`);
        lines.push(`Toplam Çalışan-Gün     : ${s.total_employee_days || 0}`);
        lines.push(`Silinecek Attendance   : ${s.total_attendance_to_delete || 0}`);
        lines.push(`Oluşturulacak Session  : ${s.total_csv_sessions_to_create || 0}`);
        lines.push(`Silinecek Potansiyel FM: ${s.total_potential_ot_to_delete || 0}`);
        if (s.total_broken_ot) lines.push(`Bozuk F. Mesai (İptal) : ${s.total_broken_ot}`);
        if (s.total_revised_ot) lines.push(`F. Mesai Revize (Düzeltme): ${s.total_revised_ot}`);
        if (s.days_with_leave) lines.push(`İzinli Günler          : ${s.days_with_leave}`);
        if (s.date_range?.length === 2) lines.push(`Tarih Aralığı          : ${formatDate(s.date_range[0])} — ${formatDate(s.date_range[1])}`);
        lines.push('');

        // Unmatched
        if (resetPreview.unmatched_employees?.length > 0) {
            lines.push('EŞLEŞMEYEN SİCİL NO\'LAR');
            lines.push(sep2);
            for (const e of resetPreview.unmatched_employees) {
                if (typeof e === 'string') {
                    lines.push(`  ${e}`);
                } else {
                    const status = e.match_status === 'INACTIVE' ? 'İnaktif' : 'Bulunamadı';
                    const name = e.employee_name || e.csv_name || '';
                    lines.push(`  ${e.sicil_id} — ${status}${name ? ` (${name})` : ''}`);
                }
            }
            lines.push('');
        }

        // DB employees not in CSV
        if (resetPreview.db_employees_not_in_csv?.length > 0) {
            lines.push('CSV\'DE OLMAYAN ÇALIŞANLAR (SİSTEMDE MEVCUT)');
            lines.push(sep2);
            for (const e of resetPreview.db_employees_not_in_csv) {
                lines.push(`  ${e.employee_code} — ${e.employee_name} (${e.department_name || '-'})`);
            }
            lines.push('');
        }

        // Parse errors
        if (resetPreview.parse_errors?.length > 0) {
            lines.push('CSV PARSE HATALARI');
            lines.push(sep2);
            for (const err of resetPreview.parse_errors) {
                lines.push(`  Satır ${err.row || '?'}: ${err.error || err}`);
            }
            lines.push('');
        }

        // Per-employee detail
        if (resetPreview.preview?.length > 0) {
            // Group by employee
            const empMap = new Map();
            for (const item of resetPreview.preview) {
                if (!empMap.has(item.employee_id)) {
                    empMap.set(item.employee_id, { ...item, days: [] });
                }
                empMap.get(item.employee_id).days.push(item);
            }

            lines.push(sep);
            lines.push('DETAYLI ÇALIŞAN-GÜN RAPORU');
            lines.push(sep);

            for (const [, emp] of empMap) {
                lines.push('');
                lines.push(`${'#'.repeat(60)}`);
                lines.push(`ÇALIŞAN: ${emp.employee_code} — ${emp.employee_name}`);
                lines.push(`Departman: ${emp.department_name || '-'}`);
                lines.push(`Gün Sayısı: ${emp.days.length}`);
                lines.push(`${'#'.repeat(60)}`);

                for (const day of emp.days.sort((a, b) => (a.work_date || '').localeCompare(b.work_date || ''))) {
                    lines.push('');
                    lines.push(`  ${sep2}`);
                    lines.push(`  TARİH: ${formatDate(day.work_date)}`);
                    lines.push(`  Aksiyon: ${day.action || '-'}`);
                    lines.push(`  Değişiklik: ${day.has_changes ? 'EVET' : 'Hayır'}`);
                    if (day.changes_summary) lines.push(`  Özet: ${day.changes_summary}`);

                    // Before
                    if (day.before) {
                        const b = day.before;
                        lines.push('');
                        lines.push('  ── MEVCUT DURUM (SİLİNECEK) ──');
                        lines.push(`    Attendance: ${b.attendance_count || 0}`);
                        lines.push(`    Toplam   : ${b.total_hours || 0} sa`);
                        lines.push(`    Normal   : ${b.normal_hours || 0} sa`);
                        lines.push(`    Mesai    : ${b.overtime_hours || 0} sa`);
                        lines.push(`    Mola     : ${b.break_minutes || 0} dk`);
                        lines.push(`    Eksik    : ${b.missing_minutes || 0} dk`);
                        if (b.sessions?.length > 0) {
                            lines.push('    Oturumlar:');
                            for (const sess of b.sessions) {
                                lines.push(`      ${sess.check_in || '?'} — ${sess.check_out || '?'} [${sess.status || '?'}] kaynak:${sess.source || '?'} normal:${formatSeconds(sess.normal_seconds)} ot:${formatSeconds(sess.overtime_seconds)}`);
                            }
                        }
                        if (b.potential_ot_count > 0) {
                            lines.push(`    Potansiyel OT: ${b.potential_ot_count} adet`);
                            if (b.potential_ot_details?.length) {
                                for (const pot of b.potential_ot_details) {
                                    lines.push(`      ${pot.start_time || '?'} — ${pot.end_time || '?'} (${formatSeconds(pot.duration_seconds)})`);
                                }
                            }
                        }
                    }

                    // After
                    if (day.after) {
                        const a = day.after;
                        lines.push('');
                        lines.push('  ── YENİ DURUM (HESAPLANAN) ──');
                        lines.push(`    Attendance: ${a.attendance_count || 0}`);
                        lines.push(`    Toplam   : ${a.total_hours || 0} sa`);
                        lines.push(`    Normal   : ${a.normal_hours || 0} sa`);
                        lines.push(`    Mesai    : ${a.overtime_hours || 0} sa`);
                        lines.push(`    Mola     : ${a.break_minutes || 0} dk`);
                        lines.push(`    Eksik    : ${a.missing_minutes || 0} dk`);
                        if (a.sessions?.length > 0) {
                            lines.push('    Oturumlar:');
                            for (const sess of a.sessions) {
                                lines.push(`      ${sess.check_in || '?'} — ${sess.check_out || '?'} [${sess.status || '?'}] kaynak:${sess.source || '?'} normal:${formatSeconds(sess.normal_seconds)} ot:${formatSeconds(sess.overtime_seconds)}`);
                            }
                        }
                        if (a.potential_ot_count > 0) {
                            lines.push(`    Potansiyel OT: ${a.potential_ot_count} adet`);
                            if (a.potential_ot_details?.length) {
                                for (const pot of a.potential_ot_details) {
                                    lines.push(`      ${pot.start_time || '?'} — ${pot.end_time || '?'} (${formatSeconds(pot.duration_seconds)})`);
                                }
                            }
                        }
                    }

                    // CSV Sessions
                    if (day.csv_sessions?.length > 0) {
                        lines.push('');
                        lines.push(`  ── CSV OTURUMLARI (${day.csv_session_count || day.csv_sessions.length}) ──`);
                        for (const cs of day.csv_sessions) {
                            lines.push(`    ${cs.check_in || '?'} — ${cs.check_out || 'AÇIK'}`);
                        }
                    }

                    // Preserved OT
                    if (day.preserved_ot_requests?.length > 0) {
                        lines.push('');
                        lines.push(`  ── KORUNAN OT TALEPLERİ (${day.preserved_ot_count || day.preserved_ot_requests.length}) ──`);
                        for (const ot of day.preserved_ot_requests) {
                            lines.push(`    #${ot.id} [${ot.status}] ${ot.start_time || '?'}-${ot.end_time || '?'} (${formatSeconds(ot.duration_seconds)}) — ${ot.reason || ''}`);
                        }
                    }

                    // Broken OT
                    if (day.broken_ot_requests?.length > 0) {
                        lines.push('');
                        lines.push(`  ── BOZUK OT (İPTAL EDİLECEK) (${day.broken_ot_count || day.broken_ot_requests.length}) ──`);
                        for (const ot of day.broken_ot_requests) {
                            lines.push(`    #${ot.id} [${ot.status}] ${ot.start_time || '?'}-${ot.end_time || '?'} (${formatSeconds(ot.duration_seconds)}) — ${ot.reason || ''}`);
                        }
                    }

                    // Revised OT
                    if (day.revised_ot_requests?.length > 0) {
                        const changed = day.revised_ot_requests.filter(r => r.changed);
                        if (changed.length > 0) {
                            lines.push('');
                            lines.push(`  ── REVİZE EDİLEN OT (${changed.length}) ──`);
                            for (const ot of changed) {
                                lines.push(`    #${ot.id} [${ot.status}]`);
                                lines.push(`      Eski: ${ot.old_start || '?'}-${ot.old_end || '?'} (${formatSeconds(ot.old_duration)})`);
                                lines.push(`      Yeni: ${ot.new_start || '?'}-${ot.new_end || '?'} (${formatSeconds(ot.new_duration)})`);
                                if (ot.no_match) lines.push('      ⚠ Eşleşme bulunamadı — silinecek');
                                if (ot.inherited_from_day) lines.push('      ✓ Gün bazlı talep devri (mevcut talep gününe göre)');
                            }
                        }
                    }

                    // Approved leaves
                    if (day.approved_leaves?.length > 0) {
                        lines.push('');
                        lines.push(`  ── ONAYLANMIŞ İZİNLER ──`);
                        for (const lv of day.approved_leaves) {
                            lines.push(`    ${lv.type_name || lv.request_type || lv.type || '-'}: ${lv.start_date || '?'} — ${lv.end_date || '?'}${lv.start_time ? ` (${lv.start_time}-${lv.end_time})` : ''} [${lv.category || '?'}]`);
                        }
                    }

                    // Cardless entries
                    if (day.approved_cardless_entries?.length > 0) {
                        lines.push('');
                        lines.push(`  ── KARTSIZ GİRİŞLER ──`);
                        for (const ce of day.approved_cardless_entries) {
                            lines.push(`    #${ce.id} ${ce.check_in_time || '?'}-${ce.check_out_time || '?'} — ${ce.reason || ''}`);
                        }
                    }

                    // External duties
                    if (day.external_duties?.length > 0) {
                        lines.push('');
                        lines.push(`  ── DIŞ GÖREVLER ──`);
                        for (const ed of day.external_duties) {
                            lines.push(`    #${ed.id} ${ed.start_time || '?'}-${ed.end_time || '?'} [${ed.status || '?'}] — ${ed.destination || ed.request_type_name || ''}`);
                        }
                    }

                    // Health reports
                    if (day.health_report_count > 0) {
                        lines.push(`  Sağlık Raporu Attendance: ${day.health_report_count}`);
                    }

                    // Calculation logs
                    if (day.calculation_logs?.length > 0) {
                        lines.push('');
                        lines.push('  ── HESAPLAMA LOGLARI ──');
                        for (const log of day.calculation_logs) {
                            lines.push(`    ${log}`);
                        }
                    }
                }
            }
        }

        lines.push('');
        lines.push(sep);
        lines.push('RAPOR SONU');
        lines.push(sep);

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdks-dry-run-${new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Dry-run raporu indirildi.');
    }, [resetPreview]);

    // -----------------------------------------------------------------------
    // Export compare results as TXT
    // -----------------------------------------------------------------------

    const handleExportCompareTxt = useCallback(() => {
        if (!results?.matches) return;
        const matches = results.matches;
        const s = results.summary || {};
        const catSummary = s.category_summary || {};
        const lines = [];
        const sep = '='.repeat(80);
        const sep2 = '-'.repeat(60);

        lines.push(sep);
        lines.push('PDKS KARŞILAŞTIRMA RAPORU');
        lines.push(`Tarih: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
        lines.push(sep);
        lines.push('');

        // Summary
        lines.push('ÖZET');
        lines.push(sep2);
        lines.push(`Toplam CSV Grubu       : ${s.total_csv_groups || 0}`);
        lines.push(`Eşleşen Çalışan-Gün    : ${s.total_matched || 0}`);
        lines.push(`Eşleşmeyen Sicil       : ${s.total_unmatched || 0}`);
        lines.push(`Fark Olan              : ${s.with_difference || 0}`);
        lines.push(`Sistemde Kayıt Yok     : ${s.without_attendance || 0}`);
        lines.push('');

        // Category breakdown
        if (Object.keys(catSummary).length > 0) {
            lines.push('KATEGORİ DAĞILIMI');
            lines.push(sep2);
            for (const [cat, count] of Object.entries(catSummary)) {
                const cfg = CATEGORY_CONFIG[cat];
                lines.push(`  ${cfg?.icon || '?'} ${cfg?.label || cat}: ${count}`);
            }
            lines.push('');
        }

        // Unmatched
        if (results.unmatched_employees?.length > 0) {
            lines.push('EŞLEŞMEYEN SİCİL NO\'LAR');
            lines.push(sep2);
            for (const e of results.unmatched_employees) {
                const status = e.match_status === 'INACTIVE' ? 'İnaktif' : 'Bulunamadı';
                const name = e.employee_name || e.csv_name || '';
                lines.push(`  ${e.sicil_id} — ${status}${name ? ` (${name})` : ''}`);
            }
            lines.push('');
        }

        // Parse errors
        if (results.parse_errors?.length > 0) {
            lines.push('CSV PARSE HATALARI');
            lines.push(sep2);
            for (const err of results.parse_errors) {
                lines.push(`  ${typeof err === 'string' ? err : `Satır ${err.row || '?'}: ${err.error || err}`}`);
            }
            lines.push('');
        }

        // Group by employee
        const empMap = new Map();
        for (const m of matches) {
            if (!empMap.has(m.employee_id)) {
                empMap.set(m.employee_id, {
                    employee_code: m.employee_code,
                    employee_name: m.employee_name,
                    department_name: m.department_name,
                    days: [],
                });
            }
            empMap.get(m.employee_id).days.push(m);
        }

        lines.push(sep);
        lines.push('DETAYLI ÇALIŞAN-GÜN RAPORU');
        lines.push(sep);

        for (const [, emp] of empMap) {
            const empDays = emp.days.sort((a, b) => (a.work_date || '').localeCompare(b.work_date || ''));
            const empMatches = empDays.filter(d => d.problem_category === 'MATCH').length;
            const empDiffs = empDays.length - empMatches;

            lines.push('');
            lines.push('#'.repeat(60));
            lines.push(`ÇALIŞAN: ${emp.employee_code} — ${emp.employee_name}`);
            lines.push(`Departman: ${emp.department_name || '-'}`);
            lines.push(`Gün Sayısı: ${empDays.length} (${empMatches} eşleşme, ${empDiffs} fark)`);
            lines.push('#'.repeat(60));

            for (const day of empDays) {
                const cat = day.problem_category;
                const catLabel = CATEGORY_CONFIG[cat]?.label || cat;
                lines.push('');
                lines.push(`  ${sep2}`);
                lines.push(`  TARİH: ${formatDate(day.work_date)}  |  Kategori: ${catLabel}`);

                // CSV vs System summary
                lines.push(`  CSV Giriş : ${day.csv_check_in || '-'}  Çıkış: ${day.csv_check_out || '-'}  Toplam: ${formatHours(day.csv_total_hours || 0)}`);
                lines.push(`  Sistem Giriş: ${day.sys_check_in || '-'}  Çıkış: ${day.sys_check_out || '-'}  Toplam: ${formatHours(day.sys_total_hours || 0)}  OT: ${formatHours(day.sys_overtime_hours || 0)}`);
                lines.push(`  Oturum — CSV: ${day.csv_session_count || 0}, Sistem(Kart): ${day.card_session_count ?? day.sys_session_count ?? 0}${day.duty_session_count ? `, Görev: ${day.duty_session_count}` : ''}`);

                // Source breakdown
                if (day.source_breakdown && Object.keys(day.source_breakdown).length > 0) {
                    const srcParts = Object.entries(day.source_breakdown).map(([src, cnt]) => `${SOURCE_LABELS[src] || src}:${cnt}`);
                    lines.push(`  Kaynak Dağılımı: ${srcParts.join(', ')}`);
                }

                // Session comparison
                const sessions = day.sessions || [];
                if (sessions.length > 0) {
                    lines.push('');
                    lines.push('  ── OTURUM KARŞILAŞTIRMA ──');
                    for (const sess of sessions) {
                        let status = '';
                        if (sess.only_in_csv) status = '[SADECE CSV]';
                        else if (sess.only_in_system) status = '[SADECE SİSTEM]';
                        else if (sess.check_in_differs || sess.check_out_differs) status = '[FARK VAR]';
                        else status = '[EŞLEŞİYOR]';
                        const srcTag = sess.sys_source ? ` (${SOURCE_LABELS[sess.sys_source] || sess.sys_source})` : '';
                        lines.push(`    #${sess.session_index} ${status}${srcTag}`);
                        lines.push(`      CSV    : ${sess.csv_check_in || '-'} — ${sess.csv_check_out || '-'}`);
                        lines.push(`      Sistem : ${sess.sys_check_in || '-'} — ${sess.sys_check_out || '-'}`);
                    }
                }

                // Duty sessions
                const dutySessions = day.duty_sessions || [];
                if (dutySessions.length > 0) {
                    lines.push('');
                    lines.push('  ── GÖREV/İZİN KAYITLARI ──');
                    for (const ds of dutySessions) {
                        lines.push(`    ${ds.check_in || '-'} — ${ds.check_out || '-'}  [${SOURCE_LABELS[ds.source] || ds.source}] (${ds.status})`);
                    }
                }

                // OT requests
                const otList = day.overtime_requests || [];
                if (otList.length > 0) {
                    lines.push('');
                    lines.push(`  ── EK MESAİ TALEPLERİ (${otList.length}) ──`);
                    for (const ot of otList) {
                        lines.push(`    #${ot.id} [${ot.status}] ${formatSeconds(ot.duration_seconds)}`);
                    }
                }

                // Raw CSV events
                const csvEvents = day.csv_events || [];
                if (csvEvents.length > 0) {
                    lines.push('');
                    lines.push(`  ── HAM CSV OLAYLARI (${csvEvents.length}) ──`);
                    for (const ev of csvEvents) {
                        const dir = ev.direction === 'GIRIS' || ev.direction === 'IN' ? 'GİRİŞ' : 'ÇIKIŞ';
                        lines.push(`    ${formatTime(ev.time)} ${dir}  (${ev.event_id || '-'})`);
                    }
                }
            }
        }

        lines.push('');
        lines.push(sep);
        lines.push('RAPOR SONU');
        lines.push(sep);

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdks-karsilastirma-${new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' })}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Karşılaştırma raporu indirildi.');
    }, [results]);

    // -----------------------------------------------------------------------
    // Upload props
    // -----------------------------------------------------------------------

    const uploadProps = {
        accept: '.csv',
        maxCount: 1,
        beforeUpload: (f) => {
            setFile(f);
            setResults(null);
            setFixResults(null);
            setSelectedRows([]);
            setResetPreview(null);
            setResetResults(null);
            return false; // prevent auto-upload
        },
        onRemove: () => {
            setFile(null);
            setResults(null);
            setFixResults(null);
            setSelectedRows([]);
            setResetPreview(null);
            setResetResults(null);
        },
        fileList: file ? [file] : [],
    };

    // -----------------------------------------------------------------------
    // Row selection config
    // -----------------------------------------------------------------------

    const rowSelection = {
        selectedRowKeys: selectedRows,
        onChange: (keys) => setSelectedRows(keys),
        getCheckboxProps: (record) => ({
            disabled: record.has_attendance && !record.has_difference,
        }),
    };

    // -----------------------------------------------------------------------
    // Table columns
    // -----------------------------------------------------------------------

    const columns = useMemo(
        () => [
            {
                title: 'Sicil No',
                dataIndex: 'employee_code',
                key: 'employee_code',
                width: 100,
                sorter: (a, b) => (a.employee_code || '').localeCompare(b.employee_code || ''),
                render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
            },
            {
                title: 'Ad Soyad',
                dataIndex: 'employee_name',
                key: 'employee_name',
                width: 180,
                sorter: (a, b) =>
                    (a.employee_name || '').localeCompare(b.employee_name || '', 'tr'),
                render: (v, record) => (
                    <Tooltip title={[record.department_name, record.job_position_name].filter(Boolean).join(' — ') || 'Bilinmiyor'}>
                        <div>
                            <div className="font-medium text-sm truncate">{v || '-'}</div>
                            {record.department_name && (
                                <div className="text-[10px] text-gray-400 truncate">{record.department_name}</div>
                            )}
                        </div>
                    </Tooltip>
                ),
            },
            {
                title: 'Tarih',
                dataIndex: 'work_date',
                key: 'work_date',
                width: 110,
                defaultSortOrder: 'ascend',
                sorter: (a, b) => (a.work_date || '').localeCompare(b.work_date || ''),
                render: (v) => formatDate(v),
            },
            {
                title: 'CSV Giriş',
                dataIndex: 'csv_check_in',
                key: 'csv_check_in',
                width: 100,
                render: (v) => (
                    <span className="font-mono text-xs text-green-700 font-semibold">
                        {formatTime(v)}
                    </span>
                ),
            },
            {
                title: 'CSV Çıkış',
                dataIndex: 'csv_check_out',
                key: 'csv_check_out',
                width: 100,
                render: (v) => (
                    <span className="font-mono text-xs text-green-700 font-semibold">
                        {formatTime(v)}
                    </span>
                ),
            },
            {
                title: 'Sistem Giriş',
                dataIndex: 'sys_check_in',
                key: 'sys_check_in',
                width: 100,
                render: (v, record) => {
                    const isDiff =
                        record.has_difference &&
                        record.has_attendance &&
                        v !== record.csv_check_in;
                    return (
                        <span
                            className={`font-mono text-xs ${
                                isDiff ? 'text-red-600 font-bold' : 'text-gray-700'
                            }`}
                        >
                            {formatTime(v)}
                        </span>
                    );
                },
            },
            {
                title: 'Sistem Çıkış',
                dataIndex: 'sys_check_out',
                key: 'sys_check_out',
                width: 100,
                render: (v, record) => {
                    const isDiff =
                        record.has_difference &&
                        record.has_attendance &&
                        v !== record.csv_check_out;
                    return (
                        <span
                            className={`font-mono text-xs ${
                                isDiff ? 'text-red-600 font-bold' : 'text-gray-700'
                            }`}
                        >
                            {formatTime(v)}
                        </span>
                    );
                },
            },
            {
                title: 'Oturum',
                key: 'session_count',
                width: 80,
                align: 'center',
                render: (_, record) => {
                    const csvC = record.csv_session_count || 0;
                    const sysC = record.sys_session_count || 0;
                    const dutyC = record.duty_session_count || 0;
                    const differs = csvC !== sysC;
                    const isLeave = ['LEAVE_DAY', 'PARTIAL_LEAVE', 'HEALTH_REPORT_DAY'].includes(record.problem_category);
                    return (
                        <Tooltip title={`CSV: ${csvC}, Kart: ${sysC}${dutyC > 0 ? `, Görev: ${dutyC}` : ''}`}>
                            <span className={`text-xs font-mono ${isLeave ? 'text-blue-600' : differs ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                {csvC}/{sysC}{dutyC > 0 ? <span className="text-blue-500">+{dutyC}</span> : ''}
                            </span>
                        </Tooltip>
                    );
                },
            },
            {
                title: 'Toplam Saat',
                key: 'total_hours',
                width: 110,
                align: 'center',
                render: (_, record) => {
                    const csvH = record.csv_total_hours || 0;
                    const sysH = record.sys_total_hours || 0;
                    const diff = Math.abs(csvH - sysH);
                    const differs = diff > 0.1;
                    return (
                        <Tooltip title={`CSV: ${csvH.toFixed(1)}sa, Sistem: ${sysH.toFixed(1)}sa`}>
                            <div className="text-xs font-mono leading-tight">
                                <div className={differs ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                    {csvH.toFixed(1)}/{sysH.toFixed(1)}
                                </div>
                                {differs && (
                                    <div className="text-[10px] text-orange-500">
                                        {diff > 0 ? (csvH > sysH ? '+' : '-') : ''}{diff.toFixed(1)}sa
                                    </div>
                                )}
                            </div>
                        </Tooltip>
                    );
                },
            },
            {
                title: 'Kategori',
                key: 'problem_category',
                width: 150,
                filters: Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
                    text: `${v.icon} ${v.label}`,
                    value: k,
                })),
                onFilter: (value, record) => record.problem_category === value,
                render: (_, record) => getCategoryTag(record.problem_category),
            },
            {
                title: 'F. Mesai',
                dataIndex: 'overtime_request_count',
                key: 'ot',
                width: 70,
                align: 'center',
                render: (count, record) => {
                    if (!count || count === 0) return <span className="text-gray-300">-</span>;
                    const details = record.overtime_details || '';
                    return (
                        <Tooltip title={details || `${count} ek mesai talebi`}>
                            <Badge
                                count={count}
                                style={{ backgroundColor: '#6366f1' }}
                                overflowCount={99}
                            />
                        </Tooltip>
                    );
                },
            },
        ],
        []
    );

    // -----------------------------------------------------------------------
    // Fix results columns
    // -----------------------------------------------------------------------

    const fixColumns = useMemo(
        () => [
            {
                title: 'Ad Soyad',
                dataIndex: 'employee_name',
                key: 'employee_name',
                width: 160,
                ellipsis: true,
            },
            {
                title: 'Tarih',
                dataIndex: 'work_date',
                key: 'work_date',
                width: 110,
                render: (v) => formatDate(v),
            },
            {
                title: 'Oturum',
                key: 'session_change',
                width: 100,
                align: 'center',
                render: (_, record) => {
                    const oldC = record.old_session_count ?? '-';
                    const newC = record.new_session_count ?? '-';
                    const changed = oldC !== newC;
                    return (
                        <span className="font-mono text-xs">
                            <span className={changed ? 'text-red-500' : 'text-gray-500'}>{oldC}</span>
                            <span className="mx-1 text-gray-400">→</span>
                            <span className={changed ? 'text-green-600 font-semibold' : 'font-semibold'}>{newC}</span>
                        </span>
                    );
                },
            },
            {
                title: 'Eski Süre → Yeni Süre',
                key: 'duration_change',
                width: 180,
                render: (_, record) => (
                    <span className="font-mono text-xs">
                        <span className="text-gray-500">{formatHours(record.old_total_hours)}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="font-semibold">{formatHours(record.new_total_hours)}</span>
                    </span>
                ),
            },
            {
                title: 'Eski FM → Yeni FM',
                key: 'ot_seconds_change',
                width: 160,
                render: (_, record) => {
                    const oldOt = record.old_overtime_seconds;
                    const newOt = record.new_overtime_seconds;
                    if (oldOt == null && newOt == null) return <span className="text-gray-300">-</span>;
                    return (
                        <span className="font-mono text-xs">
                            <span className="text-gray-500">{formatSeconds(oldOt || 0)}</span>
                            <span className="mx-1 text-gray-400">→</span>
                            <span className="font-semibold">{formatSeconds(newOt || 0)}</span>
                        </span>
                    );
                },
            },
            {
                title: 'FM Talep Değişim',
                key: 'ot_adj',
                width: 160,
                render: (_, record) => {
                    const adjustments = record.overtime_adjustments;
                    if (!adjustments || adjustments.length === 0) {
                        return <span className="text-gray-300">-</span>;
                    }
                    return (
                        <div className="text-xs">
                            {adjustments.map((adj, i) => (
                                <div key={i}>
                                    {adj.skipped ? (
                                        <Tag color="orange" className="text-[10px]">Kilitli</Tag>
                                    ) : (
                                        <span>
                                            <span className="text-gray-400">{formatSeconds(adj.old_duration)}</span>
                                            <span className="mx-1">→</span>
                                            <span className={adj.new_duration === 0 ? 'text-red-500 font-semibold' : 'font-semibold'}>
                                                {formatSeconds(adj.new_duration)}
                                            </span>
                                            {adj.warning && <Tag color="red" className="ml-1 text-[10px]">!</Tag>}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                },
            },
            {
                title: 'Sonuç',
                dataIndex: 'status',
                key: 'fix_status',
                width: 100,
                render: (v) => {
                    if (v === 'fixed' || v === 'success') {
                        return <Tag color="green">Düzeltildi</Tag>;
                    }
                    if (v === 'skipped') {
                        return <Tag color="default">Atlandı</Tag>;
                    }
                    if (v === 'error' || v === 'failed') {
                        return <Tag color="red">Hata</Tag>;
                    }
                    return <Tag>{v || '-'}</Tag>;
                },
            },
        ],
        []
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // Group preview items by employee for nested display
    // -----------------------------------------------------------------------
    const groupedPreviewData = useMemo(() => {
        if (!resetPreview?.preview?.length) return [];
        const map = new Map();
        for (const item of resetPreview.preview) {
            const key = item.employee_id;
            if (!map.has(key)) {
                map.set(key, {
                    key: `emp_${key}`,
                    employee_id: key,
                    employee_code: item.employee_code,
                    employee_name: item.employee_name,
                    department_name: item.department_name,
                    days: [],
                    totalCsvSessions: 0,
                    totalExistingAtt: 0,
                    totalPotentialOtDelete: 0,
                    hasOtPreserved: false,
                    hasBrokenOt: false,
                    hasRevisedOt: false,
                    hasLeave: false,
                    hasCardless: false,
                    hasExternalDuty: false,
                    hasChanges: false,
                    hasAnomaly: false,
                });
            }
            const group = map.get(key);
            group.days.push({ ...item, key: `${key}_${item.work_date}` });
            group.totalCsvSessions += (item.csv_session_count || 0);
            group.totalExistingAtt += (item.existing_attendance_count || 0);
            group.totalPotentialOtDelete += (item.potential_ot_to_delete || 0);
            if (item.preserved_ot_requests?.length > 0) group.hasOtPreserved = true;
            if (item.broken_ot_requests?.length > 0) group.hasBrokenOt = true;
            if (item.revised_ot_requests?.some(r => r.changed)) group.hasRevisedOt = true;
            if (item.has_approved_leave) group.hasLeave = true;
            if (item.approved_cardless_entries?.length > 0) group.hasCardless = true;
            if (item.external_duties?.length > 0) group.hasExternalDuty = true;
            if (item.has_changes) group.hasChanges = true;
            if (item.has_anomaly) group.hasAnomaly = true;
        }
        return Array.from(map.values()).sort((a, b) =>
            (a.employee_code || '').localeCompare(b.employee_code || '')
        );
    }, [resetPreview]);

    // -----------------------------------------------------------------------
    // Full Reset preview table columns
    // -----------------------------------------------------------------------

    const resetPreviewColumns = useMemo(() => [
        {
            title: 'Sicil No',
            dataIndex: 'employee_code',
            key: 'employee_code',
            width: 90,
            sorter: (a, b) => (a.employee_code || '').localeCompare(b.employee_code || ''),
            render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
        },
        {
            title: 'Ad Soyad',
            dataIndex: 'employee_name',
            key: 'employee_name',
            width: 160,
            sorter: (a, b) => (a.employee_name || '').localeCompare(b.employee_name || '', 'tr'),
            ellipsis: true,
        },
        {
            title: 'Departman',
            dataIndex: 'department_name',
            key: 'department_name',
            width: 130,
            ellipsis: true,
            render: (v) => <span className="text-xs text-gray-500">{v || '-'}</span>,
        },
        {
            title: 'Tarih',
            dataIndex: 'work_date',
            key: 'work_date',
            width: 100,
            defaultSortOrder: 'ascend',
            sorter: (a, b) => (a.work_date || '').localeCompare(b.work_date || ''),
            render: (v) => formatDate(v),
        },
        {
            title: 'CSV Session',
            dataIndex: 'csv_session_count',
            key: 'csv_session_count',
            width: 90,
            align: 'center',
            render: (v) => <span className="font-mono text-xs font-semibold text-green-700">{v || 0}</span>,
        },
        {
            title: 'Mevcut Att.',
            dataIndex: 'existing_attendance_count',
            key: 'existing_attendance_count',
            width: 90,
            align: 'center',
            render: (v) => <span className="font-mono text-xs">{v || 0}</span>,
        },
        {
            title: 'Mevcut Saat',
            dataIndex: 'existing_total_hours',
            key: 'existing_total_hours',
            width: 100,
            align: 'center',
            render: (v) => <span className="font-mono text-xs">{v != null ? formatHours(v) : '-'}</span>,
        },
        {
            title: 'Sil. POT FM',
            dataIndex: 'potential_ot_to_delete',
            key: 'potential_ot_to_delete',
            width: 90,
            align: 'center',
            render: (v) => v > 0
                ? <span className="font-mono text-xs font-semibold text-orange-600">{v}</span>
                : <span className="text-gray-300">-</span>,
        },
        {
            title: 'Durum',
            key: 'status_tags',
            width: 200,
            render: (_, record) => {
                const tags = [];
                if (record.has_approved_leave) tags.push(<Tag key="leave" color="blue">İzinli</Tag>);
                if (record.approved_cardless_entries?.length > 0) tags.push(<Tag key="cardless" color="cyan">Kartsız</Tag>);
                if (record.external_duties?.length > 0) tags.push(<Tag key="ext" color="geekblue">Dış Görev</Tag>);
                if (record.preserved_ot_requests?.length > 0) tags.push(<Tag key="ot" color="purple">FM Korunan</Tag>);
                if (record.broken_ot_requests?.length > 0) tags.push(<Tag key="broken" color="red">Bozuk F. Mesai ({record.broken_ot_requests.length})</Tag>);
                const revisedChanged = record.revised_ot_requests?.filter(r => r.changed) || [];
                if (revisedChanged.length > 0) tags.push(<Tag key="revised" color="orange">F. Mesai Revize ({revisedChanged.length})</Tag>);
                return tags.length > 0 ? <Space size={2} wrap>{tags}</Space> : <span className="text-gray-300">-</span>;
            },
        },
        {
            title: 'Değişim Özeti',
            dataIndex: 'changes_summary',
            key: 'changes_summary',
            width: 300,
            ellipsis: false,
            render: (v, record) => {
                if (!v) return <span className="text-gray-300">-</span>;
                return (
                    <div>
                        {record.has_anomaly && <Tag color="red" className="text-[10px] mb-1">Anomali: F.Mesai&gt;24sa</Tag>}
                        {record.changes_detail?.length > 0 && (
                            <div className="mb-1">
                                {record.changes_detail.map((d, i) => (
                                    <Tag key={i} color="orange" className="text-[10px] mr-1 mb-0.5">{d}</Tag>
                                ))}
                            </div>
                        )}
                        {record.has_changes ? (
                            <span className="font-mono text-xs font-semibold text-orange-700">{v}</span>
                        ) : (
                            <span className="font-mono text-xs text-gray-400">{v}</span>
                        )}
                    </div>
                );
            },
        },
    ], []);

    // Employee-level columns for grouped view
    const employeeGroupColumns = useMemo(() => [
        {
            title: 'Sicil No',
            dataIndex: 'employee_code',
            key: 'employee_code',
            width: 90,
            sorter: (a, b) => (a.employee_code || '').localeCompare(b.employee_code || ''),
            render: (v) => <span className="font-mono text-xs font-bold">{v || '-'}</span>,
        },
        {
            title: 'Ad Soyad',
            dataIndex: 'employee_name',
            key: 'employee_name',
            width: 200,
            sorter: (a, b) => (a.employee_name || '').localeCompare(b.employee_name || '', 'tr'),
        },
        {
            title: 'Departman',
            dataIndex: 'department_name',
            key: 'department_name',
            width: 180,
            ellipsis: true,
            render: (v) => <span className="text-xs text-gray-500">{v || '-'}</span>,
        },
        {
            title: 'Gün Sayısı',
            dataIndex: 'days',
            key: 'day_count',
            width: 90,
            align: 'center',
            render: (days) => <span className="font-mono text-sm font-bold">{days?.length || 0}</span>,
        },
        {
            title: 'CSV Session',
            dataIndex: 'totalCsvSessions',
            key: 'totalCsvSessions',
            width: 100,
            align: 'center',
            render: (v) => <span className="font-mono text-xs text-green-700">{v}</span>,
        },
        {
            title: 'Mevcut Att.',
            dataIndex: 'totalExistingAtt',
            key: 'totalExistingAtt',
            width: 100,
            align: 'center',
            render: (v) => <span className="font-mono text-xs">{v}</span>,
        },
        {
            title: 'Durum',
            key: 'tags',
            width: 260,
            render: (_, record) => {
                const tags = [];
                if (record.hasAnomaly) tags.push(<Tag key="anomaly" color="red">Anomali</Tag>);
                if (record.hasChanges) tags.push(<Tag key="changes" color="orange">Değişim Var</Tag>);
                if (record.hasBrokenOt) tags.push(<Tag key="broken" color="red">Bozuk F. Mesai</Tag>);
                if (record.hasRevisedOt) tags.push(<Tag key="revised" color="orange">F. Mesai Revize</Tag>);
                if (record.hasOtPreserved) tags.push(<Tag key="ot" color="purple">F. Mesai Korunan</Tag>);
                if (record.hasLeave) tags.push(<Tag key="leave" color="blue">İzinli</Tag>);
                if (record.hasCardless) tags.push(<Tag key="cardless" color="cyan">Kartsız</Tag>);
                if (record.hasExternalDuty) tags.push(<Tag key="ext" color="geekblue">Dış Görev</Tag>);
                if (!record.hasChanges && !record.hasAnomaly && tags.length === 0) {
                    tags.push(<Tag key="ok" color="green">Değişim Yok</Tag>);
                }
                return <Space size={2} wrap>{tags}</Space>;
            },
        },
    ], []);

    // -----------------------------------------------------------------------
    // Full Reset execution results columns
    // -----------------------------------------------------------------------

    const resetResultColumns = useMemo(() => [
        {
            title: 'Sicil',
            dataIndex: 'employee_code',
            key: 'employee_code',
            width: 80,
            render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
        },
        {
            title: 'Ad Soyad',
            dataIndex: 'employee_name',
            key: 'employee_name',
            width: 150,
            ellipsis: true,
        },
        {
            title: 'Tarih',
            dataIndex: 'work_date',
            key: 'work_date',
            width: 100,
            render: (v) => formatDate(v),
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (v) => {
                if (v === 'success') return <Tag color="green">Başarılı</Tag>;
                if (v === 'failed') return <Tag color="red">Hata</Tag>;
                if (v === 'skipped') return <Tag color="orange">Atlandı</Tag>;
                return <Tag>{v || '-'}</Tag>;
            },
        },
        {
            title: 'Eski Att',
            key: 'old_att',
            width: 75,
            align: 'center',
            render: (_, r) => <span className="font-mono text-xs">{r.details?.old_attendance_count ?? '-'}</span>,
        },
        {
            title: 'Yeni Att',
            key: 'new_att',
            width: 75,
            align: 'center',
            render: (_, r) => <span className="font-mono text-xs font-semibold">{r.details?.new_attendance_count ?? '-'}</span>,
        },
        {
            title: 'Eski Saat',
            key: 'old_hours',
            width: 90,
            align: 'center',
            render: (_, r) => <span className="font-mono text-xs">{r.details?.old_total_hours != null ? formatHours(r.details.old_total_hours) : '-'}</span>,
        },
        {
            title: 'Yeni Saat',
            key: 'new_hours',
            width: 90,
            align: 'center',
            render: (_, r) => <span className="font-mono text-xs font-semibold">{r.details?.new_total_hours != null ? formatHours(r.details.new_total_hours) : '-'}</span>,
        },
        {
            title: 'FM Saat',
            key: 'ot_hours',
            width: 80,
            align: 'center',
            render: (_, r) => {
                const v = r.details?.new_overtime_hours;
                if (v == null || v === 0) return <span className="text-gray-300">-</span>;
                return <span className="font-mono text-xs text-purple-600 font-semibold">{formatHours(v)}</span>;
            },
        },
        {
            title: 'İzin',
            key: 'leave',
            width: 60,
            align: 'center',
            render: (_, r) => r.details?.had_approved_leave
                ? <Tag color="blue">Evet</Tag>
                : <span className="text-gray-300">-</span>,
        },
        {
            title: 'Hata',
            dataIndex: 'error',
            key: 'error',
            width: 200,
            ellipsis: true,
            render: (v) => v ? <span className="text-xs text-red-500">{v}</span> : <span className="text-gray-300">-</span>,
        },
    ], []);

    return (
        <div className="space-y-6">
            {/* --- Mode Selector --- */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <Segmented
                    value={mode}
                    onChange={handleModeChange}
                    options={[
                        {
                            label: (
                                <div className="flex items-center gap-2 px-2 py-1">
                                    <SyncOutlined />
                                    <span>Karşılaştır</span>
                                </div>
                            ),
                            value: 'compare',
                        },
                        {
                            label: (
                                <div className="flex items-center gap-2 px-2 py-1">
                                    <ThunderboltOutlined />
                                    <span>Tam Reset & Yeniden Hesapla</span>
                                </div>
                            ),
                            value: 'fullReset',
                        },
                    ]}
                    block
                    size="large"
                />
            </div>

            {/* --- Step 1: Upload Section --- */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">
                    {mode === 'compare' ? (
                        <>
                            <SyncOutlined className="mr-2 text-blue-500" />
                            PDKS Kart Okuyucu Karşılaştırma
                        </>
                    ) : (
                        <>
                            <ThunderboltOutlined className="mr-2 text-red-500" />
                            PDKS Tam Reset & Yeniden Hesaplama
                        </>
                    )}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    {mode === 'compare'
                        ? 'Kart okuyucu (PDKS) cihazından alınan CSV dosyasını yükleyerek sistemdeki mesai kayıtları ile karşılaştırabilirsiniz. Farklılıklar tespit edildiğinde seçip düzeltebilirsiniz.'
                        : 'CSV dosyasındaki kart okuyucu verileri ile sistemdeki TÜM attendance kayıtları silinip sıfırdan oluşturulur. Onaylı fazla mesai, izin, kartsız giriş ve dış görev kayıtları korunur. Potansiyel fazla mesai talepleri silinir.'
                    }
                </p>

                {mode === 'fullReset' && (
                    <Alert
                        type="warning"
                        showIcon
                        icon={<ExclamationCircleOutlined />}
                        className="mb-4"
                        message="Bu mod, seçili tarih aralığındaki tüm attendance kayıtlarını siler ve CSV'den yeniden oluşturur."
                        description="Önce 'Analiz Et (Dry-Run)' ile önizleme yapmanız önerilir."
                    />
                )}

                <Upload.Dragger {...uploadProps} className="mb-4">
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                        CSV dosyasını buraya sürükleyin veya tıklayın
                    </p>
                    <p className="ant-upload-hint">
                        Sadece .csv dosyaları kabul edilir. Dosya PDKS kart okuyucu formatında olmalıdır.
                    </p>
                </Upload.Dragger>

                {mode === 'compare' && (
                    <Space>
                        <Button
                            type="primary"
                            icon={<SyncOutlined spin={comparing} />}
                            onClick={handleCompare}
                            loading={comparing}
                            disabled={!file || comparing}
                            size="large"
                        >
                            {comparing ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
                        </Button>
                        {results && (
                            <Button onClick={handleReset} size="large">
                                Sıfırla
                            </Button>
                        )}
                    </Space>
                )}

                {mode === 'fullReset' && (
                    <Space>
                        <Button
                            type="primary"
                            icon={<SafetyOutlined />}
                            onClick={handleResetPreview}
                            loading={previewing}
                            disabled={!file || previewing || executing}
                            size="large"
                        >
                            {previewing ? 'Analiz Ediliyor...' : 'Analiz Et (Dry-Run)'}
                        </Button>
                        {(resetPreview || resetResults) && (
                            <Button onClick={handleReset} size="large">
                                Sıfırla
                            </Button>
                        )}
                    </Space>
                )}
            </div>

            {/* ================================================================= */}
            {/* COMPARE MODE                                                      */}
            {/* ================================================================= */}
            {mode === 'compare' && (
                <>
                    {/* --- Loading overlay --- */}
                    {comparing && (
                        <div className="flex items-center justify-center py-12">
                            <Spin size="large" tip="CSV dosyası işleniyor ve karşılaştırılıyor..." />
                        </div>
                    )}

                    {/* --- Step 2: Summary Cards --- */}
                    {results && summary && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <SummaryCard
                                    title="Toplam Gün"
                                    value={summary.total}
                                    color="bg-blue-50 border-blue-200"
                                    icon={<FileTextOutlined className="text-blue-500" />}
                                />
                                <SummaryCard
                                    title="Eşleşme"
                                    value={summary.matching}
                                    color="bg-green-50 border-green-200"
                                    icon={<CheckCircleOutlined className="text-green-500" />}
                                />
                                <SummaryCard
                                    title="İzin/Rapor Günü"
                                    value={summary.leaveDays}
                                    color="bg-cyan-50 border-cyan-200"
                                    icon={<SafetyOutlined className="text-cyan-500" />}
                                />
                                <SummaryCard
                                    title="Fark Var"
                                    value={summary.withDiff}
                                    color="bg-red-50 border-red-200"
                                    icon={<CloseCircleOutlined className="text-red-500" />}
                                />
                                <SummaryCard
                                    title="Sistemde Kayıt Yok"
                                    value={summary.noAttendance}
                                    color="bg-orange-50 border-orange-200"
                                    icon={<WarningOutlined className="text-orange-500" />}
                                />
                            </div>

                            {/* Category summary badges */}
                            {results.summary?.category_summary && (
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => {
                                        const count = categorySummary[cat] || 0;
                                        if (count === 0) return null;
                                        const isActive = categoryFilter === cat;
                                        return (
                                            <Button
                                                key={cat}
                                                size="small"
                                                type={isActive ? 'primary' : 'default'}
                                                className={isActive ? '' : 'border-gray-300'}
                                                onClick={() => setCategoryFilter(isActive ? null : cat)}
                                            >
                                                {cfg.icon} {cfg.label}: <strong className="ml-1">{count}</strong>
                                            </Button>
                                        );
                                    })}
                                    {categoryFilter && (
                                        <Button size="small" onClick={() => setCategoryFilter(null)} type="link">
                                            Filtreyi Kaldır
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        icon={<DownloadOutlined />}
                                        onClick={handleExportCompareTxt}
                                        className="ml-auto"
                                    >
                                        TXT Rapor İndir
                                    </Button>
                                </div>
                            )}

                            {/* "Select all in category" quick action */}
                            {categoryFilter && !['MATCH', 'LEAVE_DAY', 'PARTIAL_LEAVE', 'HEALTH_REPORT_DAY'].includes(categoryFilter) && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="small"
                                        type="dashed"
                                        onClick={() => {
                                            const keys = filteredData
                                                .filter((m) => !(m.has_attendance && !m.has_difference))
                                                .map((m) => `${m.employee_id}_${m.work_date}`);
                                            setSelectedRows(keys);
                                            message.info(`${keys.length} kayıt seçildi (${CATEGORY_CONFIG[categoryFilter]?.label || categoryFilter})`);
                                        }}
                                    >
                                        Bu Gruptaki Tümünü Seç ({filteredData.filter((m) => !(m.has_attendance && !m.has_difference)).length})
                                    </Button>
                                    {categoryFilter === 'ABSENT_IN_SYSTEM' && (
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            loading={cleaning}
                                            onClick={() => {
                                                // Collect unique employee IDs from ABSENT rows
                                                const empMap = new Map();
                                                filteredData.forEach((m) => {
                                                    if (!empMap.has(m.employee_id)) {
                                                        empMap.set(m.employee_id, m.employee_name);
                                                    }
                                                });
                                                const ids = [...empMap.keys()];
                                                const names = [...empMap.values()];
                                                handleCleanupEmployees(ids, names);
                                            }}
                                        >
                                            Kalıntı Çalışanları Tamamen Sil ({(() => {
                                                const uniqueIds = new Set(filteredData.map(m => m.employee_id));
                                                return uniqueIds.size;
                                            })()})
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Unmatched employees — enhanced display */}
                            {results.unmatched_employees && results.unmatched_employees.length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    icon={<ExclamationCircleOutlined />}
                                    message={`Eşleştirilemeyen Sicil Numaraları (${results.unmatched_employees.length})`}
                                    description={
                                        <div className="mt-1">
                                            <div className="space-y-1">
                                                {results.unmatched_employees.map((emp) => (
                                                    <div key={emp.sicil_id} className="flex items-center gap-2 text-sm">
                                                        <Tag color="orange" className="font-mono">{emp.sicil_id}</Tag>
                                                        {emp.match_status === 'INACTIVE' ? (
                                                            <>
                                                                <Tag color="red">Pasif Çalışan</Tag>
                                                                <span className="font-medium">{emp.employee_name}</span>
                                                                <span className="text-gray-400">
                                                                    (ID: {emp.employee_id}{emp.department_name ? `, ${emp.department_name}` : ''}{emp.employment_status ? `, ${emp.employment_status}` : ''})
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Tag color="default">Bulunamadı</Tag>
                                                                {emp.csv_name && <span className="text-gray-500">CSV adı: {emp.csv_name}</span>}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    }
                                />
                            )}
                            {/* Fallback: old-style unmatched if enhanced not available */}
                            {!results.unmatched_employees && results.unmatched_sicil_ids && results.unmatched_sicil_ids.length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    icon={<ExclamationCircleOutlined />}
                                    message="Eşleştirilemeyen Sicil Numaraları"
                                    description={
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {results.unmatched_sicil_ids.map((id) => (
                                                <Tag key={id} color="orange" className="font-mono">{id}</Tag>
                                            ))}
                                        </div>
                                    }
                                />
                            )}

                            {/* Parse errors warning */}
                            {results.parse_errors && results.parse_errors.length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    className="mt-3"
                                    message={`${results.parse_errors.length} satır CSV'den ayrıştırılamadı`}
                                    description={
                                        <div className="mt-1 max-h-32 overflow-y-auto">
                                            <ul className="list-disc pl-4 text-xs">
                                                {results.parse_errors.slice(0, 20).map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                                {results.parse_errors.length > 20 && (
                                                    <li>...ve {results.parse_errors.length - 20} daha</li>
                                                )}
                                            </ul>
                                        </div>
                                    }
                                />
                            )}
                        </div>
                    )}

                    {/* --- Step 3: Results Table --- */}
                    {results && results.matches && results.matches.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            {/* Table toolbar */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={showOnlyDiff}
                                        onChange={(e) => setShowOnlyDiff(e.target.checked)}
                                    >
                                        <span className="text-sm">Sadece Farkları Göster</span>
                                    </Checkbox>
                                    <span className="text-xs text-gray-400">
                                        {filteredData.length} / {results.matches.length} kayıt
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedRows.length > 0 && (
                                        <Button
                                            type="primary"
                                            danger
                                            icon={<ToolOutlined />}
                                            onClick={handleFix}
                                            loading={fixing}
                                            disabled={fixing}
                                        >
                                            Seçilenleri Düzelt ({selectedRows.length})
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Main comparison table */}
                            <Table
                                dataSource={filteredData}
                                columns={columns}
                                rowKey={rowKey}
                                rowSelection={rowSelection}
                                expandable={{
                                    expandedRowRender: (record) => <ExpandedRowContent record={record} onFix={handleFixSingle} fixing={fixing} />,
                                    rowExpandable: () => true,
                                    defaultExpandedRowKeys: filteredData
                                        .filter((m) => m.has_difference || !m.has_attendance)
                                        .map((m) => `${m.employee_id}_${m.work_date}`),
                                }}
                                rowClassName={(record) => {
                                    if (!record.has_attendance) return 'pdks-row-missing';
                                    if (record.problem_category === 'ABSENT_IN_SYSTEM') return 'pdks-row-absent';
                                    if (['LEAVE_DAY', 'PARTIAL_LEAVE', 'HEALTH_REPORT_DAY'].includes(record.problem_category)) return 'pdks-row-leave';
                                    if (record.has_difference) return 'pdks-row-diff';
                                    return 'pdks-row-match';
                                }}
                                pagination={{
                                    defaultPageSize: 50,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['25', '50', '100', '150', '200'],
                                    showTotal: (total, range) =>
                                        `${range[0]}-${range[1]} / ${total} kayıt`,
                                }}
                                size="small"
                                bordered
                                scroll={{ x: 1100 }}
                                loading={comparing}
                                locale={{
                                    emptyText: 'Karşılaştırma sonucu bulunamadı.',
                                    filterConfirm: 'Filtrele',
                                    filterReset: 'Sıfırla',
                                }}
                            />

                            {/* Row color legend */}
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
                                    Eşleşiyor
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
                                    Fark Var / Oturum Uyumsuz
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300" />
                                    Kayıt Yok
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 rounded bg-purple-100 border border-purple-300" />
                                    Devamsız (ABSENT)
                                </span>
                            </div>
                        </div>
                    )}

                    {/* --- No differences message --- */}
                    {results && results.matches && results.matches.length > 0 && summary && summary.withDiff === 0 && summary.noAttendance === 0 && (
                        <Alert
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined />}
                            message="Tüm Kayıtlar Eşleşiyor"
                            description="CSV dosyasındaki tüm kart okuyucu verileri sistemdeki mesai kayıtları ile eşleşmektedir. Düzeltme yapılmasına gerek yoktur."
                        />
                    )}

                    {/* --- Step 5: Fix Results --- */}
                    {fixResults && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-base font-semibold text-gray-800 mb-4">
                                <ToolOutlined className="mr-2 text-green-500" />
                                Düzeltme Sonuçları
                            </h3>

                            {/* Fix summary */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-700">
                                        {fixResults.summary?.fixed || 0}
                                    </div>
                                    <div className="text-xs text-green-600 font-medium">Düzeltildi</div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-red-700">
                                        {fixResults.summary?.failed || 0}
                                    </div>
                                    <div className="text-xs text-red-600 font-medium">Hata</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-gray-700">
                                        {fixResults.summary?.skipped || 0}
                                    </div>
                                    <div className="text-xs text-gray-600 font-medium">Atlandı</div>
                                </div>
                            </div>

                            {/* Fix details table */}
                            {fixResults.results && fixResults.results.length > 0 && (
                                <Table
                                    dataSource={fixResults.results}
                                    columns={fixColumns}
                                    rowKey={(r) => `fix_${r.employee_id}_${r.work_date}`}
                                    pagination={false}
                                    size="small"
                                    bordered
                                    scroll={{ x: 1000 }}
                                    rowClassName={(record) => {
                                        if (record.status === 'fixed' || record.status === 'created')
                                            return 'pdks-row-match';
                                        if (record.status === 'failed')
                                            return 'pdks-row-diff';
                                        if (record.status === 'skipped')
                                            return 'pdks-row-missing';
                                        return '';
                                    }}
                                />
                            )}

                            {/* Errors list — filter failed results */}
                            {fixResults.results?.filter(r => r.status === 'failed').length > 0 && (
                                <Alert
                                    type="error"
                                    showIcon
                                    className="mt-4"
                                    message="Düzeltme Hataları"
                                    description={
                                        <ul className="list-disc pl-4 text-xs mt-1">
                                            {fixResults.results.filter(r => r.status === 'failed').map((err, i) => (
                                                <li key={i}>
                                                    <strong>{err.employee_name || `#${err.employee_id}`}</strong> ({err.work_date}): {err.error}
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                />
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ================================================================= */}
            {/* FULL RESET MODE                                                    */}
            {/* ================================================================= */}
            {mode === 'fullReset' && (
                <>
                    {/* --- Loading overlay --- */}
                    {(previewing || executing) && (
                        <div className="flex items-center justify-center py-12">
                            <Spin size="large" tip={previewing ? 'CSV analiz ediliyor (dry-run)... Bu işlem büyük dosyalarda 1-2 dakika sürebilir.' : 'Tam reset çalıştırılıyor...'}>
                                <div className="py-8 text-center text-gray-400 text-sm">
                                    {previewing ? 'Her çalışan-gün için simülasyon yapılıyor...' : 'Kayıtlar güncelleniyor...'}
                                </div>
                            </Spin>
                        </div>
                    )}

                    {/* --- Parse errors from preview --- */}
                    {resetPreview?.parse_errors?.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            message={`${resetPreview.parse_errors.length} satır CSV'den ayrıştırılamadı`}
                            description={
                                <div className="mt-1 max-h-32 overflow-y-auto">
                                    <ul className="list-disc pl-4 text-xs">
                                        {resetPreview.parse_errors.slice(0, 20).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {resetPreview.parse_errors.length > 20 && (
                                            <li>...ve {resetPreview.parse_errors.length - 20} daha</li>
                                        )}
                                    </ul>
                                </div>
                            }
                        />
                    )}

                    {/* --- Preview Results --- */}
                    {resetPreview && !resetResults && (
                        <div ref={previewResultsRef} className="space-y-4">
                            {/* Header with export button */}
                            <div className="flex items-center justify-between">
                                <h4 className="text-base font-semibold m-0">Dry-Run Analiz Sonuçları</h4>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExportPreviewTxt}
                                    size="small"
                                >
                                    TXT Rapor İndir
                                </Button>
                            </div>
                            {/* Summary stat cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                                <SummaryCard
                                    title="Eşleşen Çalışan"
                                    value={resetPreview.summary?.matched_employees || 0}
                                    color="bg-blue-50 border-blue-200"
                                    icon={<CheckCircleOutlined className="text-blue-500" />}
                                />
                                <SummaryCard
                                    title="Toplam Çalışan-Gün"
                                    value={resetPreview.summary?.total_employee_days || 0}
                                    color="bg-gray-50 border-gray-200"
                                    icon={<FileTextOutlined className="text-gray-500" />}
                                />
                                <SummaryCard
                                    title="Silinecek Attendance"
                                    value={resetPreview.summary?.total_attendance_to_delete || 0}
                                    color="bg-red-50 border-red-200"
                                    icon={<DeleteOutlined className="text-red-500" />}
                                />
                                <SummaryCard
                                    title="Oluşturulacak Session"
                                    value={resetPreview.summary?.total_csv_sessions_to_create || 0}
                                    color="bg-green-50 border-green-200"
                                    icon={<CheckCircleOutlined className="text-green-500" />}
                                />
                                <SummaryCard
                                    title="Silinecek Potansiyel FM"
                                    value={resetPreview.summary?.total_potential_ot_to_delete || 0}
                                    color="bg-orange-50 border-orange-200"
                                    icon={<WarningOutlined className="text-orange-500" />}
                                />
                                {(resetPreview.summary?.total_broken_ot || 0) > 0 && (
                                    <SummaryCard
                                        title="Bozuk Fazla Mesai (İptal)"
                                        value={resetPreview.summary.total_broken_ot}
                                        color="bg-red-50 border-red-200"
                                        icon={<CloseCircleOutlined className="text-red-500" />}
                                    />
                                )}
                                {(resetPreview.summary?.total_revised_ot || 0) > 0 && (
                                    <SummaryCard
                                        title="F. Mesai Revize (Düzeltme)"
                                        value={resetPreview.summary.total_revised_ot}
                                        color="bg-orange-50 border-orange-200"
                                        icon={<EditOutlined className="text-orange-500" />}
                                    />
                                )}
                                {(resetPreview.summary?.days_with_leave || 0) > 0 && (
                                    <SummaryCard
                                        title="İzinli Günler"
                                        value={resetPreview.summary.days_with_leave}
                                        color="bg-blue-50 border-blue-200"
                                        icon={<FileTextOutlined className="text-blue-500" />}
                                    />
                                )}
                            </div>

                            {/* Date range info */}
                            {resetPreview.summary?.date_range && (
                                <div className="text-sm text-gray-500">
                                    Tarih aralığı: <strong>{formatDate(resetPreview.summary.date_range[0])}</strong> — <strong>{formatDate(resetPreview.summary.date_range[1])}</strong>
                                </div>
                            )}

                            {/* Unmatched employees warning */}
                            {resetPreview.unmatched_employees?.length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    icon={<ExclamationCircleOutlined />}
                                    message={`Eşleştirilemeyen Sicil Numaraları (${resetPreview.unmatched_employees.length})`}
                                    description={
                                        <div className="mt-1 space-y-1">
                                            {resetPreview.unmatched_employees.map((emp) => (
                                                <div key={emp.sicil_id} className="flex items-center gap-2 text-sm">
                                                    <Tag color="orange" className="font-mono">{emp.sicil_id}</Tag>
                                                    {emp.csv_name && <span className="text-gray-500">CSV adı: {emp.csv_name}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    }
                                />
                            )}

                            {/* DB'de olup CSV'de olmayan çalışanlar */}
                            {resetPreview.db_employees_not_in_csv?.length > 0 && (
                                <Alert
                                    type="info"
                                    showIcon
                                    message={`DB'de Olup CSV'de Olmayan Çalışanlar (${resetPreview.db_employees_not_in_csv.length})`}
                                    description={
                                        <div className="mt-1 max-h-48 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-left text-gray-500">
                                                        <th className="pr-3">Sicil</th>
                                                        <th className="pr-3">Ad Soyad</th>
                                                        <th className="pr-3">Departman</th>
                                                        <th>Att. Sayısı</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {resetPreview.db_employees_not_in_csv.map((emp) => (
                                                        <tr key={emp.employee_id} className="border-t border-gray-100">
                                                            <td className="pr-3 font-mono">{emp.employee_code}</td>
                                                            <td className="pr-3">{emp.employee_name}</td>
                                                            <td className="pr-3 text-gray-500">{emp.department_name || '-'}</td>
                                                            <td className="font-mono">{emp.attendance_count}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    }
                                />
                            )}

                            {/* Preview detail table - grouped by employee */}
                            {groupedPreviewData.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="text-base font-semibold text-gray-800 mb-4">
                                        <FileTextOutlined className="mr-2 text-blue-500" />
                                        Önizleme Detayı ({groupedPreviewData.length} çalışan, {resetPreview.preview.length} çalışan-gün)
                                    </h3>
                                    <Table
                                        dataSource={groupedPreviewData}
                                        columns={employeeGroupColumns}
                                        rowKey="key"
                                        size="small"
                                        bordered
                                        pagination={{
                                            defaultPageSize: 100,
                                            showSizeChanger: true,
                                            pageSizeOptions: ['50', '100', '200'],
                                            showTotal: (total, range) =>
                                                `${range[0]}-${range[1]} / ${total} çalışan`,
                                        }}
                                        defaultExpandedRowKeys={groupedPreviewData.filter(g => g.hasChanges || g.hasAnomaly || g.hasBrokenOt || g.hasRevisedOt).map(g => g.key)}
                                        expandable={{
                                            expandedRowRender: (empRecord) => (
                                                <div className="pl-4">
                                                    <Table
                                                        dataSource={empRecord.days}
                                                        columns={resetPreviewColumns}
                                                        rowKey="key"
                                                        size="small"
                                                        bordered
                                                        pagination={false}
                                                        defaultExpandedRowKeys={empRecord.days.filter(d => d.has_changes || d.has_anomaly || d.broken_ot_requests?.length > 0 || d.revised_ot_requests?.some(r => r.changed)).map(d => d.key)}
                                                        expandable={{
                                                            expandedRowRender: (record) => (
                                                                <div className="space-y-3 p-2">
                                                                    {record.before && record.after && (
                                                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                                                <h4 className="text-xs font-semibold text-red-700 mb-2">Mevcut Durum (Silinecek)</h4>
                                                                                <div className="space-y-1 text-xs">
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Attendance:</span><span className="font-mono font-semibold">{record.before.attendance_count}</span></div>
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Toplam Saat:</span><span className="font-mono">{formatSeconds(record.before.total_seconds ?? record.before.total_hours * 3600)}</span></div>
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Normal:</span><span className="font-mono">{formatSeconds(record.before.normal_seconds ?? record.before.normal_hours * 3600)}</span></div>
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Ek Mesai:</span><span className="font-mono">{formatSeconds(record.before.overtime_seconds ?? record.before.overtime_hours * 3600)}</span></div>
                                                                                    {(record.before.break_seconds || record.before.break_minutes) > 0 && <div className="flex justify-between"><span className="text-gray-600">Mola:</span><span className="font-mono">{formatSeconds(record.before.break_seconds ?? record.before.break_minutes * 60)}</span></div>}
                                                                                    {(record.before.missing_seconds || record.before.missing_minutes) > 0 && <div className="flex justify-between"><span className="text-gray-600">Eksik:</span><span className="font-mono text-red-600">{formatSeconds(record.before.missing_seconds ?? record.before.missing_minutes * 60)}</span></div>}
                                                                                    {record.before.sessions?.length > 0 && (
                                                                                        <div className="mt-2 border-t border-red-200 pt-1">
                                                                                            <span className="text-gray-500 block mb-1">Oturumlar:</span>
                                                                                            {record.before.sessions.map((s, i) => (
                                                                                                <div key={i} className="font-mono text-gray-700 flex items-center gap-1">
                                                                                                    {s.check_in || '?'} — {s.check_out || '?'}
                                                                                                    <Tag size="small" className="ml-1 text-xs">{s.status}</Tag>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                                                <h4 className="text-xs font-semibold text-green-700 mb-2">Yeni Durum (Hesaplanan)</h4>
                                                                                <div className="space-y-1 text-xs">
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Attendance:</span><span className="font-mono font-semibold">{record.after.attendance_count}</span></div>
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Toplam Saat:</span><span className="font-mono">{formatSeconds(record.after.total_seconds ?? record.after.total_hours * 3600)}</span></div>
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Normal:</span><span className="font-mono">{formatSeconds(record.after.normal_seconds ?? record.after.normal_hours * 3600)}</span></div>
                                                                                    <div className="flex justify-between"><span className="text-gray-600">Ek Mesai:</span><span className="font-mono">{formatSeconds(record.after.overtime_seconds ?? record.after.overtime_hours * 3600)}</span></div>
                                                                                    {(record.after.break_seconds || record.after.break_minutes) > 0 && <div className="flex justify-between"><span className="text-gray-600">Mola:</span><span className="font-mono">{formatSeconds(record.after.break_seconds ?? record.after.break_minutes * 60)}</span></div>}
                                                                                    {(record.after.missing_seconds || record.after.missing_minutes) > 0 && <div className="flex justify-between"><span className="text-gray-600">Eksik:</span><span className="font-mono text-red-600">{formatSeconds(record.after.missing_seconds ?? record.after.missing_minutes * 60)}</span></div>}
                                                                                    {record.after.potential_ot_count > 0 && (
                                                                                        <div className="flex justify-between text-orange-600"><span>Potansiyel Fazla Mesai:</span><span className="font-mono font-semibold">{record.after.potential_ot_count}</span></div>
                                                                                    )}
                                                                                    {record.after.sessions?.length > 0 && (
                                                                                        <div className="mt-2 border-t border-green-200 pt-1">
                                                                                            <span className="text-gray-500 block mb-1">Oturumlar:</span>
                                                                                            {record.after.sessions.map((s, i) => (
                                                                                                <div key={i} className="font-mono text-gray-700 flex items-center gap-1">
                                                                                                    {s.check_in || '?'} — {s.check_out || '?'}
                                                                                                    <Tag size="small" className="ml-1 text-xs">{s.source}</Tag>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                    {record.after.potential_ot_details?.length > 0 && (
                                                                                        <div className="mt-2 border-t border-green-200 pt-1">
                                                                                            <span className="text-orange-600 block mb-1">Fazla Mesai Detayları:</span>
                                                                                            {record.after.potential_ot_details.map((ot, i) => (
                                                                                                <div key={i} className="font-mono text-orange-700">
                                                                                                    {ot.start_time} — {ot.end_time} ({formatSeconds(ot.duration_seconds)})
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {record.calculation_logs?.length > 0 && (
                                                                        <Collapse
                                                                            size="small"
                                                                            className="mb-3"
                                                                            items={[{
                                                                                key: 'calc-logs',
                                                                                label: <span className="text-xs font-semibold">Hesaplama Detayları ({record.calculation_logs.length} satır)</span>,
                                                                                children: (
                                                                                    <div className="bg-gray-50 rounded p-2 max-h-64 overflow-y-auto">
                                                                                        {record.calculation_logs.map((log, i) => {
                                                                                            let color = 'text-gray-600';
                                                                                            if (log.includes('[CONTEXT]')) color = 'text-blue-600';
                                                                                            else if (log.includes('[SNAP]')) color = 'text-orange-600';
                                                                                            else if (log.includes('[BREAK]')) color = 'text-green-600';
                                                                                            else if (log.includes('[CALC]')) color = 'text-purple-600';
                                                                                            else if (log.includes('[OT-REQ]')) color = 'text-red-600';
                                                                                            else if (log.includes('[ABSENT]')) color = 'text-yellow-700';
                                                                                            else if (log.includes('[SYNC]')) color = 'text-cyan-600';
                                                                                            else if (log.includes('[SIM-ERROR]')) color = 'text-red-700 font-bold';
                                                                                            return <div key={i} className={`font-mono text-xs leading-5 ${color}`}>{log}</div>;
                                                                                        })}
                                                                                    </div>
                                                                                ),
                                                                            }]}
                                                                        />
                                                                    )}
                                                                    {record.csv_sessions?.length > 0 && (
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-gray-600 mb-1">CSV Oturumları:</h4>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {record.csv_sessions.map((s, i) => (
                                                                                    <Tag key={i} color="green" className="font-mono text-xs">
                                                                                        {s.check_in || '?'} — {s.check_out || '?'}
                                                                                    </Tag>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {record.broken_ot_requests?.length > 0 && (
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-red-700 mb-1">Bozuk Fazla Mesai Talepleri (otomatik iptal edilecek):</h4>
                                                                            <div className="space-y-1">
                                                                                {record.broken_ot_requests.map((ot) => (
                                                                                    <div key={ot.id} className="flex items-center gap-2 text-xs">
                                                                                        <Tag color="red">{ot.status} - İPTAL</Tag>
                                                                                        <span className="font-mono line-through">{ot.start_time} — {ot.end_time}</span>
                                                                                        <span className="text-red-400">({formatSeconds(ot.duration_seconds)})</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {record.revised_ot_requests?.some(r => r.changed) && (
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-orange-700 mb-1">Fazla Mesai Talepleri Revize (süre düzeltme):</h4>
                                                                            <div className="space-y-1">
                                                                                {record.revised_ot_requests.filter(r => r.changed).map((ot) => (
                                                                                    <div key={ot.id} className="flex items-center gap-2 text-xs">
                                                                                        <Tag color={ot.no_match ? "red" : "orange"}>{ot.status} {ot.no_match ? '- SİL (0sa)' : '- REVİZE'}</Tag>
                                                                                        {ot.no_match ? (
                                                                                            <span className="font-mono line-through text-red-500">{ot.old_start} — {ot.old_end} ({formatSeconds(ot.old_duration)})</span>
                                                                                        ) : (
                                                                                            <>
                                                                                                <span className="font-mono line-through text-gray-400">{ot.old_start} — {ot.old_end} ({formatSeconds(ot.old_duration)})</span>
                                                                                                <span className="text-orange-600 font-bold mx-1">&rarr;</span>
                                                                                                <span className="font-mono text-green-700">{ot.new_start} — {ot.new_end} ({formatSeconds(ot.new_duration)})</span>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {record.preserved_ot_requests?.length > 0 && (
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-purple-700 mb-1">Korunan Fazla Mesai Talepleri:</h4>
                                                                            <div className="space-y-1">
                                                                                {record.preserved_ot_requests.map((ot) => (
                                                                                    <div key={ot.id} className="flex items-center gap-2 text-xs">
                                                                                        <Tag color="purple">{ot.status}</Tag>
                                                                                        <span className="font-mono">{ot.start_time} — {ot.end_time}</span>
                                                                                        <span className="text-gray-400">({formatSeconds(ot.duration_seconds)})</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {record.approved_leaves?.length > 0 && (
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-blue-700 mb-1">Onaylı İzinler:</h4>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {record.approved_leaves.map((lv, i) => (
                                                                                    <Tag key={i} color="blue" className="text-xs">
                                                                                        {lv.leave_type || lv.request_type_name || 'İzin'} ({lv.status})
                                                                                    </Tag>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {record.approved_cardless_entries?.length > 0 && (
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-cyan-700 mb-1">Kartsız Giriş:</h4>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {record.approved_cardless_entries.map((ce, i) => (
                                                                                    <Tag key={i} color="cyan" className="font-mono text-xs">
                                                                                        {ce.check_in || '?'} — {ce.check_out || '?'}
                                                                                    </Tag>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {record.external_duties?.length > 0 && (
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-indigo-700 mb-1">Dış Görevler:</h4>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {record.external_duties.map((ed, i) => (
                                                                                    <Tag key={i} color="geekblue" className="text-xs">
                                                                                        {ed.description || ed.location || 'Dış Görev'}
                                                                                    </Tag>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ),
                                                            rowExpandable: (r) =>
                                                                (r.before && r.after) ||
                                                                (r.calculation_logs?.length > 0) ||
                                                                (r.csv_sessions?.length > 0) ||
                                                                (r.preserved_ot_requests?.length > 0) ||
                                                                (r.approved_leaves?.length > 0) ||
                                                                (r.approved_cardless_entries?.length > 0) ||
                                                                (r.external_duties?.length > 0),
                                                        }}
                                                    />
                                                </div>
                                            ),
                                        }}
                                    />
                                </div>
                            )}

                            {/* Execute + Export buttons */}
                            <div className="flex justify-center gap-3 pt-2">
                                <Button
                                    icon={<DownloadOutlined />}
                                    size="large"
                                    onClick={handleExportPreviewTxt}
                                >
                                    TXT Rapor İndir
                                </Button>
                                <Button
                                    type="primary"
                                    danger
                                    size="large"
                                    icon={<ThunderboltOutlined />}
                                    onClick={handleResetExecute}
                                    loading={executing}
                                    disabled={executing || !resetPreview?.preview?.length}
                                >
                                    Onayla ve Tam Reset Çalıştır
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* --- Execution Results --- */}
                    {resetResults && (
                        <div className="space-y-4">
                            {/* Summary alert */}
                            <Alert
                                type={(resetResults.summary?.failed || 0) === 0 ? 'success' : 'warning'}
                                showIcon
                                message={
                                    (resetResults.summary?.failed || 0) === 0
                                        ? `Tam reset başarıyla tamamlandı: ${resetResults.summary?.success || 0} başarılı, ${resetResults.summary?.skipped || 0} atlandı.`
                                        : `Tam reset tamamlandı: ${resetResults.summary?.success || 0} başarılı, ${resetResults.summary?.failed || 0} hata, ${resetResults.summary?.skipped || 0} atlandı.`
                                }
                            />

                            {/* Audit alert */}
                            {resetResults.audit_summary?.total_issues > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    icon={<ExclamationCircleOutlined />}
                                    message={`Denetim: ${resetResults.audit_summary.total_issues} sorun tespit edildi`}
                                    description={
                                        <div className="mt-1 text-xs">
                                            {Object.entries(resetResults.audit_summary.categories || {}).map(([cat, val]) => (
                                                <div key={cat}>
                                                    <strong>{cat}:</strong> {typeof val === 'object' ? (val.count ?? JSON.stringify(val)) : val}
                                                </div>
                                            ))}
                                        </div>
                                    }
                                />
                            )}

                            {/* Summary stat cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-700">
                                        {resetResults.summary?.success || 0}
                                    </div>
                                    <div className="text-xs text-green-600 font-medium">Başarılı</div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-red-700">
                                        {resetResults.summary?.failed || 0}
                                    </div>
                                    <div className="text-xs text-red-600 font-medium">Hata</div>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-orange-700">
                                        {resetResults.summary?.skipped || 0}
                                    </div>
                                    <div className="text-xs text-orange-600 font-medium">Atlandı</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-700">
                                        {resetResults.summary?.total || 0}
                                    </div>
                                    <div className="text-xs text-blue-600 font-medium">Toplam</div>
                                </div>
                            </div>

                            {/* Results table */}
                            {resetResults.results?.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <h3 className="text-base font-semibold text-gray-800 mb-4">
                                        <ReloadOutlined className="mr-2 text-green-500" />
                                        Reset Sonuçları
                                    </h3>
                                    <Table
                                        dataSource={resetResults.results}
                                        columns={resetResultColumns}
                                        rowKey={(r) => `reset_${r.employee_id}_${r.work_date}`}
                                        size="small"
                                        bordered
                                        scroll={{ x: 1200 }}
                                        pagination={{
                                            defaultPageSize: 50,
                                            showSizeChanger: true,
                                            pageSizeOptions: ['25', '50', '100', '200'],
                                            showTotal: (total, range) =>
                                                `${range[0]}-${range[1]} / ${total} kayıt`,
                                        }}
                                        rowClassName={(record) => {
                                            if (record.status === 'success') return 'pdks-row-match';
                                            if (record.status === 'failed') return 'pdks-row-diff';
                                            if (record.status === 'skipped') return 'pdks-row-missing';
                                            return '';
                                        }}
                                    />
                                </div>
                            )}

                            {/* Parse errors from execute */}
                            {resetResults.parse_errors?.length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message={`${resetResults.parse_errors.length} satır CSV'den ayrıştırılamadı`}
                                    description={
                                        <div className="mt-1 max-h-32 overflow-y-auto">
                                            <ul className="list-disc pl-4 text-xs">
                                                {resetResults.parse_errors.slice(0, 20).map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                                {resetResults.parse_errors.length > 20 && (
                                                    <li>...ve {resetResults.parse_errors.length - 20} daha</li>
                                                )}
                                            </ul>
                                        </div>
                                    }
                                />
                            )}

                            {/* Geri Al butonu */}
                            {resetResults.snapshot_id && (
                                <div className="flex justify-center pt-3">
                                    <Button
                                        danger
                                        size="large"
                                        icon={<RollbackOutlined />}
                                        onClick={handleUndo}
                                        loading={undoing}
                                        disabled={undoing}
                                    >
                                        {undoing ? 'Geri Alınıyor...' : 'Geri Al (Reset Öncesine Dön)'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* --- Inline styles for row coloring --- */}
            <style>{`
                .pdks-row-match td {
                    background-color: #f0fdf4 !important;
                }
                .pdks-row-match:hover td {
                    background-color: #dcfce7 !important;
                }
                .pdks-row-diff td {
                    background-color: #fef2f2 !important;
                }
                .pdks-row-diff:hover td {
                    background-color: #fee2e2 !important;
                }
                .pdks-row-missing td {
                    background-color: #fff7ed !important;
                }
                .pdks-row-missing:hover td {
                    background-color: #ffedd5 !important;
                }
                .pdks-row-absent td {
                    background-color: #faf5ff !important;
                }
                .pdks-row-absent:hover td {
                    background-color: #f3e8ff !important;
                }
                .pdks-row-leave td {
                    background-color: #ecfeff !important;
                }
                .pdks-row-leave:hover td {
                    background-color: #cffafe !important;
                }
                .pdks-row-system-only td {
                    background-color: #eff6ff !important;
                }
                .pdks-row-system-only:hover td {
                    background-color: #dbeafe !important;
                }
            `}</style>

            {/* ============================================================= */}
            {/* Real-time Reset Log Modal                                      */}
            {/* ============================================================= */}
            <Modal
                open={logModalOpen}
                title={
                    <div className="flex items-center gap-2">
                        <CodeOutlined />
                        <span>PDKS Tam Reset — Canlı İşlem Logu</span>
                        {resetProgress?.status === 'running' && (
                            <LoadingOutlined spin style={{ color: '#1677ff', marginLeft: 8 }} />
                        )}
                        {resetProgress?.status === 'completed' && (
                            <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />
                        )}
                        {resetProgress?.status === 'error' && (
                            <CloseCircleOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />
                        )}
                    </div>
                }
                width={720}
                footer={
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                            {resetProgress?.status === 'running' && resetProgress?.total_items > 0 && (
                                <span>
                                    İşleniyor: {resetProgress.current_item} / {resetProgress.total_items}
                                    {' — '}
                                    {Math.round((resetProgress.current_item / resetProgress.total_items) * 100)}%
                                </span>
                            )}
                            {resetProgress?.status === 'completed' && (
                                <span className="text-green-600 font-medium">
                                    Tamamlandı: {resetProgress.success_count || 0} başarılı, {resetProgress.skip_count || 0} atlandı, {resetProgress.fail_count || 0} hata
                                </span>
                            )}
                        </div>
                        <Button
                            onClick={() => setLogModalOpen(false)}
                            disabled={resetProgress?.status === 'running'}
                        >
                            {resetProgress?.status === 'running' ? 'İşlem devam ediyor...' : 'Kapat'}
                        </Button>
                    </div>
                }
                closable={resetProgress?.status !== 'running'}
                maskClosable={false}
                onCancel={() => {
                    if (resetProgress?.status !== 'running') setLogModalOpen(false);
                }}
            >
                {/* Progress bar */}
                {resetProgress?.status === 'running' && resetProgress?.total_items > 0 && (
                    <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: `${Math.round((resetProgress.current_item / resetProgress.total_items) * 100)}%`,
                                    backgroundColor: '#1677ff',
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Terminal-style log area */}
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 8,
                        padding: '12px 16px',
                        height: 400,
                        overflowY: 'auto',
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                        fontSize: 12,
                        lineHeight: '1.7',
                    }}
                >
                    {resetLogs.map((entry, idx) => {
                        const colors = {
                            step: '#60a5fa',    // blue
                            info: '#d1d5db',    // gray
                            success: '#4ade80', // green
                            warning: '#fbbf24', // yellow
                            error: '#f87171',   // red
                            done: '#34d399',    // emerald
                        };
                        const icons = {
                            step: '▸',
                            info: ' ',
                            success: '✓',
                            warning: '⚠',
                            error: '✗',
                            done: '★',
                        };
                        const color = colors[entry.type] || '#d1d5db';
                        const icon = icons[entry.type] || ' ';
                        return (
                            <div key={idx} style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                <span style={{ color: '#6b7280', marginRight: 8 }}>{entry.time}</span>
                                <span style={{ marginRight: 6 }}>{icon}</span>
                                {entry.msg}
                            </div>
                        );
                    })}
                    {resetProgress?.status === 'running' && (
                        <div style={{ color: '#6b7280' }}>
                            <LoadingOutlined spin style={{ marginRight: 6 }} />
                            İşleniyor...
                        </div>
                    )}
                    <div ref={logEndRef} />
                </div>
            </Modal>
        </div>
    );
}
