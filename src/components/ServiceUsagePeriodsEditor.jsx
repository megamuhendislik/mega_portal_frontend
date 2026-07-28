import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { getIstanbulToday } from '../utils/dateUtils';
import {
    isServiceActiveOn,
    normalizeServiceUsagePeriods,
    validateServiceUsagePeriods,
} from '../utils/serviceUsagePeriods';

let fallbackKeyCounter = 0;

const createPeriodKey = (periods) => {
    const usedKeys = new Set(periods.map((period) => period._key));
    let key;

    do {
        const uuid = globalThis.crypto?.randomUUID?.();
        const suffix = uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}-${fallbackKeyCounter += 1}`;
        key = `service-period-${suffix}`;
    } while (usedKeys.has(key));

    return key;
};

const ServiceUsagePeriodsEditor = ({ value = [], onChange, disabled = false }) => {
    const periods = normalizeServiceUsagePeriods(value);
    const validationErrors = validateServiceUsagePeriods(value);
    const isServiceActive = isServiceActiveOn(value);

    const updatePeriod = (key, changes) => {
        const nextPeriods = periods.map((period) => (
            period._key === key ? { ...period, ...changes } : period
        ));
        onChange(nextPeriods);
    };

    const handleAdd = () => {
        const today = getIstanbulToday();
        onChange([
            ...periods,
            {
                id: null,
                _key: createPeriodKey(periods),
                start_date: today,
                end_date: null,
                ongoing: true,
            },
        ]);
    };

    const handleOngoingChange = (period, checked) => {
        if (checked) {
            updatePeriod(period._key, { end_date: null, ongoing: true });
            return;
        }

        updatePeriod(period._key, { ongoing: false });
    };

    const handleEndDateChange = (period, endDate) => {
        updatePeriod(period._key, { end_date: endDate || null, ongoing: false });
    };

    const handleDelete = (key) => {
        onChange(periods.filter((period) => period._key !== key));
    };

    return (
        <section className="rounded-xl border border-slate-200 bg-white/80 shadow-sm" aria-labelledby="service-usage-periods-title">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600" aria-hidden="true">
                        <CalendarRange size={18} />
                    </span>
                    <div>
                        <h3 id="service-usage-periods-title" className="text-sm font-bold text-slate-800">Servis kullanım dönemleri</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Çalışanın şirket servisini kullanabileceği tarih aralıklarını kaydedin.</p>
                    </div>
                </div>
                <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${isServiceActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                    role="status"
                >
                    {isServiceActive ? 'Servis kullanımı aktif' : 'Servis kullanımı aktif değil'}
                </span>
            </div>

            <div className="space-y-4 px-4 py-4">
                {periods.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center text-xs text-slate-500">
                        Henüz servis kullanım dönemi eklenmedi.
                    </p>
                ) : (
                    <div className="relative space-y-3 before:absolute before:bottom-5 before:left-3 before:top-5 before:w-px before:bg-blue-100">
                        {periods.map((period, index) => {
                            const isOngoing = period.ongoing;
                            const startInputId = `service-period-start-${period._key}`;
                            const endInputId = `service-period-end-${period._key}`;
                            const hasInvalidRange = period.end_date && period.end_date < period.start_date;
                            const isEndDateMissing = !period.ongoing && !period.end_date;

                            return (
                                <div key={period._key} className="relative rounded-lg border border-slate-200 bg-white p-3 pl-7 shadow-sm">
                                    <span className={`absolute left-[7px] top-5 h-3 w-3 rounded-full border-2 border-white ${isOngoing ? 'bg-emerald-500' : 'bg-blue-500'}`} aria-hidden="true" />
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                                        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor={startInputId} className="mb-1 block text-xs font-bold text-slate-600">Başlangıç tarihi</label>
                                                <input
                                                    id={startInputId}
                                                    type="date"
                                                    value={period.start_date}
                                                    onChange={(event) => updatePeriod(period._key, { start_date: event.target.value })}
                                                    disabled={disabled}
                                                    aria-invalid={!period.start_date || hasInvalidRange}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={endInputId} className="mb-1 block text-xs font-bold text-slate-600">Bitiş tarihi</label>
                                                <input
                                                    id={endInputId}
                                                    type="date"
                                                    value={period.end_date || ''}
                                                    min={period.start_date || undefined}
                                                    onChange={(event) => handleEndDateChange(period, event.target.value)}
                                                    disabled={disabled || isOngoing}
                                                    aria-invalid={hasInvalidRange || isEndDateMissing}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                                            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 has-[:disabled]:cursor-not-allowed has-[:disabled]:text-slate-400">
                                                <input
                                                    type="checkbox"
                                                    checked={isOngoing}
                                                    onChange={(event) => handleOngoingChange(period, event.target.checked)}
                                                    disabled={disabled}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
                                                />
                                                Devam ediyor
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(period._key)}
                                                disabled={disabled}
                                                aria-label={`${index + 1}. servis kullanım dönemini sil`}
                                                title="Dönemi sil"
                                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Trash2 size={16} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {validationErrors.length > 0 && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <ul className="list-disc space-y-1 pl-4">
                            {validationErrors.map((error) => <li key={error}>{error}</li>)}
                        </ul>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={disabled}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-3 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 sm:w-auto"
                >
                    <Plus size={16} aria-hidden="true" />
                    Servis dönemi ekle
                </button>
            </div>
        </section>
    );
};

export default ServiceUsagePeriodsEditor;
