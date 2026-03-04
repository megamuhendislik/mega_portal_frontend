import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Pencil, X, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const EditAssignmentModal = ({ isOpen, onClose, onSuccess, assignment }) => {
    const [form, setForm] = useState({
        max_duration_hours: 6,
        task_description: '',
        notes: '',
        date: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [weeklyUsage, setWeeklyUsage] = useState(null);

    useEffect(() => {
        if (assignment && isOpen) {
            setForm({
                max_duration_hours: assignment.max_duration_hours || 6,
                task_description: assignment.task_description || '',
                notes: assignment.notes || '',
                date: assignment.date || '',
            });
            setError('');
            fetchWeeklyUsage(assignment.employee, assignment.date);
        }
    }, [assignment, isOpen]);

    const fetchWeeklyUsage = async (employeeId, dateStr) => {
        try {
            const res = await api.get('/overtime-requests/weekly-ot-status/', {
                params: { employee_id: employeeId, reference_date: dateStr },
            });
            setWeeklyUsage(res.data);
        } catch { setWeeklyUsage(null); }
    };

    if (!isOpen || !assignment) return null;

    const isPast = new Date(assignment.date + 'T00:00:00') < new Date(new Date().toDateString());
    const today = new Date().toISOString().split('T')[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const payload = {};
            if (parseFloat(form.max_duration_hours) !== assignment.max_duration_hours) {
                payload.max_duration_hours = parseFloat(form.max_duration_hours);
            }
            if (!isPast) {
                if (form.task_description !== (assignment.task_description || '')) {
                    payload.task_description = form.task_description;
                }
                if (form.date !== assignment.date) {
                    payload.date = form.date;
                }
            }
            if (form.notes !== (assignment.notes || '')) {
                payload.notes = form.notes;
            }

            if (Object.keys(payload).length === 0) {
                setError('Değişiklik yapılmadı.');
                setSubmitting(false);
                return;
            }

            await api.patch(`/overtime-assignments/${assignment.id}/update/`, payload);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Güncelleme başarısız.');
        }
        setSubmitting(false);
    };

    const limitRatio = weeklyUsage && !weeklyUsage.is_unlimited
        ? weeklyUsage.used_hours / weeklyUsage.limit_hours : 0;
    const limitColor = limitRatio >= 1 ? 'bg-red-500' : limitRatio > 0.7 ? 'bg-amber-500' : 'bg-emerald-500';

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Pencil size={20} className="text-blue-500" />
                        Atamayı Düzenle
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Employee + Date Info */}
                <div className="bg-slate-50 rounded-xl p-3 text-sm">
                    <p className="font-bold text-slate-800">{assignment.employee_name}</p>
                    <p className="text-slate-500 text-xs">{assignment.date} {isPast && '(Geçmiş tarih)'}</p>
                </div>

                {/* Weekly OT Usage */}
                {weeklyUsage && !weeklyUsage.is_unlimited && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-500">Haftalık OT (Pzt-Paz)</span>
                            <span className={limitRatio >= 1 ? 'text-red-600' : 'text-slate-600'}>
                                {weeklyUsage.used_hours}/{weeklyUsage.limit_hours} sa
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${limitColor}`}
                                style={{ width: `${Math.min(100, limitRatio * 100)}%` }} />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {!isPast && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Tarih</label>
                                <input type="date" min={today} value={form.date}
                                    onChange={e => setForm({...form, date: e.target.value})}
                                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>
                        )}
                        <div className={isPast ? 'col-span-2' : ''}>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Maks Süre (saat)</label>
                            <input type="number" min="0.5" max="12" step="0.5"
                                value={form.max_duration_hours}
                                onChange={e => setForm({...form, max_duration_hours: e.target.value})}
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>
                    </div>
                    {!isPast && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Görev Açıklaması</label>
                            <textarea rows="2" value={form.task_description}
                                onChange={e => setForm({...form, task_description: e.target.value})}
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Notlar</label>
                        <textarea rows="2" value={form.notes}
                            onChange={e => setForm({...form, notes: e.target.value})}
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-200 outline-none"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl text-sm">Vazgeç</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg disabled:opacity-50">
                            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EditAssignmentModal;
