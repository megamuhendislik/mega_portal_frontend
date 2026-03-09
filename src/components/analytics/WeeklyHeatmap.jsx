import { useState } from 'react';
import clsx from 'clsx';

function getIntensityClass(ratio) {
  if (ratio <= 0) return 'bg-violet-100';
  if (ratio < 0.25) return 'bg-violet-200';
  if (ratio < 0.5) return 'bg-violet-300';
  if (ratio < 0.75) return 'bg-violet-400';
  return 'bg-violet-500';
}

export default function WeeklyHeatmap({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const maxTotal = Math.max(...data.map((d) => d.total || 0), 1);

  return (
    <div className="flex items-end justify-between gap-2 px-2">
      {data.map((day, idx) => {
        const ratio = (day.total || 0) / maxTotal;
        const barHeight = Math.max(ratio * 120, 8);

        return (
          <div
            key={idx}
            className="flex flex-col items-center flex-1 relative"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Count */}
            <span className="text-xs font-semibold text-gray-600 mb-1">
              {day.total || 0}
            </span>

            {/* Bar */}
            <div
              className={clsx(
                'w-full max-w-[48px] rounded-t-lg transition-all duration-300',
                getIntensityClass(ratio)
              )}
              style={{ height: `${barHeight}px` }}
            />

            {/* Day label */}
            <span className="text-xs text-gray-500 mt-1.5 font-medium">
              {day.day_short || day.day}
            </span>

            {/* Tooltip on hover */}
            {hoveredIdx === idx && (
              <div className="absolute bottom-full mb-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-100 px-3 py-2 z-10 min-w-[120px]">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  {day.day || day.day_short}
                </p>
                <div className="space-y-0.5 text-xs text-gray-600">
                  {day.leave > 0 && <p>Izin: {day.leave}</p>}
                  {day.overtime > 0 && <p>Mesai: {day.overtime}</p>}
                  {day.meal > 0 && <p>Yemek: {day.meal}</p>}
                  {day.cardless > 0 && <p>Kartsiz: {day.cardless}</p>}
                  <p className="font-semibold text-gray-700 pt-0.5 border-t border-gray-100">
                    Toplam: {day.total}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
