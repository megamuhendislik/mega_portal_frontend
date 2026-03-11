import { useState, useEffect } from 'react';
import { Select } from 'antd';
import { Calendar } from 'lucide-react';
import api from '../services/api';

const CUSTOM_VALUE = '__CUSTOM__';

export default function FiscalMonthPicker({ dateFrom, dateTo, onDateChange }) {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/attendance/my-fiscal-periods/')
      .then(res => {
        if (cancelled) return;
        const data = res.data?.periods || [];
        setPeriods(data);
        const current = data.find(p => p.is_current);
        if (current) {
          setSelectedPeriod(`${current.year}-${current.month}`);
          onDateChange(current.start_date, current.end_date);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!periods.length || !selectedPeriod || selectedPeriod === CUSTOM_VALUE) return;
    const selected = periods.find(p => `${p.year}-${p.month}` === selectedPeriod);
    if (selected && (dateFrom !== selected.start_date || dateTo !== selected.end_date)) {
      setSelectedPeriod(CUSTOM_VALUE);
    }
  }, [dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (value) => {
    if (value === CUSTOM_VALUE) {
      setSelectedPeriod(CUSTOM_VALUE);
      onDateChange('', '');
      return;
    }
    setSelectedPeriod(value);
    const period = periods.find(p => `${p.year}-${p.month}` === value);
    if (period) {
      onDateChange(period.start_date, period.end_date);
    }
  };

  const options = [
    ...periods.map(p => ({
      value: `${p.year}-${p.month}`,
      label: p.is_current ? `${p.label} (Mevcut)` : p.label,
    })),
    { value: CUSTOM_VALUE, label: 'Özel Tarih Aralığı' },
  ];

  return (
    <div className="flex items-center gap-2">
      <Calendar size={16} className="text-slate-400 shrink-0" />
      <Select
        value={selectedPeriod}
        onChange={handleSelect}
        options={options}
        loading={loading}
        placeholder="Mali Dönem"
        className="min-w-[180px]"
        size="middle"
        popupMatchSelectWidth={false}
      />
    </div>
  );
}
