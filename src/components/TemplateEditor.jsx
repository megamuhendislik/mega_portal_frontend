import React from 'react';
import { Copy, Palette, Trash2, Save } from 'lucide-react';

const DAYS = [
    { key: 'MON', label: 'Pazartesi' },
    { key: 'TUE', label: 'Salı' },
    { key: 'WED', label: 'Çarşamba' },
    { key: 'THU', label: 'Perşembe' },
    { key: 'FRI', label: 'Cuma' },
    { key: 'SAT', label: 'Cumartesi' },
    { key: 'SUN', label: 'Pazar' },
];

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const TemplateEditor = ({ template, onChange, onSave, onDelete, saving }) => {
    if (!template) return (
        <div className="flex items-center justify-center h-full text-slate-400 py-16">
            <div className="text-center">
                <Palette size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Düzenlemek için bir şablon seçin</p>
            </div>
        </div>
    );

    const schedule = template.weekly_schedule || {};

    const handleFieldChange = (field, value) => {
        onChange({ ...template, [field]: value });
    };

    const handleScheduleChange = (dayKey, field, value) => {
        const newSchedule = {
            ...schedule,
            [dayKey]: { ...schedule[dayKey], [field]: value }
        };
        onChange({ ...template, weekly_schedule: newSchedule });
    };

    const handleCopyToWeekdays = (sourceDayKey) => {
        const source = schedule[sourceDayKey];
        const newSchedule = { ...schedule };
        DAYS.forEach(day => {
            if (day.key !== 'SAT' && day.key !== 'SUN') {
                newSchedule[day.key] = { ...source };
            }
        });
        onChange({ ...template, weekly_schedule: newSchedule });
    };

    return (
        <div className="space-y-5">
            {/* Name & Color */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Şablon Adı</label>
                    <input
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 ring-indigo-500 outline-none"
                        value={template.name || ''}
                        onChange={e => handleFieldChange('name', e.target.value)}
                        placeholder="Örn: Yaz Mesaisi"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Renk</label>
                    <div className="flex gap-1.5">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => handleFieldChange('color', c)}
                                className={`w-7 h-7 rounded-lg border-2 transition-all ${template.color === c ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent hover:border-slate-300'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Weekly Schedule Table */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Haftalık Program</label>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Gün</th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 w-20">Durum</th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Başlangıç</th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Bitiş</th>
                                <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {DAYS.map(day => {
                                const dayData = schedule[day.key] || { start: '09:00', end: '18:00', is_off: false };
                                const isOff = dayData.is_off;
                                return (
                                    <tr key={day.key} className={isOff ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}>
                                        <td className="px-3 py-2 font-medium text-slate-700 text-xs">{day.label}</td>
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => handleScheduleChange(day.key, 'is_off', !isOff)}
                                                className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${isOff ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}
                                            >
                                                {isOff ? 'Tatil' : 'Çalışma'}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2">
                                            {!isOff ? (
                                                <input type="time" value={dayData.start || '09:00'}
                                                    onChange={e => handleScheduleChange(day.key, 'start', e.target.value)}
                                                    className="px-2 py-1 border rounded text-xs w-[85px] focus:ring-1 ring-indigo-500 outline-none" />
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            {!isOff ? (
                                                <input type="time" value={dayData.end || '18:00'}
                                                    onChange={e => handleScheduleChange(day.key, 'end', e.target.value)}
                                                    className="px-2 py-1 border rounded text-xs w-[85px] focus:ring-1 ring-indigo-500 outline-none" />
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {!isOff && (
                                                <button type="button" onClick={() => handleCopyToWeekdays(day.key)}
                                                    title="Hafta içine kopyala"
                                                    className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                                    <Copy size={12} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Lunch & Break */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Öğle Arası</label>
                    <div className="flex items-center gap-2">
                        <input type="time" value={template.lunch_start || '12:30'}
                            onChange={e => handleFieldChange('lunch_start', e.target.value)}
                            className="px-2 py-1.5 border rounded text-xs flex-1 focus:ring-1 ring-indigo-500 outline-none bg-white" />
                        <span className="text-slate-400">-</span>
                        <input type="time" value={template.lunch_end || '13:30'}
                            onChange={e => handleFieldChange('lunch_end', e.target.value)}
                            className="px-2 py-1.5 border rounded text-xs flex-1 focus:ring-1 ring-indigo-500 outline-none bg-white" />
                    </div>
                </div>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Günlük Mola</label>
                    <div className="flex items-center gap-1">
                        <input type="number" value={template.daily_break_allowance ?? 30}
                            onChange={e => handleFieldChange('daily_break_allowance', parseInt(e.target.value) || 0)}
                            className="px-2 py-1.5 border rounded text-xs w-16 text-center focus:ring-1 ring-indigo-500 outline-none bg-white" />
                        <span className="text-xs text-slate-500">dk/gün</span>
                    </div>
                </div>
            </div>

            {/* Tolerances */}
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Geç Kalma Tol. (dk)</label>
                    <input type="number" value={template.late_tolerance_minutes ?? 15}
                        onChange={e => handleFieldChange('late_tolerance_minutes', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded-lg text-xs text-center focus:ring-1 ring-indigo-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Servis Tol. (dk)</label>
                    <input type="number" value={template.service_tolerance_minutes ?? 0}
                        onChange={e => handleFieldChange('service_tolerance_minutes', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded-lg text-xs text-center focus:ring-1 ring-indigo-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Min. Mesai (dk)</label>
                    <input type="number" value={template.minimum_overtime_minutes ?? 15}
                        onChange={e => handleFieldChange('minimum_overtime_minutes', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded-lg text-xs text-center focus:ring-1 ring-indigo-500 outline-none" />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                {!template.is_default && onDelete ? (
                    <button type="button" onClick={() => onDelete(template.id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold hover:bg-red-50 px-3 py-1.5 rounded transition-colors">
                        <Trash2 size={14} /> Şablonu Sil
                    </button>
                ) : <div />}
                <button type="button" onClick={() => onSave(template)} disabled={saving}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm">
                    <Save size={16} />
                    {saving ? 'Kaydediliyor...' : 'Şablonu Kaydet'}
                </button>
            </div>
        </div>
    );
};

export default TemplateEditor;
