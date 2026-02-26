import {
    Clock, CalendarDays, Timer, Utensils, Calendar,
    Contact, CheckSquare, BarChart3, CalendarRange, Shield
} from 'lucide-react';

const helpContent = [
    {
        id: 'giris-cikis',
        title: 'Giriş / Çıkış',
        icon: Clock,
        description: 'Kart okutma, şift başlatma ve canlı durum takibi',
        permission: null,
        link: '/',
        steps: [
            {
                title: 'Şift Başlatma',
                description: 'Ana sayfadaki "Şift Başlat" butonuna tıklayın. Kart okutucu aktifse otomatik algılanır. Yoksa manuel giriş yapabilirsiniz.'
            },
            {
                title: 'Canlı Durum Takibi',
                description: 'Ana sayfadaki 3 widget\'ta (Çalışma Süresi, Kalan Mola, Fazla Mesai) anlık durumunuzu görebilirsiniz. Veriler 30 saniyede bir güncellenir.'
            },
            {
                title: 'Çıkış Yapma',
                description: 'Mesai bitiminde kart okutun veya "Şift Bitir" butonuna tıklayın. Sistem otomatik olarak çalışma sürenizi hesaplar.'
            },
            {
                title: 'Mola Takibi',
                description: 'Üst menüdeki kahve ikonunda mola sürenizi görebilirsiniz. Mavi = normal, turuncu = %80 doldu, kırmızı = limit aşıldı.'
            }
        ],
        tips: [
            { type: 'info', text: 'Giriş yaptıktan sonra ilk 5 dakika tolerans süresidir — erken giriş vardiya başlangıcına yuvarlanır.' },
            { type: 'warning', text: 'Çıkış yapmadan ayrılırsanız, gece yarısı sistemi otomatik olarak mesainizi kapatır.' },
            { type: 'success', text: 'Kart okutucu arızalıysa "Kartsız Giriş Talebi" oluşturabilirsiniz. Bu talep yöneticinizin onayına gider.' }
        ],
        faq: [
            { q: 'Kart okutmayı unuttum, ne yapmalıyım?', a: 'Talepler sayfasından "Kartsız Giriş Talebi" oluşturabilirsiniz. Giriş ve çıkış saatlerinizi belirtin, yöneticiniz onayladığında kayıt oluşturulur.' },
            { q: 'Gece vardiyasında çalışıyorum, kayıtlarım nasıl hesaplanır?', a: 'Gece vardiyası özelliği aktifse, gece yarısını geçen kayıtlar otomatik olarak bölünür. Her gün için ayrı kayıt oluşturulur.' },
            { q: 'Mola sürem neden azalıyor?', a: 'Çıkış yapıp tekrar giriş yaptığınızda aradaki süre mola olarak sayılır. Toplam mola hakkınız (genellikle 30 dk) dahilinde takip edilir.' }
        ]
    },
    {
        id: 'izin-talepleri',
        title: 'İzin Talepleri',
        icon: CalendarDays,
        description: 'Yıllık izin, avans izin başvurusu ve izin bakiyesi takibi',
        permission: null,
        link: '/requests',
        steps: [
            {
                title: 'İzin Bakiyesi Kontrolü',
                description: 'Talepler sayfasında izin bakiyenizi görebilirsiniz. Yıllık hak edişiniz, kullanılan ve kalan gün sayınız görüntülenir.'
            },
            {
                title: 'Yeni İzin Talebi',
                description: 'Talepler sayfasında "Yeni İzin Talebi" butonuna tıklayın. İzin türünü, başlangıç ve bitiş tarihlerini seçin. Gerekirse açıklama ekleyin.'
            },
            {
                title: 'Onay Süreci',
                description: 'Talebiniz doğrudan yöneticinize gider. Onaylandığında veya reddedildiğinde bildirim alırsınız. Takvimde izin günleriniz turuncu renkte gösterilir.'
            },
            {
                title: 'İzin İptali',
                description: 'Onaylanmamış talepleri iptal edebilirsiniz. Onaylanmış izinler için yöneticinizle iletişime geçin.'
            }
        ],
        tips: [
            { type: 'info', text: 'İzinler FIFO (ilk giren ilk çıkar) yöntemiyle düşülür — en eski hak edişten başlar.' },
            { type: 'warning', text: 'Avans izin kullanıyorsanız, bakiyeniz negatife düşebilir. Bu durum gelecek hak edişlerinden düşülür.' },
            { type: 'success', text: 'Geçmiş 2 mali ay içindeki tarihler için geriye dönük izin talebi oluşturabilirsiniz.' }
        ],
        faq: [
            { q: 'Kaç gün izin hakkım var?', a: 'İzin hakkınız kıdeminize göre belirlenir. 1-5 yıl: 14 gün, 5-15 yıl: 20 gün, 15+ yıl: 26 gün (yasal minimum). Talepler sayfasında güncel bakiyenizi görebilirsiniz.' },
            { q: 'Avans izin nedir?', a: 'Henüz hak etmediğiniz izin günlerini önceden kullanmanızdır. Yönetici onayı gerektirir ve gelecek hak edişlerinizden düşülür.' },
            { q: 'Mazeret izni nasıl kullanırım?', a: 'İzin talebi oluştururken "Mazeret İzni" türünü seçin. Evlilik, doğum, vefat gibi yasal mazeret izinleri yıllık izin hakkınızdan düşülmez.' }
        ]
    },
    {
        id: 'ek-mesai',
        title: 'Ek Mesai',
        icon: Timer,
        description: 'Fazla mesai türleri, talep oluşturma ve onay süreci',
        permission: null,
        link: '/requests',
        steps: [
            {
                title: 'Mesai Türlerini Anlama',
                description: 'Sistem 3 tür ek mesai tanır: Planlı Mesai (yönetici ataması), Algılanan Mesai (otomatik tespit), Manuel Mesai (sizin girişiniz).'
            },
            {
                title: 'Planlı Mesai (Atama)',
                description: 'Yöneticiniz size mesai ataması yapar. Talepler sayfasında "Atanan Mesailer" bölümünde görünür. "Talep Et" butonuna tıklayarak onay sürecini başlatın.'
            },
            {
                title: 'Algılanan Mesai (Potansiyel)',
                description: 'Vardiya saatinizi aştığınızda sistem otomatik "Potansiyel Mesai" oluşturur. Talepler sayfasında bu mesaileri görebilir ve talep edebilirsiniz.'
            },
            {
                title: 'Manuel Mesai Girişi',
                description: 'Geçmiş bir tarih için mesai talebi oluşturmak isterseniz "Manuel Giriş" formunu kullanın. Tarih, saat ve açıklama girin.'
            },
            {
                title: 'Onay Süreci',
                description: 'Talebiniz "Potansiyel" → "Bekleyen" → "Onaylanan/Reddedilen" akışını izler. Onaylanınca puantajınıza yansır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Potansiyel mesai, henüz talep edilmemiş ama sistem tarafından algılanan fazla çalışmadır. Otomatik olarak oluşturulur.' },
            { type: 'warning', text: 'Mesai talepleri 2 mali ay geriye dönük süre içinde yapılmalıdır. Bu süreyi aşan mesailer talep edilemez.' },
            { type: 'success', text: 'Hafta sonu ve resmi tatillerde yapılan çalışmalar otomatik olarak mesai olarak algılanır.' }
        ],
        faq: [
            { q: 'Potansiyel mesai ile bekleyen mesai arasındaki fark nedir?', a: 'Potansiyel mesai henüz taslak halindedir — sistem otomatik algılamıştır ama siz henüz talep etmediniz. "Talep Et" butonuna bastığınızda "Bekleyen" durumuna geçer ve yönetici onayına gider.' },
            { q: 'Mesaim neden otomatik algılanmadı?', a: 'Mesainin algılanması için vardiya bitiş saatinizi belirli bir eşik süresinden fazla aşmanız gerekir. Bu eşik genellikle 15-30 dakikadır.' },
            { q: 'Onaylanan mesai puantajıma nasıl yansır?', a: 'Onaylanan mesai, o gün için oluşturulan kayda "Fazla Mesai" olarak eklenir ve aylık çalışma özetinizde gösterilir.' }
        ]
    },
    {
        id: 'yemek-siparisi',
        title: 'Yemek Siparişi',
        icon: Utensils,
        description: 'Günlük yemek siparişi verme ve geçmiş siparişler',
        permission: 'PAGE_MEAL_ORDERS',
        link: '/meal-orders',
        steps: [
            {
                title: 'Sipariş Verme',
                description: 'Yemek Siparişi sayfasında bugünün menüsünü görüntüleyin. İstediğiniz öğünü seçin ve "Sipariş Ver" butonuna tıklayın.'
            },
            {
                title: 'Sipariş Saatleri',
                description: 'Yemek siparişleri belirli saatlerde açık olur. Sipariş saati geçtikten sonra yeni sipariş veremez veya mevcut siparişi değiştiremezsiniz.'
            },
            {
                title: 'Geçmiş Siparişler',
                description: 'Sayfanın alt kısmında geçmiş siparişlerinizi görüntüleyebilirsiniz. Tarih aralığına göre filtreleme yapabilirsiniz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sipariş kapanış saatinden önce siparişinizi vermeyi unutmayın. Kapandıktan sonra değişiklik yapılamaz.' },
            { type: 'info', text: 'Yemek siparişi vermek için özel yetki gerekir. Bu bölümü göremiyorsanız yöneticinize başvurun.' }
        ],
        faq: [
            { q: 'Sipariş verdikten sonra değiştirebilir miyim?', a: 'Sipariş kapanış saatine kadar siparişinizi değiştirebilir veya iptal edebilirsiniz.' },
            { q: 'Yemek siparişi sayfasını göremiyorum', a: 'Yemek siparişi sayfası için PAGE_MEAL_ORDERS yetkisi gereklidir. Sistem yöneticinize başvurun.' }
        ]
    },
    {
        id: 'takvim',
        title: 'Takvim',
        icon: Calendar,
        description: 'Puantaj takvimi, renk kodları ve devamsızlık görüntüleme',
        permission: null,
        link: '/calendar',
        steps: [
            {
                title: 'Aylık Görünüm',
                description: 'Takvim sayfasında ay görünümünde çalışma günlerinizi görebilirsiniz. Her gün renk koduyla durumunu gösterir.'
            },
            {
                title: 'Renk Kodları',
                description: 'Yeşil = normal çalışma, Turuncu = izinli, Kırmızı = devamsız, Mavi = açık kayıt, Mor = ek mesai tespit edildi.'
            },
            {
                title: 'Gün Detayı',
                description: 'Herhangi bir güne tıklayarak o günün detaylı kayıtlarını görüntüleyebilirsiniz: giriş/çıkış saatleri, mola, mesai durumu.'
            }
        ],
        tips: [
            { type: 'info', text: 'Takvimde mali dönem sınırları belirgindir. Her dönem genellikle ayın 26\'sından sonraki ayın 25\'ine kadardır.' },
            { type: 'success', text: 'Takvim görünümünü değiştirerek haftalık veya günlük görünüme geçebilirsiniz.' }
        ],
        faq: [
            { q: 'Takvimde kırmızı gün ne anlama geliyor?', a: 'Kırmızı renk devamsızlık anlamına gelir. O gün için kayıt girilmemiş veya çalışma yapılmamıştır.' },
            { q: 'Geçmiş ayları görebilir miyim?', a: 'Evet, takvimde ileri-geri ok butonlarıyla istediğiniz aya geçebilirsiniz.' }
        ]
    },
    {
        id: 'sirket-rehberi',
        title: 'Şirket Rehberi',
        icon: Contact,
        description: 'Çalışan arama, iletişim bilgileri ve departman yapısı',
        permission: null,
        link: '/company-directory',
        steps: [
            {
                title: 'Çalışan Arama',
                description: 'Arama kutusuna isim, soyisim veya departman adı yazarak çalışan arayabilirsiniz. Sonuçlar anlık olarak filtrelenir.'
            },
            {
                title: 'Departman Filtresi',
                description: 'Sol taraftaki departman filtresini kullanarak belirli bir departmandaki çalışanları listeleyebilirsiniz.'
            },
            {
                title: 'Çalışan Durumu',
                description: 'Her çalışanın yanında durum göstergesi bulunur: yeşil = ofiste, turuncu = izinde, gri = dışarıda.'
            }
        ],
        tips: [
            { type: 'info', text: 'Grid ve liste görünümü arasında geçiş yapabilirsiniz. Grid görünümünde fotoğraflar daha büyük gösterilir.' }
        ],
        faq: [
            { q: 'Çalışanın telefon numarasını göremiyorum', a: 'İletişim bilgileri çalışanın profil ayarlarına bağlıdır. Bilgi girilmemişse görünmez.' }
        ]
    },
    {
        id: 'onay-surecleri',
        title: 'Onay Süreçleri',
        icon: CheckSquare,
        description: 'Talep onaylama, reddetme ve yönetici işlemleri',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE', 'APPROVAL_CARDLESS_ENTRY'],
        link: '/requests',
        steps: [
            {
                title: 'Bekleyen Talepler',
                description: 'Ana sayfada veya Talepler sayfasında bekleyen onaylarınızı görebilirsiniz. Bildirim zili simgesinde bekleyen sayısı gösterilir.'
            },
            {
                title: 'Talep İnceleme',
                description: 'Talep detayına tıklayarak çalışanın bilgilerini, talep gerekçesini ve ilgili puantaj kayıtlarını inceleyebilirsiniz.'
            },
            {
                title: 'Onay / Red',
                description: '"Onayla" veya "Reddet" butonlarına tıklayın. Reddetme durumunda gerekçe yazmanız istenir. İşlem sonrası çalışana bildirim gider.'
            },
            {
                title: 'Toplu Onay',
                description: 'Birden fazla talebi seçerek toplu onay verebilirsiniz. Bu özellik özellikle ek mesai onaylarında zaman kazandırır.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Onayladığınız talepler geri alınamaz. Lütfen onaylamadan önce detayları dikkatlice inceleyin.' },
            { type: 'info', text: 'Vekalet sistemi aktifse, yerinize başka bir yönetici de onay verebilir.' },
            { type: 'success', text: 'Bildirimlerden doğrudan talep detayına gidebilirsiniz — ayrıca Talepler sayfasına girmenize gerek yok.' }
        ],
        faq: [
            { q: 'Bekleyen onayım var ama göremiyorum', a: 'Onay yetkinizin doğru tanımlandığından emin olun. APPROVAL_OVERTIME, APPROVAL_LEAVE veya APPROVAL_CARDLESS_ENTRY yetkilerinden birine sahip olmanız gerekir.' },
            { q: 'Yanlışlıkla onay verdim, geri alabilir miyim?', a: 'Onaylanan talepler doğrudan geri alınamaz. Sistem yöneticinize başvurmanız gerekir.' }
        ]
    },
    {
        id: 'raporlar',
        title: 'Raporlar',
        icon: BarChart3,
        description: 'Puantaj raporları, analitik ve veri dışa aktarma',
        permission: 'PAGE_REPORTS',
        link: '/reports',
        steps: [
            {
                title: 'Rapor Türleri',
                description: 'Raporlar sayfasında çeşitli rapor türleri mevcuttur: Puantaj Raporu, Mesai Raporu, İzin Raporu, Devamsızlık Raporu.'
            },
            {
                title: 'Filtreleme',
                description: 'Tarih aralığı, departman, çalışan ve durum filtrelerini kullanarak raporunuzu özelleştirin.'
            },
            {
                title: 'Dışa Aktarma',
                description: 'Raporları Excel veya PDF formatında indirebilirsiniz. İndirme butonu rapor tablosunun üst kısmında bulunur.'
            },
            {
                title: 'Talep Analizleri',
                description: 'Talep Analizleri sayfasında KPI kartları, aylık trendler, departman bazlı dağılımlar ve korelasyon grafikleri mevcuttur.'
            }
        ],
        tips: [
            { type: 'info', text: 'Mali dönem bazlı raporlar 26-25 döngüsünü takip eder. Örneğin "Şubat dönemi" = 26 Ocak - 25 Şubat.' },
            { type: 'success', text: 'Grafikler üzerinde fare ile gezinerek detaylı verileri görebilirsiniz.' }
        ],
        faq: [
            { q: 'Rapor sayfasını göremiyorum', a: 'Rapor sayfası PAGE_REPORTS yetkisi gerektirir. Sistem yöneticinize başvurun.' },
            { q: 'Raporlardaki veriler gerçek zamanlı mı?', a: 'Raporlar sayfa yüklendiğinde güncel veriyi çeker. Canlı güncelleme yoktur, sayfayı yenileyerek son verileri alabilirsiniz.' }
        ]
    },
    {
        id: 'calisma-programlari',
        title: 'Çalışma Programları',
        icon: CalendarRange,
        description: 'Vardiya tanımları, takvim şablonları ve program yönetimi',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/work-schedules',
        steps: [
            {
                title: 'Vardiya Şablonları',
                description: 'Mevcut vardiya şablonlarını görüntüleyin. Her şablon haftalık çalışma saatlerini, mola sürelerini ve tatil günlerini tanımlar.'
            },
            {
                title: 'Mali Takvim',
                description: 'Mali takvimler dönemsel çalışma programlarını yönetir. Her dönem için farklı şablon atanabilir.'
            },
            {
                title: 'Günlük Değişiklikler',
                description: 'Belirli günler için özel çalışma saatleri tanımlayabilirsiniz. Örneğin: yarım gün, vardiya değişikliği.'
            },
            {
                title: 'Çalışana Atama',
                description: 'Çalışanlar sayfasından bir çalışanın profiline giderek çalışma programı ataması yapabilirsiniz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışma programı değişiklikleri tüm ilişkili puantaj kayıtlarının yeniden hesaplanmasını tetikler. Bu işlem büyük kadrolarda zaman alabilir.' },
            { type: 'info', text: 'Program hiyerarşisi: Mali Takvim > Şablon > Gün Ataması > Günlük Değişiklik. En spesifik tanım geçerlidir.' }
        ],
        faq: [
            { q: 'Yeni vardiya şablonu nasıl oluştururum?', a: 'Çalışma Programları sayfasında "Yeni Şablon" butonuna tıklayın. Her gün için başlangıç-bitiş saatleri, mola süresi ve tatil durumunu tanımlayın.' },
            { q: 'Bir çalışanın programını değiştirince eski kayıtlar etkilenir mi?', a: 'Değişiklik ileriye dönük uygulanır. Geçmiş kayıtlar etkilenmez. Geçmişi düzeltmek için yeniden hesaplama gerekir.' }
        ]
    },
    {
        id: 'sistem-yonetimi',
        title: 'Sistem Yönetimi',
        icon: Shield,
        description: 'Admin araçları, sağlık kontrolleri ve veri yönetimi',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/system-health',
        steps: [
            {
                title: 'Sistem Sağlığı',
                description: 'Sistem Sağlığı sayfasında Dashboard, RBAC Denetimi, Puantaj Denetimi ve Spec Testleri sekmelerini bulabilirsiniz.'
            },
            {
                title: 'RBAC Denetimi',
                description: 'Rol ve yetki yapısını kontrol edin. Çalışanların yetkileri, rol atamaları ve yetki çakışmalarını görüntüleyin.'
            },
            {
                title: 'Puantaj Denetimi',
                description: 'Tüm çalışanların puantaj hesaplamalarını doğrulayın. Mola, mesai ve devamsızlık hesaplamalarını kontrol edin.'
            },
            {
                title: 'Veri Yönetimi',
                description: 'Veri Yönetimi sayfasında dışa aktarma (JSON/CSV) ve içe aktarma işlemleri yapabilirsiniz. Dry-run modu ile önce simülasyon çalıştırabilirsiniz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sistem yönetimi araçları kritik işlemler içerir. İçe aktarma işlemlerinden önce mutlaka dry-run yapın.' },
            { type: 'info', text: 'Spec testleri 9 aşamada 443 testi otomatik çalıştırır. Tüm testler geçmelidir.' },
            { type: 'success', text: 'Dashboard\'da canlı sistem metrikleri gösterilir: çalışan sayısı, aktif mesai, devamsızlık oranı.' }
        ],
        faq: [
            { q: 'Sistem sağlığı sayfasını göremiyorum', a: 'Bu sayfa PAGE_SYSTEM_HEALTH yetkisi gerektirir. Sadece sistem yöneticileri erişebilir.' },
            { q: 'Test başarısız olursa ne yapmalıyım?', a: 'Başarısız testlerin detayına tıklayarak sorunun açıklamasını görün. Genellikle eksik konfigürasyon veya veri tutarsızlığından kaynaklanır.' }
        ]
    }
];

export default helpContent;
