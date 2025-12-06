import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Briefcase, MoreVertical, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        status: 'PLANNING'
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects/');
            setProjects(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects/', formData);
            setShowModal(false);
            fetchProjects();
            setFormData({
                name: '',
                code: '',
                description: '',
                start_date: '',
                end_date: '',
                location: '',
                status: 'PLANNING'
            });
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Error creating project. Please check the console.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
            case 'PLANNING': return 'bg-blue-100 text-blue-700';
            case 'ON_HOLD': return 'bg-amber-100 text-amber-700';
            case 'COMPLETED': return 'bg-slate-100 text-slate-700';
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'ACTIVE': return 'Aktif';
            case 'PLANNING': return 'Planlama';
            case 'ON_HOLD': return 'Beklemede';
            case 'COMPLETED': return 'Tamamlandı';
            case 'CANCELLED': return 'İptal';
            default: return status;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Projeler</h2>
                    <p className="text-slate-500 mt-1">Devam eden ve planlanan projeler</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus size={18} className="mr-2" />
                    Yeni Proje Oluştur
                </button>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div key={project.id} className="card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                {getStatusLabel(project.status)}
                            </div>
                            <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                <MoreVertical size={20} />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                            {project.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">
                            {project.description || 'Açıklama yok.'}
                        </p>

                        <div className="space-y-3 pt-4 border-t border-slate-100 text-sm text-slate-600">
                            <div className="flex items-center">
                                <Briefcase size={16} className="mr-2 text-slate-400" />
                                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{project.code}</span>
                            </div>
                            <div className="flex items-center">
                                <MapPin size={16} className="mr-2 text-slate-400" />
                                <span>{project.location || 'Lokasyon belirtilmedi'}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar size={16} className="mr-2 text-slate-400" />
                                <span>{project.start_date}</span>
                                {project.end_date && <span className="mx-1">-</span>}
                                {project.end_date && <span>{project.end_date}</span>}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Card Placeholder */}
                <button
                    onClick={() => setShowModal(true)}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all group min-h-[250px]"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center mb-4 transition-colors">
                        <Plus size={32} />
                    </div>
                    <span className="font-medium">Yeni Proje Ekle</span>
                </button>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">Yeni Proje Oluştur</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Proje Adı</label>
                                    <input required name="name" value={formData.name} onChange={handleInputChange} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Proje Kodu</label>
                                    <input required name="code" value={formData.code} onChange={handleInputChange} className="input-field" placeholder="Örn: PRJ-2025-001" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange} className="input-field">
                                        <option value="PLANNING">Planlama</option>
                                        <option value="ACTIVE">Aktif</option>
                                        <option value="ON_HOLD">Beklemede</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Tarihi</label>
                                    <input required type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi (Tahmini)</label>
                                    <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="input-field" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Lokasyon</label>
                                    <input name="location" value={formData.location} onChange={handleInputChange} className="input-field" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                                    <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} className="input-field"></textarea>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">İptal</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 transition-all">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
