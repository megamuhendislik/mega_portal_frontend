import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import { X, Check, Copy, AlertTriangle, Key } from 'lucide-react';

const CreateProgramModal = ({ onClose, onCreated }) => {
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

export default CreateProgramModal;
