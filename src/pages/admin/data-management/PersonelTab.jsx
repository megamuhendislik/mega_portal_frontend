import React, { useState, useEffect, useCallback } from 'react';
import { Select, Button, Modal, message, Spin, Empty } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined, ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
import { format, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../../../services/api';
import CalendarGrid from './CalendarGrid';
import DayEditPanel from './DayEditPanel';

export default function PersonelTab({ initialEmployee }) {
    // ── State ──────────────────────────────────────────────────────
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingCalendar, setLoadingCalendar] = useState(false);

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

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;

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

    useEffect(() => {
        if (selectedEmployee) {
            fetchMonthlyData();
        }
    }, [selectedEmployee, currentMonth, fetchMonthlyData]);

    // ── Handlers ───────────────────────────────────────────────────
    const handleEmployeeChange = (empId) => {
        const emp = employees.find((e) => e.id === empId);
        setSelectedEmployee(emp || null);
        setSelectedDate(null);
        setMonthlyData({});
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

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
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
                /* Personel secili: Takvim + Panel */
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
            )}
        </div>
    );
}
