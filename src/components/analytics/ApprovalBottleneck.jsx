import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

function getSpeedColor(hours) {
  if (hours < 24) return { text: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (hours <= 72) return { text: 'text-amber-600', bg: 'bg-amber-50' };
  return { text: 'text-red-600', bg: 'bg-red-50' };
}

const COLUMNS = [
  { key: 'approver_name', label: 'Yonetici', sortable: true },
  { key: 'pending_count', label: 'Bekleyen', sortable: true },
  { key: 'avg_decision_hours', label: 'Ort. Karar (saat)', sortable: true },
  { key: 'slowest_request_hours', label: 'En Yavas (saat)', sortable: true },
];

export default function ApprovalBottleneck({ data }) {
  const [sortKey, setSortKey] = useState('avg_decision_hours');
  const [sortAsc, setSortAsc] = useState(false);

  if (!data || data.length === 0) return null;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string') {
      return sortAsc
        ? aVal.localeCompare(bVal, 'tr')
        : bVal.localeCompare(aVal, 'tr');
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'text-left py-2.5 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-700'
                )}
                onClick={() => col.sortable && handleSort(col.key)}
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
          {sorted.map((row, idx) => {
            const avgColor = getSpeedColor(row.avg_decision_hours || 0);
            const isRed = (row.avg_decision_hours || 0) > 72;

            return (
              <tr
                key={idx}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-2.5 px-3 font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    {isRed && (
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    {row.approver_name}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {row.pending_count}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      avgColor.bg,
                      avgColor.text
                    )}
                  >
                    {typeof row.avg_decision_hours === 'number'
                      ? row.avg_decision_hours.toFixed(1)
                      : row.avg_decision_hours}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-gray-600">
                  {typeof row.slowest_request_hours === 'number'
                    ? row.slowest_request_hours.toFixed(1)
                    : row.slowest_request_hours}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
