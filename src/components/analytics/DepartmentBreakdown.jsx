import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

const COLUMNS = [
  { key: 'department', label: 'Departman' },
  { key: 'leave', label: 'Izin' },
  { key: 'overtime', label: 'Mesai' },
  { key: 'meal', label: 'Yemek' },
  { key: 'cardless', label: 'Kartsiz' },
  { key: 'health_report', label: 'Saglik R.' },
  { key: 'total', label: 'Toplam' },
  { key: 'employee_count', label: 'Calisan Sayisi' },
];

export default function DepartmentBreakdown({ data }) {
  const [sortKey, setSortKey] = useState('total');
  const [sortAsc, setSortAsc] = useState(false);

  if (!data || data.length === 0) return null;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'department');
    }
  };

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string') {
      return sortAsc
        ? (aVal || '').localeCompare(bVal || '', 'tr')
        : (bVal || '').localeCompare(aVal || '', 'tr');
    }
    return sortAsc ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                onClick={() => handleSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key &&
                    (sortAsc ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr
              key={idx}
              className={clsx(
                'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
                idx === 0 && 'bg-blue-50/30'
              )}
            >
              <td className="py-2.5 px-3 font-medium text-gray-700">
                {row.department}
              </td>
              <td className="py-2.5 px-3 text-gray-600">{row.leave || 0}</td>
              <td className="py-2.5 px-3 text-gray-600">{row.overtime || 0}</td>
              <td className="py-2.5 px-3 text-gray-600">{row.meal || 0}</td>
              <td className="py-2.5 px-3 text-gray-600">{row.cardless || 0}</td>
              <td className="py-2.5 px-3 text-gray-600">
                {row.health_report || 0}
              </td>
              <td className="py-2.5 px-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                  {row.total || 0}
                </span>
              </td>
              <td className="py-2.5 px-3 text-gray-600">
                {row.employee_count || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
