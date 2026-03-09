import clsx from 'clsx';

function getInitial(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const TOP_GRADIENTS = [
  'from-amber-400 to-amber-600',
  'from-gray-300 to-gray-500',
  'from-orange-400 to-orange-600',
];

const DEFAULT_GRADIENT = 'from-blue-400 to-blue-500';

export default function TopRequesters({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {/* Rank */}
          <span className="w-6 text-center text-xs font-bold text-gray-400">
            {idx + 1}
          </span>

          {/* Avatar */}
          <div
            className={clsx(
              'w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0',
              idx < 3 ? TOP_GRADIENTS[idx] : DEFAULT_GRADIENT
            )}
          >
            <span className="text-xs font-bold text-white">
              {getInitial(item.name)}
            </span>
          </div>

          {/* Name + dept */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {item.name}
            </p>
            {item.department && (
              <p className="text-xs text-gray-500 truncate">{item.department}</p>
            )}
          </div>

          {/* Count badge */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}
