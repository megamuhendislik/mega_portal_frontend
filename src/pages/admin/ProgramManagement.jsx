import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
    Package, Plus, Settings, Shield, Trash2, RefreshCw,
    Monitor, Users, Copy, Eye, EyeOff, X, Check, Ban,
    Clock, Activity, ChevronRight, AlertTriangle, Key
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
                                        { key: 'logs', label: 'Erişim Logları', icon: Activity },
                                        { key: 'snippet', label: 'Python Kodu', icon: Key },
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
                                    {activeTab === 'snippet' && (
                                        <SnippetTab programKey={selectedProgram.program_key} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateProgramModal
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
    const snippet = `"""
MegaPortal Harici Yazılım Kimlik Doğrulama Modülü
Bu dosyayı projenizin kök dizinine ekleyin ve uygulamanızın
başlangıcında authenticate() fonksiyonunu çağırın.
"""
import os, json, time, uuid, platform, hashlib, getpass
from datetime import datetime
try:
    import requests
except ImportError:
    print("HATA: 'requests' kütüphanesi bulunamadı. pip install requests")
    exit(1)

# ======= KONFİGÜRASYON =======
BASE_URL = "https://mega-portal-production.up.railway.app/api"
PROGRAM_KEY = "${programKey}"
APP_VERSION = "1.0.0"  # Uygulamanızın sürümü
CACHE_FILE = os.path.join(os.path.expanduser("~"), ".mega_auth_cache.json")
SESSION_HOURS = 5

# ======= HWID ÜRETİMİ =======
def get_hwid():
    """Bilgisayarın benzersiz parmak izini üretir."""
    raw = f"{uuid.getnode()}-{platform.node()}-{platform.machine()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]

# ======= CACHE YÖNETİMİ =======
def load_cache():
    try:
        with open(CACHE_FILE, 'r') as f:
            return json.load(f)
    except:
        return None

def save_cache(data):
    with open(CACHE_FILE, 'w') as f:
        json.dump(data, f)

def clear_cache():
    try: os.remove(CACHE_FILE)
    except: pass

# ======= ANA FONKSİYONLAR =======
def login(username, password):
    """Sunucuya giriş yapar ve token alır."""
    try:
        resp = requests.post(f"{BASE_URL}/external-auth/login/", json={
            "program_key": PROGRAM_KEY,
            "username": username,
            "password": password,
            "hwid": get_hwid(),
            "device_name": platform.node(),
            "version": APP_VERSION
        }, timeout=10)
        
        data = resp.json()
        if resp.status_code == 200 and data.get('status') == 'success':
            save_cache({
                "token": data["token"],
                "refresh": data.get("refresh", ""),
                "user": data["user"]["name"],
                "login_time": time.time(),
                "expires_at": time.time() + SESSION_HOURS * 3600
            })
            return True, data["user"]["name"]
        else:
            return False, data.get("message", "Bilinmeyen hata")
    except requests.ConnectionError:
        return False, "Sunucuya bağlanılamadı"
    except Exception as e:
        return False, str(e)

def verify_session():
    """Mevcut oturumu kontrol eder."""
    cache = load_cache()
    if not cache:
        return False, "Oturum bulunamadı"
    
    if time.time() > cache.get("expires_at", 0):
        clear_cache()
        return False, "Oturum süresi doldu"
    
    try:
        resp = requests.get(f"{BASE_URL}/external-auth/verify/", 
            headers={"Authorization": f"Bearer {cache['token']}"},
            params={"program_key": PROGRAM_KEY, "version": APP_VERSION},
            timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("valid"):
                return True, cache.get("user", "")
            return False, data.get("reason", "Oturum geçersiz")
        return False, "Token reddedildi"
    except:
        # Çevrimdışı: cache süresine güven
        return True, cache.get("user", "")

def authenticate():
    """Ana kimlik doğrulama fonksiyonu. Cache varsa kontrol eder, yoksa login ister."""
    # 1. Cache kontrol
    valid, info = verify_session()
    if valid:
        print(f"✅ Hoş geldiniz, {info}")
        return True
    
    # 2. Login gerekli
    print("\\n🔐 MegaPortal Kimlik Doğrulama")
    print("=" * 35)
    for attempt in range(3):
        username = input("Kullanıcı Adı: ")
        password = getpass.getpass("Şifre: ")
        
        success, msg = login(username, password)
        if success:
            print(f"\\n✅ Giriş başarılı! Hoş geldiniz, {msg}")
            return True
        else:
            print(f"❌ Hata: {msg}")
            if attempt < 2:
                print(f"Kalan deneme: {2 - attempt}")
    
    print("\\n🚫 Giriş başarısız. Program kapatılıyor.")
    exit(1)

# ======= KULLANIM =======
# Uygulamanızın başında:
# from mega_auth import authenticate
# authenticate()
`;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                    Bu kodu <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">mega_auth.py</code> olarak kaydedin
                    ve uygulamanızın başında <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">authenticate()</code> çağırın.
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


const CreateProgramModal = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [requireHwid, setRequireHwid] = useState(true);
    const [maxDevices, setMaxDevices] = useState(2);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await api.post('/external-programs/', {
                name,
                description,
                require_hwid: requireHwid,
                max_devices_per_user: maxDevices
            });
            onCreated();
        } catch (err) {
            console.error('Create error:', err);
            alert('Program oluşturulurken hata: ' + (err.response?.data?.error || err.message));
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Yeni Program Ekle</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Program Adı *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Örn: Muhasebe Botu"
                        />
                    </div>
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
                    <div className="flex items-center justify-between">
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
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Başına Maks. Cihaz</label>
                        <input
                            type="number"
                            value={maxDevices}
                            onChange={(e) => setMaxDevices(parseInt(e.target.value) || 1)}
                            min={1} max={10}
                            className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="p-5 border-t border-slate-100 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProgramManagement;
