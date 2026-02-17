import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, UserPlus, Edit2, Trash2, Check, X, AlertCircle, Users, Shield,
  ChevronDown, ChevronUp, Search, Clock, ArrowRightLeft, ToggleLeft, ToggleRight,
  Plus, CheckCircle2, XCircle, CalendarDays, UserCheck, Briefcase
} from 'lucide-react';
import api from '../services/api';

const SubstituteManagement = () => {
  const { hasPermission } = useAuth();
  const [delegations, setDelegations] = useState([]);
  const [myDelegations, setMyDelegations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('given');
  const [searchText, setSearchText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [formData, setFormData] = useState({
    principal: '',
    substitute: '',
    valid_from: '',
    valid_to: '',
    is_active: true
  });

  const [formErrors, setFormErrors] = useState({});
  const [principalSearch, setPrincipalSearch] = useState('');
  const [substituteSearch, setSubstituteSearch] = useState('');

  useEffect(() => {
    fetchDelegations();
    fetchEmployees();
  }, []);

  const fetchDelegations = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        api.get('/substitute-authority/'),
        api.get('/substitute-authority/my_delegations/').catch(() => ({ data: [] }))
      ]);
      const allData = Array.isArray(allRes.data) ? allRes.data : (allRes.data.results || []);
      const myData = Array.isArray(myRes.data) ? myRes.data : (myRes.data.results || []);
      setDelegations(allData);
      setMyDelegations(myData);
    } catch (err) {
      setError('Vekalet kayıtları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/');
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setEmployees(data);
    } catch (err) {
      console.error('Çalışanlar yüklenemedi:', err);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const getStatus = (d) => {
    if (!d.is_active) return 'passive';
    if (d.valid_from > today) return 'future';
    if (d.valid_to < today) return 'expired';
    return 'active';
  };

  const stats = useMemo(() => {
    const all = delegations;
    return {
      active: all.filter(d => getStatus(d) === 'active').length,
      future: all.filter(d => getStatus(d) === 'future').length,
      expired: all.filter(d => getStatus(d) === 'expired').length,
      passive: all.filter(d => getStatus(d) === 'passive').length,
      total: all.length
    };
  }, [delegations]);

  const filteredDelegations = useMemo(() => {
    const list = activeTab === 'given' ? delegations : myDelegations;
    if (!searchText) return list;
    const s = searchText.toLowerCase();
    return list.filter(d =>
      (d.principal_name || '').toLowerCase().includes(s) ||
      (d.substitute_name || '').toLowerCase().includes(s)
    );
  }, [delegations, myDelegations, activeTab, searchText]);

  const filteredPrincipalEmployees = useMemo(() => {
    if (!principalSearch) return employees;
    const s = principalSearch.toLowerCase();
    return employees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
      (e.job_position_display || '').toLowerCase().includes(s)
    );
  }, [employees, principalSearch]);

  const filteredSubstituteEmployees = useMemo(() => {
    if (!substituteSearch) return employees;
    const s = substituteSearch.toLowerCase();
    return employees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) ||
      (e.job_position_display || '').toLowerCase().includes(s)
    );
  }, [employees, substituteSearch]);

  const validateForm = () => {
    const errors = {};
    if (!formData.principal) errors.principal = 'Asıl yönetici seçiniz';
    if (!formData.substitute) errors.substitute = 'Vekil yönetici seçiniz';
    if (!formData.valid_from) errors.valid_from = 'Başlangıç tarihi giriniz';
    if (!formData.valid_to) errors.valid_to = 'Bitiş tarihi giriniz';
    if (formData.principal && formData.substitute && formData.principal === formData.substitute) {
      errors.substitute = 'Asıl yönetici ile vekil aynı kişi olamaz';
    }
    if (formData.valid_from && formData.valid_to && formData.valid_to < formData.valid_from) {
      errors.valid_to = 'Bitiş tarihi başlangıçtan önce olamaz';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      if (editingId) {
        await api.put(`/substitute-authority/${editingId}/`, formData);
        setSuccess('Vekalet kaydı güncellendi');
      } else {
        await api.post('/substitute-authority/', formData);
        setSuccess('Vekalet kaydı oluşturuldu');
      }
      fetchDelegations();
      resetForm();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      if (err.response?.data) {
        const errorMsg = typeof err.response.data === 'string'
          ? err.response.data
          : Object.values(err.response.data).flat().join(', ');
        setError(errorMsg);
      } else {
        setError('İşlem başarısız oldu');
      }
    }
  };

  const handleEdit = (delegation) => {
    setFormData({
      principal: delegation.principal,
      substitute: delegation.substitute,
      valid_from: delegation.valid_from,
      valid_to: delegation.valid_to,
      is_active: delegation.is_active
    });
    setEditingId(delegation.id);
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/substitute-authority/${id}/`);
      setSuccess('Vekalet kaydı silindi');
      setConfirmDelete(null);
      fetchDelegations();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Silme işlemi başarısız oldu');
    }
  };

  const handleToggleActive = async (delegation) => {
    try {
      await api.patch(`/substitute-authority/${delegation.id}/`, {
        is_active: !delegation.is_active
      });
      setSuccess(`Vekalet kaydı ${!delegation.is_active ? 'aktif' : 'pasif'} edildi`);
      fetchDelegations();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Durum değiştirilemedi');
    }
  };

  const resetForm = () => {
    setFormData({ principal: '', substitute: '', valid_from: '', valid_to: '', is_active: true });
    setEditingId(null);
    setShowForm(false);
    setFormErrors({});
    setPrincipalSearch('');
    setSubstituteSearch('');
  };

  const getStatusBadge = (delegation) => {
    const s = getStatus(delegation);
    const config = {
      active: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Aktif', icon: <CheckCircle2 size={14} /> },
      future: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', label: 'Gelecek', icon: <CalendarDays size={14} /> },
      expired: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200', label: 'Süresi Dolmuş', icon: <Clock size={14} /> },
      passive: { bg: 'bg-slate-100', text: 'text-slate-500', ring: 'ring-slate-200', label: 'Pasif', icon: <XCircle size={14} /> }
    };
    const c = config[s];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${c.bg} ${c.text} ring-1 ${c.ring}`}>
        {c.icon} {c.label}
      </span>
    );
  };

  const getRemainingDays = (delegation) => {
    const s = getStatus(delegation);
    if (s !== 'active') return null;
    const end = new Date(delegation.valid_to);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-12 bg-slate-100 rounded-2xl w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
          </div>
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <ArrowRightLeft size={28} className="text-blue-600" />
            </div>
            Vekalet Yönetimi
          </h1>
          <p className="text-slate-500 font-medium mt-1">Yönetici vekalet yetkilerini tanımlayın ve takip edin</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className={`group px-6 py-3 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95 ${
            showForm
              ? 'bg-slate-200 text-slate-700 shadow-slate-100 hover:bg-slate-300'
              : 'bg-slate-900 hover:bg-black text-white shadow-slate-200'
          }`}
        >
          {showForm ? <X size={20} /> : <Plus size={20} className="group-hover:rotate-90 transition-transform" />}
          {showForm ? 'İptal' : 'Yeni Vekalet'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 animate-in slide-in-from-top-2">
          <AlertCircle size={20} className="shrink-0" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 animate-in slide-in-from-top-2">
          <CheckCircle2 size={20} className="shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Aktif</p>
              <h3 className="text-3xl font-bold text-emerald-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{stats.active}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gelecek</p>
              <h3 className="text-3xl font-bold text-blue-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{stats.future}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
              <CalendarDays size={20} className="text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Süresi Dolmuş</p>
              <h3 className="text-3xl font-bold text-amber-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{stats.expired}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
              <Clock size={20} className="text-amber-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Toplam</p>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50">
              <Users size={20} className="text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {editingId ? <Edit2 size={20} className="text-blue-600" /> : <UserPlus size={20} className="text-blue-600" />}
              {editingId ? 'Vekalet Düzenle' : 'Yeni Vekalet Oluştur'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Principal */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Asıl Yönetici <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={principalSearch}
                    onChange={(e) => setPrincipalSearch(e.target.value)}
                    className="w-full px-3 py-2 mb-1 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50"
                    disabled={!hasPermission('SYSTEM_FULL_ACCESS') && !hasPermission('MANAGE_SUBSTITUTE')}
                  />
                  <select
                    value={formData.principal}
                    onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                    required
                    disabled={!hasPermission('SYSTEM_FULL_ACCESS') && !hasPermission('MANAGE_SUBSTITUTE')}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition ${
                      formErrors.principal ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                    } ${(!hasPermission('SYSTEM_FULL_ACCESS') && !hasPermission('MANAGE_SUBSTITUTE')) ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Seçiniz...</option>
                    {filteredPrincipalEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} {emp.job_position_display ? `- ${emp.job_position_display}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.principal && <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.principal}</p>}
              </div>

              {/* Substitute */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Vekil Yönetici <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={substituteSearch}
                    onChange={(e) => setSubstituteSearch(e.target.value)}
                    className="w-full px-3 py-2 mb-1 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50"
                  />
                  <select
                    value={formData.substitute}
                    onChange={(e) => setFormData({ ...formData, substitute: e.target.value })}
                    required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition ${
                      formErrors.substitute ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <option value="">Seçiniz...</option>
                    {filteredSubstituteEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} {emp.job_position_display ? `- ${emp.job_position_display}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.substitute && <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.substitute}</p>}
              </div>

              {/* Dates */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Başlangıç Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  required
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition ${
                    formErrors.valid_from ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  }`}
                />
                {formErrors.valid_from && <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.valid_from}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Bitiş Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  required
                  min={formData.valid_from || undefined}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition ${
                    formErrors.valid_to ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                  }`}
                />
                {formErrors.valid_to && <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.valid_to}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className="flex items-center gap-2"
              >
                {formData.is_active
                  ? <ToggleRight size={28} className="text-emerald-500" />
                  : <ToggleLeft size={28} className="text-slate-400" />
                }
              </button>
              <span className={`text-sm font-bold ${formData.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>
                {formData.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                {editingId ? 'Güncelle' : 'Oluştur'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('given')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'given' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield size={16} />
            Verdiğim / Tüm Vekaletler
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'given' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
            }`}>{delegations.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'received' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck size={16} />
            Vekil Olduğum
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'received' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
            }`}>{myDelegations.length}</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="İsim ile ara..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Delegations Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredDelegations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <ArrowRightLeft size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">
              {activeTab === 'given' ? 'Vekalet kaydı bulunmuyor' : 'Vekil olarak atanmış kaydınız yok'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'given' ? 'Yeni bir vekalet tanımlamak için "Yeni Vekalet" butonunu kullanın.' : 'Henüz hiçbir yönetici sizi vekil olarak atamamış.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Asıl Yönetici</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vekil</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tarih Aralığı</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kalan</th>
                  {activeTab === 'given' && (
                    <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İşlemler</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDelegations.map(d => {
                  const remaining = getRemainingDays(d);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">{getStatusBadge(d)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                            {(d.principal_name || '?')[0]}
                          </div>
                          <span className="text-sm font-bold text-slate-800">{d.principal_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                            {(d.substitute_name || '?')[0]}
                          </div>
                          <span className="text-sm font-bold text-slate-800">{d.substitute_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-600 font-medium">
                          {new Date(d.valid_from).toLocaleDateString('tr-TR')} — {new Date(d.valid_to).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {remaining !== null ? (
                          <span className={`text-sm font-bold ${remaining <= 3 ? 'text-red-600' : remaining <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {remaining} gün
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      {activeTab === 'given' && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => handleEdit(d)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Düzenle"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(d)}
                              className={`p-2 rounded-lg transition ${d.is_active
                                ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={d.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                            >
                              {d.is_active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(d.id)}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Vekalet Sil</h3>
                <p className="text-sm text-slate-500">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 transition active:scale-95"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubstituteManagement;
