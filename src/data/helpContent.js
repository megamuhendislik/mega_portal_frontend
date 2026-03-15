import {
    Clock, CalendarDays, Timer, Utensils, Calendar,
    Contact, CheckSquare, BarChart3, CalendarRange, Shield,
    Users, Network, Server, Database, Package,
    MessageSquare, UserCheck, HeartPulse
} from 'lucide-react';

const helpContent = [
    {
        id: 'giris-cikis',
        title: 'Giriş / Çıkış',
        icon: Clock,
        description: 'Kart okutma ile giriş/çıkış, canlı durum takibi, mola hesaplama, tolerans kuralları, haftalık OT limiti ve aylık performans özeti',
        permission: null,
        link: '/',
        images: [
            { src: '/help-images/02-dashboard-top.png', caption: 'Ana sayfa üst bölüm — 5 özet kartı (Bugün Çalışma, Kalan Mola, Fazla Mesai, İzin Durumu, Doğum Günü İzni) ve haftalık OT limit çubuğu' },
            { src: '/help-images/02-dashboard-full.png', caption: 'Ana sayfa tam görünüm — puantaj grafiği, son aktiviteler, yaklaşan etkinlikler ve aylık performans özeti karuseli' },
            { src: '/help-images/02a-dashboard-admin.png', caption: 'Yönetici dashboard görünümü — ekip özeti kartları, bekleyen onay sayısı ve yönetici hızlı aksiyonları' },
            { src: '/help-images/02b-dashboard-employee.png', caption: 'Çalışan dashboard görünümü — kişisel çalışma metrikleri, bakiye bilgileri ve yaklaşan etkinlikler' }
        ],
        steps: [
            {
                title: 'Kart Okutma ile Giriş Yapma',
                description: 'İşe geldiğinizde kartınızı kart okuyucu cihaza okutun. Sistem giriş saatinizi otomatik olarak kaydeder ve mesainiz başlar. Giriş kaydınız anlık olarak sisteme yansır ve dashboard\'daki "Bugün Çalışma" kartında çalışma süreniz sayılmaya başlar. Kart okuyucu cihaz Fernet şifreleme ile güvenli iletişim kurar ve her okutma benzersiz event_id ile kaydedilir, böylece çift okutma riski ortadan kalkar. Giriş saatiniz servis toleransı kapsamındaysa (servis kullanan personel için) vardiya başlangıç saatine yuvarlanır; örneğin vardiya 08:00\'da başlıyorsa ve siz 07:55\'te okuttaysanız, giriş saatiniz 08:00 olarak kaydedilir.',
                image: { src: '/help-images/02-dashboard-top.png', caption: 'Ana sayfa üst bölüm — 5 özet kartı ve haftalık OT limit çubuğu' }
            },
            {
                title: 'Canlı Durum Takibi — 5 Özet Kartı',
                description: 'Dashboard\'ın üst kısmında 5 özet kartı ile anlık durumunuzu görebilirsiniz:\n\n(1) Bugün Çalışma (mavi saat ikonu) — Toplam çalışılan süre (saat:dakika formatında) ve günlük hedef çalışma süresi. İlerleme çubuğu hedefe göre yüzdeyi gösterir. Hedefi aştığınızda çubuk yeşile döner.\n\n(2) Kalan Mola (kahve ikonu) — Kullanılan mola süresi / günlük mola hakkı (genellikle 30 dakika). İlerleme çubuğu mola kullanımınızı gösterir. %80\'i aştığınızda turuncu, %100\'ü aştığınızda kırmızı olur.\n\n(3) Fazla Mesai (saat ikonu) — Onaylanan, bekleyen ve potansiyel fazla mesai dakikaları ayrı ayrı gösterilir. Toplam OT süresi ana rakam olarak görünür.\n\n(4) İzin Durumu (takvim ikonu) — Yıllık izin bakiyesi (gün olarak) ve mazeret izni bakiyesi (saat olarak, yıllık 18 saat). Her iki bakiye de kalan/toplam formatında gösterilir.\n\n(5) Doğum Günü İzni (pasta ikonu, pembe) — Sadece doğum ayınızda görünür. Kalan doğum günü izin hakkınız gösterilir.\n\nBu veriler her 60 saniyede bir otomatik güncellenir (smart polling). Tarayıcı sekmesini kapattığınızda güncelleme durur, tekrar açtığınızda anında yenilenir — bu sayede gereksiz sunucu yükü oluşmaz.',
                image: { src: '/help-images/02b-dashboard-employee.png', caption: 'Çalışan dashboard — kişisel çalışma metrikleri ve bakiye bilgileri' }
            },
            {
                title: 'Haftalık Fazla Mesai Limiti Çubuğu',
                description: 'Fazla mesai kartının hemen altında haftalık OT limit ilerleme çubuğu bulunur. Bu çubuk, son 7 günlük penceredeki toplam fazla mesai saatinizi (ONAYLANMIŞ + BEKLEYEN) haftalık limitinize (varsayılan 30 saat) karşı gösterir. Renk kodları şu şekildedir:\n\n• Yeşil (%0–70): Güvenli bölge, limitin altındasınız.\n• Turuncu (%70–90): Dikkat bölgesi, limite yaklaşıyorsunuz.\n• Kırmızı (%90–99): Tehlike bölgesi, limit dolmak üzere.\n• Kırmızı pulsar animasyon (%100): Limit dolu! Yeni mesai talebi oluşturamazsınız.\n\nÇubuğun üzerinde "Kullanılan / Limit" saat değerleri (örn: "24.5 / 30 saat") gösterilir. Limit dolduğunda mesai talep formlarında kırmızı uyarı mesajı çıkar ve "Gönder" butonu devre dışı kalır.'
            },
            {
                title: 'Mola Kullanımı ve Header Göstergesi',
                description: 'Gün içinde mola vermek için kart okuyucu ile çıkış yapın, dönüşünüzde tekrar giriş yapın. İki okutma arasındaki süre "potansiyel mola" olarak hesaplanır ve toplam mola sürenize eklenir. Sayfanın üst menü çubuğunda (header) kahve ikonu ile mola durumunuz anlık gösterilir:\n\n• Mavi (Coffee ikonu) — Normal: Mola hakkınızın altındasınız (örn: "12/30 dk").\n• Turuncu (Coffee ikonu, titreşim) — Dikkat: Mola hakkınızın %80\'ini kullandınız.\n• Kırmızı (AlertTriangle ikonu) — Aşım: Mola hakkınız aşıldı, aşan süre çalışma sürenizden kesilecek.\n\nGünlük mola hakkı genellikle 30 dakikadır ve çalışma programınızdan (ScheduleTemplate) okunur. Bu süre toplam çalışma sürenizden otomatik düşülür. Örneğin 9 saat çalıştıysanız ve 30 dk mola hakkınız varsa, net çalışma = 8.5 saat olarak hesaplanır.'
            },
            {
                title: 'Çıkış Yapma ve Mesai Sonu',
                description: 'Mesai bitiminde kartınızı tekrar okutarak çıkış yapın. Sistem çıkış saatinizi kaydeder ve günlük çalışma sürenizi otomatik hesaplar. Çıkış saatiniz servis toleransı kapsamındaysa vardiya bitiş saatine yuvarlanır. Çıkış yapmadan ayrılırsanız kaydınız "AÇIK" (OPEN) durumda kalır ve gece yarısı otomatik görevi (00:01) bu kaydı vardiya bitiş saatinde zorla kapatır. Bu durum istenmeyen sonuçlara yol açabilir:\n\n• Vardiya bitiş saatinden gece yarısına kadar olan süre "Potansiyel Ek Mesai" olarak algılanabilir.\n• Puantajınızda yanlış çalışma süresi görünebilir.\n• Gece mesai bölme (midnight split) tetiklenebilir.\n\nBu nedenle çıkış yapmayı unutmayın. Eğer unuttuysanız, ertesi gün "Kartsız Giriş Talebi" ile düzeltme yapabilirsiniz.'
            },
            {
                title: 'Son Aktiviteler Paneli',
                description: 'Dashboard\'un sağ panelinde "Son Aktiviteler" bölümünde son talep durumlarınız listelenir. Her aktivite kartında:\n\n• Talep türü ikonu (izin/mesai/kartsız giriş/sağlık raporu)\n• Talep başlığı ve kısa açıklama\n• Durum badge\'i: Onaylandı (yeşil ✓), Reddedildi (kırmızı ✗), Bekliyor (amber saat), İptal (gri)\n• Tarih ve saat bilgisi\n\nSon 10 aktivite gösterilir. Tüm taleplerinizi görmek için "Tümünü Gör" linkine tıklayarak Talepler sayfasına gidebilirsiniz.'
            },
            {
                title: 'Yaklaşan Etkinlikler',
                description: 'Dashboard\'un sağ panelinde "Yaklaşan Etkinlikler" bölümü önümüzdeki 14 güne ait etkinlikleri listeler. Etkinlik türleri ve renk kodları:\n\n• Kırmızı — Resmi tatiller (Cumhuriyet Bayramı, Ramazan Bayramı vb.). Ardışık tatiller otomatik birleştirilir (örn: "Ramazan Bayramı, 3 gün").\n• Yeşil — Onaylanan izinleriniz\n• Mor (violet) — Size atanan ek mesai görevleri\n• Amber — Bekleyen mesai talepleriniz\n• Pembe — Sağlık raporu günleri\n• Mavi — Kişisel takvim etkinlikleriniz\n\nHer etkinlikte tarih, başlık ve kalan gün bilgisi gösterilir. Yarım gün tatiller "(Yarım Gün)" etiketi ile belirtilir.'
            },
            {
                title: 'Aylık Performans Özeti ve Bakiye Karuseli',
                description: 'Dashboard\'un alt bölümünde aylık performans özeti karuseli bulunur. Sol/sağ ok butonlarıyla aylar arasında gezinebilirsiniz. Her ay kartında:\n\n• Ay adı ve mali dönem tarihi (örn: "Mart 2026 — 26 Şub – 25 Mar")\n• Hedef çalışma süresi (saat)\n• Gerçekleşen çalışma süresi (saat)\n• Fark (bakiye): Pozitif = hedefin üstünde (yeşil), Negatif = eksik çalışma (kırmızı)\n• Onaylı fazla mesai süresi\n• İzin günleri\n• Sağlık raporu günleri\n\nBu veriler MonthlyWorkSummary modelinden çekilir ve mali dönem bazlıdır (26-25 kuralı). Kilitli dönemler kilit ikonu ile işaretlenir.'
            },
            {
                title: 'Puantaj Grafiği',
                description: 'Dashboard\'un orta bölümünde geçerli mali dönemin günlük çalışma süreleri çubuk grafik olarak gösterilir. Her gün için:\n\n• Mavi çubuk — Normal çalışma süresi\n• Mor çubuk — Fazla mesai süresi\n• Kırmızı nokta — Eksik çalışma\n• Gri arka plan — Tatil/izin günleri\n\nGrafiğin üzerinde fare ile gezinerek o günün detaylarını (giriş saati, çıkış saati, toplam çalışma, mola, fazla mesai) tooltip olarak görebilirsiniz. Grafik Recharts kütüphanesi ile oluşturulur ve responsive tasarıma sahiptir.'
            },
            {
                title: 'Doğum Günü Kutlaması',
                description: 'Doğum gününüzde dashboard\'da özel kutlama banner\'ı görünür. Banner\'da konfeti animasyonu, kutlama mesajı ve doğum günü pastası ikonu yer alır. Doğum günü izin hakkınız varsa pembe kartta kalan gün bilgisi gösterilir. Banner\'ı "Bir daha gösterme" seçeneği ile o gün için kapatabilirsiniz — tercih localStorage\'da saklanır ve ertesi yıl tekrar görünür.'
            }
        ],
        tips: [
            { type: 'info', text: 'Tolerans Türleri: Sistemde 3 bağımsız tolerans mekanizması vardır:\n\n(1) Servis Toleransı (varsayılan 0 dk, takvim şablonunda tanımlanır) — Sadece "servis kullanıyor" işaretli çalışanlar için geçerlidir. Giriş/çıkış okutmalarını vardiya başlangıç/bitiş saatlerine yuvarlar (snap). Servis toleransı 0 ise yuvarlama yapılmaz. Takvimden okunur, çalışan seviyesinde override edilebilir.\n\n(2) Normal Tolerans / Geç Kalma Toleransı (varsayılan 30 dk) — Tüm çalışanlar için geçerlidir. Vardiya bitiş saatinden sonraki "uzatma penceresi"dir. Bu süre içinde yapılan çıkış normal mesai sayılır, fazla mesai oluşmaz. Mesai eksiğiniz varsa bu pencerede önce eksik kapatılır, kalan kısım OT sayılır. Takvimden okunur, çalışan seviyesinde override YOKTUR.\n\n(3) Minimum OT Eşiği (varsayılan 30 dk) — Günlük toplam fazla mesai süresi bu eşiğin altındaysa sıfırlanır ve POTANSIYEL kayıt oluşturulmaz. Örneğin 25 dk fazla mesainiz varsa ve eşik 30 dk ise, bu süre kaydedilmez.' },
            { type: 'info', text: 'Mola Hesaplama Detayı: Günlük mola hakkı (varsayılan 30 dk) çalışma programı şablonunuzda (ScheduleTemplate) tanımlıdır. Gün içinde her çıkış-giriş arası "potansiyel mola" olarak sayılır. Toplam potansiyel mola süreniz header\'daki kahve ikonunda takip edilir. Mola hakkınızı aşarsanız, aşan kısım net çalışma sürenizden kesilir. Örnek: 8 saat kart okutma arası, 45 dk toplam mola, 30 dk hak → net çalışma = 8 saat - 30 dk (hak) = 7.5 saat, 15 dk aşım kırmızı gösterilir.' },
            { type: 'warning', text: 'Çıkış yapmadan (kart okutmadan) ayrılmayın! Kaydınız "AÇIK" (OPEN) kalır ve gece yarısı otomatik görevi (00:01) bu kaydı vardiya bitiş saatinde kapatır. Bu durum:\n• Vardiya sonundan gece yarısına kadar sahte "Potansiyel Ek Mesai" kaydı oluşturabilir.\n• Puantajınızda yanlış çalışma süresi görünebilir.\n• Gece yarısı bölme (midnight split) tetiklenerek iki ayrı kayıt oluşabilir.\nDüzeltme için ertesi gün "Kartsız Giriş Talebi" oluşturmanız gerekir.' },
            { type: 'success', text: 'Kartınızı Unuttuysanız veya Kart Okuyucu Arızalıysa: Talepler sayfasından (sol menüde "Talepler" → "Kendi Taleplerim" sekmesi) "Yeni Talep" butonuna basarak "Kartsız Giriş Talebi" oluşturun. Giriş ve çıkış saatlerinizi, çalışma nedeninizi belirtin. Talep birincil yöneticinize gider; onaylandığında puantaj kaydınız otomatik oluşturulur ve hesaplama tetiklenir. Bu talepler geçmiş 2 mali ay içindeki tarihler için verilebilir.' },
            { type: 'info', text: 'Doğum Günü: Dashboard\'da doğum gününüzde özel kutlama banner\'ı (konfeti animasyonu) görünür. Doğum ayınızda "Doğum Günü İzni" kullanma hakkınız varsa pembe kartta kalan gün bilgisi gösterilir. Banner\'ı "Bir daha gösterme" ile o gün için kapatabilirsiniz.' },
            { type: 'info', text: 'Smart Polling: Dashboard verileri her 60 saniyede otomatik güncellenir. Tarayıcı sekmenizi kapattığınızda (veya arka plana aldığınızda) sunucu istekleri otomatik durur, sekmeye geri döndüğünüzde anında yenilenir. Bu özellik useSmartPolling hook\'u ile sağlanır ve gereksiz sunucu yükünü önler.' },
            { type: 'warning', text: 'Yönetici Dashboard\'u: Yönetici yetkisi olan kullanıcılar dashboard\'da ek olarak "Bekleyen Onaylar" sayacı, ekip özeti kartları ve hızlı aksiyon butonları görür. Bekleyen onay sayısı kırmızı badge ile gösterilir ve tıklanarak doğrudan Gelen Talepler sekmesine gidilir.' },
            { type: 'success', text: 'Mobil Uyumluluk: Dashboard tamamen responsive tasarıma sahiptir. Mobil cihazlarda kartlar tek sütun halinde gösterilir, puantaj grafiği yatay kaydırılabilir ve header\'daki mola göstergesi kompakt formatta görünür.' }
        ],
        faq: [
            { q: 'Kart okutmayı unuttum, ne yapmalıyım?', a: 'Talepler sayfasından "Kartsız Giriş Talebi" oluşturun. Sol menüde "Talepler" → "Kendi Taleplerim" sekmesinde "Yeni Talep" butonuna basın, "Kartsız Giriş" türünü seçin. Giriş ve çıkış saatlerinizi belirtin, çalışma nedeninizi açıklayın. Talep birincil yöneticinize gider ve onaylandığında puantaj kaydınız otomatik oluşturulur, günlük hesaplama tetiklenir. Bu talepler geçmiş 2 mali ay (yaklaşık 60 gün) içindeki tarihler için verilebilir. Tatil ve hafta sonu günleri için kartsız giriş talebi kabul edilmez (çalışma programınızda o gün "tatil" olarak tanımlıysa).' },
            { q: 'Gece fazla mesai yaptım, kayıtlarım nasıl hesaplanır?', a: 'Gece 00:00\'ı geçen kayıtlar sistem tarafından özel olarak işlenir. Gece yarısı otomatik görevi (00:01) açık kalan kayıtları 23:59:59\'da kapatır ve gerekirse ertesi gün için yeni kayıt oluşturur (midnight split). Bu işlem gece mesai yapanların kaydını günlere doğru böler. Ancak kartsız çıkışları ayıklamak için 00:00 sonrası açık kayıtlar da otomatik kapatılır. Gece mesaisine devam ediyorsanız, gece yarısı öncesi ve sonrası ayrı kart okutma yapmanız en doğru sonucu verir. ENABLE_NIGHT_SHIFT_SUPPORT özellik bayrağı kapalıysa saatler 23:59:59\'da kesilir.' },
            { q: 'Mola sürem neden azalıyor?', a: 'Gün içinde her çıkış-giriş arasındaki süre "potansiyel mola" olarak hesaplanır. Örneğin öğlen 12:00\'da çıkıp 12:45\'te giriş yaptıysanız, 45 dakika potansiyel mola kaydedilir. Toplam potansiyel mola süreniz header\'daki kahve ikonunda gösterilir. Günlük mola hakkınız (genellikle 30 dk) çalışma sürenizden otomatik düşülür. Hakkınızı aşarsanız (örn: 45 dk mola, 30 dk hak → 15 dk aşım), aşan kısım ek çalışma süresi düşümü olarak uygulanır ve header\'da kırmızı uyarı gösterilir.' },
            { q: 'Fazla mesai nasıl algılanır? Hangi durumlarda potansiyel oluşur?', a: 'Sistem şu koşullarda otomatik "Potansiyel Ek Mesai" kaydı oluşturur:\n\n(1) Vardiya sonrası: Vardiya bitiş saatiniz 18:00 ve geç kalma toleransı 30 dk ise, 18:30\'dan sonra çıkış yaptığınızda fazla mesai hesaplanır. Mesai eksiğiniz varsa önce o kapatılır (deficit-fill), kalan süre OT olur.\n\n(2) Vardiya öncesi: Vardiya başlangıcından önce erken giriş yaptığınızda (örn: 07:00 giriş, vardiya 08:00) PRE_SHIFT potansiyel mesai oluşur.\n\n(3) Tatil günü: Çalışma programınızda tatil olan bir günde çalıştıysanız OFF_DAY mesaisi algılanır.\n\nHer durumda günlük toplam OT süresi minimum eşiği (varsayılan 30 dk) geçmelidir, aksi halde kayıt oluşturulmaz.' },
            { q: 'Aylık performans özeti nedir ve nasıl hesaplanır?', a: 'Dashboard\'un alt kısmındaki aylık performans karuseli, her mali dönem için çalışma bakiyenizi gösterir. Hesaplama: MonthlyWorkSummary modeli mali dönem (26-25) bazında toplam çalışma süresini, hedef süreyi, fazla mesaiyi, izin günlerini ve sağlık raporu günlerini tutar. Bakiye = Gerçekleşen - Hedef. Pozitif bakiye (yeşil) hedefin üstünde çalıştığınızı, negatif bakiye (kırmızı) eksik çalışmanızı gösterir. Sağlık raporu ve izin günleri hedeften düşülür.' },
            { q: 'Bakiye negatif görünüyor, ne anlama geliyor?', a: 'Negatif bakiye, o mali dönemde hedef çalışma süresinin altında kaldığınızı gösterir. Örneğin hedef 176 saat, çalışılan 170 saat ise bakiye = -6 saat. Bu durum geç kalmalar, erken çıkışlar veya eksik günlerden kaynaklanabilir. Onaylanan fazla mesailer pozitif bakiye oluşturur. Kilitli dönemlerdeki bakiyeler değiştirilemez.' },
            { q: 'Dashboard\'daki veriler ne sıklıkla güncellenir?', a: 'Dashboard verileri smart polling ile her 60 saniyede otomatik güncellenir. Canlı durum (giriş/çıkış) ise backend\'de her 30 saniyede Celery task ile hesaplanır. Sekmenizi kapattığınızda istekler durur, geri açtığınızda anında yenilenir. Manuel yenileme için sayfayı yenileyebilirsiniz (F5).' },
            { q: 'Admin ve çalışan dashboard\'u arasındaki fark nedir?', a: 'Çalışan dashboard\'u kişisel metrikleri gösterir: çalışma süresi, mola, izin bakiyesi, potansiyel mesai. Yönetici dashboard\'u ek olarak ekip özeti kartları (toplam çalışan, ofiste olan, izinli, devamsız), bekleyen onay sayısı (kırmızı badge) ve hızlı aksiyon butonları (mesai ata, onay listesine git) içerir. Admin dashboard\'unda tüm departmanların özet istatistikleri de görülebilir.' }
        ]
    },
    {
        id: 'profil',
        title: 'Profilim',
        icon: Users,
        description: 'Kişisel bilgiler, iletişim, bildirim tercihleri ve şifre yönetimi',
        permission: null,
        link: '/profile',
        images: [
            { src: '/help-images/03a-profile-overview.png', caption: 'Profil sayfası genel görünüm — sol panel (avatar, ad-soyad, departman, sicil no) ve sağ panel sekmeler' },
            { src: '/help-images/03-profile-personal.png', caption: 'Kişisel Bilgiler sekmesi — ad, soyad, e-posta, TC kimlik, doğum tarihi, telefon alanları' },
            { src: '/help-images/03-profile-contact.png', caption: 'İletişim sekmesi — ikinci telefon, adres, acil durum kişisi bilgileri' },
            { src: '/help-images/03-profile-notifications.png', caption: 'Bildirimler sekmesi — 7 bildirim tercih toggle\'ı' },
            { src: '/help-images/03-profile-security.png', caption: 'Güvenlik sekmesi — şifre değiştirme formu (eski şifre, yeni şifre, onay)' }
        ],
        steps: [
            {
                title: 'Profil Sayfası Genel Görünüm',
                description: 'Sol menüden "Profilim" seçeneğine tıklayarak veya sağ üst köşedeki avatar ikonuna tıklayarak profil sayfanıza ulaşabilirsiniz. Sayfa iki panelden oluşur:\n\n• Sol Panel — Büyük yuvarlak avatar (adınızın ve soyadınızın baş harflerinden otomatik oluşturulur, ID bazlı 10 farklı arka plan rengi), altında tam adınız, departman adınız, pozisyonunuz ve personel sicil numaranız gösterilir.\n\n• Sağ Panel — 4 sekme: Kişisel Bilgiler, İletişim, Bildirimler, Güvenlik. Her sekme ayrı bir form içerir ve bağımsız olarak kaydedilebilir.',
                image: { src: '/help-images/03a-profile-overview.png', caption: 'Profil sayfası genel görünüm' }
            },
            {
                title: 'Kişisel Bilgiler Sekmesi',
                description: 'Bu sekmede kişisel bilgilerinizi görüntüleyebilir ve düzenleyebilirsiniz:\n\n• Ad ve Soyad — Salt okunur (gri arka plan, kilit ikonu). Yönetici tarafından Çalışan Yönetimi\'nden güncellenir.\n• E-posta — Düzenlenebilir. Geçerli e-posta formatı zorunludur. Sisteme giriş için de kullanılabilir.\n• TC Kimlik No — Hassas veri, kilit ikonu ile korunur. Düzenlemek için SENSITIVE_DATA_CHANGE yetkisi gerekir. KVKK kapsamında maskeleme uygulanır (ilk/son 3 hane görünür, ortası yıldızlı).\n• Doğum Tarihi — Tarih seçici ile düzenlenebilir. Doğum günü izni hesaplamasında kullanılır.\n• Telefon — Cep telefonu numarası. Şirket Rehberi\'nde görünür.\n\nDeğişiklikleri kaydetmek için formun altındaki "Kaydet" butonuna tıklayın. Başarılı kayıt sonrası yeşil bildirim mesajı gösterilir.',
                image: { src: '/help-images/03-profile-personal.png', caption: 'Kişisel Bilgiler sekmesi' }
            },
            {
                title: 'İletişim Sekmesi',
                description: '"İletişim" sekmesinde ek iletişim bilgilerinizi yönetebilirsiniz:\n\n• İkinci Telefon Numarası — Alternatif iletişim numaranız.\n• Adres — Serbest metin alanı, ev/iş adresi yazabilirsiniz.\n• Acil Durum İletişim: Kişi Adı — Acil durumda aranacak kişinin tam adı.\n• Acil Durum İletişim: Telefon — Acil durum kişisinin telefon numarası.\n\nBu bilgiler Şirket Rehberi\'nde ve İK kayıtlarında görünür. Acil durum bilgileri iş güvenliği açısından önemlidir, güncel tutmanız önerilir.',
                image: { src: '/help-images/03-profile-contact.png', caption: 'İletişim sekmesi — iletişim bilgileri ve acil durum kişisi' }
            },
            {
                title: 'Bildirimler Sekmesi',
                description: '"Bildirimler" sekmesinde 7 farklı bildirim türünün açık/kapalı durumunu yönetebilirsiniz. Her bildirim türü bir toggle (açma/kapama) düğmesi ile kontrol edilir:\n\n1. İzin Onaylandı (yeşil çerçeve) — İzin talebiniz onaylandığında bildirim alın.\n2. İzin Reddedildi (kırmızı çerçeve) — İzin talebiniz reddedildiğinde bildirim alın.\n3. Mesai Onaylandı (yeşil çerçeve) — Fazla mesai talebiniz onaylandığında bildirim alın.\n4. Mesai Reddedildi (kırmızı çerçeve) — Fazla mesai talebiniz reddedildiğinde bildirim alın.\n5. Vekâlet Talepleri (amber çerçeve) — Size vekâlet verildiğinde veya vekâlet süresi değiştiğinde bildirim alın.\n6. Eskalasyon Uyarıları (turuncu çerçeve) — Talepleriniz üst yönetime eskalasyon edildiğinde bildirim alın.\n7. Sistem Duyuruları (mavi çerçeve) — Genel sistem duyuruları ve bakım bildirimleri alın.\n\nHer toggle\'ın yanında açıklama metni bulunur. Tercihiniz anında kaydedilir (ayrı kaydet butonu yoktur). Kapatılan bildirim türleri için uygulama içi bildirim almayacaksınız.',
                image: { src: '/help-images/03-profile-notifications.png', caption: 'Bildirimler sekmesi — 7 bildirim tercih toggle\'ı' }
            },
            {
                title: 'Güvenlik Sekmesi — Şifre Değiştirme',
                description: '"Güvenlik" sekmesinden şifrenizi değiştirebilirsiniz. Form üç alandan oluşur:\n\n1. Eski Şifre — Mevcut şifrenizi girin. Göz ikonu ile göster/gizle yapabilirsiniz.\n2. Yeni Şifre — En az 6 karakter uzunluğunda yeni şifrenizi belirleyin. Güçlü şifre için büyük/küçük harf, rakam ve özel karakter kombinasyonu kullanın. Göz ikonu mevcuttur.\n3. Yeni Şifre Onayı — Yeni şifrenizi tekrar girin. İki alan eşleşmelidir.\n\n"Şifreyi Değiştir" butonuna tıklayarak işlemi tamamlayın. Başarılı değişiklik sonrası bildirim mesajı gösterilir. Sistem yöneticisi şifrenizi sıfırladıysa (Sistem Sağlığı > Şifre Sıfırlama), ilk girişte otomatik olarak bu sekmeye yönlendirilirsiniz ve şifrenizi değiştirmeniz zorunlu tutulur.',
                image: { src: '/help-images/03-profile-security.png', caption: 'Güvenlik sekmesi — şifre değiştirme formu' }
            },
            {
                title: 'Sol Panel Bilgileri ve Avatar',
                description: 'Sol paneldeki avatar, adınızın ve soyadınızın baş harflerinden otomatik oluşturulur (örn: "Ahmet Yılmaz" → "AY"). Arka plan rengi çalışan ID\'nize göre 10 farklı renkten biri atanır ve tüm sayfalarda tutarlıdır. Avatar altında departman adınız ve pozisyon bilginiz gösterilir. Sicil numaranız (personel no) küçük gri metin olarak en altta yer alır. Bu bilgiler yönetici tarafından atanır ve salt okunurdur.'
            }
        ],
        tips: [
            { type: 'info', text: 'Salt Okunur Alanlar: Ad, soyad, departman, pozisyon ve sicil numarası bilgileri yönetici tarafından Çalışan Yönetimi sayfasından güncellenir. Bu alanlar profil sayfanızda gri arka plan ve kilit ikonu ile gösterilir. Değiştirmek için İK birimine veya yöneticinize başvurun.' },
            { type: 'warning', text: 'Şifre Kuralları: Yeni şifreniz en az 6 karakter olmalıdır. Güçlü bir şifre için büyük harf (A-Z), küçük harf (a-z), rakam (0-9) ve özel karakter (!@#$%^&*) kombinasyonu kullanın. Eski şifreniz ile aynı olamaz. Üst üste 5 başarısız giriş denemesinden sonra hesabınız geçici olarak kilitlenebilir.' },
            { type: 'info', text: 'Bildirim Tercihleri: Kapatılan bildirim türleri için uygulama içi bildirim almayacaksınız. Ancak önemli bildirimleri (izin onay/red, mesai onay/red) kapatmamanız şiddetle önerilir — aksi halde talep durumunuzdaki değişikliklerden habersiz kalabilirsiniz. Sistem duyuruları genellikle bakım ve kesinti bilgileri içerir.' },
            { type: 'success', text: 'Avatar ve İsim Bilgisi: Sol paneldeki avatar ve isim bilginiz tüm sayfalarda tutarlıdır — üst çubuğun sağ köşesinde, yan menüde, Şirket Rehberi\'nde ve Organizasyon Şeması\'nda aynı avatar görünür. Fotoğraf yükleme özelliği şu an desteklenmemektedir; avatar otomatik baş harflerden oluşturulur.' },
            { type: 'info', text: 'TC Kimlik No Güvenliği: TC kimlik numarası KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında hassas veri olarak sınıflandırılmıştır. Ekranda ilk 3 ve son 3 hane görünür, ortası yıldızlı (***) olarak maskelenir. Tam değeri görmek veya düzenlemek için SENSITIVE_DATA_CHANGE yetkisi gerekir.' },
            { type: 'warning', text: 'İlk Giriş Şifre Zorunluluğu: Sistem yöneticisi tarafından şifreniz sıfırlandıysa, ilk girişte otomatik olarak Güvenlik sekmesine yönlendirilirsiniz. Yeni şifre belirlemeden sistemi kullanamazsınız. Bu güvenlik önlemi, geçici şifrelerin kalıcı olarak kullanılmasını önler.' }
        ],
        faq: [
            { q: 'Departman veya pozisyon bilgimi nasıl değiştiririm?', a: 'Departman ve pozisyon bilgileri yönetici tarafından Çalışan Yönetimi sayfasından (sol menü > "Çalışanlar") güncellenir. Profil sayfanızda bu alanlar salt okunurdur (gri arka plan, kilit ikonu). Değişiklik için İK birimine veya doğrudan yöneticinize başvurun. Birincil yöneticiniz değiştiğinde departman ve pozisyon bilgileriniz de otomatik güncellenebilir (ilk birincil yöneticinin departmanı/pozisyonu çalışana atanır).' },
            { q: 'Şifremi unuttum, ne yapmalıyım?', a: 'Sistem yöneticinize başvurun. Admin panelinden (Sistem Sağlığı > Şifre Sıfırlama sekmesi) şifreniz toplu veya bireysel olarak sıfırlanabilir. Sıfırlanan geçici şifreler XLSX dosyası olarak yöneticiye iletilir. İlk girişte yeni şifre belirlemeniz istenecektir. Şu an self-servis şifre sıfırlama (e-posta ile) desteklenmemektedir.' },
            { q: 'TC kimlik numaram neden kilitli görünüyor?', a: 'TC kimlik numarası KVKK kapsamında hassas veri olarak sınıflandırılmıştır. Düzenlemek için SENSITIVE_DATA_CHANGE yetkisine sahip bir yönetici veya sistem yöneticisinin işlem yapması gerekir. Bu alan ekranda maskelenmiş (***) olarak gösterilir. Kilit ikonu alanın korumalı olduğunu belirtir.' },
            { q: 'Bildirim tercihlerimi değiştirdim ama hâlâ bildirim alıyorum?', a: 'Bildirim tercihleri anında kaydedilir ancak mevcut işlem sırasındaki bildirimler zaten kuyruğa alınmış olabilir. Değişiklik sonrası oluşan yeni bildirimlerde tercihiniz geçerli olacaktır. Ayrıca bazı kritik sistem bildirimleri (güvenlik uyarıları gibi) tercihten bağımsız olarak gönderilir.' },
            { q: 'Profilimde fotoğraf yükleyebilir miyim?', a: 'Şu an profil fotoğrafı yükleme özelliği desteklenmemektedir. Avatar, adınızın ve soyadınızın baş harflerinden otomatik oluşturulur ve çalışan ID\'nize göre 10 farklı arka plan renginden biri atanır. Bu avatar tüm sayfalarda tutarlı olarak gösterilir.' },
            { q: 'E-posta adresimi değiştirebilir miyim?', a: 'Evet, Kişisel Bilgiler sekmesinde e-posta alanı düzenlenebilirdir. Geçerli e-posta formatı zorunludur. E-posta adresi sisteme giriş için kullanıcı adı alternatifi olarak kullanılabilir (FlexiblePermissionBackend e-posta veya kullanıcı adı ile girişi destekler). Değişiklik sonrası "Kaydet" butonuna tıklamayı unutmayın.' }
        ]
    },
    {
        id: 'izin-talepleri',
        title: 'İzin Talepleri',
        icon: CalendarDays,
        description: 'Yıllık izin, mazeret izni, doğum günü izni, avans izin başvurusu, FIFO düşüm sistemi, bakiye takibi ve onay süreçleri',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/10-requests-my.png', caption: 'Kendi Taleplerim sekmesi — izin/mesai/kartsız giriş talep listesi, durum filtreleri ve yeni talep oluşturma butonu' },
            { src: '/help-images/10b-requests-manager.png', caption: 'Yönetici görünümü — gelen talepler, onay/red butonları ve talep detay paneli' },
            { src: '/help-images/10f-requests-employee.png', caption: 'Çalışan talep görünümü — izin bakiyesi özeti, aktif talepler ve geçmiş talepler' }
        ],
        steps: [
            {
                title: 'İzin Bakiyesi Kontrolü',
                description: 'İzin talebi oluşturmadan önce bakiyenizi kontrol edin. İki yerden bakiye bilgisine erişebilirsiniz:\n\n(1) Dashboard — "İzin Durumu" kartında yıllık izin bakiyesi (gün olarak) ve mazeret izni bakiyesi (saat olarak) özetlenir.\n\n(2) Talepler Sayfası — "Kendi Taleplerim" sekmesinde daha detaylı bilgi: toplam hak ediş (yıllık + devir), kullanılan gün sayısı, avans kullanımı, kalan bakiye ve mazeret izni saatleri.\n\nBakiye hesaplama "İlk Hak Edilen → İlk Düşülür" (FIFO) yöntemiyle çalışır. En eski dönemdeki izin hakkı önce kullanılır, böylece devir izinleri doğru takip edilir. Bakiye negatife düşebilir (avans izin kullanımında).',
                image: { src: '/help-images/10-requests-my.png', caption: 'Kendi Taleplerim sekmesi — talep listesi ve bakiye bilgileri' }
            },
            {
                title: 'Yeni İzin Talebi Oluşturma (CreateRequestModal)',
                description: 'Talepler sayfasında "Kendi Taleplerim" sekmesinden "Yeni Talep" butonuna tıklayın. Açılan CreateRequestModal\'da:\n\n1. Talep Türü Seçimi — Dropdown\'dan izin türünü seçin (detaylar aşağıda).\n2. Başlangıç Tarihi — Tarih seçici ile izin başlangıcını belirleyin. Geçmiş tarih seçilebilir (2 mali ay penceresi içinde).\n3. Bitiş Tarihi — İzin bitiş tarihini seçin. Sistem otomatik olarak iş günü sayısını hesaplar (hafta sonları ve tatiller düşülür).\n4. Açıklama — İsteğe bağlı açıklama metni (neden izin istiyorsunuz).\n5. Dosya Ekleme — Bazı izin türlerinde (evlilik, doğum vb.) belge eklemeniz gerekebilir.\n\nForm doğrulaması yapıldıktan sonra "Gönder" butonuna basarak talebinizi oluşturun. Talep birincil yöneticinize otomatik olarak yönlendirilir.'
            },
            {
                title: 'İzin Türleri Detayı',
                description: 'Sistemde tanımlı izin türleri:\n\n• Yıllık İzin — Kıdeme göre hak ediş: 1–5 yıl: 14 gün, 5–15 yıl: 20 gün, 15+ yıl: 26 gün. Gün bazlı, tam gün kullanılır. Bakiye FIFO ile düşülür.\n\n• Mazeret İzni — Yıllık 18 saat toplam hak. Günlük maksimum 4.5 saat. Saat bazlı çalışır (başlangıç ve bitiş saati girilir). Her yılın 1 Ocak\'ında Celery task ile otomatik sıfırlanır ve yeni hak tanımlanır. Dashboard\'da turuncu kartta bakiye gösterilir.\n\n• Doğum Günü İzni — Sadece doğum ayınızda kullanılabilir. Dashboard\'da pembe kartta gösterilir. Genellikle 1 gün haktır.\n\n• Yasal İzinler — Evlilik izni (3-7 gün), doğum izni (anne/baba farklı süreler), ölüm izni (1-3 gün), askerlik izni vb. Her birinin yasal süreleri ve belge gereksinimleri farklıdır.\n\n• Avans İzin — Henüz hak etmediğiniz günleri önceden kullanmanızdır. Bakiye negatife düşer. Avans kullanımı ayrıca takip edilir (annual_leave_advance_used alanı).'
            },
            {
                title: 'Onay Süreci ve Hiyerarşi',
                description: 'İzin talebiniz oluşturulduğunda otomatik olarak uygun onaylayıcıya yönlendirilir. Onay hiyerarşisi (ApproverService 5 katman):\n\n1. Birincil (PRIMARY) Yönetici — Doğrudan amiriniz, ilk kontrol noktası.\n2. İkincil (SECONDARY) Yönetici — NOT: İzin talepleri ikincil yöneticiye GİTMEZ, sadece ek mesai işlemleri için yetkilidir.\n3. Departman Yöneticisi — Birincil yönetici bulunamazsa veya aktif değilse devreye girer.\n4. reports_to Zinciri — Yönetici hiyerarşisi yukarı taranır.\n5. Departman Hiyerarşisi — Son çare olarak üst departman yöneticilerine eskalasyon.\n\nSistem maksimum 10 iterasyon yapar (döngü koruması). Onay/red sonrası size bildirim gönderilir. Onaylanan izinler takvimde yeşil olarak gösterilir ve bakiyenizden düşülür.'
            },
            {
                title: 'İzin İptali ve Bakiye İadesi',
                description: 'İzin talep durumuna göre iptal seçenekleri:\n\n• Bekleyen (PENDING) talepler — Kendiniz iptal edebilirsiniz. "Kendi Taleplerim" listesinde talebin yanındaki "İptal" butonuna tıklayın. Onay dialogu çıkar.\n\n• Onaylanmış (APPROVED) talepler — Kendiniz iptal edemezsiniz. Sistem yöneticisine başvurmanız gerekir. İptal edildiğinde kullanılan gün bakiyenize geri yüklenir.\n\nBakiye iadesi kuralları: İptal durumunda önce avans bakiyesi iade edilir (LIFO — son kullanılan ilk iade), sonra normal bakiye güncellenir. Bu sayede avans takibi doğru kalır. İade işlemi transaction.atomic ile güvenli yapılır.',
                image: { src: '/help-images/10f-requests-employee.png', caption: 'Çalışan talep görünümü — talep detayları ve iptal seçeneği' }
            },
            {
                title: 'İzin Takvimde Görünümü',
                description: 'Onaylanan izinleriniz Takvim sayfasında otomatik olarak gösterilir:\n\n• Renk kodu: Cyan (açık mavi) ile gösterilir.\n• Süre bilgisi: Başlangıç ve bitiş tarihleri ile toplam gün sayısı.\n• Filtre: Takvim sayfasında "İzinler" filtre toggle\'ı ile gösterme/gizleme yapılabilir.\n• Ekip görünümü: Yöneticiler, ekibindeki çalışanların izinlerini takvimde görebilir.\n\nAyrıca Dashboard\'daki "Yaklaşan Etkinlikler" bölümünde onaylanan izinleriniz yeşil renkte listelenir.'
            },
            {
                title: 'Geriye Dönük İzin Talebi (2 Mali Ay Penceresi)',
                description: 'Geçmiş tarihler için izin talebi oluşturabilirsiniz, ancak 2 mali ay geriye dönük pencere kuralı geçerlidir. Örnek: Şu anki mali dönem Mart 2026 (26 Şubat – 25 Mart) ise, en erken Ocak 2026 dönemi (26 Aralık – 25 Ocak) için talep oluşturabilirsiniz. Bu süreyi aşan tarihler için talep oluşturulamaz. Kilitli (locked) mali dönemlerdeki tarihler için de talep oluşturulamaz.'
            },
            {
                title: 'İzin Durumu Takibi',
                description: '"Kendi Taleplerim" listesinde tüm izin taleplerinizin durumunu takip edebilirsiniz. Durum filtreleri: Tümü, Bekleyen (amber), Onaylandı (yeşil), Reddedildi (kırmızı), İptal (gri). Her talep satırında:\n\n• İzin türü ve tarih aralığı\n• Gün sayısı\n• Durum badge\'i (renkli)\n• Onaylayan/reddeden yönetici adı ve tarih\n• Açıklama metni\n• Varsa red gerekçesi\n\nBildirim tercihleriniz açıksa onay/red durumunda anlık bildirim alırsınız.'
            }
        ],
        tips: [
            { type: 'info', text: 'FIFO Düşüm Sistemi (İlk Hak Edilen → İlk Düşülür): İzin günleri en eski hak ediş döneminden başlayarak düşülür. Örneğin 2024\'ten 5 gün devir + 2025\'te 14 gün hak ediş = toplam 19 gün. İzin kullandığınızda önce 2024 devir bakiyesinden (5 gün) düşülür, bu bitince 2025 bakiyesinden devam edilir. Bu sayede eski izinlerin kullanılması teşvik edilir ve devir takibi doğru yapılır. FIFO işlemi transaction.atomic + select_for_update ile thread-safe çalışır.' },
            { type: 'info', text: 'Mazeret İzni Kuralları: Yıllık toplam 18 saat hak, günlük maksimum 4.5 saat. Saat bazlı çalışır — başlangıç ve bitiş saati girilir (örn: 14:00-16:30 = 2.5 saat). Bakiye Dashboard\'da turuncu kartta gösterilir. Her yılın 1 Ocak\'ında Celery task (reset-excuse-leave-entitlements) ile sıfırlanır ve yeni 18 saatlik hak tanımlanır. Lazy init: İlk mazeret izni talebinde otomatik ExcuseLeaveEntitlement kaydı oluşturulur.' },
            { type: 'warning', text: 'Avans İzin Riski: Henüz hak etmediğiniz izin günlerini önceden kullanmanızdır. Bakiyeniz negatife düşebilir (örn: -3 gün). Avans kullanımı annual_leave_advance_used alanında ayrıca takip edilir. Gelecek hak ediş dönemlerinde avans otomatik mahsup edilir. İptal durumunda önce avans bakiyesi iade edilir (LIFO kuralı). İşten ayrılma durumunda avans bakiyesi borç olarak hesaplanabilir.' },
            { type: 'success', text: 'Geriye Dönük Talep: 2 mali ay penceresi içinde geçmiş tarihler için izin talebi oluşturabilirsiniz. Bu özellik, unutulan veya acil durumlarda kullanılmayan izinlerin sonradan kaydedilmesini sağlar. Kilitli dönemler hariç.' },
            { type: 'info', text: 'Doğum Günü İzni: Doğum ayınızda kullanılabilecek özel izin hakkınızdır. Sadece doğum ayınızda görünür ve o ay içinde kullanılmalıdır. Dashboard\'da pembe kartta kalan gün bilgisi gösterilir. Doğum tarihiniz profil sayfanızda kayıtlı olmalıdır.' },
            { type: 'warning', text: 'İzin Onay Süresi: Talebiniz yöneticinize anında iletilir, ancak onay süresi yöneticinizin müsaitliğine bağlıdır. Acil izin ihtiyacında yöneticinizi bilgilendirmeniz önerilir. Yönetici vekalet vermiş ise vekil onay yapabilir.' },
            { type: 'info', text: 'Yarım Gün İzin: Bazı izin türleri yarım gün olarak kullanılabilir. Bu durumda bakiyeden 0.5 gün düşülür. Yarım gün izin günün ilk yarısı veya ikinci yarısı olarak seçilebilir.' }
        ],
        faq: [
            { q: 'Kaç gün yıllık izin hakkım var?', a: 'Kıdeminize (işe başlama tarihinden itibaren) göre belirlenir: 1–5 yıl: 14 gün/yıl, 5–15 yıl: 20 gün/yıl, 15+ yıl: 26 gün/yıl (4857 sayılı İş Kanunu). Ek olarak önceki yıllardan devir izinleriniz varsa toplam bakiyenize eklenir. Dashboard\'daki "İzin Durumu" kartında güncel bakiyenizi görebilirsiniz. Detaylı döküm için Talepler sayfasındaki bakiye bölümüne bakın.' },
            { q: 'Mazeret izni nasıl kullanırım?', a: 'Yeni talep oluştururken "Mazeret İzni" türünü seçin. Başlangıç ve bitiş saatlerini girin (örn: 14:00-16:30 = 2.5 saat). Günlük maksimum 4.5 saat, yıllık toplam 18 saat kotanız vardır. Kalan bakiyeniz Dashboard\'da turuncu kartta gösterilir. Bakiyeniz yetersizse talep oluşturulamaz. Her 1 Ocak\'ta bakiye sıfırlanır ve yeni 18 saat hak tanımlanır.' },
            { q: 'Doğum günü iznim var mı? Nasıl kullanırım?', a: 'Doğum ayınızda kullanılabilecek özel izin hakkınız varsa Dashboard\'da pembe kartta görünür. Doğum gününüz profilinizde kayıtlı olmalıdır. Sadece doğum ayınız içinde kullanılabilir — ay geçtikten sonra kullanılamaz. Talepler sayfasından "Doğum Günü İzni" türünü seçerek talep oluşturun. Genellikle 1 gün haktır.' },
            { q: 'Avans izin nedir? Bakiyem negatife düşer mi?', a: 'Avans izin, henüz hak etmediğiniz izin günlerini önceden kullanmanızdır. Evet, bakiyeniz negatife düşebilir (örn: -3 gün). Avans kullanımı ayrıca takip edilir. İptal durumunda önce avans bakiyesi iade edilir. Gelecek dönem hak ediş olduğunda avans otomatik mahsup edilir. İşten ayrılma durumunda negatif bakiye borç olarak değerlendirilir.' },
            { q: 'Bakiye negatif görünüyor, ne anlama geliyor?', a: 'Negatif bakiye, avans izin kullandığınızı gösterir. Yani henüz hak etmediğiniz günleri önceden kullandınız. Gelecekte hak ediş gerçekleştiğinde otomatik mahsup edilecektir. Örneğin -3 gün bakiye + 14 gün yeni hak ediş = 11 gün kullanılabilir bakiye.' },
            { q: 'Onaylanmış iznimi iptal edebilir miyim?', a: 'Hayır, onaylanmış izinleri kendiniz iptal edemezsiniz. Sistem yöneticisine başvurmanız gerekir. Yönetici iptal ettiğinde kullanılan günler bakiyenize geri iade edilir. Bekleyen (henüz onaylanmamış) taleplerinizi kendiniz iptal edebilirsiniz.' },
            { q: 'Geriye dönük izin talebi verebilir miyim?', a: 'Evet, 2 mali ay penceresi içinde geçmiş tarihler için izin talebi oluşturabilirsiniz. Örneğin Mart dönemindeyseniz en erken Ocak dönemine kadar geriye dönük talep verebilirsiniz. Kilitli dönemler ve bu pencere dışındaki tarihler için talep oluşturulamaz.' },
            { q: 'İzin talebim reddedildi, ne yapmalıyım?', a: 'Red gerekçesini talep detayında görebilirsiniz. Gerekçeye göre tarih değişikliği yaparak yeni talep oluşturabilir veya yöneticinizle görüşerek durumu değerlendirebilirsiniz. Reddedilen talep bakiyenizi etkilemez — düşüm sadece onaylanan taleplerde gerçekleşir.' }
        ]
    },
    {
        id: 'ek-mesai',
        title: 'Ek Mesai',
        icon: Timer,
        description: 'Üç kaynaklı ek mesai sistemi (Planlı/Algılanan/Manuel), haftalık limit, segment bazlı talep, 2 mali ay kuralı ve onay akışı',
        permission: null,
        link: '/requests',
        images: [
            { src: '/help-images/10-requests.png', caption: 'Talepler sayfası — ek mesai sekmesi, üç kaynaklı mesai listesi ve durum rozetleri' },
            { src: '/help-images/10d-overtime-tab.png', caption: 'Ek Mesai sekmesi detay — gün bazlı gruplama, segment bazlı talep butonları ve mesai tipi badge\'leri' },
            { src: '/help-images/10e-overtime-employee.png', caption: 'Çalışan ek mesai görünümü — planlı/algılanan/manuel mesai kartları ve haftalık OT limiti' }
        ],
        steps: [
            {
                title: 'Üç Mesai Kaynağını Anlama',
                description: 'Mega Portal\'da ek mesai 3 farklı kaynaktan yönetilir. Her kaynağın kendine özgü akışı ve kuralları vardır:\n\n(1) Planlı Mesai (INTENDED) — Yöneticiniz tarafından önceden size atanan mesai görevidir. "Mesai Ata" sekmesinden atanır, size bildirim gelir. Ek Mesai sekmesinde "Planlı Mesai İstekleri" bölümünde sarı/amber badge ile gösterilir. "Talep Et" düğmesine basarak claim yaparsınız — tarih, süre ve görev tanımı otomatik doldurulur.\n\n(2) Algılanan Mesai (POTENTIAL) — Vardiya saatinizi aştığınızda veya vardiya öncesi erken geldiğinizde sistem tarafından otomatik tespit edilen mesaidir. Gün bazlı gruplar halinde, segment bazlı (Vardiya Öncesi/Sonrası/Tatil/Karma) olarak listelenir. Her segmentin yanında bağımsız "Talep Et" butonu bulunur.\n\n(3) Manuel Giriş (MANUAL) — Geçmiş bir tarih için sizin elle girdiğiniz mesai talebidir. Sistem tarafından algılanamayan mesailer (örn: uzaktan çalışma, toplantı) için kullanılır.',
                image: { src: '/help-images/10-requests.png', caption: 'Ek Mesai sekmesi — üç kaynaklı mesai listesi' }
            },
            {
                title: 'Planlı Mesai Talep Süreci (INTENDED Claim)',
                description: 'Yöneticiniz size mesai ataması yaptığında:\n\n1. Bildirim alırsınız (üst menüdeki zil ikonu + uygulama içi bildirim).\n2. Ek Mesai sekmesine gidin. "Planlı Mesai İstekleri" bölümünde atama kartı görünür: tarih, saat aralığı, süre ve görev tanımı.\n3. "Talep Et" düğmesine tıklayın → ClaimModal açılır.\n4. Modal\'da atama bilgileri otomatik doldurulur: tarih, başlangıç/bitiş saati, süre (dakika). İsterseniz ek açıklama/iş tanımı girebilirsiniz.\n5. Haftalık OT limit kontrolü yapılır — limit aşılıyorsa uyarı gösterilir ve gönderim engellenir.\n6. "Gönder" butonuna basarak talebi oluşturun. Talep doğrudan onay sürecine girer (PENDING).\n\nAtama 2 mali ay içinde talep edilmezse otomatik expire olur (Celery expire_overtime_assignments görevi, her gün 01:30).'
            },
            {
                title: 'Algılanan Mesai — Gün ve Segment Bazlı Görünüm',
                description: 'Algılanan (POTENTIAL) mesailer gün bazlı gruplar halinde listelenir. Her gün kartı şunları içerir:\n\n• Tarih başlığı ve toplam potansiyel mesai süresi\n• Segment listesi — her segment ayrı bir satırda:\n  - Vardiya Öncesi (PRE_SHIFT, mavi badge) — Vardiyadan önce erken giriş mesaisi\n  - Vardiya Sonrası (POST_SHIFT, turuncu badge) — Vardiya sonrası geç çıkış mesaisi\n  - Tatil Günü (OFF_DAY, kırmızı badge) — Tatil/hafta sonu çalışma mesaisi\n  - Karma (MIXED, mor badge) — Birden fazla segment\n• Her segmentin yanında bağımsız "Talep Et" butonu — sadece o segmenti talep edersiniz\n• Başlangıç saati, bitiş saati ve süre bilgisi\n\nBir segmenti talep ettiğinizde diğer segmentler korunur (has_active_request overlap-based kontrol).',
                image: { src: '/help-images/10d-overtime-tab.png', caption: 'Gün bazlı gruplama ve segment bazlı talep butonları' }
            },
            {
                title: 'Manuel Mesai Girişi (ManualEntryModal)',
                description: 'Geçmiş bir tarih için mesai talebi oluşturmak isterseniz:\n\n1. Ek Mesai sekmesinde "Manuel Giriş" butonuna tıklayın.\n2. ManualEntryModal açılır:\n   • Tarih — Tarih seçici ile geçmiş tarih seçin (2 mali ay penceresi içinde).\n   • Başlangıç Saati — Mesai başlangıç saati.\n   • Bitiş Saati — Mesai bitiş saati.\n   • Süre — Otomatik hesaplanır veya elle girebilirsiniz.\n   • İş Tanımı — Yapılan işin açıklaması (zorunlu).\n3. Haftalık OT limiti kontrolü yapılır.\n4. "Gönder" ile talep oluşturulur → doğrudan PENDING (bekleyen) durumuna geçer.\n\nManuel giriş, sistem tarafından algılanamayan durumlar için kullanılır: uzaktan çalışma, saha çalışması, toplantı mesaisi vb.'
            },
            {
                title: 'Haftalık OT Limiti ve Kontrolü',
                description: 'Her çalışanın haftalık fazla mesai limiti vardır (varsayılan 30 saat, çalışan bazlı ayarlanabilir). Sistem rolling 7 günlük pencerede şu saatleri sayar:\n\n• ONAYLANMIŞ (APPROVED) mesai saatleri\n• BEKLEYEN (PENDING) mesai saatleri\n\nLimit kontrolü 3 noktada uygulanır:\n1. Manuel giriş formunda — limit aşılıyorsa gönder butonu devre dışı, kırmızı uyarı gösterilir.\n2. Algılanan mesai claim formunda — aynı kontrol.\n3. Planlı mesai claim formunda — aynı kontrol.\n\nDashboard\'daki ilerleme çubuğu anlık limit durumunu gösterir. Renk kodları: yeşil (<%70), turuncu (%70-90), kırmızı (>%90), kırmızı pulsar (%100).',
                image: { src: '/help-images/10e-overtime-employee.png', caption: 'Haftalık OT limiti ve mesai talep görünümü' }
            },
            {
                title: 'Talep Akışı ve Durum Geçişleri',
                description: 'Ek mesai talepleri şu durum akışını izler:\n\nPOTANSİYEL (taslak, henüz talep edilmedi) → BEKLEYEN (talep edildi, yönetici onayında) → ONAYLANDI / REDDEDİLDİ / İPTAL\n\nGeçerli durum geçişleri (VALID_TRANSITIONS):\n• POTENTIAL → PENDING (talep et)\n• PENDING → APPROVED (onayla)\n• PENDING → REJECTED (reddet)\n• PENDING → CANCELLED (iptal et)\n• APPROVED → CANCELLED (onay sonrası iptal — sadece admin)\n\nOnaylanan mesai puantajınıza ve MonthlyWorkSummary\'ye yansır. Geçmiş dönem onaylarında bakiye kümülatif güncellenir. Mali dönem kilitlenmişse is_immutable bayrağı aktif olur ve değiştirilemez.'
            },
            {
                title: 'Yönetici Ek Mesai Görünümü — 4 Alt Sekme',
                description: 'Yönetici yetkisi olan kullanıcılar Talepler sayfasında 4 alt sekme görür:\n\n1. Taleplerim — Kendi mesai talepleri (çalışan ile aynı).\n2. Mesai Ata — Ekip üyelerine mesai ataması yapma formu. Personel seçimi (çoklu), tarih, saat aralığı, görev tanımı ve toplu atama (bulk-create). Atama yapıldığında ilgili çalışanlara bildirim gönderilir.\n3. Gelen Talepler — Ekipten gelen mesai talepleri listesi. Onay/red butonları, talep detayı, haftalık OT bilgisi.\n4. Analiz — Ek mesai analizleri: kaynak dağılımı, haftalık trend, çalışan bazlı OT sıralaması.\n\nİkincil (SECONDARY) yöneticiler de bu sekmeleri görür ancak sadece OT işlemleri yapabilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Potansiyel Mesai Nedir: Potansiyel mesai, sistem tarafından otomatik algılanan ancak henüz talep edilmemiş fazla çalışmadır. "Talep Et" düğmesine basana kadar taslak halinde kalır — yöneticinize gitmez ve puantajınıza yansımaz. Potansiyel mesailer 2 mali ay sonunda otomatik expire olur (Celery expire_overtime_assignments görevi).' },
            { type: 'info', text: 'Mesai Tipleri ve Badge\'leri: PRE_SHIFT (Vardiya Öncesi, mavi badge) = erken giriş mesaisi, POST_SHIFT (Vardiya Sonrası, turuncu badge) = geç çıkış mesaisi, OFF_DAY (Tatil Günü, kırmızı badge) = tatil/hafta sonu çalışma, MIXED (Karma, mor badge) = birden fazla segment içeren mesai. Her tip farklı renkli badge ile gösterilir.' },
            { type: 'warning', text: '2 Mali Ay Kuralı: Tüm mesai talepleri (planlı, algılanan, manuel) 2 mali ay geriye dönük pencere içinde yapılmalıdır. Bu süreyi aşan potansiyel mesailer otomatik expire olur ve talep edilemez. FiscalLock = olay_ayı + 2. Örneğin Ocak ayındaki potansiyel mesai en geç Mart sonuna kadar talep edilmelidir.' },
            { type: 'success', text: 'Tatil Günü Çalışma: Hafta sonu ve resmi tatillerde çalışma programınızda o gün "tatil" olarak tanımlıysa, yapılan çalışma otomatik olarak OFF_DAY tipinde ek mesai algılanır. Tüm gün çalışma süresi OT olarak hesaplanır (normal çalışma saati sayılmaz).' },
            { type: 'info', text: 'Yönetici 4 Alt Sekme: Ek mesai yönetimi için yöneticilerin 4 ayrı sekmesi vardır: Taleplerim (kendi talepleri), Mesai Ata (ekibe atama), Gelen Talepler (onay/red), Analiz (OT analizleri). İkincil yöneticiler de bu sekmeleri görür ancak tüm işlemleri OT kapsamındadır.' },
            { type: 'warning', text: 'Deficit-Fill Mantığı: Vardiya bitişinden sonra çalışmaya devam ederseniz ve o güne ait mesai eksiğiniz varsa, önce eksik tamamlanır (deficit-fill), kalan süre OT olarak sayılır. Örneğin 30 dk eksiğiniz var ve 60 dk fazla çalıştınız → 30 dk eksik kapatılır (core_work), 30 dk OT hesaplanır. OT başlangıç saati buna göre ayarlanır.' },
            { type: 'info', text: 'Kaynak Rozeti (Source Badge): Her mesai talebinde kaynağını gösteren renkli rozet bulunur: "Planlı" (yeşil, yönetici ataması), "Algılanan" (mavi, sistem tespiti), "Manuel" (mor, elle giriş). Bu rozetler Gelen Talepler listesinde de görünür ve yöneticinin kaynağı anlamasını sağlar.' }
        ],
        faq: [
            { q: 'Potansiyel mesai ile bekleyen mesai farkı nedir?', a: '"Potansiyel" (POTENTIAL) mesai, sistem tarafından algılanmış ancak henüz talep edilmemiş taslak kayıttır. Yöneticinize gitmez ve puantajınıza yansımaz. "Talep Et" düğmesine bastığınızda "Bekleyen" (PENDING) durumuna geçer ve yöneticinize onay için gönderilir. Yalnızca "Onaylanmış" (APPROVED) mesai puantajınıza ve aylık bakiyenize yansır.' },
            { q: 'Mesaim neden otomatik algılanmadı?', a: 'Potansiyel mesai oluşması için iki koşul birlikte sağlanmalıdır:\n1. Geç kalma toleransını (varsayılan 30 dk) aşmanız — vardiya 18:00\'da bitiyorsa 18:30\'dan sonra çıkmalısınız.\n2. Günlük toplam fazla mesai süresinin minimum OT eşiğini (varsayılan 30 dk) geçmesi.\nHer iki koşul sağlanmazsa potansiyel mesai oluşmaz. Ayrıca çalışma programınızda o günün tanımlı olması gerekir.' },
            { q: 'Haftalık OT limitim doldu, ne yapmalıyım?', a: 'Yöneticinizle görüşerek limitin güncellenmesini isteyebilirsiniz. Haftalık OT limiti çalışan profilinden ayarlanır: Çalışan Yönetimi > [Çalışan] > Ayarlar sekmesi > "Haftalık OT Limiti" alanı. Varsayılan 30 saat/hafta\'dır. Limit güncellendiğinde rolling 7 günlük pencere yeniden hesaplanır.' },
            { q: 'Vardiya öncesi erken giriş mesai sayılır mı?', a: 'Evet. Vardiya başlangıcından belirli bir süre önce giriş yaptığınızda (servis toleransı dışında), sistem bunu "Vardiya Öncesi" (PRE_SHIFT) potansiyel mesai olarak algılar. Örneğin vardiya 08:00, siz 07:00\'da giriş yaptıysanız 60 dk PRE_SHIFT potansiyel oluşur (minimum eşiği geçtiği takdirde). Bu segmenti ayrıca talep edebilirsiniz.' },
            { q: 'Yöneticim bana mesai ataması yaptı ama göremiyorum?', a: 'Ek Mesai sekmesinde "Planlı Mesai İstekleri" bölümünü kontrol edin. Atama görünmüyorsa: (1) Atamanın tarihini kontrol edin — 2 mali ay penceresi dışındaysa expire olmuş olabilir. (2) Bildirim tercihlerinizi kontrol edin. (3) Sayfayı yenileyin. (4) Atamanın size yapıldığından emin olmak için yöneticinizle teyit edin.' },
            { q: 'Mesai talebimi geri çekebilir miyim?', a: 'Bekleyen (PENDING) durumdaki talepleri iptal edebilirsiniz — talep satırındaki "İptal" butonuna tıklayın. Onaylanmış taleplerin iptali sadece sistem yöneticisi tarafından yapılabilir. Potansiyel (taslak) mesailer zaten talep edilmediği için iptal gerekmez.' },
            { q: 'İkincil yöneticim mesai onaylayabilir mi?', a: 'Evet. İkincil (SECONDARY) yönetici sadece ek mesai (OT) işlemlerinde yetkilidir. İzin ve kartsız giriş talepleri ikincil yöneticiye gitmez. Mesai talep formunda hedef onaylayıcı dropdown\'ında birincil ve ikincil yöneticileriniz listelenir.' },
            { q: 'Mesai talebi reddedildi, tekrar talep edebilir miyim?', a: 'Reddedilen bir talebin aynı kaynak potansiyeli hâlâ mevcutsa (expire olmadıysa) tekrar talep edebilirsiniz. Ancak red gerekçesini dikkate alarak gerekirse tarih/saat bilgilerini düzeltin veya yöneticinizle görüşün. Aynı potansiyele birden fazla aktif talep oluşturulamaz.' }
        ]
    },
    {
        id: 'yemek-siparisi',
        title: 'Yemek Siparişi',
        icon: Utensils,
        description: 'Günlük yemek siparişi verme/geri alma, sipariş durumu takibi, not ekleme, personel adına talep ve toplu yönetim',
        permission: 'PAGE_MEAL_ORDERS',
        link: '/meal-orders',
        images: [
            { src: '/help-images/15-meal-orders.png', caption: 'Yemek Sipariş Yönetimi — tarih navigatörü, 4 durum kartı (toplam/sipariş verilen/bekleyen/iptal), personel listesi ve işlem butonları' },
            { src: '/help-images/15a-meal-orders-detail.png', caption: 'Sipariş detay görünümü — personel adı, sipariş durumu toggle, not düzenleme ve iptal seçenekleri' }
        ],
        steps: [
            {
                title: 'Tarih Seçimi ve Genel Bakış',
                description: 'Sayfanın üst kısmındaki tarih navigatöründen hedef tarihi seçin. Sol/sağ ok butonlarıyla önceki/sonraki güne geçebilir, "Bugün" butonuyla mevcut güne dönebilirsiniz. Seçili tarihin altında 4 özet kartı gösterilir:\n\n• Toplam Talep (gri) — O gün için oluşturulan toplam yemek talebi sayısı.\n• Sipariş Verildi (yeşil, ✓) — Sipariş olarak onaylanmış talep sayısı.\n• Bekleyen (amber, saat ikonu) — Henüz işleme alınmamış talep sayısı.\n• İptal Edildi (kırmızı, ⛔) — İptal edilen talep sayısı.\n\nKartlara tıklayarak ilgili durumdaki siparişleri filtreleyebilirsiniz.',
                image: { src: '/help-images/15-meal-orders.png', caption: 'Yemek Sipariş Yönetimi — tarih navigatörü ve durum kartları' }
            },
            {
                title: 'Sipariş Verme ve Geri Alma Toggle',
                description: 'Personel listesinde her satırda çalışanın adı, departmanı ve sipariş durumu gösterilir. "Sipariş Verildi / Geri Al" toggle butonu ile sipariş durumunu değiştirebilirsiniz:\n\n• "Sipariş Ver" (yeşil arka plan) — Talebi sipariş olarak işaretler.\n• "Geri Al" (gri arka plan) — Siparişi bekleyen durumuna geri alır.\n\nToggle tıklandığında onay dialogu çıkmaz, işlem anında gerçekleşir. Hatalı tıklama durumunda tekrar tıklayarak geri alabilirsiniz.',
                image: { src: '/help-images/15a-meal-orders-detail.png', caption: 'Sipariş detay — toggle buton ve işlemler' }
            },
            {
                title: 'Not Ekleme ve Düzenleme',
                description: 'Her sipariş satırında kalem ikonu (düzenle) butonuna tıklayarak not ekleyebilir veya mevcut notu güncelleyebilirsiniz. Not alanı açılır — metin girip "Kaydet" butonuna basın. Notlar yemek hizmet sağlayıcısına iletilmek üzere kaydedilir (örn: özel diyet, alerji bilgisi, porsiyon tercihi).'
            },
            {
                title: 'Sipariş İptali',
                description: 'Sipariş satırındaki X (çarpı) ikonuna tıklayarak iptal işlemi başlatın. Açılan dialogda iptal sebebi girmeniz istenir (zorunlu alan). "İptal Et" butonuna basarak işlemi tamamlayın. İptal edilen siparişler kırmızı arka plan ile gösterilir ve geri açılamaz. İptal sebebi kayıt altına alınır.'
            },
            {
                title: 'Personel Adına Yemek Talebi Oluşturma',
                description: 'Sağ üst köşedeki "Personel Adına Talep Oluştur" butonuna tıklayın. Açılan modalda:\n\n1. Çalışan Arama — En az 2 karakter yazarak çalışan arayın. Sonuçlar anlık filtrelenir.\n2. Çalışan Seçimi — Listeden çalışanı seçin.\n3. Yemek Açıklaması — İsteğe bağlı açıklama/not girin.\n4. "Oluştur" butonu ile talebi kaydedin.\n\nOluşturulan talep listede görünür ve normal sipariş akışına dahil olur. Bu özellik PAGE_MEAL_ORDERS yetkisi gerektirir.'
            },
            {
                title: 'Sipariş Durumu Akışı',
                description: 'Yemek siparişleri şu durum akışını izler:\n\n1. Bekliyor (PENDING, amber) — Talep oluşturuldu, henüz işleme alınmadı.\n2. Sipariş Verildi (ORDERED, yeşil ✓) — Yemek siparişi verildi olarak işaretlendi.\n3. Teslim Edildi (DELIVERED, mavi 📦) — Yemek teslim edildi.\n4. İptal Edildi (CANCELLED, kırmızı ⛔) — Sipariş iptal edildi (geri açılamaz).\n\nGeçişler: PENDING → ORDERED → DELIVERED veya PENDING/ORDERED → CANCELLED.'
            },
            {
                title: 'Toplu İşlem ve Filtreleme',
                description: 'Sayfanın üst kısmındaki arama kutusunu kullanarak personel adına göre filtreleme yapabilirsiniz. Departman filtresi ile belirli bir birimin siparişlerini görüntüleyebilirsiniz. Toplu seçim checkbox\'ları ile birden fazla siparişi aynı anda "Sipariş Verildi" durumuna geçirebilirsiniz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Arama ve Filtreleme: Personel adı veya departman bazında arama yapabilirsiniz. Arama Türkçe karakterleri (ç, ğ, ı, ö, ş, ü) tam destekler. Sonuçlar anlık filtrelenir (debounce ile 300ms gecikme).' },
            { type: 'warning', text: 'Yetki Gereksinimi: Bu sayfayı görmek ve işlem yapmak için PAGE_MEAL_ORDERS yetkisi gereklidir. Sayfayı yan menüde göremiyorsanız sistem yöneticinize başvurarak yetki talebinde bulunun.' },
            { type: 'success', text: 'Geriye Dönük Sipariş: Yemek siparişleri de 2 mali ay geriye dönük pencere kuralına tabidir. Geçmiş tarihler için sipariş talebi oluşturabilirsiniz. Bu özellik unutulan veya geç kaydedilen siparişler için kullanışlıdır.' },
            { type: 'info', text: 'Toplu İşlem Kolaylığı: Birden fazla personelin siparişini aynı anda onaylamak için checkbox\'ları kullanın ve "Toplu Sipariş Ver" butonuna tıklayın. Bu özellik özellikle büyük kadrolarda zaman kazandırır.' },
            { type: 'warning', text: 'İptal Edilen Siparişler: İptal edilen siparişler geri açılamaz. İptal sebebi kayıt altına alınır ve denetim izleri için saklanır. Yanlışlıkla iptal ettiyseniz yeni bir talep oluşturmanız gerekir.' }
        ],
        faq: [
            { q: 'Sipariş verdikten sonra değiştirebilir miyim?', a: '"Sipariş Verildi" durumundayken "Geri Al" toggle butonuyla bekleyen durumuna geri alabilirsiniz. Daha sonra notu güncelleyebilir veya tekrar sipariş verebilirsiniz. Ancak "İptal Edildi" durumundaki siparişler geri açılamaz — yeni talep oluşturmanız gerekir.' },
            { q: 'Yemek siparişi sayfasını göremiyorum, neden?', a: 'Bu sayfa PAGE_MEAL_ORDERS yetkisi gerektirir. Yan menüde "Yemek Siparişi" seçeneği görünmüyorsa yetkiniz yoktur. Sistem yöneticinize veya İK birimine başvurarak yetki talebinde bulunun. Genellikle muhasebe ve yönetici rollerine bu yetki tanımlıdır.' },
            { q: 'Geçmiş bir gün için sipariş oluşturabilir miyim?', a: 'Evet, tarih navigatöründen geçmiş tarihi seçerek o gün için sipariş talebi oluşturabilirsiniz. 2 mali ay penceresi kuralı geçerlidir. Kilitli dönemler hariç tüm tarihler için talep oluşturulabilir.' },
            { q: 'Not alanını ne için kullanmalıyım?', a: 'Not alanı yemek hizmet sağlayıcısına iletilecek özel bilgiler içindir: diyet tercihleri (vejetaryen, vegan), gıda alerjileri, porsiyon büyüklüğü tercihi veya özel istekler. Her personelin notu sipariş raporunda görünür.' },
            { q: 'Siparişlerin özet raporunu alabilir miyim?', a: 'Evet, sayfadaki özet kartları anlık durumu gösterir. Detaylı rapor için Raporlar sayfasından yemek sipariş raporu oluşturabilirsiniz (PAGE_REPORTS yetkisi gerekir).' }
        ]
    },
    {
        id: 'takvim',
        title: 'Takvim',
        icon: Calendar,
        description: 'Kişisel takvim, etkinlik filtreleri, ekip Gantt görünümü, mesai atamaları, renk kodlu gün detayları ve yarım gün tatil desteği',
        permission: null,
        link: '/calendar',
        images: [
            { src: '/help-images/08-calendar.png', caption: 'Takvim sayfası — aylık görünüm, sol panel filtre toggle\'ları, mini takvim, gün detay paneli ve renk kodlu etkinlik noktacıkları' },
            { src: '/help-images/08a-calendar-admin.png', caption: 'Yönetici takvim görünümü — ekip görünümü filtresi açık, Gantt bar\'lar ve gün detay panelinde ekip durumları' },
            { src: '/help-images/08b-calendar-employee.png', caption: 'Çalışan takvim görünümü — kişisel etkinlikler, izinler, tatiller ve mesai atamaları' }
        ],
        steps: [
            {
                title: 'Takvim Gezinme ve Mini Takvim',
                description: 'Takvim sayfası açıldığında geçerli ayın takvim grid\'i gösterilir. Sol paneldeki mini takvimden herhangi bir güne tıklayarak o güne gidebilirsiniz. Navigasyon kontrolleri:\n\n• Önceki/Sonraki Ay Okları (< >) — Ay bazında ileri/geri gezinme.\n• Yıl Okları (<< >>) — Yıl bazında ileri/geri.\n• "Bugün" Butonu — Mevcut güne anında dönüş.\n\nTakvim grid\'inde renk kodları:\n• Beyaz arka plan — Normal iş günü.\n• Amber/sarı arka plan — Hafta sonu (Cumartesi/Pazar).\n• Kırmızı arka plan — Resmi tatil günü.\n• Diagonal çizgili arka plan — Yarım gün tatil (günün yarısı çalışma, yarısı tatil).\n• Mor çerçeve — Bugün (mevcut gün vurgusu).\n• Azaltılmış opaklık — Geçmiş günler (soluk görünüm).',
                image: { src: '/help-images/08-calendar.png', caption: 'Takvim — aylık görünüm ve navigasyon kontrolleri' }
            },
            {
                title: 'Etkinlik Filtreleri — 6 Toggle Detayı',
                description: 'Sol panelde 6 filtre toggle butonu ile hangi etkinlik türlerini göreceğinizi kontrol edin. Her toggle bağımsız olarak açılıp kapatılabilir:\n\n1. Ek Mesai Görevleri (mor/violet) — Yönetici tarafından atanan ve kendi planlı mesai atamaları. Mor noktacık.\n2. Ek Mesai Talepleri (amber/turuncu) — Bekleyen mesai talepleri (amber), onaylanan mesai talepleri (yeşil). Amber/yeşil noktacık.\n3. İzinler (cyan/açık mavi, varsayılan AÇIK) — Onaylanan izin günleri. Cyan noktacık.\n4. Sağlık Raporları (pembe, varsayılan AÇIK) — Sağlık raporu ve hastane ziyareti günleri. Pembe noktacık.\n5. Kartsız Girişler (turuncu) — Kartsız giriş talebi olan günler. Turuncu noktacık.\n6. Ekip Görünümü (indigo, SADECE YÖNETİCİLER) — Ekipteki çalışanların izin/mesai/rapor durumlarını Gantt bar olarak gösterir.\n\nFiltreleri kapatıp açarak takvim görünümünü özelleştirebilirsiniz. Tercihleriniz oturumunuz boyunca korunur.',
                image: { src: '/help-images/08b-calendar-employee.png', caption: 'Çalışan takvim — filtre toggle\'ları ve etkinlik noktacıkları' }
            },
            {
                title: 'Gün Detay Paneli (Sağ Panel Slide-in)',
                description: 'Herhangi bir güne tıkladığınızda sağdan kayarak açılan (slide-in) detay panelinde o günün tüm bilgileri gösterilir:\n\n• Tarih Başlığı — Gün adı, tarih ve özel durum (tatil/yarım gün tatil).\n• Etkinlik Listesi — Tip gruplarına ayrılmış etkinlikler:\n  - Kişisel etkinlikler (mavi) — Başlık, saat, konum\n  - Tatiller (kırmızı) — Tatil adı\n  - İzinler (cyan) — İzin türü, süre\n  - Mesai atamaları (mor) — Atayan yönetici, saat aralığı, görev\n  - Mesai talepleri (amber/yeşil) — Durum, süre\n  - Sağlık raporları (pembe) — Rapor türü, süre\n  - Kartsız girişler (turuncu) — Giriş/çıkış saati\n\nKişisel etkinlikleriniz üzerinde hover yaparak düzenle (kalem) ve sil (çöp kutusu) butonlarına erişebilirsiniz. Yöneticiler bu panelden ekibe mesai ataması da yapabilir.'
            },
            {
                title: 'Etkinlik Oluşturma (AgendaEventModal)',
                description: '"Yeni Etkinlik" butonuna tıklayarak veya takvim grid\'inde boş bir alana çift tıklayarak etkinlik oluşturma modalını açın. Modal alanları:\n\n1. Başlık — Etkinlik adı (zorunlu, max 200 karakter).\n2. Tarih — Başlangıç ve bitiş tarihi seçici.\n3. Tüm Gün — Toggle: açıksa saat girişi gizlenir, tam gün etkinlik oluşur.\n4. Başlangıç/Bitiş Saati — Tüm gün kapalıysa saat seçici görünür.\n5. Etkinlik Türü — 3 seçenek: Kişisel (varsayılan), Toplantı, Hatırlatma.\n6. Konum — İsteğe bağlı metin alanı.\n7. Görünürlük — 3 seviye:\n   • Özel (PRIVATE) — Sadece siz görürsünüz.\n   • Departman (DEPARTMENT) — Departmanınızdaki herkes görür.\n   • Herkese Açık (PUBLIC) — Tüm şirket görür.\n8. Renk — 8 renk seçeneğinden biri (mavi, yeşil, kırmızı, mor, turuncu, pembe, cyan, gri).\n\n"Kaydet" butonuyla etkinliği oluşturun. Backend\'de CalendarEventsViewSet tarafından işlenir.'
            },
            {
                title: 'Etkinlik Noktacıkları ve Renk Kodları',
                description: 'Takvim grid\'indeki her hücrede (gün) etkinlik türlerine göre renkli küçük noktalar gösterilir. En fazla 4 noktacık görünür, fazlası "+N" etiketi ile belirtilir:\n\n• Mavi nokta — Kişisel etkinlik (PersonalCalendarEvent)\n• Kırmızı nokta — Resmi tatil (FiscalCalendar tatil tanımı)\n• Violet/mor nokta — Ek mesai ataması (OvertimeAssignment)\n• Amber/sarı nokta — Ek mesai talebi (OvertimeRequest, bekleyen)\n• Yeşil nokta — Ek mesai talebi (OvertimeRequest, onaylanan)\n• Cyan nokta — İzin (LeaveRequest, onaylanan)\n• Mor nokta — Dış görev (ExternalDuty)\n• Pembe nokta — Sağlık raporu (HealthReport)\n• Turuncu nokta — Kartsız giriş (CardlessEntryRequest)\n\nNoktacıklar aktif filtrelere göre gösterilir — filtre kapalıysa ilgili noktalar gizlenir.'
            },
            {
                title: 'Ekip Görünümü — Gantt Bar (Yöneticilere Özel)',
                description: '"Ekip Görünümü" filtre toggle\'ını açtığınızda (sadece yönetici yetkisi olanlar) takvimde ekip üyelerinin durumu Gantt bar formatında gösterilir. TeamGanttBar bileşeni:\n\n• Her ekip üyesi için yatay renkli çubuklar gösterilir.\n• Çubuk renkleri: Cyan = izinli, Mor = mesai ataması, Kırmızı = devamsızlık, Pembe = sağlık raporu.\n• Çubuğun üzerinde hover yaparak detay tooltip gösterilir: çalışan adı, durum, tarih aralığı.\n• Gün detay panelinde ekip üyelerinin listesi: avatar, isim, departman ve durum badge\'leri (İzinli/Mesai/Rapor/Kartsız).\n\nBu özellik ekip planlaması için kritiktir — kimin müsait olduğunu, kimin izinde veya mesaide olduğunu tek bakışta görebilirsiniz.',
                image: { src: '/help-images/08a-calendar-admin.png', caption: 'Yönetici takvim — ekip görünümü ve Gantt bar\'lar' }
            },
            {
                title: 'Tatil ve Yarım Gün Gösterimi',
                description: 'Takvimde resmi tatiller ve özel günler otomatik gösterilir:\n\n• Tam Gün Tatil — Kırmızı arka plan, tatil adı hücrede gösterilir (örn: "Cumhuriyet Bayramı").\n• Yarım Gün Tatil — Diagonal çizgili (stripe) arka plan deseni. Günün yarısı çalışma, yarısı tatil. Gün detay panelinde "Yarım Gün Tatil" etiketi ve çalışma saatleri gösterilir.\n• Ardışık Tatiller — Dashboard\'da birleştirilir (örn: "Ramazan Bayramı, 3 gün") ancak takvimde her gün ayrı gösterilir.\n• Hafta Sonu — Amber/sarı arka plan.\n\nTatil tanımları çalışma programınızdaki FiscalCalendar\'dan okunur. Farklı çalışma takvimleri farklı tatil setleri içerebilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Etkinlik Görünürlüğü: "Özel" (PRIVATE) etkinlikler sadece oluşturan kişiye görünür — başka hiç kimse erişemez. "Departman" (DEPARTMENT) etkinlikleri aynı departmandaki herkes tarafından görülür. "Herkese Açık" (PUBLIC) etkinlikler tüm şirket çalışanları tarafından görünür. Backend\'de CalendarEventsViewSet visibility filtrelemesi yapar.' },
            { type: 'info', text: 'Resmi Tatiller: Tatil tanımları çalışma programınızdaki mali takvimden (FiscalCalendar) okunur. Yarım gün tatiller diagonal çizgili deseni ile normal tatillerden ayırt edilir. Ramazan Bayramı gibi dini bayramlar yıla göre değişir ve takvim yöneticisi tarafından güncellenir.' },
            { type: 'success', text: 'Otomatik Yenileme: Takvim verileri her 60 saniyede smart polling ile otomatik güncellenir. Başka bir kullanıcı etkinlik oluşturduğunda veya izin onaylandığında takvim otomatik yenilenir. Manuel yenileme gerekmez.' },
            { type: 'info', text: 'Yönetici Mesai Ataması: Gün detay panelinden yönetici yetkisiyle ekibinizdeki çalışanlara ek mesai ataması yapabilirsiniz. Paneldeki "Mesai Ata" butonuna tıklayarak personel seçin, saat aralığı ve görev tanımı girin. Atama CalendarSidePanel bileşeninden yapılır.' },
            { type: 'warning', text: 'Takvim Hesaplama: Çalışma programı (ScheduleTemplate) değişiklikleri takvimi etkiler. Büyük değişikliklerde arka planda Celery ile yeniden hesaplama çalışır. Hesaplama süresince takvimde geçici tutarsızlıklar görülebilir — ilerleme çubuğu ile takip edin.' },
            { type: 'info', text: 'Etkinlik Düzenleme ve Silme: Sadece kendi oluşturduğunuz kişisel etkinlikleri düzenleyebilir veya silebilirsiniz. Sistem tarafından oluşturulan etkinlikler (izin, mesai, tatil) salt okunurdur. Düzenlemek için ilgili talep sayfasından işlem yapın.' }
        ],
        faq: [
            { q: 'Takvimde başkasının etkinliğini görebilir miyim?', a: '"Departman" görünürlükteki etkinlikleri aynı departmandaysanız, "Herkese Açık" görünürlükteki etkinlikleri herkes görebilir. "Özel" etkinliklere erişilemez. Ekip Görünümü filtresini açarak (yönetici yetkisi gerekir) ekibinizdeki çalışanların izin, mesai ve sağlık raporu durumlarını Gantt bar olarak takip edebilirsiniz.' },
            { q: 'Ek mesai atamasını takvimden yapabilir miyim?', a: 'Evet, yönetici yetkiniz varsa. Bir güne tıklayarak gün detay panelini açın, paneldeki "Mesai Ata" seçeneğini kullanarak ekibinizdeki çalışanlara o gün için ek mesai ataması yapabilirsiniz. Personel seçimi, saat aralığı ve görev tanımı girebilirsiniz. Toplu atama (birden fazla çalışana aynı anda) desteklenir.' },
            { q: 'Neden bazı günler farklı renkte gösteriliyor?', a: 'Renk kodları:\n• Beyaz = Normal iş günü\n• Amber/sarı = Hafta sonu\n• Kırmızı = Resmi tatil\n• Diagonal çizgili = Yarım gün tatil\n• Mor çerçeve = Bugün\n• Soluk/düşük opaklık = Geçmiş günler\n\nBu renkler çalışma programınızdaki tanımlardan otomatik oluşturulur.' },
            { q: 'Yarım gün tatil nedir?', a: 'Yarım gün tatil, günün bir bölümünün çalışma diğer bölümünün tatil olduğu özel günlerdir (örn: bayram arefe günleri). Takvimde diagonal çizgili (stripe) desen ile gösterilir. Gün detay panelinde çalışma saatleri ve tatil saatleri ayrıca belirtilir. Çalışma hedefi o gün için yarım gün olarak hesaplanır.' },
            { q: 'Etkinlik oluştururken hangi görünürlüğü seçmeliyim?', a: 'Kişisel randevular ve özel notlar için "Özel" seçin. Departman toplantıları ve ekip etkinlikleri için "Departman" seçin. Şirket geneli duyurular ve ortak etkinlikler için "Herkese Açık" seçin. Varsayılan "Özel"dir.' },
            { q: 'Takvimde geçmiş aylara gidebilir miyim?', a: 'Evet, önceki ay okları (<) veya yıl okları (<<) ile istediğiniz kadar geriye gidebilirsiniz. Mini takvimden de ay/yıl seçerek doğrudan o döneme atlayabilirsiniz. "Bugün" butonu ile mevcut güne anında dönebilirsiniz.' }
        ]
    },
    {
        id: 'sirket-rehberi',
        title: 'Şirket Rehberi',
        icon: Contact,
        description: 'Çalışan arama, anlık durum göstergesi (Ofiste/İzinde/Dışarıda), departman filtresi, kart ve liste görünümü',
        permission: null,
        link: '/company-directory',
        images: [
            { src: '/help-images/05-company-directory.png', caption: 'Şirket Rehberi — 3 özet kartı (Ofiste/İzinde/Dışarıda), arama kutusu, kart/liste görünüm toggle ve çalışan kartları' },
            { src: '/help-images/05a-directory-cards.png', caption: 'Kart görünümü detay — çalışan kartları, avatar, durum noktası, departman, e-posta ve telefon linkleri' }
        ],
        steps: [
            {
                title: 'Özet Kartları ve Hızlı Filtreleme',
                description: 'Sayfanın üst kısmında 3 büyük tıklanabilir özet kartı bulunur:\n\n• Ofiste (yeşil, Users ikonu) — Giriş yapmış ve şu an ofiste olan çalışan sayısı. Uzaktan çalışanlar da bu kategoridedir.\n• İzinde (turuncu, Calendar ikonu) — Onaylı izinde olan çalışan sayısı.\n• Dışarıda (gri, UserX ikonu) — Çıkış yapmış veya henüz giriş yapmamış çalışan sayısı.\n\nKarta tıklayarak o kategorideki çalışanları filtreleyebilirsiniz. Alt kısımdaki pill butonlarla (Tümü/Ofiste/İzinde/Dışarıda) aynı filtreleme yapılabilir. Kartlardaki sayılar her 60 saniyede otomatik güncellenir.',
                image: { src: '/help-images/05-company-directory.png', caption: 'Şirket Rehberi — özet kartları ve filtreleme' }
            },
            {
                title: 'Çalışan Arama',
                description: 'Arama kutusuna isim yazarak çalışan arayabilirsiniz. Özellikler:\n\n• Anlık filtreleme — 300ms debounce ile sonuçlar yazarken filtrelenir.\n• Türkçe karakter desteği — ç, ğ, ı, ö, ş, ü karakterleri tam desteklenir.\n• Ad veya soyad ile arama — Her iki alan da taranır.\n• Büyük/küçük harf duyarsız — "ahmet" ve "Ahmet" aynı sonucu verir.\n\nArama kutusunu temizlemek için X butonuna tıklayın veya metni silin.'
            },
            {
                title: 'Kart Görünümü Detayı',
                description: 'Varsayılan görünüm olan kart modunda her çalışan ayrı bir kart olarak gösterilir. Kart içeriği:\n\n• Avatar — 2 harfli (ad-soyad baş harfleri), çalışan ID\'sine göre 10 farklı arka plan rengi.\n• Durum Noktası — Avatar\'ın sağ alt köşesinde küçük renkli nokta: yeşil (ofiste), turuncu (izinde), gri (dışarıda).\n• Tam Ad — Çalışanın adı ve soyadı.\n• Departman — Bulunduğu departman adı.\n• Durum Badge — Renkli küçük etiket: "Ofiste" (yeşil), "İzinde" (turuncu), "Dışarıda" (gri), "Ulaşılabilir" (yeşil, ek etiket).\n• E-posta Linki — Tıklanabilir, mail uygulaması açılır (mailto: link).\n• Telefon Linki — Tıklanabilir, arama başlatılır (tel: link).\n\nKartlar responsive grid yapısındadır: masaüstünde 3-4 sütun, tablette 2 sütun, mobilde 1 sütun.',
                image: { src: '/help-images/05a-directory-cards.png', caption: 'Kart görünümü — çalışan kartları detay' }
            },
            {
                title: 'Liste Görünümü',
                description: 'Sağ üst köşedeki görünüm toggle butonlarından liste ikonuna tıklayarak tablo formatına geçin. Liste görünümünde her çalışan tek satırda gösterilir:\n\n• Avatar (küçük) + Ad Soyad\n• Departman\n• Pozisyon/Unvan\n• Durum (renkli badge)\n• E-posta (tıklanabilir link)\n• Telefon (tıklanabilir link)\n\nListe görünümü özellikle büyük kadrolarda tarama yapmak için daha verimlidir. Sütun başlıklarına tıklayarak sıralama yapılabilir.'
            },
            {
                title: 'Durum Göstergeleri ve Otomatik Güncelleme',
                description: 'Her çalışanın yanında anlık durum göstergesi bulunur:\n\n• Yeşil — Ofiste: Giriş yapmış (kart okutma ile) veya uzaktan çalışıyor. "Ulaşılabilir" ek etiketi ile işaretlenir.\n• Turuncu — İzinde: Onaylı izin kaydı var. İzin türü tooltip\'te gösterilir.\n• Gri — Dışarıda: Çıkış yapmış, henüz giriş yapmamış veya o gün gelmemiş.\n\nDurum bilgileri backend\'den her 60 saniyede smart polling ile çekilir ve otomatik güncellenir. Canlı durum Celery task (update_attendance_periodic, her 30 sn) tarafından hesaplanır.',
            },
            {
                title: 'Yenile Butonu ve Son Güncelleme',
                description: 'Sağ üst köşedeki yenile (RefreshCw) butonuna tıklayarak verileri manuel olarak güncelleyebilirsiniz. Butonun yanında son güncelleme saati küçük gri metin olarak gösterilir (örn: "Son güncelleme: 14:32"). Yenileme işlemi sırasında buton döner (spin) animasyonu gösterir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Tıklanabilir İletişim Bilgileri: Çalışan kartındaki e-posta adresine tıkladığınızda varsayılan mail uygulamanız (Outlook, Gmail vb.) yeni mesaj penceresiyle açılır. Telefon numarasına tıkladığınızda mobil cihazlarda arama başlatılır, masaüstünde Skype veya Teams gibi arama uygulaması açılabilir.' },
            { type: 'success', text: 'Sadece Aktif Çalışanlar: Rehber yalnızca aktif (is_active=True) çalışanları gösterir. Pasif durumdaki (ayrılmış, işten çıkan) çalışanlar güvenlik ve gizlilik nedeniyle listede görünmez. Bu sayede güncel kadro bilgisi her zaman doğru yansır.' },
            { type: 'info', text: 'Yenile Butonu: Sağ üst köşedeki yenile (RefreshCw) butonuna tıklayarak verileri manuel olarak güncelleyebilirsiniz. Son güncelleme saati başlık altında gösterilir. Otomatik güncelleme de her 60 saniyede çalışır.' },
            { type: 'info', text: 'Türkçe Karakter Desteği: Arama fonksiyonu Türkçe karakterleri (ç, ğ, ı, ö, ş, ü) tam destekler. "Gökhan" araması "Gokhan" ile eşleşmez — doğru Türkçe karakter kullanın.' },
            { type: 'success', text: 'Responsive Tasarım: Şirket Rehberi mobil cihazlarda otomatik olarak tek sütun kart görünümüne geçer. Tablet boyutunda 2 sütun gösterilir. Her durumda tüm bilgiler erişilebilirdir.' }
        ],
        faq: [
            { q: 'Bir çalışanın telefon numarasını göremiyorum, neden?', a: 'Telefon numarası çalışanın profil kayıtlarında girilmemişse rehberde görünmez. Çalışan profil sayfasındaki (Profilim > İletişim sekmesi) telefon alanını doldurmalıdır. Kendi bilgilerinizi güncellemek için Profil > İletişim sekmesini kullanın.' },
            { q: 'Ayrılan bir çalışanı neden göremiyorum?', a: 'Şirket Rehberi güvenlik ve gizlilik nedeniyle yalnızca aktif (is_active=True) çalışanları listeler. İşten ayrılan veya pasif durumdaki çalışanlar rehberden otomatik çıkarılır. Geçmiş çalışan bilgilerine erişmek için Çalışan Yönetimi sayfasında (PAGE_EMPLOYEES yetkisi gerekir) "Pasif" filtresi kullanılabilir.' },
            { q: 'Durum bilgisi ne sıklıkla güncelleniyor?', a: 'Çalışan durumları iki katmanlı güncelleme ile çalışır: (1) Backend\'de Celery task her 30 saniyede canlı durum hesaplar (update_attendance_periodic). (2) Frontend\'de smart polling her 60 saniyede verileri çeker. Dolayısıyla bir çalışan giriş yaptığında en fazla 90 saniye içinde durum güncellenir.' },
            { q: 'Departman bazında filtreleme yapabilir miyim?', a: 'Doğrudan departman dropdown filtresi mevcut değildir, ancak özet kartlarına tıklayarak (Ofiste/İzinde/Dışarıda) durum bazlı filtreleme yapabilirsiniz. Ayrıca arama kutusuna departman adı yazarak ilgili çalışanları bulabilirsiniz.' },
            { q: 'Kart ve liste görünümü arasında nasıl geçiş yaparım?', a: 'Sağ üst köşedeki iki toggle butonu kullanın: Grid ikonu (kart görünümü) ve Liste ikonu (tablo görünümü). Görünüm tercihiniz oturumunuz boyunca korunur.' },
            { q: '"Ulaşılabilir" etiketi ne anlama geliyor?', a: '"Ulaşılabilir" etiketi, çalışanın şu an ofiste olduğunu ve iletişime açık olduğunu gösterir. Giriş yapmış ve aktif durumda olan çalışanlara bu etiket eklenir. Yeşil durum noktası ile birlikte gösterilir.' }
        ]
    },
    {
        id: 'dilek-sikayetler',
        title: 'Dilek ve Şikayetler',
        icon: MessageSquare,
        description: 'Şikâyet, öneri ve teşekkür gönderme, dosya ekleme, durum takibi, detay modalı ve yönetim yanıt paneli',
        permission: null,
        link: '/feedback',
        images: [
            { src: '/help-images/11-feedback.png', caption: 'Dilek ve Şikayetler sayfası — geri bildirim listesi, kategori rozetleri (Şikâyet/Öneri/Teşekkür), durum kartları ve arama' },
            { src: '/help-images/11a-feedback-manager.png', caption: 'Yönetim paneli — tüm geri bildirimler, 4 alt sekme (Tümü/Cevaplanmamışlar/Onaylananlar/Reddedilenler), yanıt formu' }
        ],
        steps: [
            {
                title: 'Yeni Geri Bildirim Oluşturma',
                description: '"Yeni Geri Bildirim" düğmesine tıklayarak oluşturma modalını açın. Modal adımları:\n\n1. Kategori Seçimi — 3 butonlu grid:\n   • Şikâyet (kırmızı çerçeve, AlertCircle ikonu) — Sorun veya memnuniyetsizlik bildirimi.\n   • Öneri (amber çerçeve, Lightbulb ikonu) — İyileştirme önerisi veya fikir.\n   • Teşekkür (yeşil çerçeve, Heart ikonu) — Takdir ve teşekkür mesajı.\n\n2. Başlık — Geri bildirimin kısa özeti (zorunlu, max 200 karakter).\n3. Açıklama — Detaylı açıklama metni (metin alanı, isteğe bağlı ama önerilir).\n4. Dosya Ekleme — İsteğe bağlı:\n   • Max 3 dosya, her biri max 5MB.\n   • Desteklenen formatlar: JPG, JPEG, PNG, PDF, DOC, DOCX.\n   • Dosya listesinde her dosyanın adı, boyutu ve silme (X) butonu gösterilir.\n   • Geçersiz format veya boyut aşımında kırmızı hata mesajı.\n\n5. "Gönder" butonu ile geri bildirimi iletin. Başarılı gönderim sonrası yeşil bildirim ve modal kapanır.',
                image: { src: '/help-images/11-feedback.png', caption: 'Dilek ve Şikayetler — geri bildirim listesi ve oluşturma' }
            },
            {
                title: 'Dosya Ekleme Kuralları',
                description: 'Geri bildiriminize kanıt veya açıklayıcı dosyalar ekleyebilirsiniz. Kurallar:\n\n• Maksimum Dosya Sayısı: 3 dosya.\n• Maksimum Dosya Boyutu: Her dosya en fazla 5MB.\n• Desteklenen Formatlar: JPG, JPEG, PNG (görsel), PDF (belge), DOC, DOCX (Word belgesi).\n• Dosya Yönetimi: Eklenen dosyalar listede gösterilir — dosya adı, boyut (KB/MB) ve silme butonu (X). Dosyayı eklemeden önce silmek için X butonuna tıklayın.\n• Hata Mesajları: Geçersiz format → "Bu dosya formatı desteklenmiyor". Boyut aşımı → "Dosya boyutu 5MB\'ı aşamaz". Sayı aşımı → "En fazla 3 dosya eklenebilir".\n\nDosyalar Cloudinary bulut depolamasında güvenli olarak saklanır.'
            },
            {
                title: 'Durum Takibi ve Filtreleme',
                description: '"Geri Bildirimlerim" sekmesinde gönderdiğiniz tüm geri bildirimlerin durumunu takip edebilirsiniz. Durum akışı:\n\n• Beklemede (PENDING, gri badge) — Yeni gönderildi, henüz incelenmedi.\n• İnceleniyor (IN_REVIEW, mavi badge) — Yetkili tarafından inceleniyor.\n• Cevaplandı (RESPONDED, yeşil badge) — Yanıt verildi, detay modalında okuyabilirsiniz.\n• Reddedildi (REJECTED, kırmızı badge) — Red gerekçesi ile kapatıldı.\n• Kapatıldı (CLOSED, gri badge) — İşlem tamamlandı, arşivlendi.\n\nFiltreler: Durum filtresi (dropdown), arama kutusu (başlık ve içerik bazında), kategori filtresi (Şikâyet/Öneri/Teşekkür). Her geri bildirimde kategori badge\'i ve durum badge\'i yan yana gösterilir.'
            },
            {
                title: 'Detay Modalı ve Yanıt Görüntüleme',
                description: 'Geri bildirime tıklayarak detay modalını açın. Modal içeriği:\n\n• Üst Bölüm — Kategori badge, durum badge, oluşturma tarihi ve saati.\n• Başlık — Geri bildirim başlığı.\n• Açıklama — Tam açıklama metni.\n• Ekli Dosyalar — Her dosya için indirme linki (tıklanabilir). Görseller küçük önizleme ile gösterilir.\n• Yönetici Yanıtı — Yanıt verilmişse yeşil kutu içinde yanıt metni, yanıtlayan yönetici adı ve tarih.\n• Red Gerekçesi — Reddedilmişse kırmızı kutu içinde gerekçe metni.\n\nDetay modalı salt okunurdur — düzenleme yapılamaz.'
            },
            {
                title: 'Yönetim Paneli (Admin / Yetkili Yöneticiler)',
                description: 'SYSTEM_FULL_ACCESS yetkisi olan kullanıcılar "Tüm Geri Bildirimler" sekmesinde tüm çalışanların geri bildirimlerini görebilir. 4 alt sekme:\n\n1. Tümü — Tüm geri bildirimler, tarih sırasına göre.\n2. Cevaplanmamışlar — Henüz yanıt verilmemiş geri bildirimler (aksiyon gerektirenler).\n3. Onaylananlar — Yanıtlanmış ve kapatılmış geri bildirimler.\n4. Reddedilenler — Red edilmiş geri bildirimler.\n\nHer geri bildirim kartında:\n• "İncele" butonu → Detay modalını açar.\n• "Yanıtla" butonu → Yanıt formu açılır (metin alanı + gönder butonu).\n• "Durum Güncelle" → Dropdown ile durum değiştirme.\n• Çalışan bilgileri: ad, departman, gönderim tarihi.',
                image: { src: '/help-images/11a-feedback-manager.png', caption: 'Yönetim paneli — tüm geri bildirimler ve yanıt formu' }
            },
            {
                title: 'Geri Bildirim Silme',
                description: 'Gönderdiğiniz geri bildirimleri silebilirsiniz:\n\n• "Sil" butonuna tıklayın (çöp kutusu ikonu).\n• Onay dialogu açılır — geri bildirim başlığı gösterilir, "Bu geri bildirimi silmek istediğinize emin misiniz?" sorusu sorulur.\n• "Sil" onayı ile kalıcı olarak silinir.\n\nÖnemli: Yanıtlanmış geri bildirimler kayıt bütünlüğü için silinemeyebilir. Silme işlemi geri alınamaz.'
            }
        ],
        tips: [
            { type: 'info', text: 'Gizlilik: Geri bildirimleriniz yalnızca yetkili yöneticiler (SYSTEM_FULL_ACCESS) ve sistem yöneticileri tarafından görüntülenebilir. Diğer çalışanlar sizin geri bildirimlerinize hiçbir şekilde erişemez. Anonim gönderim desteklenmez — gönderen bilgisi her zaman kaydedilir.' },
            { type: 'info', text: 'Dosya Ekleme: Maksimum 3 dosya, her biri en fazla 5MB. Desteklenen formatlar: JPG, JPEG, PNG, PDF, DOC, DOCX. Ekran görüntüsü (screenshot) göndermek sorunun hızlı anlaşılmasına yardımcı olur. Dosyalar Cloudinary\'de güvenli saklanır ve sadece yetkili kullanıcılar erişebilir.' },
            { type: 'warning', text: 'Silme Kalıcıdır: Silme işlemi geri alınamaz. Onay dialogunda geri bildirim başlığı gösterilir — doğru geri bildirimi sildiğinizden emin olun. Yanıtlanmış geri bildirimler kayıt bütünlüğü için silinemeyebilir.' },
            { type: 'success', text: 'Arama Fonksiyonu: Arama kutusunu kullanarak eski geri bildirimlerinizi başlık veya içerik bazında hızlıca bulabilirsiniz. Arama Türkçe karakterleri destekler ve anlık filtreleme yapar.' },
            { type: 'info', text: 'Kategori Seçimi: Doğru kategori seçimi geri bildiriminizin hızlı işleme alınmasını sağlar. Teknik sorunlar için "Şikâyet", süreç iyileştirmeleri için "Öneri", iyi çalışmaları takdir etmek için "Teşekkür" kategorisini kullanın.' },
            { type: 'warning', text: 'Yanıt Bekleme Süresi: Geri bildirimler yöneticiler tarafından incelenene kadar "Beklemede" durumunda kalır. Acil konular için doğrudan yöneticinizle iletişime geçmeniz önerilir. Geri bildirim sistemi resmi kayıt ve izleme amacıyla tasarlanmıştır.' }
        ],
        faq: [
            { q: 'Geri bildirimimi kim görebiliyor?', a: 'Geri bildirimleriniz yalnızca SYSTEM_FULL_ACCESS yetkisine sahip sistem yöneticileri ve yetkili yöneticiler tarafından görüntülenir. Diğer çalışanlar erişemez. Gönderen bilgisi (adınız, departmanınız) her zaman kaydedilir — anonim gönderim yoktur.' },
            { q: 'Dosya ekleyemiyorum, ne yapmalıyım?', a: 'Şunları kontrol edin:\n• Dosya boyutu 5MB\'ın altında mı? (her dosya max 5MB)\n• Dosya sayısı 3\'ü aşmadı mı? (max 3 dosya)\n• Dosya formatı destekleniyor mu? (JPG, JPEG, PNG, PDF, DOC, DOCX)\n\nFarklı formattaki dosyalar (örn: ZIP, EXE, MP4) reddedilir. Büyük dosyaları sıkıştırarak veya format dönüştürerek deneyin.' },
            { q: 'Yanıtımı ne zaman alabilirim?', a: 'Yanıt süresi yöneticilerin iş yoğunluğuna bağlıdır. Geri bildiriminiz "Beklemede" → "İnceleniyor" → "Cevaplandı/Reddedildi" akışını izler. Durum değişikliklerinde bildirim alırsınız (bildirim tercihiniz açıksa). Acil konular için doğrudan yöneticinizle iletişime geçin.' },
            { q: 'Geri bildirimimi düzenleyebilir miyim?', a: 'Gönderildikten sonra geri bildirim metni düzenlenemez. Hatalı gönderim yaptıysanız eski geri bildirimi silip (yanıtlanmamışsa) yeni bir tane oluşturabilirsiniz. Ek bilgi eklemek istiyorsanız yeni geri bildirim oluşturarak referans verin.' },
            { q: 'Tüm geri bildirimleri göremiyorum, neden?', a: '"Geri Bildirimlerim" sekmesi sadece kendi gönderdiğiniz geri bildirimleri gösterir. Tüm çalışanların geri bildirimlerini görmek için "Tüm Geri Bildirimler" sekmesine geçin — bu sekme yalnızca SYSTEM_FULL_ACCESS yetkisi olan kullanıcılara görünür.' },
            { q: 'Şikâyet ve öneri arasındaki fark nedir?', a: 'Şikâyet: Mevcut bir sorun, aksaklık veya memnuniyetsizlik bildirimi (örn: "Ofis kliması çalışmıyor"). Öneri: İyileştirme fikri veya süreç önerisi (örn: "Esnek çalışma saatleri uygulanabilir"). Teşekkür: Takdir ve pozitif geri bildirim (örn: "IT ekibinin hızlı desteği için teşekkürler"). Doğru kategori seçimi işleme süresini hızlandırır.' }
        ]
    },
    {
        id: 'vekalet-yonetimi',
        title: 'Vekalet Yönetimi',
        icon: UserCheck,
        description: 'Yönetici vekalet tanımlama, kapsamlı yetki devri, süre takibi, otomatik sonlandırma ve vekalet loglama',
        permission: null,
        link: '/substitute-management',
        images: [
            { src: '/help-images/12-substitute.png', caption: 'Vekalet Yönetimi — 4 özet kartı (Toplam/Aktif/Gelecek/Süresi Dolmuş), vekalet kartları ve durum renk kodları' },
            { src: '/help-images/12a-substitute-manager.png', caption: 'Yönetici vekalet görünümü — yeni vekalet formu, verilen/vekil olunan sekmeler ve düzenleme seçenekleri' }
        ],
        steps: [
            {
                title: 'Özet Kartları — 4 Durum',
                description: 'Sayfanın üst kısmında 4 özet kartı ile vekalet durumunuzu anlık takip edebilirsiniz:\n\n• Toplam (gri, Hash ikonu) — Sistemdeki toplam vekalet kaydı sayısı.\n• Aktif (yeşil, CheckCircle ikonu) — Şu an geçerli olan (başlangıç tarihi geçmiş, bitiş tarihi gelmemiş) vekaletler.\n• Gelecek (mavi, Clock ikonu) — Henüz başlamamış (başlangıç tarihi gelecekte) vekaletler.\n• Süresi Dolmuş (amber, AlertTriangle ikonu) — Bitiş tarihi geçmiş vekaletler.\n\nKartlar tıklanabilirdir — tıklayarak ilgili durumdaki vekaletleri filtreleyebilirsiniz.',
                image: { src: '/help-images/12-substitute.png', caption: 'Vekalet Yönetimi — özet kartları ve vekalet listesi' }
            },
            {
                title: 'Yeni Vekalet Tanımlama',
                description: '"Yeni Vekalet" bölümünü açarak vekalet oluşturma formuna erişin. Form alanları:\n\n1. Asıl Yönetici — Aranabilir dropdown. Vekaleten temsil edilecek yöneticiyi seçin. Genellikle kendinizi seçersiniz.\n2. Vekil Yönetici — Aranabilir dropdown. Vekalet verilecek kişiyi seçin. Kural: Asıl ve vekil aynı kişi olamaz (validasyon hatası verir).\n3. Başlangıç Tarihi — Vekaletin geçerli olacağı ilk gün. Tarih seçici ile belirleyin.\n4. Bitiş Tarihi — Vekaletin sona ereceği son gün. Bitiş, başlangıçtan önce olamaz (validasyon kontrolü).\n5. Aktif Durumu — Toggle: Açık ise vekalet hemen geçerli, kapalı ise pasif (manuel aktifleştirme beklenir).\n\n"Kaydet" butonuna tıklayarak vekaleti oluşturun. Başarılı oluşturma sonrası yeşil bildirim gösterilir ve vekalet listesine eklenir.',
                image: { src: '/help-images/12a-substitute-manager.png', caption: 'Yeni vekalet formu ve düzenleme seçenekleri' }
            },
            {
                title: 'Vekalet Kartı Bilgileri ve Görsel Göstergeler',
                description: 'Her vekalet kaydı bir kart olarak gösterilir. Kart içeriği:\n\n• Sol Bordür — Duruma göre renk: Yeşil = aktif, Mavi = gelecek, Amber = süresi dolmuş, Gri = pasif.\n• Asıl Yönetici — Mavi avatar (baş harfler) + tam ad + departman.\n• Ok İşareti (→) — Yetki devri yönünü gösterir.\n• Vekil Yönetici — Yeşil avatar (baş harfler) + tam ad + departman.\n• Tarih Aralığı — Başlangıç ve bitiş tarihleri.\n• İlerleme Çubuğu — Aktif vekaletlerde geçen sürenin yüzdesi (doluluk oranı). Renk: yeşil (<%50) → turuncu (%50-80) → kırmızı (>%80).\n• Toplam Gün Sayısı — Vekalet süresi kaç gün.\n• Kalan Gün — Aktif vekaletlerde bitiş tarihine kaç gün kaldığı.\n• Durum Badge — "Aktif" (yeşil), "Gelecek" (mavi), "Süresi Dolmuş" (amber), "Pasif" (gri).\n• İşlem Butonları — Düzenle (kalem ikonu), Sil (çöp kutusu ikonu), Aktif/Pasif toggle.'
            },
            {
                title: 'Verdiğim ve Benim Vekaletlerim Sekmeleri',
                description: 'Sayfa iki ana sekmeden oluşur:\n\n• "Verilen Vekaletler" sekmesi — Sizin oluşturduğunuz (asıl yönetici olduğunuz) vekaletler listelenir. Düzenleme, silme ve aktif/pasif toggle işlemleri yapabilirsiniz.\n\n• "Benim Vekaletlerim" sekmesi — Size verilen (vekil olarak atandığınız) vekaletler listelenir. Bu sekmede salt okunur bilgi gösterilir — düzenleme yapılamaz (vekaleti veren kişi yönetir).\n\nHer iki sekmede de arama kutusu ile vekalet arayabilir ve durum filtresi uygulayabilirsiniz.'
            },
            {
                title: 'Vekalet Düzenleme ve Silme',
                description: 'Düzenleme: Vekalet kartındaki kalem ikonuna tıklayın. Düzenlenebilir alanlar:\n• Başlangıç/bitiş tarihi değiştirme (süre uzatma veya kısaltma).\n• Aktif/pasif durumu değiştirme.\n• Vekil yönetici değiştirme.\n\nSilme: Çöp kutusu ikonuna tıklayın. Onay dialogu açılır — "Bu vekaleti silmek istediğinize emin misiniz?" sorusu ile asıl ve vekil yönetici adları gösterilir. "Sil" onayıyla kalıcı olarak silinir.\n\nAktif/Pasif Toggle: Kartın sağ üst köşesindeki toggle ile vekaleti geçici olarak devre dışı bırakabilir veya tekrar aktifleştirebilirsiniz.'
            },
            {
                title: 'Otomatik Sonlandırma (Celery Task)',
                description: 'Vekalet süresi dolduğunda (bitiş tarihi geçtiğinde) yetki devri otomatik olarak geri alınır. Bu işlem Celery zamanlama görevi tarafından periyodik olarak kontrol edilir. Manuel işlem gerekmez.\n\nOtomatik sonlandırma sonrası:\n• Vekalet durumu "Süresi Dolmuş" olarak güncellenir.\n• Vekil yöneticinin vekalet yetkileri kaldırılır.\n• Asıl yönetici ve vekile bildirim gönderilir.\n• Sonlandırma işlemi audit log\'a kaydedilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Otomatik Sonlandırma: Vekalet süresi dolduğunda yetkiler otomatik olarak geri alınır — manuel işlem gerekmez. Celery zamanlama görevi bu kontrolü periyodik olarak yapar. Bitiş tarihini uzatmak isterseniz düzenleme butonuyla tarihi güncelleyin.' },
            { type: 'warning', text: 'Güvenlik Uyarısı: Vekalet verdiğiniz kişi, sizin adınıza talep onaylama/reddetme işlemi yapabilir. Bu nedenle vekaleti yalnızca güvendiğiniz ve yetkinliğinden emin olduğunuz kişilere verin. Vekil tarafından yapılan tüm işlemler loglanır ve denetim izleri saklanır.' },
            { type: 'success', text: 'İzin Öncesi Hazırlık: İzne çıkmadan önce mutlaka vekalet tanımlayın. Bu sayede ekibinizdeki taleplerin onay süreçleri aksamamış olur. Vekalet başlangıç tarihini izin başlangıcınıza, bitiş tarihini izin dönüş tarihinize ayarlayın.' },
            { type: 'info', text: 'Loglama ve Denetim: Vekil tarafından yapılan tüm onay/red işlemleri kayıt altına alınır. Talep detayında "Onaylayan: [Vekil Adı] (Vekalet ile)" şeklinde bilgi gösterilir. Bu sayede kimin hangi yetkiyle işlem yaptığı her zaman izlenebilir.' },
            { type: 'info', text: 'Birden Fazla Vekalet: Farklı kişilere farklı kapsamlarda aynı anda vekalet tanımlayabilirsiniz. Örneğin bir kişiye izin onay yetkisi, başka birine mesai onay yetkisi verebilirsiniz. Çakışan vekaletlerde en son tanımlanan geçerli olur.' },
            { type: 'warning', text: 'Vekalet Kapsamı: Vekalet verdiğiniz kişi sizin yetkileriniz dahilinde işlem yapabilir. Sizde olmayan bir yetkiyi vekalet yoluyla devredemezsiniz. Vekil, sizin onay hiyerarşinizdeki talepleri görebilir ve işlem yapabilir.' }
        ],
        faq: [
            { q: 'Vekalet süresini uzatabilir miyim?', a: 'Evet. Vekalet kartındaki düzenle (kalem) butonuna tıklayarak bitiş tarihini değiştirebilirsiniz. Yeni tarih mevcut bitiş tarihinden ileride olmalıdır. Değişiklik anında geçerli olur.' },
            { q: 'Birden fazla kişiye vekalet verebilir miyim?', a: 'Evet. Farklı kişilere farklı vekaletler tanımlayabilirsiniz. Her vekalet bağımsız olarak çalışır. Aynı kişiye birden fazla vekalet tanımlamanıza gerek yoktur — tek bir vekalet tüm onay yetkilerini kapsar.' },
            { q: 'Vekil onayladığında kimin onayladığı görünür mü?', a: 'Evet. Vekil tarafından yapılan tüm işlemler loglanır. Talep detayında onaylayan kişi adı ve "(Vekalet ile)" notu gösterilir. Denetim izlerinde vekalet bilgisi (asıl yönetici, vekil, tarih) ayrıca kaydedilir.' },
            { q: 'Vekalet verdiğim kişi vekaleti başkasına devredebilir mi?', a: 'Hayır. Vekalet devri (alt-vekalet) desteklenmez. Vekil, aldığı vekaleti üçüncü bir kişiye aktaramaz. Sadece vekalet tanımlayan kişi (asıl yönetici) yeni vekalet oluşturabilir.' },
            { q: 'Pasif vekaleti tekrar aktifleştirebilir miyim?', a: 'Evet. Vekalet kartındaki aktif/pasif toggle butonuyla vekaleti tekrar aktifleştirebilirsiniz. Bitiş tarihi geçmemişse hemen geçerli olur. Bitiş tarihi geçmişse önce tarihi güncelleyin, sonra aktifleştirin.' },
            { q: 'Vekalet otomatik sonlandırılınca ne oluyor?', a: 'Bitiş tarihi geldiğinde Celery görevi vekaleti otomatik sonlandırır. Vekil yöneticinin yetkileri geri alınır, durum "Süresi Dolmuş" olarak güncellenir. Hem asıl hem vekil yöneticiye bildirim gönderilir. İşlem audit log\'a kaydedilir.' }
        ]
    },
    {
        id: 'onay-surecleri',
        title: 'Onay Süreçleri',
        icon: CheckSquare,
        description: 'Talep onaylama/reddetme, gelen talepler sekmesi, 5 katmanlı onay hiyerarşisi, birincil/ikincil yönetici farkı ve bildirim sistemi',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE', 'APPROVAL_CARDLESS_ENTRY'],
        link: '/requests',
        images: [
            { src: '/help-images/10-requests.png', caption: 'Talepler sayfası — sekmeler (Taleplerim/Gelen Talepler/Mesai Ata/Analiz), bekleyen onay badge ve filtreler' },
            { src: '/help-images/10c-incoming-requests.png', caption: 'Gelen Talepler sekmesi — bekleyen talep listesi, onay/red butonları, talep detay kartları ve durum filtreleri' },
            { src: '/help-images/10a-requests-admin.png', caption: 'Admin talep görünümü — tüm talepler, toplu onay seçenekleri ve gelişmiş filtreler' }
        ],
        steps: [
            {
                title: 'Gelen Talepler Sekmesi ve Badge',
                description: 'Talepler sayfasında "Gelen Talepler" sekmesine tıklayın. Sekme yanındaki kırmızı badge bekleyen talep sayısını gösterir (örn: "Gelen Talepler (5)"). Badge sayısı her 60 saniyede otomatik güncellenir.\n\nGelen Talepler listesinde ekibinizden gelen bekleyen tüm talepler gösterilir. Her talep kartında:\n\n• Çalışan avatarı ve adı\n• Talep türü ikonu ve badge\'i (İzin/Mesai/Kartsız Giriş/Dış Görev)\n• Tarih aralığı ve süre\n• Açıklama metni (varsa)\n• Onay/Red butonları (yeşil ✓ / kırmızı ✗)\n\nFiltreler: Talep türü (dropdown), durum (Bekleyen/Onaylanan/Reddedilen), tarih aralığı, çalışan adı araması.',
                image: { src: '/help-images/10c-incoming-requests.png', caption: 'Gelen Talepler — bekleyen talep listesi ve onay butonları' }
            },
            {
                title: 'Talep Türleri — 4 Kategori',
                description: 'Gelen Talepler sekmesinde 4 farklı talep türü görülebilir:\n\n1. İzin Talepleri (CalendarDays ikonu, yeşil) — Yıllık izin, mazeret izni, doğum günü izni, yasal izinler. Talep detayında: izin türü, tarih aralığı, gün sayısı, çalışanın mevcut bakiyesi ve açıklama.\n\n2. Mesai Talepleri (Timer ikonu, mor) — Planlı (INTENDED), algılanan (POTENTIAL) veya manuel (MANUAL) ek mesai. Detayda: kaynak badge, tarih, saat aralığı, süre, iş tanımı, çalışanın haftalık OT durumu.\n\n3. Kartsız Giriş Talepleri (CreditCard ikonu, turuncu) — Kart okutamayan çalışanların giriş/çıkış kayıt talebi. Detayda: talep edilen tarih, giriş/çıkış saatleri, neden.\n\n4. Dış Görev Talepleri (MapPin ikonu, indigo) — Şirket dışı görev talepleri. Detayda: lokasyon, ulaşım, konaklama bilgileri.'
            },
            {
                title: 'Onay Hiyerarşisi — ApproverService 5 Katman',
                description: 'Sistem kademeli onay hiyerarşisi kullanır. Talep oluşturulduğunda ApproverService şu sırayla onaylayıcı arar:\n\n1. EmployeeManager (Birincil Yönetici) — Çalışanın PRIMARY olarak atanmış doğrudan yöneticisi. İlk ve en öncelikli onaylayıcı.\n\n2. DepartmentAssignment — Çalışanın ikincil görevlendirmelerindeki yönetici (matrix organizasyon).\n\n3. Department.manager — Çalışanın departmanına atanmış departman yöneticisi.\n\n4. reports_to Zinciri — Yönetici hiyerarşisi yukarı doğru taranır (yöneticinin yöneticisi vb.).\n\n5. Departman Hiyerarşisi Fallback — Son çare olarak üst departman yapısındaki yöneticiler.\n\nSistem maksimum 10 iterasyon yapar (döngüsel ilişkileri önlemek için). Uygun onaylayıcı bulunamazsa talep hata mesajı ile oluşturulamaz.'
            },
            {
                title: 'Talep İnceleme ve Detay Görüntüleme',
                description: 'Talep kartına tıklayarak detay panelini açın. Detay panelinde şu bilgiler gösterilir:\n\n• Çalışan Bilgileri — Ad, soyad, departman, pozisyon, avatar.\n• Talep Detayları — Tür, tarih aralığı, süre, açıklama, ekli dosyalar (varsa).\n• Durum Geçmişi — Talebin geçirdiği durum değişiklikleri (zaman damgalı).\n• Ek Bilgiler (talep türüne göre):\n  - İzin: Mevcut bakiye, kullanılacak gün, kalan bakiye.\n  - Mesai: Kaynak (Planlı/Algılanan/Manuel), haftalık OT durumu, çalışanın limit bilgisi.\n  - Kartsız Giriş: Talep edilen giriş/çıkış saatleri, çalışma programı bilgisi.\n  - Dış Görev: Lokasyon, ulaşım, konaklama detayları.\n\nDetay paneli salt okunurdur — onay/red işlemi butonlar ile yapılır.',
                image: { src: '/help-images/10-requests.png', caption: 'Talep detay ve onay/red butonları' }
            },
            {
                title: 'Onay ve Red İşlemi',
                description: 'Talebi inceledikten sonra:\n\n• Onayla (yeşil ✓ butonu) — Talebi onaylayın. Onay anında:\n  - Talep durumu APPROVED olur.\n  - İzin: Bakiyeden düşülür (FIFO).\n  - Mesai: Puantaja ve MonthlyWorkSummary\'ye yansır.\n  - Kartsız Giriş: Attendance kaydı otomatik oluşturulur ve hesaplama tetiklenir.\n  - Çalışana onay bildirimi gönderilir.\n\n• Reddet (kırmızı ✗ butonu) — Red gerekçesi yazma modalı açılır. Gerekçe zorunludur (boş bırakılamaz). "Reddet" butonuyla onaylayın. Çalışana red bildirimi ve gerekçe gönderilir.\n\nÖNEMLİ: Onaylanan talepler doğrudan geri alınamaz! Hatalı onay durumunda sistem yöneticisine başvurun.'
            },
            {
                title: 'Birincil ve İkincil Yönetici Farkı',
                description: 'Yönetici türlerine göre yetki kapsamı farklıdır:\n\n• Birincil (PRIMARY) Yönetici:\n  - Tüm talep türlerini görebilir ve onaylayabilir: İzin, Mesai, Kartsız Giriş, Dış Görev.\n  - Gelen Talepler sekmesinde tüm subordinate talepleri listelenir.\n  - IncomingRequestsTab\'da PRIMARY-only subordinate filtresi uygulanır.\n\n• İkincil (SECONDARY) Yönetici:\n  - SADECE ek mesai (OT) işlemlerini görebilir ve onaylayabilir.\n  - İzin ve kartsız giriş talepleri ikincil yöneticiye GİTMEZ.\n  - Gelen Talepler sekmesinde sadece mesai talepleri görünür.\n  - Kartsız giriş red guard\'ı: SECONDARY reject yapamaz.\n  - TeamAnalytics\'de SECONDARY sadece OT analizlerini görür.\n  - AttendanceTracking\'de SECONDARY sınırlı bilgi görür.\n\nBu ayrım manager_redesign (Stage 51) ile uygulanmıştır.'
            },
            {
                title: 'Bildirim Sistemi ve Eskalasyon',
                description: 'Onay sürecinin her aşamasında bildirimler gönderilir:\n\n• Talep oluşturulduğunda → Onaylayıcı yöneticiye bildirim.\n• Talep onaylandığında → Çalışana onay bildirimi.\n• Talep reddedildiğinde → Çalışana red bildirimi + gerekçe.\n• Talep iptal edildiğinde → İlgili taraflara iptal bildirimi.\n• Yönetici değiştiğinde → Bekleyen talepler otomatik devredilir, 3 yönlü bildirim (yeni yönetici + eski yönetici + çalışan).\n\nÜst menüdeki bildirim zili (Bell ikonu) ile bekleyen bildirim sayısı gösterilir. Zile tıklayarak bildirim listesini açabilir, bildirime tıklayarak ilgili sayfaya gidebilirsiniz.'
            },
            {
                title: 'Ekip Filtreleri ve Toplu İşlem',
                description: 'Gelen Talepler sekmesinde gelişmiş filtreler mevcuttur:\n\n• Talep Türü — Tümü/İzin/Mesai/Kartsız Giriş/Dış Görev dropdown.\n• Durum — Bekleyen/Onaylanan/Reddedilen/İptal dropdown.\n• Tarih Aralığı — Başlangıç ve bitiş tarih filtreleri.\n• Çalışan Arama — İsim bazında arama.\n• Departman — Belirli bir departmandaki talepler.\n\nToplu Onay: Checkbox\'lar ile birden fazla talebi seçip "Toplu Onayla" butonu ile tek seferde onaylayabilirsiniz. Her talep için ayrı onay işlemi tetiklenir.',
                image: { src: '/help-images/10a-requests-admin.png', caption: 'Admin görünümü — gelişmiş filtreler ve toplu onay' }
            }
        ],
        tips: [
            { type: 'warning', text: 'Onay Geri Alınamaz: Onaylanan talepler doğrudan geri alınamaz! Onay anında izin bakiyesinden düşüm, puantaj kaydı oluşturma vb. işlemler tetiklenir. Hatalı onay durumunda sistem yöneticisine başvurun. Onaylamadan önce talep detaylarını dikkatlice inceleyin.' },
            { type: 'info', text: 'Yetki Kodları: Onay yetkileriniz rolünüze atanmış kodlara bağlıdır:\n• APPROVAL_OVERTIME — Fazla mesai taleplerini onaylama yetkisi.\n• APPROVAL_LEAVE — İzin taleplerini onaylama yetkisi.\n• APPROVAL_CARDLESS_ENTRY — Kartsız giriş taleplerini onaylama yetkisi.\nYalnızca atanmış yetkilerdeki talepleri görebilir ve işlem yapabilirsiniz.' },
            { type: 'info', text: 'Vekalet ile Onay: Vekalet sistemi aktifse, vekil tayin ettiğiniz kişi sizin adınıza onay/red verebilir. Vekil tarafından yapılan işlemler loglanır ve talep detayında "(Vekalet ile)" notu gösterilir. Uzun süreli izinlerde vekalet tanımlamanız önerilir.' },
            { type: 'success', text: 'Bildirim Zili: Üst menüdeki bildirim zili (Bell ikonu) bekleyen talep ve bildirim sayısını kırmızı badge ile gösterir. Zile tıklayarak bildirim listesini açın, bildirimi tıklayarak doğrudan ilgili sayfaya (Gelen Talepler) gidin. Yeni bildirimler zil animasyonu ile vurgulanır.' },
            { type: 'info', text: 'Ekip Filtreleri: Büyük ekiplerde talepleri yönetmek için filtreler kritiktir. Talep türü, durum, tarih aralığı ve çalışan adı filtreleri kombine kullanılabilir. Filtreler URL parametrelerinde saklanır — sayfayı yenilediğinizde filtre ayarlarınız korunur.' },
            { type: 'warning', text: 'Kendi Talebini Onaylama Engeli: Sistem, bir çalışanın kendi talebini onaylamasını engeller. Kendi talep yapıp kendi onaylamaya çalıştığınızda hata mesajı alırsınız. Bu güvenlik önlemi çıkar çatışmasını önler.' },
            { type: 'info', text: 'Talep Devri: Birincil yönetici değiştiğinde (EmployeeManager post_save sinyali) bekleyen PENDING talepler otomatik olarak yeni yöneticiye devredilir. 3 yönlü bildirim gönderilir: yeni yönetici, eski yönetici ve çalışan bilgilendirilir. Bu sayede yönetici değişikliğinde onay süreçleri aksamamış olur.' }
        ],
        faq: [
            { q: 'Bekleyen onayım var ama Gelen Talepler sekmesinde göremiyorum?', a: 'Şunları kontrol edin:\n1. Onay yetkiniz var mı? APPROVAL_OVERTIME, APPROVAL_LEAVE veya APPROVAL_CARDLESS_ENTRY yetkilerinden en az birine sahip olmanız gerekir.\n2. Talep size mi yönlendirilmiş? Çalışanın birincil yöneticisi siz misiniz?\n3. İkincil yönetici iseniz sadece mesai taleplerini görürsünüz — izin ve kartsız giriş gelmez.\n4. Vekalet ile mi görevlendirildiniz? Vekalet aktif ve geçerli tarih aralığında mı?\nSorun devam ediyorsa sistem yöneticinize başvurun.' },
            { q: 'Yanlışlıkla onay verdim, geri alabilir miyim?', a: 'Hayır, onaylanan talepler doğrudan geri alınamaz. Onay anında sistem otomatik işlemler yapar (bakiye düşümü, puantaj kaydı, bildirim). Düzeltme için sistem yöneticisine başvurun. Yönetici gerekli düzeltmeleri (iptal, bakiye iadesi) yapabilir. Bu nedenle onaylamadan önce detayları dikkatlice inceleyin.' },
            { q: 'İkincil yöneticim mesai onaylamıyor, neden?', a: 'İkincil (SECONDARY) yöneticinin şunlara sahip olması gerekir:\n1. APPROVAL_OVERTIME yetkisi atanmış olmalı.\n2. Çalışanla aktif SECONDARY ilişkisi bulunmalı.\n3. İkincil yönetici SADECE ek mesai taleplerini görebilir — izin ve kartsız giriş gelmez.\n4. Vekalet durumu kontrol edilmeli.\nSorun devam ediyorsa Çalışan Yönetimi sayfasından yönetici atamalarını kontrol edin.' },
            { q: 'Eskalasyon nasıl çalışır?', a: 'Bir talep belirli süre içinde onaylanmaz veya uygun onaylayıcı bulunamazsa sistem otomatik eskalasyon yapar. Onay hiyerarşisi yukarı doğru taranır: Birincil yönetici → İkincil → Departman yöneticisi → reports_to zinciri → Üst departman. Eskalasyon bildirim tercihlerinizde açıksa ilgili taraflara bildirim gönderilir.' },
            { q: 'Red gerekçesi zorunlu mu?', a: 'Evet, bir talebi reddederken gerekçe yazmak zorunludur. Boş gerekçe ile red yapamazsınız. Red gerekçesi çalışana bildirim ile iletilir ve talep detayında kalıcı olarak saklanır. Açıklayıcı ve profesyonel bir gerekçe yazmanız önerilir.' },
            { q: 'Birden fazla talebi aynı anda onaylayabilir miyim?', a: 'Evet. Gelen Talepler listesinde her talebin solundaki checkbox\'ı işaretleyerek birden fazla talebi seçin. Listenin üstündeki "Toplu Onayla" butonuna tıklayarak tüm seçili talepleri tek seferde onaylayabilirsiniz. Her talep için ayrı onay işlemi tetiklenir ve ilgili bildirimler gönderilir.' },
            { q: 'Talep bildirimlerini nasıl yönetirim?', a: 'Bildirim tercihlerinizi Profil > Bildirimler sekmesinden yönetebilirsiniz. İzin onay/red, mesai onay/red, vekalet ve eskalasyon bildirimleri ayrı ayrı açılıp kapatılabilir. Önemli bildirimler (onay bekleyen talepler) için bildirimleri açık tutmanız önerilir.' }
        ]
    },
    {
        id: 'raporlar',
        title: 'Raporlar',
        icon: BarChart3,
        description: 'Aylık mutabakat raporu, mali dönem bazlı filtreleme, çalışma takvimi seçimi, Excel/PDF dışa aktarma ve talep analizleri',
        permission: 'PAGE_REPORTS',
        link: '/reports',
        images: [
            { src: '/help-images/13-reports.png', caption: 'Raporlar sayfası — çalışma takvimi seçici, mali dönem filtresi, personel seçimi, rapor aralığı bilgi kutusu ve indirme butonları' },
            { src: '/help-images/13a-reports-detail.png', caption: 'Rapor detay görünümü — aylık çalışma özeti tablosu, hedef/gerçekleşen/fark sütunları ve OT/izin/sağlık raporu bilgileri' }
        ],
        steps: [
            {
                title: 'Çalışma Takvimi Seçimi',
                description: 'Sayfanın üst kısmındaki ilk dropdown\'dan çalışma takvimini (FiscalCalendar) seçin. Sistemde tanımlı tüm mali takvimler listelenir. Varsayılan takvim yıldız (★) ikonu ile işaretlenir ve otomatik seçili gelir.\n\nSeçtiğiniz takvim şunları belirler:\n• Mali dönem sınırları (varsayılan: ayın 26\'sından sonraki ayın 25\'ine)\n• Hedef çalışma saatleri (iş günü sayısı × günlük çalışma süresi)\n• Tatil günleri ve yarım gün tatiller\n• Tolerans ve mola ayarları\n\nFarklı çalışma takvimleri farklı personel gruplarına atanabilir (örn: ofis çalışanları vs saha çalışanları).',
                image: { src: '/help-images/13-reports.png', caption: 'Raporlar — takvim ve dönem seçiciler' }
            },
            {
                title: 'Mali Dönem Filtresi',
                description: 'İkinci dropdown\'dan hedef mali dönemi seçin. Her dönem "Ay Yıl" formatında listelenir (örn: "Mart 2026"). Önemli göstergeler:\n\n• Kilitli dönemler — Kilit (🔒) ikonu ile gösterilir. Kilitli dönemlerdeki puantaj kayıtları değiştirilemez.\n• Açık dönemler — Kilit yok, düzenleme yapılabilir.\n• Mevcut dönem — Yeşil vurgu ile işaretlenir.\n\nMali dönem kuralı: 26-25 Türk bordro döngüsü. Örneğin "Şubat 2026" dönemi = 26 Ocak 2026 – 25 Şubat 2026 tarih aralığını kapsar.'
            },
            {
                title: 'Personel Filtresi',
                description: 'Üçüncü dropdown\'dan rapor kapsamını belirleyin:\n\n• "Tüm Çalışanlar" — Seçili takvime atanmış tüm personelin toplu raporu.\n• Belirli bir çalışan — Dropdown\'dan isim seçerek sadece o kişinin raporunu oluşturun.\n\nPersonel listesi seçili takvime göre filtrelenir — yalnızca o takvime atanmış çalışanlar gösterilir. Arama kutusu ile isim araması yapabilirsiniz.'
            },
            {
                title: 'Rapor Aralığı Bilgi Kutusu',
                description: 'Seçimlerinize göre mavi bilgi kutusu (InfoCard) gösterilir:\n\n"Rapor Aralığı: [başlangıç tarihi] - [bitiş tarihi]"\n\nÖrnek: "Rapor Aralığı: 26.02.2026 - 25.03.2026"\n\nBu kutu seçili mali dönemin tam tarih aralığını gösterir ve raporun hangi tarihleri kapsayacağını netleştirir.'
            },
            {
                title: 'Excel Raporu İndirme',
                description: '"Excel İndir" butonuna (gri arka plan, FileSpreadsheet ikonu) tıklayın. İndirme süreci:\n\n1. Buton "Hazırlanıyor..." olarak değişir ve tıklanamaz hale gelir (loading state).\n2. Backend rapor oluşturur (ReportService tarafından).\n3. Dosya otomatik olarak indirilir.\n4. Dosya adı formatı: Mesai_Raporu_[yıl]_[ay].xlsx\n\nExcel raporu içeriği:\n• Çalışan bazlı aylık çalışma özeti\n• Günlük giriş/çıkış saatleri\n• Normal çalışma, fazla mesai, eksik süreler\n• İzin günleri, sağlık raporu günleri\n• Hedef ve gerçekleşen çalışma süreleri\n• Bakiye (fark) hesaplaması\n\nExcel formatı detaylı veri analizi ve filtreleme için uygundur.',
                image: { src: '/help-images/13a-reports-detail.png', caption: 'Rapor içeriği — aylık çalışma özeti' }
            },
            {
                title: 'PDF Raporu İndirme',
                description: '"PDF İndir" butonuna (kırmızı arka plan, FileText ikonu) tıklayın. İndirme süreci Excel ile aynıdır. Dosya adı: Mesai_Raporu_[yıl]_[ay].pdf\n\nPDF raporu içeriği Excel ile aynı verileri içerir ancak baskıya hazır formatlanmıştır:\n• Şirket logo ve başlık\n• Tablo formatında çalışma özeti\n• Sayfa numaralandırma\n• Alt bilgi (oluşturma tarihi, rapor parametreleri)\n\nPDF formatı baskı, imza ve arşivleme için uygundur.'
            },
            {
                title: 'Talep Analizleri Sayfası (/request-analytics)',
                description: 'Detaylı talep analizleri için ayrı bir sayfa mevcuttur. Sol menüden veya Raporlar sayfasındaki bağlantıdan erişebilirsiniz. 10 bölüm:\n\n1. KPI Kartları — Toplam talep, onay oranı, ortalama onay süresi, en çok talep eden.\n2. Aylık Trend — Çubuk grafik, aylık talep sayıları.\n3. Pie Dağılımlar — Talep türü, durum ve kaynak dağılımları.\n4. Ekip Analizi — Departman, rol ve kişi bazlı talep istatistikleri.\n5. Ek Mesai Analizi — Kaynak dağılımı, atama/talep oranı, haftalık trend.\n6. İzin Analizi — Tür dağılımı, kullanım oranı, dönemsel trend.\n7. OT-Yemek Korelasyonu — Fazla mesai ile yemek siparişi ilişkisi.\n8. Dolaylı Talepler — Vekalet ile yapılan onaylar.\n9. Haftalık Pattern — Haftanın günlerine göre talep ısı haritası (heatmap).\n10. Detay Tabloları — Kişi bazlı detaylı döküm.\n\nBu sayfa PAGE_REPORTS yetkisi gerektirir ve lazy-loaded chunk olarak yüklenir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Mali Dönem 26-25 Kuralı: Türk bordro döngüsü takip edilir. "Şubat 2026 dönemi" = 26 Ocak 2026 – 25 Şubat 2026 tarih aralığını kapsar. Rapor tarih filtreleri bu döneme göre çalışır. Mali dönem başlangıç günü SystemSettings.fiscal_period_start_day ile ayarlanabilir (varsayılan: 26).' },
            { type: 'success', text: 'Format Farkları: Excel formatı detaylı veri analizi, filtreleme, pivot tablo ve formül çalışması için idealdir. PDF formatı baskı, imza, arşivleme ve resmi paylaşım için uygundur. Her iki format da aynı veri kaynağından üretilir — içerik aynıdır, sunum farklıdır.' },
            { type: 'warning', text: 'Yetki Gereksinimi: Bu sayfa PAGE_REPORTS yetkisi gerektirir. Sayfayı yan menüde göremiyorsanız veya erişim engeli alıyorsanız sistem yöneticinize başvurarak yetki talebinde bulunun. Genellikle yönetici, muhasebe ve İK rollerine bu yetki tanımlıdır.' },
            { type: 'info', text: 'Kilitli Dönem: Kilitli (🔒) mali dönemlerdeki puantaj kayıtları değiştirilemez — is_immutable bayrağı aktiftir. Bu dönemlerin raporları nihai ve resmi niteliktedir. Kilitli dönemdeki raporlar "KİLİTLİ" etiketi ile işaretlenir.' },
            { type: 'success', text: 'Rapor Hızı: Rapor oluşturma backend\'de ReportService tarafından yapılır. Büyük kadrolarda (100+ çalışan) rapor oluşturma birkaç saniye sürebilir. İndirme butonu loading state ile kullanıcıyı bilgilendirir. Rapor hazır olduğunda otomatik indirilir.' },
            { type: 'info', text: 'Talep Analizleri: /request-analytics sayfası 10 farklı analiz bölümü sunar. Backend\'de RequestAnalyticsViewSet comprehensive action ile tüm veriler tek seferde çekilir. Grafiklerde hover ile detay tooltip gösterilir. Sayfa lazy-loaded olarak yüklenir — ilk açılışta kısa bir yükleme süresi olabilir.' }
        ],
        faq: [
            { q: 'Rapor sayfasını göremiyorum, neden?', a: 'PAGE_REPORTS yetkisi gereklidir. Bu yetki genellikle ROLE_ADMIN, ROLE_ACCOUNTING ve ROLE_MANAGER rollerine tanımlıdır. Sistem yöneticinize başvurarak yetki talebinde bulunun. Yetkiniz atandıktan sonra yan menüde "Raporlar" seçeneği görünecektir.' },
            { q: 'Aylık çalışma bakiyesi nasıl hesaplanır?', a: 'MonthlyWorkSummary modeli mali dönem içindeki verileri toplar:\n• Hedef Çalışma = İş günü sayısı × Günlük çalışma süresi (tatil ve sağlık raporu günleri düşülür)\n• Gerçekleşen = Tüm günlerin toplam çalışma süresi\n• Fazla Mesai = Onaylanan OT süreleri\n• Bakiye = Gerçekleşen + Onaylı OT - Hedef\n\nPozitif bakiye = hedefin üstünde çalışma, negatif = eksik çalışma. Sağlık raporu ve izin günleri hedeften düşülerek bakiye doğru hesaplanır.' },
            { q: 'Dosya adı formatı ne anlama geliyor?', a: 'Dosya adı formatı: Mesai_Raporu_[yıl]_[ay].[uzantı]\nÖrnek: Mesai_Raporu_2026_03.xlsx veya Mesai_Raporu_2026_03.pdf\nYıl ve ay seçili mali döneme göre belirlenir. Bu format dosyaların kronolojik sıralanmasını kolaylaştırır.' },
            { q: 'Geçmiş dönem raporlarına erişebilir miyim?', a: 'Evet. Mali dönem dropdown\'ından geçmiş herhangi bir dönemi seçerek rapor oluşturabilirsiniz. Kilitli dönemler dahil tüm geçmiş dönemlerin raporları indirilebilir. Kilitli dönem raporları nihai niteliktedir ve "KİLİTLİ" etiketi taşır.' },
            { q: 'Rapor oluşturma uzun sürüyor, normal mi?', a: '"Tüm Çalışanlar" seçeneği ile büyük kadrolarda rapor oluşturma birkaç saniye sürebilir. Backend\'de ReportService her çalışan için günlük hesaplama yapar. İndirme butonu "Hazırlanıyor..." olarak gösterilir. Çok uzun sürüyorsa (1 dakikadan fazla) sayfayı yenileyip tekrar deneyin veya sistem yöneticisine başvurun.' },
            { q: 'Talep analizleri sayfasında ne tür grafikler var?', a: 'Talep analizleri 10 bölümden oluşur: KPI kartları (sayısal özetler), aylık trend (çubuk grafik), pie dağılımlar (pasta grafik — tür/durum/kaynak), ekip analizi (departman/rol/kişi tablo), ek mesai analizi (kaynak/atama/haftalık), izin analizi (tür/kullanım), OT-yemek korelasyonu (scatter plot), dolaylı talepler (vekalet), haftalık pattern (heatmap), detay tabloları. Grafiklerde hover tooltip ve interaktif filtreler mevcuttur.' },
            { q: 'Farklı takvimler için rapor oluşturabilir miyim?', a: 'Evet. İlk dropdown\'dan farklı çalışma takvimlerini seçerek her takvime atanmış personel için ayrı rapor oluşturabilirsiniz. Her takvimin kendi mali dönem sınırları, hedef çalışma saatleri ve tatil tanımları vardır. Varsayılan takvim ★ ile işaretlenir.' }
        ]
    },
    {
        id: 'calisma-programlari',
        title: 'Çalışma Programları',
        icon: CalendarRange,
        description: 'Mali takvim yönetimi, vardiya şablonları oluşturma, yıllık takvim boyama, tatil tanımlama, dönem kilitleme, personel ataması ve tolerans ayarları',
        permission: 'PAGE_WORK_SCHEDULES',
        link: '/work-schedules',
        images: [],
        steps: [
            {
                title: 'Takvim Seçimi (Üst Çubuk)',
                description: 'Sayfanın üst çubuğunda mevcut mali takvimler (FiscalCalendar) yatay sekmeler olarak listelenir. Her sekme takvim adını ve atanmış çalışan sayısını gösterir. Çalışmak istediğiniz takvime tıklayın — seçili takvim altı çizili ve kalın görünür. Birden fazla takviminiz varsa (örn. "Genel Mesai", "Vardiyalı Mesai", "Saha Ekibi") her biri farklı vardiya şablonları, tolerans ayarları ve dönem yapılandırması barındırabilir. Varsayılan takvim yıldız (★) ikonu ile işaretlenir. Üst çubukta ayrıca "Yeni Takvim Oluştur" butonu (+ ikonu) ile yeni mali takvim ekleyebilirsiniz.',
                image: { src: '/help-images/09-work-schedules.png', caption: 'Çalışma Programları — 5 sekmeli panel (Şablonlar/Yıllık Takvim/Tatiller/Dönemler & Ayarlar/Personel), üst çubukta takvim seçimi, sol panelde şablon listesi, sağ panelde şablon düzenleyici' }
            },
            {
                title: 'Şablonlar Sekmesi — Sol Panel (Şablon Listesi)',
                description: 'Sol panelde seçili takvime ait tüm vardiya şablonları listelenir. Her şablon kartında: şablon adı, atanmış renk karesi, haftalık çalışma saati özeti ve "Varsayılan" badge\'i (varsayılan şablon için). Kartlara tıklayarak sağ panelde düzenleyiciyi açabilirsiniz. Alt kısımda "Yeni Şablon Oluştur" butonu ile isim girerek yeni şablon ekleyebilirsiniz. Şablon silme işlemi (çöp kutusu ikonu) ancak o şablona atanmış gün yoksa mümkündür — atanmış günler varsa uyarı gösterilir.'
            },
            {
                title: 'Şablonlar Sekmesi — Sağ Panel (TemplateEditor)',
                description: 'Seçili şablonun detaylı düzenleyicisi: (1) Şablon Adı — metin alanı, değişiklik anında kaydedilir. (2) Renk Seçici — 12+ ön tanımlı renk karesi, yıllık takvim boyamada bu renk kullanılır. (3) Haftalık Program (Pzt-Paz) — her gün için: Başlangıç saati (ör. 08:30), Bitiş saati (ör. 17:30), "Tatil Günü" toggle (işaretlendiğinde saat alanları devre dışı). (4) Öğle Molası — başlangıç/bitiş saati (ör. 12:00-13:00). (5) Günlük Mola Hakkı (dk) — çalışma süresinden düşülecek mola (varsayılan 30 dk). (6) Normal Tolerans (dk) — vardiya bitişi sonrası uzatma penceresi (varsayılan 30 dk). (7) Servis Toleransı (dk) — servis kullanan personel için giriş/çıkış yuvarlama (varsayılan 0 dk). (8) Minimum OT Eşiği (dk) — bu sürenin altındaki fazla mesai kaydedilmez (varsayılan 30 dk). (9) "Varsayılan Yap" toggle — bu şablonu takvimin varsayılan şablonu yapar.',
                image: { src: '/help-images/09a-work-schedules-detail.png', caption: 'Şablon Düzenleyici detay — haftalık program tablosu (Pzt-Paz), tolerans ayarları, mola hakkı, minimum OT eşiği ve varsayılan toggle' }
            },
            {
                title: 'Yıllık Takvim Sekmesi (Boyama)',
                description: 'Yıl seçici (< > okları + yıl sayısı) ile hedef yılı belirleyin. Sol panelde şablon paleti: her şablonun renkli karesi + adı listelenir — birini tıklayarak "fırça" olarak seçin. Takvim grid\'inde 12 aylık görünüm: her gün küçük bir hücre, atanmış şablonun rengiyle dolu, atanmamış günler beyaz/gri. Tekli boyama: bir güne tıklayın, seçili şablonla boyanır. Toplu boyama: bir güne tıklayıp sürükleyerek tarih aralığı seçin veya başlangıç tıkla + Shift+bitiş tıkla ile aralık boyayın (bulk_assign API çağrısı). "Silgi" modu: silgi ikonuna tıklayıp günlere tıklayarak mevcut atamayı kaldırın. Atamalar kaydedildiğinde arka planda Celery async task başlar — ilerleme çubuğu (mavi, yüzde göstergesi) ile yeniden hesaplama durumunu takip edin. "Tüm Yılı Sıfırla" butonu ile yılın tüm atamalarını temizleyebilirsiniz (onay dialogu gerekir).'
            },
            {
                title: 'Tatiller Sekmesi',
                description: 'Resmi ve özel tatil günleri tanımlama alanı. "Yeni Tatil Ekle" formunda: Tarih (tarih seçici), Açıklama (ör. "Cumhuriyet Bayramı"), Yarım Gün checkbox (işaretlendiğinde o gün yarım gün tatil olarak işlenir — takvimde diagonal çizgi deseni ile gösterilir). Mevcut tatiller tarih sırasına göre listelenmiştir — her satırda tarih, açıklama, yarım gün durumu ve silme (çöp kutusu) butonu. Bu tatiller tüm çalışanların takviminde otomatik olarak kırmızı/çizgili arka plan ile gösterilir ve puantaj hesaplamasında çalışma hedefinden düşülür.'
            },
            {
                title: 'Dönemler & Ayarlar Sekmesi',
                description: 'Mali dönem listesi tablo formatında: Dönem Adı (ör. "Ocak 2026"), Başlangıç Tarihi (26 Aralık), Bitiş Tarihi (25 Ocak), Kilit Durumu (açık kilit veya kilitli 🔒 ikonu), Atanmış Çalışan Sayısı. Kilitli dönemlerdeki puantaj kayıtları hiçbir şekilde değiştirilemez — Attendance.save() seviyesinde doğrulanır. "Dönemi Kilitle" butonu ile bir dönemi kalıcı olarak kilitleyebilirsiniz (onay dialogu: "Bu işlem geri alınamaz"). "Yeni Dönem Oluştur" butonu ile başlangıç/bitiş tarihi girerek dönem ekleyin. Varsayılan dönem kuralı: bir önceki ayın 26\'sından hedef ayın 25\'ine kadardır (Türk bordro döngüsü). Dönem ayarlarında mali dönem başlangıç günü (SystemSettings.fiscal_period_start_day) yapılandırılabilir.'
            },
            {
                title: 'Personel Sekmesi',
                description: 'Seçili mali takvime atanmış çalışanların listesi. Her satırda: çalışan adı, departmanı, pozisyonu ve atama tarihi. Üstte arama kutusu ile isim/departman bazında filtreleme. "Personel Ekle" butonu ile dropdown\'dan çalışan seçip takvime atayın. "Kaldır" (X ikonu) ile çalışanı takvimden çıkarın (çıkarma sonrası puantaj hesaplaması etkilenebilir uyarısı). Toplu atama: departman bazında tüm çalışanları seçerek takvime ekleyebilirsiniz. Takvime atanmamış çalışanların puantajı hesaplanamaz — bu yüzden her çalışanın en az bir mali takvime atanması zorunludur.'
            },
            {
                title: 'Program Öncelik Hiyerarşisi (5 Katman)',
                description: 'Çalışanın belirli bir gündeki çalışma saatleri şu öncelik sırasıyla belirlenir (en yüksekten en düşüğe): (1) Çalışan-düzeyi override (Employee model\'deki bireysel ayarlar) → (2) DailyScheduleOverride (belirli bir gün için tek seferlik değişiklik, ör. "5 Mart\'ta 10:00-19:00 çalış") → (3) DayTemplateAssignment (yıllık takvim boyaması ile atanan gün şablonu) → (4) ScheduleTemplate (varsayılan şablon kuralları, haftalık program) → (5) FiscalCalendar (mali takvim varsayılanları). En özel tanım her zaman geçerlidir. Bu hiyerarşi core_rules.py\'deki get_day_rules() fonksiyonu tarafından çözümlenir ve tüm puantaj hesaplamaları bu fonksiyonu kullanır.'
            },
            {
                title: 'Tolerans Sistemi Detayları',
                description: 'Sistemde 3 bağımsız tolerans mekanizması vardır: (1) Servis Toleransı (şablonda tanımlı, varsayılan 0 dk) — sadece uses_service=True çalışanlar için geçerli, giriş/çıkış saatlerini vardiya sınırlarına yuvarlar (snap). Çalışan profilinden de override edilebilir. (2) Normal Tolerans (şablonda tanımlı, varsayılan 30 dk) — herkes için geçerli, vardiya bitişinden sonra bu pencere içindeki çalışma önce eksik tamamlama olarak sayılır, eksik yoksa OT sayılır. Çalışan seviyesinde override edilemez. (3) Minimum OT Eşiği (şablonda tanımlı, varsayılan 30 dk) — günlük toplam fazla mesai bu eşiğin altındaysa sıfırlanır ve POTENTIAL kayıt oluşturulmaz. Tüm tolerans değerleri FiscalCalendar/ScheduleTemplate\'ten okunur.'
            },
            {
                title: 'Celery Yeniden Hesaplama ve İlerleme Çubuğu',
                description: 'Yıllık takvim boyama, şablon güncelleme veya tatil ekleme/silme gibi işlemler sonrası sistem arka planda Celery async task ile ilgili tüm çalışanların etkilenen günlerinin puantajını yeniden hesaplar. CalendarTaskProgress modeli ile ilerleme takip edilir: mavi ilerleme çubuğu (yüzde + "150/300 kayıt işlendi" metni). İşlem tamamlanana kadar sayfada "Hesaplama devam ediyor..." uyarısı gösterilir. Büyük kadrolarda (100+ çalışan) bu işlem birkaç dakika sürebilir. CalendarChangeLog ile her değişiklik denetim izi bırakır: ne zaman, kim tarafından, hangi günler, önceki/sonraki şablon değerleri.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışma programı değişiklikleri tüm ilişkili puantaj kayıtlarının yeniden hesaplanmasını tetikler. Büyük kadrolarda bu işlem arka planda Celery task olarak çalışır ve birkaç dakika sürebilir. İlerleme çubuğu ile durumu takip edin. Hesaplama tamamlanmadan sayfadan ayrılsanız bile işlem arka planda devam eder.' },
            { type: 'info', text: 'Tolerans Ayarları: Servis toleransı (varsayılan 0 dk) = servis kullanan personel için giriş/çıkış saatlerini vardiya başlangıç/bitişine yuvarlama. Normal tolerans (varsayılan 30 dk) = vardiya bitişi sonrasındaki uzatma penceresi, önce eksik tamamlanır sonra OT sayılır. Minimum OT eşiği (varsayılan 30 dk) = bu sürenin altındaki günlük fazla mesai kaydedilmez ve POTENTIAL oluşturulmaz.' },
            { type: 'success', text: 'Tüm takvim değişikliklerinin geçmişi CalendarChangeLog\'da tutulur. Her değişikliğin ne zaman, kim tarafından yapıldığı, hangi günlerin etkilendiği ve önceki/sonraki değerleri kaydedilir. Bu sayede hatalı değişiklikler tespit edilip geri alınabilir.' },
            { type: 'info', text: 'Yıllık takvim boyamada Shift tuşuna basılı tutarak tarih aralığı seçebilirsiniz. İlk güne tıklayın, Shift basılı tutun ve son güne tıklayın — aradaki tüm günler seçili şablonla boyanır.' },
            { type: 'warning', text: 'Kilitli dönemlerdeki puantaj kayıtları hiçbir şekilde değiştirilemez. Dönem kilitleme geri alınamaz bir işlemdir. Bordro mutabakatı tamamlanmadan dönemi kilitlemeyin.' },
            { type: 'info', text: 'Her çalışanın en az bir mali takvime atanması zorunludur. Takvime atanmamış çalışanların puantaj hesaplaması yapılamaz ve "Takvim Atanmamış" uyarısı gösterilir.' },
            { type: 'success', text: 'Şablon renkleri yıllık takvim boyamada görsel ayrım sağlar. Farklı vardiya tipleri için farklı renkler kullanmanız önerilir (ör. normal mesai=mavi, vardiyalı=yeşil, saha=turuncu).' }
        ],
        faq: [
            { q: 'Yeni vardiya şablonu nasıl oluştururum?', a: 'Şablonlar sekmesinin sol panelinde "Yeni Şablon Oluştur" butonuna tıklayın. Şablon adı girin. Sağ paneldeki düzenleyicide her gün için başlangıç-bitiş saatleri, tatil durumu, öğle molası, tolerans süreleri ve mola hakkını ayarlayın. Değişiklikler otomatik kaydedilir.' },
            { q: 'Takvim boyama nedir ve nasıl yapılır?', a: 'Yıllık Takvim sekmesinde sol paletten bir şablon rengini seçin (fırça olarak). Grid\'deki günlere tıklayarak o günü o şablonla "boyarsınız". Toplu boyama: tıkla+sürükle veya Shift+tıkla ile tarih aralığı seçebilirsiniz. Silgi modu ile mevcut atamayı kaldırabilirsiniz.' },
            { q: 'Override şablondan öncelikli midir?', a: 'Evet. 5 katmanlı öncelik: Çalışan override > DailyScheduleOverride (günlük) > DayTemplateAssignment (gün ataması/boyama) > ScheduleTemplate (şablon) > FiscalCalendar (takvim). En özel tanım geçerlidir.' },
            { q: 'Tatil eklediğimde ne olur?', a: 'Tatil günü tüm çalışanların takviminde kırmızı arka plan ile gösterilir. Puantaj hesaplamasında o gün çalışma hedefinden düşülür. Yarım gün tatilde hedefin yarısı düşülür. Tatil günü çalışma yapılırsa otomatik fazla mesai kabul edilir.' },
            { q: 'Dönem kilitleme ne işe yarar?', a: 'Kilitli dönemlerdeki puantaj kayıtları değiştirilemez. Bordro hesaplaması sonrası dönem kilitlenir. Bu sayede geçmiş dönemlerin verileri korunur. Kilitleme geri alınamaz.' },
            { q: 'Servis toleransı ile normal tolerans farkı nedir?', a: 'Servis toleransı sadece servis kullanan çalışanlarda geçerlidir — giriş/çıkış saatlerini vardiya sınırına yuvarlar. Normal tolerans ise herkes için geçerlidir — vardiya bitişi sonrası eksik tamamlama penceresidir. İki tolerans birbirinden bağımsız çalışır.' },
            { q: 'Hesaplama ilerleme çubuğu takılı kaldı ne yapmalıyım?', a: 'Celery worker\'ın çalıştığından emin olun. Servis Yönetimi sayfasından servis durumunu kontrol edin. Worker aktif değilse ilerleme çubuğu ilerlemez. Worker başlatıldıktan sonra işlem devam eder.' },
            { q: 'Çalışan takvime atanmamış uyarısı alıyorum', a: 'Her çalışanın en az bir mali takvime atanması zorunludur. Personel sekmesinden ilgili çalışanı arayıp takvime ekleyin veya Çalışan Yönetimi sayfasından profil düzenleme ile Mali Takvim dropdown\'ından takvim atayın.' }
        ]
    },
    {
        id: 'sistem-yonetimi',
        title: 'Sistem Yönetimi',
        icon: Shield,
        description: 'Sistem Kontrol Merkezi — 30+ yönetim sekmesi: genel bakış, yetki denetimi (RBAC), puantaj denetimi, veri bütünlüğü, spec testleri, şifre sıfırlama, güvenlik ve tehlike bölgesi',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/system-health',
        images: [],
        steps: [
            {
                title: 'Genel Bakış Sekmesi',
                description: 'Sistem Kontrol Merkezi\'nin ana sayfası. Üst başlıkta "SYSTEM ONLINE" yeşil göstergesi (yanıp sönen nokta) ile sistemin çalışır durumda olduğu gösterilir. Canlı metrikler: (1) Toplam Çalışan — aktif personel sayısı, (2) Aktif Mesai — şu an ofiste olan çalışan sayısı, (3) Devamsızlık Oranı — bugünkü devamsızlık yüzdesi, (4) Bekleyen Talepler — onay bekleyen toplam talep sayısı. Alt kısımda sistem ayarları özeti (Django sürümü, veritabanı durumu, Celery worker sayısı, Redis bağlantısı), son işlem logları ve hızlı erişim bağlantıları listelenir.',
                image: { src: '/help-images/17-system-health.png', caption: 'Sistem Kontrol Merkezi — 30+ sekmeli panel, genel bakış metrikleri (toplam çalışan, aktif mesai, devamsızlık, bekleyen talepler), SYSTEM ONLINE göstergesi' }
            },
            {
                title: 'Yetki Denetimi (RBAC) Sekmeleri',
                description: 'Birden fazla RBAC denetim sekmesi mevcuttur: (1) "Yetki Kontrolü" — çalışanların atanmış rolleri ve her rolün verdiği yetki kodları tablosu, yetki çakışma tespiti. (2) "RBAC Denetimi" — tüm rollerin miras zinciri (inheritance), dışlama kuralları (exclusion) ve etkili yetki hesaplaması. get_effective_permission_codes() fonksiyonunun sonuçları ile atanmış yetkilerin karşılaştırması. (3) "RBAC Uyumluluk" — her çalışanın beklenen vs gerçekleşen yetkileri detaylı tablo, uyumsuzluklar kırmızı ile vurgulanır, otomatik düzeltme önerileri.',
                image: { src: '/help-images/17a-system-health-admin.png', caption: 'Sistem Yönetimi — yetki denetimi sekmeleri, RBAC uyumluluk tablosu, mesai denetimi ve veri bütünlüğü tarama ekranları' }
            },
            {
                title: 'Mesai ve Puantaj Denetimi Sekmeleri',
                description: 'Puantaj verilerini çok yönlü denetleme: (1) "Mesai Uyumluluk" — çalışanların mesai saatlerinin şablon kurallarına uyumu. (2) "Mesai Denetimi" — ek mesai taleplerinin tutarlılık kontrolü, çakışan mesailer, süre uyumsuzlukları. (3) "OT Çalışan Analizi" — çalışan bazında mesai istatistikleri, trend grafikleri, en çok/en az mesai yapanlar. (4) "Kayıt Kontrol" — belirli bir tarih aralığında kayıtları sorgulatma ve doğrulama. (5) "Mesai Doğrulama" — POTENTIAL/PENDING/APPROVED kayıtların geçerlilik kontrolü, zaman çakışma tespiti.'
            },
            {
                title: 'Veri Bütünlüğü Denetimi',
                description: '"Veri Bütünlüğü" sekmesinde DataIntegrityAuditor ile 7 kategori taranır: (1) OT Çakışma — aynı zaman diliminde birden fazla ek mesai kaydı. (2) Puantaj Yeniden Hesaplama — veritabanı değerleri ile canlı hesaplama arasındaki farklar. (3) Yetim Talepler — ilişkili puantaj kaydı olmayan talepler. (4) Süre Tutarsızlığı — toplam çalışma ile normal+OT toplamı arasındaki fark. (5) Durum Anomalisi — geçersiz durum geçişleri (ör. APPROVED\'dan PENDING\'e). (6) Eksik Puantaj — çalışma günü olan ancak puantaj kaydı bulunmayan günler. (7) Mali Dönem Bütünlüğü — kilitli dönemlerdeki değişiklik denemeleri. Her kategoride "Tara" (sadece tespit) ve "Düzelt" (otomatik düzeltme) modları mevcuttur. Sonuçlar accordion formatında: her sorun kartında detay, etkilenen kayıt sayısı ve düzeltme onay butonu.'
            },
            {
                title: 'Sistem Testleri ve Spec Testleri',
                description: '"Sistem Testleri" sekmesinde genel test suite\'i çalıştırılır — tüm backend testleri tek butonla. "Spec Testleri" sekmesinde 52 aşamalı uyumluluk testi (Stage 1-52) mevcuttur. Her aşama farklı bir modülü test eder: Stage 1 (RBAC), Stage 2 (İzin), Stage 3 (Puantaj), Stage 4 (Mesai 3-yol), Stage 5 (FIFO izin) vb. Her aşama için: "Çalıştır" butonu, geçme/kalma durumu (yeşil tik / kırmızı çarpı), çalışma süresi, test sayısı, hata detayları. Tekli aşama veya tüm aşamaları toplu çalıştırma desteklenir. Geçme oranı yüzde olarak gösterilir (%100 = tam uyumluluk).'
            },
            {
                title: 'Şifre Sıfırlama Sekmesi',
                description: '"Şifre Sıfırlama" sekmesinden tüm kullanıcıların şifrelerini toplu olarak rastgele şifrelerle değiştirebilirsiniz. "Toplu Şifre Sıfırla" butonu (kırmızı, dikkat üçgeni ikonu) ile onay dialogu açılır. Onay sonrası XLSX dosyası otomatik indirilir: her satırda kullanıcı adı, ad soyad, e-posta ve yeni şifre. İlk girişte çalışanlar yeni şifre belirlemeye zorlanır. SYSTEM_FULL_ACCESS yetkisi zorunludur.',
                permission: 'SYSTEM_FULL_ACCESS'
            },
            {
                title: 'Güvenlik ve Diğer Sekmeler',
                description: 'Ek yönetim sekmeleri: "Stres Testi & Konsol" — API yük testi ve komut konsolu. "Servis Logları" — son 500 servis işlem kaydı. "Güvenlik" — giriş denemeleri, başarısız oturumlar, IP bazlı filtreleme. "Mola Düzeltme" — potansiyel mola hesaplama düzeltmeleri. "Sentetik Veri" — test amaçlı sahte veri üretimi. "Kaynak Kullanımı" — CPU/RAM/DB bağlantı izleme. "Takvim Temizliği" — eski/geçersiz takvim atamalarını temizleme. "Bakım & Onarım" — veritabanı bakım işlemleri. "Org Röntgen" — organizasyon yapısı analizi. "Kalıntı Çalışanlar" — silinmiş/pasif çalışan artıkları. "Yönetici Yetki" — yönetici yetki matrisi. "Veri Tarayıcı" — ham veri sorgulatma aracı. "Doğum Günleri" — doğum günü izni yönetimi. "E2E Testleri" — uçtan uca test suite.'
            },
            {
                title: 'Tehlike Bölgesi (Sistem Sıfırlama)',
                description: '"Sistem Sıfırlama" sekmesinde kritik ve geri alınamaz işlemler bulunur. Kırmızı çerçeveli tehlike alanı: "Tüm Personeli Sil", "Tüm Puantaj Kayıtlarını Sil", "Veritabanını Sıfırla" gibi işlemler. Bu işlemler çift onay gerektirir: (1) Confirm dialog — işlemin kapsamı ve etkileri açıklanır. (2) Doğrulama alanı — "SIL" veya işlem adını yazmanız istenir. Yazılmadan buton aktif olmaz. Son derece dikkatli kullanın — bu işlemler tamamen geri alınamaz.',
                permission: 'SYSTEM_FULL_ACCESS'
            }
        ],
        tips: [
            { type: 'warning', text: 'Sistem yönetimi araçları kritik işlemler içerir. Şifre sıfırlama, veri silme ve sistem sıfırlama geri alınamaz. SYSTEM_FULL_ACCESS yetkisi veya süper kullanıcı statüsü zorunludur. Tehlike bölgesindeki işlemleri üretim ortamında son derece dikkatli kullanın.' },
            { type: 'info', text: '30+ sekme mevcuttur. En sık kullanılanlar: Genel Bakış (canlı metrikler), Yetki Denetimi (RBAC uyumluluk), Veri Bütünlüğü (7 kategori tarama), Spec Testleri (52 aşama) ve Şifre Sıfırlama. Diğer sekmeler ileri düzey yönetim işlemleri içindir.' },
            { type: 'success', text: 'Spec testlerinde %100 oranı sistemin hedef spesifikasyona tam uyumlu olduğunu gösterir. Her aşamanın detaylı sonuçları (geçen/kalan test sayısı, hata mesajları) loglarla birlikte gösterilir.' },
            { type: 'info', text: 'Veri Bütünlüğü taramasında "Tara" modu yalnızca sorunları tespit eder — hiçbir veri değiştirmez. "Düzelt" modu sorunları otomatik düzeltmeye çalışır. Düzeltme öncesi her zaman önce "Tara" modunu çalıştırmanız ve sonuçları incelemeniz önerilir.' },
            { type: 'warning', text: 'Şifre sıfırlama sonrası XLSX dosyasını güvenli saklayın ve çalışanlara dağıttıktan sonra silin. Şifre listesi hassas veridir ve yetkisiz kişilerle paylaşılmamalıdır.' },
            { type: 'info', text: 'Celery worker\'lar çalışmıyorsa bazı sekmeler (Stres Testi, Sentetik Veri) hata verebilir. Servis Yönetimi sayfasından worker durumunu kontrol edin.' }
        ],
        faq: [
            { q: 'Sistem sağlığı sayfasını göremiyorum', a: 'PAGE_SYSTEM_HEALTH yetkisi gereklidir. Bu yetki genellikle SYSTEM_FULL_ACCESS rolüne veya süper kullanıcı statüsüne sahip kişilere tanımlıdır. Sistem yöneticinize başvurun.' },
            { q: 'Spec testi başarısız olursa ne yapmalıyım?', a: 'Başarısız testin detayına tıklayarak hata açıklamasını, beklenen değeri ve gerçekleşen değeri görün. Genellikle eksik yapılandırma, eksik veri veya yazılım hatası kaynaklıdır. Hata mesajını sistem geliştiricisine iletin.' },
            { q: 'Şifre sıfırlama sonrası ne olur?', a: 'Tüm kullanıcıların şifreleri rastgele değerlerle değiştirilir. XLSX dosyası indirilir (kullanıcı adı + yeni şifre). Çalışanlar ilk girişte yeni şifre belirlemeye zorlanır. Mevcut oturumlar geçerliliğini korur.' },
            { q: 'Veri bütünlüğü taramasında sorun çıktı, düzeltmeli miyim?', a: 'Önce sorunun detayını inceleyin. "Düzelt" modu genellikle güvenlidir ama düzeltme öncesi etkilenen kayıt sayısını ve düzeltme açıklamasını okuyun. Emin değilseniz sistem geliştiricisine danışın.' },
            { q: 'Tehlike bölgesindeki işlemler geri alınabilir mi?', a: 'Hayır. Sistem sıfırlama ve toplu silme işlemleri tamamen geri alınamaz. Bu yüzden çift onay mekanizması vardır. Üretim ortamında bu işlemler yalnızca zorunlu durumlarda kullanılmalıdır.' },
            { q: 'RBAC denetiminde uyumsuzluk ne anlama gelir?', a: 'Çalışanın atanmış yetkileri ile beklenen yetkileri arasında fark var demektir. Rol mirasından gelen yetkiler, dışlamalar veya doğrudan atamalar arasında tutarsızlık olabilir. "Düzelt" seçeneği ile otomatik düzeltme uygulanabilir.' },
            { q: 'Kaç test aşaması var ve ne test ederler?', a: '52 aşama (Stage 1-52): RBAC, izin sistemi, puantaj hesaplama, 3-yollu mesai, FIFO deduction, kartsız giriş, haftalık OT limiti, veri bütünlüğü, takvim, sağlık raporu, yönetici devir, dış görev ve daha fazlası. Her aşama belirli bir modülün tüm iş kurallarını test eder.' }
        ]
    },
    {
        id: 'calisanlar',
        title: 'Çalışan Yönetimi',
        icon: Users,
        description: 'Çalışan listesi, departman/durum filtreleri, 7 adımlı ekleme sihirbazı, profil düzenleme, rol/yetki atamaları, yönetici ilişkileri (PRIMARY/SECONDARY), çalışma programı atama ve detay sayfası',
        permission: 'PAGE_EMPLOYEES',
        link: '/employees',
        images: [],
        steps: [
            {
                title: 'Çalışan Listesi ve Filtreler',
                description: 'Çalışanlar sayfasının üst kısmında 3 filtre aracı: (1) Departman Filtresi — dropdown ile belirli departmanı seçin veya "Tümü" ile tüm departmanları görüntüleyin. (2) Aktif/Pasif Toggle — "Aktif" (varsayılan) yalnızca çalışan personeli, "Pasif" ayrılmış personeli, "Tümü" herkesi gösterir. (3) İsim Arama — anlık filtreleme ile çalışan adı/soyadı arayın (Türkçe karakter destekli). Sağ üstte "Yeni Personel Ekle" butonu (mavi, + ikonu) ile 7 adımlı ekleme sihirbazını başlatın. Tablo sütunları: Ad Soyad, Departman, Pozisyon, Mali Takvim, Durum (aktif yeşil/pasif gri badge), İşlemler (düzenle/detay butonları). Satıra tıklayarak çalışan detay sayfasını açabilirsiniz.',
                image: { src: '/help-images/04-employees-list.png', caption: 'Personel Yönetimi — departman filtresi dropdown, aktif/pasif toggle, isim arama kutusu, çalışan listesi tablosu ve "Yeni Personel Ekle" butonu' }
            },
            {
                title: 'Adım 1: Kişisel Bilgiler',
                description: 'Sihirbazın ilk adımı — temel kimlik bilgileri: (1) Ad (zorunlu, kırmızı yıldız) — en az 2 karakter. (2) Soyad (zorunlu) — en az 2 karakter. (3) TC Kimlik No (hassas veri) — 11 haneli, kilit ikonu gösterilir, SENSITIVE_DATA_CHANGE izni gerekli, değiştirmek için kilit ikonuna tıklayıp onay verin. (4) E-posta (zorunlu) — geçerli e-posta formatı doğrulaması. (5) Doğum Tarihi (hassas veri) — tarih seçici, kilit ikonu. (6) Kullanıcı Adı (zorunlu) — sisteme giriş için kullanılır, benzersiz olmalı, varsa hata mesajı gösterilir. (7) Şifre — anahtar ikonu, göster/gizle toggle, yetkili kullanıcı doldurur. Her zorunlu alan kırmızı yıldız (*) ile işaretlidir. Boş zorunlu alan bırakıldığında kırmızı çerçeve ve hata mesajı gösterilir.',
                image: { src: '/help-images/04-employee-create-step1.png', caption: 'Yeni Personel Ekleme — Adım 1: Kişisel Bilgiler formu (Ad, Soyad, TC Kimlik No, E-posta, Doğum Tarihi, Kullanıcı Adı, Şifre alanları)' }
            },
            {
                title: 'Adım 2: Kurumsal & Hiyerarşi',
                description: 'Organizasyonel bilgiler ve yönetici ilişkileri: (1) Personel Sicil No (zorunlu) — benzersiz, sayısal. (2) İşe Başlama Tarihi — tarih seçici, kıdem hesaplamasında kullanılır. (3) Matris Organizasyon Yapısı — mavi bilgi kartı ile açıklama. (4) Birincil Yöneticiler bölümü: en az 1 birincil yönetici zorunlu. Her satırda: yönetici seçimi (aranabilir dropdown), departman (otomatik doldurulur) ve pozisyon (otomatik doldurulur). Birden fazla birincil yönetici eklenebilir (+ butonu). İlk birincil yöneticinin departman ve pozisyonu çalışana otomatik atanır (auto-derive). (5) İkincil Yöneticiler bölümü: isteğe bağlı. Sadece ek mesai (OT) işlemlerinde yetkili — izin ve kartsız giriş talepleri ikincil yöneticiye gitmez. Departman/pozisyon alanı yoktur. (6) Etiketler/Uzmanlıklar: renkli pill butonlar, çoklu seçim. (7) İkincil Görevlendirmeler (Matrix): "Yeni Görev Ekle" butonu ile departman + pozisyon + yönetici satırı eklenir.',
                image: { src: '/help-images/04-employee-create-step2.png', caption: 'Yeni Personel Ekleme — Adım 2: Kurumsal & Hiyerarşi (Sicil No, İşe Başlama, Matris bilgi kartı, Birincil/İkincil Yönetici atamaları, Etiketler, İkincil Görevlendirmeler)' }
            },
            {
                title: 'Adım 3: İletişim & Acil Durum',
                description: 'İletişim bilgileri: (1) Cep Telefonu (telefon ikonu, opsiyonel) — uluslararası format destekli. (2) İkinci Telefon — alternatif numara. (3) Adres — çok satırlı metin alanı, ev/iş adresi. (4) Acil Durum İletişim: Ad Soyad (kişi adı) + Telefon (kişi numarası). Bu bilgiler Şirket Rehberi\'nde otomatik olarak görüntülenir. E-posta tıklanabilir link, telefon tıklanabilir arama bağlantısı olarak gösterilir.'
            },
            {
                title: 'Adım 4: Detaylar & Çalışma Şekli',
                description: 'Görev ve çalışma düzeni: (1) Görev Tanımı Özeti — çok satırlı metin alanı, çalışanın iş tanımının kısa açıklaması. (2) Çalışma Şekli dropdown: Tam Zamanlı, Uzaktan, Hibrit, Yarı Zamanlı, Saha — 5 seçenek. Hibrit veya Uzaktan seçildiğinde "Uzaktan Çalışma Günleri" bölümü görünür: Pzt-Paz toggle butonları ile hangi günler uzaktan çalışılacağı işaretlenir. (3) Çalışma Takvimi Planı: Mali Takvim seçimi (zorunlu dropdown) — mevcut takvimler listelenir, seçim sonrası seçilen takvimin tolerans değerleri (servis toleransı, normal tolerans, minimum OT eşiği) ve günlük mola hakkı otomatik bilgi kartında gösterilir. Takvim atanmadan puantaj hesaplanamaz.'
            },
            {
                title: 'Adım 5: İzin Yönetimi',
                description: 'İzin hakları ve bakiye: (1) Yıllık İzin Bakiyesi (sayı girişi) — çalışanın mevcut yıllık izin günü. (2) Avans İzin Limiti — henüz hak etmediği günleri önceden kullanma sınırı. (3) İzin Tahakkuk Oranı — yıllık otomatik eklenen izin günü (varsayılan 14 gün, kıdeme göre değişir: 1-5 yıl=14, 5-15 yıl=20, 15+ yıl=26). Bu değerler çalışanın izin taleplerinin doğrulanmasında ve bakiye kontrolünde kullanılır. Mazeret izni (yıllık 18 saat) otomatik olarak tanımlanır ve burada görünmez.'
            },
            {
                title: 'Adım 6: Yetkilendirme (Roller ve İzinler)',
                description: 'RBAC yetkilendirme: (1) Roller — mevcut rollerin checkbox listesi: ROLE_ADMIN, ROLE_MANAGER, ROLE_ENGINEER, ROLE_ACCOUNTING vb. Birden fazla rol atanabilir. Her rolün verdiği yetki kodları tooltip\'te gösterilir. Roller miras alınabilir (inheritance) — üst rol alt rolün yetkilerini kapsar. (2) Doğrudan İzinler — role ek olarak tek tek yetki kodu atama (ör. sadece PAGE_REPORTS eklemek). (3) Hariç Tutulan İzinler — miras alınan belirli yetkileri kaldırma (exclusion). Etkili yetki hesaplaması: (Rol yetkileri + Doğrudan İzinler) - Hariç Tutulan İzinler = Sonuç. get_effective_permission_codes() fonksiyonu bu hesabı yapar.'
            },
            {
                title: 'Adım 7: Önizleme & Kaydet',
                description: 'Tüm adımlarda girilen bilgilerin kapsamlı özeti kartlar halinde gösterilir: Kişisel Bilgiler kartı, Kurumsal kartı, İletişim kartı, Detaylar kartı, İzin kartı, Yetkilendirme kartı. Hata olan adımlar kırmızı çerçeve ve uyarı ikonu ile vurgulanır — hataya tıklayarak doğrudan o adıma gidebilirsiniz. Tüm zorunlu alanlar doğru doldurulduğunda "Personeli Kaydet" butonu (yeşil) aktif olur. Kaydet sonrası: (a) Django kullanıcı hesabı otomatik oluşturulur, (b) çalışan profili kaydedilir, (c) yönetici ilişkileri kurulur, (d) mali takvim ataması yapılır, (e) başarı mesajı gösterilir ve çalışan listesine yönlendirilirsiniz.'
            },
            {
                title: 'Çalışan Detay Sayfası (3 Sekmeli)',
                description: 'Çalışan listesinden herhangi bir çalışana tıklayarak detay sayfasını açın. 3 sekmeli yapı: (1) Kimlik & İletişim — ad, soyad, e-posta, telefon, TC kimlik, doğum tarihi, adres, acil durum bilgileri. Düzenleme butonu ile yerinde güncelleme. (2) Kurumsal & Organizasyon — departman, pozisyon, işe başlama tarihi, sicil no, birincil yönetici atamaları (ekleme/kaldırma), ikincil yönetici atamaları, ikincil görevlendirmeler. Yönetici değişikliği yapıldığında PENDING talepler otomatik devredilir. (3) Ayarlar & Yetkiler — profil düzenleme izni toggle, aktif/pasif toggle (pasif = sisteme giriş engellenir), servis kullanımı toggle (uses_service), servis toleransı (dk, çalışan seviyesi override), haftalık OT limiti (saat, varsayılan 30), çalışma programı (mali takvim dropdown), roller (checkbox listesi), şifre değiştirme formu.'
            },
            {
                title: 'Navigasyon ve Hata Göstergeleri',
                description: 'Form sihirbazında gezinme: "Geri" (← ok) ve "İleri" (→ ok) butonları ile adımlar arası geçiş. Üstteki adım noktaları (1-7 yuvarlak göstergeler): tamamlanan adım = yeşil dolu nokta, hata olan adım = kırmızı nokta + uyarı ikonu, mevcut adım = mavi halka, gelecek adım = gri nokta. Herhangi bir adım noktasına tıklayarak doğrudan o adıma atlayabilirsiniz. Hata mesajları ilgili alanın altında kırmızı metin olarak gösterilir. Tüm hatalar düzeltilmeden Adım 7\'deki "Kaydet" butonu aktif olmaz.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Çalışan silme işlemi geri alınamaz ve ilişkili tüm kayıtları (puantaj, talepler, izinler) kalıcı olarak siler. Ayrılan personeli silmek yerine "Pasif" durumuna geçirmeniz şiddetle önerilir. Pasif durumuna geçirmek için: Detay sayfası > Ayarlar & Yetkiler > "Aktif/Pasif" toggle. Pasif çalışanlar sisteme giriş yapamaz, rehberde görünmez ama kayıtları korunur.' },
            { type: 'info', text: 'Yönetici Ataması ve Auto-Derive: İlk birincil yöneticinin departmanı ve pozisyonu otomatik olarak çalışana atanır. Yönetici değiştirildiğinde departman/unvan güncellenir. Birincil yönetici değiştiğinde PENDING durumdaki tüm talepler (izin, mesai, kartsız giriş) otomatik olarak yeni yöneticiye devredilir ve 3 taraflı bildirim gönderilir (yeni yönetici + eski yönetici + çalışan).' },
            { type: 'info', text: 'TC kimlik numarası ve doğum tarihi KVKK kapsamında hassas veri olarak sınıflandırılmıştır. Düzenlemek için SENSITIVE_DATA_CHANGE yetkisi gerekir. Kilit ikonu bu alanların korumalı olduğunu gösterir. TC numarası listelerde maskelenmiş (***) olarak gösterilir.' },
            { type: 'info', text: 'Admin koruma: Admin (süper kullanıcı) profilinin detay sayfasında kırmızı uyarı banner\'ı gösterilir: "Bu kullanıcı sistem yöneticisidir." Admin profilini düzenlemek için SYSTEM_FULL_ACCESS yetkisi zorunludur. Admin kullanıcı pasife alınamaz ve silinemez.' },
            { type: 'success', text: 'Çalışan listesini Excel olarak dışa aktarabilirsiniz. Dışa aktarma aktif filtrelere göre çalışır: departman ve durum filtrelerini uygulayıp "Excel İndir" ile seçili listeyi dosya olarak alabilirsiniz.' },
            { type: 'warning', text: 'Mali takvim atanmamış çalışanların puantaj hesaplaması yapılamaz. Adım 4\'te veya detay sayfasında mutlaka Mali Takvim seçimi yapın. Takvim eksikse çalışanın Dashboard\'ında uyarı görünür.' },
            { type: 'info', text: 'İkincil yönetici sadece ek mesai (OT) işlemleri yapabilir: OT ataması, OT onaylama, OT analitikleri. İzin talepleri, kartsız giriş talepleri ve diğer onay süreçleri yalnızca birincil yöneticiye gider.' }
        ],
        faq: [
            { q: 'Yeni çalışan nasıl eklenir?', a: '"Yeni Personel Ekle" butonuna tıklayın. 7 adımlı form sihirbazı açılır: Adım 1 Kişisel Bilgiler → Adım 2 Kurumsal & Hiyerarşi → Adım 3 İletişim → Adım 4 Detaylar → Adım 5 İzin → Adım 6 Yetkilendirme → Adım 7 Önizleme & Kaydet. Kayıt sonrası çalışana otomatik Django kullanıcı hesabı oluşturulur ve sisteme giriş yapabilir.' },
            { q: 'Birincil ve ikincil yönetici farkı nedir?', a: 'Birincil (PRIMARY) yönetici doğrudan amirdir — tüm talep türlerinde (izin, mesai, kartsız giriş, dış görev) onay yetkisine sahiptir. İkincil (SECONDARY) yönetici sadece ek mesai (OT) işlemlerinde yetkilidir: OT ataması yapabilir, OT taleplerini onaylayabilir. Birincil yönetici en az 1 tane zorunlu, ikincil isteğe bağlıdır.' },
            { q: 'Çalışanın yetkilerini nasıl kontrol ederim?', a: 'Detay sayfasında "Ayarlar & Yetkiler" sekmesinde atanmış rolleri görebilirsiniz. Her rolün verdiği yetki kodları tooltip\'te listelenir. Etkili yetki hesaplaması: (Rol yetkileri + Doğrudan İzinler) - Hariç Tutulan = Sonuç. Sistem Yönetimi > RBAC Denetimi sekmesinden de kontrol edilebilir.' },
            { q: 'Çalışma takvimi nasıl atanır?', a: 'Yeni çalışanda Adım 4\'te, mevcut çalışanda detay sayfasının Ayarlar sekmesinde Mali Takvim dropdown\'ından seçin. Takvim seçildiğinde tolerans değerleri otomatik gösterilir. Takvim atanmadığında puantaj hesaplaması yapılamaz.' },
            { q: 'Haftalık OT limiti nedir ve nasıl değiştirilir?', a: 'Her çalışanın haftalık fazla mesai limiti vardır (varsayılan 30 saat). Detay sayfasının Ayarlar sekmesinden sayı girişi ile değiştirilebilir. Rolling 7 günlük pencerede ONAYLANMIŞ + BEKLEYEN mesai saatleri sayılır. Limit dolduğunda çalışan yeni mesai talebi oluşturamaz ve uyarı gösterilir.' },
            { q: 'Çalışanı pasife aldığımda ne olur?', a: 'Pasif çalışan sisteme giriş yapamaz, Şirket Rehberi\'nde görünmez, yeni talep oluşturamaz. Mevcut kayıtları (puantaj, talepler, izin bakiyesi) korunur. Pasif çalışan tekrar aktif yapılabilir — tüm kayıtları geri gelir.' },
            { q: 'Yönetici değiştirdiğimde bekleyen talepler ne olur?', a: 'Birincil yönetici değiştiğinde PENDING durumdaki tüm talepler (izin, mesai, kartsız giriş) otomatik olarak yeni birincil yöneticiye devredilir. Üç taraflı bildirim gönderilir: yeni yönetici, eski yönetici ve çalışan. Onaylanmış/reddedilmiş talepler etkilenmez.' },
            { q: 'Birden fazla rol atanabilir mi?', a: 'Evet. Adım 6\'da veya detay sayfasında birden fazla rol checkbox\'ı işaretlenebilir. Roller kümülatiftir — her rolün yetkileri toplanır. Çakışan yetkiler en geniş kapsamı alır. Belirli yetkileri kaldırmak için "Hariç Tutulan İzinler" kullanılır.' }
        ]
    },
    {
        id: 'organizasyon-semasi',
        title: 'Organizasyon Şeması',
        icon: Network,
        description: 'Departman hiyerarşisi ağaç görünümü, zoom/pan kontrolleri, renk kodlu düğümler, sürükle-bırak reorganizasyon, sağ tık bağlam menüsü ve çalışan detay popup\'ı',
        permission: 'PAGE_ORG_CHART',
        link: '/organization-chart',
        images: [],
        steps: [
            {
                title: 'Organizasyon Ağaç Görünümü',
                description: 'Şirketin tüm departman yapısını interaktif ağaç görünümünde inceleyebilirsiniz. En üstte CEO/Genel Müdür düğümü, altında departman yöneticileri ve onların altında çalışanlar hiyerarşik olarak gösterilir. Her düğüm bir çalışanı temsil eder ve şu bilgileri içerir: ad soyad, unvan (pozisyon), departman adı (kısaltma ile), çevrimiçi durumu (yeşil/gri nokta). Düğümler departman/rol kategorisine göre renklendirilir: Mavi (Yazılım), İndigo (Mühendislik), Cyan (Teknik Destek), Rose (Tasarım/UI), Emerald (Satış/Pazarlama), Amber (Finans/Muhasebe), Violet (Sistem Yönetimi/IT). Bağlantı çizgileri üst-alt ilişkisini gösterir.',
                image: { src: '/help-images/06-org-chart.png', caption: 'Organizasyon Şeması — hiyerarşik ağaç görünümü, departman renk kodları, zoom kontrolleri, çalışan düğümleri ve bağlantı çizgileri' }
            },
            {
                title: 'Zoom, Pan ve Görünüm Kontrolleri',
                description: 'Üst kontrol panelinde: (1) Yakınlaştır (ZoomIn, + ikonu) — her tıklama %20 büyütür. (2) Uzaklaştır (ZoomOut, - ikonu) — her tıklama %20 küçültür. (3) Ekrana Sığdır (Maximize ikonu) — tüm ağaç yapısını ekrana sığdırır, büyük organizasyonlarda çok faydalı. (4) Görünüm Toggle: "Hiyerarşik" (varsayılan, dikey ağaç) veya "Departman" (departman bazlı grup görünümü). (5) Göster/Gizle seçenekleri: "Pasif Çalışanları Göster" (gri noktalı düğümler) ve "Boş Pozisyonları Göster" (kesikli çerçeveli düğümler). Fare tekerleği ile zoom, sol tuş sürükleme ile pan (kaydırma) yapılabilir. Dokunmatik ekranlarda pinch-to-zoom desteklenir.'
            },
            {
                title: 'Çalışan Detay Popup\'ı',
                description: 'Herhangi bir düğüme tıklayarak çalışan detay popup\'ını açın. Popup içeriği: (1) Avatar — adın baş harflerinden oluşan renkli daire. (2) Ad Soyad — tam isim. (3) Unvan/Pozisyon. (4) Canlı Durum — "Çevrimiçi" (yeşil nokta + giriş saati), "İzinde" (turuncu nokta), "Dışarıda" (gri nokta + varsa çıkış saati). (5) Birim — departman adı. (6) Yönetici — birincil yönetici adı. (7) İkincil Roller — varsa matris görevlendirmeleri. (8) "Profili Gör" butonu — çalışan detay sayfasına yönlendirir (PAGE_EMPLOYEES izni gerekir, yoksa buton görünmez). Popup dışına tıklayarak veya X butonu ile kapatılır.',
                image: { src: '/help-images/06a-orgchart-detail.png', caption: 'Çalışan detay popup\'ı — avatar, ad soyad, unvan, canlı durum göstergesi, departman, yönetici bilgisi ve "Profili Gör" butonu' }
            },
            {
                title: 'Sürükle-Bırak ile Reorganizasyon',
                description: 'Çalışan düğümlerini fare ile sürükleyerek organizasyon yapısını değiştirebilirsiniz: düğümün üzerine gelin, sol tuşu basılı tutun ve hedef düğümün üzerine sürükleyin. Hedef düğüm mavi çerçeve ile vurgulanır. Bıraktığınızda onay dialogu açılır: "Taşıma Onayı — [Çalışan Adı] kullanıcısını [Kaynak Yönetici] altından [Hedef Yönetici] altına taşımak istediğinize emin misiniz?" Onayla/İptal butonları. Onay sonrası çalışanın raporlama zinciri (reports_to), departmanı ve birincil yönetici ataması otomatik güncellenir.'
            },
            {
                title: 'Sağ Tık Bağlam Menüsü',
                description: 'Herhangi bir düğüme sağ tıklayarak bağlam menüsünü açın. Menü seçenekleri: (1) "Düzenle" — çalışan profil düzenleme sayfasına yönlendirir. (2) "Yeni Alt Çalışan Ekle" — bu çalışanın altına yeni personel ekleme sihirbazını açar, yönetici otomatik doldurulur. (3) "Departman Düzenle" — departman adı, kısaltma (abbreviation), "Şemada Göster" checkbox\'ı düzenleme modalı. (4) "Departman Sil" — yalnızca altında çalışan olmayan boş departmanlar silinebilir, çalışan varsa hata mesajı gösterilir.'
            },
            {
                title: 'Departman Renk Kodları ve Arama',
                description: 'Sayfanın üst kısmındaki arama kutusuna çalışan adı yazarak belirli bir kişiyi bulabilirsiniz — bulunan düğüm otomatik ortaya getirilir ve altın sarısı çerçeve ile vurgulanır. Renk kodları referansı sol alt köşede gösterilir: her departman tipi kendi rengiyle etiketlenir. Büyük organizasyonlarda (50+ çalışan) departman görünümü daha okunaklıdır — her departman ayrı bir kutu içinde gruplandırılır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Organizasyon şeması çalışan profilleri, departman atamaları ve yönetici ilişkilerinden otomatik oluşturulur. Çalışan Yönetimi sayfasında yapılan değişiklikler (yönetici ataması, departman değişikliği) şemaya anında yansır.' },
            { type: 'warning', text: 'Şemayı görüntülemek için PAGE_ORG_CHART yetkisi gerekir. Sürükle-bırak ile reorganizasyon ve sağ tık düzenleme işlemleri ek yönetici izinleri gerektirir. Yetkisiz kullanıcılar şemayı salt okunur modda görür.' },
            { type: 'success', text: '"Ekrana Sığdır" butonu (Maximize ikonu) tüm ağaç yapısını ekran boyutuna otomatik ölçekler. 100+ çalışanlı büyük organizasyonlarda şemaya genel bakış için çok kullanışlıdır.' },
            { type: 'info', text: 'Pasif çalışanlar varsayılan olarak gizlidir. "Pasif Çalışanları Göster" toggle\'ını açarak ayrılmış personeli de şemada görebilirsiniz — gri tonlarla ve kesikli çerçeve ile ayırt edilirler.' },
            { type: 'info', text: 'Boş pozisyonlar henüz doldurulmamış kadro yerlerini temsil eder. "Boş Pozisyonları Göster" ile şemada kesikli çerçeveli düğümler olarak görünürler — hangi pozisyonların açık olduğunu takip etmek için faydalıdır.' }
        ],
        faq: [
            { q: 'Organizasyon şeması nasıl güncellenir?', a: 'Şema çalışan profilleri ve departman atamalarından otomatik üretilir. Çalışan Yönetimi sayfasında yönetici/departman değişikliği yapıldığında şema anında güncellenir. Sürükle-bırak ile doğrudan şema üzerinden de değişiklik yapılabilir.' },
            { q: 'Bir departmanın altına yeni birim nasıl eklenir?', a: 'İki yol: (1) Sağ tık menüsünden "Departman Düzenle" ile mevcut departman yapısını düzenleyin veya yeni alt departman oluşturun. (2) Çalışan Yönetimi sayfasından yeni departman tanımlayın ve çalışanları atayın.' },
            { q: 'Şemadaki zoom çok küçük/büyük kaldı, nasıl sıfırlarım?', a: '"Ekrana Sığdır" (Maximize) butonuna tıklayın — tüm yapı ekrana uygun boyuta otomatik ölçeklenir. Fare tekerleği ile de yakınlaştırma/uzaklaştırma yapabilirsiniz.' },
            { q: 'Belirli bir çalışanı şemada nasıl bulurum?', a: 'Üst kısımdaki arama kutusuna çalışan adını yazın. Bulunan düğüm otomatik olarak ekrana getirilir ve altın sarısı çerçeve ile vurgulanır.' },
            { q: 'Departman görünümü ile hiyerarşik görünüm farkı nedir?', a: 'Hiyerarşik görünüm (varsayılan) tüm çalışanları yönetici-alt ilişkisine göre dikey ağaç şeklinde gösterir. Departman görünümü çalışanları departman bazında gruplar — her departman ayrı bir kutu içinde listelenir. Büyük organizasyonlarda departman görünümü daha okunaklıdır.' }
        ]
    },
    {
        id: 'servis-yonetimi',
        title: 'Servis Yönetimi',
        icon: Server,
        description: 'Puantaj hesaplama tetikleme, Celery görev durumu, otomatik görevler listesi, sistem durumu paneli, hızlı bağlantılar ve canlı servis logları',
        permission: 'PAGE_SYSTEM_HEALTH',
        link: '/admin/service-control',
        images: [],
        steps: [
            {
                title: 'Günlük Hesaplama Tetikleme',
                description: '"Günlük Hesaplama Tetikle" kartında hedef tarih seçerek o gün için tüm çalışanların puantaj hesaplamalarını yeniden başlatabilirsiniz. Tarih seçici varsayılan olarak dünü gösterir — takvim ikonuna tıklayarak farklı tarih seçebilirsiniz. "Servisi Çalıştır" butonu (indigo) ile işlemi başlatın. Amber uyarı kutusu: "Bu işlem çalışan sayısına bağlı olarak birkaç dakika sürebilir." İşlem arka planda Celery task olarak çalışır. Başarı durumunda yeşil mesaj: "Hesaplama tamamlandı — X kayıt güncellendi." Hata durumunda kırmızı mesaj ve hata detayı gösterilir.',
                image: { src: '/help-images/14-service-control.png', caption: 'Servis Yönetimi — günlük hesaplama tetikleme kartı (tarih seçici + Servisi Çalıştır butonu), amber uyarı, sistem durumu paneli ve canlı servis logları' }
            },
            {
                title: 'Otomatik Görevler Listesi (Celery Tasks)',
                description: 'Sistem şu zamanlanmış görevleri otomatik çalıştırır: (1) Canlı Güncelleme (update_attendance_periodic) — her 30 saniyede, aktif çalışanların puantaj verilerini canlı hesaplar (is_live=True). (2) Devamsızlık Kontrolü (check_absenteeism) — her 30 saniyede, gelmeyenleri ABSENT olarak işaretler. (3) Gece Görevi (daily_midnight_reset) — 00:01\'de, açık kayıtları kapatır, gece yarısını geçen kayıtları böler, devamsızlık oluşturur. (4) İzin Tahakkuku (process_annual_leave_accruals) — 01:00\'da, günlük izin tahakkuk kontrolü. (5) Mesai Sona Erme (expire_overtime_assignments) — 01:30\'da, 2 mali ay geçmiş atamaları expire eder. (6) Mali Takvim Uyarıları (check_fiscal_calendar_alerts) — 09:00\'da, dönem kapanış uyarıları. (7) Aylık Mutabakat (monthly_reconciliation_report) — her ayın 26\'sında 09:00\'da, bordro mutabakat raporu üretir.',
                image: { src: '/help-images/14a-service-detail.png', caption: 'Otomatik görevler listesi detay — Celery Beat zamanlamaları, son çalışma zamanı, başarı/hata durumu ve canlı log konsolu' }
            },
            {
                title: 'Sistem Durumu Paneli',
                description: '"Sistem Durumu" kartında büyük yeşil CheckCircle ikonu ile "Servis Aktif" gösterilir — bu Celery worker\'ın çalıştığını ve Redis bağlantısının sağlıklı olduğunu gösterir. Altında son görev çalışma zamanı ve toplam işlenen kayıt sayısı. Worker durmazsa ikon kırmızı XCircle ile "Servis Pasif" olarak değişir.'
            },
            {
                title: 'Hızlı Bağlantılar',
                description: 'Sayfada 2 hızlı erişim kartı: (1) "Sistem Kontrol Merkezi" → /admin/system-health — 30+ sekmeli sistem yönetimi paneline yönlendirir. (2) "Canlı Durum Paneli" → /admin/live-status — aktif çalışanların gerçek zamanlı durumunu (giriş/çıkış/mola) izlemek için. Her kart kısa açıklama ve ok ikonu içerir.'
            },
            {
                title: 'Canlı Servis Logları (Karanlık Konsol)',
                description: 'Sayfanın alt kısmında siyah arka planlı terminal benzeri konsol görünümünde son 100 servis işlem logu gösterilir. Her satırda: zaman damgası (saat:dakika:saniye), seviye etiketi (INFO = mavi pill, WARN = sarı pill, ERROR = kırmızı pill), bileşen adı (ör. "DailyService", "TaskRunner", "GateService"), mesaj metni ve varsa etkilenen çalışan adı. Loglar her 5 saniyede otomatik yenilenir (polling). Yeni loglar en üstte görünür. Hata logları kırmızı arka plan ile, uyarı logları turuncu arka plan ile vurgulanır.'
            },
            {
                title: 'Manuel Hesaplama Kullanım Senaryoları',
                description: 'Şu durumlarda manuel hesaplama tetiklemeniz gerekebilir: (1) Kartsız giriş talebi onaylandıktan sonra puantajın güncelenmesi. (2) Çalışma programı değişikliği sonrası geçmiş günlerin yeniden hesaplanması. (3) Gece görevinin çalışmadığı tespit edildikten sonra eksik günlerin hesaplanması. (4) Veri bütünlüğü denetiminde tutarsızlık tespit edildikten sonra düzeltme. (5) Sağlık raporu onayı sonrası puantaj güncellenmesi.'
            }
        ],
        tips: [
            { type: 'warning', text: 'Manuel hesaplama tetikleme çalışan sayısına bağlı olarak birkaç saniye ile birkaç dakika sürebilir. 100 çalışan için yaklaşık 30-60 saniye. İşlem Celery task olarak arka planda çalışır — sayfadan ayrılsanız bile tamamlanır.' },
            { type: 'info', text: 'Gece Görevi (00:01) kritik öneme sahiptir: (1) OPEN durumundaki kayıtları vardiya bitiş saatinde otomatik kapatır, (2) Gece yarısını geçen kayıtları 23:59:59 ve 00:00:00 olarak ikiye böler, (3) Gelmeyenler için ABSENT devamsızlık kaydı oluşturur. Bu görev çalışmazsa ertesi gün kayıtlar tutarsız olabilir.' },
            { type: 'success', text: 'Log konsolu otomatik yenilenir, manuel müdahale gerektirmez. Hata loglarını takip ederek sorunları erken tespit edebilirsiniz. Kırmızı loglar acil müdahale gerektiren hataları, sarı loglar dikkat gerektiren uyarıları gösterir.' },
            { type: 'info', text: 'Tüm otomatik görevler İstanbul saat diliminde (Europe/Istanbul) çalışır. Celery Beat scheduler tarafından tetiklenir. Zamanlamalar CELERY_TIMEZONE ayarıyla konfigüre edilmiştir.' },
            { type: 'warning', text: 'Celery worker durduğunda otomatik görevler çalışmaz. Sistem durumu panelinde "Servis Pasif" görürseniz Railway dashboard\'ından worker durumunu kontrol edin ve gerekirse yeniden başlatın.' }
        ],
        faq: [
            { q: 'Hesaplama tetikledim ama kayıtlar değişmedi', a: 'İki olası neden: (1) O tarih için giriş/çıkış verisi yoksa hesaplama sonuç üretmez — önce kartsız giriş talebi ile kayıtları oluşturun. (2) Celery worker çalışmıyor olabilir — sistem durumu panelini kontrol edin. Worker aktifse birkaç saniye bekleyip sayfayı yenileyin.' },
            { q: 'Gece görevi ne zaman çalışır ve ne yapar?', a: 'Her gece 00:01\'de İstanbul saatinde çalışır. 3 iş yapar: (1) OPEN kayıtları vardiya bitişinde kapatır (çıkış yapmadan ayrılanlar). (2) Gece yarısını geçen kayıtları ikiye böler (23:59:59 + 00:00:00). (3) İş günü olup gelmeyenler için ABSENT kaydı oluşturur.' },
            { q: 'Log kayıtları ne kadar süre saklanır?', a: 'Canlı log konsolunda son 100 kayıt gösterilir. Daha eski loglar Sistem Yönetimi > Servis Logları sekmesinde (son 500) veya sunucu log dosyalarında bulunabilir.' },
            { q: 'Otomatik görevlerin çalışıp çalışmadığını nasıl anlarım?', a: 'Sistem durumu panelinde "Servis Aktif" (yeşil) görüyorsanız Celery çalışıyor demektir. Canlı log konsolunda görevlerin çalışma zamanlarını takip edebilirsiniz. Her 30 saniyede "update_attendance_periodic" logu görmeniz beklenir.' },
            { q: 'Belirli bir çalışanın puantajını yeniden hesaplatabilir miyim?', a: 'Bu sayfadan yapılan hesaplama tüm çalışanları kapsar. Tek çalışan için Veri Yönetimi sayfasındaki Personel Verileri sekmesinden ilgili çalışanı seçerek gün bazlı düzenleme yapabilirsiniz.' }
        ]
    },
    {
        id: 'veri-yonetimi',
        title: 'Veri Yönetimi',
        icon: Database,
        description: 'Personel puantaj verileri düzenleme, toplu hesaplama işlemleri, 12 aylık yıllık matris, JSON/CSV yedekleme-geri yükleme ve mutabakat',
        permission: 'PAGE_DATA_MANAGEMENT',
        link: '/system-data-management',
        images: [],
        steps: [
            {
                title: 'Personel Verileri Sekmesi — Çalışan Seçimi ve Dönem Filtresi',
                description: 'İlk sekmede bireysel puantaj verilerini inceleyebilir ve düzenleyebilirsiniz. (1) Çalışan Arama: üst kısımdaki aranabilir dropdown\'dan çalışan seçin — isim yazarak filtreleme yapabilirsiniz. (2) Dönem Filtresi: Ay (dropdown, Ocak-Aralık) ve Yıl (sayı girişi) seçerek hedef mali dönemi belirleyin. Seçim sonrası çalışanın o dönemdeki tüm günlük puantaj kayıtları yüklenir. CalendarGrid: aylık takvim görünümünde her gün bir hücre — renk kodlu durum (yeşil=normal, mavi=OT, kırmızı=eksik, amber=mola, gri=tatil). Hücreye tıklayarak DayEditPanel açılır.',
                image: { src: '/help-images/18-data-management.png', caption: 'Veri Yönetimi — 4 sekmeli panel (Personel Verileri/Toplu İşlemler/Yıllık Matris/Yedekleme), çalışan seçimi, dönem filtresi, CalendarGrid ve DayEditPanel' }
            },
            {
                title: 'Personel Verileri Sekmesi — DayEditPanel (Gün Düzenleme)',
                description: 'CalendarGrid\'de bir güne tıklayarak DayEditPanel açılır. İçerik: (1) Tarih başlığı ve gün bilgisi (çalışma günü/tatil). (2) Giriş Saati — saat:dakika editörü, mevcut değer gösterilir, düzenlenebilir. (3) Çıkış Saati — aynı format. (4) Durum bilgisi: hesaplanan toplam çalışma, normal mesai, fazla mesai, eksik, mola süresi. (5) Kaynak (source): CARD_READER, CARDLESS_ENTRY, MANUAL, SYSTEM, SPLIT vb. (6) Düzenleme sonrası "Kaydet" butonu ile değişiklik kaydedilir ve puantaj otomatik yeniden hesaplanır. Not: Kilitli dönemlerdeki kayıtlar düzenlenemez — kilit ikonu gösterilir.',
                image: { src: '/help-images/18a-data-management-admin.png', caption: 'DayEditPanel detay — giriş/çıkış saati düzenleme, hesaplanan süreler, durum bilgisi ve kaynak göstergesi' }
            },
            {
                title: 'Toplu İşlemler Sekmesi',
                description: 'Çok sayıda kaydı tek seferde işleme: (1) İşlem Türü seçimi: "Puantaj Sıfırla" (seçili tarihlerdeki kayıtları temizler) veya "Yeniden Hesapla" (mevcut giriş/çıkış verilerinden puantajı yeniden hesaplar). (2) Tarih Aralığı: başlangıç ve bitiş tarihi seçimi. (3) Filtreler: departman dropdown (belirli departman veya Tümü), çalışan dropdown (belirli kişi veya Tümü). (4) "Uygula" butonu — onay dialogu: etkilenecek kayıt sayısı ve uyarı gösterilir, "Evet, Uygula" / "İptal" butonları. Sıfırlama geri alınamaz — dikkatli kullanın. Yeniden hesaplama güvenlidir, mevcut giriş/çıkış verilerini korur ve sadece hesaplanan alanları günceller.'
            },
            {
                title: 'Yıllık Matris Sekmesi (12 Aylık Bakiye Tablosu)',
                description: 'Tüm çalışanların 12 aylık çalışma bakiyelerini tek büyük tabloda görüntüleyin. Satırlar: çalışan adı + departman. Sütunlar: Ocak-Aralık (12 ay). Her hücrede 4 değer: Hedef saat (target), Çalışılan saat (worked), Eksik saat (deficit), Fazla Mesai saat (overtime). Renk kodları: pozitif bakiye (çalışılan > hedef) = yeşil arka plan, negatif bakiye (çalışılan < hedef) = kırmızı arka plan, sıfır = nötr. Değerler "saat" ve "dakika" formatında gösterilir (ör. "8s 30dk"). Hücreye tıklayarak otomatik olarak Personel Verileri sekmesine geçiş yapılır ve o çalışanın o ayı açılır. Üstte yıl seçici ve departman filtresi bulunur.'
            },
            {
                title: 'Yedekleme Sekmesi — Dışa Aktarma (Export)',
                description: 'Sistem verilerini yedekleme: (1) Format seçimi: JSON (yapılandırılmış, içe aktarmaya uygun) veya CSV (tablo formatı, Excel\'de açılabilir). (2) Kapsam: "Tam Yedekleme" (tüm veriler) veya "Seçimli" (çalışan/dönem filtreli). (3) "Dışa Aktar" butonu — dosya otomatik indirilir. İndirme sırasında buton "Hazırlanıyor..." olarak gösterilir. JSON dosya yapısı: çalışan bilgileri, puantaj kayıtları, talep geçmişleri, rol/yetki atamaları ve mali takvim verileri.'
            },
            {
                title: 'Yedekleme Sekmesi — İçe Aktarma (Import) ve Dry-Run',
                description: 'Yedek dosyalarını geri yükleme: (1) Dosya yükleme alanı — JSON dosyası sürükle-bırak veya "Dosya Seç". (2) "Deneme Modu (Dry Run)" checkbox — işaretlendiğinde veritabanı değiştirilmez, sadece simülasyon yapılır ve kaç kaydın oluşturulacağı/güncelleneceği/atlanacağı raporlanır. (3) İçe aktarma modu: UPSERT — birincil anahtar (ID/sicil no) eşleşirse mevcut kayıt güncellenir, eşleşmezse yeni kayıt oluşturulur. (4) Doğrulama: format hataları, eksik zorunlu alanlar, geçersiz değerler detaylı raporlanır. (5) "İçe Aktar" butonu + onay dialogu. Dry-run raporu: "Oluşturulacak: X, Güncellenecek: Y, Atlanacak: Z, Hata: W".'
            },
            {
                title: 'Mutabakat (Settlement) İşlemi',
                description: 'Dışa aktarılan veriler ile mevcut veritabanı arasında karşılaştırma: mutabakat modalında her çalışan için beklenen vs gerçekleşen değerler listelenir. Farklar kırmızı ile vurgulanır. "Düzelt" butonu ile farkları giderebilirsiniz. Bu özellik bordro mutabakatı öncesi veri doğrulaması için kullanışlıdır.'
            }
        ],
        tips: [
            { type: 'warning', text: 'İçe aktarma (Import) işlemi geri alınamaz — mevcut kayıtları günceller veya yeni oluşturur. Mutlaka önce "Deneme Modu (Dry Run)" checkbox\'ını işaretleyerek simülasyon çalıştırın. Simülasyon raporu kaç kaydın etkileneceğini gösterir.' },
            { type: 'info', text: 'Yıllık matriste değerler: Pozitif bakiye (yeşil) = çalışan hedefin üstünde çalışmış. Negatif bakiye (kırmızı) = çalışan hedefin altında çalışmış. Değerler MonthlyWorkSummary modeli tarafından mali dönem bazında hesaplanır.' },
            { type: 'success', text: 'JSON dışa aktarma + içe aktarma round-trip veri bütünlüğünü korur. Dışa aktarılan dosya aynı formatta içe aktarılabilir. Bu özellik ortam arası veri taşıma veya yedekleme-geri yükleme senaryoları için idealdir.' },
            { type: 'warning', text: 'Toplu sıfırlama işlemi seçili tarihlerdeki tüm puantaj kayıtlarını kalıcı olarak siler. Yeniden hesaplama ise güvenlidir — giriş/çıkış verilerini korur ve sadece hesaplanan alanları günceller. Şüphe durumunda "Yeniden Hesapla" tercih edin.' },
            { type: 'info', text: 'Kilitli mali dönemlerdeki kayıtlar DayEditPanel\'den düzenlenemez. Kilit ikonu gösterilir ve "Bu dönem kilitlidir" uyarısı çıkar. Düzenleme için önce dönem kilidinin açılması gerekir (Çalışma Programları > Dönemler).' },
            { type: 'info', text: 'CalendarGrid\'deki renk kodları: yeşil = normal çalışma günü, mavi = fazla mesai var, kırmızı = eksik çalışma, amber = mola hakkı aşımı, gri = tatil/izin günü, beyaz = kayıt yok.' }
        ],
        faq: [
            { q: 'Yıllık matriste "-6s" ne anlama geliyor?', a: '-6s = o çalışanın o mali dönem için 6 saat eksik çalıştığı anlamına gelir. Eksi (-) işareti hedefin altında çalışıldığını, "s" saat birimini gösterir. "+3s 15dk" ise 3 saat 15 dakika fazla çalışıldığını belirtir.' },
            { q: 'Dışa aktarmada hangi veriler dahildir?', a: 'Çalışan profilleri (ad, soyad, departman, pozisyon), puantaj kayıtları (günlük giriş/çıkış, hesaplanan süreler), talep geçmişleri (izin, mesai, kartsız giriş), rol ve yetki atamaları, mali takvim verileri. JSON ve CSV formatları seçilebilir.' },
            { q: 'İçe aktarma çakışmasında ne olur?', a: 'UPSERT modu: birincil anahtar (ID veya sicil numarası) eşleşirse mevcut kayıt güncellenir, eşleşmezse yeni kayıt oluşturulur. Doğrulama hatası olan satırlar atlanır ve raporda detaylı gösterilir (satır numarası + hata mesajı).' },
            { q: 'Toplu yeniden hesaplama ne kadar sürer?', a: 'Çalışan sayısı ve tarih aralığına bağlıdır. Kaba hesap: çalışan başına gün başına ~100ms. 50 çalışan x 30 gün = ~150 saniye. İşlem Celery task olarak arka planda çalışır.' },
            { q: 'Gün düzenlemesinde giriş/çıkış saatini değiştirdim, ne olur?', a: 'Kaydet sonrası puantaj otomatik yeniden hesaplanır: normal mesai, fazla mesai, eksik ve mola değerleri güncellenir. İlişkili potansiyel mesai kayıtları da yeniden değerlendirilir.' },
            { q: 'Mutabakat işlemi ne işe yarar?', a: 'Dışa aktarılan veriler ile veritabanındaki mevcut değerler karşılaştırılır. Farklar (ör. güncellenen puantaj, silinen kayıt) tespit edilir. Bordro mutabakatı öncesi veri doğrulaması için kullanışlıdır.' }
        ]
    },
    {
        id: 'saglik-raporlari',
        title: 'Sağlık Raporları',
        icon: HeartPulse,
        description: 'Sağlık raporu ve hastane ziyareti kayıtları, 2 rapor türü toggle, dosya yükleme (Cloudinary), onay/red süreci, puantaj entegrasyonu ve aylık hedef düşümü',
        permission: 'PAGE_HEALTH_REPORTS',
        link: '/health-reports',
        images: [],
        steps: [
            {
                title: 'Rapor Türü Seçimi (2 Mod)',
                description: 'Sayfanın üst kısmında 2 büyük toggle buton ile rapor türünü seçin: (1) "Sağlık Raporları" (HeartPulse ikonu, kırmızı arka plan) — tam gün veya çok günlü hastalık izni kayıtları. Doktor raporuna dayalı, başlangıç ve bitiş tarihi girilen, genellikle 1+ gün süren raporlar. (2) "Hastane Ziyaretleri" (Stethoscope ikonu, rose arka plan) — belirli saatler arası kısmi gün hastane ziyareti kayıtları. Başlangıç/bitiş saati ile birlikte tarih girilir, gün içi kısmi süre olarak işlenir. Seçili türe göre liste, filtreler ve form alanları otomatik değişir.',
                image: { src: '/help-images/16-health-reports.png', caption: 'Sağlık Raporları — rapor türü toggle butonları (Sağlık Raporları / Hastane Ziyaretleri), 4 özet kartı, filtreler, rapor listesi ve detay modalı' }
            },
            {
                title: 'Özet Kartları',
                description: 'Seçili rapor türüne göre 4 özet kartı güncellenir: (1) Toplam Rapor (gri, FileText ikonu) — tüm kayıt sayısı. (2) Onay Bekleyen (amber, Clock ikonu) — PENDING durumdaki raporlar. (3) Onaylanan (yeşil, CheckCircle ikonu) — APPROVED durumdaki raporlar. (4) Reddedilen (kırmızı, XCircle ikonu) — REJECTED durumdaki raporlar. Kartlara tıklayarak ilgili durumdaki raporları filtreleyebilirsiniz.'
            },
            {
                title: 'Filtreler ve Arama',
                description: 'Rapor listesini daraltma araçları: (1) Arama kutusu — çalışan adı veya açıklama metni ile arama, 400ms debounce ile anlık filtreleme. (2) Durum dropdown: Tümü, Bekleyen (PENDING), Onaylanan (APPROVED), Reddedilen (REJECTED), İptal Edilen (CANCELLED). (3) Tarih aralığı filtresi: başlangıç ve bitiş tarihi seçicileri — yalnızca bu tarihler arasındaki raporlar listelenir. Filtreler kombineli çalışır: arama + durum + tarih birlikte uygulanabilir.'
            },
            {
                title: 'Yeni Rapor Oluşturma',
                description: '"Yeni Rapor" butonu (mavi, + ikonu) ile oluşturma formu açılır. Sağlık Raporu formu: çalışan seçimi (dropdown), başlangıç tarihi, bitiş tarihi, tam gün checkbox (varsayılan işaretli), açıklama (metin alanı) ve dosya yükleme. Hastane Ziyareti formu: ek olarak başlangıç saati ve bitiş saati alanları, tam gün checkbox\'ı işaretli değil. Dosya yükleme: sürükle-bırak veya "Dosya Seç", desteklenen formatlar: PDF, JPG, JPEG, PNG. Dosyalar Cloudinary\'ye yüklenir. "Kaydet" butonu ile rapor PENDING durumunda oluşturulur.'
            },
            {
                title: 'Rapor Detay ve Düzenleme Modalı',
                description: 'Listede herhangi bir rapora tıklayarak veya "Gör" butonuna basarak detay modalını açın. Modal içeriği: (1) Çalışan adı + avatar. (2) Rapor türü badge\'i (Sağlık Raporu / Hastane Ziyareti). (3) Tarih aralığı (ve saatler, hastane ziyaretinde). (4) Açıklama metni. (5) Ekli dosyalar — her dosya için indirme (download ikonu) ve silme (çöp kutusu, onay dialogu) butonları. (6) Durum badge: PENDING=amber, APPROVED=yeşil, REJECTED=kırmızı, CANCELLED=gri. Düzenleme modu: kalem ikonuna tıklayarak tarihleri, açıklamayı güncelleyebilir ve yeni dosya ekleyebilirsiniz.',
                image: { src: '/help-images/16a-health-reports-admin.png', caption: 'Rapor detay modalı — çalışan bilgisi, tarih aralığı, açıklama, ekli dosyalar, Onayla/Reddet/Düzenle aksiyonları' }
            },
            {
                title: 'Onay ve Red Süreci',
                description: 'PENDING durumdaki raporlar için 2 aksiyon butonu: (1) "Onayla" (yeşil, ✓ ikonu) — tıklayın, onay dialogu: "Bu raporu onaylamak istediğinize emin misiniz?" Onay sonrası rapor APPROVED durumuna geçer, ilgili günlerin puantajı güncellenir. (2) "Reddet" (kırmızı, ⛔ ikonu) — tıklayın, ret sebebi modalı açılır: metin alanına ret gerekçesi yazın. Red sonrası rapor REJECTED durumuna geçer, puantaj etkilenmez. Onay/red sonrası çalışana bildirim gönderilir.'
            },
            {
                title: 'Puantaj Entegrasyonu ve Hedef Düşümü',
                description: 'Onaylanan raporların puantaja etkisi: (1) Sağlık Raporu — ilgili günlerin puantaj kaydı HEALTH_REPORT durumuna geçirilir. Her rapor günü aylık çalışma hedefinden düşülür (ör. 3 günlük rapor = 3 × günlük çalışma saati hedeften çıkarılır). (2) Hastane Ziyareti — ilgili günün puantaj kaydına HOSPITAL_VISIT source eklenir, belirtilen saatler çalışma süresinden düşülür (kısmi gün). Aylık çalışma özetinde (MonthlyWorkSummary) ayrıca: health_report_days (toplam rapor gün sayısı) ve hospital_visit_count (toplam ziyaret sayısı) alanları güncellenir. Raporlar bakiye hesabını korur — raporlu günler eksik çalışma olarak sayılmaz.'
            },
            {
                title: 'İptal İşlemi',
                description: 'Onaylanmamış (PENDING) raporlar iptal edilebilir: "İptal" butonu (gri) ile onay dialogu. İptal sonrası rapor CANCELLED durumuna geçer ve puantaj etkilenmez. Onaylanmış raporların iptali için sistem yöneticisine başvurun — iptal edildiğinde puantaj güncellemesi geri alınır ve hedef düşümü iade edilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Sağlık raporları aylık çalışma hedefinden düşülür. 3 günlük rapor = hedeften 3 × günlük çalışma saati (ör. 3 × 8.5 saat = 25.5 saat) düşülür. Bu sayede raporlu günler eksik çalışma olarak sayılmaz ve bakiye hesabı doğru kalır.' },
            { type: 'warning', text: 'Dosya yüklemesi isteğe bağlıdır ancak doktor raporu PDF\'i yüklenmesi önerilir. Desteklenen formatlar: PDF, JPG, JPEG, PNG. Dosyalar Cloudinary\'de şifrelenmiş olarak güvenli saklanır. Maksimum dosya boyutu sunucu ayarlarına bağlıdır.' },
            { type: 'success', text: 'Hastane ziyaretleri kısmi gün olarak işlenir — yalnızca belirtilen başlangıç-bitiş saatleri arasındaki süre çalışma süresinden düşülür. Tam gün sağlık raporu ise günün tamamını kapsar. İki tür farklı kaynak kodlarıyla (HEALTH_REPORT / HOSPITAL_VISIT) takip edilir.' },
            { type: 'info', text: 'Onay yetkisi: Sağlık raporlarını onaylama genellikle ROLE_ADMIN ve ROLE_ACCOUNTING rollerine tanımlıdır. PAGE_HEALTH_REPORTS yetkisi sayfayı görmeyi, onay yetkisi ise işlem yapmayı sağlar.' },
            { type: 'warning', text: 'Onaylanan raporun iptali puantaj kayıtlarını geri almayı gerektirir — bu nedenle onay öncesi tarih ve detayları dikkatlice kontrol edin. Yanlış onay durumunda sistem yöneticisine başvurun.' },
            { type: 'info', text: 'Rapor listesinde her satır: çalışan avatar + ad, rapor türü badge, tarih aralığı, durum badge, dosya sayısı ikonu ve "Gör" butonu gösterir. Satıra tıklayarak da detay modalı açılır.' }
        ],
        faq: [
            { q: 'Sağlık raporu ile hastane ziyareti farkı nedir?', a: 'Sağlık raporu = tam gün veya çok günlü hastalık izni (doktor raporuna dayalı). Başlangıç ve bitiş tarihi girilir, tam günler kapsar. Hastane ziyareti = belirli saatler arası kısmi gün ziyaret. Başlangıç/bitiş saati ile birlikte girilir. Her ikisi de puantaja yansır ama farklı kaynak kodlarıyla (HEALTH_REPORT / HOSPITAL_VISIT) takip edilir.' },
            { q: 'Bu sayfayı göremiyorum, ne yapmalıyım?', a: 'PAGE_HEALTH_REPORTS yetkisi gereklidir. Bu yetki genellikle ROLE_ADMIN ve ROLE_ACCOUNTING rollerine tanımlıdır. Yetkisiz kullanıcılar bu sayfaya erişemez. Sistem yöneticinize başvurun.' },
            { q: 'Dosya boyutu limiti nedir?', a: 'Dosya yükleme sunucu ayarlarına bağlıdır (varsayılan Django ayarı). Desteklenen formatlar: PDF, JPG, JPEG, PNG. Çok büyük dosyalar (>10MB) yükleme hatası verebilir — dosyayı sıkıştırarak tekrar deneyin.' },
            { q: 'Onaylanan raporu düzeltebilir miyim?', a: 'Onaylanan raporlar doğrudan düzenlenemez çünkü puantaj güncellemesi yapılmıştır. Düzeltme için sistem yöneticisine başvurun — rapor iptal edilip yenisi oluşturulabilir.' },
            { q: 'Rapor hedeften nasıl düşülür?', a: 'Onaylanan sağlık raporu günleri aylık çalışma hedefinden otomatik düşülür. Ör. 8.5 saatlik çalışma günü × 3 gün rapor = 25.5 saat hedeften çıkarılır. Bu sayede çalışanın bakiye hesabında raporlu günler eksik olarak görünmez.' },
            { q: 'Aynı tarihler için hem rapor hem izin girilirse ne olur?', a: 'Sistem çakışma kontrolü yapar. Aynı tarih aralığında aktif izin talebi varsa sağlık raporu oluşturulurken uyarı gösterilir. Genellikle sağlık raporu önceliklidir — izin talebi iptal edilerek rapor girişi yapılmalıdır.' }
        ]
    },
    {
        id: 'debug',
        title: 'Puantaj Hata Ayıklayıcı',
        icon: Server,
        description: 'Puantaj hesaplama doğrulama aracı — veritabanı değerleri ile canlı hesaplama karşılaştırması, NaN tespiti, yapılandırma kontrolü ve ham günlük kayıt analizi',
        permission: 'PAGE_DEBUG',
        link: '/debug/attendance',
        images: [],
        steps: [
            {
                title: 'Çalışan ve Dönem Seçimi',
                description: 'Sayfanın üst kısmında 3 giriş alanı: (1) Çalışan dropdown — aranabilir liste, tüm aktif çalışanlar listelenir, isim yazarak filtreleme. (2) Ay — 1-12 sayı girişi veya dropdown (Ocak-Aralık). (3) Yıl — 4 haneli sayı girişi (ör. 2026). Tüm alanları doldurup "Kayıtları Analiz Et" butonu (indigo arka plan, Search ikonu) ile debug analizi başlatılır. Yükleme sırasında spinner gösterilir.',
                image: { src: '/help-images/19-debug.png', caption: 'Puantaj Hata Ayıklayıcı — çalışan dropdown, ay/yıl seçici, "Kayıtları Analiz Et" butonu, 3 sütunlu karşılaştırma panelleri ve alt kısımda ham günlük kayıtlar tablosu' }
            },
            {
                title: '3 Sütunlu Karşılaştırma Paneli',
                description: 'Analiz sonucu 3 yan yana panel halinde gösterilir: (1) Veritabanı Özeti (sol panel, mavi çerçeve) — MonthlyWorkSummary\'den okunan değerler: hedef saat, tamamlanan saat, eksik saat, toplam mola, fazla mesai, sağlık raporu gün sayısı, son güncelleme tarihi. Kayıt yoksa kırmızı "NO_RECORD" uyarısı. (2) Canlı Hesaplama (orta panel, yeşil çerçeve) — recalculate_daily_attendance() fonksiyonunun o an ürettiği değerler. DB ile fark varsa kırmızı "UYUMSUZ" etiketi ve fark değeri gösterilir, eşitse yeşil "UYUMLU" etiketi. (3) Yapılandırma (sağ panel, amber çerçeve) — çalışanın mali takvim adı, şablon adı, dönem aralığı (başlangıç-bitiş), izin günü sayısı, tolerans değerleri, haftalık OT limiti.',
                image: { src: '/help-images/19a-debug-admin.png', caption: '3 sütunlu karşılaştırma detayı — DB Özeti (hedef/tamamlanan/eksik), Canlı Hesaplama (uyumlu/uyumsuz göstergeleri), Yapılandırma (takvim/şablon/tolerans bilgileri)' }
            },
            {
                title: 'Ham Günlük Kayıtlar Tablosu',
                description: 'Alt kısımda seçili dönemin tüm günlük puantaj kayıtları detaylı tablo olarak listelenir. Sütunlar: (1) Tarih — gün/ay/yıl formatı, hafta sonu günleri amber arka plan. (2) Toplam Sn — toplam çalışma süresi saniye cinsinden. (3) Normal (yeşil arka plan) — normal mesai süresi. (4) Ek Mesai (mavi arka plan) — fazla mesai süresi. (5) Eksik (kırmızı arka plan) — eksik çalışma süresi. (6) Mola (amber arka plan) — düşülen mola süresi. (7) Durum — CALCULATED, APPROVED, OPEN, ABSENT, HEALTH_REPORT vb. (8) Kaynak — CARD_READER, CARDLESS_ENTRY, MANUAL, SPLIT, AUTO_SPLIT, SYSTEM, HEALTH_REPORT, HOSPITAL_VISIT. Tutarsız değerler kırmızı çerçeve ve uyarı ikonu ile vurgulanır.'
            },
            {
                title: 'NaN ve Hata Tespiti',
                description: 'Hesaplama sırasında NaN (Not a Number) veya beklenmeyen değerler oluşmuşsa: (1) AlertTriangle sarı uyarı ikonu ilgili alanın yanında gösterilir. (2) Hata detay kartı: "NaN Tespit Edildi" başlığı, etkilenen alan adı (ör. total_work_seconds), olası neden (ör. "shift_start tanımsız"), önerilen düzeltme. (3) Stack trace — teknik hata izleme bilgisi (geliştiriciler için). NaN genellikle şu nedenlerle oluşur: çalışana mali takvim atanmamış, şablonda vardiya saatleri tanımsız, veya bozuk giriş/çıkış verisi.'
            },
            {
                title: 'Tutarsızlık Analizi ve Karşılaştırma Detayı',
                description: 'DB ile canlı hesaplama arasında fark varsa her fark satır satır gösterilir: alan adı, DB değeri, canlı hesaplama değeri ve fark miktarı. Küçük farklar (< 60 sn) sarı uyarı, büyük farklar (> 60 sn) kırmızı hata olarak işaretlenir. Büyük farklar genellikle hesaplama tetiklenmesinin yapılmadığını gösterir. "Servis Yönetimi\'nden yeniden hesaplama tetikleyin" önerisi gösterilir.'
            }
        ],
        tips: [
            { type: 'info', text: 'Debug sayfası tamamen salt okunurdur — veritabanında hiçbir değişiklik yapmaz. Yalnızca mevcut verileri okur ve canlı hesaplama ile karşılaştırır. Güvenle kullanabilirsiniz.' },
            { type: 'warning', text: 'PAGE_DEBUG yetkisi gerektirir. Bu yetki genellikle sadece sistem yöneticilerine (ROLE_ADMIN veya SYSTEM_FULL_ACCESS) açıktır. Hassas puantaj verileri gösterildiğinden erişim sınırlıdır.' },
            { type: 'info', text: 'Tutarsızlık çıkması her zaman hata anlamına gelmez. Canlı hesaplama gerçek zamanlı değerleri üretir — eğer son puantaj hesaplama tetiklenmesi eski tarihli ise fark normal olabilir. Servis Yönetimi\'nden yeniden hesaplama yapıldıktan sonra kontrol edin.' },
            { type: 'success', text: 'Düzeltme yolu: (1) NaN hatası → Çalışan profilinden mali takvim atamasını kontrol edin. (2) Tutarsızlık → Servis Yönetimi\'nden ilgili tarih için yeniden hesaplama tetikleyin. (3) Kaynak hatası → Veri Yönetimi\'nden giriş/çıkış saatlerini düzeltin.' },
            { type: 'info', text: 'Kaynak kodları referansı: CARD_READER = kart okuyucu, CARDLESS_ENTRY = kartsız giriş talebi, MANUAL = manuel giriş, SPLIT = gece yarısı bölme, AUTO_SPLIT = otomatik mesai bölme, SYSTEM = sistem kaydı, HEALTH_REPORT = sağlık raporu, HOSPITAL_VISIT = hastane ziyareti.' }
        ],
        faq: [
            { q: 'Karşılaştırmada tutarsızlık çıktı, ne yapmalıyım?', a: 'Önce Servis Yönetimi\'nden ilgili tarih için "Günlük Hesaplama Tetikle" yapın. Hesaplama tamamlandıktan sonra debug sayfasını yeniden çalıştırın. Tutarsızlık devam ederse giriş/çıkış verilerini Veri Yönetimi\'nden kontrol edin.' },
            { q: 'NaN değeri neden oluşur ve nasıl düzeltilir?', a: 'NaN genellikle 3 nedenden kaynaklanır: (1) Çalışana mali takvim (FiscalCalendar) atanmamış — çalışan profilinden takvim atayın. (2) Şablonda vardiya saatleri tanımsız — Çalışma Programları\'nda şablonu düzenleyin. (3) Bozuk giriş/çıkış verisi — Veri Yönetimi\'nden giriş/çıkış saatlerini düzeltin.' },
            { q: 'Bu sayfayı göremiyorum', a: 'PAGE_DEBUG yetkisi gereklidir. Bu yetki genellikle ROLE_ADMIN veya SYSTEM_FULL_ACCESS rollerine tanımlıdır. Sistem yöneticinize başvurun.' },
            { q: 'Veritabanı özeti "NO_RECORD" gösteriyor, ne anlama gelir?', a: 'Seçili dönem için MonthlyWorkSummary kaydı oluşturulmamış demektir. Bu durum: (1) Çalışanın o dönemde sisteme kayıtlı olmaması, (2) Aylık hesaplama görevinin çalışmamış olması, (3) Mali takvim atanmamış olması durumlarında oluşur.' },
            { q: 'Küçük farklar (birkaç saniye) normal midir?', a: 'Evet. 60 saniyenin altındaki farklar genellikle yuvarlama farklarından kaynaklanır ve sarı uyarı olarak gösterilir. Dakika bazında anlamlı farklar yoksa endişelenmenize gerek yoktur. 60 saniyenin üstündeki farklar kırmızı ile gösterilir ve inceleme gerektirir.' },
            { q: 'Ham kayıtlar tablosunda SPLIT kaynağı ne anlama gelir?', a: 'SPLIT = gece yarısı bölme işlemi sonucu oluşan kayıt. Gece görevinin (00:01) gece yarısını geçen çalışma kayıtlarını ikiye bölmesinden kaynaklanır. AUTO_SPLIT = fazla mesai kaydının normal mesaiden otomatik ayrılması.' }
        ]
    },
    {
        id: 'mesai-takibi',
        title: 'Mesai Takibi (Ekip)',
        icon: Clock,
        description: 'Ekip çalışma durumu takibi — 3 görünüm modu (Liste/Analitik/Fazla Mesai), birincil/ikincil ekip sekmeleri, özet kartları, hiyerarşik sıralama, departman filtresi, OT ataması ve PersonDetailDrawer',
        permission: ['APPROVAL_OVERTIME', 'APPROVAL_LEAVE'],
        link: '/team',
        images: [],
        steps: [
            {
                title: '3 Görünüm Modu',
                description: 'Sağ üst köşede 3 toggle butonu ile görünüm değiştirilir: (1) Liste (varsayılan, tablo ikonu) — tüm ekip üyelerinin puantaj detaylarını tablo formatında listeler: çalışma süreleri, fazla mesai, eksik, mola, giriş/çıkış saatleri ve durum bilgileri. (2) Analitik (BarChart ikonu) — TeamAnalyticsDashboard bileşeni açılır, grafik ve istatistik bazlı detaylı ekip analizi sunar: katılım oranı, OT dağılımı, benchmark tabloları. (3) Fazla Mesai (Timer ikonu) — OTAssignmentCreator bileşeni açılır, ekip üyelerine ek mesai ataması yapma arayüzü. Her mod birbirinden bağımsız çalışır ve mod değişiminde veriler yeniden yüklenir.',
                image: { src: '/help-images/07-attendance.png', caption: 'Mesai Takibi — ekip listesi görünümü, çalışma/fazla mesai/eksik süre sütunları, çevrimiçi durum noktaları, dönem kontrolleri ve 3 görünüm modu toggle butonları' }
            },
            {
                title: 'Ekip Sekmeleri (Birincil / İkincil / Vekil)',
                description: '3 sekme ile farklı ekip kapsamları: (1) "Birincil Ekip" (varsayılan) — PRIMARY yönetici ilişkisi ile doğrudan bağlı çalışanlar. Tüm puantaj, izin ve mesai detayları görünür. (2) "İkincil Ekip" — SECONDARY yönetici ilişkisi ile bağlı çalışanlar. Bu sekmede yalnızca ek mesai (OT) bilgileri gösterilir: OT süreleri, OT atamaları, OT talepleri. İzin, puantaj ve diğer detaylar ikincil yöneticiye kapalıdır. (3) "Vekil Ekip" — vekâlet sistemi aktifse, size vekâlet verilen yöneticinin birincil ekibi bu sekmede gösterilir. Vekâlet süresince onay işlemleri yapabilirsiniz.',
                image: { src: '/help-images/07b-attendance-manager.png', caption: 'Yönetici görünümü — Birincil/İkincil/Vekil ekip sekmeleri, dönem seçici (Yıl/Ay), departman filtresi ve ekip tablosu' }
            },
            {
                title: 'Dönem ve Departman Filtreleri',
                description: 'Üst kontrol çubuğunda: (1) Yıl seçici — sayı girişi veya ok butonları ile yıl değiştirme. (2) Ay seçici — dropdown ile ay seçimi (Ocak-Aralık). Mali dönem kuralına göre (26-25) tarih aralığı otomatik hesaplanır. (3) Departman filtresi — dropdown ile belirli departman seçimi veya "Tüm Departmanlar". Filtreler uygulandığında tablo, özet kartları ve grafiklerin tümü güncellenir.'
            },
            {
                title: 'Özet Kartları',
                description: 'Tablonun üstünde 4 özet kartı tüm ekibin dönem toplamlarını gösterir: (1) Toplam Çalışma (saat:dakika formatı, Clock ikonu) — ekipteki tüm çalışanların toplam çalışma süresi. (2) Toplam Fazla Mesai (Timer ikonu, mavi) — onaylanan + bekleyen ek mesai toplamı. (3) Toplam Eksik (AlertTriangle ikonu, kırmızı) — toplam eksik çalışma süresi. (4) Net Bakiye (TrendingUp/Down ikonu) — çalışılan - hedef = net bakiye. Pozitif = yeşil, negatif = kırmızı.'
            },
            {
                title: 'Filtreler ve Sıralama Seçenekleri',
                description: 'Tablo üstünde filtreleme ve sıralama araçları: (1) İsim/Departman Arama — metin girişi ile anlık filtreleme. (2) Durum Filtresi dropdown: Tümü, Çevrimiçi (şu an ofiste), Geç Gelenler, Fazla Mesai Var, Eksik Çalışma, Ortalamanın Üstü, Hedefin Altında — 7 seçenek. (3) Sıralama dropdown: Ada Göre (A-Z), Fazla Mesai (çoktan aza), Eksik (çoktan aza), Normal Çalışma (çoktan aza), Net İyi (en iyi bakiye), Net Kötü (en kötü bakiye) — 6 seçenek. (4) Hiyerarşik Sıralama toggle — açıldığında çalışanları yönetici ağacına göre gruplar.'
            },
            {
                title: 'Tablo Bilgileri ve Durum Göstergeleri',
                description: 'Her çalışan satırında gösterilen bilgiler: (1) Avatar + Ad Soyad + Unvan (küçük gri metin). (2) Departman adı. (3) Toplam Çalışma — dönem toplamı saat:dakika. (4) Fazla Mesai — onaylanan OT süresi. (5) Eksik — hedef altı çalışma. (6) Bugün Normal — bugünkü normal mesai süresi. (7) Bugün OT — bugünkü fazla mesai. (8) Mola — bugün kullanılan mola süresi. (9) Giriş — bugünkü ilk giriş saati. (10) Çıkış — son çıkış saati (henüz yoksa "-"). (11) Durum — yeşil nokta (çevrimiçi/ofiste), kırmızı nokta (çıkış yapmış), turuncu nokta (izinde), gri nokta (devamsız). Satıra tıklayarak çalışan detay sayfasına gidebilirsiniz.',
                image: { src: '/help-images/07a-attendance-admin.png', caption: 'Ekip tablosu detay — çalışan satırları, çalışma/OT/eksik süreleri, bugünkü durum, giriş/çıkış saatleri ve renkli durum noktaları' }
            },
            {
                title: 'Hiyerarşi Görünümü (GROUP Düğümleri)',
                description: 'Hiyerarşik sıralama toggle\'ı açıldığında çalışanlar yönetici ağacına göre gruplandırılır. Her grup: GROUP düğümü (koyu arka plan, kalın metin) — grup başlığı (ör. "Yazılım Ekibi") + toplu istatistikler (toplam çalışma, toplam OT, toplam eksik, ortalama bakiye). Alt satırlarda o grubun çalışanları. Her grup genişletilebilir (▼) / daraltılabilir (▶). İç içe gruplar (alt yöneticiler) desteklenir. Bu görünüm büyük ekiplerde (20+ kişi) yapıyı anlamayı ve grup bazlı karşılaştırma yapmayı kolaylaştırır.'
            },
            {
                title: 'Analitik Modu (TeamAnalyticsDashboard)',
                description: 'Analitik görünümünde 6 bölüm: (1) Katılım Oranı — dönem içi devam yüzdesi, trend grafiği. (2) Hafta Sonu / Hafta İçi OT Analizi — hafta sonu ve hafta içi mesai dağılımı çubuk grafik. (3) Yemek-OT Korelasyonu — yemek siparişi ile ek mesai ilişkisi scatter plot. (4) İzin Kullanım Oranları — izin türlerine göre kullanım yüzdeleri pie chart. (5) Departman Benchmark Tablosu — departmanlar arası karşılaştırma: ortalama çalışma, OT, eksik, katılım (3 ek sütun). (6) Ranking Tablosu — en çok/en az çalışan sıralaması (3 ek sütun). Her çalışan satırına tıklayarak PersonDetailDrawer açılır: katılım detayları + OT dökümü + yemek siparişleri.',
                image: { src: '/help-images/07c-attendance-employee.png', caption: 'Analitik modu — katılım oranı grafiği, OT dağılımı, departman benchmark tablosu, ranking ve PersonDetailDrawer' }
            },
            {
                title: 'Fazla Mesai Modu (OT Ataması)',
                description: 'Fazla mesai görünümünde ekip üyelerine ek mesai ataması yapabilirsiniz. Sol tarafta çalışan listesi (checkbox ile çoklu seçim), sağ tarafta atama formu: tarih seçici, başlangıç/bitiş saati, süre (otomatik hesaplama), görev tanımı (metin alanı). "Mesai Ata" butonu ile seçili çalışanlara toplu atama yapılır. Atama sonrası çalışanlara bildirim gönderilir. Atamanın birincil veya ikincil yönetici tarafından yapılmasına göre bildirim akışı farklılaşır: İkincil yönetici OT ataması yaptığında birincil yöneticiye de bilgi verilir.'
            },
            {
                title: 'Kendi Mesaim (Çalışan Görünümü)',
                description: 'Yönetici olmayan çalışanlar bu sayfaya eriştiklerinde yalnızca kendi mesai bilgilerini tek satırlık tablo olarak görürler: toplam çalışma, fazla mesai, eksik, bugünkü durum, giriş/çıkış. Ekip sekmeleri ve yönetici araçları görünmez.'
            }
        ],
        tips: [
            { type: 'info', text: 'Bu sayfayı görmek için yönetici yetkisi gerekir: APPROVAL_LEAVE veya APPROVAL_OVERTIME izni, veya en az bir çalışanla yönetici (subordinate) ilişkisi. Yetkisiz kullanıcılar sadece kendi mesai bilgilerini görür.' },
            { type: 'info', text: 'İkincil ekip sekmesi yalnızca OT (ek mesai) bilgilerini gösterir. İkincil yönetici izin bakiyeleri, puantaj detayları, giriş/çıkış saatleri gibi bilgilere erişemez — sadece fazla mesai süreleri ve OT atamaları görünür.' },
            { type: 'success', text: 'Vekâlet devri aktifse "Vekil Ekip" sekmesi ile vekâlet verilen yöneticinin birincil ekibini de görebilir ve onay işlemleri yapabilirsiniz. Vekâlet süresi dolduğunda bu sekme otomatik kaybolur.' },
            { type: 'info', text: 'Veriler useSmartPolling hook\'u ile otomatik yenilenir: sekme aktifken her 60 saniyede güncelleme, sekme gizlendiğinde (tab switch) güncelleme durur, tekrar açıldığında anında yenilenir. Manuel yenileme gerektirmez.' },
            { type: 'warning', text: 'OT ataması yaparken haftalık OT limitini kontrol edin. Limit dolmuş çalışana atama yapılabilir ancak çalışan talep ettiğinde limit uyarısı görür. Dashboard\'daki ilerleme çubuğundan mevcut kullanımı takip edebilirsiniz.' },
            { type: 'info', text: 'Hiyerarşik sıralama büyük ekiplerde (20+ kişi) grup bazlı istatistik karşılaştırması için çok kullanışlıdır. GROUP düğümleri toplam çalışma, toplam OT ve toplam eksik gösterir — hangi grubun performansının iyi/kötü olduğunu hızlıca görürsünüz.' }
        ],
        faq: [
            { q: 'Ekip listesini göremiyorum, neden?', a: 'Yönetici ilişkiniz (PRIMARY veya SECONDARY) veya onay yetkiniz (APPROVAL_LEAVE / APPROVAL_OVERTIME) olmalıdır. Hiçbiri yoksa bu sayfa yalnızca kendi mesai bilginizi gösterir. Sistem yöneticinize başvurun.' },
            { q: 'Hiyerarşik sıralama ne işe yarar?', a: 'Çalışanları yönetici ağacına göre gruplandırır. Her GROUP düğümü altında o grubun toplam çalışma, fazla mesai ve eksik istatistikleri gösterilir. Büyük ekiplerde yapıyı anlamayı ve grup bazlı performans karşılaştırmasını kolaylaştırır.' },
            { q: 'Analitik modunda grafikler ne gösterir?', a: '6 bölüm: katılım oranı (devam %), hafta sonu/içi OT dağılımı, yemek-OT korelasyonu, izin kullanım oranları, departman benchmark tablosu ve çalışan ranking tablosu. Her çalışana tıklayarak PersonDetailDrawer ile detaylı bireysel analiz görebilirsiniz.' },
            { q: 'Vekil ekip sekmesi ne zaman görünür?', a: 'Size aktif vekâlet tanımlanmışsa (başka bir yönetici sizi vekil tayin etmişse) ve vekâlet süresi devam ediyorsa "Vekil Ekip" sekmesi görünür. Vekâlet süreniz dolduğunda sekme otomatik kaybolur.' },
            { q: 'İkincil ekipte neden sadece OT bilgisi görünüyor?', a: 'İkincil (SECONDARY) yönetici yalnızca ek mesai işlemlerinde yetkilidir. İzin, puantaj, giriş/çıkış ve diğer bilgiler güvenlik nedeniyle ikincil yöneticiye kapalıdır. Birincil yöneticinin tüm verilere erişimi vardır.' },
            { q: 'PersonDetailDrawer ne gösterir?', a: 'Analitik modunda bir çalışana tıkladığınızda sağdan açılan panel: katılım bölümü (günlük devam/devamsızlık), OT bölümü (ek mesai dökümü, kaynak türü dağılımı) ve yemek bölümü (sipariş geçmişi). Çalışanın dönem içi performansını detaylı inceleme imkanı sunar.' },
            { q: 'OT ataması nasıl yapılır?', a: 'Fazla Mesai görünümüne geçin. Sol listeden çalışan(lar)ı seçin (checkbox). Sağ formda tarih, başlangıç/bitiş saati ve görev tanımı girin. "Mesai Ata" butonuna tıklayın. Atama sonrası çalışanlara bildirim gönderilir ve "Planlı Mesai" olarak talep edebilirler.' }
        ]
    },
    {
        id: 'program-yonetimi',
        title: 'Program Yönetimi',
        icon: Package,
        description: 'Harici yazılım envanteri yönetimi — program ekleme/düzenleme, API anahtarı oluşturma ve yenileme, HWID bazlı cihaz erişim kontrolü ve erişim log takibi',
        permission: 'PAGE_PROGRAM_MANAGEMENT',
        link: '/program-management',
        images: [],
        steps: [
            {
                title: 'Özet Kartları ve Genel Bakış',
                description: 'Sayfanın üst kısmında 3 özet kartı: (1) Toplam Program (mavi, Package ikonu) — sistemde kayıtlı tüm programların sayısı (aktif + pasif). (2) Aktif Program (yeşil, CheckCircle ikonu) — şu an aktif durumda olan ve bağlantı kabul eden programlar. (3) Kayıtlı Cihaz (mor, Monitor ikonu) — tüm programlara kayıtlı toplam benzersiz cihaz (HWID) sayısı. Kartlara tıklama desteklenmez, yalnızca bilgilendirme amaçlıdır.',
                image: { src: '/help-images/20-program-management.png', caption: 'Program Yönetimi — 3 özet kartı (Toplam Program / Aktif Program / Kayıtlı Cihaz), sol panel program listesi, sağ panel detay paneli ve erişim logları' }
            },
            {
                title: 'Program Listesi (Sol Panel)',
                description: 'Sol panelde tüm programlar kart formatında listelenir. Her program kartında: (1) Program adı (kalın metin). (2) Durum badge — "Aktif" (yeşil pill) veya "Pasif" (gri pill). (3) Son erişim zamanı — "X dakika önce" veya tarih. (4) Kayıtlı cihaz sayısı. Bir karta tıklayarak sağ panelde detay açılır — seçili kart mavi çerçeve ile vurgulanır. Liste yukarıdan aşağıya aktif programlar önce, pasifler sonra sıralanır.'
            },
            {
                title: 'Yeni Program Ekleme (CreateProgramModal)',
                description: 'Sol panelin alt kısmındaki "Yeni Program" butonu (mavi, + ikonu) ile CreateProgramModal açılır. Form alanları: (1) Program Adı (zorunlu) — benzersiz olmalı, varsa hata gösterilir. (2) Açıklama (opsiyonel) — programın ne işe yaradığını açıklayan metin. (3) Aktif/Pasif toggle (varsayılan: Aktif). "Oluştur" butonu ile program kaydedilir. Kayıt sonrası otomatik olarak benzersiz API anahtarı üretilir ve sağ panelde gösterilir.'
            },
            {
                title: 'Program Detayı ve API Anahtarı Yönetimi',
                description: 'Sol panelden program seçildiğinde sağ panel açılır. Üst bölümde: (1) Program adı ve düzenleme (kalem ikonu ile isim/açıklama güncelleme). (2) Aktif/Pasif toggle — pasife alındığında o programa yapılan tüm bağlantılar reddedilir. (3) API Anahtarı bölümü: Göster/Gizle (göz ikonu — güvenlik için varsayılan gizli, "••••••••" olarak gösterilir), Kopyala (clipboard ikonu — tıklandığında "Kopyalandı!" bildirimi), Anahtarı Yenile (döngü ikonu — onay dialogu: "Dikkat! API anahtarını yenilemek mevcut tüm bağlantıları keser. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?"), Programı Sil (çöp kutusu ikonu — onay dialogu: program adı ve "ilişkili tüm cihaz kayıtları kalıcı olarak silinir" uyarısı).',
                image: { src: '/help-images/20a-program-detail.png', caption: 'Program detay paneli — API anahtarı göster/gizle/kopyala/yenile butonları, Aktif/Pasif toggle, 3 alt sekme (Cihazlar/Kullanıcılar/Dokümantasyon) ve erişim log tablosu' }
            },
            {
                title: 'Cihaz Erişim Yönetimi (HWID Bazlı)',
                description: 'Detay panelinin "Cihazlar" alt sekmesinde HWID (Hardware ID) bazlı cihaz erişim listesi gösterilir. Her satırda: (1) Cihaz Adı — tanımlama etiketi. (2) HWID Parmak İzi — benzersiz donanım kimliği (kısaltılmış gösterim, hover\'da tam değer). (3) Son Erişim — tarih ve saat. (4) Durum badge — Aktif (yeşil), Engelli (kırmızı), Bekleyen (amber). (5) Aktif/Pasif toggle — cihazı aktif/pasif yapma. Yeni cihaz program\'a ilk bağlandığında otomatik olarak listeye eklenir. Engellenen cihazlar erişim denemelerinde HWID_BLOCKED hatası alır.'
            },
            {
                title: 'Erişim Logları ve Renk Kodları',
                description: 'Cihaz listesinin altında veya ayrı bir bölümde erişim logları zaman sıralamasıyla gösterilir. Her log satırı: tarih/saat, cihaz HWID (kısaltılmış), işlem sonucu ve detay. Renk kodlu sonuçlar: (1) SUCCESS (yeşil arka plan) — başarılı bağlantı. (2) INVALID_KEY (kırmızı) — geçersiz API anahtarı. (3) INVALID_CREDENTIALS (kırmızı) — geçersiz kimlik bilgileri. (4) HWID_BLOCKED (kırmızı) — engellenmiş cihaz. (5) VERSION_REJECTED (turuncu) — desteklenmeyen program sürümü. (6) HWID_LIMIT (turuncu) — cihaz limiti aşıldı. (7) PROGRAM_INACTIVE (sarı) — pasif program\'a bağlantı denemesi. Loglar son 100 kayıtla sınırlıdır.'
            },
            {
                title: 'Kullanıcılar ve Dokümantasyon Sekmeleri',
                description: '"Kullanıcılar" sekmesinde programa erişim yetkisi olan kullanıcı listesi (varsa). "Dokümantasyon" sekmesinde programın entegrasyon kılavuzu, API kullanım örnekleri ve bağlantı parametreleri gösterilir. Bu sekmeler programın türüne ve yapılandırmasına göre içerik barındırır.'
            }
        ],
        tips: [
            { type: 'info', text: 'Sol listeden program seçerek sağ panelde tüm detayları (API anahtarı, cihaz listesi, erişim logları) görüntüleyebilirsiniz. Seçili program mavi çerçeve ile vurgulanır.' },
            { type: 'warning', text: 'Program silme işlemi ilişkili tüm cihaz kayıtlarını, erişim loglarını ve API anahtarını kalıcı olarak kaldırır. Geri alınamaz. Kullanılmayan programları silmek yerine "Pasif" durumuna geçirmeyi tercih edin — pasif programlar bağlantı kabul etmez ama kayıtları korunur.' },
            { type: 'warning', text: 'API anahtarını yenilemek mevcut tüm bağlantıları anında keser. Bağlı cihazlar yeni anahtarla yapılandırılana kadar erişim sağlayamaz. Bu işlem geri alınamaz — yenileme öncesi bağlı cihaz sayısını kontrol edin.' },
            { type: 'info', text: 'API anahtarı güvenlik için varsayılan olarak gizli gösterilir ("••••••••"). Göz ikonuna tıklayarak geçici olarak gösterebilirsiniz. Kopyala butonu ile panoya kopyalayıp güvenli bir yerde saklayın. Anahtarı ekran görüntüsü ile paylaşmayın.' },
            { type: 'success', text: 'Erişim logları sorun giderme için çok kullanışlıdır: başarısız bağlantı denemeleri kırmızı, uyarılar turuncu renkte vurgulanır. HWID_BLOCKED ve INVALID_KEY logları güvenlik ihlali denemelerini gösterebilir.' },
            { type: 'info', text: 'Yeni cihaz programa ilk bağlandığında cihaz listesine otomatik eklenir. Cihaz HWID\'si donanıma özgü benzersiz bir kimlik olduğundan aynı cihaz farklı HWID üretemez. Cihaz değiştirildiğinde eski HWID kayıtları kalır.' }
        ],
        faq: [
            { q: 'Bu sayfayı göremiyorum, ne yapmalıyım?', a: 'PAGE_PROGRAM_MANAGEMENT yetkisi gereklidir. Bu yetki genellikle ROLE_ADMIN rolüne tanımlıdır. Sistem yöneticinize başvurun.' },
            { q: 'Silinen programın cihaz kayıtları geri gelir mi?', a: 'Hayır. Program silme işlemi tüm ilişkili cihaz kayıtlarını, erişim loglarını ve API anahtarını kalıcı olarak siler. Geri alma imkanı yoktur. Bu yüzden silme yerine pasife alma önerilir.' },
            { q: 'API anahtarı güvenli mi?', a: 'API anahtarı sunucu tarafında şifrelenmiş olarak saklanır. İstemci tarafında varsayılan olarak gizli gösterilir. Anahtarı güvenli ortamda (ortam değişkeni, şifreli yapılandırma dosyası) saklayın. Düz metin olarak paylaşmayın.' },
            { q: 'HWID_BLOCKED ne anlama gelir?', a: 'Bir cihazın HWID\'si manuel olarak engellenmiştir. Cihazlar sekmesinden cihazın durumunu "Engelli" olarak ayarladığınızda o cihazdan gelen tüm bağlantı denemeleri HWID_BLOCKED hatası alır ve loglanır.' },
            { q: 'Cihaz limitini nasıl artırabilirim?', a: 'HWID_LIMIT hatası programın maksimum cihaz sayısına ulaştığını gösterir. Program ayarlarından (düzenleme modalı) cihaz limitini artırabilir veya kullanılmayan eski cihazları listeden kaldırabilirsiniz.' },
            { q: 'Pasif programa bağlanmaya çalışan cihaz ne görür?', a: 'PROGRAM_INACTIVE hatası alır. Erişim loglarında sarı renk ile kaydedilir. Programı tekrar aktif yaptığınızda bağlantılar otomatik çalışmaya başlar — cihaz tarafında değişiklik gerekmez.' }
        ]
    }
];

export default helpContent;
