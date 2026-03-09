import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

const BASE_COLUMNS = [
  { key: 'name', label: 'Calisan' },
  { key: 'department', label: 'Departman' },
  { key: 'leave', label: 'Izin' },
  { key: 'overtime', label: 'Mesai' },
  { key: 'meal', label: 'Yemek' },
  { key: 'cardless', label: 'Kartsiz' },
];

const HEALTH_COL = { key: 'health_report', label: 'Saglik R.' };
const TOTAL_COL = { key: 'total', label: 'Toplam' };

function getInitial(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
  'from-pink-400 to-pink-600',
  'from-cyan-400 to-cyan-600',
];

export default function EmployeeBreakdownTable({
  data,
  showHealthReport = true,
}) {
  const [sortKey, setSortKey] = useState('total');
  const [sortAsc, setSortAsc] = useState(false);

  if (!data || data.length === 0) return null;

  const columns = [
    ...BASE_COLUMNS,
    ...(showHealthReport ? [HEALTH_COL] : []),
    TOTAL_COL,
  ];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'department');
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
            {columns.map((col) => (
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
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
            >
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                      AVATAR_COLORS[idx % AVATAR_COLORS.length]
                    )}
                  >
                    <span className="text-xs font-bold text-white">
                      {getInitial(row.name)}
                    </span>
                  </div>
                  <span className="font-medium text-gray-700 truncate">
                    {row.name}
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-gray-600">{row.department}</td>
              <td className="py-2.5 px-3 text-gray-600">{row.leave || 0}</td>
              <td className="py-2.5 px-3 text-gray-600">{row.overtime || 0}</td>
              <td className="py-2.5 px-3 text-gray-600">{row.meal || 0}</td>
              <td className="py-2.5 px-3 text-gray-600">{row.cardless || 0}</td>
              {showHealthReport && (
                <td className="py-2.5 px-3 text-gray-600">
                  {row.health_report || 0}
                </td>
              )}
              <td className="py-2.5 px-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                  {row.total || 0}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
