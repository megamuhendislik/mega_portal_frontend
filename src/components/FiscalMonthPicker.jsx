import { useState, useEffect, useMemo } from 'react';
import { Select } from 'antd';
import { Calendar } from 'lucide-react';
import api from '../services/api';

const SHORT_MONTHS = {
  1: 'Oca', 2: 'Şub', 3: 'Mar', 4: 'Nis',
  5: 'May', 6: 'Haz', 7: 'Tem', 8: 'Ağu',
  9: 'Eyl', 10: 'Eki', 11: 'Kas', 12: 'Ara'
};

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  return `${s.getDate()} ${SHORT_MONTHS[s.getMonth() + 1]} – ${e.getDate()} ${SHORT_MONTHS[e.getMonth() + 1]}`;
}

export default function FiscalMonthPicker({ onDateChange }) {
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
          const key = `${current.year}-${current.month}`;
          setSelectedPeriod(key);
          onDateChange(current.start_date, current.end_date);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (value) => {
    setSelectedPeriod(value);
    const period = periods.find(p => `${p.year}-${p.month}` === value);
    if (period) {
      onDateChange(period.start_date, period.end_date);
    }
  };

  const options = periods.map(p => ({
    value: `${p.year}-${p.month}`,
    label: p.is_current ? `${p.label} (Mevcut)` : p.label,
  }));

  const selectedData = useMemo(() => {
    if (!selectedPeriod) return null;
    return periods.find(p => `${p.year}-${p.month}` === selectedPeriod);
  }, [selectedPeriod, periods]);

  const dateRangeText = selectedData
    ? formatDateRange(selectedData.start_date, selectedData.end_date)
    : '';

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
      {dateRangeText && (
        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
          {dateRangeText}
        </span>
      )}
    </div>
  );
}
