import { useState } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, X } from 'lucide-react';
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

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.employee) { setError('Calisan seciniz.'); return; }
        if (!form.date) { setError('Tarih seciniz.'); return; }
        if (!form.task_description.trim()) { setError('Gorev aciklamasi giriniz.'); return; }

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
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Hata olustu.');
        }
        setSubmitting(false);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" />
                        Calisana Ek Mesai Ata
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Calisan</label>
                        <select
                            value={form.employee}
                            onChange={e => setForm({...form, employee: e.target.value})}
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                            required
                        >
                            <option value="">Calisan seciniz...</option>
                            {teamMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm({...form, date: e.target.value})}
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Maks Sure (saat)</label>
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
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Gorev Aciklamasi</label>
                        <textarea
                            rows="3"
                            value={form.task_description}
                            onChange={e => setForm({...form, task_description: e.target.value})}
                            placeholder="Yapilacak is aciklamasi..."
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
                            Vazgec
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            {submitting ? 'Ataniyor...' : 'Ata'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreateAssignmentModal;
