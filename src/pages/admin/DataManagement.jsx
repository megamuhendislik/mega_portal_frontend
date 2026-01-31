
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function DataManagement() {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('backup');
    const [message, setMessage] = useState(null);

    // Backup State
    const [importing, setImporting] = useState(false);

    // Data Edit State
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dailyRecords, setDailyRecords] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteIds, setDeleteIds] = useState([]);

    // Fetch Users for selector
    useEffect(() => {
        if (activeTab === 'edit' && users.length === 0) {
            api.get('/employees/').then(res => {
                setUsers(res.data.results || res.data); // Handle pagination
            });
        }
    }, [activeTab]);

    const loadRecords = async () => {
        if (!selectedUser || !selectedDate) return;
        setLoadingRecords(true);
        setDeleteIds([]);
        try {
            const res = await api.get('/system-data/daily_records/', {
                params: { employee_id: selectedUser, date: selectedDate }
            });
            setDailyRecords(res.data.records);
            setSummary(null); // Clear summary until save/recalc
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Kayıtlar yüklenemedi.' });
        } finally {
            setLoadingRecords(false);
        }
    };

    const handleExport = (fmt) => {
        window.open(`${api.defaults.baseURL}/system-data/export_backup/?format=${fmt}`, '_blank');
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm('DİKKAT: Bu işlem mevcut verileri bu dosyadaki verilerle GÜNCELLEYECEKTİR. Devam etmek istiyor musunuz?')) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post('/system-data/import_backup/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage({ type: 'success', text: 'Geri yükleme başarılı.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Geri yükleme hatası: ' + (err.response?.data?.error || err.message) });
        } finally {
            setImporting(false);
        }
    };

    // Record Editing Local State
    const updateRecord = (index, field, value) => {
        const newRecords = [...dailyRecords];
        newRecords[index][field] = value;
        setDailyRecords(newRecords);
    };

    const addRecord = () => {
        setDailyRecords([...dailyRecords, {
            id: null,
            check_in: `${selectedDate}T09:00:00`,
            check_out: `${selectedDate}T18:00:00`,
            source: 'MANUAL'
        }]);
    };

    const removeRecord = (index) => {
        const rec = dailyRecords[index];
        if (rec.id) {
            setDeleteIds([...deleteIds, rec.id]);
        }
        const newRecords = dailyRecords.filter((_, i) => i !== index);
        setDailyRecords(newRecords);
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const res = await api.post('/system-data/update_daily_records/', {
                employee_id: selectedUser,
                date: selectedDate,
                records: dailyRecords,
                delete_ids: deleteIds
            });
            setMessage({ type: 'success', text: 'Kaydedildi ve yeniden hesaplandı.' });
            setSummary(res.data.summary);

            // Reload to accept new IDs etc
            loadRecords();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Kaydetme hatası.' });
        } finally {
            setSaving(false);
        }
    };

    if (!hasPermission('DATA_MANAGE_FULL') && !hasPermission('MENU_DATA_MANAGEMENT_VIEW')) {
        // Fallback if protected route fails or direct access
        return <div className="p-4">Yetkiniz yok.</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Sistem Veri Yönetimi</h1>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message.text}
                    <button className="float-right font-bold" onClick={() => setMessage(null)}>x</button>
                </div>
            )}

            <div className="flex border-b mb-6">
                <button
                    className={`px-4 py-2 ${activeTab === 'backup' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                    onClick={() => setActiveTab('backup')}
                >
                    Yedekleme & Geri Yükleme
                </button>
                <button
                    className={`px-4 py-2 ${activeTab === 'edit' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
                    onClick={() => setActiveTab('edit')}
                >
                    Manuel Veri Düzenleme
                </button>
            </div>

            {activeTab === 'backup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded shadow">
                        <h2 className="text-xl font-bold mb-4">Veri Dışa Aktar (Backup)</h2>
                        <p className="text-sm text-gray-500 mb-4">Sistem verilerini JSON formatında (tam yedek) veya CSV formatında (tablo bazlı) indirebilirsiniz.</p>
                        <div className="space-x-4">
                            <button
                                onClick={() => handleExport('json')}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                JSON Export (Tam Yedek)
                            </button>
                            <button
                                onClick={() => handleExport('csv')}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                CSV Export
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded shadow">
                        <h2 className="text-xl font-bold mb-4">Veri İçe Aktar (Restore)</h2>
                        <p className="text-sm text-gray-500 mb-4">JSON yedeği yükleyerek verileri geri yükleyin/güncelleyin.</p>
                        <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                disabled={importing}
                                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                            />
                            {importing && <p className="mt-2 text-blue-600">Yükleniyor...</p>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'edit' && (
                <div className="bg-white p-6 rounded shadow">
                    <div className="flex flex-wrap gap-4 mb-6 items-end">
                        <div>
                            <label className="block text-sm font-bold mb-1">Personel</label>
                            <select
                                className="border p-2 rounded min-w-[250px]"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                            >
                                <option value="">Seçiniz</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.first_name} {u.last_name} ({u.employee_code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Tarih</label>
                            <input
                                type="date"
                                className="border p-2 rounded"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={loadRecords}
                            className="bg-blue-600 text-white px-4 py-2 rounded mb-[2px]"
                            disabled={loadingRecords || !selectedUser}
                        >
                            {loadingRecords ? 'Yükleniyor...' : 'Getir'}
                        </button>
                    </div>

                    {dailyRecords && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold">Kayıtlar (Giriş / Çıkış)</h3>
                                <button onClick={addRecord} className="text-blue-600 hover:underline">+ Yeni Kayıt Ekle</button>
                            </div>

                            <table className="w-full text-left border-collapse mb-6">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="p-2">Giriş (ISO Format)</th>
                                        <th className="p-2">Çıkış (ISO Format)</th>
                                        <th className="p-2">Kaynak</th>
                                        <th className="p-2">Durum</th>
                                        <th className="p-2">Sil</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyRecords.map((rec, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    className="border p-1 w-full"
                                                    value={rec.check_in || ''}
                                                    onChange={e => updateRecord(idx, 'check_in', e.target.value)}
                                                    placeholder="YYYY-MM-DDTHH:MM"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    className="border p-1 w-full"
                                                    value={rec.check_out || ''}
                                                    onChange={e => updateRecord(idx, 'check_out', e.target.value)}
                                                    placeholder="YYYY-MM-DDTHH:MM"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    className="border p-1"
                                                    value={rec.source}
                                                    onChange={e => updateRecord(idx, 'source', e.target.value)}
                                                >
                                                    <option value="MANUAL">MANUAL</option>
                                                    <option value="CARD">CARD</option>
                                                    <option value="FACE">FACE</option>
                                                    <option value="QR">QR</option>
                                                    <option value="MOBILE">MOBILE</option>
                                                </select>
                                            </td>
                                            <td className="p-2 text-sm text-gray-500">{rec.status}</td>
                                            <td className="p-2">
                                                <button onClick={() => removeRecord(idx)} className="text-red-500">Sil</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {dailyRecords.length === 0 && (
                                        <tr><td colSpan="5" className="p-4 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="flex justify-end gap-4">
                                {summary && (
                                    <div className="text-sm bg-gray-100 p-2 rounded mr-auto">
                                        <strong>Son Hesaplama:</strong> Normal: {Math.round(summary.normal_seconds / 60)}dk,
                                        OT: {Math.round(summary.overtime_seconds / 60)}dk,
                                        Eksik: {Math.round(summary.missing_seconds / 60)}dk
                                    </div>
                                )}
                                <button
                                    onClick={saveChanges}
                                    disabled={saving}
                                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold"
                                >
                                    {saving ? 'Kaydediliyor...' : 'Kaydet ve Hesapla'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
