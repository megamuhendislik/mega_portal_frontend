import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Calendar, Clock, Utensils, FileText, ChevronRight, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const CreateRequestModal = ({ isOpen, onClose, onSuccess, requestTypes }) => {
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState(null); // 'LEAVE', 'OVERTIME', 'MEAL'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form States
    const [leaveForm, setLeaveForm] = useState({
        request_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        destination: '',
        contact_phone: ''
    });

    const [overtimeForm, setOvertimeForm] = useState({
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        reason: ''
    });

    const [mealForm, setMealForm] = useState({
        description: ''
    });

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedType(null);
            setError(null);
            // Reset forms if needed
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTypeSelect = (type) => {
        setSelectedType(type);
        setStep(2);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (selectedType === 'LEAVE') {
                await api.post('/leave/requests/', leaveForm);
            } else if (selectedType === 'OVERTIME') {
                await api.post('/overtime-requests/', overtimeForm);
            } else if (selectedType === 'MEAL') {
                await api.post('/meal-requests/', mealForm);
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating request:', err);
            setError(err.response?.data?.detail || err.response?.data?.error || 'Talep oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const renderTypeSelection = () => (
        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={() => handleTypeSelect('LEAVE')}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shrink-0">
                    <FileText size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">İzin Talebi</h3>
                    <p className="text-sm text-slate-500">Yıllık izin, mazeret izni veya hastalık izni.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>

            <button
                onClick={() => handleTypeSelect('OVERTIME')}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shrink-0">
                    <Clock size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">Fazla Mesai</h3>
                    <p className="text-sm text-slate-500">Planlanan veya gerçekleşen fazla mesai.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>

            <button
                onClick={() => handleTypeSelect('MEAL')}
                className="group relative p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left flex items-center gap-5"
            >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shrink-0">
                    <Utensils size={28} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5">Yemek Talebi</h3>
                    <p className="text-sm text-slate-500">Bugün için yemek tercihi veya talebi.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <ChevronRight size={18} />
                </div>
            </button>
        </div>
    );

    const renderLeaveForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">İzin Türü <span className="text-red-500">*</span></label>
                <select
                    required
                    value={leaveForm.request_type}
                    onChange={e => setLeaveForm({ ...leaveForm, request_type: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                >
                    <option value="">Seçiniz</option>
                    {requestTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="date"
                        value={leaveForm.start_date}
                        onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="date"
                        value={leaveForm.end_date}
                        onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama <span className="text-red-500">*</span></label>
                <textarea
                    required
                    rows="3"
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder="İzin gerekçenizi detaylıca belirtiniz..."
                ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Gidilecek Yer</label>
                    <input
                        value={leaveForm.destination}
                        onChange={e => setLeaveForm({ ...leaveForm, destination: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="Opsiyonel"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">İletişim Telefonu</label>
                    <input
                        value={leaveForm.contact_phone}
                        onChange={e => setLeaveForm({ ...leaveForm, contact_phone: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="Opsiyonel"
                    />
                </div>
            </div>
        </div>
    );

    const renderOvertimeForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tarih <span className="text-red-500">*</span></label>
                <input
                    required
                    type="date"
                    value={overtimeForm.date}
                    onChange={e => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium text-slate-700"
                />
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Başlangıç Saati <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="time"
                        value={overtimeForm.start_time}
                        onChange={e => setOvertimeForm({ ...overtimeForm, start_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Bitiş Saati <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="time"
                        value={overtimeForm.end_time}
                        onChange={e => setOvertimeForm({ ...overtimeForm, end_time: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Açıklama <span className="text-red-500">*</span></label>
                <textarea
                    required
                    rows="3"
                    value={overtimeForm.reason}
                    onChange={e => setOvertimeForm({ ...overtimeForm, reason: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder="Fazla mesai gerekçenizi belirtiniz..."
                ></textarea>
            </div>
        </div>
    );

    const renderMealForm = () => (
        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="bg-emerald-50 p-4 rounded-xl flex items-start gap-3 text-emerald-800 text-sm border border-emerald-100">
                <Utensils className="shrink-0 mt-0.5" size={18} />
                <p>Yemek talebi oluşturarak bugünkü yemek listesine adınızı yazdırabilirsiniz. Lütfen özel tercihiniz varsa belirtiniz.</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Yemek Tercihi / Açıklama <span className="text-red-500">*</span></label>
                <textarea
                    required
                    rows="3"
                    value={mealForm.description}
                    onChange={e => setMealForm({ ...mealForm, description: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none font-medium text-slate-700"
                    placeholder="Örn: Standart menü, Vejetaryen, İçecek..."
                ></textarea>
            </div>
        </div>
    );

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {step === 1 ? 'Yeni Talep Oluştur' :
                                    selectedType === 'LEAVE' ? 'İzin Talebi' :
                                        selectedType === 'OVERTIME' ? 'Fazla Mesai Talebi' : 'Yemek Talebi'}
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium">
                                {step === 1 ? 'Talep türünü seçiniz' : 'Bilgileri doldurunuz'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <p>{error}</p>
                        </div>
                    )}

                    {step === 1 && renderTypeSelection()}

                    {step === 2 && (
                        <form id="requestForm" onSubmit={handleSubmit}>
                            {selectedType === 'LEAVE' && renderLeaveForm()}
                            {selectedType === 'OVERTIME' && renderOvertimeForm()}
                            {selectedType === 'MEAL' && renderMealForm()}
                        </form>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all text-sm"
                        >
                            İptal
                        </button>
                        <button
                            form="requestForm"
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-sm
                                ${selectedType === 'LEAVE' ? 'bg-blue-600 hover:bg-blue-700' :
                                    selectedType === 'OVERTIME' ? 'bg-amber-500 hover:bg-amber-600' :
                                        'bg-emerald-600 hover:bg-emerald-700'}
                                ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                            `}
                        >
                            {loading ? 'Gönderiliyor...' : (
                                <>
                                    <Check size={18} />
                                    Talep Oluştur
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default CreateRequestModal;
