const HolidayBuilderModal = ({ onClose, selectedHolidayIds, allHolidays, onUpdateSelection, onNewHolidayCreated }) => {
    const [year, setYear] = useState(new Date().getFullYear());

    // Derived state for quick lookup
    const holidayDateMap = useMemo(() => {
        const map = {};
        allHolidays.forEach(h => {
            map[h.date] = h;
        });
        return map;
    }, [allHolidays]);

    const selectedDates = useMemo(() => {
        const set = new Set();
        allHolidays.filter(h => selectedHolidayIds.includes(h.id)).forEach(h => {
            set.add(h.date);
        });
        return set;
    }, [allHolidays, selectedHolidayIds]);

    const handleDateClick = async (dateStr) => {
        // Check if a holiday exists on this date
        const existingHoliday = holidayDateMap[dateStr];

        if (existingHoliday) {
            // Toggle selection
            const isSelected = selectedHolidayIds.includes(existingHoliday.id);
            let newIds;
            if (isSelected) {
                newIds = selectedHolidayIds.filter(id => id !== existingHoliday.id);
            } else {
                newIds = [...selectedHolidayIds, existingHoliday.id];
            }
            onUpdateSelection(newIds);
        } else {
            // Prompt to create NEW holiday
            const name = prompt(`${dateStr} tarihine yeni bir tatil eklemek ister misiniz? Tatil Adı:`);
            if (name) {
                try {
                    const res = await api.post('/public-holidays/', {
                        name,
                        date: dateStr,
                        type: 'FULL_DAY',
                        description: 'Görsel düzenleyici üzerinden eklendi'
                    });

                    const newHoliday = res.data;
                    onNewHolidayCreated(newHoliday);

                    // Auto-select the newly created holiday
                    onUpdateSelection([...selectedHolidayIds, newHoliday.id]);

                } catch (error) {
                    alert('Tatil oluşturulamadı: ' + error.message);
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Görsel Tatil Düzenleyici</h3>
                        <p className="text-sm text-slate-500">Tarihlere tıklayarak ekleyip çıkarabilirsiniz. Kırmızılar genel tatil, Maviler seçili tatillerdir.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50">
                    <YearCalendar
                        year={year}
                        onYearChange={setYear}
                        holidays={new Set(allHolidays.map(h => h.date))} // Global list (Red)
                        selectedDates={selectedDates} // Selected for this calendar (Blue)
                        onDateClick={handleDateClick}
                    />
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
                    >
                        Tamamla
                    </button>
                </div>
            </div>
        </div>
    );
};
