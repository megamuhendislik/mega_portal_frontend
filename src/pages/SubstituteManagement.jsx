import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Edit2, Trash2, X, AlertCircle, Users, Shield,
  Search, Clock, ArrowRightLeft, Plus, CheckCircle2, XCircle,
  CalendarDays, UserCheck, Loader2, ToggleLeft, ToggleRight,
  ArrowRight
} from 'lucide-react';
import { Select, Tooltip } from 'antd';
import StatCard from '../components/StatCard';
import api from '../services/api';
import { getIstanbulToday } from '../utils/dateUtils';

const SubstituteManagement = () => {
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
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    principal: '',
    substitute: '',
    valid_from: '',
    valid_to: '',
    is_active: true
  });

  const [formErrors, setFormErrors] = useState({});

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

  // -- Computed --

  const getStatus = (d) => {
    const today = getIstanbulToday();
    if (!d.is_active) return 'passive';
    if (d.valid_from > today) return 'future';
    if (d.valid_to < today) return 'expired';
    return 'active';
  };

  const stats = useMemo(() => {
    const today = getIstanbulToday();
    const s = (d) => {
      if (!d.is_active) return 'passive';
      if (d.valid_from > today) return 'future';
      if (d.valid_to < today) return 'expired';
      return 'active';
    };
    return {
      active: delegations.filter(d => s(d) === 'active').length,
      future: delegations.filter(d => s(d) === 'future').length,
      expired: delegations.filter(d => s(d) === 'expired').length,
      passive: delegations.filter(d => s(d) === 'passive').length,
      total: delegations.length
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

  const employeeOptions = useMemo(() =>
    employees.map(emp => ({
      value: emp.id,
      label: `${emp.first_name} ${emp.last_name}`,
    }))
  , [employees]);

  const getProgress = (d) => {
    const status = getStatus(d);
    if (status === 'expired') return 100;
    if (status !== 'active') return 0;
    const start = new Date(d.valid_from).getTime();
    const end = new Date(d.valid_to).getTime();
    const now = Date.now();
    if (end <= start) return 100;
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  };

  const getTotalDays = (d) => {
    const start = new Date(d.valid_from).getTime();
    const end = new Date(d.valid_to).getTime();
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  };

  const getRemainingDays = (d) => {
    if (getStatus(d) !== 'active') return null;
    const end = new Date(d.valid_to);
    const now = new Date();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  // -- Handlers --

  const validateForm = () => {
    const errors = {};
    if (!formData.principal) errors.principal = 'Asıl yönetici seçiniz';
    if (!formData.substitute) errors.substitute = 'Vekil yönetici seçiniz';
    if (!formData.valid_from) errors.valid_from = 'Başlangıç tarihi giriniz';
    if (!formData.valid_to) errors.valid_to = 'Bitiş tarihi giriniz';
    if (formData.principal && formData.substitute && String(formData.principal) === String(formData.substitute)) {
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
    if (submitting) return;

    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
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
      setConfirmToggle(null);
      fetchDelegations();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Durum değiştirilemedi');
      setConfirmToggle(null);
    }
  };

  const resetForm = () => {
    setFormData({ principal: '', substitute: '', valid_from: '', valid_to: '', is_active: true });
    setEditingId(null);
    setShowForm(false);
    setFormErrors({});
  };

  // -- UI Helpers --

  const statusConfig = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200/60', label: 'Aktif', icon: CheckCircle2, border: 'border-l-emerald-400' },
    future: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200/60', label: 'Gelecek', icon: CalendarDays, border: 'border-l-blue-400' },
    expired: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200/60', label: 'Süresi Dolmuş', icon: Clock, border: 'border-l-amber-400' },
    passive: { bg: 'bg-slate-50', text: 'text-slate-400', ring: 'ring-slate-200/60', label: 'Pasif', icon: XCircle, border: 'border-l-slate-300' }
  };

  const StatusBadge = ({ delegation }) => {
    const s = getStatus(delegation);
    const c = statusConfig[s];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full ${c.bg} ${c.text} ring-1 ${c.ring}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  const PersonCell = ({ name, position, variant = 'principal' }) => {
    const gradients = {
      principal: 'from-blue-500 to-indigo-600',
      substitute: 'from-emerald-500 to-teal-600'
    };
    return (
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradients[variant]} flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0`}>
          {(name || '?')[0]}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
          {position && (
            <div className="text-[11px] text-slate-400 font-medium truncate">{position}</div>
          )}
        </div>
      </div>
    );
  };

  const PeriodCell = ({ delegation }) => {
    const status = getStatus(delegation);
    const progress = getProgress(delegation);
    const totalDays = getTotalDays(delegation);
    const progressColor = {
      active: 'bg-emerald-400',
      future: 'bg-blue-300',
      expired: 'bg-amber-400',
      passive: 'bg-slate-300'
    }[status];

    return (
      <div className="space-y-1.5 min-w-[160px]">
        <div className="text-sm text-slate-600 font-medium">
          {new Date(delegation.valid_from).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
          {' — '}
          {new Date(delegation.valid_to).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{totalDays} gün</span>
        </div>
      </div>
    );
  };

  const RemainingBadge = ({ delegation }) => {
    const remaining = getRemainingDays(delegation);
    if (remaining === null) return <span className="text-slate-300">—</span>;

    const color = remaining <= 3
      ? 'bg-red-50 text-red-600 ring-red-100'
      : remaining <= 7
        ? 'bg-amber-50 text-amber-600 ring-amber-100'
        : 'bg-emerald-50 text-emerald-600 ring-emerald-100';

    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ${color}`}>
        <Clock size={11} />
        {remaining} gün
      </div>
    );
  };

  // -- Loading Skeleton --

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-60 bg-slate-200/60 rounded-xl" />
            <div className="h-4 w-80 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-12 w-36 bg-slate-200/60 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex justify-between">
                <div className="space-y-3">
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                  <div className="h-8 w-12 bg-slate-200/60 rounded-lg" />
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-12 w-96 bg-slate-100 rounded-xl" />
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-100/50">
              <ArrowRightLeft size={26} className="text-blue-600" />
            </div>
            Vekalet Yönetimi
          </h1>
          <p className="text-slate-400 font-medium mt-1.5 ml-[52px]">
            Yönetici vekalet yetkilerini tanımlayın ve takip edin
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className={`group px-6 py-3 rounded-2xl font-bold shadow-lg transition-all duration-300 flex items-center gap-2 active:scale-95 ${
            showForm
              ? 'bg-slate-100 text-slate-600 shadow-none hover:bg-slate-200'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]'
          }`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />}
          {showForm ? 'İptal' : 'Yeni Vekalet'}
        </button>
      </div>

      {/* ─── Alerts ─── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 animate-fade-in">
          <div className="p-1.5 bg-red-100 rounded-lg">
            <AlertCircle size={16} />
          </div>
          <span className="font-medium text-sm flex-1">{error}</span>
          <button onClick={() => setError('')} className="p-1 text-red-300 hover:text-red-500 transition"><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 animate-fade-in">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <CheckCircle2 size={16} />
          </div>
          <span className="font-medium text-sm flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="p-1 text-emerald-300 hover:text-emerald-500 transition"><X size={16} /></button>
        </div>
      )}

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckCircle2}
          title="Aktif"
          value={stats.active}
          color="emerald"
          subLabel={stats.active > 0 ? 'devam eden' : undefined}
        />
        <StatCard
          icon={CalendarDays}
          title="Gelecek"
          value={stats.future}
          color="blue"
          subLabel={stats.future > 0 ? 'planlı' : undefined}
        />
        <StatCard
          icon={Clock}
          title="Süresi Dolmuş"
          value={stats.expired}
          color="amber"
        />
        <StatCard
          icon={Users}
          title="Toplam"
          value={stats.total}
          color="indigo"
          subValue={stats.passive > 0 ? `${stats.passive} pasif` : undefined}
        />
      </div>

      {/* ─── Form ─── */}
      {showForm && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                {editingId ? <Edit2 size={18} className="text-blue-600" /> : <UserPlus size={18} className="text-blue-600" />}
              </div>
              {editingId ? 'Vekalet Düzenle' : 'Yeni Vekalet Oluştur'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Principal Select */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Asıl Yönetici <span className="text-red-400">*</span>
                </label>
                <Select
                  showSearch
                  placeholder="Personel seçiniz..."
                  value={formData.principal || undefined}
                  onChange={(val) => setFormData({ ...formData, principal: val || '' })}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={employeeOptions}
                  className="w-full"
                  size="large"
                  allowClear
                  status={formErrors.principal ? 'error' : undefined}
                  notFoundContent="Sonuç bulunamadı"
                />
                {formErrors.principal && <p className="mt-1.5 text-xs text-red-500 font-medium">{formErrors.principal}</p>}
              </div>

              {/* Substitute Select */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Vekil Yönetici <span className="text-red-400">*</span>
                </label>
                <Select
                  showSearch
                  placeholder="Personel seçiniz..."
                  value={formData.substitute || undefined}
                  onChange={(val) => setFormData({ ...formData, substitute: val || '' })}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={employeeOptions}
                  className="w-full"
                  size="large"
                  allowClear
                  status={formErrors.substitute ? 'error' : undefined}
                  notFoundContent="Sonuç bulunamadı"
                />
                {formErrors.substitute && <p className="mt-1.5 text-xs text-red-500 font-medium">{formErrors.substitute}</p>}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Başlangıç Tarihi <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  required
                  className={`input-field ${formErrors.valid_from ? '!border-red-300 !bg-red-50/50' : ''}`}
                />
                {formErrors.valid_from && <p className="mt-1.5 text-xs text-red-500 font-medium">{formErrors.valid_from}</p>}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Bitiş Tarihi <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  required
                  min={formData.valid_from || undefined}
                  className={`input-field ${formErrors.valid_to ? '!border-red-300 !bg-red-50/50' : ''}`}
                />
                {formErrors.valid_to && <p className="mt-1.5 text-xs text-red-500 font-medium">{formErrors.valid_to}</p>}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className="flex items-center gap-2 transition-colors"
              >
                {formData.is_active
                  ? <ToggleRight size={28} className="text-emerald-500" />
                  : <ToggleLeft size={28} className="text-slate-400" />
                }
              </button>
              <span className={`text-sm font-bold transition-colors ${formData.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                {formData.is_active ? 'Aktif olarak oluştur' : 'Pasif olarak oluştur'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Oluştur')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary w-auto px-8"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Tabs + Search ─── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
          <button
            onClick={() => setActiveTab('given')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'given'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield size={15} />
            <span className="hidden sm:inline">Verdiğim / Tüm</span>
            <span className="sm:hidden">Tüm</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'given' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
            }`}>{delegations.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'received'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck size={15} />
            <span className="hidden sm:inline">Vekil Olduğum</span>
            <span className="sm:hidden">Vekil</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'received' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
            }`}>{myDelegations.length}</span>
          </button>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="İsim ile ara..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* ─── Delegations ─── */}
      <div className="glass-card overflow-hidden">
        {filteredDelegations.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 rotate-3 shadow-sm">
                <ArrowRightLeft size={32} className="text-slate-300" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                <Plus size={13} className="text-blue-500" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-700">
              {activeTab === 'given' ? 'Vekalet kaydı bulunmuyor' : 'Vekil olarak atanmış kaydınız yok'}
            </h3>
            <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
              {activeTab === 'given'
                ? 'Yeni bir vekalet tanımlamak için yukarıdaki "Yeni Vekalet" butonunu kullanın.'
                : 'Henüz hiçbir yönetici sizi vekil olarak atamamış.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pl-5 pr-3 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Durum</th>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Asıl Yönetici</th>
                    <th className="px-1 py-3.5 w-8" />
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Vekil</th>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Süre</th>
                    <th className="px-3 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kalan</th>
                    {activeTab === 'given' && (
                      <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">İşlemler</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredDelegations.map((d, idx) => {
                    const status = getStatus(d);
                    const borderColor = statusConfig[status].border;
                    return (
                      <tr
                        key={d.id}
                        className={`border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60 transition-colors duration-150 border-l-[3px] ${borderColor}`}
                      >
                        <td className="pl-5 pr-3 py-4">
                          <StatusBadge delegation={d} />
                        </td>
                        <td className="px-3 py-4">
                          <PersonCell
                            name={d.principal_name}
                            position={d.principal_position}
                            variant="principal"
                          />
                        </td>
                        <td className="px-1 py-4">
                          <div className="flex items-center justify-center">
                            <ArrowRight size={14} className="text-slate-300" />
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <PersonCell
                            name={d.substitute_name}
                            position={d.substitute_position}
                            variant="substitute"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <PeriodCell delegation={d} />
                        </td>
                        <td className="px-3 py-4">
                          <RemainingBadge delegation={d} />
                        </td>
                        {activeTab === 'given' && (
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 justify-end">
                              <Tooltip title="Düzenle">
                                <button
                                  onClick={() => handleEdit(d)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                >
                                  <Edit2 size={15} />
                                </button>
                              </Tooltip>
                              <Tooltip title={d.is_active ? 'Pasif Yap' : 'Aktif Yap'}>
                                <button
                                  onClick={() => setConfirmToggle(d)}
                                  className={`p-2 rounded-lg transition-all duration-200 ${d.is_active
                                    ? 'text-emerald-500 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  {d.is_active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                                </button>
                              </Tooltip>
                              <Tooltip title="Sil">
                                <button
                                  onClick={() => setConfirmDelete(d.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredDelegations.map(d => {
                const status = getStatus(d);
                const remaining = getRemainingDays(d);
                const progress = getProgress(d);
                const totalDays = getTotalDays(d);
                const borderColor = statusConfig[status].border;

                return (
                  <div key={d.id} className={`p-4 border-l-[3px] ${borderColor}`}>
                    {/* Top: Status + Remaining */}
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge delegation={d} />
                      {remaining !== null && (
                        <span className={`text-xs font-bold ${
                          remaining <= 3 ? 'text-red-500' : remaining <= 7 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {remaining} gün kaldı
                        </span>
                      )}
                    </div>

                    {/* People Flow */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                          {(d.principal_name || '?')[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">{d.principal_name}</div>
                          {d.principal_position && <div className="text-[10px] text-slate-400 truncate">{d.principal_position}</div>}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 shrink-0 mx-1" />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                          {(d.substitute_name || '?')[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">{d.substitute_name}</div>
                          {d.substitute_position && <div className="text-[10px] text-slate-400 truncate">{d.substitute_position}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Period */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(d.valid_from).toLocaleDateString('tr-TR')} — {new Date(d.valid_to).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{totalDays} gün</span>
                      </div>
                      {(status === 'active' || status === 'expired') && (
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {activeTab === 'given' && (
                      <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleEdit(d)}
                          className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
                        >
                          <Edit2 size={12} /> Düzenle
                        </button>
                        <button
                          onClick={() => setConfirmToggle(d)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                            d.is_active
                              ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                              : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {d.is_active ? <><ToggleLeft size={12} /> Pasif</> : <><ToggleRight size={12} /> Aktif</>}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(d.id)}
                          className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1.5"
                        >
                          <Trash2 size={12} /> Sil
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ─── Delete Confirmation Modal ─── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-red-400 to-rose-500" />
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0 border border-red-100">
                  <Trash2 size={22} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Vekaleti Sil</h3>
                  <p className="text-sm text-slate-500 mt-1">Bu işlem geri alınamaz. Vekalet kaydı kalıcı olarak silinecektir.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toggle Confirmation Modal ─── */}
      {confirmToggle && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setConfirmToggle(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className={`h-1 bg-gradient-to-r ${confirmToggle.is_active ? 'from-amber-400 to-orange-400' : 'from-emerald-400 to-teal-400'}`} />
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  confirmToggle.is_active ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
                }`}>
                  {confirmToggle.is_active
                    ? <ToggleLeft size={22} className="text-amber-500" />
                    : <ToggleRight size={22} className="text-emerald-500" />
                  }
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {confirmToggle.is_active ? 'Vekaleti Pasif Yap' : 'Vekaleti Aktif Yap'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
                    <span className="font-medium">{confirmToggle.principal_name}</span>
                    <ArrowRight size={12} className="text-slate-300" />
                    <span className="font-medium">{confirmToggle.substitute_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmToggle(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => handleToggleActive(confirmToggle)}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${
                    confirmToggle.is_active
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20'
                  }`}
                >
                  {confirmToggle.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubstituteManagement;
