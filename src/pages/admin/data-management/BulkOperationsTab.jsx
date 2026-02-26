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
} from '@ant-design/icons';
import { eachDayOfInterval, getDay, format } from 'date-fns';
import dayjs from 'dayjs';
import api from '../../../services/api';

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

    // ── Load employees ────────────────────────────────────────────
    useEffect(() => {
        setLoadingEmployees(true);
        api.get('/employees/?page_size=1000')
            .then((res) => {
                const data = res.data.results || res.data;
                setEmployees(data);
            })
            .catch(() => message.error('Personel listesi yuklenemedi.'))
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
            message.warning('Lutfen tum alanlari doldurun.');
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
            message.warning('Secilen tarih araliginda is gunu bulunamadi.');
            return;
        }

        const total = bulkSelectedEmps.length * workDays.length;

        Modal.confirm({
            title: 'Toplu Kayit Olusturma Onayi',
            icon: <ThunderboltOutlined style={{ color: '#f59e0b' }} />,
            content: (
                <div>
                    <p>
                        <strong>{bulkSelectedEmps.length}</strong> personel,{' '}
                        <strong>{workDays.length}</strong> is gunu icin toplam{' '}
                        <strong>{total}</strong> kayit olusturulacak.
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Giris: {bulkCheckIn.format('HH:mm')} — Cikis: {bulkCheckOut.format('HH:mm')}
                    </p>
                    <p className="text-slate-500 text-sm">
                        {format(workDays[0], 'dd.MM.yyyy')} — {format(workDays[workDays.length - 1], 'dd.MM.yyyy')}
                    </p>
                </div>
            ),
            okText: 'Evet, Olustur',
            cancelText: 'Vazgec',
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
                        override_note: 'Toplu giris ile olusturuldu',
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
            message.success(`${successCount}/${total} kayit basariyla olusturuldu.`);
        } else {
            message.warning(
                `${successCount} basarili, ${errorCount} hata. Toplam: ${total} kayit.`
            );
        }
    };

    // ================================================================
    // SECTION 2: Toplu Otomatik Tamamlama
    // ================================================================
    const handleAutoFill = () => {
        if (!autoFillEmps.length || !autoFillMonth) {
            message.warning('Lutfen personel ve ay secin.');
            return;
        }

        const monthLabel = autoFillMonth.format('MMMM YYYY');

        Modal.confirm({
            title: 'Toplu Otomatik Tamamlama Onayi',
            icon: <SyncOutlined style={{ color: '#3b82f6' }} />,
            content: (
                <div>
                    <p>
                        <strong>{autoFillEmps.length}</strong> personel icin{' '}
                        <strong>{monthLabel}</strong> ayi otomatik doldurulacak.
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Zaten kaydi olan gunler etkilenmez. Bos is gunleri vardiya saatlerine gore doldurulur.
                    </p>
                </div>
            ),
            okText: 'Evet, Tamamla',
            cancelText: 'Vazgec',
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
                `${successCount} personel tamamlandi. Toplam ${totalFilledDays} gun dolduruldu.`
            );
        } else {
            message.warning(
                `${successCount} basarili, ${errorCount} hata. Toplam ${totalFilledDays} gun dolduruldu.`
            );
        }
    };

    // ================================================================
    // SECTION 3: Toplu Bakiye Sifirlama (Mutabakat)
    // ================================================================
    const handleSettle = () => {
        if (!settleEmps.length || !settleMonth) {
            message.warning('Lutfen personel ve ay secin.');
            return;
        }

        const monthLabel = settleMonth.format('MMMM YYYY');

        Modal.confirm({
            title: 'Toplu Mutabakat Onayi',
            icon: <CalculatorOutlined style={{ color: '#ef4444' }} />,
            content: (
                <div>
                    <p>
                        <strong>{settleEmps.length}</strong> personel icin{' '}
                        <strong>{monthLabel}</strong> ayi bakiyesi sifirlanacak.
                    </p>
                    <Alert
                        type="warning"
                        showIcon
                        className="mt-3"
                        message="Bu islem geri alinamaz"
                        description="Tum secili personellerin bakiyeleri sifirlanacak ve bir sonraki aya devretmeyecek."
                    />
                </div>
            ),
            okText: 'Evet, Mutabakat Yap',
            cancelText: 'Vazgec',
            okType: 'danger',
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
            message.success(`${successCount} personel bakiyesi basariyla sifirlandi.`);
        } else {
            message.warning(
                `${successCount} basarili, ${errorCount} hata. Toplam: ${total} personel.`
            );
        }
    };

    // ── Result summary renderer ───────────────────────────────────
    const renderResultSummary = (progress, extra) => {
        if (!progress.results.length || progress.current === 0) return null;
        const r = progress.results[0];

        return (
            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-4">
                    <Statistic
                        title="Basarili"
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
                        {progress.current}/{progress.total} islem
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
                    'Toplu Giris/Cikis Olusturma',
                    'Birden fazla personel icin toplu devam kaydi olustur'
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
                            placeholder="Personel secin..."
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
                            Tarih Araligi
                        </label>
                        <DatePicker.RangePicker
                            value={bulkDateRange}
                            onChange={setBulkDateRange}
                            format="DD.MM.YYYY"
                            className="w-full"
                            disabled={bulkProcessing}
                            placeholder={['Baslangic', 'Bitis']}
                        />
                    </div>

                    {/* Hafta sonu atla */}
                    <div className="flex items-end pb-1">
                        <Checkbox
                            checked={bulkSkipWeekends}
                            onChange={(e) => setBulkSkipWeekends(e.target.checked)}
                            disabled={bulkProcessing}
                        >
                            <span className="text-sm text-slate-700">Hafta sonlarini atla</span>
                        </Checkbox>
                    </div>

                    {/* Giris saati */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <ClockCircleOutlined className="mr-1" />
                            Giris Saati
                        </label>
                        <TimePicker
                            value={bulkCheckIn}
                            onChange={setBulkCheckIn}
                            format="HH:mm"
                            className="w-full"
                            minuteStep={5}
                            disabled={bulkProcessing}
                            placeholder="Giris"
                        />
                    </div>

                    {/* Cikis saati */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <ClockCircleOutlined className="mr-1" />
                            Cikis Saati
                        </label>
                        <TimePicker
                            value={bulkCheckOut}
                            onChange={setBulkCheckOut}
                            format="HH:mm"
                            className="w-full"
                            minuteStep={5}
                            disabled={bulkProcessing}
                            placeholder="Cikis"
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
                        Olustur
                    </Button>
                    {bulkSelectedEmps.length > 0 && bulkDateRange && (
                        <Tag color="blue" className="text-xs">
                            {bulkSelectedEmps.length} personel secili
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
                    'Secilen ayin bos is gunlerini vardiya saatlerine gore doldur'
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
                            placeholder="Personel secin..."
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
                            placeholder="Ay secin"
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
                            {autoFillEmps.length} personel secili
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
                            title="Doldurulan Gun"
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
                    'Toplu Bakiye Sifirlama (Mutabakat)',
                    'Secilen personellerin ay bakiyesini sifirla'
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
                                <span className="text-xs text-slate-500">Tumunu Sec</span>
                            </Checkbox>
                        </div>
                        <Select
                            mode="multiple"
                            showSearch
                            placeholder="Personel secin..."
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
                            placeholder="Ay secin"
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
                            {settleEmps.length} personel secili
                        </Tag>
                    )}
                </div>

                {/* Progress */}
                {renderProgress(settleProgress, settleProcessing)}

                {/* Result summary */}
                {renderResultSummary(settleProgress)}
            </Card>
        </div>
    );
}
