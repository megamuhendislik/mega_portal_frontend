import React, { useState, useEffect } from 'react';
import { Calendar, UserPlus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import api from '../services/api';

const SubstituteManagement = () => {
  const [delegations, setDelegations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    principal: '',
    substitute: '',
    valid_from: '',
    valid_to: '',
    is_active: true
  });

  useEffect(() => {
    fetchDelegations();
    fetchEmployees();
  }, []);

  const fetchDelegations = async () => {
    try {
      const response = await api.get('/api/substitute-authority/');
      setDelegations(response.data);
    } catch (err) {
      setError('Vekalet kayıtları yüklenemedi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees/');
      setEmployees(response.data);
    } catch (err) {
      console.error('Çalışanlar yüklenemedi:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await api.put(`/api/substitute-authority/${editingId}/`, formData);
        setSuccess('Vekalet kaydı güncellendi');
      } else {
        await api.post('/api/substitute-authority/', formData);
        setSuccess('Vekalet kaydı oluşturuldu');
      }

      fetchDelegations();
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.data) {
        const errorMsg = Object.values(err.response.data).flat().join(', ');
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
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu vekalet kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.delete(`/api/substitute-authority/${id}/`);
      setSuccess('Vekalet kaydı silindi');
      fetchDelegations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Silme işlemi başarısız oldu');
    }
  };

  const handleToggleActive = async (delegation) => {
    try {
      await api.patch(`/api/substitute-authority/${delegation.id}/`, {
        is_active: !delegation.is_active
      });
      setSuccess(`Vekalet kaydı ${!delegation.is_active ? 'aktif' : 'pasif'} edildi`);
      fetchDelegations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Durum değiştirilemedi');
    }
  };

  const resetForm = () => {
    setFormData({
      principal: '',
      substitute: '',
      valid_from: '',
      valid_to: '',
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const isCurrentlyValid = (delegation) => {
    const today = new Date().toISOString().split('T')[0];
    return delegation.is_active &&
           delegation.valid_from <= today &&
           delegation.valid_to >= today;
  };

  const getStatusBadge = (delegation) => {
    if (!delegation.is_active) {
      return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">Pasif</span>;
    }
    if (isCurrentlyValid(delegation)) {
      return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Aktif</span>;
    }
    const today = new Date().toISOString().split('T')[0];
    if (delegation.valid_from > today) {
      return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Gelecek</span>;
    }
    return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">Süresi Dolmuş</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vekalet Yönetimi</h1>
          <p className="text-slate-600 mt-1">Yönetici vekalet yetkilerini tanımlayın</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? <X size={20} /> : <UserPlus size={20} />}
          {showForm ? 'İptal' : 'Yeni Vekalet'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <Check size={20} />
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {editingId ? 'Vekalet Düzenle' : 'Yeni Vekalet Oluştur'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Asıl Yönetici
                </label>
                <select
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seçiniz...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.job_position_display}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vekil Yönetici
                </label>
                <select
                  value={formData.substitute}
                  onChange={(e) => setFormData({ ...formData, substitute: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seçiniz...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.job_position_display}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">
                Aktif
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Güncelle' : 'Oluştur'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delegations List */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calendar size={20} />
            Vekalet Kayıtları ({delegations.length})
          </h2>
        </div>

        {delegations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Henüz vekalet kaydı bulunmuyor
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Asıl Yönetici</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Vekil Yönetici</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Başlangıç</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Bitiş</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {delegations.map(delegation => (
                  <tr key={delegation.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {getStatusBadge(delegation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {delegation.principal_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {delegation.substitute_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(delegation.valid_from).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(delegation.valid_to).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(delegation)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(delegation)}
                          className={`p-2 rounded transition ${
                            delegation.is_active
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={delegation.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                        >
                          {delegation.is_active ? <X size={16} /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(delegation.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Delegations Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Aktif Vekaletler</h3>
        <div className="text-sm text-blue-800">
          {delegations.filter(d => isCurrentlyValid(d)).length} adet aktif vekalet kaydı bulunuyor
        </div>
      </div>
    </div>
  );
};

export default SubstituteManagement;
