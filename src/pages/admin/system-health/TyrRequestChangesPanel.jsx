import React, { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { getIstanbulToday, getIstanbulDateOffset } from '../../../utils/dateUtils';
import { describeAutoChangeRow, labelAutoChangeSource, labelAutoChangeReason, newestPinnedRowIds } from './frcHardSuggestions';

const PAGE_SIZE = 25;

function fmtDateTr(iso) {
    const [y, m, d] = String(iso || '').split('-');
    return y && m && d ? `${d}.${m}.${y}` : String(iso || '');
}

function fmtStamp(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso);
    return date.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' });
}

export default function TyrRequestChangesPanel() {
    const [dateFrom, setDateFrom] = useState(getIstanbulDateOffset(-30));
    const [dateTo, setDateTo] = useState(getIstanbulToday());
    const [employeeId, setEmployeeId] = useState('');
    const [mode, setMode] = useState('');
    const [action, setAction] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [applied, setApplied] = useState(null);

    const load = useCallback(async (targetPage, filters) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                date_from: filters.dateFrom, date_to: filters.dateTo,
                page: targetPage, page_size: PAGE_SIZE,
            };
            if (filters.employeeId) params.employee_id = filters.employeeId;
            if (filters.mode) params.mode = filters.mode;
            if (filters.action) params.action = filters.action;
            const res = await api.get('/system/health-check/request-auto-changes/', { params, timeout: 60000 });
            setData(res.data);
            setPage(targetPage);
        } catch (e) {
            setError(e.response?.data?.error || e.message || 'Kayıtlar alınamadı');
        } finally {
            setLoading(false);
        }
    }, []);

    const search = () => {
        const filters = { dateFrom, dateTo, employeeId, mode, action };
        setApplied(filters);
        setActionError(null);
        setNotice(null);
        load(1, filters);
    };

    useEffect(() => {
        search();
        // yalnız açılışta; sonrasında Listele düğmesi
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const revert = async (row) => {
        const text = `Talep #${row.request_id} bu değişiklikten önceki haline dönecek ve otomatik düzeltme kapanacak. Devam edilsin mi?`;
        if (!window.confirm(row.locked ? `Kilitli dönem. ${text}` : text)) return;
        setBusyId(row.id);
        setActionError(null);
        setNotice(null);
        try {
            const res = await api.post('/system/health-check/request-auto-change-revert/', { change_id: row.id }, { timeout: 120000 });
            if (res.data?.locked) setNotice('Kilitli dönemde geri alındı.');
        } catch (e) {
            setActionError(e.response?.data?.error || e.message || 'Geri alınamadı');
        } finally {
            setBusyId(null);
            load(page, applied);
        }
    };

    const unpin = async (row) => {
        if (!window.confirm(`Talep #${row.request_id} yeniden otomatik düzeltmeye açılacak.`)) return;
        setBusyId(row.id);
        setActionError(null);
        setNotice(null);
        try {
            await api.post('/system/health-check/request-auto-correction-unpin/', { request_id: row.request_id }, { timeout: 60000 });
        } catch (e) {
            setActionError(e.response?.data?.error || e.message || 'İşlem yapılamadı');
        } finally {
            setBusyId(null);
            load(page, applied);
        }
    };

    const inputCls = 'px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white';
    const results = data?.results || [];
    const pinnedNewest = newestPinnedRowIds(results);
    const totalPages = data?.total_pages || 1;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-gray-800">Talep düzeltme kayıtları</h4>
            <div className="flex flex-wrap items-end gap-2 text-xs">
                <label className="flex flex-col gap-0.5 text-gray-600">
                    Başlangıç
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-0.5 text-gray-600">
                    Bitiş
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-0.5 text-gray-600">
                    Çalışan ID
                    <input
                        type="number"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className={`${inputCls} w-24`}
                    />
                </label>
                <label className="flex flex-col gap-0.5 text-gray-600">
                    Mod
                    <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputCls}>
                        <option value="">Hepsi</option>
                        <option value="SOFT">Soft</option>
                        <option value="HARD">Hard</option>
                        <option value="ADMIN">Yönetici</option>
                    </select>
                </label>
                <label className="flex flex-col gap-0.5 text-gray-600">
                    İşlem
                    <select value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
                        <option value="">Hepsi</option>
                        <option value="UPDATE">Güncelleme</option>
                        <option value="DELETE">Silme</option>
                        <option value="CANCEL">İptal</option>
                        <option value="REVERT">Geri alma</option>
                        <option value="UNPIN">Otomatik düzeltme açıldı</option>
                    </select>
                </label>
                <button
                    type="button"
                    onClick={search}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs text-violet-700 bg-violet-50 border border-violet-300 hover:bg-violet-100 disabled:opacity-50"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Listele
                </button>
            </div>

            {(actionError || error) && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">{actionError || error}</div>
            )}

            {notice && !actionError && !error && (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">{notice}</div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                    <thead className="text-gray-500 uppercase text-[10px] border-b border-gray-200">
                        <tr>
                            <th className="py-1.5 pr-3">Tarih</th>
                            <th className="py-1.5 pr-3">Çalışan</th>
                            <th className="py-1.5 pr-3">Talep</th>
                            <th className="py-1.5 pr-3">İşlem</th>
                            <th className="py-1.5 pr-3">Mod</th>
                            <th className="py-1.5 pr-3">Önce</th>
                            <th className="py-1.5 pr-3">Sonra</th>
                            <th className="py-1.5 pr-3">Sebep</th>
                            <th className="py-1.5 pr-3">Kaynak ve zaman</th>
                            <th className="py-1.5">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                        {results.map((row) => {
                            const d = describeAutoChangeRow(row);
                            const canRevert = row.revertable && busyId !== row.id;
                            return (
                                <tr key={row.id} className="align-top">
                                    <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDateTr(row.work_date)}</td>
                                    <td className="py-1.5 pr-3">{row.employee_name}</td>
                                    <td className="py-1.5 pr-3">#{row.request_id}</td>
                                    <td className="py-1.5 pr-3 whitespace-nowrap">{d.actionLabel}</td>
                                    <td className="py-1.5 pr-3">{d.modeLabel}</td>
                                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{d.beforeText}</td>
                                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{d.afterText}</td>
                                    <td className="py-1.5 pr-3">{labelAutoChangeReason(row.reason)}</td>
                                    <td className="py-1.5 pr-3">
                                        <div>{labelAutoChangeSource(row.source)}{row.actor_name ? ` · ${row.actor_name}` : ''}</div>
                                        <div className="text-gray-500">{fmtStamp(row.created_at)}</div>
                                    </td>
                                    <td className="py-1.5">
                                        <div className="flex flex-col items-start gap-1">
                                            {row.reverted_at && (
                                                <span className="text-gray-500">
                                                    Geri alındı{row.reverted_by_name ? ` · ${row.reverted_by_name}` : ''}
                                                </span>
                                            )}
                                            {row.pinned && pinnedNewest.has(row.id) && (
                                                <>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                                                        Otomatik düzeltme kapalı
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => unpin(row)}
                                                        disabled={busyId === row.id}
                                                        className="px-2 py-0.5 rounded border border-amber-300 bg-white font-bold hover:bg-amber-50 disabled:opacity-50"
                                                    >
                                                        Aç
                                                    </button>
                                                </>
                                            )}
                                            {row.action !== 'REVERT' && row.action !== 'UNPIN' && (
                                            <button
                                                type="button"
                                                onClick={() => revert(row)}
                                                disabled={!canRevert}
                                                title={d.blockLabel || undefined}
                                                className="px-2 py-0.5 rounded border border-gray-300 bg-white font-bold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Geri al
                                            </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {results.length === 0 && !loading && (
                            <tr>
                                <td colSpan={10} className="py-4 text-center text-gray-400 italic">
                                    Kayıt yok.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{data ? `${data.total} kayıt` : ''}</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => load(page - 1, applied)}
                        disabled={loading || page <= 1}
                        className="px-2.5 py-1 rounded border border-gray-300 bg-white font-bold hover:bg-gray-50 disabled:opacity-40"
                    >
                        Önceki
                    </button>
                    <span>Sayfa {page} / {totalPages}</span>
                    <button
                        type="button"
                        onClick={() => load(page + 1, applied)}
                        disabled={loading || page >= totalPages}
                        className="px-2.5 py-1 rounded border border-gray-300 bg-white font-bold hover:bg-gray-50 disabled:opacity-40"
                    >
                        Sonraki
                    </button>
                </div>
            </div>
        </div>
    );
}
