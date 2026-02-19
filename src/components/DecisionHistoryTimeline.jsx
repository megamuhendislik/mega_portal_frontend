import React, { useState, useEffect } from 'react';
import { Clock, User, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';
import api from '../services/api';

const DecisionHistoryTimeline = ({ contentType, objectId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [contentType, objectId]);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/decision-history/for_request/', {
        params: {
          content_type: contentType,
          object_id: objectId
        }
      });
      setHistory(response.data);
    } catch (err) {
      setError('Karar geçmişi yüklenemedi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('APPROVED') || action === 'APPROVED') {
      return <CheckCircle size={20} className="text-green-600" />;
    }
    if (action.includes('REJECTED') || action === 'REJECTED') {
      return <XCircle size={20} className="text-red-600" />;
    }
    if (action.includes('OVERRIDDEN')) {
      return <Shield size={20} className="text-purple-600" />;
    }
    if (action === 'REVISED') {
      return <AlertTriangle size={20} className="text-yellow-600" />;
    }
    return <Clock size={20} className="text-slate-400" />;
  };

  const getActionLabel = (action) => {
    const labels = {
      'APPROVED': 'Onaylandı',
      'REJECTED': 'Reddedildi',
      'OVERRIDDEN': 'Üst Yönetici Kararı (Override)',
      'REVISED': 'Revize Edildi',
      'CANCELLED': 'İptal Edildi'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    if (action.includes('APPROVED')) return 'bg-green-50 border-green-200';
    if (action.includes('REJECTED')) return 'bg-red-50 border-red-200';
    if (action.includes('OVERRIDDEN')) return 'bg-purple-50 border-purple-200';
    if (action === 'REVISED') return 'bg-yellow-50 border-yellow-200';
    return 'bg-slate-50 border-slate-200';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Karar geçmişi yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        Henüz karar geçmişi bulunmuyor
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <Clock size={20} />
        Karar Geçmişi
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200"></div>

        {/* Timeline items */}
        <div className="space-y-6">
          {history.map((item, index) => (
            <div key={item.id} className="relative pl-12">
              {/* Timeline dot */}
              <div className="absolute left-2.5 top-2 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              </div>

              {/* Decision card */}
              <div className={`border rounded-lg p-4 ${getActionColor(item.action)}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getActionIcon(item.action)}
                    <span className="font-semibold text-slate-800">
                      {getActionLabel(item.action)}
                    </span>
                  </div>
                  {item.is_override && (
                    <span className="px-2 py-1 text-xs bg-purple-200 text-purple-800 rounded font-medium">
                      OVERRIDE
                    </span>
                  )}
                </div>

                {/* Decision maker */}
                <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                  <User size={16} />
                  <span>{item.decision_maker_name}</span>
                  {item.hierarchy_level && (
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-xs">
                      Seviye {item.hierarchy_level}
                    </span>
                  )}
                </div>

                {/* Substitute indicator */}
                {item.acting_as_substitute_for_name && (
                  <div className="text-sm text-slate-600 mb-2 italic">
                    {item.acting_as_substitute_for_name} adına vekil olarak
                  </div>
                )}

                {/* Reason */}
                {item.reason && (
                  <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-sm text-slate-700">
                    <span className="font-medium">Açıklama:</span> {item.reason}
                  </div>
                )}

                {/* Overridden decision reference */}
                {item.overridden_decision_id && (
                  <div className="mt-2 text-xs text-purple-700">
                    Önceki karar geçersiz kılındı
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={14} />
                  {formatDate(item.decision_date)}
                </div>

                {/* Immutability indicator */}
                {item.is_immutable && (
                  <div className="mt-2 text-xs text-slate-600 font-medium">
                    Bu karar değiştirilemez (kilitli)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-700">
          <span className="font-medium">Toplam karar:</span> {history.length}
          {history.some(h => h.is_override) && (
            <span className="ml-3 text-purple-700">
              ({history.filter(h => h.is_override).length} override)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecisionHistoryTimeline;
