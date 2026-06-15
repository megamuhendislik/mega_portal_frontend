import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, Button, Modal, message, Spin, Empty, Popconfirm, Tooltip, Tabs } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined, ThunderboltOutlined, UserOutlined, SaveOutlined, ClearOutlined, CloseOutlined } from '@ant-design/icons';
import { format, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../../../services/api';
import CalendarGrid from './CalendarGrid';
import DayEditPanel from './DayEditPanel';
import SettlementModal from './SettlementModal';
import useStagedOps, { stripClientFields } from './useStagedOps';
import PreviewModal from './PreviewModal';
import ChangeHistoryTab from './ChangeHistoryTab';
import MultiDayRecordsTab from './MultiDayRecordsTab';
import { getIstanbulTodayDate, toIstanbulParts } from '../../../utils/dateUtils';

export default function PersonelTab({ initialEmployee }) {
    // ── State ──────────────────────────────────────────────────────
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(() => getIstanbulTodayDate());
    const [monthlyData, setMonthlyData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    const [balanceSummary, setBalanceSummary] = useState(null);
    const [settlementHistory, setSettlementHistory] = useState([]);
    const [settlementData, setSettlementData] = useState(null);
    const [activeTab, setActiveTab] = useState('calendar');

    // ── Staged operations (Veri Yönetimi v2) ───────────────────────
    const { pendingOps, addOp, removeOp, clearOps, count } = useStagedOps();
    // Kuyruk-türevli DELETE seti — MultiDayRecordsTab "Silme kuyruğunda" rozetini
    // gerçek kuyruğa bağlar; bir op aksiyon çubuğundan silinince rozet otomatik
    // temizlenir (eski yalnız-lokal Set bayat kalıyordu).
    const pendingDeleteIds = useMemo(
        () => new Set(
            pendingOps
                .filter((o) => o.op_type === 'DELETE')
                .map((o) => `${o.record_type}:${o.target_pk}`)
        ),
        [pendingOps]
    );
    const [savingChangeset, setSavingChangeset] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    // ── Personel listesini yükle ───────────────────────────────────
    useEffect(() => {
        setLoadingEmployees(true);
        api.get('/employees/?page_size=1000')
            .then((res) => {
                const data = res.data.results || res.data;
                setEmployees(data);

                // initialEmployee varsa otomatik sec
                if (initialEmployee && data.length > 0) {
                    const found = data.find((e) => e.id === initialEmployee.id);
                    if (found) {
                        setSelectedEmployee(found);
                    }
                }
            })
            .catch(() => message.error('Personel listesi yüklenemedi.'))
            .finally(() => setLoadingEmployees(false));
    }, []);

    // ── Takvim verisini yükle ──────────────────────────────────────
    const fetchMonthlyData = useCallback(() => {
        if (!selectedEmployee) return;

        const { year, month } = toIstanbulParts(currentMonth);

        setLoadingCalendar(true);
        api.get('/system-data/get_monthly_summary/', {
            params: {
                employee_id: selectedEmployee.id,
                year,
                month,
            },
        })
            .then((res) => setMonthlyData(res.data || {}))
            .catch(() => {
                message.error('Takvim verisi yüklenemedi.');
                setMonthlyData({});
            })
            .finally(() => setLoadingCalendar(false));
    }, [selectedEmployee, currentMonth]);

    // ── Bakiye özeti yükle (attendance monthly_summary) ────────────
    const fetchBalanceSummary = useCallback(() => {
        if (!selectedEmployee) return;
        const { year, month } = toIstanbulParts(currentMonth);
        api.get('/attendance/monthly_summary/', {
            params: { employee_id: selectedEmployee.id, year, month }
        })
            .then((res) => setBalanceSummary(res.data || null))
            .catch(() => setBalanceSummary(null));
    }, [selectedEmployee, currentMonth]);

    // ── Mutabakat geçmişini yükle (bakiye kartı zengin göstergesi için) ──
    const fetchSettlementHistory = useCallback(() => {
        if (!selectedEmployee) return;
        const { year } = toIstanbulParts(currentMonth);
        api.get('/system-data/settlement_history/', {
            params: { employee_id: selectedEmployee.id, year }
        })
            .then((res) => setSettlementHistory(res.data?.results || []))
            .catch(() => setSettlementHistory([]));
    }, [selectedEmployee, currentMonth]);

    useEffect(() => {
        if (selectedEmployee) {
            fetchMonthlyData();
            fetchBalanceSummary();
            fetchSettlementHistory();
        }
    }, [selectedEmployee, currentMonth, fetchMonthlyData, fetchBalanceSummary, fetchSettlementHistory]);

    // ── Handlers ───────────────────────────────────────────────────
    const handleEmployeeChange = (empId) => {
        const emp = employees.find((e) => e.id === empId);
        setSelectedEmployee(emp || null);
        setSelectedDate(null);
        setMonthlyData({});
        clearOps();
    };

    const handlePrevMonth = () => {
        setCurrentMonth((prev) => subMonths(prev, 1));
        setSelectedDate(null);
    };

    const handleNextMonth = () => {
        setCurrentMonth((prev) => addMonths(prev, 1));
        setSelectedDate(null);
    };

    const handleDayClick = (day) => {
        setSelectedDate(day);
    };

    const handleAutoFill = () => {
        if (!selectedEmployee) return;

        const { year, month } = toIstanbulParts(currentMonth);
        const monthName = format(currentMonth, 'MMMM yyyy', { locale: tr });

        Modal.confirm({
            title: 'Ayı Otomatik Tamamla',
            content: (
                <div>
                    <p>
                        <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong> personelinin{' '}
                        <strong>{monthName}</strong> ayındaki boş iş günleri vardiya saatlerine göre otomatik doldurulacak.
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Zaten kaydı olan günler etkilenmez.
                    </p>
                </div>
            ),
            okText: 'Tamamla',
            cancelText: 'Vazgeç',
            icon: <ThunderboltOutlined className="text-amber-500" />,
            onOk: async () => {
                try {
                    const res = await api.post('/system-data/auto_fill_month/', {
                        employee_id: selectedEmployee.id,
                        year,
                        month,
                    });
                    const filled = res.data?.filled_days || 0;
                    if (filled > 0) {
                        message.success(`${filled} gün otomatik dolduruldu.`);
                    } else {
                        message.info('Doldurulacak boş iş günü bulunamadı.');
                    }
                    fetchMonthlyData();
                } catch {
                    message.error('Otomatik tamamlama sırasında hata oluştu.');
                }
            },
        });
    };

    const handleSaveSuccess = () => {
        fetchMonthlyData();
        fetchBalanceSummary();
        fetchSettlementHistory();
    };

    // ── Staged ops: Önizle → (ONAYLA) → Kaydet ─────────────────────
    const extractErr = (e) => {
        const d = e.response?.data;
        if (!d) return e.message;
        if (typeof d === 'string') return d;
        return d.detail || d.error || (Array.isArray(d) ? d.join(', ') : JSON.stringify(d));
    };

    const handleOpenPreview = async () => {
        if (!selectedEmployee || count === 0) return;
        setPreviewLoading(true);
        setPreviewData(null);
        setPreviewOpen(true);
        try {
            const res = await api.post('/system-data/preview_changeset/', {
                employee_id: selectedEmployee.id,
                operations: stripClientFields(pendingOps),
            });
            setPreviewData(res.data);
        } catch (e) {
            message.error('Önizleme hatası: ' + extractErr(e));
            setPreviewOpen(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleApplyFromModal = async ({ reason, forceOverride }) => {
        if (!selectedEmployee || count === 0) return;
        setSavingChangeset(true);
        try {
            const res = await api.post('/system-data/apply_changeset/', {
                employee_id: selectedEmployee.id,
                operations: stripClientFields(pendingOps),
                reason: reason || '',
                force_override: !!forceOverride,
            });
            message.success('Kaydedildi (#' + (res.data?.changeset_id ?? '') + ')');
            clearOps();
            setPreviewOpen(false);
            setPreviewData(null);
            fetchMonthlyData();
            fetchBalanceSummary();
        } catch (e) {
            message.error('Hata: ' + extractErr(e));
        } finally {
            setSavingChangeset(false);
        }
    };

    const openSettlement = () => {
        if (!selectedEmployee || !balanceSummary) return;
        const netBal = balanceSummary.net_balance_seconds || 0;
        const _cmParts = toIstanbulParts(currentMonth);
        const fiscalMonth = balanceSummary.fiscal_month || _cmParts.month;
        const fiscalYear = balanceSummary.fiscal_year || _cmParts.year;

        // Check current month's compensated from breakdown
        const bd = (balanceSummary.cumulative?.breakdown || []).find(b => b.month === fiscalMonth);
        const monthCompensated = bd?.compensated || 0;

        // Önceki aylardan devir (carry-into-M) + bu ayın neti = sıfırlanacak toplam
        // birikmiş devir (= total_net_balance_seconds). Modal "Sıfırlanacak Toplam Devir"
        // göstergesinde bunu kullanır.
        const carryOver = (balanceSummary.cumulative?.carry_over_seconds || 0)
            + (balanceSummary.cumulative?.previous_year_balance_seconds || 0);
        const cumulativeToDate = balanceSummary.cumulative?.total_net_balance_seconds != null
            ? balanceSummary.cumulative.total_net_balance_seconds
            : carryOver + netBal;

        setSettlementData({
            isOpen: true,
            employee: selectedEmployee,
            year: fiscalYear,
            month: fiscalMonth,
            netBalance: netBal,
            carryOver,
            cumulativeToDate,
            compensated: monthCompensated,
            isSettled: monthCompensated !== 0,
        });
    };

    // ── Select options ─────────────────────────────────────────────
    const employeeOptions = employees.map((e) => ({
        value: e.id,
        label: `${e.first_name} ${e.last_name}${e.department_name ? ` — ${e.department_name}` : ''}`,
        searchText: `${e.first_name} ${e.last_name} ${e.employee_code || ''} ${e.department_name || ''}`.toLowerCase(),
    }));

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="animate-fade-in">
            {/* ── Toolbar: Personel + Ay Navigasyonu ─────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    {/* Sol: Personel secimi */}
                    <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[360px]">
                        <UserOutlined className="text-slate-400 text-lg hidden md:block" />
                        <Select
                            showSearch
                            placeholder="Personel seçin..."
                            value={selectedEmployee?.id || undefined}
                            onChange={handleEmployeeChange}
                            options={employeeOptions}
                            filterOption={(input, option) =>
                                option.searchText.includes(input.toLowerCase())
                            }
                            loading={loadingEmployees}
                            className="w-full"
                            size="large"
                            allowClear
                            onClear={() => {
                                setSelectedEmployee(null);
                                setSelectedDate(null);
                                setMonthlyData({});
                            }}
                        />
                    </div>

                    {/* Sag: Ay navigasyonu + Otomatik Tamamla */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        {/* Ay secici */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border shadow-sm">
                            <Button
                                type="text"
                                size="small"
                                icon={<LeftOutlined />}
                                onClick={handlePrevMonth}
                            />
                            <span className="text-sm md:text-base font-bold text-slate-800 min-w-[130px] text-center select-none capitalize">
                                {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                            </span>
                            <Button
                                type="text"
                                size="small"
                                icon={<RightOutlined />}
                                onClick={handleNextMonth}
                            />
                        </div>

                        {/* Otomatik Tamamla butonu */}
                        {selectedEmployee && (
                            <Button
                                type="text"
                                size="small"
                                icon={<ThunderboltOutlined />}
                                onClick={handleAutoFill}
                                className="text-amber-600 hover:!text-amber-700"
                            >
                                <span className="hidden sm:inline">Ayı Otomatik Tamamla</span>
                                <span className="sm:hidden">Tamamla</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Secili personel bilgisi */}
                {selectedEmployee && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {selectedEmployee.first_name?.[0]}
                            {selectedEmployee.last_name?.[0]}
                        </div>
                        <div>
                            <div className="font-semibold text-slate-800">
                                {selectedEmployee.first_name} {selectedEmployee.last_name}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                {selectedEmployee.department_name && (
                                    <span>{selectedEmployee.department_name}</span>
                                )}
                                {selectedEmployee.employee_code && (
                                    <>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-mono">{selectedEmployee.employee_code}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Ana Alan: Takvim + Gun Detay ───────────────────── */}
            {!selectedEmployee ? (
                /* Personel secilmedi */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-16 md:py-24">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <span className="text-slate-400">
                                Devam kayıtlarını görüntülemek için bir personel seçin
                            </span>
                        }
                    />
                </div>
            ) : (
                /* Personel secili: Takvim sekmesi + Değişiklik Geçmişi sekmesi */
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'calendar',
                            label: 'Takvim',
                            children: (
                                <>
                {/* ── Aylık Bakiye Özeti Kartı ──────────────────────── */}
                {balanceSummary && (() => {
                    const target = balanceSummary.target_gross || 0;
                    const completed = balanceSummary.completed_seconds || 0;
                    const overtime = balanceSummary.overtime_seconds || 0;
                    const netWork = balanceSummary.total_work_seconds || 0;
                    const netBalance = balanceSummary.past_target_balance_seconds ?? balanceSummary.net_balance_seconds ?? 0;
                    const carryOver = (balanceSummary.cumulative?.carry_over_seconds || 0) + (balanceSummary.cumulative?.previous_year_balance_seconds || 0);
                    const totalCumulative = balanceSummary.cumulative?.total_net_balance_seconds || 0;
                    const _renderCmParts = toIstanbulParts(currentMonth);
                    const fiscalMonth = balanceSummary.fiscal_month || _renderCmParts.month;
                    const bd = (balanceSummary.cumulative?.breakdown || []).find(b => b.month === fiscalMonth);
                    const isSettled = bd && bd.compensated !== 0;

                    const fmtH = (sec) => { const totalMin = Math.round(Math.abs(sec) / 60); const h = Math.floor(totalMin / 60); const m = totalMin % 60; return `${h}:${String(m).padStart(2, '0')}`; };
                    const sign = (sec) => sec >= 0 ? '+' : '-';
                    const MNAMES = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

                    // Mutabakat göstergesi — settlement_history'den türetilir: aktif
                    // (geri alınmamış) mutabakat sayısı + sıfırlanan toplam saat.
                    const activeSettlements = (settlementHistory || []).filter(s => !s.is_undone);
                    const settledCount = activeSettlements.length;
                    const settledTotalSec = activeSettlements.reduce(
                        (sum, s) => sum + Math.abs(s.settled_amount_seconds || 0), 0
                    );

                    return (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-5 rounded-full bg-indigo-500"></div>
                                    <h3 className="font-bold text-slate-700 text-sm">
                                        Aylık Bakiye Özeti — {MNAMES[fiscalMonth]} {balanceSummary.fiscal_year || _renderCmParts.year}
                                    </h3>
                                    {settledCount > 0 ? (
                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                            &#10003; Mutabakat: {settledCount} kez · toplam {(settledTotalSec / 3600).toFixed(1)} sa sıfırlandı
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                            Mutabakat yok
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={openSettlement}
                                    className={isSettled ? '!bg-amber-500 !border-amber-500 hover:!bg-amber-600' : ''}
                                >
                                    {isSettled ? 'Mutabakat Düzenle' : 'Mutabakat Yap'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {/* Hedef */}
                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hedef</div>
                                    <div className="text-lg font-black text-slate-700 mt-0.5">{fmtH(target)} <span className="text-xs text-slate-400 font-medium">sa</span></div>
                                </div>
                                {/* Çalışılan */}
                                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Çalışılan</div>
                                    <div className="text-lg font-black text-indigo-700 mt-0.5">{fmtH(netWork)} <span className="text-xs text-indigo-400 font-medium">sa</span></div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Normal: {fmtH(completed)} + Fazla Mesai: {fmtH(overtime)}</div>
                                </div>
                                {/* Bu Ay Bakiye */}
                                <div className={`p-3 rounded-lg border ${netBalance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bu Ay Bakiye</div>
                                    <div className={`text-lg font-black mt-0.5 ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {sign(netBalance)}{fmtH(netBalance)} <span className="text-xs font-medium opacity-60">sa</span>
                                    </div>
                                </div>
                                {/* Önceki Aylardan Devir */}
                                <div className={`p-3 rounded-lg border ${carryOver >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Önceki Aylardan Devir</div>
                                    <div className={`text-lg font-black mt-0.5 ${carryOver >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        {carryOver === 0 ? '0.0' : `${sign(carryOver)}${fmtH(carryOver)}`} <span className="text-xs font-medium opacity-60">sa</span>
                                    </div>
                                </div>
                                {/* Toplam Kümülatif */}
                                <div className={`p-3 rounded-lg border-2 ${totalCumulative >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Toplam Kümülatif</div>
                                    <div className={`text-xl font-black mt-0.5 ${totalCumulative >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {sign(totalCumulative)}{fmtH(totalCumulative)} <span className="text-xs font-medium opacity-60">sa</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-4">
                    {/* Sol: Takvim */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                            <CalendarOutlined className="text-blue-500" />
                            <h3 className="font-bold text-slate-700 text-sm">
                                Aylık Takvim
                            </h3>
                        </div>
                        <CalendarGrid
                            currentMonth={currentMonth}
                            monthlyData={monthlyData}
                            selectedDate={selectedDate}
                            onDayClick={handleDayClick}
                            loading={loadingCalendar}
                        />
                    </div>

                    {/* Sag: Gun Detay Paneli */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
                        {selectedDate ? (
                            <DayEditPanel
                                employee={selectedEmployee}
                                date={selectedDate}
                                onSaveSuccess={handleSaveSuccess}
                                onStageOp={addOp}
                            />
                        ) : (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400">
                                <CalendarOutlined className="text-4xl mb-3 text-slate-300" />
                                <p className="text-sm font-medium">Takvimden bir gün seçin</p>
                                <p className="text-xs mt-1">
                                    Seçili günün detayları burada görünecek
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                                </>
                            ),
                        },
                        {
                            key: 'multiday',
                            label: 'Çok-günlü Kayıtlar',
                            children: (
                                <MultiDayRecordsTab
                                    employee={selectedEmployee}
                                    currentMonth={currentMonth}
                                    onStageOp={addOp}
                                    pendingDeleteIds={pendingDeleteIds}
                                />
                            ),
                        },
                        {
                            key: 'history',
                            label: 'Değişiklik Geçmişi',
                            children: (
                                <ChangeHistoryTab
                                    employeeId={selectedEmployee?.id}
                                    onReverted={handleSaveSuccess}
                                />
                            ),
                        },
                    ]}
                />
            )}

            {/* Settlement Modal (sekmelerden bağımsız çalışır) */}
            {selectedEmployee && (
                <SettlementModal
                    isOpen={settlementData?.isOpen}
                    onClose={() => setSettlementData(null)}
                    data={settlementData}
                    onSaveSuccess={() => { fetchMonthlyData(); fetchBalanceSummary(); fetchSettlementHistory(); }}
                />
            )}

            {/* ── Bekleyen Değişiklikler Aksiyon Barı (sticky footer) ─── */}
            {selectedEmployee && count > 0 && (
                <div className="sticky bottom-0 left-0 right-0 z-20 mt-4">
                    <div className="bg-white/95 backdrop-blur border border-slate-200 shadow-lg rounded-xl p-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Sol: başlık + buttonlar */}
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-bold text-slate-700">
                                    Bekleyen değişiklikler
                                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-black">
                                        {count}
                                    </span>
                                </span>
                                <Button
                                    type="primary"
                                    size="middle"
                                    icon={<SaveOutlined />}
                                    onClick={handleOpenPreview}
                                    loading={previewLoading || savingChangeset}
                                    disabled={count === 0}
                                    className="!bg-green-600 !border-green-600 hover:!bg-green-700"
                                >
                                    Önizle & Kaydet
                                </Button>
                                <Popconfirm
                                    title="Tüm bekleyen değişiklikler silinsin mi?"
                                    onConfirm={clearOps}
                                    okText="Temizle"
                                    cancelText="Vazgeç"
                                    disabled={count === 0}
                                >
                                    <Button
                                        size="middle"
                                        icon={<ClearOutlined />}
                                        disabled={count === 0}
                                    >
                                        Temizle
                                    </Button>
                                </Popconfirm>
                            </div>

                            {/* Sağ: bekleyen op listesi */}
                            <div className="flex-1 min-w-0 flex flex-wrap gap-1.5 md:justify-end max-h-[88px] overflow-y-auto">
                                {pendingOps.map((op, i) => (
                                    <Tooltip key={op._clientId} title={op._label || ''}>
                                        <span className="inline-flex items-center gap-1 max-w-[260px] bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-600">
                                            <span className="truncate">{op._label || `${op.record_type} ${op.op_type}`}</span>
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<CloseOutlined />}
                                                className="!w-4 !h-4 !min-w-0 !p-0 !text-slate-400 hover:!text-red-500"
                                                onClick={() => removeOp(i)}
                                            />
                                        </span>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Kaydet öncesi etki önizlemesi + kilitli dönem ONAYLA ─── */}
            <PreviewModal
                open={previewOpen}
                loading={previewLoading}
                applying={savingChangeset}
                data={previewData}
                onApply={handleApplyFromModal}
                onCancel={() => { setPreviewOpen(false); setPreviewData(null); }}
            />
        </div>
    );
}
