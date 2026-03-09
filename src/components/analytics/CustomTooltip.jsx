export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 px-4 py-3 min-w-[160px]">
      {label && (
        <p className="text-xs text-gray-500 mb-2 font-medium">{label}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color || '#6366f1' }}
              />
              <span className="text-xs text-gray-600">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-gray-800">
              {typeof entry.value === 'number'
                ? entry.value.toLocaleString('tr-TR')
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
