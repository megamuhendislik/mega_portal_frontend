import {
    Clock, CalendarDays, Timer, Utensils, Calendar,
    Contact, CheckSquare, BarChart3, CalendarRange, Shield,
    Users, Network, Server, Database, Package,
    MessageSquare, UserCheck
} from 'lucide-react';

const helpContent = [
    {
        id: 'giris-cikis',
        title: 'Giriş / Çıkış',
        icon: Clock,
        description: 'Kart okutma ile giriş/çıkış ve canlı durum takibi',
        permission: null,
        link: '/',
        images: [
            { src: '/help-images/anasayfa.png', caption: 'Ana sayfa — çalışma süresi, kalan mola ve fazla mesai bilgi kutuları' },
            { src: '/help-images/mesai-takibi.png', caption: 'Mesai Takibi — günlük giriş/çıkış kayıtları ve detaylar' },
            { src: '/help-images/admin-anasayfa.png', caption: 'Yönetici Ana Sayfası — puantaj grafikleri ve aylık performans özeti' }
        ],
        steps: [
            {
                title: 'Giriş Yapma (Kart Okutma)',
                description: 'İşe geldiğinizde kartınızı kart okuyucuya okutun. Sistem giriş saatinizi otomatik olarak kaydeder ve mesainiz başlar.'
            },
            {
                title: 'Canlı Durum Takibi',
                description: 'Ana sayfadaki 3 bilgi kutusunda (Çalışma Süresi, Kalan Mola, Fazla Mesai) anlık durumunuzu görebilirsiniz. Veriler 30 saniyede bir güncellenir.'
            },
            {
                title: 'Çıkış Yapma',
                description: 'Mesai bitiminde kartınızı tekrar okutun. Sistem çıkış saatinizi kaydeder ve çalışma sürenizi otomatik hesaplar.'
            },
            {
                title: 'Mola Takibi',
                description: 'Üst menüdeki kahve simgesinde mola sürenizi görebilirsiniz. Mavi = normal, turuncu = %80 doldu, kırmızı = süre aşıldı. Çıkış yapıp tekrar giriş yaptığınızda aradaki süre mola sayılır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Vardiya başlangıcından 5 dakika önce kart okutursanız, giriş saatiniz vardiya başlangıcına yuvarlanır (tolerans süresi).' },
            { type: 'warning', text: 'Çıkış yapmadan (kart okutmadan) ayrılırsanız, gece yarısı sistemi otomatik olarak mesainizi kapatır.' },
            { type: 'success', text: 'Kart okutucu arızalıysa veya kartınızı unuttaysanız "Kartsız Giriş Talebi" oluşturabilirsiniz. Bu talep yöneticinizin onayına gider.' }
        ],
        faq: [
            { q: 'Kart okutmayı unuttum, ne yapmalıyım?', a: 'Talepler sayfasından "Kartsız Giriş Talebi" oluşturabilirsiniz. Giriş ve çıkış saatlerinizi belirtin, yöneticiniz onayladığında puantaj kaydınız oluşturulur.' },
            { q: 'Gece vardiyasında çalışıyorum, kayıtlarım nasıl hesaplanır?', a: 'Gece vardiyası özelliği aktifse, gece yarısını geçen kayıtlar otomatik olarak bölünür. Her gün için ayrı puantaj kaydı oluşturulur.' },
            { q: 'Mola sürem neden azalıyor?', a: 'Çıkış yapıp tekrar giriş yaptığınızda (kart okutma arası) aradaki süre mola olarak sayılır. Toplam mola hakkınız (genellikle 30 dk) dahilinde takip edilir.' },
            { q: 'Birden fazla giriş/çıkış kaydım var, bu normal mi?', a: 'Evet. Gün içinde her kart okutma bir giriş veya çıkış olarak kaydedilir. Sistem tüm kayıtları birleştirerek toplam çalışma sürenizi hesaplar.' }
        ]
    },
    {
        id: 'izin-talepleri',
        title: 'İzin Talepleri',
        icon: CalendarDays,
        description: 'Yıllık izin, avans izin başvurusu ve izin bakiyesi takibi',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/talepler-izin.png', caption: 'Taleplerim sekmesi — izin, mesai, yemek ve kartsız giriş talepleri tek ekranda' }
        ],
        steps: [
            {
                title: 'İzin Bakiyesi Kontrolü',
                description: 'Talepler sayfasında izin bakiyenizi görebilirsiniz. Yıllık hak edişiniz, kullanılan ve kalan gün sayınız görüntülenir.'
            },
            {
                title: 'Yeni İzin Talebi Oluşturma',
                description: 'Talepler sayfasında "Yeni İzin Talebi" düğmesine tıklayın. İzin türünü, başlangıç ve bitiş tarihlerini seçin. Gerekirse açıklama ekleyin.'
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
            { type: 'info', text: 'İzinler "ilk hak edilen ilk düşülür" yöntemiyle hesaplanır — en eski hak edişten başlayarak düşülür.' },
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
        images: [
            { src: '/help-images/talepler-ek-mesai.png', caption: 'Ek Mesai sekmesi — planlı, algılanan ve manuel mesai girişleri' }
        ],
        steps: [
            {
                title: 'Mesai Türlerini Anlama',
                description: 'Sistem 3 tür ek mesai tanır: Planlı Mesai (yönetici ataması), Algılanan Mesai (otomatik tespit), Elle Giriş (sizin bildirdiğiniz).'
            },
            {
                title: 'Planlı Mesai (Atama)',
                description: 'Yöneticiniz size mesai ataması yapar. Talepler sayfasında "Atanan Mesailer" bölümünde görünür. "Talep Et" düğmesine tıklayarak onay sürecini başlatın.'
            },
            {
                title: 'Algılanan Mesai (Potansiyel)',
                description: 'Vardiya saatinizi aştığınızda sistem otomatik "Potansiyel Mesai" oluşturur. Talepler sayfasında bu mesaileri görebilir ve talep edebilirsiniz.'
            },
            {
                title: 'Elle Mesai Girişi',
                description: 'Geçmiş bir tarih için mesai talebi oluşturmak isterseniz "Elle Giriş" formunu kullanın. Tarih, saat ve açıklama girin.'
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
            { q: 'Potansiyel mesai ile bekleyen mesai arasındaki fark nedir?', a: 'Potansiyel mesai henüz taslak halindedir — sistem otomatik algılamıştır ama siz henüz talep etmediniz. "Talep Et" düğmesine bastığınızda "Bekleyen" durumuna geçer ve yönetici onayına gider.' },
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
        images: [
            { src: '/help-images/admin-yemek-siparis.png', caption: 'Yemek Sipariş Yönetimi — günlük talep ve sipariş durumu' }
        ],
        steps: [
            {
                title: 'Sipariş Verme',
                description: 'Yemek Siparişi sayfasında bugünün menüsünü görüntüleyin. İstediğiniz öğünü seçin ve "Sipariş Ver" düğmesine tıklayın.'
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
            { type: 'info', text: 'Yemek siparişi vermek için özel yetki gerekir. Bu sayfayı göremiyorsanız yöneticinize başvurun.' }
        ],
        faq: [
            { q: 'Sipariş verdikten sonra değiştirebilir miyim?', a: 'Sipariş kapanış saatine kadar siparişinizi değiştirebilir veya iptal edebilirsiniz.' },
            { q: 'Yemek siparişi sayfasını göremiyorum', a: 'Bu sayfa için özel yetki gereklidir. Sistem yöneticinize veya İK birimine başvurun.' }
        ]
    },
    {
        id: 'takvim',
        title: 'Takvim',
        icon: Calendar,
        description: 'Puantaj takvimi, renk kodları ve devamsızlık görüntüleme',
        permission: null,
        link: '/calendar',
        images: [
            { src: '/help-images/takvim.png', caption: 'Takvim — yıllık görünüm, renk kodları ve etkinlik kategorileri' }
        ],
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
            { q: 'Geçmiş ayları görebilir miyim?', a: 'Evet, takvimde ileri-geri ok düğmeleriyle istediğiniz aya geçebilirsiniz.' }
        ]
    },
    {
        id: 'sirket-rehberi',
        title: 'Şirket Rehberi',
        icon: Contact,
        description: 'Çalışan arama, iletişim bilgileri ve departman yapısı',
        permission: null,
        link: '/company-directory',
        images: [
            { src: '/help-images/sirket-rehberi.png', caption: 'Şirket Rehberi — çalışan kartları, durum göstergesi ve departman filtresi' }
        ],
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
            { type: 'info', text: 'Kart ve liste görünümü arasında geçiş yapabilirsiniz. Kart görünümünde fotoğraflar daha büyük gösterilir.' }
        ],
        faq: [
            { q: 'Çalışanın telefon numarasını göremiyorum', a: 'İletişim bilgileri çalışanın profil ayarlarına bağlıdır. Bilgi girilmemişse görünmez.' }
        ]
    },
    {
        id: 'dilek-sikayetler',
        title: 'Dilek ve Şikayetler',
        icon: MessageSquare,
        description: 'Geri bildirim gönderme, takip etme ve yönetim paneli',
        permission: null,
        link: '/feedback',
        images: [
            { src: '/help-images/dilek-sikayetler.png', caption: 'Dilek ve Şikayetler — geri bildirim formu, durum takibi ve yönetim sekmesi' }
        ],
        steps: [
            {
                title: 'Yeni Geri Bildirim Oluşturma',
                description: '"Yeni Geri Bildirim" düğmesine tıklayarak dilek, şikayet veya önerinizi yazın. Konu başlığı ve detaylı açıklama girin.'
            },
            {
                title: 'Durum Takibi',
                description: 'Gönderdiğiniz geri bildirimlerin durumunu "Geri Bildirimlerim" sekmesinde takip edebilirsiniz. Toplam, beklemede, cevaplanan ve okunmamış cevap sayıları üst kartlarda görünür.'
            },
            {
                title: 'Cevap Okuma',
                description: 'Yöneticiniz veya İK birimi geri bildiriminize cevap verdiğinde bildirim alırsınız. "Okunmamış Cevap" sayacından yeni cevapları görebilirsiniz.'
            },
            {
                title: 'Yönetim Paneli',
                description: 'Yönetici yetkisi olanlar "Yönetim" sekmesinden tüm çalışan geri bildirimlerini görebilir ve yanıtlayabilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Geri bildirimleriniz yalnızca yetkili yöneticiler tarafından görüntülenebilir. Diğer çalışanlar göremez.' },
            { type: 'success', text: 'Arama kutusunu kullanarak eski geri bildirimlerinizi hızlıca bulabilirsiniz.' }
        ],
        faq: [
            { q: 'Geri bildirimim kim tarafından görülüyor?', a: 'Geri bildirimleriniz sistem yöneticileri ve İK yetkililileri tarafından görüntülenir. Diğer çalışanlar erişemez.' },
            { q: 'Gönderdiğim geri bildirimi silebilir miyim?', a: 'Beklemede olan geri bildirimleri düzenleyebilirsiniz. Yanıtlanmış olanlar değiştirilemez.' }
        ]
    },
    {
        id: 'vekalet-yonetimi',
        title: 'Vekalet Yönetimi',
        icon: UserCheck,
        description: 'Yönetici vekalet tanımlama, vekil olma ve süre takibi',
        permission: null,
        link: '/substitute-management',
        images: [
            { src: '/help-images/vekalet-yonetimi.png', caption: 'Vekalet Yönetimi — aktif/gelecek/süresi dolmuş vekaletler ve vekil atama' }
        ],
        steps: [
            {
                title: 'Yeni Vekalet Tanımlama',
                description: '"Yeni Vekalet" düğmesine tıklayarak bir vekil belirleyin. Başlangıç ve bitiş tarihlerini, vekalet kapsamını (izin onayı, mesai onayı vb.) seçin.'
            },
            {
                title: 'Vekalet Durumu',
                description: 'Özet kartlarında aktif, gelecek, süresi dolmuş ve toplam vekalet sayılarını görebilirsiniz.'
            },
            {
                title: 'Verdiğim Vekaletler',
                description: '"Verdiğim / Tüm Vekaletler" sekmesinde oluşturduğunuz vekaletleri listeleyin ve yönetin.'
            },
            {
                title: 'Vekil Olduğum',
                description: '"Vekil Olduğum" sekmesinde size verilen vekalet yetkilerini görüntüleyin. Vekalet süresi boyunca atanan kişi adına onay işlemleri yapabilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Vekalet süresi dolduğunda yetkiler otomatik olarak geri alınır. Manuel işlem gerekmez.' },
            { type: 'warning', text: 'Vekalet verdiğiniz kişi, sizin adınıza onay/red işlemi yapabilir. Güvendiğiniz kişileri seçin.' },
            { type: 'success', text: 'İzne çıkmadan önce vekalet tanımlayarak ekibinizin talep onay süreçlerinin aksamasını önleyin.' }
        ],
        faq: [
            { q: 'Vekalet süresini uzatabilir miyim?', a: 'Mevcut vekaleti düzenleyerek bitiş tarihini değiştirebilirsiniz.' },
            { q: 'Birden fazla kişiye vekalet verebilir miyim?', a: 'Evet, farklı kapsamlarda birden fazla vekalet tanımlayabilirsiniz.' }
        ]
    },
    {
        id: 'onay-surecleri',
        title: 'Onay Süreçleri',
        icon: CheckSquare,
        description: 'Talep onaylama, reddetme ve yönetici işlemleri',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE', 'APPROVAL_CARDLESS_ENTRY'],
        link: '/requests',
        images: [
            { src: '/help-images/talepler-ekip.png', caption: 'Ekip Talepleri sekmesi — çalışan filtresi, tür ve durum bazlı onay yönetimi' }
        ],
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
                description: '"Onayla" veya "Reddet" düğmelerine tıklayın. Reddetme durumunda gerekçe yazmanız istenir. İşlem sonrası çalışana bildirim gider.'
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
            { q: 'Bekleyen onayım var ama göremiyorum', a: 'Onay yetkinizin doğru tanımlandığından emin olun. Mesai onaylama, izin onaylama veya kartsız giriş onaylama yetkilerinden birine sahip olmanız gerekir.' },
            { q: 'Yanlışlıkla onay verdim, geri alabilir miyim?', a: 'Onaylanan talepler doğrudan geri alınamaz. Sistem yöneticinize başvurmanız gerekir.' }
        ]
    },
    {
        id: 'raporlar',
        title: 'Raporlar',
        icon: BarChart3,
        description: 'Puantaj raporları, çözümleme ve veri dışa aktarma',
        permission: 'PAGE_REPORTS',
        link: '/reports',
        images: [
            { src: '/help-images/admin-raporlar.png', caption: 'Raporlar — mali dönem seçimi, personel filtresi ve Excel/PDF dışa aktarma' }
        ],
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
                description: 'Raporları Excel veya PDF olarak indirebilirsiniz. İndirme düğmesi rapor tablosunun üst kısmında bulunur.'
            },
            {
                title: 'Talep Çözümlemeleri',
                description: 'Talep Analizleri sayfasında özet göstergeler, aylık eğilimler, departman bazlı dağılımlar ve ilişki grafikleri mevcuttur.'
            }
        ],
        tips: [
            { type: 'info', text: 'Mali dönem bazlı raporlar 26-25 döngüsünü takip eder. Örneğin "Şubat dönemi" = 26 Ocak - 25 Şubat.' },
            { type: 'success', text: 'Grafikler üzerinde fare ile gezinerek detaylı verileri görebilirsiniz.' }
        ],
        faq: [
            { q: 'Rapor sayfasını göremiyorum', a: 'Bu sayfa için rapor görüntüleme yetkisi gereklidir. Sistem yöneticinize başvurun.' },
            { q: 'Raporlardaki veriler anlık mı?', a: 'Raporlar sayfa yüklendiğinde güncel veriyi çeker. Otomatik güncelleme yoktur, sayfayı yenileyerek son verileri alabilirsiniz.' }
        ]
    },
    {
        id: 'calisma-programlari',
        title: 'Çalışma Programları',
        icon: CalendarRange,
        description: 'Vardiya tanımları, takvim şablonları ve program yönetimi',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/work-schedules',
        images: [
            { src: '/help-images/admin-calisma-takvimleri.png', caption: 'Mali Takvim Yönetimi — şablonlar, haftalık program ve mola ayarları' }
        ],
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
            { type: 'info', text: 'Program öncelik sırası: Mali Takvim > Şablon > Gün Ataması > Günlük Değişiklik. En özel tanım geçerlidir.' }
        ],
        faq: [
            { q: 'Yeni vardiya şablonu nasıl oluştururum?', a: 'Çalışma Programları sayfasında "Yeni Şablon" düğmesine tıklayın. Her gün için başlangıç-bitiş saatleri, mola süresi ve tatil durumunu tanımlayın.' },
            { q: 'Bir çalışanın programını değiştirince eski kayıtlar etkilenir mi?', a: 'Değişiklik ileriye dönük uygulanır. Geçmiş kayıtlar etkilenmez. Geçmişi düzeltmek için yeniden hesaplama gerekir.' }
        ]
    },
    {
        id: 'sistem-yonetimi',
        title: 'Sistem Yönetimi',
        icon: Shield,
        description: 'Yönetici araçları, sağlık kontrolleri ve veri yönetimi',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/system-health',
        images: [
            { src: '/help-images/admin-sistem-sagligi.png', caption: 'Sistem Kontrol Merkezi — durum panosu, sağlık kontrolleri ve denetim araçları' }
        ],
        steps: [
            {
                title: 'Sistem Sağlığı',
                description: 'Sistem Sağlığı sayfasında Gösterge Paneli, Yetki Denetimi, Puantaj Denetimi ve Uyumluluk Testleri sekmelerini bulabilirsiniz.'
            },
            {
                title: 'Yetki Denetimi',
                description: 'Rol ve yetki yapısını kontrol edin. Çalışanların yetkileri, rol atamaları ve yetki çakışmalarını görüntüleyin.'
            },
            {
                title: 'Puantaj Denetimi',
                description: 'Tüm çalışanların puantaj hesaplamalarını doğrulayın. Mola, mesai ve devamsızlık hesaplamalarını kontrol edin.'
            },
            {
                title: 'Veri Yönetimi',
                description: 'Veri Yönetimi sayfasında dışa aktarma (JSON/CSV) ve içe aktarma işlemleri yapabilirsiniz. Deneme modu ile önce simülasyon çalıştırabilirsiniz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sistem yönetimi araçları kritik işlemler içerir. İçe aktarma işlemlerinden önce mutlaka deneme modunu çalıştırın.' },
            { type: 'info', text: 'Uyumluluk testleri 9 aşamada 443 testi otomatik çalıştırır. Tüm testler geçmelidir.' },
            { type: 'success', text: 'Gösterge panelinde canlı sistem ölçümleri gösterilir: çalışan sayısı, aktif mesai, devamsızlık oranı.' }
        ],
        faq: [
            { q: 'Sistem sağlığı sayfasını göremiyorum', a: 'Bu sayfa için sistem yönetimi yetkisi gereklidir. Sadece sistem yöneticileri erişebilir.' },
            { q: 'Test başarısız olursa ne yapmalıyım?', a: 'Başarısız testlerin detayına tıklayarak sorunun açıklamasını görün. Genellikle eksik ayar veya veri tutarsızlığından kaynaklanır.' }
        ]
    },
    {
        id: 'calisanlar',
        title: 'Çalışan Yönetimi',
        icon: Users,
        description: 'Çalışan listesi, profil düzenleme, rol ve yetki atamaları',
        permission: 'PAGE_EMPLOYEES',
        link: '/employees',
        images: [
            { src: '/help-images/admin-calisanlar.png', caption: 'Çalışanlar — personel listesi, departman filtresi ve durum göstergeleri' }
        ],
        steps: [
            {
                title: 'Çalışan Listesi',
                description: 'Çalışanlar sayfasında tüm personeli listeleyebilirsiniz. İsim, departman, unvan ve duruma göre arama ve filtreleme yapabilirsiniz.'
            },
            {
                title: 'Çalışan Detayı',
                description: 'Herhangi bir çalışana tıklayarak detay sayfasını açın. Kişisel bilgiler, iletişim, departman, pozisyon ve çalışma programı bilgilerini görüntüleyip düzenleyebilirsiniz.'
            },
            {
                title: 'Rol ve Yetki Atama',
                description: 'Çalışan detay sayfasında "Roller" bölümünden çalışana rol atayabilirsiniz. Roller yetki paketleri içerir ve çalışanın sistemde neler yapabileceğini belirler.'
            },
            {
                title: 'Yönetici Atama',
                description: 'Çalışanın birincil (doğrudan) ve çapraz (fonksiyonel) yöneticilerini atayabilirsiniz. Bu atamalar onay süreçlerinde kimin onay vereceğini belirler.'
            },
            {
                title: 'Çalışma Programı Atama',
                description: 'Çalışana mali takvim ve vardiya şablonu atayarak çalışma saatlerini tanımlayın. Bu tanım puantaj hesaplamalarının temelini oluşturur.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışan silme işlemi geri alınamaz. Ayrılan personeli "Pasif" durumuna geçirmeniz önerilir.' },
            { type: 'info', text: 'Çalışanın departman veya pozisyon değişikliği, mali takvim atamasından otomatik türetilebilir.' },
            { type: 'success', text: 'Çalışan listesini Excel olarak dışa aktarabilirsiniz.' }
        ],
        faq: [
            { q: 'Yeni çalışan nasıl eklenir?', a: '"Yeni Çalışan" düğmesine tıklayın. İsim, e-posta, departman ve pozisyon bilgilerini girin. Kayıt sonrası çalışana otomatik kullanıcı hesabı oluşturulur.' },
            { q: 'Çalışanın yetkilerini nasıl kontrol ederim?', a: 'Çalışan detay sayfasında "Roller" bölümünde atanmış rolleri ve bu rollerin verdiği yetkileri görebilirsiniz.' },
            { q: 'Bir çalışanın birden fazla yöneticisi olabilir mi?', a: 'Evet. Birincil yönetici (doğrudan amiri) ve çapraz yönetici (proje bazlı) atanabilir. Onay süreçlerinde her ikisi de yetkilidir.' }
        ]
    },
    {
        id: 'organizasyon-semasi',
        title: 'Organizasyon Şeması',
        icon: Network,
        description: 'Şirket hiyerarşisi, departman yapısı ve raporlama zincirleri',
        permission: 'PAGE_ORG_CHART',
        link: '/organization-chart',
        images: [
            { src: '/help-images/admin-organizasyon.png', caption: 'Organizasyon Şeması — departman hiyerarşisi ve çalışan ağacı görünümü' }
        ],
        steps: [
            {
                title: 'Organizasyon Görünümü',
                description: 'Organizasyon Şeması sayfasında şirketin departman yapısını ağaç görünümünde inceleyebilirsiniz. Her düğüm bir departmanı veya çalışanı temsil eder.'
            },
            {
                title: 'Departman Detayı',
                description: 'Bir departmana tıklayarak o departmandaki çalışanları, yöneticileri ve alt departmanları görebilirsiniz.'
            },
            {
                title: 'Raporlama Zinciri',
                description: 'Her çalışanın üstünde birincil yöneticisi gösterilir. Bu hiyerarşi onay süreçlerinde, izin ve mesai taleplerinde kullanılır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Organizasyon şeması çalışan ve departman verilerinden otomatik oluşturulur. Güncellemek için çalışan profillerini düzenleyin.' },
            { type: 'success', text: 'Şemayı yakınlaştırıp uzaklaştırabilir ve sürükleyerek gezebilirsiniz.' }
        ],
        faq: [
            { q: 'Organizasyon şeması nasıl güncellenir?', a: 'Şema otomatik olarak çalışan profillerinden ve departman atamalarından üretilir. Bir çalışanın departmanını veya yöneticisini değiştirdiğinizde şema da güncellenir.' },
            { q: 'Bir departmanın altına yeni birim nasıl eklenir?', a: 'Veri Yönetimi veya Django admin panelinden yeni departman oluşturun ve üst departmanını belirtin.' }
        ]
    },
    {
        id: 'servis-yonetimi',
        title: 'Servis Yönetimi',
        icon: Server,
        description: 'Puantaj hesaplama servisi, günlük tetikleme ve canlı loglar',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/service-control',
        images: [
            { src: '/help-images/admin-servis-yonetimi.png', caption: 'Servis Yönetimi — günlük hesaplama tetikleme, sistem durumu ve canlı loglar' }
        ],
        steps: [
            {
                title: 'Günlük Hesaplama Tetikleme',
                description: 'Hedef tarih seçerek o gün için tüm çalışanların giriş/çıkış, mola ve fazla mesai hesaplamalarını yeniden başlatabilirsiniz. Manuel düzeltmelerden sonra kullanışlıdır.'
            },
            {
                title: 'Sistem Durumu',
                description: 'Sağ panelde servis durumunu görebilirsiniz. Canlı güncelleme 30 saniyede bir, gece görevleri 00:01\'de otomatik çalışır.'
            },
            {
                title: 'Canlı Servis Logları',
                description: 'Sayfanın alt kısmında son 100 servis işleminin detaylı loglarını izleyebilirsiniz. Her log satırında zaman, seviye, modül ve mesaj bilgileri yer alır.'
            },
            {
                title: 'Hızlı Bağlantılar',
                description: 'Sistem Kontrol Merkezi ve Canlı Durum Paneli sayfalarına doğrudan erişim bağlantıları mevcuttur.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Hesaplama tetikleme çalışan sayısına bağlı olarak birkaç saniye sürebilir. İşlem sırasında sistem yavaşlayabilir.' },
            { type: 'info', text: 'Otomatik hesaplama zaten her 30 saniyede bir çalışır. Manuel tetiklemeye yalnızca düzeltme sonrası ihtiyaç duyulur.' },
            { type: 'success', text: 'Loglar otomatik olarak yenilenir. Sayfada kaldığınız sürece canlı güncellemeleri takip edebilirsiniz.' }
        ],
        faq: [
            { q: 'Hesaplama tetikledim ama kayıtlar değişmedi', a: 'Hesaplama mevcut giriş/çıkış verilerine göre yapılır. Veri yoksa veya hatalıysa önce kayıtları düzeltin, sonra yeniden tetikleyin.' },
            { q: 'Gece görevi (00:01) ne yapar?', a: 'Gece görevi açık kalan mesaileri kapatır, gece yarısını geçen kayıtları böler ve devamsızlık kayıtlarını oluşturur.' }
        ]
    },
    {
        id: 'veri-yonetimi',
        title: 'Veri Yönetimi',
        icon: Database,
        description: 'Yıllık matris, veri yedekleme, dışa/içe aktarma işlemleri',
        permission: 'PAGE_DATA_MANAGEMENT',
        link: '/system-data-management',
        images: [
            { src: '/help-images/admin-veri-yonetimi.png', caption: 'Veri Yönetimi — yıllık personel matrisi ve aylık çalışma bakiyeleri' }
        ],
        steps: [
            {
                title: 'Yıllık Personel Matrisi',
                description: 'Tüm çalışanların aylık çalışma bakiyelerini tek tabloda görüntüleyin. Her hücrede o ay için net bakiye (fazla/eksik saat) gösterilir.'
            },
            {
                title: 'Yıl ve Arama Filtresi',
                description: 'Yıl seçiciyle farklı yılları görebilirsiniz. Arama kutusuyla belirli bir çalışanı filtreleyin.'
            },
            {
                title: 'Yedekleme',
                description: '"Yedekleme" sekmesinde veritabanı dışa aktarma (JSON/CSV) ve içe aktarma işlemleri yapabilirsiniz.'
            },
            {
                title: 'Deneme Modu (Dry Run)',
                description: 'İçe aktarma yapmadan önce "Deneme Modu" ile simülasyon çalıştırın. Bu mod veritabanını değiştirmeden kaç kaydın ekleneceğini/güncelleneceğini gösterir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'İçe aktarma işlemleri geri alınamaz. Mutlaka önce deneme modunu kullanın ve sonuçları kontrol edin.' },
            { type: 'info', text: 'Yıllık matristeki negatif değerler (kırmızı) o ay için hedefin altında kalındığını, pozitif değerler hedef aşıldığını gösterir.' },
            { type: 'success', text: 'Dışa aktarma ile tüm puantaj verilerini yedekleyebilirsiniz. JSON formatı tam veri, CSV formatı tablo uyumlu çıktı verir.' }
        ],
        faq: [
            { q: 'Yıllık matriste "-6s" ne anlama geliyor?', a: 'O çalışanın o ay için 6 saat eksik çalıştığı anlamına gelir. Hedef çalışma süresinin altında kalmıştır.' },
            { q: 'Yedekleme dosyasını nasıl geri yüklerim?', a: '"Yedekleme" sekmesinde "İçe Aktar" bölümünden dosyanızı yükleyin. Önce deneme modunda test edin, sonra gerçek içe aktarmayı yapın.' },
            { q: 'Dışa aktarmada hangi veriler dahil edilir?', a: 'Çalışan bilgileri, puantaj kayıtları, talep geçmişleri, rol/yetki atamaları ve mali takvim verileri dahildir.' }
        ]
    },
    {
        id: 'program-yonetimi',
        title: 'Program Yönetimi',
        icon: Package,
        description: 'Harici yazılımlar, versiyon takibi ve cihaz erişim yönetimi',
        permission: 'PAGE_PROGRAM_MANAGEMENT',
        link: '/program-management',
        images: [
            { src: '/help-images/admin-program-yonetimi.png', caption: 'Program Yönetimi — yazılım envanteri, versiyon bilgileri ve cihaz kayıtları' }
        ],
        steps: [
            {
                title: 'Program Listesi',
                description: 'Şirkette kullanılan harici yazılımları listeleyebilirsiniz. Her program için isim, versiyon ve durum bilgileri gösterilir.'
            },
            {
                title: 'Yeni Program Ekleme',
                description: '"Yeni Program" düğmesine tıklayarak yeni bir yazılım kaydı oluşturun. Program adı, versiyon, lisans bilgisi ve açıklama girin.'
            },
            {
                title: 'Cihaz Erişimi',
                description: 'Her program için hangi cihazlarda kurulu olduğunu takip edebilirsiniz. Cihaz ekleme/çıkarma işlemleri program detay sayfasından yapılır.'
            },
            {
                title: 'Versiyon Yönetimi',
                description: 'Yazılım güncellemelerini takip edin. Yeni versiyon çıktığında kaydı güncelleyerek kurulum durumunu izleyebilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Özet kartlarında toplam program, aktif program ve kayıtlı cihaz sayıları görünür.' },
            { type: 'success', text: 'Program detayını görüntülemek için sol listeden bir program seçin. Sağ panelde tüm detaylar gösterilir.' }
        ],
        faq: [
            { q: 'Program yönetimi sayfasını göremiyorum', a: 'Bu sayfa için program yönetimi yetkisi gereklidir. Sistem yöneticinize başvurun.' },
            { q: 'Bir programı silersen kurulu cihaz kayıtları da silinir mi?', a: 'Evet. Program silindiğinde ilişkili tüm cihaz erişim kayıtları da kaldırılır.' }
        ]
    }
];

export default helpContent;
