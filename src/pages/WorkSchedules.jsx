import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Check, Calendar, List } from 'lucide-react';
import api from '../services/api';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import 'moment/locale/tr';

const DAYS = [
    { key: 'MON', label: 'Pazartesi' },
    { key: 'TUE', label: 'Salı' },
    { key: 'WED', label: 'Çarşamba' },
    { key: 'THU', label: 'Perşembe' },
    { key: 'FRI', label: 'Cuma' },
    { key: 'SAT', label: 'Cumartesi' },
    { key: 'SUN', label: 'Pazar' },
];

const WorkSchedules = () => {
    const [schedules, setSchedules] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Annual View State
    const [viewMode, setViewMode] = useState('LIST'); // 'LIST' or 'ANNUAL'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedScheduleForView, setSelectedScheduleForView] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        is_default: false,
        lunch_start: '12:30',
        lunch_end: '13:30',
        daily_break_allowance: 30,
        late_tolerance_minutes: 15,
        schedule: {}
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [schedulesRes, holidaysRes] = await Promise.all([
                api.get('/work-schedules/'),
                api.get('/public-holidays/')
            ]);

            // Handle Schedules
            const sData = schedulesRes.data;
            if (Array.isArray(sData)) {
                setSchedules(sData);
            } else if (sData.results && Array.isArray(sData.results)) {
                setSchedules(sData.results);
            } else {
                setSchedules([]);
            }

            // Handle Holidays
            const hData = holidaysRes.data;
            if (Array.isArray(hData)) {
                setHolidays(hData);
            } else if (hData.results && Array.isArray(hData.results)) {
                setHolidays(hData.results);
            } else {
                setHolidays([]);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInitForm = () => {
        const defaultSchedule = {};
        DAYS.forEach(day => {
            defaultSchedule[day.key] = {
                start: '09:00',
                end: '18:00',
                is_off: day.key === 'SAT' || day.key === 'SUN'
            };
        });
        setFormData({
            name: '',
            is_default: false,
            lunch_start: '12:30',
            lunch_end: '13:30',
            daily_break_allowance: 30,
            late_tolerance_minutes: 15,
            schedule: defaultSchedule
        });
        setEditingId(null);
        setShowModal(true);
    };

    const handleEdit = (sch) => {
        setFormData({
            name: sch.name,
            is_default: sch.is_default,
            lunch_start: sch.lunch_start || '12:30',
            lunch_end: sch.lunch_end || '13:30',
            daily_break_allowance: sch.daily_break_allowance || 30,
            late_tolerance_minutes: sch.late_tolerance_minutes || 15,
            schedule: sch.schedule
        });
        setEditingId(sch.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu takvimi silmek istediğinize emin misiniz?')) {
            try {
                await api.delete(`/work-schedules/${id}/`);
                await api.delete(`/work-schedules/${id}/`);
                fetchData();
            } catch (error) {
                console.error('Error deleting schedule:', error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/work-schedules/${editingId}/`, formData);
            } else {
                await api.post('/work-schedules/', formData);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Kaydetme hatası.');
        }
    };

    const handleDayChange = (dayKey, field, value) => {
        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [dayKey]: {
                    ...prev.schedule[dayKey],
                    [field]: value
                }
            }
        }));
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Çalışma Takvimleri</h2>
                <div className="flex gap-3">
                    {viewMode === 'ANNUAL' && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                        </select>
                    )}

                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => {
                                setViewMode('LIST');
                                setSelectedScheduleForView(null);
                            }}
                            className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Liste Görünümü"
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('ANNUAL')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'ANNUAL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Yıllık Görünüm"
                        >
                            <Calendar size={20} />
                        </button>
                    </div>

                    <button
                        onClick={handleInitForm}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Yeni Takvim
                    </button>
                </div>
            </div>

            {viewMode === 'LIST' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedules.map(sch => (
                        <div key={sch.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800">{sch.name}</h3>
                                    {sch.is_default && (
                                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">Varsayılan</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedScheduleForView(sch);
                                            setViewMode('ANNUAL');
                                        }}
                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Yıllık Planı Gör"
                                    >
                                        <Calendar size={18} />
                                    </button>
                                    <button onClick={() => handleEdit(sch)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(sch.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {DAYS.map(day => {
                                    const rule = sch.schedule[day.key] || {};
                                    return (
                                        <div key={day.key} className="flex justify-between text-sm">
                                            <span className="text-slate-500 font-medium w-24">{day.label}</span>
                                            <span className={rule.is_off ? "text-slate-400" : "text-slate-700"}>
                                                {rule.is_off ? 'Tatil' : `${rule.start} - ${rule.end}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <AnnualCalendar
                    year={selectedYear}
                    schedules={schedules}
                    holidays={holidays}
                    initialSchedule={selectedScheduleForView}
                    onRefresh={fetchData}
                />
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingId ? 'Takvimi Düzenle' : 'Yeni Takvim'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Takvim Adı</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Örn: Standart Mesai"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Öğle Molası</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={formData.lunch_start}
                                                onChange={(e) => setFormData({ ...formData, lunch_start: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input
                                                type="time"
                                                value={formData.lunch_end}
                                                onChange={(e) => setFormData({ ...formData, lunch_end: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Mola Hakkı (dk)</label>
                                            <input
                                                type="number"
                                                value={formData.daily_break_allowance}
                                                onChange={(e) => setFormData({ ...formData, daily_break_allowance: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Tolerans (dk)</label>
                                            <input
                                                type="number"
                                                value={formData.late_tolerance_minutes}
                                                onChange={(e) => setFormData({ ...formData, late_tolerance_minutes: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_default}
                                            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-slate-700">Varsayılan Takvim</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-slate-100 pt-4">
                                <h4 className="font-medium text-slate-800 mb-2">Haftalık Program</h4>
                                {DAYS.map(day => {
                                    const rule = formData.schedule[day.key] || {};
                                    return (
                                        <div key={day.key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="w-24 font-medium text-slate-700">{day.label}</div>

                                            <label className="flex items-center cursor-pointer mr-4">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.is_off}
                                                    onChange={(e) => handleDayChange(day.key, 'is_off', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="ml-2 text-sm text-slate-600">Tatil</span>
                                            </label>

                                            {!rule.is_off && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="time"
                                                        value={rule.start}
                                                        onChange={(e) => handleDayChange(day.key, 'start', e.target.value)}
                                                        className="px-2 py-1 border border-slate-300 rounded text-sm"
                                                    />
                                                    <span className="text-slate-400">-</span>
                                                    <input
                                                        type="time"
                                                        value={rule.end}
                                                        onChange={(e) => handleDayChange(day.key, 'end', e.target.value)}
                                                        className="px-2 py-1 border border-slate-300 rounded text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-blue-600/20"
                                >
                                    <Save size={18} />
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkSchedules;


const HolidayModal = ({ isOpen, onClose, onSave, date, onDelete, existingHoliday }) => {
    if (!isOpen) return null;

    const [name, setName] = useState(existingHoliday ? existingHoliday.name : '');
    const [category, setCategory] = useState(existingHoliday ? existingHoliday.category : 'OFFICIAL');

    useEffect(() => {
        if (isOpen) {
            setName(existingHoliday ? existingHoliday.name : '');
            setCategory(existingHoliday ? existingHoliday.category : 'OFFICIAL');
        }
    }, [isOpen, existingHoliday]);

    const handleSave = () => {
        if (!name.trim()) {
            alert('Lütfen bir isim giriniz.');
            return;
        }
        onSave({ name, category, date: date.format('YYYY-MM-DD') });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in border border-slate-200">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">
                        {existingHoliday ? 'Tatili Düzenle' : 'Yeni Tatil Ekle'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="text-sm font-medium text-slate-500 text-center bg-blue-50 py-2 rounded-lg border border-blue-100 mb-2">
                        {date.format('DD MMMM YYYY, dddd')}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tatil Adı</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            placeholder="Örn: 29 Ekim Cumhuriyet Bayramı"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tatil Türü</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setCategory('OFFICIAL')}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${category === 'OFFICIAL' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 hover:border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <div className="font-bold text-sm">Resmi Tatil</div>
                                <div className="text-[10px] opacity-75 mt-0.5">Mesai Yapılmaz</div>
                            </button>
                            <button
                                onClick={() => setCategory('RELIGIOUS')}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${category === 'RELIGIOUS' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <div className="font-bold text-sm">Dini Bayram</div>
                                <div className="text-[10px] opacity-75 mt-0.5">Mesai Yapılmaz</div>
                            </button>
                        </div>
                    </div>

                    {existingHoliday && (
                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    if (window.confirm('Bu tatili silmek istediğinize emin misiniz?')) {
                                        onDelete(existingHoliday.id);
                                    }
                                }}
                                className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} />
                                Tatili Sil
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">Vazgeç</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                        <Save size={16} />
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
};

const AnnualCalendar = ({ year, schedules, holidays, initialSchedule, onRefresh }) => {
    const [selectedScheduleId, setSelectedScheduleId] = useState(initialSchedule?.id || (schedules[0]?.id));
    const [selectedDate, setSelectedDate] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [holidayToEdit, setHolidayToEdit] = useState(null);

    const { user } = useAuth();
    const today = moment().startOf('day');

    const selectedSchedule = schedules.find(s => s.id === parseInt(selectedScheduleId));
    const months = moment.months();

    // Permission Check
    const canManageHolidays = user?.all_permissions?.includes('CALENDAR_MANAGE_HOLIDAYS');

    const handleDayDoubleClick = (date, currentHoliday) => {
        if (!canManageHolidays) return;

        setSelectedDate(date);
        setHolidayToEdit(currentHoliday);
        setModalOpen(true);
    };

    const handleHolidaySave = async (data) => {
        try {
            if (holidayToEdit) {
                await api.put(`/public-holidays/${holidayToEdit.id}/`, data);
            } else {
                await api.post('/public-holidays/', data);
            }
            setModalOpen(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error saving holiday:', error);
            alert('İşlem başarısız.');
        }
    };

    const handleHolidayDelete = async (id) => {
        try {
            await api.delete(`/public-holidays/${id}/`);
            setModalOpen(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error deleting holiday:', error);
            alert('Silme işlemi başarısız.');
        }
    };

    const getDayStatus = (date) => {
        const dateStr = date.format('YYYY-MM-DD');

        // Check Public Holiday
        const holiday = holidays.find(h => h.date === dateStr);
        if (holiday) {
            const isReligious = holiday.category === 'RELIGIOUS';
            return {
                type: 'HOLIDAY',
                label: holiday.name,
                color: isReligious
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-red-100 text-red-700 border-red-200',
                holiday
            };
        }

        // Check Schedule
        if (!selectedSchedule) return { type: 'UNKNOWN', label: '-', color: 'bg-slate-50' };

        const dayKey = date.format('ddd').toUpperCase();
        const rule = selectedSchedule.schedule[dayKey];

        if (!rule || rule.is_off) {
            return { type: 'OFF', label: 'Tatil', color: 'bg-slate-100 text-slate-400' };
        }

        return { type: 'WORK', label: `${rule.start}-${rule.end}`, color: 'bg-green-50 text-green-700 border-green-200 border' };
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
            <HolidayModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                date={selectedDate}
                existingHoliday={holidayToEdit}
                onSave={handleHolidaySave}
                onDelete={handleHolidayDelete}
            />

            <div className="mb-6 flex flex-col md:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-slate-700">Görüntülenen Takvim:</label>
                    <select
                        value={selectedScheduleId}
                        onChange={(e) => setSelectedScheduleId(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[200px]"
                    >
                        {schedules.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                        <span>Çalışma</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-100 rounded"></div>
                        <span>Hafta Tatili</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                        <span>Resmi Tatil</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-100 border border-indigo-200 rounded"></div>
                        <span>Dini Bayram</span>
                    </div>
                </div>
            </div>

            {canManageHolidays && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-center gap-2">
                    <Check size={16} />
                    <span>Yönetici Modu: Tatil eklemek veya çıkarmak için günlerin üzerine <strong>Çift Tıklayın</strong>.</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {months.map((monthName, index) => {
                    const monthStart = moment(`${year}-${index + 1}-01`, 'YYYY-M-DD');
                    const daysInMonth = monthStart.daysInMonth();
                    const startDayOfWeek = (monthStart.day() + 6) % 7;

                    return (
                        <div key={monthName} className="border border-slate-100 rounded-lg p-4">
                            <h4 className="font-bold text-slate-800 mb-3 text-center capitalize">{monthName}</h4>

                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                                    <div key={d} className="text-center text-xs text-slate-400 font-medium">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {Array(startDayOfWeek).fill(null).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-8"></div>
                                ))}

                                {Array(daysInMonth).fill(null).map((_, i) => {
                                    const date = moment(monthStart).add(i, 'days');
                                    const status = getDayStatus(date);
                                    const isPast = date.isBefore(today);

                                    return (
                                        <div
                                            key={i}
                                            onDoubleClick={() => handleDayDoubleClick(date, status.holiday)}
                                            className={`
                                                h-8 flex items-center justify-center text-xs rounded transition-all 
                                                ${status.color} 
                                                ${isPast ? 'opacity-40 grayscale' : ''} 
                                                ${canManageHolidays ? 'cursor-pointer hover:ring-2 ring-blue-300 hover:scale-110 hover:shadow-lg z-0 hover:z-10' : 'cursor-default'}
                                            `}
                                            title={`${date.format('DD MMMM YYYY')}\n${status.label}${isPast ? ' (Geçmiş)' : ''}`}
                                        >
                                            {i + 1}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
