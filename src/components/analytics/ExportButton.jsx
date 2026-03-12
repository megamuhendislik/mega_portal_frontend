import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { getIstanbulToday } from '../../utils/dateUtils';

export default function ExportButton({ type, range }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  const handleExport = async (format) => {
    setLoading(format);
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (range) params.append('range', range);
      params.append('format', format);

      const response = await api.get(
        `/attendance/request-analytics/export/?${params.toString()}`,
        { responseType: 'blob' }
      );

      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const filename = `analitik_rapor_${type || 'genel'}_${getIstanbulToday()}.${ext}`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Dışarı Aktar</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={loading !== null}
            className={clsx(
              'flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors',
              loading === 'csv' && 'opacity-60'
            )}
          >
            {loading === 'csv' ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <FileText className="w-4 h-4 text-green-600" />
            )}
            CSV olarak indir
          </button>
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            disabled={loading !== null}
            className={clsx(
              'flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors',
              loading === 'xlsx' && 'opacity-60'
            )}
          >
            {loading === 'xlsx' ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            )}
            Excel olarak indir
          </button>
        </div>
      )}
    </div>
  );
}
