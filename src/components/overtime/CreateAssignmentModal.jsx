import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, X, AlertTriangle, Clock } from 'lucide-react';
import api from '../../services/api';

const CreateAssignmentModal = ({ isOpen, onClose, onSuccess, teamMembers }) => {
    const [form, setForm] = useState({
        employee: '',
        date: '',
        max_duration_hours: 6,
        task_description: '',
        notes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [busyDays, setBusyDays] = useState([]);
    const [loadingBusy, setLoadingBusy] = useState(false);

    // Çalışan seçildiğinde dolu günleri getir
    const fetchBusyDays = useCallback(async (employeeId) => {
        if (!employeeId) { setBusyDays([]); return; }
        setLoadingBusy(true);
        try {
            const res = await api.get(`/overtime-assignments/busy-days/${employeeId}/`);
            setBusyDays(res.data || []);
        } catch { setBusyDays([]); }
        setLoadingBusy(false);
    }, []);

    useEffect(() => {
        if (form.employee) fetchBusyDays(form.employee);
        else setBusyDays([]);
    }, [form.employee, fetchBusyDays]);

    if (!isOpen) return null;

    // Seçilen tarih dolu mu?
    const selectedDateBusy = busyDays.find(b => b.date === form.date);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.employee) { setError('Çalışan seçiniz.'); return; }
        if (!form.date) { setError('Tarih seçiniz.'); return; }
        if (!form.task_description.trim()) { setError('Görev açıklaması giriniz.'); return; }
        if (selectedDateBusy) { setError('Bu tarihte başka bir yönetici tarafından zaten atama yapılmış.'); return; }

        setSubmitting(true);
        try {
            await api.post('/overtime-assignments/', {
                employee: parseInt(form.employee),
                date: form.date,
                max_duration_hours: parseFloat(form.max_duration_hours),
                task_description: form.task_description.trim(),
                notes: form.notes.trim() || undefined,
            });
            setForm({ employee: '', date: '', max_duration_hours: 6, task_description: '', notes: '' });
            setBusyDays([]);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Hata oluştu.');
        }
        setSubmitting(false);
    };

    // Tarih seçici min = bugün
    const today = new Date().toISOString().split('T')[0];

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" />
                        Çalışana Ek Mesai Ata
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Çalışan</label>
                        <select
                            value={form.employee}
                            onChange={e => setForm({...form, employee: e.target.value, date: ''})}
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                            required
                        >
                            <option value="">Çalışan seçiniz...</option>
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dolu günler uyarısı */}
                    {form.employee && busyDays.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <AlertTriangle size={12} className="text-amber-600" />
                                <span className="text-[11px] font-bold text-amber-700">Dolu Günler ({busyDays.length})</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                                {busyDays.filter(b => b.status !== 'CANCELLED').slice(0, 20).map((b, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded flex items-center gap-1">
                                        <Clock size={9} />
                                        {new Date(b.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                        <span className="text-amber-500 font-medium">({b.manager_name})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {form.employee && loadingBusy && (
                        <div className="text-xs text-slate-400 text-center py-1">Dolu günler yükleniyor...</div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
                            <input
                                type="date"
                                min={today}
                                value={form.date}
                                onChange={e => setForm({...form, date: e.target.value})}
                                className={`w-full p-3 bg-slate-50 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none ${
                                    selectedDateBusy ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                }`}
                                required
                            />
                            {selectedDateBusy && (
                                <p className="text-[10px] text-red-600 font-bold mt-1">
                                    Bu tarih {selectedDateBusy.manager_name} tarafından dolu!
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Maks Süre (saat)</label>
                            <input
                                type="number"
                                min="0.5"
                                max="12"
                                step="0.5"
                                value={form.max_duration_hours}
                                onChange={e => setForm({...form, max_duration_hours: e.target.value})}
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Görev Açıklaması</label>
                        <textarea
                            rows="3"
                            value={form.task_description}
                            onChange={e => setForm({...form, task_description: e.target.value})}
                            placeholder="Yapılacak iş açıklaması..."
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-200 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Notlar (opsiyonel)</label>
                        <textarea
                            rows="2"
                            value={form.notes}
                            onChange={e => setForm({...form, notes: e.target.value})}
                            placeholder="Ek notlar..."
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">
                            Vazgeç
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !!selectedDateBusy}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            {submitting ? 'Atanıyor...' : 'Ata'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreateAssignmentModal;
