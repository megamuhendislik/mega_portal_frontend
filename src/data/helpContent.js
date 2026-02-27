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
        description: 'Kart okutma ile giriş/çıkış, tolerans kuralları, mola takibi ve canlı durum bilgisi',
        permission: null,
        link: '/',
        images: [
            { src: '/help-images/anasayfa.png', caption: 'Ana sayfa — üst başlıkta çalışma süresi, kalan mola ve fazla mesai bilgileri; altta hızlı erişim kartları' },
            { src: '/help-images/mesai-takibi.png', caption: 'Mesai Takibi sayfası — günlük giriş/çıkış saatleri, toplam çalışma süresi ve hesaplanan mola/mesai detayları' },
            { src: '/help-images/admin-anasayfa.png', caption: 'Yönetici Ana Sayfası — aylık puantaj grafikleri, devamsızlık oranı ve ekip performans özeti' }
        ],
        steps: [
            {
                title: 'Giriş Yapma (Kart Okutma)',
                description: 'İşe geldiğinizde kartınızı kart okuyucuya okutun. Sistem giriş saatinizi otomatik kaydeder ve mesainiz başlar. Giriş kaydınız anlık olarak sisteme yansır.'
            },
            {
                title: 'Canlı Durum Takibi',
                description: 'Sayfa başlığındaki 3 bilgi kutusunda (Çalışma Süresi, Kalan Mola, Fazla Mesai) anlık durumunuzu görebilirsiniz. Bu veriler her 30 saniyede bir otomatik güncellenir (canlı güncelleme döngüsü). Sekmeyi kapattığınızda güncelleme durur, geri açtığınızda otomatik yenilenir.'
            },
            {
                title: 'Mola Kullanımı',
                description: 'Mola vermek için çıkış yapın (kart okutun), dönüşte tekrar giriş yapın. İki okutma arasındaki süre "potansiyel mola" olarak hesaplanır. Üst menüdeki kahve ikonunda mola durumunuz gösterilir: mavi = normal, turuncu = mola hakkınızın %80\'ini kullandınız, kırmızı = mola hakkınız aşıldı. Günlük mola hakkı genellikle 30 dakikadır ve çalışma sürenizden otomatik düşülür.'
            },
            {
                title: 'Çıkış Yapma',
                description: 'Mesai bitiminde kartınızı tekrar okutun. Sistem çıkış saatinizi kaydeder ve çalışma sürenizi otomatik hesaplar. Çıkış yapmadan ayrılmak sisteminize zarar verir — detaylar aşağıdaki uyarılarda.'
            }
        ],
        tips: [
            { type: 'info', text: 'Tolerans Türleri: Sistemde iki farklı tolerans vardır. (1) Servis Toleransı — vardiya başlangıç/bitiş saatlerine yakın okutmaları vardiya saatine yuvarlar. Örneğin vardiyası 09:00 olan biri 08:57\'de okutsa, giriş 09:00 olarak kaydedilir. (2) Geç Kalma Toleransı (varsayılan 15 dk) — vardiya bitiş saatinden sonraki kısa süre için uzatma penceresi oluşturur. Bu süre içindeki çıkış, normal mesai olarak değerlendirilir ve fazla mesai oluşturmaz.' },
            { type: 'info', text: 'Mola Hesaplama: Günlük mola hakkı (varsayılan 30 dk) toplam çalışma sürenizden otomatik düşülür. Gün içinde çıkış-giriş arasındaki boşluklar "potansiyel mola" olarak hesaplanır. Mola hakkınızı aşarsanız, aşan kısım çalışma sürenizden kesilir.' },
            { type: 'warning', text: 'Çıkış yapmadan (kart okutmadan) ayrılmayın! Kayıt "AÇIK" kalır ve gece yarısı (00:01) otomatik görevi bu kaydı vardiya bitiş saatinde kapatır. Bu durum istenmeyen "Potansiyel Ek Mesai" kaydı oluşturabilir ve puantajınızda yanlış veriler görünür. Her zaman çıkışta kart okutun.' },
            { type: 'success', text: 'Kart okutucunuz arızalıysa veya kartınızı unuttaysanız Talepler sayfasından "Kartsız Giriş Talebi" oluşturabilirsiniz. Bu talep yöneticinizin onayına gider ve onaylandığında puantaj kaydınız oluşturulur.' }
        ],
        faq: [
            { q: 'Kart okutmayı unuttum, ne yapmalıyım?', a: 'Talepler sayfasından "Kartsız Giriş Talebi" oluşturun. Giriş ve çıkış saatlerinizi belirtin. Talep yöneticinize gider ve onaylandığında puantaj kaydınız oluşturulur. Bu talepler geçmiş 2 mali ay içindeki tarihler için verilebilir.' },
            { q: 'Gece vardiyasında çalışıyorum, kayıtlarım nasıl hesaplanır?', a: 'Gece vardiyası özelliği aktifse, gece yarısını geçen kayıtlar Celery gece görevi tarafından otomatik olarak bölünür. Her takvim günü için ayrı puantaj kaydı oluşturulur. Bu özellik sistem yöneticisi tarafından açılıp kapatılabilir.' },
            { q: 'Mola sürem neden azalıyor?', a: 'Gün içinde her çıkış-giriş arası "potansiyel mola" olarak sayılır. Toplam potansiyel mola süreniz (çıkış-giriş arasındaki tüm boşluklar) üst menüdeki mola göstergesinde takip edilir. Günlük mola hakkı (genellikle 30 dk) otomatik olarak çalışma sürenizden düşülür.' },
            { q: 'Birden fazla giriş/çıkış kaydım var, bu normal mi?', a: 'Evet. Gün içinde her kart okutma bir giriş veya çıkış olarak kaydedilir (tek-çift sıralama). Sistem tüm kayıtları birleştirerek toplam çalışma sürenizi hesaplar. Aradaki boşluklar mola olarak değerlendirilir.' },
            { q: 'Fazla mesai nasıl algılanır?', a: 'Vardiya bitiş saatinizin ardından geç kalma toleransını (varsayılan 15 dk) aştığınızda, ek çalışma süreniz otomatik olarak hesaplanır. Günlük toplam fazla mesai minimum eşik süresini (varsayılan 15 dk) geçerse, sistem otomatik "Potansiyel Ek Mesai" kaydı oluşturur. Bu eşiğin altındaki süre sıfırlanır — yani 10 dk fazla çalışma kaydedilmez.' }
        ]
    },
    {
        id: 'izin-talepleri',
        title: 'İzin Talepleri',
        icon: CalendarDays,
        description: 'Yıllık izin, avans izin başvurusu, FIFO düşüm sistemi ve izin bakiyesi takibi',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/talepler-izin.png', caption: 'Taleplerim — İzin sekmesi: izin bakiyesi kartları, yeni talep formu ve geçmiş talep listesi' }
        ],
        steps: [
            {
                title: 'İzin Bakiyesi Kontrolü',
                description: 'Talepler sayfasında izin bakiyenizi görebilirsiniz. Toplam hak ediş, kullanılan gün, avans kullanımı ve kalan bakiye bilgileri özet kartlarda gösterilir. Bakiye hesaplaması FIFO (ilk hak edilen ilk düşülür) yöntemiyle yapılır.'
            },
            {
                title: 'Yeni İzin Talebi Oluşturma',
                description: '"Yeni İzin Talebi" düğmesine tıklayın. İzin türünü (yıllık, mazeret, hastalık vb.) seçin, başlangıç ve bitiş tarihlerini belirleyin. Gerekirse açıklama ekleyin. Geçmiş 2 mali ay içindeki tarihler için geriye dönük talep oluşturabilirsiniz.'
            },
            {
                title: 'Onay Süreci',
                description: 'Talebiniz önce birincil (doğrudan) yöneticinize gider. Birincil yönetici bulunamazsa çapraz yönetici, departman yöneticisi veya üst hiyerarşi devreye girer. Onay/red bildirimi alırsınız. Onaylanan izinler takvimde gösterilir.'
            },
            {
                title: 'İzin İptali',
                description: 'Henüz onaylanmamış ("Bekleyen") talepleri kendiniz iptal edebilirsiniz. Onaylanmış izinlerin iptali için sistem yöneticinize başvurun — onaylanan izin gün sayısı FIFO bakiyesine geri yüklenir.'
            }
        ],
        tips: [
            { type: 'info', text: 'FIFO Düşüm: İzin günleri "İlk Hak Edilen → İlk Düşülür" kuralıyla çalışır. Birden fazla hak ediş döneminiz varsa, en eski dönemdeki bakiye önce kullanılır. Bu sistemle devir izinleri doğru takip edilir.' },
            { type: 'warning', text: 'Avans İzin: Henüz hak etmediğiniz günleri önceden kullanmanızdır. Bakiyeniz negatife düşebilir. Avans kullanımı ayrıca takip edilir (annual_leave_advance_used) ve gelecek hak edişlerinizden otomatik düşülür. İzin iadesi yapılırsa önce avans bakiyesi iade edilir.' },
            { type: 'success', text: 'Geriye dönük izin talebi 2 mali ay penceresi içinde verilebilir. Örneğin Şubat dönemindeyseniz (26 Ocak – 25 Şubat), Aralık dönemine kadar geriye dönük talep oluşturabilirsiniz.' }
        ],
        faq: [
            { q: 'Kaç gün izin hakkım var?', a: 'İzin hakkınız kıdeminize göre belirlenir: 1-5 yıl: 14 gün, 5-15 yıl: 20 gün, 15+ yıl: 26 gün (yasal minimum). Talepler sayfasında güncel bakiyenizi ve her hak ediş döneminin kalan gün sayısını görebilirsiniz.' },
            { q: 'Avans izin nedir?', a: 'Henüz hak etmediğiniz izin günlerini önceden kullanmanızdır. Yönetici onayı gerektirir. Kıdem şartı aranmaz. Kullanılan avans, gelecek hak edişlerinizden otomatik düşülür ve ayrı bir sayaçta (avans kullanımı) takip edilir.' },
            { q: 'Mazeret izni nasıl kullanırım?', a: 'İzin talebi oluştururken "Mazeret İzni" türünü seçin. Evlilik, doğum, vefat gibi yasal mazeret izinleri yıllık izin hakkınızdan düşülmez. Mazeret izin günleri kanunla belirlenmiştir.' },
            { q: 'Bakiyemde kullanılan günler neden farklı görünüyor?', a: 'FIFO sistemi nedeniyle, izin kullanımı farklı hak ediş dönemlerinden düşülmüş olabilir. Her dönemin kalan bakiyesi ayrıca gösterilir. Hak edişi sıfıra inmiş dönemler listeden düşer.' }
        ]
    },
    {
        id: 'ek-mesai',
        title: 'Ek Mesai',
        icon: Timer,
        description: 'Üç kaynaklı ek mesai sistemi (Planlı/Algılanan/Manuel), talep akışı ve 2 mali ay kuralı',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/talepler-ek-mesai.png', caption: 'Ek Mesai sekmesi — Planlı (atama), Algılanan (otomatik tespit) ve Manuel giriş bölümleri, talep durumu rozetleri' }
        ],
        steps: [
            {
                title: 'Üç Mesai Kaynağını Anlama',
                description: 'Sistem 3 farklı kaynaktan ek mesai yönetir: (1) Planlı Mesai (INTENDED) — yöneticiniz tarafından size atanan, önceden planlanmış mesai. (2) Algılanan Mesai (POTENTIAL) — vardiya saatinizi aştığınızda sistem tarafından otomatik tespit edilen mesai. (3) Manuel Giriş (MANUAL) — geçmiş bir tarih için sizin elle girdiğiniz mesai talebi.'
            },
            {
                title: 'Planlı Mesai (Yönetici Ataması)',
                description: 'Yöneticiniz size mesai ataması yapar. Talepler sayfasında "Atanan Mesailer" bölümünde görünür. "Talep Et" düğmesine tıklayarak tarih, süre ve açıklama bilgileri otomatik doldurulmuş halde onay sürecini başlatırsınız.'
            },
            {
                title: 'Algılanan Mesai (Otomatik Tespit)',
                description: 'Vardiya bitiş saatinden sonra geç kalma toleransını (15 dk) aştığınızda, sistem fazla çalışmanızı otomatik algılar. Günlük toplam fazla mesai minimum eşik süresini (15 dk) geçerse, "Potansiyel Ek Mesai" kaydı otomatik oluşturulur. Bu eşiğin altındaki süreler kaydedilmez — yani 12 dk fazla çalışma için kayıt oluşmaz.'
            },
            {
                title: 'Manuel Mesai Girişi',
                description: 'Geçmiş bir tarih için mesai talebi oluşturmak isterseniz "Manuel Giriş" formunu kullanın. Tarih, başlangıç/bitiş saati, süre ve iş tanımını girin. Bu talep doğrudan yönetici onayına gider.'
            },
            {
                title: 'Talep Akışı ve Onay',
                description: 'Mesai kayıtları şu akışı izler: POTANSIYEL (taslak, henüz talep edilmedi) → BEKLEYEN (talep edildi, yönetici onayı bekleniyor) → ONAYLANDI / REDDEDİLDİ / İPTAL. Onaylanan mesai puantajınıza ve aylık çalışma özetinize yansır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Potansiyel mesai, sistem tarafından algılanan ancak henüz talep edilmemiş fazla çalışmadır. Siz "Talep Et" düğmesine basana kadar taslak halinde kalır ve yöneticinize gitmez. Talep etmediğiniz potansiyel mesailer puantajınıza yansımaz.' },
            { type: 'info', text: 'Minimum Mesai Eşiği: Günlük toplam fazla mesai 15 dakikanın altındaysa, tüm fazla çalışma süresi sıfırlanır — yani kısa süreli aşımlar kayda geçmez. Bu eşik yönetici tarafından ayarlanabilir.' },
            { type: 'warning', text: 'Tüm mesai talepleri (planlı, algılanan ve manuel) 2 mali ay geriye dönük pencere içinde yapılmalıdır. Bu süreyi aşan mesailer talep edilemez ve potansiyel kayıtlar otomatik olarak süresi dolmuş (expire) olarak işaretlenir.' },
            { type: 'success', text: 'Hafta sonu ve resmi tatillerde yapılan çalışmalar, tatil günü çalışma programınız "tatil" olarak tanımlıysa otomatik olarak ek mesai kabul edilir ve potansiyel mesai kaydı oluşturulur.' }
        ],
        faq: [
            { q: 'Potansiyel mesai ile bekleyen mesai arasındaki fark nedir?', a: '"Potansiyel" mesai henüz taslak halindedir — sistem otomatik algılamıştır ama siz henüz talep etmediniz. "Talep Et" düğmesine bastığınızda durumu "Bekleyen"e geçer ve yönetici onayına gider. Potansiyel mesai puantajınıza yansımaz, sadece onaylanan mesai yansır.' },
            { q: 'Mesaim neden otomatik algılanmadı?', a: 'Mesainin algılanması için iki koşul sağlanmalıdır: (1) Vardiya bitiş saatinden sonra geç kalma toleransını (15 dk) aşmanız, (2) Günlük toplam fazla mesai süresinin minimum eşik süresini (15 dk) geçmesi. Her iki koşul da sağlanmazsa potansiyel mesai oluşmaz.' },
            { q: 'Onaylanan mesai puantajıma nasıl yansır?', a: 'Onaylanan mesai o gün için oluşturulan puantaj kaydına "Fazla Mesai" olarak eklenir. Geçmiş ay mesaileri onaylandığında, o ayın Aylık Çalışma Özeti (MonthlyWorkSummary) de otomatik güncellenir — kümülatif bakiye yeniden hesaplanır.' },
            { q: 'Planlı mesai atamasını nasıl talep ederim?', a: 'Talepler sayfasında "Atanan Mesailer" bölümünde yöneticinizin size atadığı mesaileri göreceksiniz. Her atamanın yanındaki "Talep Et" düğmesine tıklayın — tarih, süre ve açıklama bilgileri otomatik doldurulur. İsterseniz iş tanımı (task_description) ekleyerek gönderebilirsiniz.' }
        ]
    },
    {
        id: 'yemek-siparisi',
        title: 'Yemek Siparişi',
        icon: Utensils,
        description: 'Günlük yemek siparişi verme, sipariş saatleri ve geçmiş siparişler',
        permission: 'PAGE_MEAL_ORDERS',
        link: '/meal-orders',
        images: [
            { src: '/help-images/admin-yemek-siparis.png', caption: 'Yemek Sipariş Yönetimi — günlük sipariş durumu, çalışan listesi ve toplu sipariş yönetimi paneli' }
        ],
        steps: [
            {
                title: 'Sipariş Verme',
                description: 'Yemek Siparişi sayfasında bugünün menüsünü görüntüleyin. İstediğiniz öğünü seçin ve "Sipariş Ver" düğmesine tıklayın. Sipariş anında sisteme kaydedilir.'
            },
            {
                title: 'Sipariş Saatleri',
                description: 'Yemek siparişleri belirli kapanış saatine kadar açıktır. Kapanış saati geçtikten sonra yeni sipariş veremez, mevcut siparişi değiştiremez veya iptal edemezsiniz. Sipariş saatini kaçırmamaya dikkat edin.'
            },
            {
                title: 'Geçmiş Siparişler',
                description: 'Sayfanın alt kısmında geçmiş siparişlerinizi görüntüleyebilirsiniz. Tarih aralığına göre filtreleme yaparak belirli bir dönemin sipariş geçmişini inceleyebilirsiniz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sipariş kapanış saatinden önce siparişinizi vermeyi unutmayın. Kapandıktan sonra değişiklik yapılamaz ve o gün için sipariş veremezsiniz.' },
            { type: 'info', text: 'Bu sayfayı görmek için "Yemek Siparişi" yetkisi (PAGE_MEAL_ORDERS) gereklidir. Sayfayı göremiyorsanız yetkinizin tanımlanıp tanımlanmadığını sistem yöneticinize sorun.' },
            { type: 'success', text: 'Yemek siparişleri de 2 mali ay geriye dönük pencere kuralına tabidir. Geçmiş tarihler için sipariş talebi oluşturabilirsiniz.' }
        ],
        faq: [
            { q: 'Sipariş verdikten sonra değiştirebilir miyim?', a: 'Sipariş kapanış saatine kadar siparişinizi değiştirebilir veya iptal edebilirsiniz. Kapanış saatinden sonra değişiklik mümkün değildir.' },
            { q: 'Yemek siparişi sayfasını göremiyorum', a: 'Bu sayfa PAGE_MEAL_ORDERS yetkisi gerektirir. Sistem yöneticinize veya İK birimine başvurarak yetki tanımlamasını isteyin.' }
        ]
    },
    {
        id: 'takvim',
        title: 'Takvim',
        icon: Calendar,
        description: 'Puantaj takvimi, mali dönem sınırları, renk kodları ve günlük detay görüntüleme',
        permission: null,
        link: '/calendar',
        images: [
            { src: '/help-images/takvim.png', caption: 'Takvim görünümü — yıllık/aylık takvim, renk kodlu durum göstergeleri, etkinlik kategorileri ve mali dönem sınırları' }
        ],
        steps: [
            {
                title: 'Aylık Görünüm',
                description: 'Takvim sayfasında ay görünümünde çalışma günlerinizi görebilirsiniz. Her gün renk koduyla puantaj durumunu gösterir. İleri-geri ok düğmeleriyle aylar arası geçiş yapabilirsiniz.'
            },
            {
                title: 'Renk Kodları',
                description: 'Yeşil = onaylanmış normal çalışma, Turuncu = izinli gün, Kırmızı = devamsızlık (kayıt yok), Mavi = açık kayıt (henüz çıkış yapılmadı), Mor = ek mesai tespit edildi, Gri = tatil günü.'
            },
            {
                title: 'Gün Detayı',
                description: 'Herhangi bir güne tıklayarak o günün detaylı puantaj kaydını görüntüleyin: giriş/çıkış saatleri, toplam çalışma süresi, mola kullanımı, fazla mesai miktarı ve kayıt durumu.'
            },
            {
                title: 'Mali Dönem Sınırları',
                description: 'Takvimde mali dönem sınırları belirgindir. Her dönem ayın 26\'sından bir sonraki ayın 25\'ine kadardır (Türk bordro döngüsü). Örneğin "Şubat dönemi" = 26 Ocak – 25 Şubat. Kilitlenmiş dönemlerde kayıtlar değiştirilemez.'
            }
        ],
        tips: [
            { type: 'info', text: 'Mali Dönem Kuralı: Her dönem önceki ayın 26\'sından hedef ayın 25\'ine kadardır. Örneğin "Mart 2026 dönemi" = 26 Şubat – 25 Mart. Bu dönem kapandığında (kilitlendiğinde) o dönemin puantaj kayıtları değiştirilemez hale gelir.' },
            { type: 'warning', text: 'Kırmızı (devamsız) günler, o tarih için giriş kaydı bulunmadığı veya çalışma yapılmadığı anlamına gelir. Kartsız giriş talebi oluşturarak bu durumu düzeltebilirsiniz.' },
            { type: 'success', text: 'Takvim görünümünü haftalık veya günlük olarak değiştirebilirsiniz. Ay görünümü genel bakış, gün görünümü detaylı inceleme için uygundur.' }
        ],
        faq: [
            { q: 'Takvimde kırmızı gün ne anlama geliyor?', a: 'Kırmızı renk devamsızlık anlamına gelir. O gün için giriş kaydı girilmemiş veya çalışma yapılmamıştır. Eğer o gün çalıştıysanız ama kart okutmadıysanız, "Kartsız Giriş Talebi" oluşturarak düzeltme yapabilirsiniz.' },
            { q: 'Geçmiş ayları görebilir miyim?', a: 'Evet, takvimde ileri-geri ok düğmeleriyle geçmiş ve gelecek aylara geçebilirsiniz. Kilitlenmiş mali dönemlerin kayıtları salt okunurdur — düzenleme yapılamaz.' },
            { q: 'Mali dönem kapandıktan sonra düzeltme yapılabilir mi?', a: 'Hayır. Mali dönem kilitlendiğinde o dönemin puantaj kayıtları (Attendance) değiştirilemez hale gelir. Düzeltme gerekiyorsa sistem yöneticisinin dönem kilidini açması gerekir.' }
        ]
    },
    {
        id: 'sirket-rehberi',
        title: 'Şirket Rehberi',
        icon: Contact,
        description: 'Çalışan arama, iletişim bilgileri, departman filtresi ve durum göstergeleri',
        permission: null,
        link: '/company-directory',
        images: [
            { src: '/help-images/sirket-rehberi.png', caption: 'Şirket Rehberi — çalışan kartları, anlık durum göstergesi (ofiste/izinde/dışarıda), departman filtresi ve arama kutusu' }
        ],
        steps: [
            {
                title: 'Çalışan Arama',
                description: 'Arama kutusuna isim, soyisim veya departman adı yazarak çalışan arayabilirsiniz. Sonuçlar anlık olarak filtrelenir.'
            },
            {
                title: 'Departman Filtresi',
                description: 'Sol taraftaki departman filtresini kullanarak belirli bir departmandaki çalışanları listeleyebilirsiniz. Birden fazla departman seçilebilir.'
            },
            {
                title: 'Çalışan Durumu',
                description: 'Her çalışanın yanında anlık durum göstergesi bulunur: yeşil = şu an ofiste (giriş yapmış), turuncu = izinde, gri = çıkış yapmış/dışarıda.'
            },
            {
                title: 'Görünüm Seçenekleri',
                description: 'Kart ve liste görünümü arasında geçiş yapabilirsiniz. Kart görünümünde fotoğraflar daha büyük gösterilir, liste görünümü daha fazla çalışanı tek ekranda gösterir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Çalışan kartına tıklayarak detaylı iletişim bilgilerini (telefon, e-posta, departman, pozisyon) görebilirsiniz. İletişim bilgileri çalışanın profiline girilmişse görünür.' },
            { type: 'success', text: 'Rehber tüm aktif çalışanları gösterir. Pasif durumdaki (ayrılmış) çalışanlar listede görünmez.' }
        ],
        faq: [
            { q: 'Çalışanın telefon numarasını göremiyorum', a: 'İletişim bilgileri çalışanın profil kayıtlarına bağlıdır. Bilgi girilmemişse görünmez. Kendi bilgilerinizi güncellemek için profil sayfanızı kontrol edin.' },
            { q: 'Ayrılan bir çalışanı neden göremiyorum?', a: 'Şirket Rehberi yalnızca aktif çalışanları listeler. Ayrılmış (pasif) çalışanlar güvenlik nedeniyle rehberden çıkarılır.' }
        ]
    },
    {
        id: 'dilek-sikayetler',
        title: 'Dilek ve Şikayetler',
        icon: MessageSquare,
        description: 'Anonim/açık geri bildirim gönderme, takip etme ve yönetim yanıt paneli',
        permission: null,
        link: '/feedback',
        images: [
            { src: '/help-images/dilek-sikayetler.png', caption: 'Dilek ve Şikayetler — geri bildirim formu, durum kartları (toplam/beklemede/cevaplanan/okunmamış) ve yönetim sekmesi' }
        ],
        steps: [
            {
                title: 'Yeni Geri Bildirim Oluşturma',
                description: '"Yeni Geri Bildirim" düğmesine tıklayarak dilek, şikayet veya önerinizi yazın. Konu başlığı ve detaylı açıklama girin. Geri bildiriminiz yalnızca yetkili yöneticiler tarafından görülür.'
            },
            {
                title: 'Durum Takibi',
                description: '"Geri Bildirimlerim" sekmesinde gönderdiğiniz tüm geri bildirimlerin durumunu takip edebilirsiniz. Üst kartlarda toplam, beklemede, cevaplanan ve okunmamış cevap sayıları gösterilir.'
            },
            {
                title: 'Cevap Okuma',
                description: 'Yöneticiniz veya İK birimi geri bildiriminize cevap verdiğinde bildirim alırsınız. "Okunmamış Cevap" sayacından yeni cevapları takip edebilirsiniz.'
            },
            {
                title: 'Yönetim Paneli (Yöneticiler İçin)',
                description: 'Yönetici yetkisi olanlar "Yönetim" sekmesinden tüm çalışan geri bildirimlerini görebilir, yanıtlayabilir ve durum güncellemesi yapabilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Geri bildirimleriniz yalnızca yetkili yöneticiler ve sistem yöneticileri tarafından görüntülenebilir. Diğer çalışanlar sizin geri bildirimlerinize erişemez.' },
            { type: 'success', text: 'Arama kutusunu kullanarak eski geri bildirimlerinizi konu veya içerik bazında hızlıca bulabilirsiniz.' }
        ],
        faq: [
            { q: 'Geri bildirimim kim tarafından görülüyor?', a: 'Geri bildirimleriniz yalnızca sistem yöneticileri ve İK yetkilileri tarafından görüntülenir. Diğer çalışanlar erişemez.' },
            { q: 'Gönderdiğim geri bildirimi silebilir miyim?', a: 'Beklemede olan geri bildirimleri düzenleyebilirsiniz. Yanıtlanmış olanlar kayıt bütünlüğü için değiştirilemez.' }
        ]
    },
    {
        id: 'vekalet-yonetimi',
        title: 'Vekalet Yönetimi',
        icon: UserCheck,
        description: 'Yönetici vekalet tanımlama, kapsamlı yetki devri ve otomatik süre yönetimi',
        permission: null,
        link: '/substitute-management',
        images: [
            { src: '/help-images/vekalet-yonetimi.png', caption: 'Vekalet Yönetimi — özet kartları (aktif/gelecek/süresi dolmuş), vekalet listesi ve yeni vekalet oluşturma formu' }
        ],
        steps: [
            {
                title: 'Yeni Vekalet Tanımlama',
                description: '"Yeni Vekalet" düğmesine tıklayarak vekil seçin. Başlangıç ve bitiş tarihlerini, vekalet kapsamını (izin onayı, mesai onayı, kartsız giriş onayı vb.) belirleyin. Birden fazla kapsam seçebilirsiniz.'
            },
            {
                title: 'Vekalet Durumu Takibi',
                description: 'Özet kartlarında aktif (şu an geçerli), gelecek (henüz başlamamış), süresi dolmuş ve toplam vekalet sayılarını görebilirsiniz.'
            },
            {
                title: 'Verdiğim Vekaletler',
                description: '"Verdiğim / Tüm Vekaletler" sekmesinde oluşturduğunuz vekaletleri listeleyin, düzenleyin veya sonlandırın.'
            },
            {
                title: 'Vekil Olduğum Vekaletler',
                description: '"Vekil Olduğum" sekmesinde size verilen vekalet yetkilerini görüntüleyin. Vekalet süresi boyunca atayan kişi adına onay/red işlemleri yapabilirsiniz. Vekil olarak yapılan tüm işlemler loglanır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Vekalet süresi dolduğunda yetkiler otomatik olarak geri alınır. Manuel bir işlem yapmanız gerekmez. Celery zamanlama görevi bu kontrolü periyodik olarak yapar.' },
            { type: 'warning', text: 'Vekalet verdiğiniz kişi, sizin adınıza onay/red işlemi yapabilir. Yetkisiz onay riskini önlemek için güvendiğiniz kişileri seçin ve kapsamı minimum tutun.' },
            { type: 'success', text: 'İzne çıkmadan önce vekalet tanımlayın. Bu sayede ekibinizdeki taleplerin onay süreçleri aksamamış olur. Birden fazla kişiye farklı kapsamlarda vekalet verebilirsiniz.' }
        ],
        faq: [
            { q: 'Vekalet süresini uzatabilir miyim?', a: 'Evet. Mevcut vekaleti düzenleyerek bitiş tarihini değiştirebilirsiniz. Süresi dolmuş vekaletleri yenileyebilirsiniz.' },
            { q: 'Birden fazla kişiye vekalet verebilir miyim?', a: 'Evet. Farklı kapsamlarda (izin onayı bir kişiye, mesai onayı başka birine) veya aynı kapsamda birden fazla vekalet tanımlayabilirsiniz.' },
            { q: 'Vekil onayladığında kimin onayladığı görünür mü?', a: 'Evet. Sistem, vekil tarafından yapılan tüm işlemleri ayrıca loglar. Talep detayında onaylayan kişinin adı ve vekalet bilgisi görünür.' }
        ]
    },
    {
        id: 'onay-surecleri',
        title: 'Onay Süreçleri',
        icon: CheckSquare,
        description: 'Talep onaylama/reddetme, onay hiyerarşisi ve toplu onay işlemleri',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE', 'APPROVAL_CARDLESS_ENTRY'],
        link: '/requests',
        images: [
            { src: '/help-images/talepler-ekip.png', caption: 'Ekip Talepleri — çalışan filtresi, talep türü ve durum bazlı filtreler, onay/red düğmeleri ve toplu işlem seçimi' }
        ],
        steps: [
            {
                title: 'Bekleyen Talepler',
                description: 'Talepler sayfasında "Ekip Talepleri" sekmesinde bekleyen onaylarınızı görebilirsiniz. Üst başlıktaki bildirim zili simgesinde bekleyen talep sayısı gösterilir. Bildirme tıklayarak doğrudan talep detayına gidebilirsiniz.'
            },
            {
                title: 'Onay Hiyerarşisi',
                description: 'Sistem 5 katmanlı onay hiyerarşisi kullanır: (1) EmployeeManager (birincil yönetici), (2) DepartmentAssignment, (3) Department.manager, (4) reports_to zinciri, (5) departman hiyerarşisi. İlk bulunan yetkili yönetici onay verir. Çapraz (CROSS) yöneticiler de onay yetkisine sahiptir.'
            },
            {
                title: 'Talep İnceleme',
                description: 'Talep detayına tıklayarak çalışanın bilgilerini, talep gerekçesini, tarih/saat detaylarını ve ilgili puantaj kayıtlarını inceleyebilirsiniz.'
            },
            {
                title: 'Onay / Red İşlemi',
                description: '"Onayla" veya "Reddet" düğmelerine tıklayın. Reddetme durumunda gerekçe yazmanız istenir. İşlem sonrası çalışana bildirim gönderilir. Onaylanan talepler puantaj kaydına otomatik yansır.'
            },
            {
                title: 'Toplu Onay',
                description: 'Birden fazla talebi seçerek toplu onay verebilirsiniz. Bu özellik özellikle dönem sonu ek mesai onaylarında zaman kazandırır. Toplu reddetme için her talebe ayrı gerekçe gerekir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Onaylanan talepler geri alınamaz. Lütfen onaylamadan önce detayları dikkatlice inceleyin. Yanlış onay durumunda sistem yöneticisine başvurun.' },
            { type: 'info', text: 'Onay yetkileriniz rolünüze bağlıdır: APPROVAL_OVERTIME (mesai onayı), APPROVAL_LEAVE (izin onayı), APPROVAL_CARDLESS_ENTRY (kartsız giriş onayı). Yalnızca atanmış yetkilerdeki talepleri görebilirsiniz.' },
            { type: 'info', text: 'Vekalet sistemi aktifse, sizin adınıza vekil tayin ettiğiniz kişi de onay verebilir. Vekil tarafından yapılan işlemler ayrıca loglanır.' },
            { type: 'success', text: 'Bildirimlerden doğrudan talep detayına gidebilirsiniz — Talepler sayfasını ayrıca açmanıza gerek yok.' }
        ],
        faq: [
            { q: 'Bekleyen onayım var ama göremiyorum', a: 'Onay yetkinizin doğru tanımlandığından emin olun. Mesai onaylama (APPROVAL_OVERTIME), izin onaylama (APPROVAL_LEAVE) veya kartsız giriş onaylama (APPROVAL_CARDLESS_ENTRY) yetkilerinden en az birine sahip olmanız gerekir. Rolünüzü kontrol etmek için sistem yöneticisine başvurun.' },
            { q: 'Yanlışlıkla onay verdim, geri alabilir miyim?', a: 'Hayır. Onaylanan talepler doğrudan geri alınamaz ve puantaja yansır. Düzeltme için sistem yöneticisine başvurmanız gerekir.' },
            { q: 'Birincil yöneticim yoksa talepler kime gider?', a: 'Sistem 5 katmanlı hiyerarşi kullanır. Birincil yönetici bulunamazsa sırasıyla: departman ataması, departman yöneticisi, reports_to zinciri ve departman hiyerarşisi kontrol edilir. Çapraz yönetici atanmışsa onlar da onay yetkisine sahiptir.' }
        ]
    },
    {
        id: 'raporlar',
        title: 'Raporlar',
        icon: BarChart3,
        description: 'Puantaj raporları, talep analizleri, mali dönem bazlı veri ve Excel/PDF dışa aktarma',
        permission: 'PAGE_REPORTS',
        link: '/reports',
        images: [
            { src: '/help-images/admin-raporlar.png', caption: 'Raporlar — mali dönem seçimi, departman/personel filtresi, puantaj tablosu ve Excel/PDF dışa aktarma düğmeleri' }
        ],
        steps: [
            {
                title: 'Rapor Türleri',
                description: 'Puantaj Raporu (günlük çalışma detayları), Mesai Raporu (fazla mesai dökümleri), İzin Raporu (izin kullanım özeti), Devamsızlık Raporu (gelmeme kayıtları) ve Talep Analizleri (kapsamlı istatistik paneli) mevcuttur.'
            },
            {
                title: 'Mali Dönem Bazlı Filtreleme',
                description: 'Raporlar mali dönem (26-25) bazlı çalışır. Dönem seçiciyle istediğiniz mali dönemi seçin. Ayrıca departman, çalışan ve durum filtrelerini kullanarak raporunuzu özelleştirin.'
            },
            {
                title: 'Dışa Aktarma',
                description: 'Raporları Excel (XLSX) veya PDF olarak indirebilirsiniz. İndirme düğmesi rapor tablosunun üst kısmında bulunur. Excel formatı detaylı veri analizi, PDF formatı baskı/paylaşım için uygundur.'
            },
            {
                title: 'Talep Analizleri',
                description: 'Talep Analizleri sayfasında 10 bölüm bulunur: KPI kartları, aylık trend grafiği, dağılım grafikleri, ekip analizi (departman/rol/kişi bazlı), ek mesai analizi (kaynak/atama/haftalık), izin analizi, OT-yemek korelasyonu, dolaylı talepler ve haftalık pattern ısı haritası.'
            }
        ],
        tips: [
            { type: 'info', text: 'Mali dönem 26-25 Türk bordro döngüsünü takip eder. "Şubat 2026 dönemi" = 26 Ocak – 25 Şubat. Rapor tarih filtreleri bu döneme göre çalışır.' },
            { type: 'info', text: 'Talep Analizleri sayfası (/request-analytics) ayrı bir sayfadır ve PAGE_REPORTS yetkisi gerektirir. 10 farklı analiz bölümü lazy-loaded olarak yüklenir.' },
            { type: 'success', text: 'Grafikler üzerinde fare ile gezinerek detaylı verileri görebilirsiniz. Grafik türünü (çubuk/çizgi/pasta) değiştirebilirsiniz.' }
        ],
        faq: [
            { q: 'Rapor sayfasını göremiyorum', a: 'Bu sayfa PAGE_REPORTS yetkisi gerektirir. Sistem yöneticinize başvurarak yetki tanımlamasını isteyin.' },
            { q: 'Raporlardaki veriler anlık mı?', a: 'Raporlar sayfa yüklendiğinde güncel veriyi çeker. Otomatik güncelleme yoktur. Sayfayı yenileyerek son verileri alabilirsiniz. Canlı durum paneli (live-status) ise 30 saniyede bir güncellenir.' },
            { q: 'Aylık çalışma bakiyesi nasıl hesaplanır?', a: 'MonthlyWorkSummary, o mali dönem içindeki toplam çalışma süresinden hedef çalışma süresini çıkararak bakiye hesaplar. Pozitif değer = hedefin üstünde çalışma, negatif değer = hedefin altında kalma. Onaylanan ek mesailer de bakiyeye dahil edilir.' }
        ]
    },
    {
        id: 'calisma-programlari',
        title: 'Çalışma Programları',
        icon: CalendarRange,
        description: 'Mali takvim, vardiya şablonları, gün atamaları ve günlük değişiklik yönetimi',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/work-schedules',
        images: [
            { src: '/help-images/admin-calisma-takvimleri.png', caption: 'Mali Takvim Yönetimi — şablon listesi, haftalık program tablosu, tolerans/mola ayarları ve gün ataması düzenleyici' }
        ],
        steps: [
            {
                title: 'Program Öncelik Hiyerarşisi',
                description: 'Bir çalışanın belirli bir gündeki çalışma saatleri şu öncelik sırasıyla belirlenir: (1) Mali Takvim (FiscalCalendar) → (2) Şablon (ScheduleTemplate) → (3) Gün Ataması (DayTemplateAssignment) → (4) Günlük Değişiklik (DailyScheduleOverride) → (5) Çalışan-düzeyi override. En özel tanım geçerlidir.'
            },
            {
                title: 'Vardiya Şablonları',
                description: 'Her şablon haftalık çalışma takvimini tanımlar: Pazartesi-Pazar her gün için başlangıç/bitiş saati ve tatil durumu. Ayrıca tolerans süreleri (servis toleransı, geç kalma toleransı), mola hakkı ve minimum mesai eşiği bu şablonda tanımlanır.'
            },
            {
                title: 'Mali Takvim ve Dönem Şablonları',
                description: 'Mali takvimler dönemsel çalışma programlarını yönetir. Her mali dönem (26-25) için farklı şablon atanabilir. Bu sayede mevsimsel değişiklikler (yaz/kış saati) kolayca yönetilebilir.'
            },
            {
                title: 'Günlük Değişiklikler (Override)',
                description: 'Belirli günler için özel çalışma saatleri tanımlayabilirsiniz. Örneğin: yarım gün çalışma, özel vardiya değişikliği, tek seferlik tatil günü. Bu tanımlar şablon üzerinde öncelik kazanır.'
            },
            {
                title: 'Çalışana Program Atama',
                description: 'Çalışanlar sayfasından çalışan profiline giderek mali takvim ve varsayılan şablon ataması yapabilirsiniz. Atama yapıldığında puantaj hesaplamaları yeni programa göre çalışır.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışma programı değişiklikleri, ilişkili tüm puantaj kayıtlarının yeniden hesaplanmasını tetikler. Büyük kadrolarda bu işlem Celery async task olarak arka planda çalışır ve birkaç dakika sürebilir. İlerleme durumu sayfada gösterilir.' },
            { type: 'info', text: 'Tolerans Ayarları: Servis toleransı (service_tolerance_minutes) = vardiya saatlerine yakın okutmaları yuvarlama. Geç kalma toleransı (late_tolerance_minutes, varsayılan 15 dk) = vardiya sonrası uzatma penceresi. Mola hakkı (daily_break_allowance, varsayılan 30 dk) = çalışma süresinden düşülecek mola süresi.' },
            { type: 'info', text: 'Minimum mesai eşiği (minimum_overtime_minutes, varsayılan 15 dk) bu şablonda tanımlanır. Günlük toplam fazla mesai bu eşiğin altındaysa sıfırlanır.' },
            { type: 'success', text: 'Takvim değişikliklerinin geçmişi CalendarChangeLog\'da tutulur. Her değişikliğin ne zaman, kim tarafından yapıldığı ve önceki/sonraki değerleri kaydedilir.' }
        ],
        faq: [
            { q: 'Yeni vardiya şablonu nasıl oluştururum?', a: '"Yeni Şablon" düğmesine tıklayın. Her gün (Pzt-Paz) için başlangıç-bitiş saatleri ve tatil durumunu tanımlayın. Servis toleransı, geç kalma toleransı, mola hakkı ve minimum mesai eşiği ayarlarını yapın.' },
            { q: 'Bir çalışanın programını değiştirince eski kayıtlar etkilenir mi?', a: 'Takvim değişikliği ileriye dönük uygulanır. Geçmiş kayıtları etkilemek için "Yeniden Hesapla" işlemi tetiklenmelidir. Bu işlem Celery async task olarak çalışır ve ilerleme durumu izlenebilir.' },
            { q: 'Override (günlük değişiklik) şablondan mı öncelikli?', a: 'Evet. Öncelik sırası: Override > DayAssignment > ScheduleTemplate > FiscalCalendar > Employee-level. Override en yüksek önceliğe sahiptir ve o günün tüm diğer tanımlarını geçersiz kılar.' }
        ]
    },
    {
        id: 'sistem-yonetimi',
        title: 'Sistem Yönetimi',
        icon: Shield,
        description: 'Sistem sağlığı, yetki denetimi, puantaj denetimi, uyumluluk testleri ve şifre sıfırlama',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/system-health',
        images: [
            { src: '/help-images/admin-sistem-sagligi.png', caption: 'Sistem Kontrol Merkezi — 4 sekmeli panel: Gösterge Paneli, Yetki Denetimi (RBAC), Puantaj Denetimi ve Uyumluluk Testleri' }
        ],
        steps: [
            {
                title: 'Gösterge Paneli',
                description: 'Canlı sistem ölçümleri: toplam çalışan sayısı, aktif mesai sayısı, devamsızlık oranı, bekleyen talep sayısı. Sistem durumu ve son işlem logları burada görüntülenir.'
            },
            {
                title: 'Yetki Denetimi (RBAC Audit)',
                description: 'Rol ve yetki yapısını kontrol edin. Çalışanların atanmış rolleri, rollerin verdiği yetkiler, yetki çakışmaları ve "etkili yetki" (get_effective_permission_codes) hesaplamaları incelenebilir. Miras alma (inheritance) ve dışlama (exclusion) kuralları da görüntülenir.'
            },
            {
                title: 'Puantaj Denetimi (Attendance Audit)',
                description: 'Tüm çalışanların puantaj hesaplamalarını doğrulayın. Mola hesaplama tutarsızlıkları, eksik giriş/çıkış kayıtları, tolerans uygulamaları ve fazla mesai algılama sonuçları denetlenebilir.'
            },
            {
                title: 'Uyumluluk Testleri (Spec Tests)',
                description: '9 aşamada 443 otomasyon testi çalıştırılır: RBAC (72), Talepler (68), Mesai (95), Ek Mesai (79), İzin (37), Rapor (29), Sistem (15), Potansiyel Mola (16), Yedekleme (32). Test verisi oluşturma/temizleme ve tek tek aşama çalıştırma desteklenir.'
            },
            {
                title: 'Şifre Sıfırlama',
                description: 'SYSTEM_FULL_ACCESS yetkisi ile tüm kullanıcıların şifrelerini sıfırlayabilirsiniz. POST /api/system/health-check/reset-passwords/ endpoint\'i sıfırlanan şifreleri XLSX dosyası olarak indirir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sistem yönetimi araçları kritik işlemler içerir. Şifre sıfırlama ve veri silme gibi işlemler geri alınamaz. SYSTEM_FULL_ACCESS yetkisi gerektirir.' },
            { type: 'info', text: 'Uyumluluk testleri 9 aşamada çalışır. Her aşama farklı bir sistem modülünü test eder. "Test Verisi Tara" ile mevcut test verilerini bulabilir, "Test Verisi Temizle" ile temizleyebilirsiniz.' },
            { type: 'success', text: 'Gösterge panelinde tüm testlerin geçme oranı yüzdelik olarak gösterilir. %100 oranı sistemin tam uyumlu olduğunu gösterir.' }
        ],
        faq: [
            { q: 'Sistem sağlığı sayfasını göremiyorum', a: 'Bu sayfa PAGE_SYSTEM_HEALTH yetkisi gerektirir. Sadece SYSTEM_FULL_ACCESS rolüne sahip kullanıcılar veya süper kullanıcılar erişebilir.' },
            { q: 'Test başarısız olursa ne yapmalıyım?', a: 'Başarısız testin detayına tıklayarak hata açıklamasını görün. Genellikle eksik ayar, veri tutarsızlığı veya yapılandırma hatasından kaynaklanır. Test çıktısında beklenen (expected) ve gerçekleşen (actual) değerler gösterilir.' },
            { q: 'Yetki denetiminde "çakışma" ne demek?', a: 'Bir çalışana hem doğrudan hem rol üzerinden çelişkili yetkiler atanmışsa çakışma oluşur. Dışlama (exclusion) kuralları miras alınan yetkileri kaldırabilir. Etkili yetki hesaplaması (get_effective_permission_codes) bu çakışmaları çözer.' }
        ]
    },
    {
        id: 'calisanlar',
        title: 'Çalışan Yönetimi',
        icon: Users,
        description: 'Çalışan listesi, profil düzenleme, rol/yetki atamaları, yönetici ilişkileri ve program atama',
        permission: 'PAGE_EMPLOYEES',
        link: '/employees',
        images: [
            { src: '/help-images/admin-calisanlar.png', caption: 'Çalışan Yönetimi — personel listesi, arama/filtre, durum göstergeleri, çalışan detay paneli ve rol atama bölümü' }
        ],
        steps: [
            {
                title: 'Çalışan Listesi',
                description: 'Çalışanlar sayfasında tüm aktif personeli listeleyebilirsiniz. İsim, departman, unvan ve duruma göre arama ve filtreleme yapabilirsiniz. Pasif çalışanlar ayrı filtreyle görüntülenebilir.'
            },
            {
                title: 'Çalışan Detay ve Düzenleme',
                description: 'Çalışana tıklayarak detay sayfasını açın. Kişisel bilgiler, iletişim, departman, pozisyon, işe giriş tarihi ve çalışma programı bilgilerini görüntüleyip düzenleyebilirsiniz.'
            },
            {
                title: 'Rol ve Yetki Atama',
                description: 'Çalışan detayında "Roller" bölümünden rol atayabilirsiniz. Roller yetki paketleri içerir — her rol birden fazla yetki kodu barındırır. Roller miras alınabilir (inheritance) veya belirli yetkiler dışlanabilir (exclusion). Etkili yetki listesi otomatik hesaplanır.'
            },
            {
                title: 'Yönetici Atama (Matris Yönetim)',
                description: 'Birincil (PRIMARY) yönetici = doğrudan amir. Çapraz (CROSS) yönetici = fonksiyonel/proje bazlı yönetici. Her ikisi de onay yetkisine sahiptir. Bu atamalar talep onay süreçlerinde kimin onay vereceğini belirler.'
            },
            {
                title: 'Çalışma Programı Atama',
                description: 'Çalışana mali takvim (FiscalCalendar) ve vardiya şablonu (ScheduleTemplate) atayarak çalışma saatlerini tanımlayın. Bu tanım puantaj hesaplamalarının temelini oluşturur. Departman ve pozisyon bilgisi mali takvim atamasından otomatik türetilebilir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışan silme işlemi geri alınamaz ve ilişkili tüm kayıtları etkiler. Ayrılan personeli silmek yerine "Pasif" durumuna geçirmeniz şiddetle önerilir.' },
            { type: 'info', text: 'Departman ve pozisyon değişikliği, çalışana atanan mali takvimden (FiscalCalendar) otomatik türetilebilir. Bu özellik mali takvim yapılandırmasında ayarlanır.' },
            { type: 'info', text: 'Çalışanın 1:1 Django User kaydı vardır. Kullanıcı adı (username) ve e-posta ile giriş yapılabilir (FlexiblePermissionBackend). Şifre sıfırlama Sistem Yönetimi sayfasından yapılabilir.' },
            { type: 'success', text: 'Çalışan listesini Excel olarak dışa aktarabilirsiniz. Dışa aktarma tüm aktif çalışanları ve seçili filtre kriterlerini içerir.' }
        ],
        faq: [
            { q: 'Yeni çalışan nasıl eklenir?', a: '"Yeni Çalışan" düğmesine tıklayın. İsim, e-posta, departman ve pozisyon bilgilerini girin. Kayıt sonrası çalışana otomatik Django kullanıcı hesabı oluşturulur ve giriş bilgileri atanır.' },
            { q: 'Çalışanın yetkilerini nasıl kontrol ederim?', a: 'Çalışan detayında "Roller" bölümünde atanmış rolleri ve bu rollerin verdiği tüm yetki kodlarını görebilirsiniz. Etkili yetki listesi (get_effective_permission_codes) miras alma ve dışlama kurallarını hesaba katarak gösterilir.' },
            { q: 'Bir çalışanın birden fazla yöneticisi olabilir mi?', a: 'Evet. Birincil (PRIMARY) yönetici doğrudan amirdir. Çapraz (CROSS) yönetici fonksiyonel veya proje bazlı atamalardır. Onay süreçlerinde her ikisi de yetkilidir. Sistem, ApproverService ile 5 katmanlı hiyerarşide yetkili onaylayıcıyı bulur.' }
        ]
    },
    {
        id: 'organizasyon-semasi',
        title: 'Organizasyon Şeması',
        icon: Network,
        description: 'Departman hiyerarşisi, raporlama zincirleri ve çalışan ağacı görünümü',
        permission: 'PAGE_ORG_CHART',
        link: '/organization-chart',
        images: [
            { src: '/help-images/admin-organizasyon.png', caption: 'Organizasyon Şeması — departman ağacı, yönetici-çalışan ilişkileri, zoom/pan kontrolleri ve düğüm detayları' }
        ],
        steps: [
            {
                title: 'Organizasyon Görünümü',
                description: 'Şirketin departman yapısını ağaç görünümünde inceleyebilirsiniz. Her düğüm bir departmanı veya çalışanı temsil eder. Kök düğüm şirketin en üst departmanıdır.'
            },
            {
                title: 'Departman Detayı',
                description: 'Bir departmana tıklayarak o departmandaki çalışanları, departman yöneticisini ve alt departmanları görebilirsiniz.'
            },
            {
                title: 'Raporlama Zinciri',
                description: 'Her çalışanın üstünde birincil (PRIMARY) yöneticisi gösterilir. Bu hiyerarşi izin ve mesai taleplerinde onay akışını belirler. Çapraz (CROSS) yönetici ilişkileri ayrıca gösterilir.'
            },
            {
                title: 'Gezinme ve Yakınlaştırma',
                description: 'Şemayı fare tekerleği ile yakınlaştırıp uzaklaştırabilir, sürükleyerek farklı bölümlere gezebilirsiniz. Büyük organizasyonlarda arama kutusu ile hızlı erişim sağlayabilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Organizasyon şeması çalışan profilleri ve departman atamalarından otomatik oluşturulur. Bir çalışanın departmanını, yöneticisini veya pozisyonunu değiştirdiğinizde şema da güncellenir.' },
            { type: 'success', text: 'Şemayı yakınlaştırıp uzaklaştırabilir ve sürükleyerek gezebilirsiniz. Büyük şemalarda "Sığdır" düğmesi tüm yapıyı ekrana sığdırır.' }
        ],
        faq: [
            { q: 'Organizasyon şeması nasıl güncellenir?', a: 'Şema otomatik olarak çalışan profillerinden ve departman atamalarından üretilir. Değişiklikler anında yansır. Manuel düzenleme gerekmez.' },
            { q: 'Bir departmanın altına yeni birim nasıl eklenir?', a: 'Veri Yönetimi sayfasından veya Çalışan Yönetimi üzerinden yeni departman oluşturun ve üst departmanını belirtin. Organizasyon şemasında otomatik görünecektir.' }
        ]
    },
    {
        id: 'servis-yonetimi',
        title: 'Servis Yönetimi',
        icon: Server,
        description: 'Puantaj hesaplama tetikleme, Celery görev durumu, canlı loglar ve sistem servisleri',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/service-control',
        images: [
            { src: '/help-images/admin-servis-yonetimi.png', caption: 'Servis Yönetimi — tarih seçici ile hesaplama tetikleme, servis durum paneli, Celery görev bilgileri ve canlı log akışı' }
        ],
        steps: [
            {
                title: 'Günlük Hesaplama Tetikleme',
                description: 'Hedef tarih seçerek o gün için tüm çalışanların puantaj hesaplamalarını (giriş/çıkış, mola, fazla mesai, devamsızlık) yeniden başlatabilirsiniz. Bu işlem recalculate_daily_attendance() fonksiyonunu çağırır. Manuel düzeltmelerden sonra veya hesaplama hatası şüphesinde kullanışlıdır.'
            },
            {
                title: 'Otomatik Görevler (Celery Tasks)',
                description: 'Sistem şu otomatik görevleri çalıştırır: Canlı güncelleme (her 30 sn) — anlık çalışma süresi hesaplama. Devamsızlık kontrolü (her 30 sn) — gelmeyenleri ABSENT işaretleme. Gece görevi (00:01) — açık kayıtları kapatma, gece yarısı bölme, devamsızlık oluşturma. İzin tahakkuku (01:00). Mesai sona erme (01:30). Mali takvim uyarıları (09:00). Aylık mutabakat (her ayın 26\'sı, 09:00).'
            },
            {
                title: 'Sistem Durumu Paneli',
                description: 'Sağ panelde Celery worker durumu, Redis bağlantısı, aktif görev sayısı ve son çalışma zamanları gösterilir. Servis çalışmıyorsa uyarı gösterilir.'
            },
            {
                title: 'Canlı Servis Logları',
                description: 'Sayfanın alt kısmında son 100 servis işleminin detaylı loglarını izleyebilirsiniz. Her log satırında zaman damgası, seviye (INFO/WARNING/ERROR), modül adı ve mesaj bilgileri yer alır. Loglar otomatik yenilenir.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Manuel hesaplama tetikleme çalışan sayısına bağlı olarak birkaç saniye ile birkaç dakika sürebilir. İşlem Celery task olarak arka planda çalışır. Birden fazla gün için ardışık tetikleme yapabilirsiniz.' },
            { type: 'info', text: 'Canlı güncelleme (update_attendance_periodic) zaten her 30 saniyede bir çalışır ve açık kayıtları is_live=True modunda hesaplar. Manuel tetiklemeye yalnızca geçmiş kayıtlar veya düzeltme sonrası ihtiyaç duyulur.' },
            { type: 'info', text: 'Gece görevi (daily_midnight_reset, 00:01): (1) Açık kalan mesaileri vardiya bitiş saatinde kapatır, (2) Gece yarısını geçen kayıtları böler, (3) Gelmeyenler için devamsızlık kaydı oluşturur. Bu görev çalışmazsa ertesi gün kayıtlar tutarsız olabilir.' },
            { type: 'success', text: 'Loglar otomatik olarak yenilenir. Hata (ERROR) logları kırmızı, uyarı (WARNING) logları turuncu renkte vurgulanır.' }
        ],
        faq: [
            { q: 'Hesaplama tetikledim ama kayıtlar değişmedi', a: 'Hesaplama mevcut giriş/çıkış verilerine göre yapılır. Veri yoksa veya hatalıysa önce kartsız giriş talebi ile kayıtları oluşturun/düzeltin, sonra yeniden tetikleyin. Celery worker\'ın çalıştığından emin olun.' },
            { q: 'Gece görevi (00:01) ne yapar?', a: 'Üç temel işlem: (1) OPEN durumundaki kayıtları vardiya bitiş saatinde kapatır — bu nedenle çıkış yapmayan çalışanlarda istenmeyen mesai kaydı oluşabilir. (2) Gece yarısını geçen kayıtları her takvim günü için böler. (3) O gün hiç kayıt oluşmamış çalışanları ABSENT (devamsız) olarak işaretler.' },
            { q: 'Celery görevleri çalışmıyorsa ne yapmalıyım?', a: 'Celery worker ve Redis bağlantısını kontrol edin. Railway deployment loglarında worker durumunu görebilirsiniz. Worker yeniden başlatmak için deployment\'ı yenileyin.' }
        ]
    },
    {
        id: 'veri-yonetimi',
        title: 'Veri Yönetimi',
        icon: Database,
        description: 'Yıllık personel matrisi, aylık bakiye takibi, JSON/CSV yedekleme ve içe aktarma',
        permission: 'PAGE_DATA_MANAGEMENT',
        link: '/system-data-management',
        images: [
            { src: '/help-images/admin-veri-yonetimi.png', caption: 'Veri Yönetimi — yıllık personel matrisi (12 ay bakiye tablosu), yedekleme sekmesi (JSON/CSV dışa aktarma, içe aktarma ve deneme modu)' }
        ],
        steps: [
            {
                title: 'Yıllık Personel Matrisi',
                description: 'Tüm çalışanların 12 aylık çalışma bakiyelerini tek tabloda görüntüleyin. Her hücrede o mali dönem için net bakiye (fazla/eksik saat) gösterilir. Kümülatif bakiye son sütunda toplam olarak hesaplanır.'
            },
            {
                title: 'Yıl ve Çalışan Filtresi',
                description: 'Yıl seçiciyle farklı yılları görebilirsiniz. Arama kutusuyla belirli bir çalışanı filtreleyin. Departman filtresiyle belirli bir departmanın matrisini görüntüleyin.'
            },
            {
                title: 'Yedekleme (Dışa Aktarma)',
                description: '"Yedekleme" sekmesinde JSON veya CSV formatında veri dışa aktarma yapabilirsiniz. JSON formatı tam veri yapısını korur (içe aktarma uyumlu), CSV formatı Excel ve diğer tablo uygulamalarıyla uyumlu çıktı verir. Dışa aktarma yetki korumalıdır.'
            },
            {
                title: 'İçe Aktarma ve Deneme Modu',
                description: 'JSON dosyasından veri içe aktarabilirsiniz. UPSERT modu: mevcut kayıtları günceller, olmayanları oluşturur. Deneme Modu (Dry Run): Veritabanını değiştirmeden simülasyon çalıştırır ve kaç kaydın ekleneceğini/güncelleneceğini/atlanacağını raporlar.'
            }
        ],
        tips: [
            { type: 'warning', text: 'İçe aktarma işlemleri geri alınamaz. Mutlaka önce Deneme Modu (Dry Run) ile simülasyon çalıştırın ve sonuçları dikkatle kontrol edin. Doğrulama hataları detaylı gösterilir.' },
            { type: 'info', text: 'Matristeki değerler: Pozitif (yeşil) = hedefin üstünde çalışma (fazla saat), Negatif (kırmızı) = hedefin altında kalma (eksik saat). Değerler MonthlyWorkSummary modeli tarafından hesaplanır.' },
            { type: 'success', text: 'JSON dışa aktarma ile tüm puantaj verilerini tam yapısıyla yedekleyebilirsiniz. Bu yedek dosyası aynı formatta içe aktarılabilir — round-trip veri bütünlüğü korunur.' }
        ],
        faq: [
            { q: 'Yıllık matriste "-6s" ne anlama geliyor?', a: 'O çalışanın o mali dönem için 6 saat eksik çalıştığı anlamına gelir. Hedef çalışma süresinin (şablonda tanımlı toplam saat) altında kalmıştır.' },
            { q: 'Yedekleme dosyasını nasıl geri yüklerim?', a: '"Yedekleme" sekmesinde "İçe Aktar" bölümünden JSON dosyanızı yükleyin. Önce Deneme Modu ile test edin (veritabanı değişmez), sonuçlar olumlu ise gerçek içe aktarmayı başlatın.' },
            { q: 'Dışa aktarmada hangi veriler dahil edilir?', a: 'Çalışan bilgileri, puantaj kayıtları (Attendance), talep geçmişleri (OvertimeRequest, LeaveRequest, MealRequest), rol/yetki atamaları ve mali takvim verileri dahildir. Dışa aktarma formatı (JSON/CSV) seçilebilir.' },
            { q: 'İçe aktarma sırasında çakışma olursa ne olur?', a: 'UPSERT modu kullanılır: mevcut kaydın birincil anahtarı eşleşirse güncellenir, eşleşmezse yeni kayıt oluşturulur. Doğrulama hatası olan satırlar atlanır ve raporda gösterilir.' }
        ]
    },
    {
        id: 'program-yonetimi',
        title: 'Program Yönetimi',
        icon: Package,
        description: 'Harici yazılım envanteri, versiyon takibi ve cihaz erişim yönetimi',
        permission: 'PAGE_PROGRAM_MANAGEMENT',
        link: '/program-management',
        images: [
            { src: '/help-images/admin-program-yonetimi.png', caption: 'Program Yönetimi — yazılım listesi, versiyon bilgileri, durum göstergesi, cihaz erişim kayıtları ve detay paneli' }
        ],
        steps: [
            {
                title: 'Program Listesi',
                description: 'Şirkette kullanılan harici yazılımları listeleyebilirsiniz. Her program için isim, versiyon, lisans durumu ve açıklama bilgileri gösterilir. Özet kartlarında toplam program, aktif program ve kayıtlı cihaz sayıları görünür.'
            },
            {
                title: 'Yeni Program Ekleme',
                description: '"Yeni Program" düğmesine tıklayarak yeni bir yazılım kaydı oluşturun. Program adı, versiyon, lisans bilgisi ve açıklama girin.'
            },
            {
                title: 'Cihaz Erişim Yönetimi',
                description: 'Her program için hangi cihazlarda kurulu olduğunu takip edebilirsiniz. Cihaz ekleme, çıkarma ve erişim durumu güncelleme işlemleri program detay sayfasından yapılır.'
            },
            {
                title: 'Versiyon Yönetimi',
                description: 'Yazılım güncellemelerini takip edin. Yeni versiyon çıktığında kaydı güncelleyerek kurulum durumunu ve uyumluluk bilgisini izleyebilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Sol listeden bir program seçerek sağ panelde tüm detaylarını (versiyon geçmişi, cihaz listesi, lisans bilgisi) görüntüleyebilirsiniz.' },
            { type: 'warning', text: 'Bir programı sildiğinizde ilişkili tüm cihaz erişim kayıtları da kalıcı olarak kaldırılır. Kullanılmayan programları silmek yerine "Pasif" durumuna geçirmeyi tercih edebilirsiniz.' },
            { type: 'success', text: 'Bu sayfayı görmek için PAGE_PROGRAM_MANAGEMENT yetkisi gereklidir.' }
        ],
        faq: [
            { q: 'Program yönetimi sayfasını göremiyorum', a: 'Bu sayfa PAGE_PROGRAM_MANAGEMENT yetkisi gerektirir. Sistem yöneticinize başvurarak yetki tanımlamasını isteyin.' },
            { q: 'Bir programı silersem cihaz kayıtları da silinir mi?', a: 'Evet. Program silindiğinde ilişkili tüm cihaz erişim kayıtları da kalıcı olarak kaldırılır. Bu işlem geri alınamaz.' }
        ]
    }
];

export default helpContent;
