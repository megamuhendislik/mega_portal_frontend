import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import {
    Package, Plus, Settings, Shield, Trash2, RefreshCw,
    Monitor, Users, Copy, Eye, EyeOff, X, Check, Ban,
    Clock, Activity, ChevronRight, AlertTriangle, Key, Search, UserCheck
} from 'lucide-react';

const ProgramManagement = () => {
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [accessList, setAccessList] = useState([]);
    const [accessLogs, setAccessLogs] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState('devices');
    const [loading, setLoading] = useState(true);
    const [showKey, setShowKey] = useState({});

    // Fetch Programs
    const fetchPrograms = async () => {
        setLoading(true);
        try {
            const res = await api.get('/external-programs/');
            setPrograms(res.data);
        } catch (err) {
            console.error('Programs fetch error:', err);
        }
        setLoading(false);
    };

    // Fetch Dashboard Stats
    const fetchDashboard = async () => {
        try {
            const res = await api.get('/external-programs/dashboard/');
            setDashboard(res.data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }
    };

    useEffect(() => {
        fetchPrograms();
        fetchDashboard();
    }, []);

    // Select Program & Load Details
    const selectProgram = async (program) => {
        setSelectedProgram(program);
        setActiveTab('devices');
        try {
            const [accessRes, logsRes] = await Promise.all([
                api.get(`/external-programs/${program.id}/access_list/`),
                api.get(`/external-programs/${program.id}/access_logs/`)
            ]);
            setAccessList(accessRes.data);
            setAccessLogs(logsRes.data);
        } catch (err) {
            console.error('Detail fetch error:', err);
        }
    };

    // Toggle Device Status
    const toggleDevice = async (accessId) => {
        try {
            await api.post(`/external-programs/${selectedProgram.id}/toggle_device/`, {
                access_id: accessId
            });
            selectProgram(selectedProgram); // Refresh
        } catch (err) {
            console.error('Toggle error:', err);
        }
    };

    // Regenerate Key
    const regenerateKey = async (programId) => {
        if (!confirm('⚠️ Dikkat! Anahtar yenilenirse tüm mevcut bağlantılar kesilir. Devam etmek istiyor musunuz?')) return;
        try {
            const res = await api.post(`/external-programs/${programId}/regenerate_key/`);
            alert(`Yeni Anahtar: ${res.data.new_key}`);
            fetchPrograms();
            if (selectedProgram?.id === programId) {
                setSelectedProgram(prev => ({ ...prev, program_key: res.data.new_key }));
            }
        } catch (err) {
            console.error('Regenerate error:', err);
        }
    };

    // Delete Program
    const deleteProgram = async (programId) => {
        if (!confirm('Bu programı silmek istediğinize emin misiniz? Tüm erişim kayıtları da silinecektir.')) return;
        try {
            await api.delete(`/external-programs/${programId}/`);
            setSelectedProgram(null);
            fetchPrograms();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    // Update Program
    const updateProgram = async (programId, data) => {
        try {
            await api.patch(`/external-programs/${programId}/`, data);
            fetchPrograms();
            if (selectedProgram?.id === programId) {
                setSelectedProgram(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error('Update error:', err);
        }
    };

    // Copy to Clipboard
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const resultColors = {
        SUCCESS: 'bg-green-100 text-green-700',
        INVALID_KEY: 'bg-red-100 text-red-700',
        INVALID_CREDENTIALS: 'bg-red-100 text-red-700',
        PROGRAM_INACTIVE: 'bg-yellow-100 text-yellow-700',
        VERSION_REJECTED: 'bg-orange-100 text-orange-700',
        HWID_BLOCKED: 'bg-red-100 text-red-700',
        HWID_LIMIT: 'bg-orange-100 text-orange-700',
        USER_INACTIVE: 'bg-gray-100 text-gray-700',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Program Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">Harici yazılımları, versiyonlarını ve cihaz erişimlerini yönetin</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={18} />
                    Yeni Program
                </button>
            </div>

            {/* Dashboard Stats */}
            {dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg"><Package size={20} className="text-blue-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{dashboard.total_programs}</p>
                                <p className="text-xs text-slate-500">Toplam Program</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 rounded-lg"><Check size={20} className="text-green-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{dashboard.active_programs}</p>
                                <p className="text-xs text-slate-500">Aktif Program</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg"><Monitor size={20} className="text-purple-600" /></div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{dashboard.total_devices}</p>
                                <p className="text-xs text-slate-500">Kayıtlı Cihaz</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Program List (Left Panel) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="font-semibold text-slate-800">Programlar</h2>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
                        ) : programs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Package size={40} className="mx-auto mb-2 opacity-50" />
                                <p>Henüz program eklenmemiş</p>
                            </div>
                        ) : programs.map(prog => (
                            <button
                                key={prog.id}
                                onClick={() => selectProgram(prog)}
                                className={`w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedProgram?.id === prog.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                    }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${prog.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="font-medium text-slate-800">{prog.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span>v{prog.current_version}</span>
                                        <span>•</span>
                                        <span>{prog.active_users} kullanıcı</span>
                                        <span>•</span>
                                        <span>{prog.total_devices} cihaz</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-400" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Program Detail (Right Panel) */}
                <div className="lg:col-span-2">
                    {!selectedProgram ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                            <Settings size={48} className="mx-auto mb-3 opacity-30" />
                            <p>Detayları görüntülemek için bir program seçin</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Program Header */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedProgram.is_active ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <Package size={24} className={selectedProgram.is_active ? 'text-green-600' : 'text-red-600'} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">{selectedProgram.name}</h2>
                                            <p className="text-sm text-slate-500">{selectedProgram.description || 'Açıklama yok'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateProgram(selectedProgram.id, { is_active: !selectedProgram.is_active })}
                                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedProgram.is_active
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                }`}
                                        >
                                            {selectedProgram.is_active ? 'Devre Dışı Bırak' : 'Aktif Et'}
                                        </button>
                                        <button
                                            onClick={() => deleteProgram(selectedProgram.id)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Key & Version Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Program Anahtarı</label>
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm font-mono text-slate-700 flex-1 truncate">
                                                {showKey[selectedProgram.id]
                                                    ? selectedProgram.program_key
                                                    : selectedProgram.program_key_display}
                                            </code>
                                            <button onClick={() => setShowKey(prev => ({ ...prev, [selectedProgram.id]: !prev[selectedProgram.id] }))}
                                                className="p-1 hover:bg-slate-200 rounded">
                                                {showKey[selectedProgram.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                            <button onClick={() => copyToClipboard(selectedProgram.program_key)}
                                                className="p-1 hover:bg-slate-200 rounded">
                                                <Copy size={14} />
                                            </button>
                                            <button onClick={() => regenerateKey(selectedProgram.id)}
                                                className="p-1 hover:bg-red-100 text-red-500 rounded" title="Anahtarı Yenile">
                                                <RefreshCw size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <label className="text-xs font-medium text-slate-500 mb-1 block">Güncel Sürüm</label>
                                            <VersionEditor
                                                value={selectedProgram.current_version}
                                                onSave={(v) => updateProgram(selectedProgram.id, { current_version: v })}
                                            />
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <label className="text-xs font-medium text-slate-500 mb-1 block">Min. Sürüm</label>
                                            <VersionEditor
                                                value={selectedProgram.min_version}
                                                onSave={(v) => updateProgram(selectedProgram.id, { min_version: v })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="flex border-b border-slate-100">
                                    {[
                                        { key: 'devices', label: 'Cihazlar', icon: Monitor },
                                        { key: 'users', label: 'Yetkili Kullanıcılar', icon: UserCheck },
                                        { key: 'logs', label: 'Erişim Logları', icon: Activity },
                                        { key: 'docs', label: 'API Rehberi', icon: Shield },
                                        { key: 'snippet', label: 'Python Kodu', icon: Key },
                                        { key: 'settings', label: 'Ayarlar', icon: Settings },
                                    ].map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <tab.icon size={16} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4">
                                    {activeTab === 'devices' && (
                                        <DevicesTab
                                            accessList={accessList}
                                            onToggle={toggleDevice}
                                        />
                                    )}
                                    {activeTab === 'logs' && (
                                        <LogsTab logs={accessLogs} resultColors={resultColors} />
                                    )}
                                    {activeTab === 'users' && (
                                        <UsersTab
                                            program={selectedProgram}
                                            onUpdate={(data) => {
                                                updateProgram(selectedProgram.id, data);
                                            }}
                                            onRefresh={() => fetchPrograms()}
                                        />
                                    )}
                                    {activeTab === 'docs' && (
                                        <DocsTab program={selectedProgram} />
                                    )}
                                    {activeTab === 'snippet' && (
                                        <SnippetTab programKey={selectedProgram.program_key} />
                                    )}
                                    {activeTab === 'settings' && (
                                        <SettingsTab
                                            program={selectedProgram}
                                            onUpdate={(data) => updateProgram(selectedProgram.id, data)}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateProgramModalV2
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchPrograms(); fetchDashboard(); }}
                />
            )}
        </div>
    );
};


// ========== SUB-COMPONENTS ==========

const VersionEditor = ({ value, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);

    if (!editing) {
        return (
            <span
                className="text-sm font-mono text-slate-700 cursor-pointer hover:text-blue-600"
                onClick={() => { setVal(value); setEditing(true); }}
            >
                v{value}
            </span>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-20 px-2 py-0.5 text-sm border rounded"
                autoFocus
            />
            <button onClick={() => { onSave(val); setEditing(false); }}
                className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
            <button onClick={() => setEditing(false)}
                className="p-0.5 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
        </div>
    );
};


const DevicesTab = ({ accessList, onToggle }) => {
    if (accessList.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <Monitor size={32} className="mx-auto mb-2 opacity-50" />
                <p>Henüz kayıtlı cihaz yok</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {accessList.map(access => (
                <div key={access.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${access.status === 'ACTIVE' ? 'bg-green-500' :
                            access.status === 'BLOCKED' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                        <div>
                            <p className="font-medium text-sm text-slate-700">{access.user_name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-mono">{access.hwid?.substring(0, 16)}...</span>
                                <span>•</span>
                                <span>{access.device_name || 'Bilinmeyen'}</span>
                                <span>•</span>
                                <span>v{access.last_version || '?'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right text-xs text-slate-500">
                            <p>Son: {access.last_access ? new Date(access.last_access).toLocaleString('tr-TR') : '-'}</p>
                            <p>{access.access_count} giriş • {access.last_ip || '-'}</p>
                        </div>
                        <button
                            onClick={() => onToggle(access.id)}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${access.status === 'ACTIVE'
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                        >
                            {access.status === 'ACTIVE' ? 'Engelle' : 'İzin Ver'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};


const LogsTab = ({ logs, resultColors }) => {
    if (logs.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <Activity size={32} className="mx-auto mb-2 opacity-50" />
                <p>Henüz erişim logu yok</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <th className="px-3 py-2 text-left">Zaman</th>
                        <th className="px-3 py-2 text-left">Kullanıcı</th>
                        <th className="px-3 py-2 text-left">Sonuç</th>
                        <th className="px-3 py-2 text-left">Sürüm</th>
                        <th className="px-3 py-2 text-left">HWID</th>
                        <th className="px-3 py-2 text-left">IP</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-xs text-slate-600">
                                {new Date(log.timestamp).toLocaleString('tr-TR')}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-700">{log.username}</td>
                            <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${resultColors[log.result] || 'bg-slate-100'}`}>
                                    {log.result}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-xs font-mono">{log.version || '-'}</td>
                            <td className="px-3 py-2 text-xs font-mono">{log.hwid?.substring(0, 12) || '-'}</td>
                            <td className="px-3 py-2 text-xs font-mono">{log.ip_address || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const SnippetTab = ({ programKey }) => {
    const snippet = `# mega_auth.py — MegaPortal Kimlik Doğrulama
import os, json, time, uuid, platform, hashlib, getpass
try:
    import requests
except ImportError:
    print("pip install requests"); exit(1)

BASE_URL = "https://mega-portal-production.up.railway.app/api"
PROGRAM_KEY = "${programKey}"
APP_VERSION = "1.0.0"
CACHE_FILE = os.path.join(os.path.expanduser("~"), ".mega_auth_cache.json")

def get_hwid():
    raw = f"{uuid.getnode()}-{platform.node()}-{platform.machine()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]

def load_cache():
    try:
        with open(CACHE_FILE, 'r') as f: return json.load(f)
    except: return None

def save_cache(data):
    with open(CACHE_FILE, 'w') as f: json.dump(data, f)

def login(username, password):
    resp = requests.post(f"{BASE_URL}/external-auth/login/", json={
        "program_key": PROGRAM_KEY, "username": username,
        "password": password, "hwid": get_hwid(),
        "device_name": platform.node(), "version": APP_VERSION
    }, timeout=10)
    data = resp.json()
    if resp.status_code == 200 and data.get('status') == 'success':
        save_cache({"token": data["token"], "user": data["user"]["name"],
                     "expires_at": time.time() + 5 * 3600})
        return True, data["user"]["name"]
    return False, data.get("message", "Hata")

def authenticate():
    cache = load_cache()
    if cache and time.time() < cache.get("expires_at", 0):
        print(f"✅ Hoş geldiniz, {cache['user']}"); return True
    print("\\n🔐 MegaPortal Kimlik Doğrulama")
    for i in range(3):
        ok, msg = login(input("Kullanıcı: "), getpass.getpass("Şifre: "))
        if ok: print(f"✅ Giriş başarılı, {msg}"); return True
        print(f"❌ {msg} | Kalan: {2-i}")
    print("🚫 Başarısız."); exit(1)

# Kullanım: from mega_auth import authenticate; authenticate()`;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">mega_auth.py</code> olarak kaydedin
                </p>
                <button
                    onClick={() => navigator.clipboard.writeText(snippet)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    <Copy size={14} /> Kopyala
                </button>
            </div>
            <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-[400px] overflow-y-auto">
                <code>{snippet}</code>
            </pre>
        </div>
    );
};


const DocsTab = ({ program }) => {
    const baseUrl = "https://mega-portal-production.up.railway.app/api";
    const copyJson = (obj) => navigator.clipboard.writeText(JSON.stringify(obj, null, 2));

    const endpoints = [
        {
            method: 'POST',
            path: '/external-auth/login/',
            title: 'Giriş (Login)',
            desc: 'Kullanıcıyı doğrular ve JWT token döner.',
            request: {
                program_key: program?.program_key || 'YOUR_PROGRAM_KEY',
                username: 'kullanici_adi',
                password: '********',
                hwid: 'abc123...def456',
                device_name: 'BILGISAYAR-ADI',
                version: program?.current_version || '1.0.0'
            },
            successResponse: {
                status: 'success',
                token: 'eyJ0eXAiOiJKV1...',
                refresh: 'eyJ0eXAiOiJKV1...',
                user: { name: 'Ad Soyad', employee_id: 1 }
            },
            errorCodes: [
                { code: 'INVALID_KEY', desc: 'Program anahtarı geçersiz', status: 401 },
                { code: 'PROGRAM_INACTIVE', desc: 'Program devre dışı (Kill Switch)', status: 403 },
                { code: 'VERSION_REJECTED', desc: 'İstemci sürümü çok eski', status: 403 },
                { code: 'INVALID_CREDENTIALS', desc: 'Kullanıcı adı/şifre hatalı', status: 401 },
                { code: 'USER_INACTIVE', desc: 'Kullanıcı hesabı pasif', status: 401 },
                { code: 'HWID_BLOCKED', desc: 'Bu cihaz engellenmiş', status: 403 },
                { code: 'HWID_LIMIT', desc: 'Cihaz limiti aşıldı', status: 403 },
            ]
        },
        {
            method: 'GET',
            path: '/external-auth/verify/',
            title: 'Oturum Doğrulama (Verify)',
            desc: 'Mevcut token ve programın hâlâ geçerli olduğunu kontrol eder.',
            headers: { Authorization: 'Bearer eyJ0eXAi...' },
            params: { program_key: 'YOUR_KEY', version: '1.0.0' },
            successResponse: {
                valid: true,
                user: 'kullanici_adi',
                program_active: true,
                current_version: program?.current_version || '1.0.0',
                min_version: program?.min_version || '1.0.0'
            }
        }
    ];

    return (
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-amber-800">Güvenlik Uyarısı</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc pl-4">
                        <li><strong>Program Anahtarı (Secret Key)</strong> gizli tutulmalıdır. Kaynak kodda açık bırakmayın.</li>
                        <li>Token'lar <strong>5 saat</strong> geçerlidir. Süresi dolan token'lar reddedilir.</li>
                        <li>HWID kilidi açıksa, aynı kullanıcı en fazla <strong>{program?.max_devices_per_user || 2} cihaz</strong> kaydedebilir.</li>
                        <li>Program <strong>devre dışı</strong> bırakılırsa tüm bağlantılar anlık kesilir (Kill Switch).</li>
                        <li>Anahtar yenilendiğinde (<strong>Regenerate</strong>) mevcut tüm istemciler güncellenmeli.</li>
                    </ul>
                </div>
            </div>

            {/* Connection Info */}
            <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Bağlantı Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                        <span className="text-slate-500">Base URL</span>
                        <div className="font-mono bg-white px-2 py-1 rounded border border-slate-200 mt-0.5 flex items-center justify-between">
                            <span className="truncate">{baseUrl}</span>
                            <button onClick={() => navigator.clipboard.writeText(baseUrl)} className="ml-1 p-0.5 hover:bg-slate-100 rounded"><Copy size={12} /></button>
                        </div>
                    </div>
                    <div>
                        <span className="text-slate-500">Program Key</span>
                        <div className="font-mono bg-white px-2 py-1 rounded border border-slate-200 mt-0.5 flex items-center justify-between">
                            <span className="truncate">{String(program?.program_key || '').substring(0, 12)}...</span>
                            <button onClick={() => navigator.clipboard.writeText(program?.program_key)} className="ml-1 p-0.5 hover:bg-slate-100 rounded"><Copy size={12} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Endpoints */}
            {endpoints.map((ep, i) => (
                <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${ep.method === 'POST' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ep.method}</span>
                            <code className="text-sm font-mono text-slate-700">{ep.path}</code>
                        </div>
                        <span className="text-xs text-slate-500">{ep.title}</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <p className="text-sm text-slate-600">{ep.desc}</p>

                        {/* Headers */}
                        {ep.headers && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1">Headers</p>
                                <pre className="bg-slate-900 text-slate-300 p-3 rounded text-xs overflow-x-auto"><code>{JSON.stringify(ep.headers, null, 2)}</code></pre>
                            </div>
                        )}

                        {/* Request Body / Params */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-slate-500">{ep.request ? 'Request Body (JSON)' : 'Query Params'}</p>
                                <button onClick={() => copyJson(ep.request || ep.params)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Copy size={10} /> Kopyala</button>
                            </div>
                            <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs overflow-x-auto"><code>{JSON.stringify(ep.request || ep.params, null, 2)}</code></pre>
                        </div>

                        {/* Success Response */}
                        <div>
                            <p className="text-xs font-semibold text-green-600 mb-1">✅ Başarılı Yanıt (200)</p>
                            <pre className="bg-slate-900 text-blue-300 p-3 rounded text-xs overflow-x-auto"><code>{JSON.stringify(ep.successResponse, null, 2)}</code></pre>
                        </div>

                        {/* Error Codes */}
                        {ep.errorCodes && (
                            <div>
                                <p className="text-xs font-semibold text-red-600 mb-1">❌ Hata Kodları</p>
                                <div className="border border-slate-200 rounded overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead><tr className="bg-slate-50"><th className="px-3 py-1.5 text-left">Kod</th><th className="px-3 py-1.5 text-left">Açıklama</th><th className="px-3 py-1.5 text-center">HTTP</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {ep.errorCodes.map(ec => (
                                                <tr key={ec.code}>
                                                    <td className="px-3 py-1.5 font-mono text-red-600">{ec.code}</td>
                                                    <td className="px-3 py-1.5 text-slate-600">{ec.desc}</td>
                                                    <td className="px-3 py-1.5 text-center">{ec.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Auth Flow Diagram */}
            <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Kimlik Doğrulama Akışı</h4>
                <div className="space-y-2 text-xs">
                    {[
                        { step: '1', text: 'İstemci → POST /external-auth/login/', detail: 'program_key + kullanıcı bilgileri + HWID gönderilir' },
                        { step: '2', text: 'Sunucu → Program Key kontrolü', detail: 'Geçersiz key = 401 INVALID_KEY' },
                        { step: '3', text: 'Sunucu → Program aktif mi?', detail: 'Pasif = 403 PROGRAM_INACTIVE (Kill Switch)' },
                        { step: '4', text: 'Sunucu → Versiyon kontrolü', detail: 'Eski versiyon = 403 VERSION_REJECTED + update_url' },
                        { step: '5', text: 'Sunucu → Kullanıcı doğrulama', detail: 'AD/şifre kontrolü, çalışan kaydı kontrolü' },
                        { step: '6', text: 'Sunucu → HWID kontrolü', detail: 'Engelli cihaz? Limit aşıldı? Yeni cihaz kaydı' },
                        { step: '7', text: 'Sunucu → JWT Token döner', detail: 'Token 5 saat geçerli, cache\'e kaydedilir' },
                        { step: '8', text: 'İstemci → GET /external-auth/verify/', detail: 'Periyodik oturum kontrolü (opsiyonel)' },
                    ].map(s => (
                        <div key={s.step} className="flex gap-3 items-start">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">{s.step}</span>
                            <div>
                                <p className="font-medium text-slate-700">{s.text}</p>
                                <p className="text-slate-500">{s.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const SettingsTab = ({ program, onUpdate }) => {
    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {/* Update URL */}
            <SettingRow
                label="Güncelleme Linki"
                description="Eski sürüm kullanan istemcilere gösterilecek URL"
                value={program.update_url || ''}
                onSave={(v) => onUpdate({ update_url: v })}
                type="url"
                placeholder="https://example.com/download"
            />

            {/* Max Devices */}
            <SettingRow
                label="Maks. Cihaz / Kullanıcı"
                description="Her kullanıcı en fazla bu kadar cihaz kaydedebilir"
                value={String(program.max_devices_per_user)}
                onSave={(v) => onUpdate({ max_devices_per_user: parseInt(v) || 1 })}
                type="number"
            />

            {/* HWID Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                    <p className="text-sm font-medium text-slate-700">Donanım Kilidi (HWID)</p>
                    <p className="text-xs text-slate-500">Aktifse cihazlar HWID ile kaydedilir ve takip edilir</p>
                </div>
                <button
                    onClick={() => onUpdate({ require_hwid: !program.require_hwid })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${program.require_hwid ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${program.require_hwid ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                    <p className="text-sm font-medium text-slate-700">Program Durumu</p>
                    <p className="text-xs text-slate-500">Devre dışı bırakılırsa tüm bağlantılar anlık kesilir</p>
                </div>
                <button
                    onClick={() => onUpdate({ is_active: !program.is_active })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${program.is_active ? 'bg-green-600' : 'bg-red-400'}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${program.is_active ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2">Tehlikeli İşlemler</h4>
                <p className="text-xs text-red-600 mb-3">Bu işlemler geri alınamaz ve mevcut bağlantıları etkileyebilir.</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (confirm('⚠️ Anahtar yenileme tüm mevcut bağlantıları keser. Devam?')) {
                                // regenerateKey logic from parent
                            }
                        }}
                        className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                        <RefreshCw size={14} /> Anahtarı Yenile
                    </button>
                </div>
            </div>
        </div>
    );
};


const SettingRow = ({ label, description, value, onSave, type = 'text', placeholder = '' }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);

    if (!editing) {
        return (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-mono">{value || '—'}</span>
                    <button onClick={() => { setVal(value); setEditing(true); }} className="p-1 hover:bg-slate-200 rounded"><Settings size={14} className="text-slate-500" /></button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
            <div className="flex items-center gap-2">
                <input
                    type={type}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />
                <button onClick={() => { onSave(val); setEditing(false); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                <button onClick={() => setEditing(false)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X size={16} /></button>
            </div>
        </div>
    );
};


// ========== USERS TAB (Whitelist) ==========
const UsersTab = ({ program, onUpdate, onRefresh }) => {
    const [allEmployees, setAllEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loadingEmps, setLoadingEmps] = useState(false);

    // Load employees list
    useEffect(() => {
        const loadEmployees = async () => {
            setLoadingEmps(true);
            try {
                const res = await api.get('/employees/', { params: { is_active: true, page_size: 9999 } });
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setAllEmployees(data);
            } catch (err) {
                console.error('Employee fetch error:', err);
            }
            setLoadingEmps(false);
        };
        loadEmployees();
    }, []);

    // Sync selected IDs from program data
    useEffect(() => {
        if (program?.allowed_users_detail) {
            setSelectedIds(new Set(program.allowed_users_detail.map(u => u.id)));
        }
    }, [program?.allowed_users_detail]);

    const filteredEmployees = allEmployees.filter(emp => {
        const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const dept = (emp.department_name || emp.department?.name || '').toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || dept.includes(q) || (emp.employee_code || '').includes(q);
    });

    const toggleUser = (empId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(empId)) next.delete(empId);
            else next.add(empId);
            return next;
        });
    };

    const saveUsers = async () => {
        setSaving(true);
        try {
            await api.post(`/external-programs/${program.id}/manage_users/`, {
                action: 'set',
                user_ids: Array.from(selectedIds)
            });
            onRefresh();
        } catch (err) {
            console.error('Save users error:', err);
        }
        setSaving(false);
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    return (
        <div className="space-y-4">
            {/* Restrict Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div>
                    <p className="text-sm font-semibold text-slate-700">Kullanıcı Kısıtlaması</p>
                    <p className="text-xs text-slate-500">
                        {program.restrict_to_allowed_users
                            ? 'Sadece aşağıdaki listede seçili kullanıcılar bu programı kullanabilir.'
                            : 'Herkes bu programı kullanabilir. Kısıtlamak için aktifleştirin.'}
                    </p>
                </div>
                <button
                    onClick={() => onUpdate({ restrict_to_allowed_users: !program.restrict_to_allowed_users })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${program.restrict_to_allowed_users ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${program.restrict_to_allowed_users ? 'left-6' : 'left-0.5'}`} />
                </button>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Personel ara (ad, departman, sicil no)..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                </div>
                <button onClick={selectAll} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 whitespace-nowrap transition-colors">Tümünü Seç</button>
                <button onClick={deselectAll} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 whitespace-nowrap transition-colors">Temizle</button>
            </div>

            {/* Counter */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{selectedIds.size} kullanıcı seçili / {allEmployees.length} toplam personel</span>
                <button
                    onClick={saveUsers}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                    {saving ? 'Kaydediliyor...' : <><Check size={14} /> Kaydet</>}
                </button>
            </div>

            {/* Employee List */}
            <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {loadingEmps ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse">Personel listesi yükleniyor...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Users size={28} className="mx-auto mb-2 opacity-50" />
                        <p>Sonuç bulunamadı</p>
                    </div>
                ) : (
                    filteredEmployees.map(emp => {
                        const isSelected = selectedIds.has(emp.id);
                        const empName = `${emp.first_name} ${emp.last_name}`;
                        const deptName = emp.department_name || emp.department?.name || '';
                        return (
                            <div
                                key={emp.id}
                                onClick={() => toggleUser(emp.id)}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50' : ''
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}>
                                    {isSelected && <Check size={12} />}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {empName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{empName}</p>
                                    <p className="text-xs text-slate-400 truncate">{deptName}{emp.employee_code ? ` • ${emp.employee_code}` : ''}</p>
                                </div>
                                {isSelected && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Yetkili</span>}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};


const CreateProgramModalV2 = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [currentVersion, setCurrentVersion] = useState('1.0.0');
    const [minVersion, setMinVersion] = useState('1.0.0');
    const [requireHwid, setRequireHwid] = useState(true);
    const [maxDevices, setMaxDevices] = useState(0);
    const [loading, setLoading] = useState(false);
    const [createdProgram, setCreatedProgram] = useState(null);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const res = await api.post('/external-programs/', {
                name,
                description,
                current_version: currentVersion,
                min_version: minVersion,
                require_hwid: requireHwid,
                max_devices_per_user: maxDevices
            });
            setCreatedProgram(res.data);
        } catch (err) {
            console.error('Create error:', err);
            alert('Program oluşturulurken hata: ' + (err.response?.data?.error || err.message));
        }
        setLoading(false);
    };

    // Success screen — show generated key
    if (createdProgram) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="fixed inset-0 bg-black/50" onClick={onCreated} />
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={28} className="text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Program Oluşturuldu!</h3>
                            <p className="text-sm text-slate-500 mb-5">{createdProgram.name} başarıyla eklendi</p>

                            {/* Program Key */}
                            <div className="bg-slate-50 p-4 rounded-lg text-left mb-4">
                                <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                                    <Key size={12} /> Program Anahtarı (Secret Key)
                                </label>
                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                    <code className="text-sm font-mono text-slate-800 flex-1 break-all">
                                        {createdProgram.program_key}
                                    </code>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(createdProgram.program_key)}
                                        className="p-1.5 hover:bg-slate-100 rounded flex-shrink-0"
                                        title="Kopyala"
                                    >
                                        <Copy size={16} className="text-blue-600" />
                                    </button>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    Bu anahtarı güvenli bir yerde saklayın. Harici yazılıma gömülecek.
                                </p>
                            </div>

                            {/* Version Info */}
                            <div className="grid grid-cols-2 gap-3 mb-5 text-left">
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500">Güncel Sürüm</p>
                                    <p className="text-sm font-mono font-medium text-slate-700">v{createdProgram.current_version}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500">Min. Sürüm</p>
                                    <p className="text-sm font-mono font-medium text-slate-700">v{createdProgram.min_version}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={onCreated}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Tamam
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

            {/* Modal Wrapper */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 rounded-t-xl bg-white">
                        <h3 className="text-lg font-bold text-slate-800">Yeni Program Ekle</h3>
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Program Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Program Adı *</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Örn: Muhasebe Botu"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={2}
                                placeholder="Ne iş yapar?"
                            />
                        </div>

                        {/* Version Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Güncel Sürüm</label>
                                <input
                                    value={currentVersion}
                                    onChange={(e) => setCurrentVersion(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    placeholder="1.0.0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Sürüm</label>
                                <input
                                    value={minVersion}
                                    onChange={(e) => setMinVersion(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    placeholder="1.0.0"
                                />
                                <p className="text-xs text-slate-400 mt-1">Bu sürümün altı reddedilir</p>
                            </div>
                        </div>



                        {/* HWID Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Donanım Kilidi (HWID)</label>
                                <p className="text-xs text-slate-500">Sadece kayıtlı cihazlarda çalışsın</p>
                            </div>
                            <button
                                onClick={() => setRequireHwid(!requireHwid)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${requireHwid ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${requireHwid ? 'left-6' : 'left-0.5'}`} />
                            </button>
                        </div>

                        {/* Max Devices */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Başına Maks. Cihaz</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={maxDevices === 0 ? '' : maxDevices}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setMaxDevices(isNaN(val) ? 0 : val);
                                    }}
                                    disabled={maxDevices === 0}
                                    min={1} max={999}
                                    placeholder="Sınırsız"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                                <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={maxDevices === 0}
                                        onChange={(e) => setMaxDevices(e.target.checked ? 0 : 2)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-600">Limit Yok</span>
                                </label>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 p-3 rounded-lg flex gap-2">
                            <Key size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700">
                                Program Anahtarı (Secret Key) otomatik oluşturulacak ve bir sonraki ekranda gösterilecektir.
                            </p>
                        </div>
                    </div>

                    <div className="p-5 border-t border-slate-100 flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-xl">
                        <button onClick={onClose} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim() || loading}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        , document.body);
};

// Force update v3
export default ProgramManagement;
