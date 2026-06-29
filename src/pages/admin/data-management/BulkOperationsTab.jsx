import React, { useState, useEffect } from 'react';
import {
    Card,
    Select,
    DatePicker,
    TimePicker,
    Button,
    Progress,
    Checkbox,
    Modal,
    message,
    Alert,
    Statistic,
    Tag,
    Tooltip,
    Spin,
} from 'antd';
import {
    ThunderboltOutlined,
    SyncOutlined,
    CalculatorOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    TeamOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    LockOutlined,
    UnlockOutlined,
} from '@ant-design/icons';
import { eachDayOfInterval, getDay, format } from 'date-fns';
import dayjs from 'dayjs';
import api from '../../../services/api';
import { getIstanbulFiscalMonth } from '../../../utils/dateUtils';

// ── Helpers ────────────────────────────────────────────────────────────
const buildEmployeeOptions = (employees) =>
    employees.map((e) => ({
        value: e.id,
        label: `${e.first_name} ${e.last_name}${e.department_name ? ` — ${e.department_name}` : ''}`,
        searchText: `${e.first_name} ${e.last_name} ${e.employee_code || ''} ${e.department_name || ''}`.toLowerCase(),
    }));

const filterOption = (input, option) =>
    option.searchText.includes(input.toLowerCase());

// ── Component ──────────────────────────────────────────────────────────
export default function BulkOperationsTab() {
    // ── Shared: Employee list ──────────────────────────────────────
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // ── Section 1: Toplu Giris/Cikis ──────────────────────────────
    const [bulkSelectedEmps, setBulkSelectedEmps] = useState([]);
    const [bulkDateRange, setBulkDateRange] = useState(null);
    const [bulkCheckIn, setBulkCheckIn] = useState(dayjs('08:00', 'HH:mm'));
    const [bulkCheckOut, setBulkCheckOut] = useState(dayjs('18:00', 'HH:mm'));
    const [bulkSkipWeekends, setBulkSkipWeekends] = useState(true);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, results: [] });

    // ── Section 2: Toplu Otomatik Tamamlama ───────────────────────
    const [autoFillEmps, setAutoFillEmps] = useState([]);
    const [autoFillMonth, setAutoFillMonth] = useState(null);
    const [autoFillProcessing, setAutoFillProcessing] = useState(false);
    const [autoFillProgress, setAutoFillProgress] = useState({ current: 0, total: 0, results: [] });

    // ── Section 3: Toplu Bakiye Sifirlama ─────────────────────────
    const [settleEmps, setSettleEmps] = useState([]);
    const [settleMonth, setSettleMonth] = useState(null);
    const [settleProcessing, setSettleProcessing] = useState(false);
    const [settleProgress, setSettleProgress] = useState({ current: 0, total: 0, results: [] });

    // ── Section 4: Geçmiş Dönem Kilidi ────────────────────────────
    // Şirket geneli (çalışan bağımsız) mali dönem kilidi: kilitli dönemde
    // kullanıcı talep oluşturamaz/onaylayamaz ve PENDING talepler iptal olur.
    const [lockMonth, setLockMonth] = useState(null);
    const [lockStatus, setLockStatus] = useState(null); // { year, month, is_locked } | null
    const [lockStatusLoading, setLockStatusLoading] = useState(false);
    const [lockProcessing, setLockProcessing] = useState(false);

    // ── Load employees ────────────────────────────────────────────
    useEffect(() => {
        setLoadingEmployees(true);
        api.get('/employees/?page_size=1000')
            .then((res) => {
                const data = res.data.results || res.data;
                setEmployees(data);
            })
            .catch(() => message.error('Personel listesi yüklenemedi.'))
            .finally(() => setLoadingEmployees(false));
    }, []);

    const employeeOptions = buildEmployeeOptions(employees);

    // ── "Select All" helpers ──────────────────────────────────────
    const allEmployeeIds = employees.map((e) => e.id);

    const handleSelectAllSettle = (checked) => {
        setSettleEmps(checked ? allEmployeeIds : []);
    };

    // ================================================================
    // SECTION 1: Toplu Giris/Cikis Olusturma
    // ================================================================
    const handleBulkCreate = () => {
        if (!bulkSelectedEmps.length || !bulkDateRange || !bulkCheckIn || !bulkCheckOut) {
            message.warning('Lütfen tüm alanları doldurun.');
            return;
        }

        const [startDate, endDate] = bulkDateRange;
        const days = eachDayOfInterval({
            start: startDate.toDate(),
            end: endDate.toDate(),
        });
        const workDays = bulkSkipWeekends
            ? days.filter((d) => getDay(d) !== 0 && getDay(d) !== 6)
            : days;

        if (workDays.length === 0) {
            message.warning('Seçilen tarih aralığında iş günü bulunamadı.');
            return;
        }

        const total = bulkSelectedEmps.length * workDays.length;

        Modal.confirm({
            title: 'Toplu Kayıt Oluşturma Onayı',
            icon: <ThunderboltOutlined style={{ color: '#f59e0b' }} />,
            content: (
                <div>
                    <p>
                        <strong>{bulkSelectedEmps.length}</strong> personel,{' '}
                        <strong>{workDays.length}</strong> iş günü için toplam{' '}
                        <strong>{total}</strong> kayıt oluşturulacak.
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Giriş: {bulkCheckIn.format('HH:mm')} — Çıkış: {bulkCheckOut.format('HH:mm')}
                    </p>
                    <p className="text-slate-500 text-sm">
                        {format(workDays[0], 'dd.MM.yyyy')} — {format(workDays[workDays.length - 1], 'dd.MM.yyyy')}
                    </p>
                </div>
            ),
            okText: 'Evet, Oluştur',
            cancelText: 'Vazgeç',
            onOk: () => executeBulkCreate(workDays, total),
        });
    };

    const executeBulkCreate = async (workDays, total) => {
        setBulkProgress({ current: 0, total, results: [] });
        setBulkProcessing(true);

        let current = 0;
        let successCount = 0;
        let errorCount = 0;

        for (const empId of bulkSelectedEmps) {
            for (const day of workDays) {
                const dateStr = format(day, 'yyyy-MM-dd');
                try {
                    await api.post('/system-data/update_daily_records/', {
                        employee_id: empId,
                        date: dateStr,
                        records: [
                            {
                                check_in: `${dateStr}T${bulkCheckIn.format('HH:mm')}`,
                                check_out: `${dateStr}T${bulkCheckOut.format('HH:mm')}`,
                                source: 'MANUAL',
                                status: 'OPEN',
                            },
                        ],
                        delete_ids: [],
                        override_note: 'Toplu giriş ile oluşturuldu',
                    });
                    successCount++;
                } catch {
                    errorCount++;
                }
                current++;
                setBulkProgress((prev) => ({ ...prev, current }));
            }
        }

        setBulkProcessing(false);
        setBulkProgress((prev) => ({
            ...prev,
            results: [{ success: successCount, error: errorCount }],
        }));

        if (errorCount === 0) {
            message.success(`${successCount}/${total} kayıt başarıyla oluşturuldu.`);
        } else {
            message.warning(
                `${successCount} başarılı, ${errorCount} hata. Toplam: ${total} kayıt.`
            );
        }
    };

    // ================================================================
    // SECTION 2: Toplu Otomatik Tamamlama
    // ================================================================
    const handleAutoFill = () => {
        if (!autoFillEmps.length || !autoFillMonth) {
            message.warning('Lütfen personel ve ay seçin.');
            return;
        }

        const monthLabel = autoFillMonth.format('MMMM YYYY');

        Modal.confirm({
            title: 'Toplu Otomatik Tamamlama Onayı',
            icon: <SyncOutlined style={{ color: '#3b82f6' }} />,
            content: (
                <div>
                    <p>
                        <strong>{autoFillEmps.length}</strong> personel için{' '}
                        <strong>{monthLabel}</strong> ayı otomatik doldurulacak.
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Zaten kaydı olan günler etkilenmez. Boş iş günleri vardiya saatlerine göre doldurulur.
                    </p>
                </div>
            ),
            okText: 'Evet, Tamamla',
            cancelText: 'Vazgeç',
            onOk: () => executeAutoFill(),
        });
    };

    const executeAutoFill = async () => {
        const total = autoFillEmps.length;
        setAutoFillProgress({ current: 0, total, results: [] });
        setAutoFillProcessing(true);

        let current = 0;
        let successCount = 0;
        let totalFilledDays = 0;
        let errorCount = 0;

        const year = autoFillMonth.year();
        const month = autoFillMonth.month() + 1;

        for (const empId of autoFillEmps) {
            try {
                const res = await api.post('/system-data/auto_fill_month/', {
                    employee_id: empId,
                    year,
                    month,
                });
                const filled = res.data?.filled_days || 0;
                totalFilledDays += filled;
                successCount++;
            } catch {
                errorCount++;
            }
            current++;
            setAutoFillProgress((prev) => ({ ...prev, current }));
        }

        setAutoFillProcessing(false);
        setAutoFillProgress((prev) => ({
            ...prev,
            results: [{ success: successCount, error: errorCount, filledDays: totalFilledDays }],
        }));

        if (errorCount === 0) {
            message.success(
                `${successCount} personel tamamlandı. Toplam ${totalFilledDays} gün dolduruldu.`
            );
        } else {
            message.warning(
                `${successCount} başarılı, ${errorCount} hata. Toplam ${totalFilledDays} gün dolduruldu.`
            );
        }
    };

    // ================================================================
    // SECTION 3: Toplu Bakiye Sifirlama (Mutabakat)
    // ================================================================
    const handleSettle = () => {
        if (!settleEmps.length || !settleMonth) {
            message.warning('Lütfen personel ve ay seçin.');
            return;
        }

        const monthLabel = settleMonth.format('MMMM YYYY');

        Modal.confirm({
            title: 'Toplu Mutabakat Onayı',
            icon: <CalculatorOutlined style={{ color: '#ef4444' }} />,
            content: (
                <div>
                    <p>
                        <strong>{settleEmps.length}</strong> personel için{' '}
                        <strong>{monthLabel}</strong> sonuna kadar birikmiş{' '}
                        <strong>toplam devir</strong> (önceki aylardan gelen dahil) sıfırlanacak.
                    </p>
                    <Alert
                        type="info"
                        showIcon
                        className="mt-3"
                        message="Toplam kümülatif devir sıfırlanır"
                        description="Her personelin o aya kadar birikmiş toplam bakiyesi (yalnız o ayın neti değil) sıfırlanır ve sonraki aylara devretmez. Mutabakat geri alınabilir (kişi bazında Personel sekmesinden)."
                    />
                </div>
            ),
            okText: 'Evet, Mutabakat Yap',
            cancelText: 'Vazgeç',
            onOk: () => executeSettle(),
        });
    };

    const executeSettle = async () => {
        const total = settleEmps.length;
        setSettleProgress({ current: 0, total, results: [] });
        setSettleProcessing(true);

        let current = 0;
        let successCount = 0;
        let errorCount = 0;

        const year = settleMonth.year();
        const month = settleMonth.month() + 1;

        for (const empId of settleEmps) {
            try {
                await api.post('/system-data/settle_balance/', {
                    employee_id: empId,
                    year,
                    month,
                });
                successCount++;
            } catch {
                errorCount++;
            }
            current++;
            setSettleProgress((prev) => ({ ...prev, current }));
        }

        setSettleProcessing(false);
        setSettleProgress((prev) => ({
            ...prev,
            results: [{ success: successCount, error: errorCount }],
        }));

        if (errorCount === 0) {
            message.success(`${successCount} personel bakiyesi başarıyla sıfırlandı.`);
        } else {
            message.warning(
                `${successCount} başarılı, ${errorCount} hata. Toplam: ${total} personel.`
            );
        }
    };

    // ================================================================
    // SECTION 4: Geçmiş Dönem Kilidi
    // ================================================================
    // Seçilen dönemin (year/month) kilit durumunu çek → rozet.
    useEffect(() => {
        if (!lockMonth) {
            setLockStatus(null);
            return;
        }
        const year = lockMonth.year();
        const month = lockMonth.month() + 1;
        let cancelled = false;
        setLockStatusLoading(true);
        api.get('/system-data/period_lock_status/', { params: { year, month } })
            .then((res) => { if (!cancelled) setLockStatus(res.data || null); })
            .catch(() => { if (!cancelled) setLockStatus(null); })
            .finally(() => { if (!cancelled) setLockStatusLoading(false); });
        return () => { cancelled = true; };
    }, [lockMonth]);

    // Seçilen dönem KAPANMIŞ mı? Backend yalnız kapanmış geçmiş dönemi kilitler
    // (today > period_end). Global kilit takvim-bağımsız default 26→25 kuralını
    // kullandığından, açık/kapalı sınırı getIstanbulFiscalMonth (bugünü içeren mali
    // dönem) ile birebir eşleşir: seçilen dönem cari mali dönemden ÖNCEYSE kapanmıştır.
    // Bu yalnız buton disabled durumu içindir; otorite backend'in 400 yanıtıdır (graceful).
    const lockPeriodClosed = (() => {
        if (!lockMonth) return false;
        const selY = lockMonth.year();
        const selM = lockMonth.month() + 1;
        const { year: curY, month: curM } = getIstanbulFiscalMonth();
        return (selY * 12 + selM) < (curY * 12 + curM);
    })();

    const executeTogglePeriodLock = async (year, month, nextLocked) => {
        setLockProcessing(true);
        try {
            const res = await api.post('/system-data/set_period_lock/', {
                year, month, locked: nextLocked,
            });
            const newLocked = res.data?.locked ?? nextLocked;
            const cancelledPending = res.data?.cancelled_pending || 0;
            if (newLocked) {
                message.success(
                    cancelledPending > 0
                        ? `Dönem kilitlendi. ${cancelledPending} bekleyen talep iptal edildi.`
                        : 'Dönem kilitlendi.'
                );
            } else {
                message.success('Dönem kilidi açıldı.');
            }
            setLockStatus({ year, month, is_locked: newLocked });
        } catch (e) {
            // Açık dönem koruması (graceful): backend kapanmamış dönemde 400 döner.
            message.error('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setLockProcessing(false);
        }
    };

    const handleTogglePeriodLock = () => {
        if (!lockMonth) {
            message.warning('Lütfen bir dönem (ay) seçin.');
            return;
        }
        const year = lockMonth.year();
        const month = lockMonth.month() + 1;
        const monthLabel = lockMonth.format('MMMM YYYY');
        const currentlyLocked = !!lockStatus?.is_locked;
        const nextLocked = !currentlyLocked;

        Modal.confirm({
            title: nextLocked ? 'Dönemi Kilitle' : 'Dönem Kilidini Aç',
            icon: nextLocked
                ? <LockOutlined style={{ color: '#ef4444' }} />
                : <UnlockOutlined style={{ color: '#52c41a' }} />,
            content: nextLocked ? (
                <div>
                    <p>
                        <strong>{monthLabel}</strong> dönemi kilitlenecek. Kullanıcılar bu
                        döneme talep oluşturamaz/onaylayamaz ve bu dönemdeki bekleyen
                        talepler <strong>İPTAL</strong> edilir.
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        TYR ve Veri Yönetimi etkilenmez. Onaylıyor musunuz?
                    </p>
                </div>
            ) : (
                <div>
                    <p>
                        <strong>{monthLabel}</strong> dönemi kilidi açılacak. Kullanıcılar
                        tekrar talep oluşturabilecek.
                    </p>
                </div>
            ),
            okText: nextLocked ? 'Evet, Kilitle' : 'Evet, Kilidi Aç',
            okButtonProps: nextLocked ? { danger: true } : undefined,
            cancelText: 'Vazgeç',
            onOk: () => executeTogglePeriodLock(year, month, nextLocked),
        });
    };

    // ── Result summary renderer ───────────────────────────────────
    const renderResultSummary = (progress, extra) => {
        if (!progress.results.length || progress.current === 0) return null;
        const r = progress.results[0];

        return (
            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-4">
                    <Statistic
                        title="Başarılı"
                        value={r.success}
                        valueStyle={{ color: '#52c41a', fontSize: 20 }}
                        prefix={<CheckCircleOutlined />}
                    />
                    {r.error > 0 && (
                        <Statistic
                            title="Hata"
                            value={r.error}
                            valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
                            prefix={<WarningOutlined />}
                        />
                    )}
                    {extra}
                </div>
            </div>
        );
    };

    // ── Progress renderer ─────────────────────────────────────────
    const renderProgress = (progress, processing) => {
        if (!processing && progress.current === 0) return null;

        const percent =
            progress.total > 0
                ? Math.round((progress.current / progress.total) * 100)
                : 0;

        return (
            <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-500">
                        {progress.current}/{progress.total} işlem
                    </span>
                    <span className="text-xs font-semibold text-slate-600">{percent}%</span>
                </div>
                <Progress
                    percent={percent}
                    status={processing ? 'active' : percent === 100 ? 'success' : 'normal'}
                    strokeColor={processing ? undefined : { from: '#52c41a', to: '#52c41a' }}
                    showInfo={false}
                    size="small"
                />
            </div>
        );
    };

    // ── Card header builder ───────────────────────────────────────
    const cardTitle = (icon, iconColor, bgGradient, title, subtitle) => ({
        title: (
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
                    {icon}
                </div>
                <div>
                    <div className="font-bold text-slate-800">{title}</div>
                    <div className="text-xs font-normal text-slate-500">{subtitle}</div>
                </div>
            </div>
        ),
        styles: {
            header: {
                borderBottom: '1px solid #f0f0f0',
                background: bgGradient,
            },
        },
    });

    // ================================================================
    // RENDER
    // ================================================================
    return (
        <div className="animate-fade-in space-y-4 md:space-y-6">
            {/* ── Section 1: Toplu Giris/Cikis Olusturma ────────── */}
            <Card
                className="shadow-sm hover:shadow-md transition-shadow"
                {...cardTitle(
                    <ThunderboltOutlined className="text-amber-600 text-xl" />,
                    'bg-amber-500/10',
                    'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    'Toplu Giriş/Çıkış Oluşturma',
                    'Birden fazla personel için toplu devam kaydı oluştur'
                )}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personel secimi */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <TeamOutlined className="mr-1" />
                            Personeller
                        </label>
                        <Select
                            mode="multiple"
                            showSearch
                            placeholder="Personel seçin..."
                            value={bulkSelectedEmps}
                            onChange={setBulkSelectedEmps}
                            options={employeeOptions}
                            filterOption={filterOption}
                            loading={loadingEmployees}
                            className="w-full"
                            maxTagCount="responsive"
                            allowClear
                            disabled={bulkProcessing}
                        />
                    </div>

                    {/* Tarih araligi */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <CalendarOutlined className="mr-1" />
                            Tarih Aralığı
                        </label>
                        <DatePicker.RangePicker
                            value={bulkDateRange}
                            onChange={setBulkDateRange}
                            format="DD.MM.YYYY"
                            className="w-full"
                            disabled={bulkProcessing}
                            placeholder={['Başlangıç', 'Bitiş']}
                        />
                    </div>

                    {/* Hafta sonu atla */}
                    <div className="flex items-end pb-1">
                        <Checkbox
                            checked={bulkSkipWeekends}
                            onChange={(e) => setBulkSkipWeekends(e.target.checked)}
                            disabled={bulkProcessing}
                        >
                            <span className="text-sm text-slate-700">Hafta sonlarını atla</span>
                        </Checkbox>
                    </div>

                    {/* Giris saati */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <ClockCircleOutlined className="mr-1" />
                            Giriş Saati
                        </label>
                        <TimePicker
                            value={bulkCheckIn}
                            onChange={setBulkCheckIn}
                            format="HH:mm"
                            className="w-full"
                            minuteStep={1}
                            disabled={bulkProcessing}
                            placeholder="Giriş"
                        />
                    </div>

                    {/* Cikis saati */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <ClockCircleOutlined className="mr-1" />
                            Çıkış Saati
                        </label>
                        <TimePicker
                            value={bulkCheckOut}
                            onChange={setBulkCheckOut}
                            format="HH:mm"
                            className="w-full"
                            minuteStep={1}
                            disabled={bulkProcessing}
                            placeholder="Çıkış"
                        />
                    </div>
                </div>

                {/* Olustur butonu */}
                <div className="mt-5 flex items-center gap-3">
                    <Button
                        type="primary"
                        size="large"
                        icon={<ThunderboltOutlined />}
                        loading={bulkProcessing}
                        disabled={
                            !bulkSelectedEmps.length ||
                            !bulkDateRange ||
                            !bulkCheckIn ||
                            !bulkCheckOut
                        }
                        onClick={handleBulkCreate}
                        className="bg-amber-500 hover:!bg-amber-600 border-amber-500 hover:!border-amber-600"
                    >
                        Oluştur
                    </Button>
                    {bulkSelectedEmps.length > 0 && bulkDateRange && (
                        <Tag color="blue" className="text-xs">
                            {bulkSelectedEmps.length} personel seçili
                        </Tag>
                    )}
                </div>

                {/* Progress */}
                {renderProgress(bulkProgress, bulkProcessing)}

                {/* Result summary */}
                {renderResultSummary(bulkProgress)}
            </Card>

            {/* ── Section 2: Toplu Otomatik Tamamlama ───────────── */}
            <Card
                className="shadow-sm hover:shadow-md transition-shadow"
                {...cardTitle(
                    <SyncOutlined className="text-blue-600 text-xl" />,
                    'bg-blue-500/10',
                    'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    'Toplu Otomatik Tamamlama',
                    'Seçilen ayın boş iş günlerini vardiya saatlerine göre doldur'
                )}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personel secimi */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <TeamOutlined className="mr-1" />
                            Personeller
                        </label>
                        <Select
                            mode="multiple"
                            showSearch
                            placeholder="Personel seçin..."
                            value={autoFillEmps}
                            onChange={setAutoFillEmps}
                            options={employeeOptions}
                            filterOption={filterOption}
                            loading={loadingEmployees}
                            className="w-full"
                            maxTagCount="responsive"
                            allowClear
                            disabled={autoFillProcessing}
                        />
                    </div>

                    {/* Ay secimi */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <CalendarOutlined className="mr-1" />
                            Ay
                        </label>
                        <DatePicker
                            picker="month"
                            value={autoFillMonth}
                            onChange={setAutoFillMonth}
                            format="MMMM YYYY"
                            className="w-full"
                            disabled={autoFillProcessing}
                            placeholder="Ay seçin"
                        />
                    </div>
                </div>

                {/* Otomatik Tamamla butonu */}
                <div className="mt-5 flex items-center gap-3">
                    <Button
                        type="primary"
                        size="large"
                        icon={<SyncOutlined />}
                        loading={autoFillProcessing}
                        disabled={!autoFillEmps.length || !autoFillMonth}
                        onClick={handleAutoFill}
                    >
                        Otomatik Tamamla
                    </Button>
                    {autoFillEmps.length > 0 && (
                        <Tag color="blue" className="text-xs">
                            {autoFillEmps.length} personel seçili
                        </Tag>
                    )}
                </div>

                {/* Progress */}
                {renderProgress(autoFillProgress, autoFillProcessing)}

                {/* Result summary */}
                {renderResultSummary(
                    autoFillProgress,
                    autoFillProgress.results[0]?.filledDays != null && (
                        <Statistic
                            title="Doldurulan Gün"
                            value={autoFillProgress.results[0].filledDays}
                            valueStyle={{ color: '#1677ff', fontSize: 20 }}
                            prefix={<CalendarOutlined />}
                        />
                    )
                )}
            </Card>

            {/* ── Section 3: Toplu Bakiye Sifirlama (Mutabakat) ─── */}
            <Card
                className="shadow-sm hover:shadow-md transition-shadow"
                {...cardTitle(
                    <CalculatorOutlined className="text-rose-600 text-xl" />,
                    'bg-rose-500/10',
                    'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                    'Toplu Bakiye Sıfırlama (Mutabakat)',
                    'Seçilen personellerin o aya kadar birikmiş toplam devrini sıfırla'
                )}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personel secimi + Tumunu Sec */}
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-600">
                                <TeamOutlined className="mr-1" />
                                Personeller
                            </label>
                            <Checkbox
                                checked={
                                    employees.length > 0 &&
                                    settleEmps.length === employees.length
                                }
                                indeterminate={
                                    settleEmps.length > 0 &&
                                    settleEmps.length < employees.length
                                }
                                onChange={(e) => handleSelectAllSettle(e.target.checked)}
                                disabled={settleProcessing || employees.length === 0}
                            >
                                <span className="text-xs text-slate-500">Tümünü Seç</span>
                            </Checkbox>
                        </div>
                        <Select
                            mode="multiple"
                            showSearch
                            placeholder="Personel seçin..."
                            value={settleEmps}
                            onChange={setSettleEmps}
                            options={employeeOptions}
                            filterOption={filterOption}
                            loading={loadingEmployees}
                            className="w-full"
                            maxTagCount="responsive"
                            allowClear
                            disabled={settleProcessing}
                        />
                    </div>

                    {/* Ay secimi */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <CalendarOutlined className="mr-1" />
                            Ay
                        </label>
                        <DatePicker
                            picker="month"
                            value={settleMonth}
                            onChange={setSettleMonth}
                            format="MMMM YYYY"
                            className="w-full"
                            disabled={settleProcessing}
                            placeholder="Ay seçin"
                        />
                    </div>
                </div>

                {/* Mutabakat Yap butonu */}
                <div className="mt-5 flex items-center gap-3">
                    <Button
                        type="primary"
                        danger
                        size="large"
                        icon={<CalculatorOutlined />}
                        loading={settleProcessing}
                        disabled={!settleEmps.length || !settleMonth}
                        onClick={handleSettle}
                    >
                        Mutabakat Yap
                    </Button>
                    {settleEmps.length > 0 && (
                        <Tag color="red" className="text-xs">
                            {settleEmps.length} personel seçili
                        </Tag>
                    )}
                </div>

                {/* Progress */}
                {renderProgress(settleProgress, settleProcessing)}

                {/* Result summary */}
                {renderResultSummary(settleProgress)}
            </Card>

            {/* ── Section 4: Geçmiş Dönem Kilidi ─────────────────── */}
            <Card
                className="shadow-sm hover:shadow-md transition-shadow"
                {...cardTitle(
                    <LockOutlined className="text-slate-600 text-xl" />,
                    'bg-slate-500/10',
                    'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    'Geçmiş Dönem Kilidi',
                    'Kapanmış bir mali dönemi kilitle — kullanıcılar o döneme talep oluşturamaz/onaylayamaz'
                )}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dönem secimi */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <CalendarOutlined className="mr-1" />
                            Dönem (Ay)
                        </label>
                        <DatePicker
                            picker="month"
                            value={lockMonth}
                            onChange={setLockMonth}
                            format="MMMM YYYY"
                            className="w-full"
                            disabled={lockProcessing}
                            placeholder="Dönem seçin"
                        />
                    </div>

                    {/* Kilit durumu rozeti */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Kilit Durumu
                        </label>
                        <div className="h-8 flex items-center">
                            {!lockMonth ? (
                                <span className="text-sm text-slate-400">Dönem seçin</span>
                            ) : lockStatusLoading ? (
                                <Spin size="small" />
                            ) : lockStatus == null ? (
                                <span className="text-sm text-slate-400">Durum alınamadı</span>
                            ) : lockStatus.is_locked ? (
                                <Tag icon={<LockOutlined />} color="red" className="text-sm py-0.5 px-2.5">
                                    Kilitli
                                </Tag>
                            ) : (
                                <Tag icon={<UnlockOutlined />} color="green" className="text-sm py-0.5 px-2.5">
                                    Açık
                                </Tag>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bilgi notu */}
                <Alert
                    type="warning"
                    showIcon
                    className="mt-4"
                    message="Kilit kullanıcı taleplerini etkiler"
                    description="Kilitli dönemde kullanıcılar fazla mesai, yemek ve kartsız giriş talebi oluşturamaz/onaylayamaz; kilitlendiğinde o dönemin bekleyen talepleri otomatik iptal edilir. TYR ve Veri Yönetimi (yöneticinin elle düzeltmeleri) etkilenmez. Yalnız kapanmış geçmiş dönemler kilitlenebilir."
                />

                {/* Kilitle / Kilidi Aç butonu */}
                <div className="mt-5 flex items-center gap-3">
                    {lockStatus?.is_locked ? (
                        <Button
                            type="primary"
                            size="large"
                            icon={<UnlockOutlined />}
                            loading={lockProcessing}
                            disabled={!lockMonth || lockStatusLoading}
                            onClick={handleTogglePeriodLock}
                            className="!bg-green-600 !border-green-600 hover:!bg-green-700"
                        >
                            Kilidi Aç
                        </Button>
                    ) : (
                        <Tooltip
                            title={
                                lockMonth && lockStatus != null && !lockPeriodClosed
                                    ? 'Yalnız kapanmış geçmiş dönemler kilitlenebilir'
                                    : ''
                            }
                        >
                            {/* span: disabled Button'da Tooltip'in tetiklenmesi için */}
                            <span className="inline-block">
                                <Button
                                    type="primary"
                                    danger
                                    size="large"
                                    icon={<LockOutlined />}
                                    loading={lockProcessing}
                                    disabled={
                                        !lockMonth ||
                                        lockStatusLoading ||
                                        lockStatus == null ||
                                        !lockPeriodClosed
                                    }
                                    onClick={handleTogglePeriodLock}
                                >
                                    Dönemi Kilitle
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                    {lockMonth && (
                        <Tag color={lockStatus?.is_locked ? 'red' : 'default'} className="text-xs">
                            {lockMonth.format('MMMM YYYY')}
                        </Tag>
                    )}
                </div>
            </Card>
        </div>
    );
}
